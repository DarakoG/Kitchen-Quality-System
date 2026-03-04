import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return apiForbidden();
    }

    if (!userCompanyId) {
      return apiError('No company assigned', 400);
    }

    // Get company info
    const company = await db.company.findUnique({
      where: { id: userCompanyId },
      include: {
        branches: {
          include: {
            _count: {
              select: {
                users: true,
                qualityReports: true,
                incidents: true,
              },
            },
          },
        },
        users: {
          where: { isActive: true },
          select: { id: true, role: true },
        },
      },
    });

    if (!company) {
      return apiError('Company not found', 404);
    }

    // Get branch IDs
    const branchIds = company.branches.map((b) => b.id);

    // Get reports and scores
    const [reports, incidents, alerts] = await Promise.all([
      db.qualityReport.findMany({
        where: { branchId: { in: branchIds } },
        select: {
          id: true,
          overallScore: true,
          status: true,
          createdAt: true,
          branchId: true,
          dish: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.incident.findMany({
        where: { branchId: { in: branchIds } },
        select: {
          id: true,
          incidentType: true,
          severity: true,
          status: true,
          createdAt: true,
          branch: { select: { name: true } },
          dish: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.alert.findMany({
        where: { branchId: { in: branchIds }, status: 'ACTIVE' },
        select: { id: true },
      }),
    ]);

    // Calculate metrics
    const totalReports = reports.length;
    const approvedReports = reports.filter((r) => r.status === 'APPROVED').length;
    const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;

    const scores = reports
      .filter((r) => r.overallScore !== null)
      .map((r) => r.overallScore as number);
    const avgQualityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const pendingIncidents = incidents.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length;

    // Branch performance
    const branchPerformance = await Promise.all(
      company.branches.map(async (branch) => {
        const branchReports = reports.filter((r) => r.branchId === branch.id);
        const branchScore = branchReports
          .filter((r) => r.overallScore !== null)
          .map((r) => r.overallScore as number);

        const incidents_count = await db.incident.count({
          where: { branchId: branch.id },
        });

        return {
          id: branch.id,
          name: branch.name,
          reportCount: branch._count.qualityReports,
          avgScore: branchScore.length > 0 ? branchScore.reduce((a, b) => a + b, 0) / branchScore.length : null,
          incidentCount: incidents_count,
          trend: 'stable' as 'up' | 'down' | 'stable', // Simplified
        };
      })
    );

    // Sort by avgScore
    branchPerformance.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

    // Top dishes
    const dishStats = new Map<string, { name: string; count: number; scores: number[]; incidents: number }>();
    
    for (const report of reports) {
      if (report.dish) {
        const existing = dishStats.get(report.dish.id) || { name: report.dish.name, count: 0, scores: [], incidents: 0 };
        existing.count++;
        if (report.overallScore !== null) existing.scores.push(report.overallScore);
        dishStats.set(report.dish.id, existing);
      }
    }

    // Get incidents per dish
    const dishIncidents = await db.incident.groupBy({
      by: ['dishId'],
      where: { branchId: { in: branchIds }, dishId: { not: null } },
      _count: true,
    });

    for (const di of dishIncidents) {
      if (di.dishId) {
        const existing = dishStats.get(di.dishId);
        if (existing) {
          existing.incidents = di._count;
        }
      }
    }

    const dishArray = Array.from(dishStats.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      reportCount: data.count,
      avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
      incidentCount: data.incidents,
    }));

    // Top performing dishes
    const topDishes = dishArray
      .filter((d) => d.reportCount >= 1)
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
      .slice(0, 5);

    // Problem dishes (most incidents)
    const problemDishes = dishArray
      .filter((d) => d.incidentCount > 0)
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 5);

    // Daily trend (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyTrendRaw = await db.$queryRaw<Array<{ date: string; reports: number; avgScore: number }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as reports,
        AVG(overallScore) as avgScore
      FROM QualityReport
      WHERE branchId IN (${branchIds.join(',') || 'NULL'})
        AND createdAt >= datetime('now', '-14 days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    const data = {
      companyName: company.name,
      totalBranches: company.branches.length,
      totalUsers: company.users.length,
      avgQualityScore,
      approvalRate,
      totalReports,
      pendingIncidents,
      activeAlerts: alerts.length,
      branchPerformance,
      topDishes,
      problemDishes,
      dailyTrend: dailyTrendRaw || [],
      recentIncidents: incidents.slice(0, 5).map((i) => ({
        id: i.id,
        incidentType: i.incidentType,
        severity: i.severity,
        status: i.status,
        branchName: i.branch?.name || 'Unknown',
        dishName: i.dish?.name || null,
        createdAt: i.createdAt.toISOString(),
      })),
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Company admin dashboard error:', error);
    return apiError('Failed to load dashboard data', 500);
  }
}
