"use client";

import { toNepaliDateString } from "@/lib/nepali-date";

/**
 * Small Nepali (B.S.) preview for a native `<input type="date">` field.
 * The input itself is stuck with the browser's Gregorian picker, so this is
 * the one place we can still surface the Nepali equivalent of whatever date
 * the user just picked.
 */
export function NepaliDateHint({ value, className }: { value: string | undefined | null; className?: string }) {
  if (!value) return null;
  // Local noon avoids the UTC-midnight day-shift for a bare "YYYY-MM-DD" string.
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  return (
    <p className={`text-xs text-muted-foreground mt-1 ${className ?? ""}`}>
      {toNepaliDateString(d)}
    </p>
  );
}
