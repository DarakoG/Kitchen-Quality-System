import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
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

    // Get user's branch
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        branch: { select: { name: true } },
      },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    // Get branch ID - use user's branch or query parameter
    let branchId = userBranchId;
    if (!branchId) {
      return apiError('No branch assigned', 400);
    }

    // Get all reports for the branch
    const reports = await db.qualityReport.findMany({
      where: { branchId },
      select: {
        id: true,
        overallScore: true,
        status: true,
        createdAt: true,
        dish: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Get incidents
    const incidents = await db.incident.findMany({
      where: { branchId },
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
    const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 100;

    const scores = reports
      .filter((r) => r.overallScore !== null)
      .map((r) => r.overallScore as number);
    const avgQualityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Daily trend (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyTrendRaw = await db.$queryRaw<Array<{ date: string; reports: number; avgScore: number }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as reports,
        AVG(overallScore) as avgScore
      FROM QualityReport
      WHERE branchId = ${branchId}
        AND createdAt >= datetime('now', '-14 days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Top dishes by report count
    const dishStats = new Map<string, { name: string; count: number; scores: number[] }>();
    for (const report of reports) {
      if (report.dish) {
        const existing = dishStats.get(report.dish.id) || { name: report.dish.name, count: 0, scores: [] };
        existing.count++;
        if (report.overallScore !== null) existing.scores.push(report.overallScore);
        dishStats.set(report.dish.id, existing);
      }
    }

    const topDishes = Array.from(dishStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        reportCount: data.count,
        avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
      }))
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 5);

    const data = {
      branchName: user.branch?.name || 'Unassigned',
      totalReports,
      avgQualityScore,
      approvalRate,
      incidentCount: incidents.length,
      dailyTrend: dailyTrendRaw || [],
      recentReports: reports.slice(0, 6).map((r) => ({
        id: r.id,
        dishName: r.dish?.name || 'Unknown',
        status: r.status,
        overallScore: r.overallScore,
        userName: r.user?.name || 'Unknown',
        createdAt: r.createdAt.toISOString(),
      })),
      topDishes,
      recentIncidents: incidents.slice(0, 5).map((i) => ({
        id: i.id,
        incidentType: i.incidentType,
        severity: i.severity,
        dishName: i.dish?.name || null,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      })),
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Auditor dashboard error:', error);
    return apiError('Failed to load dashboard data', 500);
  }
}
