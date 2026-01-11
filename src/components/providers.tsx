"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors />
        <PushNotificationBootstrapper />
      </QueryClientProvider>
    </SessionProvider>
  );
}

function PushNotificationBootstrapper() {
  const { status } = useSession();
  const hasPromptedRef = useRef(false);
  const { isSupported, permission, subscribe } = usePushNotifications();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isSupported) return;
    if (permission !== "default") return;
    if (hasPromptedRef.current) return;

    hasPromptedRef.current = true;
    void subscribe().catch(() => {
      // Beberapa browser memerlukan gesture pengguna; jika gagal, pengguna dapat mengaktifkan melalui UI manual.
    });
  }, [status, isSupported, permission, subscribe]);

  return null;
}
