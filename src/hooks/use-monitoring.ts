"use client";

import { useQuery } from "@tanstack/react-query";
import type { MonitoringStats } from "@/app/api/monitoring/route";

async function fetchMonitoringStats(month?: string): Promise<MonitoringStats> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);

  const res = await fetch(`/api/monitoring?${params}`);
  if (!res.ok) throw new Error("Failed to fetch monitoring stats");
  return res.json();
}

export function useMonitoringStats(month?: string) {
  return useQuery({
    queryKey: ["monitoring", month],
    queryFn: () => fetchMonitoringStats(month),
  });
}
