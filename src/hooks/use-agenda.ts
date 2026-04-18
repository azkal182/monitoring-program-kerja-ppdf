import { Prisma } from "@/generated/prisma/client";
import { AgendaInput } from "@/lib/validations/agenda";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type agenda = Prisma.AgendaGetPayload<{}>;

async function fetchAgendas(): Promise<agenda[]> {
  const res = await fetch("/api/agendas");
  if (!res.ok) {
    let message = "Failed to fetch quarters";

    try {
      const error = await res.json();
      message = error?.error ?? message;
    } catch {
      // ignore parsing error
    }

    throw new Error(message);
  }
  return (await res.json()) as agenda[];
}
async function createAgenda(data: AgendaInput): Promise<agenda> {
  const res = await fetch("/api/agendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create agenda");
  }

  return res.json();
}

async function updateAgenda({
  id,
  ...data
}: AgendaInput & { id: string }): Promise<agenda> {
  const res = await fetch(`/api/agendas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update agenda");
  }

  return res.json();
}

async function deleteAgenda(id: string): Promise<void> {
  const res = await fetch(`/api/agendas/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete agenda");
  }
}

async function markAgendaDone(id: string): Promise<agenda> {
  const res = await fetch(`/api/agendas/${id}/done`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to mark agenda as done");
  }

  return res.json();
}

export const useAgendas = () => {
  return useQuery({
    queryKey: ["agendas"],
    queryFn: fetchAgendas,
  });
};

export const useCreateAgenda = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
    },
  });
};

export function useUpdateAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
    },
  });
}

export function useDeleteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
    },
  });
}

export function useMarkAgendaDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAgendaDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
    },
  });
}
