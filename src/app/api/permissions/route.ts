import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

// Global permissions key
const GLOBAL_COMPANY_ID = 'global';

// Default permissions for each role (used when no custom permissions exist)
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

// GET - List permissions for a company
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    // Only Super Admin and Company Admin can manage permissions
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return apiForbidden('Insufficient permissions');
    }

    const companyId = request.nextUrl.searchParams.get('companyId');

    // Determine which company's permissions to fetch
    let targetCompanyId: string = GLOBAL_COMPANY_ID;
    
    if (userRole === 'SUPER_ADMIN') {
      // Super Admin can specify any company or use global permissions
      targetCompanyId = companyId || GLOBAL_COMPANY_ID;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      // Company Admin can only see their company's permissions
      targetCompanyId = userCompanyId;
    }

    // Get permissions from database
    const permissions = await db.permission.findMany({
      where: { companyId: targetCompanyId },
    });

    // Get all roles that can be edited
    const editableRoles = userRole === 'SUPER_ADMIN' 
      ? ['COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR']
      : ['BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR'];

    // Merge with defaults
    const result = editableRoles.map(role => {
      const dbPerm = permissions.find(p => p.role === role);
      const defaults = defaultPermissions[role];
      
      if (dbPerm) {
        return {
          id: dbPerm.id,
          role: dbPerm.role,
          companyId: dbPerm.companyId,
          canViewDashboard: dbPerm.canViewDashboard,
          canViewDishes: dbPerm.canViewDishes,
          canManageDishes: dbPerm.canManageDishes,
          canViewCategories: dbPerm.canViewCategories,
          canManageCategories: dbPerm.canManageCategories,
          canViewReports: dbPerm.canViewReports,
          canCreateReports: dbPerm.canCreateReports,
          canViewIncidents: dbPerm.canViewIncidents,
          canCreateIncidents: dbPerm.canCreateIncidents,
          canManageIncidents: dbPerm.canManageIncidents,
          canViewAlerts: dbPerm.canViewAlerts,
          canManageAlerts: dbPerm.canManageAlerts,
          canViewUsers: dbPerm.canViewUsers,
          canManageUsers: dbPerm.canManageUsers,
          canViewCompanies: dbPerm.canViewCompanies,
          canManageCompanies: dbPerm.canManageCompanies,
          canViewBranches: dbPerm.canViewBranches,
          canManageBranches: dbPerm.canManageBranches,
          canViewAudit: dbPerm.canViewAudit,
          canViewSettings: dbPerm.canViewSettings,
          canManageSettings: dbPerm.canManageSettings,
          canViewPermissions: dbPerm.canViewPermissions,
          isCustom: true,
        };
      }
      
      return {
        id: `default-${role}`,
        role,
        companyId: targetCompanyId,
        ...defaults,
        isCustom: false,
      };
    });

    return apiSuccess(result);
  } catch (error) {
    console.error('List permissions error:', error);
    return apiError('Failed to fetch permissions', 500);
  }
}

