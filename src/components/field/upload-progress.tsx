"use client";

import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type UploadState } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  state: UploadState;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

const STATUS_LABEL: Record<UploadState["status"], string> = {
  idle: "",
  compressing: "Mengompresi gambar...",
  uploading: "Mengunggah...",
  confirming: "Menyimpan...",
  done: "Berhasil diunggah",
  error: "Gagal mengunggah",
};

export function UploadProgress({
  state,
  onRetry,
  onCancel,
  className,
}: UploadProgressProps) {
  const { status, progress, error, canRetry } = state;

  if (status === "idle") return null;

  const isActive = status === "compressing" || status === "uploading" || status === "confirming";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-2", className)}>
      {/* Status row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {isActive && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}
          {isDone && (
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          )}
          {isError && (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
          <span
            className={cn(
              "font-medium",
              isDone && "text-green-600",
              isError && "text-destructive"
            )}
          >
            {STATUS_LABEL[status]}
            {status === "uploading" && progress > 0 && ` ${progress}%`}
          </span>
        </div>

        {/* Tombol aksi */}
        <div className="flex items-center gap-1 shrink-0">
          {isError && canRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Coba Lagi
            </Button>
          )}
          {isActive && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              Batal
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar — hanya saat uploading */}
      {status === "uploading" && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Indeterminate bar untuk compressing & confirming */}
      {(status === "compressing" || status === "confirming") && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      )}

      {/* Pesan error */}
      {isError && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
