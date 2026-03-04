import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { UserRole, Permission } from '@prisma/client';

// Global permissions key
const GLOBAL_COMPANY_ID = 'global';

// Default permissions for each role
const defaultPermissions: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN: {
    canViewDashboard: true,
    canViewDishes: true,
    canManageDishes: true,
    canViewCategories: true,
    canManageCategories: true,
    canViewReports: true,
    canCreateReports: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canManageIncidents: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewCompanies: true,
    canManageCompanies: true,
    canViewBranches: true,
    canManageBranches: true,
    canViewAudit: true,
    canViewSettings: true,
    canManageSettings: true,
    canViewPermissions: true,
  },
  COMPANY_ADMIN: {
    canViewDashboard: true,
    canViewDishes: true,
    canManageDishes: true,
    canViewCategories: true,
    canManageCategories: true,
    canViewReports: true,
    canCreateReports: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canManageIncidents: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewCompanies: true,
    canManageCompanies: false,
    canViewBranches: true,
    canManageBranches: true,
    canViewAudit: true,
    canViewSettings: true,
    canManageSettings: true,
    canViewPermissions: true,
  },
  BRANCH_MANAGER: {
    canViewDashboard: true,
    canViewDishes: true,
    canManageDishes: false,
    canViewCategories: true,
    canManageCategories: false,
    canViewReports: true,
    canCreateReports: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canManageIncidents: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canViewUsers: true,
    canManageUsers: false,
    canViewCompanies: false,
    canManageCompanies: false,
    canViewBranches: true,
    canManageBranches: false,
    canViewAudit: true,
    canViewSettings: true,
    canManageSettings: false,
    canViewPermissions: false,
  },
  SUPERVISOR: {
    canViewDashboard: true,
    canViewDishes: true,
    canManageDishes: false,
    canViewCategories: true,
    canManageCategories: false,
    canViewReports: true,
    canCreateReports: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canManageIncidents: false,
    canViewAlerts: true,
    canManageAlerts: false,
    canViewUsers: false,
    canManageUsers: false,
    canViewCompanies: false,
    canManageCompanies: false,
    canViewBranches: true,
    canManageBranches: false,
    canViewAudit: false,
    canViewSettings: false,
    canManageSettings: false,
    canViewPermissions: false,
  },
  AUDITOR: {
    canViewDashboard: true,
    canViewDishes: true,
    canManageDishes: false,
    canViewCategories: true,
    canManageCategories: false,
    canViewReports: true,
    canCreateReports: true,
    canViewIncidents: true,
    canCreateIncidents: false,
    canManageIncidents: false,
    canViewAlerts: true,
    canManageAlerts: false,
    canViewUsers: false,
    canManageUsers: false,
    canViewCompanies: false,
    canManageCompanies: false,
    canViewBranches: true,
    canManageBranches: false,
    canViewAudit: true,
    canViewSettings: false,
    canManageSettings: false,
    canViewPermissions: false,
  },
};

// GET - Get permissions for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId || !userRole) {
      return apiUnauthorized();
    }

    // Super Admin always has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return apiSuccess({
        role: userRole,
        ...defaultPermissions.SUPER_ADMIN,
      });
    }

    // Check if there are custom permissions for this role + company
    let customPermissions: Permission | null = null;
    
    // First check company-specific permissions
    if (userCompanyId) {
      customPermissions = await db.permission.findUnique({
        where: {
          role_companyId: {
            role: userRole,
            companyId: userCompanyId,
          },
        },
      });
    }

    // If no company-specific, check global permissions
    if (!customPermissions) {
      customPermissions = await db.permission.findUnique({
        where: {
          role_companyId: {
            role: userRole,
            companyId: GLOBAL_COMPANY_ID,
          },
        },
      });
    }

    // Merge with defaults
    const defaults = defaultPermissions[userRole] || {};
    
    if (customPermissions) {
      return apiSuccess({
        role: userRole,
        canViewDashboard: customPermissions.canViewDashboard,
        canViewDishes: customPermissions.canViewDishes,
        canManageDishes: customPermissions.canManageDishes,
        canViewCategories: customPermissions.canViewCategories,
        canManageCategories: customPermissions.canManageCategories,
        canViewReports: customPermissions.canViewReports,
        canCreateReports: customPermissions.canCreateReports,
        canViewIncidents: customPermissions.canViewIncidents,
        canCreateIncidents: customPermissions.canCreateIncidents,
        canManageIncidents: customPermissions.canManageIncidents,
        canViewAlerts: customPermissions.canViewAlerts,
        canManageAlerts: customPermissions.canManageAlerts,
        canViewUsers: customPermissions.canViewUsers,
        canManageUsers: customPermissions.canManageUsers,
        canViewCompanies: customPermissions.canViewCompanies,
        canManageCompanies: customPermissions.canManageCompanies,
        canViewBranches: customPermissions.canViewBranches,
        canManageBranches: customPermissions.canManageBranches,
        canViewAudit: customPermissions.canViewAudit,
        canViewSettings: customPermissions.canViewSettings,
        canManageSettings: customPermissions.canManageSettings,
        canViewPermissions: customPermissions.canViewPermissions,
      });
    }

    return apiSuccess({
      role: userRole,
      ...defaults,
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    return apiError('Failed to fetch permissions', 500);
  }
}
