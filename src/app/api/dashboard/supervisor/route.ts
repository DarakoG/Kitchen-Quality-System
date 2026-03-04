import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
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

    // Get user's reports
    const reports = await db.qualityReport.findMany({
      where: { userId },
      select: {
        id: true,
        overallScore: true,
        status: true,
        createdAt: true,
        dish: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Time calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Count reports by period
    const todayReports = reports.filter((r) => new Date(r.createdAt) >= today).length;
    const weekReports = reports.filter((r) => new Date(r.createdAt) >= weekStart).length;
    const monthReports = reports.filter((r) => new Date(r.createdAt) >= monthStart).length;

    // Calculate scores
    const scores = reports
      .filter((r) => r.overallScore !== null)
      .map((r) => r.overallScore as number);
    const avgQualityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const approvedCount = reports.filter((r) => r.status === 'APPROVED').length;
    const approvalRate = reports.length > 0 ? (approvedCount / reports.length) * 100 : 100;

    // Check streak (consecutive days with reports)
    const reportsByDate = new Map<string, number>();
    for (const report of reports) {
      const dateKey = new Date(report.createdAt).toISOString().split('T')[0];
      reportsByDate.set(dateKey, (reportsByDate.get(dateKey) || 0) + 1);
    }

    let streak = 0;
    const checkDate = new Date();
    while (reportsByDate.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Pending tasks (assigned incidents or tasks)
    const pendingTasks = await db.incident.count({
      where: {
        OR: [
          { resolvedBy: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        ],
      },
    });

    // Daily goal (can be configured, default 5 reports per day)
    const dailyGoalTarget = 5;

    const data = {
      branchName: user.branch?.name || 'Unassigned',
      todayReports,
      weekReports,
      monthReports,
      avgQualityScore,
      approvalRate,
      pendingTasks,
      recentReports: reports.slice(0, 5).map((r) => ({
        id: r.id,
        dishName: r.dish?.name || 'Unknown',
        status: r.status,
        overallScore: r.overallScore,
        createdAt: r.createdAt.toISOString(),
      })),
      dailyGoal: {
        target: dailyGoalTarget,
        current: todayReports,
      },
      streak,
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Supervisor dashboard error:', error);
    return apiError('Failed to load dashboard data', 500);
  }
}
