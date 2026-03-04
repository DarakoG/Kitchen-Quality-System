'use client';

import { useEffect, useState } from 'react';
import { categoriesApi, companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useCompanySelectionStore } from '@/store/company-selection-store';
import { usePermissionsStore } from '@/store/permissions-store';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Loader2, Edit, Trash2, FolderOpen, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  companyId: string;
  _count?: { dishes: number };
}

interface Company {
  id: string;
  name: string;
}

const colorOptions = [
  { value: '#10b981', name: 'Emerald' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#ef4444', name: 'Red' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#84cc16', name: 'Lime' },
];

export function CategoriesView() {
  const { user } = useAuthStore();
  const { selectedCompanyId: filterCompanyId, setSelectedCompanyId: setFilterCompanyId } = useCompanySelectionStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#10b981',
    sortOrder: '0',
  });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, [user, filterCompanyId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load companies for Super Admin
      if (user.role === 'SUPER_ADMIN') {
        const companiesResult = await companiesApi.list({ limit: 100 });
        if (companiesResult.success && companiesResult.data) {
          setCompanies(companiesResult.data);
        }
      }

      // Load categories - filter by company for Super Admin if selected
      const result = await categoriesApi.list({ 
        companyId: user.role === 'SUPER_ADMIN' 
          ? (filterCompanyId && filterCompanyId !== 'all' ? filterCompanyId : undefined)
          : user.companyId,
        limit: 100 
      });
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role === 'AUDITOR') {
      toast.error('You do not have permission to perform this action');
      return;
    }

    if (user.role === 'SUPER_ADMIN' && !formCompanyId && !editingCategory) {
      toast.error('Please select a company');
      return;
    }

    // For non-SUPER_ADMIN users, verify they have a company assigned
    if (user.role !== 'SUPER_ADMIN' && !user.companyId) {
      toast.error('Your account is not assigned to a company. Please contact the administrator.');
      return;
    }

    setSaving(true);
    try {
      const companyId = editingCategory 
        ? editingCategory.companyId 
        : (user.role === 'SUPER_ADMIN' ? formCompanyId : user.companyId);
      
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
        sortOrder: parseInt(formData.sortOrder) || 0,
        companyId,
      };

      let result;
      if (editingCategory) {
        result = await categoriesApi.update(editingCategory.id, data);
      } else {
        result = await categoriesApi.create(data);
      }

      if (result.success) {
        toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        setDialogOpen(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', color: '#10b981', sortOrder: '0' });
        setFormCompanyId('');
        loadData();
      } else {
        toast.error(result.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormCompanyId(category.companyId);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      sortOrder: category.sortOrder.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const result = await categoriesApi.delete(id);
      if (result.success) {
        toast.success('Category deleted successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category');
    }
  };

  const filteredCategories = categories.filter(
    (category) => category.name.toLowerCase().includes(search.toLowerCase())
  );

  // Use actual permissions from store
  const permissions = usePermissionsStore((state) => state.permissions);
  const canCreate = permissions?.canManageCategories ?? false;

  // Get company name for a category
  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Unknown';
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage dish categories for your menu</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditingCategory(null); 
                setFormData({ name: '', description: '', color: '#10b981', sortOrder: '0' });
                setFormCompanyId('');
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update the category information.' : 'Create a new dish category.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {user?.role === 'SUPER_ADMIN' && !editingCategory && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select
                      value={formCompanyId}
                      onValueChange={setFormCompanyId}
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
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Appetizers, Main Courses, Desserts"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Company Selector for Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm font-medium">Filter by Company</Label>
                <p className="text-xs text-muted-foreground">
                  Select a company to view and manage its categories
                </p>
              </div>
              <Select value={filterCompanyId || 'all'} onValueChange={setFilterCompanyId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first category to start organizing your dishes.
            </p>
            {canCreate && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add First Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {user?.role === 'SUPER_ADMIN' && <TableHead>Company</TableHead>}
                  <TableHead>Description</TableHead>
                  <TableHead>Dishes</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  {canCreate && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </TableCell>
                    {user?.role === 'SUPER_ADMIN' && (
                      <TableCell>
                        <Badge variant="outline">{getCompanyName(category.companyId)}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="max-w-xs truncate">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category._count?.dishes || 0}</Badge>
                    </TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {canCreate && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
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
      )}
    </div>
  );
}
