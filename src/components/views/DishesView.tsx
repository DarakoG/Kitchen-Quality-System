'use client';

import { useEffect, useState } from 'react';
import { dishesApi, categoriesApi, companiesApi, checklistsApi, checklistTemplatesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useCompanySelectionStore } from '@/store/company-selection-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Loader2, Edit, Trash2, Building2, ListChecks, Copy, MoreHorizontal, Settings, CheckSquare, GripVertical, Check, ArrowRightFromLine } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Dish {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  prepTime?: number | null;
  isActive: boolean;
  companyId: string;
  category?: { id: string; name: string; color: string } | null;
  _count?: { checklistItems: number; qualityReports: number };
}

interface Category {
  id: string;
  name: string;
  color: string;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  companyId: string;
  items?: ChecklistTemplateItem[];
}

interface ChecklistTemplateItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  isRequired: boolean;
  weight: number;
  minValue?: number | null;
  maxValue?: number | null;
  passingScore?: number | null;
  sortOrder: number;
}

interface ChecklistItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  isRequired: boolean;
  weight: number;
  minValue?: number | null;
  maxValue?: number | null;
  passingScore?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export function DishesView() {
  const { user } = useAuthStore();
  const { selectedCompanyId, setSelectedCompanyId } = useCompanySelectionStore();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    sku: '',
    prepTime: '',
  });

  // Template management state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([]);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
  });

  // Checklist item dialog state
  const [templateItemDialogOpen, setTemplateItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [templateItemForm, setTemplateItemForm] = useState({
    name: '',
    description: '',
    type: 'SCORE_1_5',
    isRequired: true,
    weight: 1.0,
    minValue: null as number | null,
    maxValue: null as number | null,
    passingScore: null as number | null,
  });

  // Apply template state
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [selectedDishesForTemplate, setSelectedDishesForTemplate] = useState<Dish[]>([]);

  // Checklist management state
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceDish, setCopySourceDish] = useState<Dish | null>(null);
  const [copySearchOpen, setCopySearchOpen] = useState(false);
  const [copySearchValue, setCopySearchValue] = useState('');

  // Push to dishes state
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushTargetDishes, setPushTargetDishes] = useState<Dish[]>([]);
  const [pushSearchValue, setPushSearchValue] = useState('');

  const [savingChecklist, setSavingChecklist] = useState(false);
  const [savingApply, setSavingApply] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin && selectedCompanyId) {
      loadCategories(selectedCompanyId);
    }
  }, [selectedCompanyId, isSuperAdmin]);

  useEffect(() => {
    loadTemplates();
  }, [selectedCompanyId, isSuperAdmin]);

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(search.toLowerCase()) ||
      dish.sku?.toLowerCase().includes(search.toLowerCase());
    if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== 'all') {
      return dish.companyId === selectedCompanyId && matchesSearch;
    }
    return matchesSearch;
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'SUPER_ADMIN') {
        const companiesResult = await companiesApi.list({ limit: 100 });
        if (companiesResult.success && companiesResult.data) {
          setCompanies(companiesResult.data);
        }
        const dishesResult = await dishesApi.list({ limit: 100 });
        if (dishesResult.success && dishesResult.data) {
          setDishes(dishesResult.data);
        }
      } else {
        const [dishesResult, categoriesResult] = await Promise.all([
          dishesApi.list({ companyId: user.companyId, limit: 100 }),
          categoriesApi.list({ companyId: user.companyId, limit: 100 }),
        ]);

        if (dishesResult.success && dishesResult.data) {
          setDishes(dishesResult.data);
        }
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
        
        if (user.companyId) {
          setSelectedCompanyId(user.companyId);
        }
      }
    } catch (err) {
      console.error('Failed to load dishes:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (companyId: string) => {
    const result = await categoriesApi.list({ companyId, limit: 100 });
    if (result.success && result.data) {
      setCategories(result.data);
    }
  };

  const loadTemplates = async () => {
    const companyId = isSuperAdmin ? selectedCompanyId : user?.companyId;
    if (!companyId || companyId === 'all') return;
    
    try {
      const result = await checklistTemplatesApi.list({ companyId, limit: 100 });
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setSelectedCompanyId(dish.companyId);
    setFormData({
      name: dish.name,
      description: dish.description || '',
      categoryId: dish.category?.id || '',
      sku: dish.sku || '',
      prepTime: dish.prepTime?.toString() || '',
    });
    if (user?.role === 'SUPER_ADMIN') {
      loadCategories(dish.companyId);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;
    
    try {
      const result = await dishesApi.delete(id);
      if (result.success) {
        toast.success('Dish deleted successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to delete dish');
      }
    } catch (err) {
      console.error('Failed to delete dish:', err);
      toast.error('Failed to delete dish');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user?.role === 'SUPER_ADMIN' && !editingDish && !formCompanyId) {
      toast.error('Please select a company');
      return;
    }
    
    setSaving(true);
    try {
      const companyId = editingDish 
        ? editingDish.companyId 
        : (user?.role === 'SUPER_ADMIN' ? formCompanyId : user?.companyId);
      
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        sku: formData.sku || undefined,
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
        companyId,
      };

      let result;
      if (editingDish) {
        result = await dishesApi.update(editingDish.id, data);
      } else {
        result = await dishesApi.create(data);
      }

      if (result.success) {
        toast.success(editingDish ? 'Dish updated successfully' : 'Dish created successfully');
        setDialogOpen(false);
        setEditingDish(null);
        setFormData({ name: '', description: '', categoryId: '', sku: '', prepTime: '' });
        loadData();
      } else {
        toast.error(result.error || 'Failed to save dish');
      }
    } catch (err) {
      console.error('Failed to save dish:', err);
      toast.error('Failed to save dish');
    } finally {
      setSaving(false);
    }
  };

  // Template management handlers
  const handleCreateTemplate = () => {
    if (isSuperAdmin && !selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '' });
    setTemplateItems([]);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
    });
    setTemplateItems(template.items || []);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const result = await checklistTemplatesApi.delete(templateId);
      if (result.success) {
        toast.success('Template deleted');
        loadTemplates();
      } else {
        toast.error(result.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template');
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyId = isSuperAdmin ? selectedCompanyId : user?.companyId;
    
    if (!companyId || companyId === 'all') {
      toast.error('Please select a company');
      return;
    }
    
    if (!templateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    setSavingChecklist(true);
    try {
      const templateData = {
        name: templateForm.name,
        description: templateForm.description || undefined,
        isDefault: editingTemplate?.isDefault ?? false,
        items: templateItems.map((item, index) => ({
          name: item.name,
          description: item.description,
          type: item.type as 'SCORE_1_5' | 'BOOLEAN' | 'NUMERIC' | 'TEXT',
          isRequired: item.isRequired ?? true,
          weight: item.weight ?? 1.0,
          minValue: item.minValue,
          maxValue: item.maxValue,
          passingScore: item.passingScore,
          sortOrder: index,
        })),
      };

      let result;
      if (editingTemplate) {
        result = await checklistTemplatesApi.update(editingTemplate.id, templateData);
      } else {
        result = await checklistTemplatesApi.create({
          companyId,
          ...templateData,
        });
      }

      if (result.success) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created');
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        setTemplateItems([]);
        loadTemplates();
      } else {
        toast.error(result.error || 'Failed to save template');
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error('Failed to save template');
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleAddTemplateItem = () => {
    setTemplateItems([
      ...templateItems,
      {
        id: `temp-${Date.now()}`,
        name: '',
        description: '',
        type: 'SCORE_1_5',
        isRequired: true,
        weight: 1.0,
        minValue: null,
        maxValue: null,
        passingScore: null,
        sortOrder: templateItems.length,
      },
    ]);
  };

  const handleUpdateTemplateItem = (index: number, field: keyof ChecklistTemplateItem, value: any) => {
    const newItems = [...templateItems];
    (newItems[index] as any)[field] = value;
    setTemplateItems(newItems);
  };

  const handleRemoveTemplateItem = (index: number) => {
    setTemplateItems(templateItems.filter((_, i) => i !== index));
  };

  // Checklist management handlers
  const handleOpenChecklist = (dish: Dish) => {
    setSelectedDish(dish);
    setChecklistDialogOpen(true);
    loadChecklistItems(dish.id);
  };

  const loadChecklistItems = async (dishId: string) => {
    setLoadingChecklist(true);
    try {
      const result = await checklistsApi.list(dishId);
      if (result.success && result.data) {
        setChecklistItems(result.data);
      } else {
        setChecklistItems([]);
      }
    } catch (err) {
      console.error('Failed to load checklist items:', err);
      setChecklistItems([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleAddChecklistItem = () => {
    setEditingItem(null);
    setTemplateItemForm({
      name: '',
      description: '',
      type: 'SCORE_1_5',
      isRequired: true,
      weight: 1.0,
      minValue: null,
      maxValue: null,
      passingScore: null,
    });
    setTemplateItemDialogOpen(true);
  };

  const handleEditChecklistItem = (item: ChecklistItem) => {
    setEditingItem(item);
    setTemplateItemForm({
      name: item.name,
      description: item.description || '',
      type: item.type,
      isRequired: item.isRequired,
      weight: item.weight,
      minValue: item.minValue,
      maxValue: item.maxValue,
      passingScore: item.passingScore,
    });
    setTemplateItemDialogOpen(true);
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this checklist item?')) return;
    
    try {
      const result = await checklistsApi.delete(itemId);
      if (result.success) {
        toast.success('Checklist item deleted');
        if (selectedDish) {
          loadChecklistItems(selectedDish.id);
        }
      } else {
        toast.error(result.error || 'Failed to delete checklist item');
      }
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      toast.error('Failed to delete checklist item');
    }
  };

  const handleSaveChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish) return;

    setSavingChecklist(true);
    try {
      const data = {
        dishId: selectedDish.id,
        name: templateItemForm.name,
        description: templateItemForm.description || undefined,
        type: templateItemForm.type as 'SCORE_1_5' | 'BOOLEAN' | 'NUMERIC' | 'TEXT',
        isRequired: templateItemForm.isRequired,
        weight: templateItemForm.weight,
        minValue: templateItemForm.type === 'NUMERIC' ? templateItemForm.minValue : undefined,
        maxValue: templateItemForm.type === 'NUMERIC' ? templateItemForm.maxValue : undefined,
        passingScore: templateItemForm.passingScore ?? null,
        sortOrder: editingItem ? editingItem.sortOrder : checklistItems.length,
      };

      let result;
      if (editingItem) {
        result = await checklistsApi.update(editingItem.id, data);
      } else {
        result = await checklistsApi.create(data);
      }

      if (result.success) {
        toast.success(editingItem ? 'Checklist item updated' : 'Checklist item added');
        setTemplateItemDialogOpen(false);
        loadChecklistItems(selectedDish.id);
      } else {
        toast.error(result.error || 'Failed to save checklist item');
      }
    } catch (err) {
      console.error('Failed to save checklist item:', err);
      toast.error('Failed to save checklist item');
    } finally {
      setSavingChecklist(false);
    }
  };

  // Apply template handlers
  const handleOpenApplyDialog = () => {
    if (isSuperAdmin && !selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    setSelectedDishesForTemplate(filteredDishes.filter(d => (d._count?.checklistItems || 0) === 0));
    setApplyTemplateOpen(true);
  };

  const handleApplyTemplateToDishes = async () => {
    if (!selectedTemplate || selectedDishesForTemplate.length === 0) {
      toast.error('Please select a template and at least one dish');
      return;
    }

    setSavingApply(true);
    try {
      const templateId = selectedTemplate.id;
      const dishIds = selectedDishesForTemplate.map(d => d.id);

      const result = await checklistTemplatesApi.applyToDishes(templateId, dishIds);
      if (result.success) {
        toast.success(`Template applied to ${dishIds.length} dishes successfully`);
        setApplyTemplateOpen(false);
        setSelectedDishesForTemplate([]);
        loadData();
      } else {
        toast.error(result.error || 'Failed to apply template');
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
      toast.error('Failed to apply template');
    } finally {
      setSavingApply(false);
    }
  };

  // Copy from dish handlers
  const handleOpenCopyDialog = () => {
    setCopySourceDish(null);
    setCopySearchValue('');
    setCopyDialogOpen(true);
  };

  const handleCopyFromDish = async () => {
    if (!copySourceDish || !selectedDish) {
      toast.error('Please select a source dish');
      return;
    }

    setSavingChecklist(true);
    try {
      const result = await checklistsApi.list(copySourceDish.id);
      
      if (!result.success || !result.data) {
        toast.error('Failed to fetch checklist items from source dish');
        setSavingChecklist(false);
        return;
      }
      
      if (result.data.length === 0) {
        toast.error('Source dish has no checklist items to copy');
        setSavingChecklist(false);
        return;
      }

      const createPromises = result.data.map((item: ChecklistItem, index: number) => {
        const data: any = {
          dishId: selectedDish.id,
          name: item.name,
          description: item.description || undefined,
          type: item.type,
          isRequired: item.isRequired ?? true,
          weight: item.weight ?? 1.0,
          sortOrder: index,
        };
        
        // Only include minValue/maxValue for NUMERIC type
        if (item.type === 'NUMERIC') {
          data.minValue = item.minValue;
          data.maxValue = item.maxValue;
        }
        
        // Only include passingScore if it exists
        if (item.passingScore !== null && item.passingScore !== undefined) {
          data.passingScore = item.passingScore;
        }
        
        return checklistsApi.create(data);
      });

      const results = await Promise.all(createPromises);
      const failedItems = results.map((r, i) => ({ result: r, index: i })).filter(r => !r.result.success);
      
      if (failedItems.length > 0) {
        const failedNames = failedItems.map(f => result.data[f.index]?.name || 'Unknown').join(', ');
        toast.warning(`Copied ${result.data.length - failedItems.length} of ${result.data.length} criteria. Failed: ${failedNames}`);
        console.error('Failed items:', failedItems.map(f => ({ name: result.data[f.index]?.name, error: f.result.error })));
      } else {
        toast.success(`Copied ${result.data.length} criteria from ${copySourceDish.name}`);
      }
      
      setCopyDialogOpen(false);
      setCopySourceDish(null);
      // Refresh both checklist items and dishes list
      await loadChecklistItems(selectedDish.id);
      await loadData();
    } catch (err) {
      console.error('Failed to copy checklist:', err);
      toast.error('Failed to copy checklist items');
    } finally {
      setSavingChecklist(false);
    }
  };

  // Push to dishes handlers
  const handleOpenPushDialog = () => {
    if (checklistItems.length === 0) {
      toast.error('No criteria to push. Add criteria first.');
      return;
    }
    setPushTargetDishes([]);
    setPushSearchValue('');
    setPushDialogOpen(true);
  };

  const handlePushToDishes = async () => {
    if (!selectedDish || pushTargetDishes.length === 0) {
      toast.error('Please select at least one target dish');
      return;
    }

    setSavingChecklist(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const targetDish of pushTargetDishes) {
        // First get existing items for this dish
        const existingResult = await checklistsApi.list(targetDish.id);
        const existingCount = existingResult.success && existingResult.data ? existingResult.data.length : 0;

        // Create all checklist items for target dish
        const createPromises = checklistItems.map((item, index) => {
          const data: any = {
            dishId: targetDish.id,
            name: item.name,
            description: item.description || undefined,
            type: item.type,
            isRequired: item.isRequired ?? true,
            weight: item.weight ?? 1.0,
            sortOrder: existingCount + index,
          };
          
          if (item.type === 'NUMERIC') {
            data.minValue = item.minValue;
            data.maxValue = item.maxValue;
          }
          
          if (item.passingScore !== null && item.passingScore !== undefined) {
            data.passingScore = item.passingScore;
          }
          
          return checklistsApi.create(data);
        });

        const results = await Promise.all(createPromises);
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`Pushed ${checklistItems.length} criteria to ${successCount} dishes successfully`);
      } else {
        toast.warning(`Pushed to ${successCount} dishes. Failed for ${failCount} dishes.`);
      }
      
      setPushDialogOpen(false);
      setPushTargetDishes([]);
      await loadData();
    } catch (err) {
      console.error('Failed to push criteria:', err);
      toast.error('Failed to push criteria to dishes');
    } finally {
      setSavingChecklist(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SCORE_1_5': return 'Score (1-5)';
      case 'BOOLEAN': return 'Yes/No';
      case 'NUMERIC': return 'Numeric';
      case 'TEXT': return 'Text';
      default: return type;
    }
  };

  const canCreate = user && user.role !== 'AUDITOR';
  const canManageTemplates = user && (user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN');
  const canApplyTemplates = user && user.role !== 'AUDITOR';

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
          <h1 className="text-3xl font-bold">Dishes</h1>
          <p className="text-muted-foreground">Manage your menu items and quality criteria</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingDish(null);
                  setFormData({ name: '', description: '', categoryId: '', sku: '', prepTime: '' });
                  if (!isSuperAdmin && user?.companyId) {
                    setFormCompanyId(user.companyId);
                  } else {
                    setFormCompanyId(selectedCompanyId || '');
                  }
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Dish
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDish ? 'Edit Dish' : 'Add New Dish'}</DialogTitle>
                  <DialogDescription>
                    {editingDish ? 'Update the dish information.' : 'Add a new dish to your menu.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSuperAdmin && !editingDish && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Company *</Label>
                      <Select
                        value={formCompanyId}
                        onValueChange={(v) => {
                          setFormCompanyId(v);
                          setFormData({ ...formData, categoryId: '' });
                          loadCategories(v);
                        }}
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
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                      disabled={isSuperAdmin && !formCompanyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={categories.length === 0 ? "No categories available" : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 && formCompanyId && (
                      <p className="text-xs text-muted-foreground">
                        No categories found. Please create categories first.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prepTime">Prep Time (min)</Label>
                      <Input
                        id="prepTime"
                        type="number"
                        value={formData.prepTime}
                        onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editingDish ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                  Select a company to view and manage its dishes
                </p>
              </div>
              <Select value={selectedCompanyId || 'all'} onValueChange={setSelectedCompanyId}>
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

      {/* Templates Section */}
      {canManageTemplates && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Copy className="h-4 w-4 text-emerald-600" />
              Quality Criteria Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates created yet. Create templates to quickly apply criteria to multiple dishes.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-emerald-50"
                      onClick={() => handleEditTemplate(template)}
                    >
                      {template.name} ({template.items?.length || 0} items)
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={handleCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Apply Template Section */}
      {canApplyTemplates && templates.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                <div>
                  <Label className="text-sm font-medium">Quick Apply Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Apply a template to dishes without criteria
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTemplate?.id || ''}
                  onValueChange={(v) => setSelectedTemplate(templates.find(t => t.id === v) || null)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleOpenApplyDialog}
                  disabled={!selectedTemplate}
                >
                  Apply to Dishes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {categories.length === 0 && !isSuperAdmin && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No categories found. Please create categories first before adding dishes.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {user?.role === 'SUPER_ADMIN' && <TableHead>Company</TableHead>}
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Prep Time</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Status</TableHead>
                {canCreate && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDishes.map((dish) => (
                <TableRow key={dish.id}>
                  <TableCell className="font-medium">{dish.name}</TableCell>
                  {user?.role === 'SUPER_ADMIN' && (
                    <TableCell>
                      {companies.find(c => c.id === dish.companyId)?.name || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    {dish.category ? (
                      <Badge style={{ backgroundColor: dish.category.color + '20', color: dish.category.color }}>
                        {dish.category.name}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{dish.sku || '-'}</TableCell>
                  <TableCell>{dish.prepTime ? `${dish.prepTime} min` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={dish._count?.checklistItems ? 'default' : 'secondary'}>
                      {dish._count?.checklistItems || 0} items
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={dish.isActive ? 'default' : 'secondary'}>
                      {dish.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canCreate && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenChecklist(dish)}
                        title="Manage Quality Criteria"
                      >
                        <ListChecks className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dish)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dish.id)}>
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

      {/* Checklist Management Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              Quality Criteria for: {selectedDish?.name}
            </DialogTitle>
            <DialogDescription>
              Define the quality evaluation criteria for this dish. These will be used in quality reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {checklistItems.length} criteria configured
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleOpenCopyDialog}>
                  <Copy className="mr-2 h-4 w-4" /> Copy from Dish
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenPushDialog} disabled={checklistItems.length === 0}>
                  <ArrowRightFromLine className="mr-2 h-4 w-4" /> Push to Dishes
                </Button>
                <Button size="sm" onClick={handleAddChecklistItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add Criterion
                </Button>
              </div>
            </div>

            {loadingChecklist ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : checklistItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No quality criteria configured yet.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add criteria like presentation, temperature, taste, etc.
                  </p>
                  <Button onClick={handleAddChecklistItem}>
                    <Plus className="mr-2 h-4 w-4" /> Add First Criterion
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(item.type)}
                              </Badge>
                              {item.isRequired && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                  Required
                                </Badge>
                              )}
                              {item.description && (
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Weight: {item.weight}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleEditChecklistItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteChecklistItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template to Dishes</DialogTitle>
            <DialogDescription>
              This will add the template criteria to selected dishes. Existing criteria will be kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template: {selectedTemplate?.name}</Label>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate?.items?.length || 0} criteria will be added to each dish
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select dishes to apply ({filteredDishes.filter(d => (d._count?.checklistItems || 0) === 0).length} dishes without criteria)</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                {filteredDishes.filter(d => (d._count?.checklistItems || 0) === 0).map((dish) => (
                  <label key={dish.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedDishesForTemplate.includes(dish)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDishesForTemplate([...selectedDishesForTemplate, dish]);
                        } else {
                          setSelectedDishesForTemplate(selectedDishesForTemplate.filter(d => d.id !== dish.id));
                        }
                      }}
                    />
                    <span className="text-sm">{dish.name}</span>
                  </label>
                ))}
                {filteredDishes.filter(d => (d._count?.checklistItems || 0) === 0).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All dishes already have criteria configured
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApplyTemplateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyTemplateToDishes}
                disabled={!selectedTemplate || selectedDishesForTemplate.length === 0 || savingApply}
              >
                {savingApply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply Template ({selectedDishesForTemplate.length} dishes)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy from Dish Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Criteria from Another Dish</DialogTitle>
            <DialogDescription>
              Select a dish to copy its quality criteria to &quot;{selectedDish?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select source dish</Label>
              <Popover open={copySearchOpen} onOpenChange={setCopySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={copySearchOpen}
                    className="w-full justify-between"
                  >
                    {copySourceDish ? `${copySourceDish.name} (${copySourceDish._count?.checklistItems || 0} items)` : 'Select source dish...'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search dishes..." 
                      value={copySearchValue}
                      onValueChange={setCopySearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No dishes found with criteria.</CommandEmpty>
                      <CommandGroup>
                        {dishes
                          .filter(d => 
                            d.id !== selectedDish?.id && 
                            (d._count?.checklistItems || 0) > 0 &&
                            d.name.toLowerCase().includes(copySearchValue.toLowerCase())
                          )
                          .map((dish) => (
                            <CommandItem
                              key={dish.id}
                              value={dish.name}
                              onSelect={() => {
                                setCopySourceDish(dish);
                                setCopySearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  copySourceDish?.id === dish.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center justify-between w-full">
                                <span>{dish.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {dish._count?.checklistItems} items
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {copySourceDish && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-sm text-muted-foreground">
                    Will copy <strong>{copySourceDish._count?.checklistItems || 0}</strong> quality criteria from <strong>{copySourceDish.name}</strong>
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCopyFromDish}
                disabled={!copySourceDish || savingChecklist}
              >
                {savingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Copy Criteria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Push to Dishes Dialog */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Push Criteria to Other Dishes</DialogTitle>
            <DialogDescription>
              Push {checklistItems.length} criteria from &quot;{selectedDish?.name}&quot; to selected dishes. 
              Existing criteria on target dishes will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search and select target dishes</Label>
              <Input
                placeholder="Search dishes..."
                value={pushSearchValue}
                onChange={(e) => setPushSearchValue(e.target.value)}
              />
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              <div className="p-2 space-y-1">
                {filteredDishes
                  .filter(d => 
                    d.id !== selectedDish?.id &&
                    d.name.toLowerCase().includes(pushSearchValue.toLowerCase())
                  )
                  .map((dish) => (
                    <label
                      key={dish.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={pushTargetDishes.includes(dish)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPushTargetDishes([...pushTargetDishes, dish]);
                          } else {
                            setPushTargetDishes(pushTargetDishes.filter(d => d.id !== dish.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{dish.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dish.category?.name || 'No category'} • {dish._count?.checklistItems || 0} existing criteria
                        </p>
                      </div>
                    </label>
                  ))}
                {filteredDishes.filter(d => 
                  d.id !== selectedDish?.id &&
                  d.name.toLowerCase().includes(pushSearchValue.toLowerCase())
                ).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No dishes found</p>
                )}
              </div>
            </div>

            {pushTargetDishes.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-sm text-muted-foreground">
                    Will push <strong>{checklistItems.length}</strong> criteria to <strong>{pushTargetDishes.length}</strong> dishes
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pushTargetDishes.slice(0, 5).map(d => (
                      <Badge key={d.id} variant="secondary" className="text-xs">{d.name}</Badge>
                    ))}
                    {pushTargetDishes.length > 5 && (
                      <Badge variant="secondary" className="text-xs">+{pushTargetDishes.length - 5} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPushDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePushToDishes}
                disabled={pushTargetDishes.length === 0 || savingChecklist}
              >
                {savingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Push to {pushTargetDishes.length} Dishes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template management dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-emerald-600" />
              {editingTemplate ? 'Edit Template' : 'Create Quality Criteria Template'}
            </DialogTitle>
            <DialogDescription>
              Create reusable templates to quickly apply criteria to multiple dishes
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g., General Quality, Fast Food Standards"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Template Items ({templateItems.length})
              </p>
              <Button type="button" onClick={handleAddTemplateItem} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            {templateItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-4 text-center">
                  <p className="text-muted-foreground">
                    No items added yet. Click &quot;Add Item&quot; to create criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {templateItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="py-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 text-muted-foreground text-sm">
                          {index + 1}
                        </div>
                        <div className="col-span-4">
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateTemplateItem(index, 'name', e.target.value)}
                            placeholder="e.g., Presentation"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Select
                            value={item.type}
                            onValueChange={(v) => handleUpdateTemplateItem(index, 'type', v)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SCORE_1_5">Score 1-5</SelectItem>
                              <SelectItem value="BOOLEAN">Yes/No</SelectItem>
                              <SelectItem value="NUMERIC">Numeric</SelectItem>
                              <SelectItem value="TEXT">Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={item.weight}
                            onChange={(e) => handleUpdateTemplateItem(index, 'weight', parseFloat(e.target.value) || 1)}
                            className="text-sm"
                            placeholder="Weight"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <Checkbox
                            checked={item.isRequired}
                            onCheckedChange={(checked) => handleUpdateTemplateItem(index, 'isRequired', checked)}
                          />
                          <span className="text-xs">Req</span>
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTemplateItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingChecklist || !templateForm.name.trim()}>
                {savingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Checklist Item Dialog */}
      <Dialog open={templateItemDialogOpen} onOpenChange={setTemplateItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Criterion' : 'Add New Criterion'}</DialogTitle>
            <DialogDescription>
              Define a quality evaluation criterion for this dish.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveChecklistItem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Name *</Label>
              <Input
                id="itemName"
                value={templateItemForm.name}
                onChange={(e) => setTemplateItemForm({ ...templateItemForm, name: e.target.value })}
                placeholder="e.g., Presentation, Temperature, Taste"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={templateItemForm.description}
                onChange={(e) => setTemplateItemForm({ ...templateItemForm, description: e.target.value })}
                placeholder="Optional description of this criterion"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemType">Evaluation Type *</Label>
              <Select
                value={templateItemForm.type}
                onValueChange={(v) => setTemplateItemForm({ ...templateItemForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCORE_1_5">Score (1-5) - Rating scale</SelectItem>
                  <SelectItem value="BOOLEAN">Yes/No - Pass or fail</SelectItem>
                  <SelectItem value="NUMERIC">Numeric - Custom range</SelectItem>
                  <SelectItem value="TEXT">Text - Written feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateItemForm.type === 'NUMERIC' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minValue">Minimum Value</Label>
                  <Input
                    id="minValue"
                    type="number"
                    value={templateItemForm.minValue || ''}
                    onChange={(e) => setTemplateItemForm({ ...templateItemForm, minValue: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Maximum Value</Label>
                  <Input
                    id="maxValue"
                    type="number"
                    value={templateItemForm.maxValue || ''}
                    onChange={(e) => setTemplateItemForm({ ...templateItemForm, maxValue: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={templateItemForm.weight}
                  onChange={(e) => setTemplateItemForm({ ...templateItemForm, weight: parseFloat(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">Higher weight = more impact on score</p>
              </div>

              <div className="space-y-2 flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateItemForm.isRequired}
                    onChange={(e) => setTemplateItemForm({ ...templateItemForm, isRequired: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Required criterion</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setTemplateItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingChecklist || !templateItemForm.name}>
                {savingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingItem ? 'Update' : 'Add'} Criterion
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
