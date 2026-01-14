"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDate, getJakartaDayName } from "@/lib/utils";
import { getJakartaDateKey } from "@/lib/timezone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useDivisions } from "@/hooks/use-divisions";
import { useSchedules, type ScheduleSummary } from "@/hooks/use-schedules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SchedulesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [selectedDate, setSelectedDate] = useState(() =>
    getJakartaDateKey(new Date())
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState("all");
  const { data: schedules, isLoading } = useSchedules(
    selectedDate,
    isAdmin && selectedDivisionId !== "all" ? selectedDivisionId : undefined
  );
  const { data: divisions } = useDivisions();

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (!isAdmin || selectedDivisionId === "all") return schedules;
    return schedules.filter(
      (schedule) => schedule.program.division.id === selectedDivisionId
    );
  }, [schedules, selectedDivisionId, isAdmin]);

  function getStatusBadge(sessions: ScheduleSummary["sessions"]) {
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jadwal Harian</h1>
          <p className="text-muted-foreground">
            {formatDate(selectedDate)} ({getJakartaDayName(selectedDate)})
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setSelectedDate(nextDate || getJakartaDateKey(new Date()));
            }}
            className="w-full md:w-56"
          />
          {isAdmin && (
            <Select
              value={selectedDivisionId}
              onValueChange={(value) => setSelectedDivisionId(value)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Semua Divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Divisi</SelectItem>
                {divisions?.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Tidak ada jadwal pada tanggal ini
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Jadwal akan ter-generate otomatis sesuai program yang aktif
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
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
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(schedule.sessions)}
                  {schedule.sessions[0] &&
                    ["COMPLETED", "COMPLETED_WITH_ISSUE"].includes(
                      schedule.sessions[0].status
                    ) && (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/dashboard/sessions/${schedule.sessions[0].id}`}
                        >
                          Lihat Bukti
                        </Link>
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
