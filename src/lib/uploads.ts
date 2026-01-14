const DEFAULT_MAX_UPLOAD_MB = 10;

export function getMaxUploadBytes() {
  const raw = process.env.MAX_UPLOAD_MB;
  const parsed = raw ? Number(raw) : DEFAULT_MAX_UPLOAD_MB;
  const maxMb =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_MB;
  return Math.round(maxMb * 1024 * 1024);
}

export function formatBytes(bytes: number) {
  const mb = Math.max(1, Math.round(bytes / (1024 * 1024)));
  return `${mb}MB`;
}
