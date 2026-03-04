'use client';

import { useEffect, useState } from 'react';
import { qualityReportsApi, dishesApi, branchesApi, companiesApi } from '@/lib/api';
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
import { Plus, Search, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

interface QualityReport {
  id: string;
  shift: string;
  evaluationDate: string;
  status: string;
  overallScore?: number | null;
  exitTime?: number | null;
  notes?: string | null;
  dish?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    scoreValue?: number | null;
    booleanValue?: boolean | null;
    isPassed: boolean;
    checklistItem?: { name: string; type: string } | null;
  }>;
}

interface Dish {
  id: string;
  name: string;
  checklistItems?: Array<{
    id: string;
    name: string;
    type: string;
    isRequired: boolean;
    minValue?: number | null;
    maxValue?: number | null;
  }>;
}

interface Branch {
  id: string;
  name: string;
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
}

export function QualityReportsView() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanySelectionStore();
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<QualityReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Create report state
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedCompanyIdForReport, setSelectedCompanyIdForReport] = useState('');
  const [reportForm, setReportForm] = useState({
    branchId: '',
    dishId: '',
    shift: 'LUNCH',
    exitTime: '',
    notes: '',
    items: [] as Array<{
      checklistItemId: string;
      scoreValue?: number | null;
      booleanValue?: boolean | null;
      textValue?: string | null;
      isPassed: boolean;
    }>,
  });

  // Use actual permissions from store
  const permissions = usePermissionsStore((state) => state.permissions);
  const canCreate = permissions?.canCreateReports ?? false;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, [user, selectedCompanyId]);

  useEffect(() => {
    // When dish changes, load its checklist
    if (selectedDishId) {
      loadDishChecklist(selectedDishId);
    }
  }, [selectedDishId]);

  // Load branches when company changes in report form
  useEffect(() => {
    if (selectedCompanyIdForReport) {
      loadBranchesForCompany(selectedCompanyIdForReport);
    }
  }, [selectedCompanyIdForReport]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Determine company ID for filtering
      let filterCompanyId: string | undefined;
      if (isSuperAdmin) {
        filterCompanyId = selectedCompanyId || undefined;
      } else {
        filterCompanyId = user.companyId || undefined;
      }

      // Load reports
      const reportsResult = await qualityReportsApi.list({
        branchId: isSuperAdmin ? undefined : (user.branchId || undefined),
        limit: 100,
      });

      // Load dishes with company filter
      const dishesResult = await dishesApi.list({ 
        companyId: filterCompanyId, 
        limit: 100 
      });

      // Load branches
      const branchesResult = await branchesApi.list({ 
        companyId: filterCompanyId,
        limit: 100 
      });

      // Load companies for Super Admin
      if (isSuperAdmin) {
        const companiesResult = await companiesApi.list({ limit: 100 });
        if (companiesResult.success && companiesResult.data) {
          setCompanies(companiesResult.data);
        }
      }

      if (reportsResult.success && reportsResult.data) {
        setReports(reportsResult.data);
      }
      if (dishesResult.success && dishesResult.data) {
        setDishes(dishesResult.data);
      }
      if (branchesResult.success && branchesResult.data) {
        setBranches(branchesResult.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchesForCompany = async (companyId: string) => {
    try {
      const branchesResult = await branchesApi.list({ 
        companyId: companyId,
        limit: 100 
      });
      if (branchesResult.success && branchesResult.data) {
        setBranches(branchesResult.data);
      }
      
      // Also load dishes for this company
      const dishesResult = await dishesApi.list({ 
        companyId: companyId, 
        limit: 100 
      });
      if (dishesResult.success && dishesResult.data) {
        setDishes(dishesResult.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadDishChecklist = async (dishId: string) => {
    const dish = dishes.find(d => d.id === dishId);
    if (dish) {
      // Fetch full dish details with checklist
      const result = await dishesApi.get(dishId);
      if (result.success && result.data) {
        setSelectedDish(result.data);
        // Initialize items array based on criterion type
        const items = (result.data.checklistItems || []).map((item: any) => ({
          checklistItemId: item.id,
          scoreValue: item.type === 'SCORE_1_5' ? 3 : item.type === 'NUMERIC' ? (item.minValue || 0) : null,
          booleanValue: item.type === 'BOOLEAN' ? true : null,
          textValue: item.type === 'TEXT' ? '' : null,
          isPassed: true,
        }));
        setReportForm(prev => ({
          ...prev,
          dishId,
          items,
        }));
      }
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.branchId || !reportForm.dishId) {
      toast.error('Please select a branch and dish');
      return;
    }

    if (reportForm.items.length === 0) {
      toast.error('Please select a dish with quality criteria');
      return;
    }

    setSaving(true);
    try {
      // Clean up items - only send relevant values based on type
      const cleanedItems = reportForm.items.map(item => ({
        checklistItemId: item.checklistItemId,
        scoreValue: item.scoreValue ?? undefined,
        booleanValue: item.booleanValue ?? undefined,
        textValue: item.textValue || undefined,
        isPassed: item.isPassed,
      }));

      const data = {
        branchId: reportForm.branchId,
        dishId: reportForm.dishId,
        shift: reportForm.shift,
        evaluationDate: new Date().toISOString(),
        exitTime: reportForm.exitTime ? parseInt(reportForm.exitTime) : undefined,
        notes: reportForm.notes || undefined,
        items: cleanedItems,
      };

      const result = await qualityReportsApi.create(data);
      if (result.success) {
        toast.success('Quality report created successfully');
        setCreateOpen(false);
        resetForm();
        loadData();
      } else {
        toast.error(result.error || 'Failed to create report');
        console.error('Report creation failed:', result);
      }
    } catch (err) {
      console.error('Failed to create report:', err);
      toast.error('Failed to create report');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setReportForm({
      branchId: user?.branchId || '',
      dishId: '',
      shift: 'LUNCH',
      exitTime: '',
      notes: '',
      items: [],
    });
    setSelectedDishId('');
    setSelectedDish(null);
    setSelectedCompanyIdForReport('');
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...reportForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate isPassed for score type
    const checklistItem = selectedDish?.checklistItems?.[index];
    if (checklistItem?.type === 'SCORE_1_5') {
      newItems[index].isPassed = value >= 3;
    } else if (checklistItem?.type === 'BOOLEAN') {
      newItems[index].isPassed = value === true;
    }
    
    setReportForm(prev => ({ ...prev, items: newItems }));
  };

  const handleViewDetails = (report: QualityReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const filteredReports = reports.filter(
    (report) =>
      report.dish?.name?.toLowerCase().includes(search.toLowerCase()) ||
      report.branch?.name?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Quality Reports</h1>
          <p className="text-muted-foreground">View and manage quality evaluations</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            resetForm();
            if (user?.branchId) {
              setReportForm(prev => ({ ...prev, branchId: user.branchId }));
            }
            if (user?.companyId && !isSuperAdmin) {
              setSelectedCompanyIdForReport(user.companyId);
            }
            setCreateOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
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
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Dish</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Exit Time</TableHead>
                <TableHead>Evaluator</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No quality reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {format(new Date(report.evaluationDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.shift}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{report.dish?.name || '-'}</TableCell>
                    <TableCell>{report.branch?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={report.status === 'APPROVED' ? 'default' : 'destructive'}
                        className={
                          report.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : ''
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          (report.overallScore || 0) >= 80
                            ? 'text-emerald-600 font-medium'
                            : (report.overallScore || 0) >= 60
                            ? 'text-yellow-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {report.overallScore?.toFixed(0) || '-'}%
                      </span>
                    </TableCell>
                    <TableCell>{report.exitTime ? `${report.exitTime} min` : '-'}</TableCell>
                    <TableCell>{report.user?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(report)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quality Report</DialogTitle>
            <DialogDescription>
              Evaluate the quality of a dish
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Super Admin needs to select company first */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select
                  value={selectedCompanyIdForReport}
                  onValueChange={(v) => setSelectedCompanyIdForReport(v)}
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
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select
                  value={reportForm.branchId}
                  onValueChange={(v) => setReportForm(prev => ({ ...prev, branchId: v }))}
                  disabled={!!user?.branchId || (isSuperAdmin && !selectedCompanyIdForReport)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift *</Label>
                <Select
                  value={reportForm.shift}
                  onValueChange={(v) => setReportForm(prev => ({ ...prev, shift: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                    <SelectItem value="LUNCH">Lunch</SelectItem>
                    <SelectItem value="DINNER">Dinner</SelectItem>
                    <SelectItem value="NIGHT">Night</SelectItem>
                    <SelectItem value="ALL_DAY">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dish *</Label>
              <Select
                value={selectedDishId}
                onValueChange={(v) => setSelectedDishId(v)}
                disabled={isSuperAdmin && !selectedCompanyIdForReport}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dish to evaluate" />
                </SelectTrigger>
                <SelectContent>
                  {dishes.map((dish) => (
                    <SelectItem key={dish.id} value={dish.id}>
                      {dish.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDish && selectedDish.checklistItems && selectedDish.checklistItems.length > 0 && (
              <div className="space-y-4">
                <Label>Quality Criteria</Label>
                {selectedDish.checklistItems.map((item, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{item.name}</Label>
                        {reportForm.items[index]?.isPassed ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Pass</Badge>
                        ) : (
                          <Badge variant="destructive">Fail</Badge>
                        )}
                      </div>
                      {item.type === 'SCORE_1_5' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>1 (Poor)</span>
                            <span className="font-medium">{reportForm.items[index]?.scoreValue || 3}</span>
                            <span>5 (Excellent)</span>
                          </div>
                          <Slider
                            value={[reportForm.items[index]?.scoreValue || 3]}
                            min={1}
                            max={5}
                            step={1}
                            onValueChange={(v) => handleItemChange(index, 'scoreValue', v[0])}
                          />
                        </div>
                      )}
                      {item.type === 'BOOLEAN' && (
                        <Select
                          value={reportForm.items[index]?.booleanValue ? 'yes' : 'no'}
                          onValueChange={(v) => handleItemChange(index, 'booleanValue', v === 'yes')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✓ Yes / Pass</SelectItem>
                            <SelectItem value="no">✗ No / Fail</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {item.type === 'NUMERIC' && (
                        <Input
                          type="number"
                          value={reportForm.items[index]?.scoreValue || ''}
                          onChange={(e) => handleItemChange(index, 'scoreValue', parseFloat(e.target.value))}
                          placeholder={`Value (${item.minValue || 0} - ${item.maxValue || 100})`}
                        />
                      )}
                      {item.type === 'TEXT' && (
                        <Input
                          value={reportForm.items[index]?.textValue || ''}
                          onChange={(e) => handleItemChange(index, 'textValue', e.target.value)}
                          placeholder="Enter value"
                        />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Show message if dish has no checklist items */}
            {selectedDish && (!selectedDish.checklistItems || selectedDish.checklistItems.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <p>This dish has no quality criteria configured.</p>
                <p className="text-sm">Please add checklist items to the dish first.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Exit Time (minutes)</Label>
              <Input
                type="number"
                value={reportForm.exitTime}
                onChange={(e) => setReportForm(prev => ({ ...prev, exitTime: e.target.value }))}
                placeholder="Time from order to exit"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={reportForm.notes}
                onChange={(e) => setReportForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional observations..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateReport} 
                disabled={saving || !reportForm.branchId || !reportForm.dishId || reportForm.items.length === 0}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quality Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport && format(new Date(selectedReport.evaluationDate), 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Dish</Label>
                  <p className="font-medium">{selectedReport.dish?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p className="font-medium">{selectedReport.branch?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Shift</Label>
                  <p className="font-medium">{selectedReport.shift}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Overall Score</Label>
                  <p className="font-medium text-2xl">{selectedReport.overallScore?.toFixed(0) || '-'}%</p>
                </div>
              </div>

              {selectedReport.items && selectedReport.items.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Checklist Results</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterion</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Passed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReport.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.checklistItem?.name || '-'}</TableCell>
                          <TableCell>{item.checklistItem?.type || '-'}</TableCell>
                          <TableCell>
                            {item.scoreValue !== null && item.scoreValue !== undefined
                              ? `${item.scoreValue}/5`
                              : item.booleanValue !== null && item.booleanValue !== undefined
                              ? item.booleanValue ? 'Yes' : 'No'
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.isPassed ? 'default' : 'destructive'}
                              className={
                                item.isPassed
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : ''
                              }
                            >
                              {item.isPassed ? 'Pass' : 'Fail'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedReport.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm">{selectedReport.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
