"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface PushSubscriberSummary {
  userId: string;
  name: string;
  username: string;
  divisionName: string | null;
  count: number;
}

interface PushAdminSummaryResponse {
  total: number;
  subscribers: PushSubscriberSummary[];
}

async function fetchAdminSummary(): Promise<PushAdminSummaryResponse> {
  const response = await fetch("/api/push/subscriptions?scope=admin");
  if (!response.ok) {
    throw new Error("Gagal mengambil data langganan push");
  }
  return response.json();
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  audience: "all" | "user";
  userId?: string;
}

async function sendPushNotification(payload: NotificationPayload) {
  const response = await fetch("/api/push/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Gagal mengirim notifikasi";
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export function usePushAdminSummary() {
  return useQuery({
    queryKey: ["push", "admin", "summary"],
    queryFn: fetchAdminSummary,
    refetchOnWindowFocus: false,
  });
}

export function useSendPushNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendPushNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push", "admin", "summary"] });
    },
  });
}

export type { PushSubscriberSummary, PushAdminSummaryResponse, NotificationPayload };
