"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@/generated/prisma/enums";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  telegramId: string | null;
  divisionId: string | null;
  division: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  name: string;
  username: string;
  password?: string;
  role: Role;
  divisionId?: string | null;
  telegramId?: string | null;
}

interface FetchUsersParams {
  divisionId?: string;
  role?: Role;
}

async function fetchUsers(params?: FetchUsersParams): Promise<User[]> {
  const searchParams = new URLSearchParams();
  if (params?.divisionId) searchParams.set("divisionId", params.divisionId);
  if (params?.role) searchParams.set("role", params.role);

  const res = await fetch(`/api/users?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

async function createUser(data: UserInput): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create user");
  }
  return res.json();
}

async function updateUser({
  id,
  ...data
}: UserInput & { id: string }): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update user");
  }
  return res.json();
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete user");
  }
}

export function useUsers(params?: FetchUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => fetchUsers(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
