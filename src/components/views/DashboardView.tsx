'use client';

import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import { SuperAdminDashboard } from '@/components/dashboards/SuperAdminDashboard';
import { CompanyAdminDashboard } from '@/components/dashboards/CompanyAdminDashboard';
import { BranchManagerDashboard } from '@/components/dashboards/BranchManagerDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { AuditorDashboard } from '@/components/dashboards/AuditorDashboard';

export function DashboardView() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your dashboard</p>
      </div>
    );
  }

  // Render different dashboard based on user role
  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'COMPANY_ADMIN':
      return <CompanyAdminDashboard />;
    case 'BRANCH_MANAGER':
      return <BranchManagerDashboard />;
    case 'SUPERVISOR':
      return <SupervisorDashboard />;
    case 'AUDITOR':
      return <AuditorDashboard />;
    default:
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unknown role</p>
        </div>
      );
  }
}
