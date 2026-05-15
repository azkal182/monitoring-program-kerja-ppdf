"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getJakartaDayName } from "@/lib/utils";
import { getJakartaDateKey } from "@/lib/timezone";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useDivisions } from "@/hooks/use-divisions";
import { useSchedules } from "@/hooks/use-schedules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScheduleTable } from "@/components/dashboard/schedule-table";
import { ScheduleCards } from "@/components/dashboard/schedule-cards";
import { PageContent } from "@/components/dashboard/page-content";

export default function SchedulesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [selectedDate, setSelectedDate] = useState(() =>
    getJakartaDateKey(new Date())
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState("all");

  const { data: schedules, isLoading } = useSchedules(
    selectedDate,
    isAdmin && selectedDivisionId !== "all" ? selectedDivisionId : undefined
  );
  const { data: divisions } = useDivisions();

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (!isAdmin || selectedDivisionId === "all") return schedules;
    return schedules.filter(
      (schedule) => schedule.program.division.id === selectedDivisionId
    );
  }, [schedules, selectedDivisionId, isAdmin]);

  return (
    <PageContent
      title="Jadwal Harian"
      description={`${formatDate(selectedDate)} (${getJakartaDayName(selectedDate)})`}
      actions={
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setSelectedDate(nextDate || getJakartaDateKey(new Date()));
            }}
            className="w-full md:w-56"
          />
          {isAdmin && (
            <Select
              value={selectedDivisionId}
              onValueChange={(value) => setSelectedDivisionId(value)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Semua Divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Divisi</SelectItem>
                {divisions?.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            )}
        </div>
      }
    >

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Tidak ada jadwal pada tanggal ini
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Jadwal akan ter-generate otomatis sesuai program yang aktif
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <ScheduleTable schedules={filteredSchedules} />
          </div>
          <div className="lg:hidden">
            <ScheduleCards schedules={filteredSchedules} />
          </div>
        </>
      )}
    </PageContent>
  );
}
