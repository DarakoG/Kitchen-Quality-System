'use client';

import { useEffect, useState } from 'react';
import { usersApi, branchesApi, companiesApi } from '@/lib/api';
import { useAuthStore, hasPermission, UserRole } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Loader2, Edit, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
  company?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  branches?: { id: string; name: string }[] | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  COMPANY_ADMIN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  BRANCH_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SUPERVISOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  AUDITOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const roleDescriptions: Record<string, string> = {
  SUPER_ADMIN: 'Full system access - manages all companies and settings',
  COMPANY_ADMIN: 'Company administration - manages branches and users in a company',
  BRANCH_MANAGER: 'Branch management - supervises staff in assigned branches',
  SUPERVISOR: 'Quality control - creates reports in assigned branches',
  AUDITOR: 'Read-only access - views reports in assigned branches',
};

export function UsersView() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPERVISOR',
    companyId: '',
    branchIds: [] as string[],
    phone: '',
  });

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResult, branchesResult, companiesResult] = await Promise.all([
        usersApi.list({ limit: 100 }),
        branchesApi.list({ limit: 100 }),
        isSuperAdmin ? companiesApi.list({ limit: 100 }) : Promise.resolve({ success: true, data: [] }),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      }
      if (branchesResult.success && branchesResult.data) {
        setBranches(branchesResult.data);
      }
      if (companiesResult.success && companiesResult.data) {
        setCompanies(companiesResult.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get available branches based on selected company
  const getAvailableBranches = () => {
    if (isSuperAdmin && formData.companyId) {
      return branches.filter(b => b.companyId === formData.companyId);
    }
    if (isCompanyAdmin && currentUser?.companyId) {
      return branches.filter(b => b.companyId === currentUser.companyId);
    }
    return branches;
  };

  // Check if branch selection is needed for the current role
  const needsBranchSelection = ['BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR'].includes(formData.role);
  // Super Admin needs to select company for Company Admin AND for branch roles
  const needsCompanySelection = isSuperAdmin && (formData.role === 'COMPANY_ADMIN' || needsBranchSelection);

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
      companyId: role === 'COMPANY_ADMIN' ? formData.companyId : '',
      branchIds: ['BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR'].includes(role) ? formData.branchIds : [],
    });
  };

  const handleBranchToggle = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter(id => id !== branchId)
        : [...prev.branchIds, branchId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on role
    if (needsCompanySelection && !formData.companyId) {
      toast.error('Please select a company');
      return;
    }
    
    // For COMPANY_ADMIN role, ensure companyId is set
    if (formData.role === 'COMPANY_ADMIN' && isCompanyAdmin && !currentUser?.companyId) {
      toast.error('Your account is not assigned to a company. Please contact the administrator.');
      return;
    }
    
    if (needsBranchSelection && formData.branchIds.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }

    try {
      const data: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        password: formData.password || undefined,
        role: formData.role,
        phone: formData.phone || undefined,
      };

      // Set companyId for COMPANY_ADMIN
      if (formData.role === 'COMPANY_ADMIN') {
        if (isSuperAdmin) {
          data.companyId = formData.companyId;
        } else if (currentUser?.companyId) {
          data.companyId = currentUser.companyId;
        }
      }

      // Set branchIds for roles that need branches
      if (needsBranchSelection) {
        data.branchIds = formData.branchIds;
      }

      if (editingUser) {
        const result = await usersApi.update(editingUser.id, data);
        if (result.success) {
          toast.success('User updated successfully');
          setDialogOpen(false);
          setEditingUser(null);
          resetForm();
          loadData();
        } else {
          toast.error(result.error || 'Failed to update user');
        }
      } else {
        const result = await usersApi.create(data);
        if (result.success) {
          toast.success('User created successfully');
          setDialogOpen(false);
          resetForm();
          loadData();
        } else {
          toast.error(result.error || 'Failed to create user');
        }
      }
    } catch (err) {
      console.error('Failed to save user:', err);
      toast.error('Failed to save user');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'SUPERVISOR',
      companyId: '',
      branchIds: [],
      phone: '',
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      companyId: user.company?.id || '',
      branchIds: user.branches?.map(b => b.id) || (user.branch?.id ? [user.branch.id] : []),
      phone: user.phone || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const result = await usersApi.delete(id);
        if (result.success) {
          toast.success('User deleted successfully');
          loadData();
        } else {
          toast.error(result.error || 'Failed to delete user');
        }
      } catch (err) {
        console.error('Failed to delete user:', err);
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  // Get role options based on current user
  const getRoleOptions = () => {
    const roles = [
      { value: 'COMPANY_ADMIN', label: 'Company Admin' },
      { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'AUDITOR', label: 'Auditor' },
    ];
    
    if (isSuperAdmin) {
      roles.unshift({ value: 'SUPER_ADMIN', label: 'Super Admin' });
    }
    
    return roles;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingUser(null); resetForm(); }}>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information.' : 'Create a new user account.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.role && roleDescriptions[formData.role] && (
                  <p className="text-xs text-muted-foreground">{roleDescriptions[formData.role]}</p>
                )}
              </div>

              {/* Company Selection for COMPANY_ADMIN and branch roles (Super Admin only) */}
              {needsCompanySelection && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <Select 
                    value={formData.companyId} 
                    onValueChange={(v) => setFormData({ ...formData, companyId: v, branchIds: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.role === 'COMPANY_ADMIN' 
                      ? 'This user will manage this company and all its branches.'
                      : 'Select the company to see its available branches.'}
                  </p>
                </div>
              )}

              {/* Branch Selection for BRANCH_MANAGER, SUPERVISOR, AUDITOR */}
              {needsBranchSelection && (
                <div className="space-y-2">
                  <Label>Branches * (Select one or more)</Label>
                  {isSuperAdmin && !formData.companyId ? (
                    <p className="text-sm text-muted-foreground border rounded-lg p-3 text-center">
                      Please select a company first to see available branches
                    </p>
                  ) : (
                    <>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {getAvailableBranches().length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No branches available
                          </p>
                        ) : (
                          getAvailableBranches().map((branch) => (
                            <div key={branch.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`branch-${branch.id}`}
                                checked={formData.branchIds.includes(branch.id)}
                                onCheckedChange={() => handleBranchToggle(branch.id)}
                              />
                              <label
                                htmlFor={`branch-${branch.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {branch.name} ({branch.code})
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      {formData.branchIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formData.branchIds.length} branch(es) selected
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.company?.name || '-'}</TableCell>
                    <TableCell>
                      {user.branches && user.branches.length > 0
                        ? user.branches.map(b => b.name).join(', ')
                        : user.branch?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
