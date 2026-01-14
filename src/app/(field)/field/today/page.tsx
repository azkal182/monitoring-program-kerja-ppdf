"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Clock,
  Camera,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import {
  useTodaySchedules,
  useStartSession,
  type ScheduleWithSession,
} from "@/hooks/use-sessions";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StatusInfo = {
  status: string;
  label: string;
  icon: typeof Clock;
  color: string;
  sessionId?: string;
  ownerName?: string;
};

function getStatusInfo(schedule: ScheduleWithSession, userId?: string): StatusInfo {
  const existingSession = schedule.sessions[0];

  if (!existingSession) {
    return {
      status: "pending",
      label: "Belum dimulai",
      icon: Play,
      color: "bg-slate-100 text-slate-600",
    };
  }

  const isOwner = existingSession.userId === userId;
  let baseStatus: StatusInfo;

  switch (existingSession.status) {
    case "DRAFT":
      baseStatus = {
        status: "draft",
        label: "Sedang berjalan",
        icon: Clock,
        color: "bg-amber-100 text-amber-700",
        sessionId: existingSession.id,
      };
      break;
    case "COMPLETED":
      baseStatus = {
        status: "completed",
        label: "Selesai",
        icon: CheckCircle,
        color: "bg-green-100 text-green-700",
        sessionId: existingSession.id,
      };
      break;
    case "COMPLETED_WITH_ISSUE":
      baseStatus = {
        status: "issue",
        label: "Terlaksana (kendala)",
        icon: AlertCircle,
        color: "bg-orange-100 text-orange-700",
        sessionId: existingSession.id,
      };
      break;
    case "NOT_EXECUTED":
      baseStatus = {
        status: "failed",
        label: "Tidak terlaksana",
        icon: XCircle,
        color: "bg-red-100 text-red-700",
        sessionId: existingSession.id,
      };
      break;
    default:
      baseStatus = {
        status: "unknown",
        label: "Unknown",
        icon: Clock,
        color: "bg-slate-100 text-slate-600",
      };
      break;
  }

  if (isOwner) {
    return baseStatus;
  }

  return {
    ...baseStatus,
    status: "locked",
    sessionId: undefined,
    ownerName: existingSession.user?.name,
  };
}

export default function FieldTodayPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const { data: schedules, isLoading } = useTodaySchedules();
  const startMutation = useStartSession();

  async function handleStart(scheduleId: string) {
    try {
      const session = await startMutation.mutateAsync(scheduleId);
      toast.success("Sesi dimulai!");
      router.push(`/field/session/${session.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memulai sesi"
      );
    }
  }

  function handleContinue(sessionId: string) {
    router.push(`/field/session/${sessionId}`);
  }

  return (
    <div className="space-y-4">
      {/* Date Header */}
      <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Hari ini</p>
          <p className="font-semibold">{formatDate(new Date())}</p>
        </div>
      </div>

      {/* Programs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : schedules?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Tidak ada program terjadwal hari ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules?.map((schedule) => {
            const statusInfo = getStatusInfo(schedule, authSession?.user?.id);
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={schedule.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Status Indicator */}
                    <div className={`w-2 ${statusInfo.color.split(" ")[0]}`} />

                    <div className="flex flex-1 items-center gap-4 p-4">
                      {/* Icon */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {schedule.program.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {schedule.program.scheduleTime || "--:--"}
                          </span>
                          <span className="flex items-center gap-1">
                            {schedule.program.requirementType === "PHOTO" ? (
                              <Camera className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            Min. {schedule.program.minUploads}{" "}
                            {schedule.program.requirementType === "PHOTO"
                              ? "foto"
                              : "dokumen"}
                          </span>
                          {statusInfo.ownerName && (
                            <span>• {statusInfo.ownerName}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Action */}
                      {statusInfo.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStart(schedule.id)}
                          disabled={startMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Mulai
                        </Button>
                      )}
                      {statusInfo.status === "draft" &&
                        statusInfo.sessionId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleContinue(statusInfo.sessionId!)
                            }
                          >
                            Lanjut
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      {(statusInfo.status === "completed" ||
                        statusInfo.status === "issue") &&
                        statusInfo.sessionId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleContinue(statusInfo.sessionId!)
                            }
                          >
                            Lihat
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
