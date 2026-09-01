"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function getDeviceGuidance() {
  if (typeof navigator === "undefined") {
    return {
      label: "Perangkat ini",
      guide: "Buka pengaturan browser untuk mengaktifkan notifikasi.",
      settingsUrl: "",
    };
  }

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isMac = /Mac/i.test(ua);
  const isWindows = /Win/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg|OPR/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua);

  let browser = "Browser";
  if (isChrome) browser = "Chrome";
  else if (isEdge) browser = "Edge";
  else if (isSafari) browser = "Safari";

  let device = "desktop";
  if (isAndroid) device = "Android";
  else if (isIOS) device = "iPhone / iPad";
  else if (isMac) device = "Mac";
  else if (isWindows) device = "Windows";

  const label = `${browser} di ${device}`;

  if (isAndroid) {
    return {
      label,
      guide: "Buka Chrome → ⋮ → Pengaturan → Situs web → Notifikasi → Izinkan.",
      settingsUrl: "chrome://settings/content/notifications",
    };
  }

  if (isIOS) {
    return {
      label,
      guide: "Buka Pengaturan → Safari → Notifikasi → Izinkan untuk situs ini.",
      settingsUrl: "",
    };
  }

  if (isChrome || isEdge) {
    return {
      label,
      guide: "Klik ikon kunci di address bar → Pengaturan situs → Notifikasi → Izinkan.",
      settingsUrl: "",
    };
  }

  if (isSafari) {
    return {
      label,
      guide: "Buka Safari → Preferensi → Situs web → Notifikasi → Izinkan untuk situs ini.",
      settingsUrl: "",
    };
  }

  return {
    label,
    guide: "Buka pengaturan browser dan aktifkan izin notifikasi untuk situs ini.",
    settingsUrl: "",
  };
}

export function PushNotificationBootstrapper() {
  const { status } = useSession();
  const { isSupported, permission, subscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);

  const isPermissionBlocked = permission === "denied";
  const deviceGuidance = getDeviceGuidance();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isSupported) return;
    if (permission !== "default" && permission !== "denied") return;

    if (permission === "default") {
      const key = "push-notification-dialog-seen";
      if (typeof window !== "undefined" && window.localStorage.getItem(key) === "1") {
        return;
      }
    }

    const timeoutId = window.setTimeout(() => {
      setOpen(true);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [status, isSupported, permission]);

  const closeDialog = () => {
    if (typeof window !== "undefined" && permission === "default") {
      window.localStorage.setItem("push-notification-dialog-seen", "1");
    }
    setOpen(false);
  };

  const handleAllow = async () => {
    closeDialog();
    await subscribe();
  };

  const handleOpenSettings = () => {
    if (typeof window === "undefined") return;

    if (deviceGuidance.settingsUrl) {
      window.open(deviceGuidance.settingsUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (isPermissionBlocked) {
      window.location.reload();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        closeDialog();
      }
      setOpen(nextOpen);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPermissionBlocked ? "Izin notifikasi diblokir" : "Aktifkan notifikasi?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPermissionBlocked
              ? `Notifikasi di ${deviceGuidance.label} saat ini masih diblokir. ${deviceGuidance.guide} Setelah izin diaktifkan, Anda akan menerima pengingat jadwal dan informasi penting dari aplikasi.`
              : `Izinkan notifikasi agar Anda menerima pengingat jadwal, pembaruan program, dan informasi penting lainnya di perangkat ini. ${deviceGuidance.guide}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isPermissionBlocked ? (
            <>
              <AlertDialogCancel onClick={closeDialog}>Nanti</AlertDialogCancel>
              <AlertDialogAction onClick={handleOpenSettings}>Buka Pengaturan Browser</AlertDialogAction>
            </>
          ) : (
            <>
              <AlertDialogCancel onClick={closeDialog}>Nanti</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void handleAllow();
                }}
              >
                Izinkan Notifikasi
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
