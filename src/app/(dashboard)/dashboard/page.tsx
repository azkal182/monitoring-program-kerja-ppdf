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
import {
  Building2,
  Users,
  ClipboardList,
  CheckCircle,
  CalendarDays,
  Bell,
  CalendarClock,
} from "lucide-react";
import prisma from "@/lib/prisma";
import {
  endOfJakartaMonthUtc,
  formatInJakarta,
  startOfJakartaMonthUtc,
} from "@/lib/timezone";
import { formatDate } from "@/lib/utils";

async function getStats() {
  const [divisionCount, userCount, programCount, todaySessionCount] =
    await Promise.all([
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

async function getDeadlines(user?: {
  role?: string | null;
  divisionId?: string | null;
}) {
  const monthStart = startOfJakartaMonthUtc(new Date());
  const monthEnd = endOfJakartaMonthUtc(new Date());
  const isAdmin = user?.role === "ADMIN";

  const divisionFilter = (() => {
    if (isAdmin) return {};
    if (user?.divisionId) {
      return { OR: [{ divisionId: user.divisionId }, { divisionId: null }] };
    }
    return { divisionId: null };
  })();

  return prisma.deadline.findMany({
    where: {
      dueDate: { gte: monthStart, lte: monthEnd },
      ...divisionFilter,
    },
    include: { division: { select: { name: true } } },
    orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    take: 5,
  });
}

async function getAgendas() {
  return prisma.agenda.findMany({
    where: {
      quarter: {
        active: true,
      },
    },
    take: 5,
    orderBy: { date: "asc" },
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();
  const deadlines = await getDeadlines(session?.user);
  const agendas = await getAgendas();
  const monthLabel = formatInJakarta(new Date(), "MMMM yyyy");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {session?.user?.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Kalender Program Kerja
              </CardTitle>
              <CardDescription>
                Lihat jadwal program dalam tampilan kalender bulanan dan kelola
                program non-harian dengan mudah.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="mt-2 w-full sm:mt-0 sm:w-auto">
              <Link href="/dashboard/calendar">Buka Kalender</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                Notifikasi Push
              </CardTitle>
              <CardDescription>
                Kirim pemberitahuan ke seluruh pengguna atau pengguna tertentu
                untuk update program kerja.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="mt-2 w-full sm:mt-0 sm:w-auto">
              <Link href="/dashboard/push-notifications">
                Kelola Notifikasi
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Divisi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.divisionCount}</div>
            <p className="text-xs text-muted-foreground">Unit kerja aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">Pengguna terdaftar</p>
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
            <CardTitle className="text-sm font-medium">
              Selesai Hari Ini
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessionCount}</div>
            <p className="text-xs text-muted-foreground">Sesi terselesaikan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Agenda Nasional</CardTitle>
                <CardDescription>
                  Sesi pelaksanaan yang baru diselesaikan
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/agendas">Lihat Semua</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {agendas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada agenda aktif saat ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {agendas.map((agenda) => (
                  <li key={agenda.id} className="flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{agenda.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(agenda.date)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* <p className="text-sm text-muted-foreground">
              Belum ada aktivitas hari ini.
            </p> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tugas Kuartal</CardTitle>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Deadline {monthLabel}
                </CardTitle>
                <CardDescription>
                  Target yang perlu diselesaikan bulan ini
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/deadlines">Lihat Semua</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada deadline bulan ini.
              </p>
            ) : (
              deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-lg border border-dashed p-3 text-sm"
                >
                  <div className="font-medium">{deadline.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(deadline.dueDate)} •{" "}
                    {deadline.division?.name ?? "Umum"}
                  </div>
                  {deadline.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {deadline.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
