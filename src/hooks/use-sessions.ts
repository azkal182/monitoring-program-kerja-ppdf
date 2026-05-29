"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SessionStatus } from "@/generated/prisma/enums";

export interface SessionPhoto {
  id: string;
  url: string;
  caption: string | null;
  purgedAt: string | null;
  createdAt: string;
}

export interface SessionDocument {
  id: string;
  url: string;
  filename: string;
  purgedAt: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  status: SessionStatus;
  startedAt: string;
  submittedAt: string | null;
  issueNote: string | null;
  isAutoCreated: boolean;
  userId: string;
  user: { id: string; name: string };
  scheduleId: string;
  schedule: {
    id: string;
    date: string;
    program: {
      id: string;
      name: string;
      scheduleTime: string | null;
      requirementType: "PHOTO" | "DOCUMENT";
      minUploads: number;
      division: { id: string; name: string };
    };
  };
  photos: SessionPhoto[];
  documents: SessionDocument[];
  createdAt: string;
}

export interface ScheduleWithSession {
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
  sessions: Session[];
}

async function fetchTodaySchedules(): Promise<ScheduleWithSession[]> {
  const res = await fetch("/api/field/today");
  if (!res.ok) throw new Error("Failed to fetch schedules");
  return res.json();
}

async function startSession(scheduleId: string): Promise<Session> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduleId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to start session");
  }
  return res.json();
}

async function submitSession(data: {
  id: string;
  status: "COMPLETED" | "COMPLETED_WITH_ISSUE";
  issueNote?: string;
}): Promise<Session> {
  const { id, ...body } = data;
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to submit session");
  }
  return res.json();
}

async function fetchSession(id: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export function useTodaySchedules() {
  return useQuery({
    queryKey: ["field", "today"],
    queryFn: fetchTodaySchedules,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: () => fetchSession(id),
    enabled: !!id,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field", "today"] });
    },
  });
}

export function useSubmitSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field", "today"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
