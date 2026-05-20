import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  APP_TIME_ZONE,
  getJakartaDayIndex,
  startOfJakartaDayUtc,
} from "@/lib/timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  // Jika string format "yyyy-MM-dd" (date-only), parse langsung tanpa konversi timezone
  // agar tidak terjadi off-by-one karena UTC midnight → Jakarta
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
      new Date(year, month - 1, day)
    );
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function getDayName(dayIndex: number): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[dayIndex] || "";
}

export function getJakartaDayName(date: Date | string = new Date()): string {
  return getDayName(getJakartaDayIndex(date));
}

export function getTodayDateOnly(): Date {
  return startOfJakartaDayUtc();
}
