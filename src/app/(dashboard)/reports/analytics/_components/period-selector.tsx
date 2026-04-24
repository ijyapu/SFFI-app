"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily",     label: "Daily" },
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
];

export function PeriodSelector({ current }: { current: Period }) {
  const searchParams = useSearchParams();

  function hrefFor(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    return `?${params.toString()}`;
  }

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
      {PERIODS.map((p) => (
        <Link
          key={p.value}
          href={hrefFor(p.value)}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            current === p.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
