import { formatDate, getJakartaDayName } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getTodaySchedules } from "@/lib/schedule-generator";

export default async function SchedulesPage() {
  const schedules = await getTodaySchedules();

  function getStatusBadge(sessions: typeof schedules[0]["sessions"]) {
    if (sessions.length === 0) {
      return <Badge variant="outline">Belum dimulai</Badge>;
    }
    const session = sessions[0];
    switch (session.status) {
      case "DRAFT":
        return <Badge variant="secondary">Sedang berjalan</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600">Selesai</Badge>;
      case "COMPLETED_WITH_ISSUE":
        return <Badge className="bg-orange-500">Kendala</Badge>;
      case "NOT_EXECUTED":
        return <Badge variant="destructive">Tidak terlaksana</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jadwal Hari Ini</h1>
          <p className="text-muted-foreground">
            {formatDate(new Date())} ({getJakartaDayName(new Date())})
          </p>
        </div>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Tidak ada jadwal hari ini</p>
            <p className="text-sm text-muted-foreground mt-1">
              Jadwal akan ter-generate otomatis sesuai program yang aktif
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    schedule.sessions.length === 0
                      ? "bg-slate-100"
                      : schedule.sessions[0].status === "COMPLETED"
                      ? "bg-green-100"
                      : schedule.sessions[0].status === "COMPLETED_WITH_ISSUE"
                      ? "bg-orange-100"
                      : schedule.sessions[0].status === "NOT_EXECUTED"
                      ? "bg-red-100"
                      : "bg-amber-100"
                  }`}
                >
                  {schedule.sessions.length === 0 ? (
                    <Clock className="h-5 w-5 text-slate-600" />
                  ) : schedule.sessions[0].status === "COMPLETED" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : schedule.sessions[0].status === "COMPLETED_WITH_ISSUE" ? (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  ) : schedule.sessions[0].status === "NOT_EXECUTED" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{schedule.program.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {schedule.program.division.name}
                    </Badge>
                    <span>{schedule.program.scheduleTime || "--:--"}</span>
                    {schedule.sessions[0]?.user && (
                      <span>• {schedule.sessions[0].user.name}</span>
                    )}
                  </div>
                </div>
                {getStatusBadge(schedule.sessions)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
