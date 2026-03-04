'use client';

import { useEffect, useState } from 'react';
import { branchesApi, companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Loader2, Store, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Branch {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  isActive: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  companyId: string;
  company?: { id: string; name: string } | null;
  _count?: { users: number; qualityReports: number };
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

export function BranchesView() {
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    city: '',
    opensAt: '',
    closesAt: '',
    companyId: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load branches
      const branchesResult = await branchesApi.list({ limit: 100 });
      if (branchesResult.success && branchesResult.data) {
        setBranches(branchesResult.data);
      }

      // Load companies for Super Admin
      if (user.role === 'SUPER_ADMIN') {
        const companiesResult = await companiesApi.list({ limit: 100 });
        if (companiesResult.success && companiesResult.data) {
          setCompanies(companiesResult.data);
        }
      } else if (user.companyId) {
        // For company admin, only their company
        const companyResult = await companiesApi.get(user.companyId);
        if (companyResult.success && companyResult.data) {
          setCompanies([companyResult.data]);
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId && user?.role !== 'COMPANY_ADMIN') {
      toast.error('Please select a company');
      return;
    }

    setSaving(true);
    try {
      const companyId = user?.role === 'COMPANY_ADMIN' ? user.companyId : formData.companyId;
      
      const data = {
        name: formData.name,
        code: formData.code,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        opensAt: formData.opensAt || undefined,
        closesAt: formData.closesAt || undefined,
        companyId,
      };

      let result;
      if (editingBranch) {
        result = await branchesApi.update(editingBranch.id, data);
      } else {
        result = await branchesApi.create(data);
      }

      if (result.success) {
        toast.success(editingBranch ? 'Branch updated successfully' : 'Branch created successfully');
        setDialogOpen(false);
        setEditingBranch(null);
        setFormData({ name: '', code: '', email: '', phone: '', city: '', opensAt: '', closesAt: '', companyId: '' });
        loadData();
      } else {
        toast.error(result.error || 'Failed to save branch');
      }
    } catch (err) {
      console.error('Failed to save branch:', err);
      toast.error('Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      email: branch.email || '',
      phone: branch.phone || '',
      city: branch.city || '',
      opensAt: branch.opensAt || '',
      closesAt: branch.closesAt || '',
      companyId: branch.companyId || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    
    try {
      const result = await branchesApi.delete(id);
      if (result.success) {
        toast.success('Branch deleted successfully');
        loadBranches();
      } else {
        toast.error(result.error || 'Failed to delete branch');
      }
    } catch (err) {
      console.error('Failed to delete branch:', err);
      toast.error('Failed to delete branch');
    }
  };

  const loadBranches = async () => {
    const result = await branchesApi.list({ limit: 100 });
    if (result.success && result.data) {
      setBranches(result.data);
    }
  };

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.code.toLowerCase().includes(search.toLowerCase()) ||
      branch.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = user && user.role !== 'AUDITOR' && user.role !== 'SUPERVISOR';

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
          <h1 className="text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground">Manage restaurant locations</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditingBranch(null); 
                setFormData({ name: '', code: '', email: '', phone: '', city: '', opensAt: '', closesAt: '', companyId: '' }); 
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                <DialogDescription>
                  {editingBranch ? 'Update the branch information.' : 'Create a new restaurant location.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {user?.role === 'SUPER_ADMIN' && !editingBranch && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select 
                      value={formData.companyId} 
                      onValueChange={(v) => setFormData({ ...formData, companyId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Downtown Location"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., DT"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opensAt">Opens At</Label>
                    <Input
                      id="opensAt"
                      type="time"
                      value={formData.opensAt}
                      onChange={(e) => setFormData({ ...formData, opensAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closesAt">Closes At</Label>
                    <Input
                      id="closesAt"
                      type="time"
                      value={formData.closesAt}
                      onChange={(e) => setFormData({ ...formData, closesAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingBranch ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
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
                {user?.role === 'SUPER_ADMIN' && <TableHead>Company</TableHead>}
                <TableHead>Code</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Status</TableHead>
                {canCreate && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  {user?.role === 'SUPER_ADMIN' && (
                    <TableCell>
                      {branch.company ? (
                        <Badge variant="outline">{branch.company.name}</Badge>
                      ) : '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{branch.code}</code>
                  </TableCell>
                  <TableCell>{branch.city || '-'}</TableCell>
                  <TableCell>
                    {branch.opensAt && branch.closesAt
                      ? `${branch.opensAt} - ${branch.closesAt}`
                      : '-'}
                  </TableCell>
                  <TableCell>{branch._count?.users || 0}</TableCell>
                  <TableCell>{branch._count?.qualityReports || 0}</TableCell>
                  <TableCell>
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canCreate && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
