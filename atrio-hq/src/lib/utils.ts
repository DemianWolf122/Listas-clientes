import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

function toDate(d: string | Date) {
  return typeof d === "string" ? parseISO(d) : d;
}

/** Fecha corta legible: "hoy", "ayer", "mañana" o "10 jul". */
export function humanDate(d?: string | Date | null): string {
  if (!d) return "";
  const date = toDate(d);
  if (isToday(date)) return "hoy";
  if (isTomorrow(date)) return "mañana";
  if (isYesterday(date)) return "ayer";
  return format(date, "d MMM", { locale: es });
}

export function humanDateLong(d?: string | Date | null): string {
  if (!d) return "";
  return format(toDate(d), "EEEE d 'de' MMMM", { locale: es });
}

export function timeOfDay(d?: string | Date | null): string {
  if (!d) return "";
  return format(toDate(d), "HH:mm");
}

/** "14:30:00" o "14:30" → "14:30" (para columnas Postgres `time`). */
export function hm(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/** "hace 3 min", "hace 2 h". */
export function relativeTime(d?: string | Date | null): string {
  if (!d) return "";
  return formatDistanceToNow(toDate(d), { addSuffix: true, locale: es });
}

export function isOverdue(due?: string | null, status?: string): boolean {
  if (!due || status === "done") return false;
  const date = parseISO(due);
  return isPast(date) && !isToday(date);
}

export function isDueToday(due?: string | null): boolean {
  if (!due) return false;
  return isToday(parseISO(due));
}

export function daysUntil(due?: string | null): number | null {
  if (!due) return null;
  return differenceInCalendarDays(parseISO(due), new Date());
}

/** Saludo según la hora del día. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenas";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Nuevo sort_order entre dos vecinos (fractional indexing simple). */
export function orderBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return Date.now();
  if (before == null) return (after as number) - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}

export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/** Hex → color de texto legible (negro o blanco) según luminancia. */
export function readableText(hex?: string | null): string {
  if (!hex) return "#191919";
  const h = hex.replace("#", "");
  if (h.length < 6) return "#191919";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#191919" : "#ffffff";
}
