import NepaliDate from "nepali-date";

/** Get AD start/end dates for a Nepal fiscal year (BS year → Shrawan 1 to Ashadh end) */
export function getNepalFYDates(bsYear: number): { from: Date; to: Date } {
  const fyStart    = new NepaliDate(bsYear, 3, 1) as unknown as { timestamp: number };
  const nextFyStart = new NepaliDate(bsYear + 1, 3, 1) as unknown as { timestamp: number };
  const fyEndTs    = nextFyStart.timestamp - 24 * 60 * 60 * 1000;
  return {
    from: new Date(fyStart.timestamp),
    to:   new Date(fyEndTs),
  };
}

/** Returns the BS year in which the current Nepal FY started */
export function getCurrentNepalFYYear(): number {
  const today = new NepaliDate(new Date());
  // Month >= 3 (Shrawan, 0-indexed) → FY started this BS year
  return today.getMonth() >= 3 ? today.getYear() : today.getYear() - 1;
}
