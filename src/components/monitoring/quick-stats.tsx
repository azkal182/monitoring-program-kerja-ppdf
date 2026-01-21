import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  LucideIcon
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface QuickStatsProps {
  stats: {
    totalSchedules: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon: Icon, color = "bg-slate-100", iconColor = "text-slate-600" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Jadwal"
          value={stats.totalSchedules}
          icon={FileText}
          color="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Selesai"
          value={stats.completed}
          icon={CheckCircle}
          color="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Ada Kendala"
          value={stats.completedWithIssue}
          icon={AlertTriangle}
          color="bg-orange-100"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Tidak Terlaksana"
          value={stats.notExecuted}
          icon={XCircle}
          color="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Belum Terlaksana"
          value={stats.pending}
          icon={Clock}
          color="bg-slate-100"
          iconColor="text-slate-600"
        />
      </div>

      {/* Completion Rate Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Tingkat Penyelesaian</p>
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.completed + stats.completedWithIssue} dari {stats.totalSchedules} program terlaksana
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
