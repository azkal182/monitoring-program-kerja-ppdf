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

const scheduleTypeLabels: Record<string, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  CUSTOM: "Kustom",
};

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
              <CardDescription>Daftar program yang dikelola Divisi {division.name}</CardDescription>
            </div>
            <Badge variant="secondary">{counts.programs} program</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {division.programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
              <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada program untuk divisi ini.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {division.programs.map((program) => (
                <Card key={program.id} className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{program.name}</CardTitle>
                        {program.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {program.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {scheduleTypeLabels[program.scheduleType] ?? program.scheduleType}
                      </Badge>
                      {program.scheduleTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {program.scheduleTime}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      <span>Minimal {program.minPhotos} foto</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
