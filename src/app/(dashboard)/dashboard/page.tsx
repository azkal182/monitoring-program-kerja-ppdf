import { auth } from "@/lib/auth";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, ClipboardList, CheckCircle, CalendarDays } from "lucide-react";
import prisma from "@/lib/prisma";

async function getStats() {
  const [divisionCount, userCount, programCount, todaySessionCount] = await Promise.all([
    prisma.division.count(),
    prisma.user.count(),
    prisma.program.count({ where: { isActive: true } }),
    prisma.session.count({
      where: {
        status: { in: ["COMPLETED", "COMPLETED_WITH_ISSUE"] },
        submittedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return { divisionCount, userCount, programCount, todaySessionCount };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {session?.user?.name}!
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              Kalender Program Kerja
            </CardTitle>
            <CardDescription>
              Lihat jadwal program dalam tampilan kalender bulanan dan kelola program non-harian dengan mudah.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="mt-2 w-full sm:mt-0 sm:w-auto">
            <Link href="/dashboard/calendar">Buka Kalender</Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Divisi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.divisionCount}</div>
            <p className="text-xs text-muted-foreground">
              Unit kerja aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">
              Pengguna terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Program Aktif</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.programCount}</div>
            <p className="text-xs text-muted-foreground">
              Program kerja berjalan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selesai Hari Ini</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessionCount}</div>
            <p className="text-xs text-muted-foreground">
              Sesi terselesaikan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>
              Sesi pelaksanaan yang baru diselesaikan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Belum ada aktivitas hari ini.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Divisi</CardTitle>
            <CardDescription>
              Keterlaksanaan program per divisi hari ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Jalankan seed database untuk melihat data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
