"use client";

import { useQuery } from "@tanstack/react-query";

export type CalendarScheduleType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
export type CalendarRequirementType = "PHOTO" | "DOCUMENT";

export interface CalendarEvent {
  programId: string;
  programName: string;
  divisionId: string;
  divisionName: string;
  scheduleType: CalendarScheduleType;
  scheduleTime: string | null;
  requirementType: CalendarRequirementType;
  minUploads: number;
}

export interface CalendarProgramSummary extends CalendarEvent {
  occurrenceDates: string[];
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
}

export interface CalendarApiResponse {
  month: string;
  monthLabel: string;
  timezone: string;
  startDate: string;
  endDate: string;
  eventsByDate: Record<string, CalendarEvent[]>;
  programs: CalendarProgramSummary[];
  hasDailyPrograms: boolean;
  generatedAt: string;
}

async function fetchCalendar(month: string): Promise<CalendarApiResponse> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const res = await fetch(`/api/calendar?${params}`);
  if (!res.ok) {
    const message = await res.json().catch(() => null);
    throw new Error(message?.error ?? "Failed to fetch calendar data");
  }
  return res.json();
}

export function useProgramCalendar(month: string) {
  return useQuery({
    queryKey: ["calendar", month],
    queryFn: () => fetchCalendar(month),
    staleTime: 1000 * 60 * 5,
  });
}
