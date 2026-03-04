import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'BRANCH_MANAGER' | 'SUPERVISOR' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  avatar?: string | null;
  company?: { id: string; name: string; slug: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'kqs-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Permission helpers
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 80,
  BRANCH_MANAGER: 60,
  SUPERVISOR: 40,
  AUDITOR: 20,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageUsers(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'COMPANY_ADMIN');
}

export function canManageBranch(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'BRANCH_MANAGER');
}

export function canCreateReports(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'SUPERVISOR');
}

export function canViewReports(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'AUDITOR');
}

export function canManageDishes(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'BRANCH_MANAGER');
}

export function canManageIncidents(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user.role, 'SUPERVISOR');
}
