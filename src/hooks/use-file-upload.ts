"use client";

import { useState, useCallback, useRef } from "react";

export type UploadStatus =
  | "idle"
  | "compressing"
  | "uploading"
  | "confirming"
  | "done"
  | "error";

export interface UploadState {
  status: UploadStatus;
  progress: number; // 0-100, hanya relevan saat status="uploading"
  error: string | null;
  canRetry: boolean;
}

interface UseFileUploadOptions {
  sessionId: string;
  type: "photo" | "document";
  maxRetries?: number;
}

interface UploadPhotoOptions {
  file: File;
  caption?: string;
  onSuccess?: () => void;
}

interface UploadDocumentOptions {
  file: File;
  displayName?: string;
  onSuccess?: () => void;
}

// ─── Kompresi gambar di browser via Canvas ─────────────────────────────────

async function compressImageClient(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Resize jika melebihi maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context tidak tersedia"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengompresi gambar"));
            return;
          }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca gambar"));
    };

    img.src = objectUrl;
  });
}

// ─── XHR upload dengan progress ────────────────────────────────────────────

function xhrUpload(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload gagal: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error saat upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload dibatalkan")));

    signal?.addEventListener("abort", () => xhr.abort());

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

// ─── Retry dengan exponential backoff ──────────────────────────────────────

function isRetriableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Retry untuk network error atau pesan yang mengandung HTTP 5xx
  return (
    error.message.includes("Network error") ||
    error.message.includes("HTTP 5") ||
    error.message.includes("fetch")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  onRetry?: (attempt: number) => void
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries && isRetriableError(err)) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        onRetry?.(attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useFileUpload({
  sessionId,
  type,
  maxRetries = 3,
}: UseFileUploadOptions) {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    error: null,
    canRetry: false,
  });

  // Simpan opsi terakhir untuk retry manual
  const lastPhotoOptions = useRef<UploadPhotoOptions | null>(null);
  const lastDocumentOptions = useRef<UploadDocumentOptions | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0, error: null, canRetry: false });
  }, []);

  const uploadPhoto = useCallback(
    async ({ file, caption, onSuccess }: UploadPhotoOptions) => {
      lastPhotoOptions.current = { file, caption, onSuccess };
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      try {
        // 1. Kompresi
        setState({ status: "compressing", progress: 0, error: null, canRetry: false });
        let fileToUpload = file;
        if (file.type.startsWith("image/")) {
          fileToUpload = await compressImageClient(file);
        }

        if (signal.aborted) return;

        // 2. Minta signed URL dari server
        setState({ status: "uploading", progress: 0, error: null, canRetry: false });

        const signRes = await withRetry(
          () =>
            fetch(`/api/sessions/${sessionId}/photos/sign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: fileToUpload.name,
                contentType: fileToUpload.type || "image/jpeg",
                fileSize: fileToUpload.size,
              }),
              signal,
            }).then(async (r) => {
              if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || `HTTP ${r.status}`);
              }
              return r.json() as Promise<{ signedUrl: string; key: string; publicUrl: string }>;
            }),
          maxRetries
        );

        if (signal.aborted) return;

        // 3. Upload langsung ke R2 via XHR
        await withRetry(
          () =>
            xhrUpload(
              signRes.signedUrl,
              fileToUpload,
              fileToUpload.type || "image/jpeg",
              (percent) =>
                setState((s) => ({ ...s, status: "uploading", progress: percent })),
              signal
            ),
          maxRetries
        );

        if (signal.aborted) return;

        // 4. Confirm ke server → simpan ke DB
        setState((s) => ({ ...s, status: "confirming", progress: 100 }));

        await withRetry(
          () =>
            fetch(`/api/sessions/${sessionId}/photos/confirm`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: signRes.key,
                publicUrl: signRes.publicUrl,
                caption,
              }),
              signal,
            }).then(async (r) => {
              if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || `HTTP ${r.status}`);
              }
              return r.json();
            }),
          maxRetries
        );

        setState({ status: "done", progress: 100, error: null, canRetry: false });
        onSuccess?.();
      } catch (err) {
        if ((err as Error).message === "Upload dibatalkan") return;
        const message = err instanceof Error ? err.message : "Gagal upload foto";
        setState({ status: "error", progress: 0, error: message, canRetry: true });
      }
    },
    [sessionId, maxRetries]
  );

  const uploadDocument = useCallback(
    async ({ file, displayName, onSuccess }: UploadDocumentOptions) => {
      lastDocumentOptions.current = { file, displayName, onSuccess };
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      try {
        // 1. Minta signed URL
        setState({ status: "uploading", progress: 0, error: null, canRetry: false });

        const signRes = await withRetry(
          () =>
            fetch(`/api/sessions/${sessionId}/documents/sign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
                fileSize: file.size,
              }),
              signal,
            }).then(async (r) => {
              if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || `HTTP ${r.status}`);
              }
              return r.json() as Promise<{ signedUrl: string; key: string; publicUrl: string }>;
            }),
          maxRetries
        );

        if (signal.aborted) return;

        // 2. Upload ke R2
        await withRetry(
          () =>
            xhrUpload(
              signRes.signedUrl,
              file,
              file.type || "application/octet-stream",
              (percent) =>
                setState((s) => ({ ...s, status: "uploading", progress: percent })),
              signal
            ),
          maxRetries
        );

        if (signal.aborted) return;

        // 3. Confirm
        setState((s) => ({ ...s, status: "confirming", progress: 100 }));

        await withRetry(
          () =>
            fetch(`/api/sessions/${sessionId}/documents/confirm`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: signRes.key,
                publicUrl: signRes.publicUrl,
                displayName: displayName || file.name,
              }),
              signal,
            }).then(async (r) => {
              if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || `HTTP ${r.status}`);
              }
              return r.json();
            }),
          maxRetries
        );

        setState({ status: "done", progress: 100, error: null, canRetry: false });
        onSuccess?.();
      } catch (err) {
        if ((err as Error).message === "Upload dibatalkan") return;
        const message = err instanceof Error ? err.message : "Gagal upload dokumen";
        setState({ status: "error", progress: 0, error: message, canRetry: true });
      }
    },
    [sessionId, maxRetries]
  );

  // Retry manual — ulangi upload terakhir
  const retry = useCallback(() => {
    if (type === "photo" && lastPhotoOptions.current) {
      uploadPhoto(lastPhotoOptions.current);
    } else if (type === "document" && lastDocumentOptions.current) {
      uploadDocument(lastDocumentOptions.current);
    }
  }, [type, uploadPhoto, uploadDocument]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  return {
    state,
    uploadPhoto,
    uploadDocument,
    retry,
    cancel,
    reset,
  };
}
