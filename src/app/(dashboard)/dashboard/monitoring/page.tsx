"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Building2,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

import { useMonitoringStats } from "@/hooks/use-monitoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = {
  completed: "#22c55e",
  completedWithIssue: "#f59e0b",
  notExecuted: "#ef4444",
  pending: "#94a3b8",
};

export default function MonitoringPage() {
  const { data: session } = useSession();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, "yyyy-MM");

  const { data: stats, isLoading } = useMonitoringStats(monthStr);

  const isAdmin = session?.user?.role === "ADMIN";

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Tidak ada data monitoring
        </CardContent>
      </Card>
    );
  }

  // Data for pie chart
  const pieData = [
    { name: "Selesai", value: stats.overview.completed, color: COLORS.completed },
    { name: "Selesai (Kendala)", value: stats.overview.completedWithIssue, color: COLORS.completedWithIssue },
    { name: "Tidak Terlaksana", value: stats.overview.notExecuted, color: COLORS.notExecuted },
    { name: "Pending", value: stats.overview.pending, color: COLORS.pending },
  ].filter(d => d.value > 0);

  // Data for bar chart (by division)
  const barData = stats.byDivision.map(d => ({
    name: d.divisionName,
    Selesai: d.completed,
    Kendala: d.completedWithIssue,
    Gagal: d.notExecuted,
    Pending: d.pending,
  }));

  // Aggregate daily trend for line chart (weekly)
  const lineData = stats.dailyTrend.map(d => ({
    date: format(new Date(d.date), "dd MMM", { locale: id }),
    total: d.completed + d.completedWithIssue + d.notExecuted + d.pending,
    terlaksana: d.completed + d.completedWithIssue,
  }));

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Program Kerja</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Semua Divisi" : `Divisi ${session?.user?.divisionName || ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: id })}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jadwal</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalSchedules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.overview.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ada Kendala</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.overview.completedWithIssue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidak Terlaksana</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overview.notExecuted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tingkat Eksekusi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.completionRate}%</div>
            <Progress value={stats.overview.completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Distribusi Status
            </CardTitle>
            <CardDescription>Persentase status pelaksanaan</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tren Harian
            </CardTitle>
            <CardDescription>Jumlah program per hari</CardDescription>
          </CardHeader>
          <CardContent>
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#94a3b8"
                    name="Total Jadwal"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="terlaksana"
                    stroke="#22c55e"
                    name="Terlaksana"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - By Division (Admin only) */}
      {isAdmin && stats.byDivision.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Status per Divisi
            </CardTitle>
            <CardDescription>Perbandingan pelaksanaan antar divisi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Selesai" stackId="a" fill={COLORS.completed} />
                <Bar dataKey="Kendala" stackId="a" fill={COLORS.completedWithIssue} />
                <Bar dataKey="Gagal" stackId="a" fill={COLORS.notExecuted} />
                <Bar dataKey="Pending" stackId="a" fill={COLORS.pending} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detail per Program
          </CardTitle>
          <CardDescription>Status pelaksanaan setiap program</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.byProgram.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  {isAdmin && <TableHead>Divisi</TableHead>}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Selesai</TableHead>
                  <TableHead className="text-center">Kendala</TableHead>
                  <TableHead className="text-center">Gagal</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byProgram.map((program) => (
                  <TableRow key={program.programId}>
                    <TableCell className="font-medium">{program.programName}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-muted-foreground">
                        {program.divisionName}
                      </TableCell>
                    )}
                    <TableCell className="text-center">{program.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-green-500">
                        {program.completed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-amber-500 text-white">
                        {program.completedWithIssue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">
                        {program.notExecuted}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {program.pending}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={program.completionRate} className="w-16 h-2" />
                        <span className="text-sm font-medium w-10">
                          {program.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Tidak ada program yang terjadwal bulan ini
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
