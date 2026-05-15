"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  Camera,
  CalendarDays,
} from "lucide-react";

import { useDivision } from "@/hooks/use-divisions";
import { formatDate, getDayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContent } from "@/components/dashboard/page-content";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/dashboard/page-state";

const scheduleTypeConfigs: {
  key: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  label: string;
  description: string;
}[] = [
  {
    key: "DAILY",
    label: "Jadwal Harian",
    description: "Dilaksanakan pada hari-hari tertentu setiap minggu",
  },
  {
    key: "WEEKLY",
    label: "Jadwal Mingguan",
    description: "Berulang dengan pola mingguan",
  },
  {
    key: "MONTHLY",
    label: "Jadwal Bulanan",
    description: "Dilakukan pada tanggal tertentu setiap bulan",
  },
  {
    key: "CUSTOM",
    label: "Jadwal Kustom",
    description: "Mengikuti tanggal khusus yang sudah ditentukan",
  },
];

function formatDays(days: number[]): string {
  if (days.length === 7) return "Setiap hari";
  if (days.length === 6 && !days.includes(0)) return "Senin - Sabtu";
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
    return "Senin - Jumat";
  }
  return days.map((day) => getDayName(day).slice(0, 3)).join(", ");
}

export default function DivisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const divisionId = Array.isArray(params?.id)
    ? params?.id[0]
    : (params?.id as string | undefined);
  const {
    data: division,
    isLoading,
    isError,
    refetch,
  } = useDivision(divisionId ?? "");

  const counts = useMemo(() => {
    if (!division) {
      return { users: 0, programs: 0 };
    }
    return {
      users: division.users.length,
      programs: division.programs.length,
    };
  }, [division]);

  const programGroups = useMemo(() => {
    if (!division) return [];
    return scheduleTypeConfigs
      .map((config) => ({
        ...config,
        programs: division.programs.filter(
          (program) => program.scheduleType === config.key
        ),
      }))
      .filter((group) => group.programs.length > 0);
  }, [division]);

  if (!divisionId) {
    return (
      <PageContent title="Detail Departemen">
        <EmptyState
          title="Divisi tidak ditemukan"
          description="ID divisi tidak valid."
          action={
            <Button onClick={() => router.replace("/dashboard/divisions")}>
              Kembali
            </Button>
          }
        />
      </PageContent>
    );
  }

  if (isLoading) {
    return <LoadingState label="Memuat detail departemen..." />;
  }

  if (isError || !division) {
    return (
      <PageContent title="Detail Departemen">
        <ErrorState
          title="Gagal memuat divisi"
          description="Terjadi kesalahan saat mengambil data."
          onRetry={() => refetch()}
        />
      </PageContent>
    );
  }

  return (
    <PageContent
      title={division.name}
      description={division.description ?? "Detail program untuk departemen ini."}
      actions={<Badge variant="outline">{counts.programs} Program</Badge>}
    >
      <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/divisions")}
              className="h-8 w-8"
              aria-label="Kembali ke daftar divisi"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Departemen</span>
          </div>
          {division.phoneNumber && (
            <p className="text-sm text-muted-foreground">
              Kontak: {division.phoneNumber}
            </p>
          )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Program</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.programs}</div>
            <p className="text-xs text-muted-foreground">
              Jumlah program aktif dan nonaktif
            </p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Anggota</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.users}</div>
            <p className="text-xs text-muted-foreground">
              Total anggota yang terdaftar
            </p>
          </CardContent>
        </Card> */}
      </div>

      {division.programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada program untuk divisi ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {programGroups.map((group) => (
            <Card key={group.key}>
              <CardHeader>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.label}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {group.programs.length} program
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {group.programs.map((program) => (
                  <Card key={program.id} className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base leading-tight">
                            {program.name}
                          </CardTitle>
                          {program.description && (
                            <CardDescription className="line-clamp-2 text-sm">
                              {program.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge
                          variant={program.isActive ? "default" : "secondary"}
                        >
                          {program.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {program.scheduleTime || "Tidak dijadwalkan"}
                        </span>
                      </div>
                      {program.scheduleType === "WEEKLY" &&
                        program.scheduleDays.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              Hari: {formatDays(program.scheduleDays)}
                            </span>
                          </div>
                        )}
                      {program.scheduleType === "MONTHLY" &&
                        program.scheduleMonthDays.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              Tanggal: {program.scheduleMonthDays.join(", ")}
                            </span>
                          </div>
                        )}
                      {program.scheduleType === "CUSTOM" &&
                        program.customDates.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {program.customDates
                                .map((date) => formatDate(date))
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>
                          Minimal {program.minUploads}{" "}
                          {program.requirementType === "PHOTO"
                            ? "foto"
                            : "dokumen"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Anggota Divisi</CardTitle>
              <CardDescription>
                Daftar pengguna yang terasosiasi dengan divisi
              </CardDescription>
            </div>
            <Badge variant="secondary">{counts.users} anggota</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {division.users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada anggota terdaftar.
            </div>
          ) : (
            <div className="space-y-3">
              {division.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {user.role === "ANGGOTA"
                      ? "Anggota"
                      : user.role === "KOORDINATOR"
                      ? "Koordinator"
                      : "Admin"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}
    </PageContent>
  );
}
