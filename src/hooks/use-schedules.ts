"use client";

import { useQuery } from "@tanstack/react-query";

export interface ScheduleSummarySession {
  id: string;
  status: "DRAFT" | "COMPLETED" | "COMPLETED_WITH_ISSUE" | "NOT_EXECUTED";
  userId: string;
  user: { id: string; name: string } | null;
}

export interface ScheduleSummary {
  id: string;
  date: string;
  program: {
    id: string;
    name: string;
    description: string | null;
    scheduleTime: string | null;
    requirementType: "PHOTO" | "DOCUMENT";
    minUploads: number;
    division: { id: string; name: string };
  };
  sessions: ScheduleSummarySession[];
}

interface FetchSchedulesParams {
  date: string;
  divisionId?: string;
}

async function fetchSchedules(params: FetchSchedulesParams): Promise<ScheduleSummary[]> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set("date", params.date);
  if (params.divisionId) searchParams.set("divisionId", params.divisionId);

  const res = await fetch(`/api/schedules?${searchParams.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || "Failed to fetch schedules");
  }
  return res.json();
}

export function useSchedules(date: string, divisionId?: string) {
  return useQuery({
    queryKey: ["schedules", date, divisionId],
    queryFn: () => fetchSchedules({ date, divisionId }),
    enabled: Boolean(date),
  });
}
