"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  divisionId: string | null;
  division?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineInput {
  title: string;
  description?: string;
  dueDate: string; // yyyy-mm-dd
  divisionId?: string | null;
}

interface FetchDeadlinesParams {
  month?: string; // yyyy-mm
  divisionId?: string;
}

async function fetchDeadlines(
  params?: FetchDeadlinesParams
): Promise<Deadline[]> {
  const searchParams = new URLSearchParams();
  if (params?.month) searchParams.set("month", params.month);
  if (params?.divisionId) searchParams.set("divisionId", params.divisionId);

  const query = searchParams.toString();
  const res = await fetch(`/api/deadlines${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch deadlines");
  return res.json();
}

async function createDeadline(data: DeadlineInput): Promise<Deadline> {
  const res = await fetch("/api/deadlines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create deadline");
  }
  return res.json();
}

async function updateDeadline({ id, ...data }: DeadlineInput & { id: string }) {
  const res = await fetch(`/api/deadlines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update deadline");
  }
  return res.json();
}

async function deleteDeadline(id: string): Promise<void> {
  const res = await fetch(`/api/deadlines/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete deadline");
  }
}

export function useDeadlines(params?: FetchDeadlinesParams) {
  return useQuery({
    queryKey: ["deadlines", params],
    queryFn: () => fetchDeadlines(params),
  });
}

export function useCreateDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDeadline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });
}

export function useUpdateDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDeadline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });
}

export function useDeleteDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDeadline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });
}
