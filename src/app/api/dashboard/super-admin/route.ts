import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return apiUnauthorized();
    }

    // Get all companies with their stats
    const companies = await db.company.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
        branches: {
          include: {
            _count: {
              select: {
                qualityReports: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get total reports and incidents
    const [totalReports, totalIncidents, pendingIncidents, activeAlerts, totalUsers, usersByRole] = await Promise.all([
      db.qualityReport.count(),
      db.incident.count(),
      db.incident.count({ where: { status: 'PENDING' } }),
      db.alert.count({ where: { status: 'ACTIVE' } }),
      db.user.count(),
      db.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    // Calculate recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentReports, recentIncidentsCount] = await Promise.all([
      db.qualityReport.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      db.incident.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Format company data with average scores
    const companyStats = await Promise.all(
      companies.map(async (company) => {
        // Get average score for this company
        const branchIds = company.branches.map((b) => b.id);
        const avgScoreResult = await db.qualityReport.aggregate({
          where: { branchId: { in: branchIds } },
          _avg: { overallScore: true },
        });

        const reportCount = company.branches.reduce(
          (sum, branch) => sum + branch._count.qualityReports,
          0
        );

        return {
          id: company.id,
          name: company.name,
          slug: company.slug,
          isActive: company.isActive,
          branchCount: company._count.branches,
          userCount: company._count.users,
          reportCount,
          avgScore: avgScoreResult._avg.overallScore || null,
        };
      })
    );

    const data = {
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c) => c.isActive).length,
      totalBranches: companies.reduce((sum, c) => sum + c._count.branches, 0),
      totalUsers,
      usersByRole: usersByRole.map((u) => ({ role: u.role, count: u._count })),
      totalReports,
      totalIncidents,
      pendingIncidents,
      activeAlerts,
      recentActivity: {
        reports: recentReports,
        incidents: recentIncidentsCount,
      },
      companies: companyStats,
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    return apiError('Failed to load dashboard data', 500);
  }
}
