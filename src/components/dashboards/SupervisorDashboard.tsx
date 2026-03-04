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
  CheckCircle,
  Clock,
  Loader2,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface SupervisorData {
  branchName: string;
  todayReports: number;
  weekReports: number;
  monthReports: number;
  avgQualityScore: number | null;
  approvalRate: number;
  pendingTasks: number;
  recentReports: Array<{
    id: string;
    dishName: string;
    status: string;
    overallScore: number | null;
    createdAt: string;
  }>;
  dailyGoal: {
    target: number;
    current: number;
  };
  streak: number;
}

export function SupervisorDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<SupervisorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/supervisor', {
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

  const goalProgress = (data.dailyGoal.current / data.dailyGoal.target) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name} • {data.branchName}
        </p>
      </div>

      {/* Daily Goal Banner */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium opacity-90">Today&apos;s Goal</h2>
              <div className="text-4xl font-bold mt-1">
                {data.dailyGoal.current} / {data.dailyGoal.target}
              </div>
              <p className="text-sm opacity-80 mt-1">evaluations completed</p>
            </div>
            <div className="text-right">
              <div className="w-24 h-24 relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="opacity-30"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * Math.min(goalProgress, 100)) / 100}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {Math.min(goalProgress, 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayReports}</div>
            <p className="text-xs text-muted-foreground">evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.weekReports}</div>
            <p className="text-xs text-muted-foreground">evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Avg. Score</CardTitle>
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
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.streak}</div>
            <p className="text-xs text-muted-foreground">consecutive days</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{data.monthReports}</div>
              <p className="text-sm text-muted-foreground">Reports this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{data.approvalRate.toFixed(0)}%</div>
              <p className="text-sm text-muted-foreground">Approval rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{data.pendingTasks}</div>
              <p className="text-sm text-muted-foreground">Pending tasks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            My Recent Evaluations
          </CardTitle>
          <CardDescription>Your latest quality reports</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2" />
              <p>No evaluations yet. Start your first quality report!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentReports.map((report) => (
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
                    <TableCell className="text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
