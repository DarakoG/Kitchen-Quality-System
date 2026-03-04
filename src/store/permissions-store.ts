import { create } from 'zustand';
import { useAuthStore, User } from './auth-store';

export interface UserPermissions {
  role: string;
  canViewDashboard: boolean;
  canViewDishes: boolean;
  canManageDishes: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canViewReports: boolean;
  canCreateReports: boolean;
  canViewIncidents: boolean;
  canCreateIncidents: boolean;
  canManageIncidents: boolean;
  canViewAlerts: boolean;
  canManageAlerts: boolean;
  canViewUsers: boolean;
  canManageUsers: boolean;
  canViewCompanies: boolean;
  canManageCompanies: boolean;
  canViewBranches: boolean;
  canManageBranches: boolean;
  canViewAudit: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  canViewPermissions: boolean;
}

// Default permissions for each role (fallback)
const defaultPermissions: Record<string, UserPermissions> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
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
    role: 'COMPANY_ADMIN',
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
    role: 'BRANCH_MANAGER',
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
    role: 'SUPERVISOR',
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
    role: 'AUDITOR',
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

interface PermissionsState {
  permissions: UserPermissions | null;
  isLoading: boolean;
  loadPermissions: (user: User) => Promise<void>;
  clearPermissions: () => void;
  getDefaultPermissions: (role: string) => UserPermissions;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: null,
  isLoading: false,

  loadPermissions: async (user: User) => {
    set({ isLoading: true });
    
    // Set default permissions immediately so UI can work
    const defaults = defaultPermissions[user.role] || defaultPermissions.SUPERVISOR;
    set({ permissions: defaults });
    
    try {
      const response = await fetch('/api/permissions/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
          ...(user.companyId ? { 'x-user-company-id': user.companyId } : {}),
          ...(user.branchId ? { 'x-user-branch-id': user.branchId } : {}),
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success && result.data) {
        set({ permissions: result.data, isLoading: false });
      } else {
        // Keep default permissions on error
        console.error('Failed to load permissions:', result.error);
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Keep default permissions on error
      set({ isLoading: false });
    }
  },

  clearPermissions: () => {
    set({ permissions: null });
  },
  
  getDefaultPermissions: (role: string) => {
    return defaultPermissions[role] || defaultPermissions.SUPERVISOR;
  },
}));
