"use client";

import { useQuery } from "@tanstack/react-query";
import type { DailyMonitoringStats } from "@/app/api/monitoring/daily/route";
import type { MonitoringStats } from "@/app/api/monitoring/route";

async function fetchDailyMonitoring(
  date?: string,
): Promise<DailyMonitoringStats> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const res = await fetch(`/api/monitoring/daily?${params}`);
  if (!res.ok) throw new Error("Failed to fetch daily monitoring stats");
  return res.json();
}

async function fetchMonthlyMonitoring(
  month?: string,
): Promise<MonitoringStats> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);

  const res = await fetch(`/api/monitoring?${params}`);
  if (!res.ok) throw new Error("Failed to fetch monthly monitoring stats");
  return res.json();
}

export function useDailyMonitoring(date?: string) {
  return useQuery({
    queryKey: ["monitoring-daily", date],
    queryFn: () => fetchDailyMonitoring(date),
  });
}

export function useMonthlyMonitoring(month?: string) {
  return useQuery({
    queryKey: ["monitoring-monthly", month],
    queryFn: () => fetchMonthlyMonitoring(month),
  });
}
