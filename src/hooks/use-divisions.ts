"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Division {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    programs: number;
  };
}

export interface DivisionInput {
  name: string;
  description?: string;
}

async function fetchDivisions(): Promise<Division[]> {
  const res = await fetch("/api/divisions");
  if (!res.ok) throw new Error("Failed to fetch divisions");
  return res.json();
}

async function fetchDivision(id: string): Promise<Division> {
  const res = await fetch(`/api/divisions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch division");
  return res.json();
}

async function createDivision(data: DivisionInput): Promise<Division> {
  const res = await fetch("/api/divisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create division");
  }
  return res.json();
}

async function updateDivision({
  id,
  ...data
}: DivisionInput & { id: string }): Promise<Division> {
  const res = await fetch(`/api/divisions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update division");
  }
  return res.json();
}

async function deleteDivision(id: string): Promise<void> {
  const res = await fetch(`/api/divisions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete division");
  }
}

export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    queryFn: fetchDivisions,
  });
}

export function useDivision(id: string) {
  return useQuery({
    queryKey: ["divisions", id],
    queryFn: () => fetchDivision(id),
    enabled: !!id,
  });
}

export function useCreateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDivision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
    },
  });
}

export function useUpdateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDivision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
    },
  });
}

export function useDeleteDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDivision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
    },
  });
}
