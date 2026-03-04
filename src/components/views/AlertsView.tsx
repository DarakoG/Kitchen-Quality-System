'use client';

import { useEffect, useState } from 'react';
import { alertsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Bell, CheckCircle, XCircle, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Alert {
  id: string;
  alertType: string;
  title: string;
  message: string;
  status: string;
  threshold?: number | null;
  currentValue?: number | null;
  createdAt: string;
  acknowledgedAt?: string | null;
  closedAt?: string | null;
  branch?: { id: string; name: string } | null;
  acknowledgedByUser?: { id: string; name: string } | null;
}

const alertTypeColors: Record<string, string> = {
  REPEATED_FAILURES: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXCESSIVE_TIME: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  LOW_SCORE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CRITICAL_INCIDENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const alertTypeIcons: Record<string, string> = {
  REPEATED_FAILURES: '⚠️',
  EXCESSIVE_TIME: '⏱️',
  LOW_SCORE: '📉',
  CRITICAL_INCIDENT: '🚨',
};

const alertTypeDescriptions: Record<string, string> = {
  REPEATED_FAILURES: 'Multiple quality issues detected for the same dish',
  EXCESSIVE_TIME: 'Preparation time exceeds acceptable limits',
  LOW_SCORE: 'Quality score below minimum threshold',
  CRITICAL_INCIDENT: 'Severe quality incident reported',
};

export function AlertsView() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const result = await alertsApi.list({
        branchId: user?.branchId || undefined,
        limit: 100,
      });

      if (result.success && result.data) {
        setAlerts(result.data);
      } else {
        toast.error('Failed to load alerts');
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await alertsApi.acknowledge(id);
      if (result.success) {
        toast.success('Alert acknowledged');
        loadAlerts();
      } else {
        toast.error(result.error || 'Failed to acknowledge alert');
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      toast.error('Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await alertsApi.close(id);
      if (result.success) {
        toast.success('Alert closed');
        loadAlerts();
      } else {
        toast.error(result.error || 'Failed to close alert');
      }
    } catch (err) {
      console.error('Failed to close alert:', err);
      toast.error('Failed to close alert');
    } finally {
      setActionLoading(null);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const closedAlerts = alerts.filter(a => a.status === 'CLOSED');

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
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Automatic quality alerts and notifications</p>
        </div>
        {activeAlerts.length > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Alert Types Legend */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(alertTypeDescriptions).map(([type, description]) => (
              <div key={type} className="flex items-center gap-2">
                <Badge className={alertTypeColors[type]}>
                  <span className="mr-1">{alertTypeIcons[type]}</span>
                  {type.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No alerts found. Alerts are automatically generated when quality issues are detected.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For example, when 3+ incidents are reported for the same dish within 7 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500" />
                Active Alerts ({activeAlerts.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <Badge className={alertTypeColors[alert.alertType]}>
                              <span className="mr-1">{alertTypeIcons[alert.alertType]}</span>
                              {alert.alertType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                            </div>
                          </TableCell>
                          <TableCell>{alert.branch?.name || '-'}</TableCell>
                          <TableCell>{alert.threshold ?? '-'}</TableCell>
                          <TableCell className="font-medium">{alert.currentValue ?? '-'}</TableCell>
                          <TableCell>
                            {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            {alert.acknowledgedAt ? (
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-xs text-muted-foreground">
                                  Acknowledged by: {alert.acknowledgedByUser?.name || 'Unknown'}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClose(alert.id)}
                                  disabled={actionLoading === alert.id}
                                >
                                  {actionLoading === alert.id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-1 h-3 w-3" />
                                  )}
                                  Close
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={actionLoading === alert.id}
                              >
                                {actionLoading === alert.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                )}
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Closed Alerts */}
          {closedAlerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5" />
                Closed Alerts ({closedAlerts.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Closed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedAlerts.map((alert) => (
                        <TableRow key={alert.id} className="opacity-60">
                          <TableCell>
                            <Badge variant="secondary" className={alertTypeColors[alert.alertType]}>
                              <span className="mr-1">{alertTypeIcons[alert.alertType]}</span>
                              {alert.alertType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                            </div>
                          </TableCell>
                          <TableCell>{alert.branch?.name || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            {alert.closedAt ? format(new Date(alert.closedAt), 'MMM dd, yyyy HH:mm') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
