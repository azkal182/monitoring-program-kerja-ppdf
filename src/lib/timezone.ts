import { endOfMonth, startOfMonth } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const APP_TIME_ZONE = "Asia/Jakarta";

function ensureDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

export function toJakartaDate(input: Date | string = new Date()): Date {
  return toZonedTime(ensureDate(input), APP_TIME_ZONE);
}

export function formatInJakarta(input: Date | string, formatStr: string): string {
  return formatInTimeZone(ensureDate(input), APP_TIME_ZONE, formatStr);
}

export function getJakartaDateKey(input: Date | string = new Date()): string {
  return formatInJakarta(input, "yyyy-MM-dd");
}

export function startOfJakartaDayUtc(input: Date | string = new Date()): Date {
  const key = getJakartaDateKey(input);
  return fromZonedTime(`${key} 00:00:00`, APP_TIME_ZONE);
}

export function endOfJakartaDayUtc(input: Date | string = new Date()): Date {
  const key = getJakartaDateKey(input);
  return fromZonedTime(`${key} 23:59:59.999`, APP_TIME_ZONE);
}

export function getJakartaDayIndex(input: Date | string = new Date()): number {
  return toJakartaDate(input).getDay();
}

export function startOfJakartaMonthUtc(input: Date | string = new Date()): Date {
  const jakartaDate = toJakartaDate(input);
  const monthStart = startOfMonth(jakartaDate);
  const key = getJakartaDateKey(monthStart);
  return fromZonedTime(`${key} 00:00:00`, APP_TIME_ZONE);
}

export function endOfJakartaMonthUtc(input: Date | string = new Date()): Date {
  const jakartaDate = toJakartaDate(input);
  const monthEnd = endOfMonth(jakartaDate);
  const key = getJakartaDateKey(monthEnd);
  return fromZonedTime(`${key} 23:59:59.999`, APP_TIME_ZONE);
}
