'use client';

import { useEffect, useState } from 'react';
import { permissionsApi, companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, RotateCcw, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Permission {
  id: string;
  role: string;
  companyId: string | null;
  isCustom: boolean;
  [key: string]: boolean | string | null;
}

interface Company {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  COMPANY_ADMIN: 'Company Admin',
  BRANCH_MANAGER: 'Branch Manager',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
};

const roleDescriptions: Record<string, string> = {
  COMPANY_ADMIN: 'Full company administration - manages branches, users, and settings',
  BRANCH_MANAGER: 'Branch-level management - supervises staff and operations',
  SUPERVISOR: 'Quality control supervisor - creates reports and handles incidents',
  AUDITOR: 'Read-only access - views reports and audit logs',
};

const permissionGroups = [
  {
    name: 'Dashboard',
    permissions: [
      { key: 'canViewDashboard', label: 'View Dashboard', type: 'view' },
    ],
  },
  {
    name: 'Dishes',
    permissions: [
      { key: 'canViewDishes', label: 'View Dishes', type: 'view' },
      { key: 'canManageDishes', label: 'Create/Edit/Delete Dishes', type: 'manage' },
    ],
  },
  {
    name: 'Categories',
    permissions: [
      { key: 'canViewCategories', label: 'View Categories', type: 'view' },
      { key: 'canManageCategories', label: 'Create/Edit/Delete Categories', type: 'manage' },
    ],
  },
  {
    name: 'Quality Reports',
    permissions: [
      { key: 'canViewReports', label: 'View Quality Reports', type: 'view' },
      { key: 'canCreateReports', label: 'Create Quality Reports', type: 'create' },
    ],
  },
  {
    name: 'Incidents',
    permissions: [
      { key: 'canViewIncidents', label: 'View Incidents', type: 'view' },
      { key: 'canCreateIncidents', label: 'Report Incidents', type: 'create' },
      { key: 'canManageIncidents', label: 'Manage/Resolve Incidents', type: 'manage' },
    ],
  },
  {
    name: 'Alerts',
    permissions: [
      { key: 'canViewAlerts', label: 'View Alerts', type: 'view' },
      { key: 'canManageAlerts', label: 'Acknowledge/Close Alerts', type: 'manage' },
    ],
  },
  {
    name: 'Users',
    permissions: [
      { key: 'canViewUsers', label: 'View Users', type: 'view' },
      { key: 'canManageUsers', label: 'Create/Edit/Delete Users', type: 'manage' },
    ],
  },
  {
    name: 'Companies',
    permissions: [
      { key: 'canViewCompanies', label: 'View Companies', type: 'view' },
      { key: 'canManageCompanies', label: 'Create/Edit/Delete Companies', type: 'manage' },
    ],
  },
  {
    name: 'Branches',
    permissions: [
      { key: 'canViewBranches', label: 'View Branches', type: 'view' },
      { key: 'canManageBranches', label: 'Create/Edit/Delete Branches', type: 'manage' },
    ],
  },
  {
    name: 'Audit Logs',
    permissions: [
      { key: 'canViewAudit', label: 'View Audit Logs', type: 'view' },
    ],
  },
  {
    name: 'Settings',
    permissions: [
      { key: 'canViewSettings', label: 'View Settings', type: 'view' },
      { key: 'canManageSettings', label: 'Modify Settings', type: 'manage' },
    ],
  },
  {
    name: 'Permissions',
    permissions: [
      { key: 'canViewPermissions', label: 'View & Manage Role Permissions', type: 'manage' },
    ],
  },
];

export function PermissionsView() {
  const { user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string>('SUPERVISOR');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

  // Editable roles based on user role
  const editableRoles = isSuperAdmin 
    ? ['COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR']
    : ['BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR'];

  // Load companies for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      loadCompanies();
    } else if (user?.companyId) {
      setSelectedCompanyId(user.companyId);
    }
  }, [user, isSuperAdmin]);

  // Load permissions when company changes
  useEffect(() => {
    loadPermissions();
  }, [selectedCompanyId, user]);

  const loadCompanies = async () => {
    try {
      const result = await companiesApi.list({ limit: 100 });
      if (result.success && result.data) {
        setCompanies(result.data);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const params: { companyId?: string } = {};
      if (selectedCompanyId) {
        params.companyId = selectedCompanyId;
      }
      
      const result = await permissionsApi.list(params);
      if (result.success && result.data) {
        setPermissions(result.data);
      } else {
        toast.error('Failed to load permissions');
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (role: string, permissionKey: string, value: boolean) => {
    // Optimistic update
    setPermissions(prev => prev.map(p => {
      if (p.role === role) {
        return { ...p, [permissionKey]: value, isCustom: true };
      }
      return p;
    }));

    setSaving(true);
    try {
      const currentPerm = permissions.find(p => p.role === role);
      
      // Build the permissions object
      const permsToUpdate: Record<string, boolean> = {};
      if (currentPerm) {
        Object.entries(currentPerm).forEach(([k, v]) => {
          if (k.startsWith('can') && typeof v === 'boolean') {
            permsToUpdate[k] = v;
          }
        });
      }
      permsToUpdate[permissionKey] = value;

      const result = await permissionsApi.update({
        role,
        companyId: selectedCompanyId,
        ...permsToUpdate,
      });

      if (result.success) {
        toast.success('Permission updated');
      } else {
        toast.error(result.error || 'Failed to update permission');
        // Revert on error
        loadPermissions();
      }
    } catch (err) {
      console.error('Failed to update permission:', err);
      toast.error('Failed to update permission');
      loadPermissions();
    } finally {
      setSaving(false);
    }
  };

  const handleResetPermissions = async (role: string) => {
    setSaving(true);
    try {
      const result = await permissionsApi.reset(role, selectedCompanyId || undefined);
      if (result.success) {
        toast.success('Permissions reset to defaults');
        loadPermissions();
      } else {
        toast.error(result.error || 'Failed to reset permissions');
      }
    } catch (err) {
      console.error('Failed to reset permissions:', err);
      toast.error('Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const getRolePermission = (role: string): Permission | undefined => {
    return permissions.find(p => p.role === role);
  };

  if (!isSuperAdmin && !isCompanyAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">You don't have permission to manage role permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Role Permissions</h1>
          <p className="text-muted-foreground">
            Configure what each role can view and manage in the system
          </p>
        </div>
      </div>

      {/* Company Selector for Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm font-medium">Select Company</Label>
                <p className="text-xs text-muted-foreground">
                  Choose a company to configure permissions for its users
                </p>
              </div>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Global (Default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (Default)</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid w-full grid-cols-4">
          {editableRoles.map((role) => {
            const perm = getRolePermission(role);
            return (
              <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                {roleLabels[role]}
                {perm?.isCustom && (
                  <Badge variant="secondary" className="ml-1 text-xs">Custom</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          editableRoles.map((role) => {
            const perm = getRolePermission(role);
            if (!perm) return null;

            return (
              <TabsContent key={role} value={role} className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          {roleLabels[role]}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {roleDescriptions[role]}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {perm.isCustom && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={saving}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset to Defaults
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Permissions</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will reset all permissions for {roleLabels[role]} to their default values. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleResetPermissions(role)}>
                                  Reset
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {permissionGroups.map((group) => (
                        <div key={group.name} className="space-y-3">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            {group.name}
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {group.permissions.map((permItem) => {
                              const isEnabled = perm[permItem.key] as boolean;

                              return (
                                <div
                                  key={permItem.key}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                >
                                  <div className="flex items-center gap-3">
                                    {permItem.type === 'view' && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                                        View
                                      </Badge>
                                    )}
                                    {permItem.type === 'create' && (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                                        Create
                                      </Badge>
                                    )}
                                    {permItem.type === 'manage' && (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">
                                        Manage
                                      </Badge>
                                    )}
                                    <Label className="cursor-pointer">
                                      {permItem.label}
                                    </Label>
                                  </div>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => 
                                      handleTogglePermission(role, permItem.key, checked)
                                    }
                                    disabled={saving}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })
        )}
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">About Permission Types</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span><Badge variant="outline" className="mr-1 bg-blue-50 text-blue-700">View</Badge> - Can only view the module</span>
                <span><Badge variant="outline" className="mr-1 bg-green-50 text-green-700">Create</Badge> - Can create new items</span>
                <span><Badge variant="outline" className="mr-1 bg-purple-50 text-purple-700">Manage</Badge> - Full create/edit/delete access</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isSuperAdmin 
                  ? 'As Super Admin, you can configure permissions for all roles across all companies. Select a company to customize permissions for that company, or use "Global" for default permissions.'
                  : 'As Company Admin, you can customize permissions for Branch Manager, Supervisor, and Auditor roles within your company.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
