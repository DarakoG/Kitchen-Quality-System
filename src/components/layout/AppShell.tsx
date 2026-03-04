'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, hasPermission, User, UserRole } from '@/store/auth-store';
import { authApi } from '@/lib/api';
import { usePermissionsStore } from '@/store/permissions-store';
import { LoginForm } from '@/components/auth/LoginForm';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DashboardView } from '@/components/views/DashboardView';
import { DishesView } from '@/components/views/DishesView';
import { CategoriesView } from '@/components/views/CategoriesView';
import { QualityReportsView } from '@/components/views/QualityReportsView';
import { IncidentsView } from '@/components/views/IncidentsView';
import { UsersView } from '@/components/views/UsersView';
import { CompaniesView } from '@/components/views/CompaniesView';
import { BranchesView } from '@/components/views/BranchesView';
import { AlertsView } from '@/components/views/AlertsView';
import { AuditView } from '@/components/views/AuditView';
import { PermissionsView } from '@/components/views/PermissionsView';
import { Loader2 } from 'lucide-react';

export type ViewType = 'dashboard' | 'dishes' | 'categories' | 'reports' | 'incidents' | 'users' | 'companies' | 'branches' | 'alerts' | 'permissions' | 'audit';
export type { UserRole } from '@/store/auth-store';

export function AppShell() {
  const { user, isAuthenticated, isLoading, setLoading, logout } = useAuthStore();
  const { permissions, loadPermissions, clearPermissions } = usePermissionsStore();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      setLoading(true);
      try {
        // Verify session with backend
        const result = await authApi.me();
        if (result.success && result.data?.user) {
          // Session is valid, user data is already in store
        }
      } catch (err) {
        // Session invalid, clear local state
        logout();
      }
      setLoading(false);
    };
    checkSession();
  }, [setLoading, logout]);

  // Load permissions when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !permissions) {
      loadPermissions(user);
    }
    if (!isAuthenticated) {
      clearPermissions();
    }
  }, [isAuthenticated, user, permissions, loadPermissions, clearPermissions]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearPermissions();
    logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginForm />;
  }

  // Use permissions from store if available, otherwise use role-based defaults
  const canViewDashboard = permissions?.canViewDashboard ?? true;
  const canViewDishes = permissions?.canViewDishes ?? true;
  const canViewCategories = permissions?.canViewCategories ?? true;
  const canViewReports = permissions?.canViewReports ?? true;
  const canViewIncidents = permissions?.canViewIncidents ?? true;
  const canViewAlerts = permissions?.canViewAlerts ?? true;
  const canViewCompanies = permissions?.canViewCompanies ?? hasPermission(user.role, 'SUPER_ADMIN');
  const canViewBranches = permissions?.canViewBranches ?? hasPermission(user.role, 'COMPANY_ADMIN');
  const canViewUsers = permissions?.canViewUsers ?? hasPermission(user.role, 'COMPANY_ADMIN');
  const canViewAudit = permissions?.canViewAudit ?? hasPermission(user.role, 'BRANCH_MANAGER');
  const canViewPermissions = permissions?.canViewPermissions ?? hasPermission(user.role, 'COMPANY_ADMIN');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return canViewDashboard ? <DashboardView /> : <DishesView />;
      case 'dishes':
        return canViewDishes ? <DishesView /> : <DashboardView />;
      case 'categories':
        return canViewCategories ? <CategoriesView /> : <DashboardView />;
      case 'reports':
        return canViewReports ? <QualityReportsView /> : <DashboardView />;
      case 'incidents':
        return canViewIncidents ? <IncidentsView /> : <DashboardView />;
      case 'users':
        return canViewUsers ? <UsersView /> : <DashboardView />;
      case 'companies':
        return canViewCompanies ? <CompaniesView /> : <DashboardView />;
      case 'branches':
        return canViewBranches ? <BranchesView /> : <DashboardView />;
      case 'alerts':
        return canViewAlerts ? <AlertsView /> : <DashboardView />;
      case 'permissions':
        return canViewPermissions ? <PermissionsView /> : <DashboardView />;
      case 'audit':
        return canViewAudit ? <AuditView /> : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userRole={user.role}
        permissions={permissions}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={setCurrentView}
        />
        <main className="flex-1 p-6 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