// PUT - Update permissions for a role
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return apiForbidden('Insufficient permissions');
    }

    const body = await request.json();
    const { role, companyId, ...permissions } = body;

    if (!role || !Object.values(UserRole).includes(role)) {
      return apiError('Invalid role', 400);
    }

    // Determine target company
    let targetCompanyId: string = GLOBAL_COMPANY_ID;
    
    if (userRole === 'SUPER_ADMIN') {
      targetCompanyId = companyId || GLOBAL_COMPANY_ID;
      // Super Admin can modify COMPANY_ADMIN
      if (role === 'SUPER_ADMIN') {
        return apiForbidden('Cannot modify SUPER_ADMIN permissions');
      }
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      targetCompanyId = userCompanyId;
      // Company Admin cannot modify COMPANY_ADMIN
      if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN') {
        return apiForbidden('Cannot modify this role');
      }
    }

    // Upsert permission
    const permission = await db.permission.upsert({
      where: {
        role_companyId: {
          role: role as UserRole,
          companyId: targetCompanyId,
        },
      },
      create: {
        role: role as UserRole,
        companyId: targetCompanyId,
        canViewDashboard: permissions.canViewDashboard ?? true,
        canViewDishes: permissions.canViewDishes ?? true,
        canManageDishes: permissions.canManageDishes ?? false,
        canViewCategories: permissions.canViewCategories ?? true,
        canManageCategories: permissions.canManageCategories ?? false,
        canViewReports: permissions.canViewReports ?? true,
        canCreateReports: permissions.canCreateReports ?? false,
        canViewIncidents: permissions.canViewIncidents ?? true,
        canCreateIncidents: permissions.canCreateIncidents ?? false,
        canManageIncidents: permissions.canManageIncidents ?? false,
        canViewAlerts: permissions.canViewAlerts ?? true,
        canManageAlerts: permissions.canManageAlerts ?? false,
        canViewUsers: permissions.canViewUsers ?? false,
        canManageUsers: permissions.canManageUsers ?? false,
        canViewCompanies: permissions.canViewCompanies ?? false,
        canManageCompanies: permissions.canManageCompanies ?? false,
        canViewBranches: permissions.canViewBranches ?? true,
        canManageBranches: permissions.canManageBranches ?? false,
        canViewAudit: permissions.canViewAudit ?? false,
        canViewSettings: permissions.canViewSettings ?? false,
        canManageSettings: permissions.canManageSettings ?? false,
        canViewPermissions: permissions.canViewPermissions ?? false,
      },
      update: {
        canViewDashboard: permissions.canViewDashboard,
        canViewDishes: permissions.canViewDishes,
        canManageDishes: permissions.canManageDishes,
        canViewCategories: permissions.canViewCategories,
        canManageCategories: permissions.canManageCategories,
        canViewReports: permissions.canViewReports,
        canCreateReports: permissions.canCreateReports,
        canViewIncidents: permissions.canViewIncidents,
        canCreateIncidents: permissions.canCreateIncidents,
        canManageIncidents: permissions.canManageIncidents,
        canViewAlerts: permissions.canViewAlerts,
        canManageAlerts: permissions.canManageAlerts,
        canViewUsers: permissions.canViewUsers,
        canManageUsers: permissions.canManageUsers,
        canViewCompanies: permissions.canViewCompanies,
        canManageCompanies: permissions.canManageCompanies,
        canViewBranches: permissions.canViewBranches,
        canManageBranches: permissions.canManageBranches,
        canViewAudit: permissions.canViewAudit,
        canViewSettings: permissions.canViewSettings,
        canManageSettings: permissions.canManageSettings,
        canViewPermissions: permissions.canViewPermissions,
      },
    });

    return apiSuccess(permission, 'Permissions updated successfully');
  } catch (error) {
    console.error('Update permissions error:', error);
    return apiError('Failed to update permissions', 500);
  }
}

// POST - Reset permissions to defaults
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return apiForbidden('Insufficient permissions');
    }

    const body = await request.json();
    const { role, companyId } = body;

    // Determine target company
    let targetCompanyId: string = GLOBAL_COMPANY_ID;
    
    if (userRole === 'SUPER_ADMIN') {
      targetCompanyId = companyId || GLOBAL_COMPANY_ID;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      targetCompanyId = userCompanyId;
    }

    // Delete custom permissions to fall back to defaults
    await db.permission.deleteMany({
      where: {
        role: role as UserRole,
        companyId: targetCompanyId,
      },
    });

    return apiSuccess({ role }, 'Permissions reset to defaults');
  } catch (error) {
    console.error('Reset permissions error:', error);
    return apiError('Failed to reset permissions', 500);
  }
}

// Export defaults for use in other parts of the app
export { defaultPermissions, GLOBAL_COMPANY_ID };
