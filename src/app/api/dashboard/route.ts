import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { UserRole, Prisma } from '@prisma/client';

// GET - Dashboard KPIs
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    // Determine date range (default: last 30 days)
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');
    
    const dateFilter = {
      gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lte: endDate ? new Date(endDate) : new Date(),
    };

    // Build branch filter
    let branchFilter: { id?: string; companyId?: string } | { id: { in: string[] } } = {};

    if (userRole === 'SUPER_ADMIN') {
      // Super Admin can see all or filter by company
      const companyId = request.nextUrl.searchParams.get('companyId');
      if (companyId) {
        branchFilter.companyId = companyId;
      }
      // If no companyId, show all branches (empty filter means all)
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      branchFilter.companyId = userCompanyId;
    } else if (userBranchId) {
      branchFilter.id = userBranchId;
    } else {
      // For users without branch access, return empty data
      return apiSuccess({
        totalReports: 0,
        approvalRate: 0,
        avgExitTime: 0,
        pendingIncidents: 0,
        activeAlerts: 0,
        topDishes: [],
        branchPerformance: [],
        dailyTrend: [],
        recentReports: [],
        recentIncidents: [],
      });
    }

    // Get branch IDs
    const branches = await db.branch.findMany({
      where: branchFilter,
      select: { id: true, name: true },
    });
    const branchIds = branches.map(b => b.id);

    // If no branches found, return empty data
    if (branchIds.length === 0) {
      return apiSuccess({
        totalReports: 0,
        approvalRate: 0,
        avgExitTime: 0,
        pendingIncidents: 0,
        activeAlerts: 0,
        topDishes: [],
        branchPerformance: [],
        dailyTrend: [],
        recentReports: [],
        recentIncidents: [],
      });
    }

    // Parallel queries for all KPIs
    const [
      totalReports,
      approvedReports,
      pendingIncidents,
      activeAlerts,
      avgExitTimeResult,
      reportsByDish,
      reportsByBranch,
      recentReports,
      recentIncidents,
    ] = await Promise.all([
      // Total reports
      db.qualityReport.count({
        where: { branchId: { in: branchIds }, evaluationDate: dateFilter },
      }),

      // Approved reports
      db.qualityReport.count({
        where: { branchId: { in: branchIds }, evaluationDate: dateFilter, status: 'APPROVED' },
      }),

      // Pending incidents
      db.incident.count({
        where: { branchId: { in: branchIds }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),

      // Active alerts
      db.alert.count({
        where: { branchId: { in: branchIds }, status: 'ACTIVE' },
      }),

      // Average exit time
      db.qualityReport.aggregate({
        where: { branchId: { in: branchIds }, evaluationDate: dateFilter, exitTime: { not: null } },
        _avg: { exitTime: true },
      }),

      // Reports by dish (top 5)
      db.qualityReport.groupBy({
        by: ['dishId'],
        where: { branchId: { in: branchIds }, evaluationDate: dateFilter },
        _count: { id: true },
        _avg: { overallScore: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Reports by branch
      db.qualityReport.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds }, evaluationDate: dateFilter },
        _count: { id: true },
        _avg: { overallScore: true },
      }),

      // Recent reports (last 10)
      db.qualityReport.findMany({
        where: { branchId: { in: branchIds } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { name: true } },
          dish: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),

      // Recent incidents (last 10)
      db.incident.findMany({
        where: { branchId: { in: branchIds } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { name: true } },
          dish: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    // Calculate approval rate
    const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;

    // Get dish names for top dishes
    const topDishIds = reportsByDish.map(r => r.dishId);
    const dishNames = await db.dish.findMany({
      where: { id: { in: topDishIds } },
      select: { id: true, name: true },
    });

    const topDishes = reportsByDish.map(r => ({
      dishId: r.dishId,
      dishName: dishNames.find(d => d.id === r.dishId)?.name || 'Unknown',
      count: r._count.id,
      avgScore: r._avg.overallScore,
    }));

    // Branch performance
    const branchPerformance = reportsByBranch.map(r => ({
      branchId: r.branchId,
      branchName: branches.find(b => b.id === r.branchId)?.name || 'Unknown',
      reportCount: r._count.id,
      avgScore: r._avg.overallScore,
    }));

    // Get daily trend using raw query for SQLite
    let dailyTrend: Array<{ date: string; reports: number; approvalRate: number }> = [];
    
    if (branchIds.length > 0) {
      try {
        // Use Prisma.join for safe SQL query
        const trendData = await db.$queryRaw<Array<{ date: string; reports: bigint; approved: bigint }>>`
          SELECT 
            DATE(evaluationDate) as date,
            COUNT(*) as reports,
            SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved
          FROM QualityReport
          WHERE branchId IN (${Prisma.join(branchIds)})
            AND evaluationDate >= datetime('now', '-14 days')
          GROUP BY DATE(evaluationDate)
          ORDER BY date DESC
        `;

        dailyTrend = trendData.map(t => ({
          date: t.date,
          reports: Number(t.reports),
          approvalRate: Number(t.reports) > 0 ? (Number(t.approved) / Number(t.reports)) * 100 : 0,
        }));
      } catch (e) {
        // If raw query fails, return empty trend
        console.error('Daily trend query error:', e);
      }
    }

    const kpis = {
      totalReports,
      approvalRate: Math.round(approvalRate * 10) / 10,
      avgExitTime: avgExitTimeResult._avg.exitTime || 0,
      pendingIncidents,
      activeAlerts,
      topDishes,
      branchPerformance,
      dailyTrend,
      recentReports,
      recentIncidents,
    };

    return apiSuccess(kpis);
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    return apiError('Failed to fetch dashboard KPIs', 500);
  }
}
