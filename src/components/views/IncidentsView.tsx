'use client';

import { useEffect, useState } from 'react';
import { incidentsApi, branchesApi, dishesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
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
import { Search, Loader2, AlertTriangle, Eye, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Incident {
  id: string;
  incidentType: string;
  description: string;
  severity: string;
  status: string;
  correctiveAction?: string | null;
  createdAt: string;
  dish?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Dish {
  id: string;
  name: string;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-500',
  high: 'bg-orange-100 text-orange-700 border-orange-500',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-500',
  low: 'bg-gray-100 text-gray-700 border-gray-500',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const incidentTypes = [
  'Undercooked',
  'Overcooked',
  'Wrong Temperature',
  'Wrong Presentation',
  'Missing Ingredients',
  'Incorrect Portion',
  'Contamination Risk',
  'Hygiene Issue',
  'Equipment Failure',
  'Other',
];

export function IncidentsView() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Create incident state
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    branchId: '',
    dishId: '',
    incidentType: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    correctiveAction: '',
  });

  // Use actual permissions from store
  const permissions = usePermissionsStore((state) => state.permissions);
  const canCreate = permissions?.canCreateIncidents ?? false;
  const canManage = permissions?.canManageIncidents ?? false;

  useEffect(() => {
    loadIncidents();
    loadBranches();
    loadDishes();
  }, [statusFilter, user]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const result = await incidentsApi.list({
        branchId: user?.branchId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });

      if (result.success && result.data) {
        setIncidents(result.data);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const result = await branchesApi.list({ limit: 100 });
      if (result.success && result.data) {
        setBranches(result.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadDishes = async () => {
    try {
      const result = await dishesApi.list({ companyId: user?.companyId || undefined, limit: 100 });
      if (result.success && result.data) {
        setDishes(result.data);
      }
    } catch (err) {
      console.error('Failed to load dishes:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const result = await incidentsApi.update(id, { status: newStatus, correctiveAction: correctiveAction || undefined });
      if (result.success) {
        toast.success('Incident updated successfully');
        loadIncidents();
        setDetailOpen(false);
        setCorrectiveAction('');
      } else {
        toast.error(result.error || 'Failed to update incident');
      }
    } catch (err) {
      console.error('Failed to update incident:', err);
      toast.error('Failed to update incident');
    }
  };

  const handleCreateIncident = async () => {
    if (!createForm.branchId) {
      toast.error('Please select a branch');
      return;
    }
    if (!createForm.incidentType) {
      toast.error('Please select an incident type');
      return;
    }
    if (!createForm.description || createForm.description.length < 10) {
      toast.error('Please provide a description (at least 10 characters)');
      return;
    }

    setSaving(true);
    try {
      const result = await incidentsApi.create({
        branchId: createForm.branchId,
        dishId: createForm.dishId || null,
        incidentType: createForm.incidentType,
        description: createForm.description,
        severity: createForm.severity,
        correctiveAction: createForm.correctiveAction || null,
      });

      if (result.success) {
        toast.success('Incident created successfully');
        setCreateOpen(false);
        resetCreateForm();
        loadIncidents();
      } else {
        toast.error(result.error || 'Failed to create incident');
      }
    } catch (err) {
      console.error('Failed to create incident:', err);
      toast.error('Failed to create incident');
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      branchId: user?.branchId || '',
      dishId: '',
      incidentType: '',
      description: '',
      severity: 'medium',
      correctiveAction: '',
    });
  };

  const filteredIncidents = incidents.filter(
    (incident) =>
      incident.incidentType.toLowerCase().includes(search.toLowerCase()) ||
      incident.description.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Track and manage quality incidents</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            resetCreateForm();
            if (user?.branchId) {
              setCreateForm(prev => ({ ...prev, branchId: user.branchId! }));
            }
            setCreateOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Report Incident
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredIncidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No incidents found.{' '}
              {canCreate && (
                <>
                  Click "Report Incident" to create one.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dish</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      {format(new Date(incident.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{incident.incidentType}</TableCell>
                    <TableCell>{incident.dish?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[incident.severity]}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[incident.status]}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{incident.branch?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedIncident(incident);
                          setCorrectiveAction(incident.correctiveAction || '');
                          setSelectedStatus(incident.status);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Incident Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Report New Incident
            </DialogTitle>
            <DialogDescription>
              Document a quality issue or incident
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={createForm.branchId}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, branchId: v }))}
                disabled={!!user?.branchId}
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
              <Label>Dish (Optional)</Label>
              <Select
                value={createForm.dishId}
                onValueChange={(v) => setCreateForm(prev => ({ ...prev, dishId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dish (optional)" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select
                  value={createForm.incidentType}
                  onValueChange={(v) => setCreateForm(prev => ({ ...prev, incidentType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={createForm.severity}
                  onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => 
                    setCreateForm(prev => ({ ...prev, severity: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the incident in detail..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters ({createForm.description.length}/10)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Initial Corrective Action (Optional)</Label>
              <Textarea
                value={createForm.correctiveAction}
                onChange={(e) => setCreateForm(prev => ({ ...prev, correctiveAction: e.target.value }))}
                placeholder="Describe any immediate action taken..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIncident} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Incident
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Incident Details
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedIncident.incidentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <Badge variant="outline" className={severityColors[selectedIncident.severity]}>
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dish</Label>
                  <p className="font-medium">{selectedIncident.dish?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p className="font-medium">{selectedIncident.branch?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reported By</Label>
                  <p className="font-medium">{selectedIncident.user?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[selectedIncident.status]}>
                    {selectedIncident.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{selectedIncident.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Change Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Corrective Action</Label>
                <Textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Describe the corrective action taken..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                {canManage && selectedStatus !== selectedIncident.status && (
                  <Button 
                    onClick={() => handleUpdateStatus(selectedIncident.id, selectedStatus)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                )}
                {canManage && selectedStatus === selectedIncident.status && (
                  <>
                    {selectedIncident.status === 'PENDING' && (
                      <Button onClick={() => handleUpdateStatus(selectedIncident.id, 'IN_PROGRESS')}>
                        Start Investigation
                      </Button>
                    )}
                    {selectedIncident.status === 'IN_PROGRESS' && (
                      <Button onClick={() => handleUpdateStatus(selectedIncident.id, 'RESOLVED')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Resolved
                      </Button>
                    )}
                    {selectedIncident.status === 'RESOLVED' && (
                      <Button variant="outline" onClick={() => handleUpdateStatus(selectedIncident.id, 'CLOSED')}>
                        Close Incident
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
