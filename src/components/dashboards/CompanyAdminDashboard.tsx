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
  BarChart,
  Bar,
} from 'recharts';
import {
  Store,
  Users,
  AlertTriangle,
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  Trophy,
} from 'lucide-react';

interface BranchPerformance {
  id: string;
  name: string;
  reportCount: number;
  avgScore: number | null;
  incidentCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopDish {
  id: string;
  name: string;
  reportCount: number;
  avgScore: number | null;
  incidentCount: number;
}

interface CompanyAdminData {
  companyName: string;
  totalBranches: number;
  totalUsers: number;
  avgQualityScore: number | null;
  approvalRate: number;
  totalReports: number;
  pendingIncidents: number;
  activeAlerts: number;
  branchPerformance: BranchPerformance[];
  topDishes: TopDish[];
  problemDishes: TopDish[];
  dailyTrend: Array<{ date: string; reports: number; avgScore: number }>;
  recentIncidents: Array<{
    id: string;
    incidentType: string;
    severity: string;
    status: string;
    branchName: string;
    dishName: string | null;
    createdAt: string;
  }>;
}

export function CompanyAdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<CompanyAdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/company-admin', {
        headers: {
          'x-user-id': user?.id || '',
          'x-user-role': user?.role || '',
          'x-user-company-id': user?.companyId || '',
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
        <h1 className="text-3xl font-bold">Dashboard - {data.companyName}</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}. Here&apos;s your company overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBranches}</div>
            <p className="text-xs text-muted-foreground">{data.totalUsers} users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Quality Score</CardTitle>
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
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvalRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">{data.totalReports} total reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.pendingIncidents}</div>
            <p className="text-xs text-muted-foreground">{data.activeAlerts} active alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Trend</CardTitle>
          <CardDescription>Daily reports and average scores</CardDescription>
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

      {/* Branch Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Branch Ranking
          </CardTitle>
          <CardDescription>Performance comparison across branches</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Avg. Score</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.branchPerformance.map((branch, index) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <Badge variant={index < 3 ? 'default' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.reportCount}</TableCell>
                  <TableCell>
                    {branch.avgScore !== null ? (
                      <div className="flex items-center gap-2">
                        <span>{branch.avgScore.toFixed(0)}%</span>
                        <Progress value={branch.avgScore} className="w-16 h-2" />
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={branch.incidentCount > 0 ? 'text-orange-600' : ''}>
                      {branch.incidentCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {branch.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                    {branch.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                    {branch.trend === 'stable' && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top and Problem Dishes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Dishes</CardTitle>
            <CardDescription>Best quality scores</CardDescription>
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
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        {dish.avgScore?.toFixed(0) || '-'}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problem Dishes</CardTitle>
            <CardDescription>Most incidents reported</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Avg. Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.problemDishes.map((dish) => (
                  <TableRow key={dish.id}>
                    <TableCell className="font-medium">{dish.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        {dish.incidentCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dish.avgScore !== null ? `${dish.avgScore.toFixed(0)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>Latest issues across all branches</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Dish</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentIncidents.slice(0, 5).map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.incidentType}</TableCell>
                  <TableCell>{incident.branchName}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
