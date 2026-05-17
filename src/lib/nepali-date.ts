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
