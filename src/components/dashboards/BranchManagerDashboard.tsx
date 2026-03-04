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
  Users,
  AlertTriangle,
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  BarChart3,
  UserCheck,
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  reportCount: number;
  avgScore: number | null;
}

interface BranchManagerData {
  branchName: string;
  companyName: string;
  avgQualityScore: number | null;
  approvalRate: number;
  totalReports: number;
  reportsToday: number;
  pendingIncidents: number;
  incidentCount: number;
  activeStaff: number;
  dailyTrend: Array<{ date: string; reports: number; avgScore: number }>;
  recentReports: Array<{
    id: string;
    dishName: string;
    status: string;
    overallScore: number | null;
    userName: string;
    createdAt: string;
  }>;
  pendingIncidentList: Array<{
    id: string;
    incidentType: string;
    severity: string;
    dishName: string | null;
    createdAt: string;
  }>;
  staff: StaffMember[];
  comparison: {
    rank: number;
    totalBranches: number;
    scoreDifference: number;
  } | null;
}

export function BranchManagerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<BranchManagerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/branch-manager', {
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
        <h1 className="text-3xl font-bold">Dashboard - {data.branchName}</h1>
        <p className="text-muted-foreground">
          {data.companyName} • Welcome back, {user?.name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avgQualityScore !== null ? `${data.avgQualityScore.toFixed(0)}%` : '-'}
            </div>
            <Progress value={data.avgQualityScore || 0} className="mt-2" />
            {data.comparison && (
              <p className="text-xs text-muted-foreground mt-1">
                Rank #{data.comparison.rank} of {data.comparison.totalBranches} branches
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reports Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.reportsToday}</div>
            <p className="text-xs text-muted-foreground">{data.totalReports} this month</p>
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
            <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.pendingIncidents}</div>
            <p className="text-xs text-muted-foreground">{data.incidentCount} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
          <CardDescription>Reports and quality scores over the last 14 days</CardDescription>
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
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Latest quality evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentReports.slice(0, 5).map((report) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Pending Incidents
            </CardTitle>
            <CardDescription>Issues that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pendingIncidentList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                <p>No pending incidents</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Dish</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pendingIncidentList.map((incident) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Staff Performance
          </CardTitle>
          <CardDescription>Team members and their quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Avg. Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{member.reportCount}</TableCell>
                  <TableCell>
                    {member.avgScore !== null ? (
                      <div className="flex items-center gap-2">
                        <span>{member.avgScore.toFixed(0)}%</span>
                        <Progress value={member.avgScore} className="w-16 h-2" />
                      </div>
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
    </div>
  );
}
