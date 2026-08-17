import NepaliDate from "nepali-date-converter";

const MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

/**
 * Normalize a Date to local noon using its UTC calendar date.
 * The library (nepali-date-converter) uses local time methods internally.
 * UTC midnight becomes the previous local day in UTC-positive timezones,
 * causing a 1-day lag. Using local noon guarantees the correct calendar date.
 */
function toLocalNoon(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0);
}

/** Returns Nepali date as "2 Jestha 2083 B.S." */
export function toNepaliDateString(date: Date): string {
  const nd = new NepaliDate(toLocalNoon(date));
  return `${nd.getDate()} ${MONTHS[nd.getMonth()]} ${nd.getYear()} B.S.`;
}

/** Returns Nepali month+year only: "Jestha 2083 B.S." */
export function toNepaliMonthYear(date: Date): string {
  const nd = new NepaliDate(toLocalNoon(date));
  return `${MONTHS[nd.getMonth()]} ${nd.getYear()} B.S.`;
}

/** Returns Nepali day+month only: "2 Jestha" */
export function toNepaliDayMonth(date: Date): string {
  const nd = new NepaliDate(toLocalNoon(date));
  return `${nd.getDate()} ${MONTHS[nd.getMonth()]}`;
}

/** Returns Nepali month name only: "Jestha" */
export function toNepaliMonth(date: Date): string {
  const nd = new NepaliDate(toLocalNoon(date));
  return MONTHS[nd.getMonth()]!;
}

// ─── Nepal-timezone "today" / day-boundary helpers ─────────────────────────────
// The server (Vercel) runs in UTC, which is 5h45m behind Nepal. Any "today" or
// date-range cutoff derived from a raw `new Date()` without an explicit
// Asia/Kathmandu conversion is wrong for the first ~6 hours of each Nepal day.
// Use these everywhere instead of ad-hoc `new Date()` / `setHours(0,0,0,0)`.
// Safe to use in both server and client code — Intl timeZone works in browsers too.

/** Converts any Date to its Nepal-calendar-day string, e.g. "2026-08-17". */
export function toNepalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}

/** Today's date in Nepal, as "YYYY-MM-DD". */
export function getNepalTodayStr(): string {
  return toNepalDateStr(new Date());
}

/**
 * "Now" as a Date whose local calendar fields (year/month/day) are Nepal's
 * today, normalized to local noon. Feed this into date-fns helpers
 * (startOfMonth, startOfWeek, subMonths, etc.) — they read machine-local
 * calendar fields, so this keeps them aligned to Nepal's calendar day
 * regardless of what timezone the server or visiting browser is actually in.
 */
export function nepalNow(): Date {
  const [y, m, d] = getNepalTodayStr().split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0);
}

/** UTC instant corresponding to 00:00:00.000 Nepal time on the given calendar day. */
export function nepalDayStart(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000+05:45");
}

/** UTC instant corresponding to 23:59:59.999 Nepal time on the given calendar day. */
export function nepalDayEnd(dateStr: string): Date {
  return new Date(dateStr + "T23:59:59.999+05:45");
}

/**
 * Represents a Nepal-calendar-day string as UTC midnight of that same
 * calendar date — the convention used for `@db.Date` (date-only) columns
 * like DailyLog.logDate, which store a logical calendar day rather than a
 * real timezone instant. Not the same as nepalDayStart(), which represents
 * the actual Nepal-midnight instant (00:00 NPT = 18:15 UTC previous day).
 */
export function nepalDateAsUtcMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}
