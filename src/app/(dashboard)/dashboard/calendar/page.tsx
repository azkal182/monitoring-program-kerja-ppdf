"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Sun,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
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
  useProgramCalendar,
  type CalendarEvent,
  type CalendarProgramSummary,
} from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";
import { PageContent } from "@/components/dashboard/page-content";
import { AddEventDialog } from "@/components/dashboard/add-event-dialog";

const SCHEDULE_LABEL: Record<string, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  CUSTOM: "Khusus",
  AGENDA: "Agenda Utama",
};

const SCHEDULE_ACCENT: Record<string, string> = {
  DAILY: "bg-sky-500/90",
  WEEKLY: "bg-emerald-500/90",
  MONTHLY: "bg-teal-600/90 text-white",
  CUSTOM: "bg-amber-500/90",
  AGENDA: "bg-amber-500/90 text-white",
};

const SCHEDULE_INDICATOR_COLOR: Record<CalendarEvent["scheduleType"] | string, string> =
  {
    DAILY: "#0ea5e9", // sky-500
    WEEKLY: "#10b981", // emerald-500
    MONTHLY: "#0d9488", // teal-600
    CUSTOM: "#f59e0b", // amber-500
    AGENDA: "#f59e0b", // amber-500
  };

const WEEKDAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

type EventsByDate = Record<string, CalendarEvent[]>;

function formatJakartaKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export default function CalendarPage() {
  const { data: authSession } = useSession();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  const monthParam = format(currentMonth, "yyyy-MM");
  const { data, isLoading, isFetching, refetch } = useProgramCalendar(monthParam);
  const timezone = data?.timezone ?? "Asia/Jakarta";

  function moveToMonth(nextMonth: Date) {
    const normalizedMonth = startOfMonth(nextMonth);
    setCurrentMonth(normalizedMonth);
    setSelectedDate(isSameMonth(today, normalizedMonth) ? today : normalizedMonth);
  }

  const selectedDateKey = useMemo(
    () => formatJakartaKey(selectedDate, timezone),
    [selectedDate, timezone]
  );

  const eventsByDate = useMemo<EventsByDate>(() => {
    if (!data) return {};
    return data.eventsByDate;
  }, [data]);

  const monthlyPrograms = useMemo<CalendarProgramSummary[]>(() => {
    if (!data) return [];
    return data.programs;
  }, [data]);

  const selectedDayEvents = useMemo<CalendarEvent[]>(() => {
    if (!data) return [];
    return data.eventsByDate[selectedDateKey] ?? [];
  }, [data, selectedDateKey]);

  const hasData = data ? Object.keys(data.eventsByDate).length > 0 : false;

  const DayButton = (props: React.ComponentProps<typeof CalendarDayButton>) => {
    const dateKey = formatJakartaKey(props.day.date, timezone);
    const events = data?.eventsByDate[dateKey] ?? [];
    const visibleEvents = events.length;
    const hasEvents = visibleEvents > 0;

    const visibleTypes = Array.from(
      new Set(events.map((event) => event.scheduleType))
    );

    const indicatorStyle: CSSProperties = {};
    if (visibleTypes.length === 1) {
      indicatorStyle.backgroundColor =
        SCHEDULE_INDICATOR_COLOR[visibleTypes[0]];
    } else if (visibleTypes.length > 1) {
      const segment = 100 / visibleTypes.length;
      const gradientStops = visibleTypes
        .map((type, index) => {
          const start = Math.max(index * segment - 1, 0);
          const end = Math.min((index + 1) * segment + 1, 100);
          const color = SCHEDULE_INDICATOR_COLOR[type];
          return `${color} ${start}% ${end}%`;
        })
        .join(", ");
      indicatorStyle.backgroundImage = `linear-gradient(90deg, ${gradientStops})`;
    }

    return (
      <CalendarDayButton
        {...props}
        className={cn(
          "flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-transparent transition-colors data-[selected-single=true]:border-primary/60 data-[selected-single=true]:bg-primary/15 data-[selected-single=true]:text-primary dark:data-[selected-single=true]:bg-primary/30",
          visibleEvents > 0
            ? "border-primary/30 bg-primary/5 text-foreground dark:border-primary/50 dark:bg-primary/25 dark:text-foreground"
            : hasEvents
            ? "bg-muted/60 text-muted-foreground"
            : undefined
        )}
      >
        <span className="text-sm font-semibold leading-none text-foreground dark:text-foreground">
          {props.day.date.getDate()}
        </span>
        <span
          className={cn(
            "h-1.5 w-10 overflow-hidden rounded-full transition-all",
            visibleEvents > 0
              ? "opacity-100"
              : hasEvents
              ? "opacity-40 bg-muted-foreground/40"
              : "opacity-0"
          )}
          style={indicatorStyle}
        />
      </CalendarDayButton>
    );
  };

  return (
    <PageContent
      title="Kalender Program Kerja"
      description={
        authSession?.user?.role === "ADMIN"
          ? "Semua agenda & program bulanan divisi"
          : authSession?.user?.divisionName
            ? `Program Bulanan Divisi ${authSession.user.divisionName}`
            : "Program Bulanan terjadwal"
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              moveToMonth(subMonths(currentMonth, 1));
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Sebelumnya
          </Button>
          <div className="rounded-lg border px-4 py-2 text-sm font-medium shadow-sm">
            {format(currentMonth, "MMMM yyyy", { locale: id })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              moveToMonth(addMonths(currentMonth, 1));
            }}
          >
            Berikutnya
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      }
    >

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <Card className="shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Kalender Bulanan
              </div>
              {authSession?.user?.role === "ADMIN" && (
                <Button size="sm" onClick={() => setIsAddEventOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Tambah
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Zona waktu: {timezone.replace("_", " ")} •{" "}
              {isFetching && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" /> Memuat ulang
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && (
              <Calendar
                month={currentMonth}
                onMonthChange={moveToMonth}
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                mode="single"
                showOutsideDays
                className="mx-auto"
                components={{ DayButton }}
              />
            )}
            {!hasData && !isLoading && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Belum ada program yang terjadwal pada bulan ini.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              Jadwal pada {format(selectedDate, "d MMMM yyyy", { locale: id })}
            </CardTitle>
            <CardDescription>
              {selectedDayEvents.length > 0
                ? `${selectedDayEvents.length} jadwal`
                : "Tidak ada jadwal pada tanggal ini"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tidak ada agenda atau program bulanan yang terjadwal.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((event) => (
                  <div
                    key={`${selectedDateKey}-${event.programId}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold leading-tight">
                          {event.programName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.divisionName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={cn(
                            "whitespace-nowrap",
                            SCHEDULE_ACCENT[event.scheduleType]
                          )}
                        >
                          {SCHEDULE_LABEL[event.scheduleType]}
                        </Badge>
                        {event.scheduleTime && (
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            {event.scheduleTime} WIB
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div
                        className={cn(
                          "flex items-center justify-center h-6 min-w-8 px-2 rounded-md text-xs font-semibold border",
                          event.scheduleType === "AGENDA"
                            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                            : "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30"
                        )}
                      >
                        {format(selectedDate, "d MMMM", { locale: id })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5" />
            Daftar Program Kerja Bulan Ini
          </CardTitle>
          <CardDescription>
            Menampilkan seluruh agenda & program bulanan yang berjalan selama{" "}
            {format(currentMonth, "MMMM yyyy", { locale: id })}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {monthlyPrograms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada agenda atau program bulanan pada bulan ini.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {monthlyPrograms.map((program) => (
                <div
                  key={program.programId}
                  className="rounded-lg border p-4 shadow-xs"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {program.programName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {program.divisionName}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "whitespace-nowrap",
                          SCHEDULE_ACCENT[program.scheduleType]
                        )}
                      >
                        {SCHEDULE_LABEL[program.scheduleType]}
                      </Badge>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {program.occurrenceDates.map((dateStr) => {
                        const isAgenda = program.scheduleType === "AGENDA";
                        const dateObj = new Date(dateStr);
                        return (
                          <div
                            key={dateStr}
                            className={cn(
                              "flex items-center justify-center h-6 min-w-8 px-2 rounded-md text-xs font-semibold border",
                              isAgenda 
                                ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                : "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30"
                            )}
                          >
                            {format(dateObj, "d MMM", { locale: id })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AddEventDialog
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        selectedDate={selectedDate}
        eventsByDate={eventsByDate}
        onSuccess={() => {
          refetch();
        }}
      />
    </PageContent>
  );
}
