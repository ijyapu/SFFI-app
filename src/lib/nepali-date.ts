import NepaliDate from "nepali-date-converter";

const MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

/** Returns Nepali date as "2 Jestha 2082 B.S." */
export function toNepaliDateString(date: Date): string {
  const nd = new NepaliDate(date);
  const month = MONTHS[nd.getMonth()];
  return `${nd.getDate()} ${month} ${nd.getYear()} B.S.`;
}

/** Returns Nepali month+year only: "Jestha 2082 B.S." */
export function toNepaliMonthYear(date: Date): string {
  const nd = new NepaliDate(date);
  return `${MONTHS[nd.getMonth()]} ${nd.getYear()} B.S.`;
}

/** Returns Nepali day+month only: "2 Jestha" */
export function toNepaliDayMonth(date: Date): string {
  const nd = new NepaliDate(date);
  return `${nd.getDate()} ${MONTHS[nd.getMonth()]}`;
}
