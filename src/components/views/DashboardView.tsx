'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Bell,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface DashboardKPIs {
  totalReports: number;
  approvalRate: number;
  avgExitTime: number;
  pendingIncidents: number;
  activeAlerts: number;
  topDishes: Array<{ dishId: string; dishName: string; count: number; avgScore?: number | null }>;
  branchPerformance: Array<{ branchId: string; branchName: string; reportCount: number; avgScore?: number | null }>;
  dailyTrend: Array<{ date: string; reports: number; approvalRate: number }>;
  recentReports: Array<{
    id: string;
    status: string;
    overallScore?: number | null;
    createdAt: string;
    dish?: { name: string } | null;
    branch?: { name: string } | null;
    user?: { name: string } | null;
  }>;
  recentIncidents: Array<{
    id: string;
    incidentType: string;
    severity: string;
    status: string;
    createdAt: string;
    dish?: { name: string } | null;
    branch?: { name: string } | null;
  }>;
}

export function DashboardView() {
  const { user } = useAuthStore();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.getKpis();
      if (result.success && result.data) {
        setKpis(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}. Here&apos;s your quality overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalReports}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.approvalRate.toFixed(1)}%</div>
            <Progress value={kpis.approvalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Exit Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgExitTime.toFixed(0)} min</div>
            <p className="text-xs text-muted-foreground">Average preparation time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.pendingIncidents}</div>
            <p className="text-xs text-muted-foreground">{kpis.activeAlerts} active alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
            <CardDescription>Reports and approval rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.dailyTrend.slice(0, 14).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="reports"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="approvalRate"
                    stroke="#6366f1"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Dishes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Dishes</CardTitle>
            <CardDescription>Most evaluated dishes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.topDishes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="dishName" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quality Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Evaluator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.recentReports.slice(0, 5).map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.dish?.name || 'Unknown'}
                    </TableCell>
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
                    <TableCell>{report.overallScore?.toFixed(0) || '-'}%</TableCell>
                    <TableCell>{report.user?.name || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dish</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.recentIncidents.slice(0, 5).map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">{incident.incidentType}</TableCell>
                    <TableCell>{incident.dish?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          incident.severity === 'critical'
                            ? 'border-red-500 text-red-600'
                            : incident.severity === 'high'
                            ? 'border-orange-500 text-orange-600'
                            : incident.severity === 'medium'
                            ? 'border-yellow-500 text-yellow-600'
                            : 'border-gray-500 text-gray-600'
                        }
                      >
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          incident.status === 'RESOLVED' || incident.status === 'CLOSED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {incident.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
