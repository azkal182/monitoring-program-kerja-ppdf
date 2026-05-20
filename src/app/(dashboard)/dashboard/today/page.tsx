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
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContent } from "@/components/dashboard/page-content";

type StatusInfo = {
  status: string;
  label: string;
  icon: typeof Clock;
  color: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  sessionId?: string;
  ownerName?: string;
};

function getStatusInfo(
  schedule: ScheduleWithSession,
  userId?: string
): StatusInfo {
  const existingSession = schedule.sessions[0];

  if (!existingSession) {
    return {
      status: "pending",
      label: "Belum dimulai",
      icon: Play,
      color: "bg-slate-100 text-slate-600",
      badgeVariant: "outline",
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
        badgeVariant: "secondary",
        sessionId: existingSession.id,
      };
      break;
    case "COMPLETED":
      baseStatus = {
        status: "completed",
        label: "Selesai",
        icon: CheckCircle,
        color: "bg-green-100 text-green-700",
        badgeVariant: "default",
        sessionId: existingSession.id,
      };
      break;
    case "COMPLETED_WITH_ISSUE":
      baseStatus = {
        status: "issue",
        label: "Terlaksana (kendala)",
        icon: AlertCircle,
        color: "bg-orange-100 text-orange-700",
        badgeVariant: "secondary",
        sessionId: existingSession.id,
      };
      break;
    case "NOT_EXECUTED":
      baseStatus = {
        status: "failed",
        label: "Tidak terlaksana",
        icon: XCircle,
        color: "bg-red-100 text-red-700",
        badgeVariant: "destructive",
        sessionId: existingSession.id,
      };
      break;
    default:
      baseStatus = {
        status: "unknown",
        label: "Unknown",
        icon: Clock,
        color: "bg-slate-100 text-slate-600",
        badgeVariant: "outline",
        sessionId: existingSession.id,
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

const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  draft: 1,
  failed: 2,
  issue: 3,
  completed: 4,
  locked: 5,
};

export default function DashboardTodayPage() {
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

  const sorted = schedules
    ?.slice()
    .sort((a, b) => {
      const statusA = getStatusInfo(a, authSession?.user?.id).status;
      const statusB = getStatusInfo(b, authSession?.user?.id).status;
      return (STATUS_PRIORITY[statusA] ?? 99) - (STATUS_PRIORITY[statusB] ?? 99);
    });

  return (
    <PageContent
      title="Laporan Hari Ini"
      description={`Program terjadwal untuk ${formatDate(new Date())}`}
    >
      {/* Stats summary */}
      {!isLoading && sorted && sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: "pending", label: "Belum dimulai", color: "text-slate-600" },
              { key: "draft", label: "Berjalan", color: "text-amber-600" },
              { key: "completed", label: "Selesai", color: "text-green-600" },
              { key: "failed", label: "Tidak terlaksana", color: "text-red-600" },
            ] as const
          ).map(({ key, label, color }) => {
            const count = sorted.filter(
              (s) => getStatusInfo(s, authSession?.user?.id).status === key
            ).length;
            return (
              <Card key={key}>
                <CardContent className="pt-4 pb-3">
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Program Hari Ini</CardTitle>
              <CardDescription>{formatDate(new Date())}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !sorted || sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Tidak ada program terjadwal hari ini
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Bukti</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((schedule) => {
                      const statusInfo = getStatusInfo(
                        schedule,
                        authSession?.user?.id
                      );
                      const StatusIcon = statusInfo.icon;
                      return (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {schedule.program.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {schedule.program.division.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{schedule.program.scheduleTime || "--:--"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              {schedule.program.requirementType === "PHOTO" ? (
                                <Camera className="h-3.5 w-3.5" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              <span>
                                Min. {schedule.program.minUploads}{" "}
                                {schedule.program.requirementType === "PHOTO"
                                  ? "foto"
                                  : "dokumen"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full ${statusInfo.color}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <Badge
                                  variant={statusInfo.badgeVariant}
                                  className="text-xs"
                                >
                                  {statusInfo.label}
                                </Badge>
                                {statusInfo.ownerName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Oleh: {statusInfo.ownerName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {statusInfo.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleStart(schedule.id)}
                                disabled={startMutation.isPending}
                              >
                                <Play className="h-3.5 w-3.5 mr-1" />
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
                                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
                                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="grid gap-3 lg:hidden">
                {sorted.map((schedule) => {
                  const statusInfo = getStatusInfo(
                    schedule,
                    authSession?.user?.id
                  );
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div
                      key={schedule.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight break-words">
                              {schedule.program.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {schedule.program.division.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {schedule.program.scheduleTime || "--:--"}
                              </span>
                              <span className="flex items-center gap-1">
                                {schedule.program.requirementType === "PHOTO" ? (
                                  <Camera className="h-3 w-3" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                                Min. {schedule.program.minUploads}{" "}
                                {schedule.program.requirementType === "PHOTO"
                                  ? "foto"
                                  : "dokumen"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge
                                variant={statusInfo.badgeVariant}
                                className="text-xs"
                              >
                                {statusInfo.label}
                              </Badge>
                              {statusInfo.ownerName && (
                                <span className="text-xs text-muted-foreground">
                                  Oleh: {statusInfo.ownerName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {statusInfo.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleStart(schedule.id)}
                              disabled={startMutation.isPending}
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
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
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
