import { auth } from "@/lib/auth";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PageContent } from "@/components/dashboard/page-content";
import prisma from "@/lib/prisma";
import {
  endOfJakartaMonthUtc,
  formatInJakarta,
  startOfJakartaMonthUtc,
} from "@/lib/timezone";
import { cn, formatDate } from "@/lib/utils";

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

async function getDeadlines() {
  const monthStart = startOfJakartaMonthUtc(new Date());
  const monthEnd = endOfJakartaMonthUtc(new Date());

  // Semua user melihat semua deadline, admin bisa filter per divisi via halaman deadlines
  return prisma.deadline.findMany({
    where: {
      dueDate: { gte: monthStart, lte: monthEnd },
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      customDivision: true,
      division: { select: { name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    take: 5,
  });
}

async function getAgendaAndMonthlyPrograms() {
  const today = new Date();
  const todayDateStr = formatInJakarta(today, "yyyy-MM-dd");
  const todayDayOfMonth = parseInt(formatInJakarta(today, "d"), 10);
  const currentMonthNum = parseInt(formatInJakarta(today, "M"), 10);
  const currentYearNum = parseInt(formatInJakarta(today, "yyyy"), 10);

  const [agendas, monthlyPrograms] = await Promise.all([
    prisma.agenda.findMany({
      where: { quarter: { active: true } },
      orderBy: { date: "asc" },
    }),
    prisma.program.findMany({
      where: { isActive: true, scheduleType: "MONTHLY" },
      include: { division: true },
    })
  ]);

  const upcomingEvents: any[] = [];

  agendas.forEach(a => {
    const agendaDateStr = formatInJakarta(a.date, "yyyy-MM-dd");
    if (agendaDateStr >= todayDateStr) {
      upcomingEvents.push({
        type: "AGENDA" as const,
        id: `A-${a.id}`,
        name: a.name,
        sortDate: new Date(agendaDateStr), 
        dateInfo: agendaDateStr === todayDateStr ? "Hari Ini" : formatInJakarta(a.date, "dd MMM yyyy"),
        subtitle: "Agenda Utama",
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
      });
    }
  });

  monthlyPrograms.forEach(p => {
    p.scheduleMonthDays.forEach(day => {
      if (day >= todayDayOfMonth) {
        // Construct date for this occurrence
        const sortDate = new Date(currentYearNum, currentMonthNum - 1, day);
        upcomingEvents.push({
          type: "MONTHLY" as const,
          id: `M-${p.id}-${day}`,
          name: p.name,
          sortDate: sortDate,
          dateInfo: day === todayDayOfMonth ? "Hari Ini" : formatInJakarta(sortDate, "dd MMM yyyy"),
          subtitle: `Divisi ${p.division.name}`,
          badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300"
        });
      }
    });
  });

  upcomingEvents.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
  
  return upcomingEvents.slice(0, 5);
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();
  const deadlines = await getDeadlines();
  const agendaAndPrograms = await getAgendaAndMonthlyPrograms();
  const monthLabel = formatInJakarta(new Date(), "MMMM yyyy");

  return (
    <PageContent
      title="Dashboard"
      description={`Selamat datang, ${session?.user?.name ?? "Pengguna"}!`}
    >

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
        <Card className="hover:shadow-md transition-shadow group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Divisi</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.divisionCount}</div>
            <p className="text-xs text-muted-foreground/80 mt-1">Unit kerja aktif</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengguna</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground/80 mt-1">Pengguna terdaftar</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Program Aktif</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.programCount}</div>
            <p className="text-xs text-muted-foreground/80 mt-1">Program kerja berjalan</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selesai Hari Ini</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <CheckCircle className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.todaySessionCount}</div>
            <p className="text-xs text-muted-foreground/80 mt-1">Sesi terselesaikan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Jadwal Mendatang</CardTitle>
                <CardDescription>
                  Agenda & Program bulanan terdekat (Mulai hari ini)
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/calendar">Lihat Kalender</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {agendaAndPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada agenda atau program bulanan dalam waktu dekat.
              </p>
            ) : (
              <ul className="space-y-4">
                {agendaAndPrograms.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium leading-none">{item.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn("px-1.5 py-0.5 rounded-md font-semibold", item.badgeColor)}>
                          {item.type === "AGENDA" ? "Agenda" : "Bulanan"}
                        </span>
                        <span>•</span>
                        <span>{item.dateInfo}</span>
                        {item.type === "MONTHLY" && (
                          <>
                            <span>•</span>
                            <span>{item.subtitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                    {deadline.customDivision ?? deadline.division?.name ?? "Umum"}
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
    </PageContent>
  );
}
