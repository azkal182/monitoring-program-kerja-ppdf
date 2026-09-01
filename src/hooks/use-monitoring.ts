"use client";

import { useQuery } from "@tanstack/react-query";
import type { MonitoringStats } from "@/lib/monitoring-stats";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { MonitoringStats };

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchMonitoringStats(month?: string): Promise<MonitoringStats> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);

  const res = await fetch(`/api/monitoring?${params}`);
  if (!res.ok) throw new Error("Failed to fetch monitoring stats");
  return res.json();
}

import type { DailyMonitoringStats } from "@/app/api/monitoring/daily/route";

async function fetchDailyMonitoring(date?: string): Promise<DailyMonitoringStats> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const res = await fetch(`/api/monitoring/daily?${params}`);
  if (!res.ok) throw new Error("Failed to fetch daily monitoring stats");
  return res.json();
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** @deprecated Use `useMonthlyMonitoring` for explicit naming */
export function useMonitoringStats(month?: string) {
  return useQuery({
    queryKey: ["monitoring", month],
    queryFn: () => fetchMonitoringStats(month),
  });
}

export function useMonthlyMonitoring(month?: string) {
  return useQuery({
    queryKey: ["monitoring-monthly", month],
    queryFn: () => fetchMonitoringStats(month),
  });
}

export function useDailyMonitoring(date?: string) {
  return useQuery({
    queryKey: ["monitoring-daily", date],
    queryFn: () => fetchDailyMonitoring(date),
  });
}
