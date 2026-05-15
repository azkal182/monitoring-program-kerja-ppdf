"use client";

import { useState } from "react";
import { format, subDays, addDays, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          </TabsList>

          {/* Date/Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[280px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm sm:text-base">{displayDate}</span>
            </div>

            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {period === "daily" && (
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hari Ini
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
