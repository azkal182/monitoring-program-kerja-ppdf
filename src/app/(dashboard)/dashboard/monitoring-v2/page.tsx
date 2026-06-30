"use client";

import { useState } from "react";
import Link from "next/link";
import { format, subDays, addDays, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";

import { useDailyMonitoring, useMonthlyMonitoring } from "@/hooks/use-monitoring-v2";
import { QuickStats } from "@/components/monitoring/quick-stats";
import { DivisionAccordion } from "@/components/monitoring/division-accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageContent } from "@/components/dashboard/page-content";

export default function MonitoringV2Page() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Format for API calls
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const monthStr = format(currentDate, "yyyy-MM");

  // Fetch data based on period
  const { data: dailyData, isLoading: dailyLoading } = useDailyMonitoring(
    period === "daily" ? dateStr : undefined
  );
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyMonitoring(
    period === "monthly" ? monthStr : undefined
  );

  const isLoading = period === "daily" ? dailyLoading : monthlyLoading;
  const stats = period === "daily" ? dailyData : monthlyData;

  // Navigation handlers
  const handlePrevious = () => {
    if (period === "daily") {
      setCurrentDate(subDays(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (period === "daily") {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format display
  const displayDate =
    period === "daily"
      ? format(currentDate, "EEEE, dd MMMM yyyy", { locale: id })
      : format(currentDate, "MMMM yyyy", { locale: id });

  return (
    <PageContent
      title="Monitoring Program Kerja"
      description="Dashboard monitoring dengan tampilan harian dan bulanan"
    >

      {/* Period Toggle */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "daily" | "monthly")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          </TabsList>

          {/* Date/Month Navigation */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 sm:min-w-[280px] sm:border-0 sm:px-0 sm:py-0">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium sm:text-base">
                  {displayDate}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {period === "daily" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="w-full sm:w-auto"
              >
                Hari Ini
              </Button>
            )}
            {period === "monthly" && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                <Link
                  href={`/api/reports/monthly/pdf?month=${monthStr}`}
                  target="_blank"
                  className="justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !stats ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Tidak ada data monitoring
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="daily" className="space-y-6 mt-6">
              {/* Quick Stats */}
              <QuickStats stats={stats.overview} />

              {/* Division Breakdown */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Breakdown per Divisi</h2>
                {"byDivision" in stats && stats.byDivision.length > 0 && "programs" in stats.byDivision[0] && (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <DivisionAccordion divisions={stats.byDivision as any} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6 mt-6">
              {/* Quick Stats */}
              <QuickStats stats={stats.overview} />

              {/* Division Breakdown */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Breakdown per Divisi</h2>
                {"byDivision" in stats && stats.byDivision.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {stats.byDivision.map((division) => (
                      <Card key={division.divisionId}>
                        <CardContent className="p-6">
                          {/* Division Name */}
                          <h3 className="font-semibold text-lg mb-3">{division.divisionName}</h3>

                          {/* Stats Grid */}
                          <div className="space-y-3">
                            {/* Completion Summary */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {division.completed + division.completedWithIssue}/{division.total} terlaksana
                              </span>
                              <span className="text-2xl font-bold">{division.completionRate}%</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${division.completionRate}%` }}
                              />
                            </div>

                            {/* Status Breakdown */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {division.completed > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                    <span className="text-green-600 font-semibold text-xs">{division.completed}</span>
                                  </div>
                                  <span className="text-muted-foreground">Selesai</span>
                                </div>
                              )}

                              {division.completedWithIssue > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                                    <span className="text-orange-600 font-semibold text-xs">{division.completedWithIssue}</span>
                                  </div>
                                  <span className="text-muted-foreground">Kendala</span>
                                </div>
                              )}

                              {division.notExecuted > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                    <span className="text-red-600 font-semibold text-xs">{division.notExecuted}</span>
                                  </div>
                                  <span className="text-muted-foreground">Gagal</span>
                                </div>
                              )}

                              {division.pending > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                    <span className="text-slate-600 font-semibold text-xs">{division.pending}</span>
                                  </div>
                                  <span className="text-muted-foreground">Belum Terlaksana</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Tidak ada data divisi
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageContent>
  );
}
