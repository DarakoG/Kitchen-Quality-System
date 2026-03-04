import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from './auth-store';

export interface Permissions {
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

interface PermissionsState {
  permissions: Permissions | null;
  isLoading: boolean;
  setPermissions: (permissions: Permissions | null) => void;
  setLoading: (loading: boolean) => void;
  clearPermissions: () => void;
  loadPermissions: (user: User) => Promise<void>;
}

// API helper for permissions
async function fetchPermissions(): Promise<Permissions | null> {
  try {
    const response = await fetch('/api/permissions/me', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return null;
  }
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set) => ({
      permissions: null,
      isLoading: false,
      setPermissions: (permissions) => set({ permissions }),
      setLoading: (isLoading) => set({ isLoading }),
      clearPermissions: () => set({ permissions: null }),
      loadPermissions: async (user: User) => {
        set({ isLoading: true });
        try {
          // Add user context headers
          const response = await fetch('/api/permissions/me', {
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id,
              'x-user-role': user.role,
              'x-user-company-id': user.companyId || '',
            },
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            set({ permissions: data.data || null, isLoading: false });
          } else {
            set({ permissions: null, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load permissions:', error);
          set({ permissions: null, isLoading: false });
        }
      },
    }),
    {
      name: 'kqs-permissions',
      partialize: (state) => ({ permissions: state.permissions }),
    }
  )
);

// Helper hooks for specific permissions
export function useCanManageDishes() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageDishes ?? false;
}

export function useCanManageCategories() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageCategories ?? false;
}

export function useCanCreateReports() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canCreateReports ?? false;
}

export function useCanManageIncidents() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageIncidents ?? false;
}

export function useCanManageAlerts() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageAlerts ?? false;
}

export function useCanManageUsers() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageUsers ?? false;
}

export function useCanManageCompanies() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageCompanies ?? false;
}

export function useCanManageBranches() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageBranches ?? false;
}

export function useCanManageSettings() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canManageSettings ?? false;
}

export function useCanViewPermissions() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canViewPermissions ?? false;
}

export function useCanViewAudit() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canViewAudit ?? false;
}

export function useCanViewUsers() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canViewUsers ?? false;
}

export function useCanViewCompanies() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canViewCompanies ?? false;
}

export function useCanViewBranches() {
  const permissions = usePermissionsStore((state) => state.permissions);
  return permissions?.canViewBranches ?? false;
}
