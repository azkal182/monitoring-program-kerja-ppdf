"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
} from "lucide-react";
import { useSession as useSessionDetail } from "@/hooks/use-sessions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-600">Selesai</Badge>;
    case "COMPLETED_WITH_ISSUE":
      return <Badge className="bg-amber-500 text-white">Kendala</Badge>;
    case "NOT_EXECUTED":
      return <Badge variant="destructive">Tidak Terlaksana</Badge>;
    case "DRAFT":
      return <Badge variant="secondary">Sedang berjalan</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function renderStatusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />;
    case "COMPLETED_WITH_ISSUE":
      return <AlertTriangle className="h-4 w-4" />;
    case "NOT_EXECUTED":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { data: session, isLoading } = useSessionDetail(sessionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Sesi tidak ditemukan
        </CardContent>
      </Card>
    );
  }

  const requirementType = session.schedule.program.requirementType;
  const hasEvidence =
    requirementType === "PHOTO"
      ? session.photos.length > 0
      : session.documents.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/schedules">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{session.schedule.program.name}</h1>
          <p className="text-sm text-muted-foreground">
            {session.schedule.program.division.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Ringkasan Sesi</CardTitle>
              <CardDescription>
                {formatDate(session.schedule.date)} • {session.schedule.program.scheduleTime || "--:--"}
              </CardDescription>
            </div>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {renderStatusIcon(session.status)}
            <span>Status: {session.status}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Mulai: {formatDateTime(session.startedAt)}
              {session.submittedAt && ` • Selesai: ${formatDateTime(session.submittedAt)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Petugas:</span>
            <span className="font-medium text-foreground">
              {session.user?.name || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Kebutuhan:</span>
            <span className="font-medium text-foreground">
              {session.schedule.program.minUploads}{" "}
              {requirementType === "PHOTO" ? "foto" : "dokumen"}
            </span>
          </div>
          {session.issueNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold">Catatan Kendala</p>
              <p className="text-sm">{session.issueNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bukti Pelaksanaan</CardTitle>
          <CardDescription>
            {requirementType === "PHOTO" ? "Foto" : "Dokumen"} yang diunggah oleh petugas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasEvidence ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada bukti yang diunggah.
            </div>
          ) : requirementType === "PHOTO" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {session.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-lg border">
                  <img src={photo.url} alt={photo.caption || "Foto bukti"} className="h-48 w-full object-cover" />
                  {photo.caption && (
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {session.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{doc.filename}</span>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
