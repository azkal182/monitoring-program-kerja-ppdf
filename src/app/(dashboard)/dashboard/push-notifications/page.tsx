"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { PushNotificationPanel } from "@/components/dashboard/push-notification-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PushNotificationsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md shadow-sm">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle>Akses Dibatasi</CardTitle>
            <CardDescription>
              Halaman ini hanya dapat diakses oleh admin. Jika Anda memerlukan akses, hubungi administrator sistem.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="secondary" className="flex w-fit items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Only
          </Badge>
          <h1 className="text-3xl font-bold">Kelola Notifikasi Push</h1>
          <p className="text-sm text-muted-foreground">
            Kirim pemberitahuan ke seluruh pengguna atau pilih target spesifik untuk mengingatkan aktivitas program kerja.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>

      <PushNotificationPanel />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Panduan Penggunaan</CardTitle>
          <CardDescription>Tips agar notifikasi diterima dengan baik oleh pengguna.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc space-y-2 pl-4">
            <li>Pastikan pengguna telah mengizinkan notifikasi di browser dan menambahkan aplikasi ke home screen (khusus iOS).</li>
            <li>Gunakan judul dan isi pesan yang singkat, jelas, dan relevan dengan aktivitas program.</li>
            <li>Isi URL tujuan jika ingin mengarahkan pengguna ke halaman tertentu ketika notifikasi diklik.</li>
            <li>Untuk notifikasi khusus, pilih pengguna dari daftar ringkasan langganan di atas sebelum mengirim.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
