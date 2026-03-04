import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (!userCompanyId || !userBranchId) {
      return apiError('No branch assigned', 400);
    }

    // Get branch info
    const branch = await db.branch.findUnique({
      where: { id: userBranchId },
      include: {
        company: { select: { name: true } },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!branch) {
      return apiError('Branch not found', 404);
    }

    // Get reports
    const reports = await db.qualityReport.findMany({
      where: { branchId: userBranchId },
      select: {
        id: true,
        overallScore: true,
        status: true,
        createdAt: true,
        dish: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get incidents
    const incidents = await db.incident.findMany({
      where: { branchId: userBranchId },
      select: {
        id: true,
        incidentType: true,
        severity: true,
        status: true,
        createdAt: true,
        dish: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Calculate metrics
    const totalReports = reports.length;
    const approvedReports = reports.filter((r) => r.status === 'APPROVED').length;
    const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;

    const scores = reports
      .filter((r) => r.overallScore !== null)
      .map((r) => r.overallScore as number);
    const avgQualityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Reports today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reportsToday = reports.filter((r) => new Date(r.createdAt) >= today).length;

    // Pending incidents
    const pendingIncidents = incidents.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS');

    // Staff performance
    const staffStats = new Map<string, { name: string; role: string; reportCount: number; scores: number[] }>();
    
    for (const report of reports) {
      if (report.user) {
        const existing = staffStats.get(report.user.id) || {
          name: report.user.name,
          role: 'STAFF',
          reportCount: 0,
          scores: [],
        };
        existing.reportCount++;
        if (report.overallScore !== null) existing.scores.push(report.overallScore);
        staffStats.set(report.user.id, existing);
      }
    }

    // Update roles from branch users
    for (const user of branch.users) {
      const existing = staffStats.get(user.id);
      if (existing) {
        existing.role = user.role;
      } else {
        staffStats.set(user.id, {
          name: user.name,
          role: user.role,
          reportCount: 0,
          scores: [],
        });
      }
    }

    const staff = Array.from(staffStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        role: data.role,
        reportCount: data.reportCount,
        avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
      }))
      .sort((a, b) => b.reportCount - a.reportCount);

    // Daily trend (last 14 days)
    const dailyTrendRaw = await db.$queryRaw<Array<{ date: string; reports: number; avgScore: number }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as reports,
        AVG(overallScore) as avgScore
      FROM QualityReport
      WHERE branchId = ${userBranchId}
        AND createdAt >= datetime('now', '-14 days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Compare with other branches
    const allBranchScores = await db.branch.findMany({
      where: { companyId: userCompanyId },
      include: {
        qualityReports: {
          select: { overallScore: true },
        },
      },
    });

    const branchRankings = allBranchScores
      .map((b) => {
        const bScores = b.qualityReports
          .filter((r) => r.overallScore !== null)
          .map((r) => r.overallScore as number);
        const avgScore = bScores.length > 0 ? bScores.reduce((a, b) => a + b, 0) / bScores.length : null;
        return { id: b.id, avgScore };
      })
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

    const rank = branchRankings.findIndex((b) => b.id === userBranchId) + 1;

    const data = {
      branchName: branch.name,
      companyName: branch.company.name,
      avgQualityScore,
      approvalRate,
      totalReports,
      reportsToday,
      pendingIncidents: pendingIncidents.length,
      incidentCount: incidents.length,
      activeStaff: branch.users.length,
      dailyTrend: dailyTrendRaw || [],
      recentReports: reports.slice(0, 5).map((r) => ({
        id: r.id,
        dishName: r.dish?.name || 'Unknown',
        status: r.status,
        overallScore: r.overallScore,
        userName: r.user?.name || 'Unknown',
        createdAt: r.createdAt.toISOString(),
      })),
      pendingIncidentList: pendingIncidents.slice(0, 5).map((i) => ({
        id: i.id,
        incidentType: i.incidentType,
        severity: i.severity,
        dishName: i.dish?.name || null,
        createdAt: i.createdAt.toISOString(),
      })),
      staff,
      comparison: branchRankings.length > 1 ? {
        rank,
        totalBranches: branchRankings.length,
        scoreDifference: avgQualityScore !== null && branchRankings[0].avgScore !== null
          ? branchRankings[0].avgScore - avgQualityScore
          : 0,
      } : null,
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Branch manager dashboard error:', error);
    return apiError('Failed to load dashboard data', 500);
  }
}
