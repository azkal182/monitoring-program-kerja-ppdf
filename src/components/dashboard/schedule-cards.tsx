"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import type { ScheduleSummary } from "@/hooks/use-schedules";

interface ScheduleCardsProps {
  schedules: ScheduleSummary[];
}

export function ScheduleCards({ schedules }: ScheduleCardsProps) {
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
    <div className="space-y-3">
      {schedules.map((schedule) => (
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
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
  );
}
