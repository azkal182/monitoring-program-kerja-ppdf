"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = typeof window !== "undefined" ? window.atob(base64) : "";
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendSubscriptionToServer(
  endpoint: string,
  payload: PushSubscriptionJSON | null,
  method: "POST" | "DELETE"
) {
  const response = await fetch("/api/push/subscriptions", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      method === "POST"
        ? { subscription: payload }
        : {
            endpoint,
          }
    ),
  });

  if (!response.ok) {
    let message = "Gagal memperbarui langganan push";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

export interface UsePushNotificationsResult {
  isSupported: boolean;
  isLoading: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" ? Notification.permission : "default"
  );
  const [error, setError] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported && Boolean(VAPID_PUBLIC_KEY));
  }, []);

  const ensureRegistration = useCallback(async () => {
    if (!isSupported) return null;
    if (registrationRef.current) return registrationRef.current;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      registrationRef.current = registration;
      return registration;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar service worker");
      return null;
    }
  }, [isSupported]);

  const refresh = useCallback(async () => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await ensureRegistration();
      if (!registration) return;
      const existing = await registration.pushManager.getSubscription();
      setSubscription(existing);
      setPermission(Notification.permission);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memeriksa langganan notifikasi");
    } finally {
      setIsLoading(false);
    }
  }, [ensureRegistration, isSupported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Browser tidak mendukung push notification atau VAPID key belum dikonfigurasi.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let currentPermission = Notification.permission;
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== "granted") {
        throw new Error("Izin notifikasi belum diberikan.");
      }

      const registration = await ensureRegistration();
      if (!registration) {
        throw new Error("Service worker belum siap.");
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);
      await sendSubscriptionToServer(sub.endpoint, sub.toJSON(), "POST");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melakukan subscribe notifikasi");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ensureRegistration, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setIsLoading(true);
    setError(null);

    try {
      await sendSubscriptionToServer(subscription.endpoint, null, "DELETE");
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan langganan notifikasi");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return useMemo(
    () => ({
      isSupported,
      isLoading,
      subscription,
      permission,
      error,
      subscribe,
      unsubscribe,
      refresh,
    }),
    [isSupported, isLoading, subscription, permission, error, subscribe, unsubscribe, refresh]
  );
}
