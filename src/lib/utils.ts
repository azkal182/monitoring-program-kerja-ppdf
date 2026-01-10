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
