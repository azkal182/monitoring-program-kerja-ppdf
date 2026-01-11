"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScheduleType } from "@prisma/client";

export type RequirementType = "PHOTO" | "DOCUMENT";

export interface Program {
  id: string;
  name: string;
  description: string | null;
  scheduleType: ScheduleType;
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
  scheduleTime: string | null;
  requirementType: RequirementType;
  minUploads: number;
  isActive: boolean;
  divisionId: string;
  division: { id: string; name: string };
  _count?: { schedules: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProgramInput {
  name: string;
  description?: string;
  scheduleType: ScheduleType;
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
  scheduleTime: string;
  requirementType: RequirementType;
  minUploads: number;
  isActive: boolean;
  divisionId: string;
}

interface FetchProgramsParams {
  divisionId?: string;
  isActive?: boolean;
}

async function fetchPrograms(params?: FetchProgramsParams): Promise<Program[]> {
  const searchParams = new URLSearchParams();
  if (params?.divisionId) searchParams.set("divisionId", params.divisionId);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));

  const res = await fetch(`/api/programs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch programs");
  return res.json();
}

async function fetchProgram(id: string): Promise<Program> {
  const res = await fetch(`/api/programs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch program");
  return res.json();
}

async function createProgram(data: ProgramInput): Promise<Program> {
  const res = await fetch("/api/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create program");
  }
  return res.json();
}

async function updateProgram({
  id,
  ...data
}: ProgramInput & { id: string }): Promise<Program> {
  const res = await fetch(`/api/programs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update program");
  }
  return res.json();
}

async function deleteProgram(id: string): Promise<void> {
  const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete program");
  }
}

export function usePrograms(params?: FetchProgramsParams) {
  return useQuery({
    queryKey: ["programs", params],
    queryFn: () => fetchPrograms(params),
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ["programs", id],
    queryFn: () => fetchProgram(id),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}
