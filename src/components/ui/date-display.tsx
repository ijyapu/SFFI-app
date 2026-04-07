import { format } from "date-fns";
import { toNepaliDateString, toNepaliMonthYear, toNepaliDayMonth } from "@/lib/nepali-date";

interface DateDisplayProps {
  /** The date to display */
  date: Date | string;
  /** date-fns format string for the English date (default: "dd MMM yyyy") */
  fmt?: string;
  /** Which part of the Nepali date to show */
  nepali?: "full" | "month-year" | "day-month";
  className?: string;
}

/**
 * Shows an English date with Nepali (B.S.) date below it.
 * The Nepali line is smaller and muted.
 */
export function DateDisplay({
  date,
  fmt = "dd MMM yyyy",
  nepali = "full",
  className,
}: DateDisplayProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const nepaliStr =
    nepali === "month-year" ? toNepaliMonthYear(d)
    : nepali === "day-month" ? toNepaliDayMonth(d)
    : toNepaliDateString(d);

  return (
    <span className={`flex flex-col leading-snug ${className ?? ""}`}>
      <span>{format(d, fmt)}</span>
      <span className="text-[11px] text-muted-foreground/60">{nepaliStr}</span>
    </span>
  );
}
