"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Users as UsersIcon, Clock, Camera } from "lucide-react";

import { useDivision } from "@/hooks/use-divisions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

export default function DivisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const divisionId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);
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
        programs: division.programs.filter((program) => program.scheduleType === config.key),
      }))
      .filter((group) => group.programs.length > 0);
  }, [division]);

  if (!divisionId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Divisi tidak ditemukan</h1>
        <p className="text-muted-foreground">ID divisi tidak valid.</p>
        <Button onClick={() => router.replace("/dashboard/divisions")}>Kembali</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="space-y-3 p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !division) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Gagal memuat divisi</h1>
        <p className="text-muted-foreground">Terjadi kesalahan saat mengambil data. Coba ulangi.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/dashboard/divisions")}>Kembali</Button>
          <Button onClick={() => refetch()}>Muat ulang</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/divisions")}
              className="h-8 w-8" aria-label="Kembali ke daftar divisi">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Divisi</span>
          </div>
          <h1 className="text-3xl font-bold">{division.name}</h1>
          {division.description && (
            <p className="text-muted-foreground max-w-2xl">{division.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{counts.users} Anggota</Badge>
          <Badge variant="outline">{counts.programs} Program</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Program</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.programs}</div>
            <p className="text-xs text-muted-foreground">Jumlah program aktif dan nonaktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Anggota</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.users}</div>
            <p className="text-xs text-muted-foreground">Total anggota yang terdaftar</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Program Kerja</CardTitle>
              <CardDescription>Kelompok program divisi berdasarkan tipe jadwal</CardDescription>
            </div>
            <Badge variant="secondary">{counts.programs} program</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {division.programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
              <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada program untuk divisi ini.</p>
            </div>
          ) : (
            programGroups.map((group) => (
              <div key={group.key} className="space-y-3">
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{group.label}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="outline">{group.programs.length} program</Badge>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.programs.map((program) => (
                    <Card key={program.id} className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="text-base leading-tight">{program.name}</CardTitle>
                            {program.description && (
                              <CardDescription className="line-clamp-2 text-sm">
                                {program.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant={program.isActive ? "default" : "secondary"}>
                            {program.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{program.scheduleTime || "Tidak dijadwalkan"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <span>Minimal {program.minPhotos} foto</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Anggota Divisi</CardTitle>
              <CardDescription>Daftar pengguna yang terasosiasi dengan divisi</CardDescription>
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
                <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <Badge variant="outline">
                    {user.role === "ANGGOTA" ? "Anggota" : user.role === "KOORDINATOR" ? "Koordinator" : "Admin"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
