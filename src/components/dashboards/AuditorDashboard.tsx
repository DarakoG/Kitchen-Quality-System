'use client';

import { useEffect, useState } from 'react';
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
} from 'recharts';
import {
  Loader2,
  Search,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  FileText,
} from 'lucide-react';

interface AuditorData {
  branchName: string;
  totalReports: number;
  avgQualityScore: number | null;
  approvalRate: number;
  incidentCount: number;
  dailyTrend: Array<{ date: string; reports: number; avgScore: number }>;
  recentReports: Array<{
    id: string;
    dishName: string;
    status: string;
    overallScore: number | null;
    userName: string;
    createdAt: string;
  }>;
  topDishes: Array<{
    id: string;
    name: string;
    reportCount: number;
    avgScore: number | null;
  }>;
  recentIncidents: Array<{
    id: string;
    incidentType: string;
    severity: string;
    dishName: string | null;
    status: string;
    createdAt: string;
  }>;
}

export function AuditorDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AuditorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/auditor', {
        headers: {
          'x-user-id': user?.id || '',
          'x-user-role': user?.role || '',
          'x-user-company-id': user?.companyId || '',
          'x-user-branch-id': user?.branchId || '',
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
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

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Dashboard</h1>
        <p className="text-muted-foreground">
          {data.branchName} • Quality overview and trends
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalReports}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avgQualityScore !== null ? `${data.avgQualityScore.toFixed(0)}%` : '-'}
            </div>
            <Progress value={data.avgQualityScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvalRate.toFixed(0)}%</div>
            <Progress value={data.approvalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.incidentCount}</div>
            <p className="text-xs text-muted-foreground">Reported issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Trend</CardTitle>
          <CardDescription>Daily reports and scores over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyTrend.slice(0, 14).reverse()}>
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
                  name="Reports"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Avg Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Dishes */}
        <Card>
          <CardHeader>
            <CardTitle>Most Evaluated Dishes</CardTitle>
            <CardDescription>Top dishes by number of reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Avg. Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topDishes.map((dish) => (
                  <TableRow key={dish.id}>
                    <TableCell className="font-medium">{dish.name}</TableCell>
                    <TableCell>{dish.reportCount}</TableCell>
                    <TableCell>
                      {dish.avgScore !== null ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                          {dish.avgScore.toFixed(0)}%
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Incidents
            </CardTitle>
            <CardDescription>Issues that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No incidents to review</p>
              </div>
            ) : (
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
                  {data.recentIncidents.slice(0, 5).map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">{incident.incidentType}</TableCell>
                      <TableCell>{incident.dishName || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            incident.severity === 'critical'
                              ? 'border-red-500 text-red-600'
                              : incident.severity === 'high'
                              ? 'border-orange-500 text-orange-600'
                              : 'border-yellow-500 text-yellow-600'
                          }
                        >
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={incident.status === 'RESOLVED' ? 'default' : 'secondary'}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600" />
            Recent Quality Reports
          </CardTitle>
          <CardDescription>Latest evaluations from your branch</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dish</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Evaluated By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentReports.slice(0, 6).map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.dishName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={report.status === 'APPROVED' ? 'default' : 'destructive'}
                      className={
                        report.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : ''
                      }
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.overallScore !== null ? `${report.overallScore.toFixed(0)}%` : '-'}
                  </TableCell>
                  <TableCell>{report.userName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
