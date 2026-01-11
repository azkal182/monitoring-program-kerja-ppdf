"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  usePushAdminSummary,
  useSendPushNotification,
  type PushSubscriberSummary,
} from "@/hooks/use-push-admin";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function formatAudienceLabel(audience: "all" | "user", selectedUser?: PushSubscriberSummary | null) {
  if (audience === "all") return "Semua pengguna";
  if (!selectedUser) return "Pengguna tertentu";
  return `${selectedUser.name} (@${selectedUser.username})`;
}

export function PushNotificationPanel() {
  const { data, isLoading, error } = usePushAdminSummary();
  const sendMutation = useSendPushNotification();
  const {
    isSupported,
    isLoading: pushLoading,
    subscription,
    permission,
    error: pushError,
    subscribe,
    unsubscribe,
    refresh,
  } = usePushNotifications();

  const autoRequestRef = useRef(false);

  const [audience, setAudience] = useState<"all" | "user">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("Pengumuman Program Kerja");
  const [body, setBody] = useState("Jangan lupa laporan program kerja hari ini.");
  const [targetUrl, setTargetUrl] = useState("https://monitoring.local/dashboard");

  const selectedUser = audience === "user"
    ? data?.subscribers.find((subscriber) => subscriber.userId === selectedUserId) ?? null
    : null;

  useEffect(() => {
    if (!isSupported) return;
    if (permission !== "default") return;
    if (autoRequestRef.current) return;
    autoRequestRef.current = true;
    subscribe().catch(() => {
      // user gesture required or dismissed; fall back to manual button
    });
  }, [isSupported, permission, subscribe]);

  const isSubscribed = Boolean(subscription);

  async function handleEnableNotifications() {
    try {
      await subscribe();
      toast.success("Notifikasi push diaktifkan untuk perangkat ini");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengaktifkan notifikasi");
    }
  }

  async function handleDisableNotifications() {
    try {
      await unsubscribe();
      toast.success("Langganan notifikasi dinonaktifkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan notifikasi");
    }
  }

  const permissionLabel =
    permission === "granted"
      ? "Diizinkan"
      : permission === "denied"
      ? "Ditolak"
      : "Belum diminta";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await sendMutation.mutateAsync({
        title,
        body,
        url: targetUrl || undefined,
        audience,
        userId: audience === "user" ? selectedUserId : undefined,
      });
      toast.success("Notifikasi berhasil dikirim");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim notifikasi");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Status Izin Notifikasi</CardTitle>
          <CardDescription>
            Kelola izin notifikasi pada perangkat yang Anda gunakan saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Browser ini belum mendukung Web Push Notification.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Izin saat ini: {permissionLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {permission === "granted"
                      ? isSubscribed
                        ? "Perangkat ini sudah terdaftar untuk menerima notifikasi."
                        : "Izin diberikan, namun perangkat belum terdaftar. Aktifkan kembali untuk menerima notifikasi."
                      : permission === "denied"
                      ? "Izin ditolak. Buka pengaturan notifikasi browser dan izinkan situs ini, lalu coba aktifkan kembali."
                      : "Klik tombol di samping untuk menampilkan permintaan izin notifikasi."}
                  </p>
                  {pushError && (
                    <p className="mt-2 text-xs text-destructive">{pushError}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {permission !== "granted" && (
                    <Button
                      type="button"
                      onClick={handleEnableNotifications}
                      disabled={pushLoading}
                    >
                      {pushLoading ? "Memproses..." : "Aktifkan Notifikasi"}
                    </Button>
                  )}
                  {permission === "granted" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDisableNotifications}
                      disabled={!isSubscribed || pushLoading}
                    >
                      {pushLoading ? "Memproses..." : "Nonaktifkan"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void refresh();
                    }}
                    disabled={pushLoading}
                  >
                    Muat Ulang Status
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ringkasan Langganan</CardTitle>
          <CardDescription>
            {isLoading && "Memuat data langganan..."}
            {error && "Gagal memuat data langganan push."}
            {!isLoading && !error && (
              <>
                Total perangkat terdaftar: {data?.total ?? 0}. Pilih pengguna untuk mengirim notifikasi khusus.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && !error && (
            <div className="grid gap-3 md:grid-cols-2">
              {data?.subscribers.map((subscriber) => (
                <button
                  key={subscriber.userId}
                  type="button"
                  onClick={() => {
                    setAudience("user");
                    setSelectedUserId(subscriber.userId);
                  }}
                  className="flex w-full flex-col items-start rounded-lg border bg-card p-4 text-left transition hover:border-primary shadow-sm"
                >
                  <span className="text-sm font-semibold">{subscriber.name}</span>
                  <span className="text-xs text-muted-foreground">@{subscriber.username}</span>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{subscriber.count} perangkat</Badge>
                    <span>{subscriber.divisionName ?? "Tidak ada divisi"}</span>
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                    Targetkan pengguna ini
                  </span>
                </button>
              ))}
              {data?.subscribers.length === 0 && (
                <div className="col-span-full rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Belum ada pengguna yang mengaktifkan notifikasi push.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Kirim Notifikasi</CardTitle>
          <CardDescription>
            Pilih sasaran dan isi pesan yang akan dikirim. Notifikasi akan dikirim melalui service worker ke semua perangkat yang terdaftar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="audience">Tujuan</Label>
              <RadioGroup
                value={audience}
                onValueChange={(value: "all" | "user") => {
                  setAudience(value);
                  if (value === "all") {
                    setSelectedUserId(undefined);
                  } else if (!selectedUserId && data?.subscribers?.[0]) {
                    setSelectedUserId(data.subscribers[0].userId);
                  }
                }}
                className="grid gap-3 md:grid-cols-2"
              >
                <div className="flex items-center space-x-2 rounded-lg border bg-card p-3">
                  <RadioGroupItem value="all" id="audience-all" />
                  <Label htmlFor="audience-all" className="flex flex-col text-sm">
                    <span>Semua pengguna</span>
                    <span className="text-xs text-muted-foreground">Mengirim ke seluruh perangkat terdaftar.</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border bg-card p-3">
                  <RadioGroupItem value="user" id="audience-user" />
                  <Label htmlFor="audience-user" className="flex flex-col text-sm">
                    <span>Pengguna tertentu</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedUser ? `Target: ${selectedUser.name}` : "Pilih pengguna dari daftar"}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Saat ini: {formatAudienceLabel(audience, selectedUser ?? undefined)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Judul notifikasi"
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL tujuan (opsional)</Label>
                <Input
                  id="url"
                  type="url"
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Pesan</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Isi pesan notifikasi"
                required
                rows={4}
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">{body.length}/512 karakter</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Notifikasi akan dikirim menggunakan Web Push API. Pastikan pengguna sudah memberikan izin notifikasi dan menambahkan aplikasi ke home screen (iOS).
              </div>
              <Button type="submit" disabled={sendMutation.isPending || (audience === "user" && !selectedUserId)}>
                {sendMutation.isPending ? "Mengirim..." : "Kirim Notifikasi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
