"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { label: "This Month",    months: 0 },
  { label: "Last Month",    months: -1 },
  { label: "Last 3 Months", months: -3 },
  { label: "This Year",     months: null },
  { label: "All Time",      months: undefined },
] as const;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function LedgerControls({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function apply(preset: (typeof PRESETS)[number]) {
    const now = new Date();
    const p = new URLSearchParams(params.toString());

    if (preset.months === undefined) {
      // All time
      p.delete("from");
      p.delete("to");
    } else if (preset.months === null) {
      // This year
      p.set("from", `${now.getFullYear()}-01-01`);
      p.delete("to");
    } else if (preset.months === 0) {
      // This month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      p.set("from", isoDate(start));
      p.delete("to");
    } else {
      // N months back
      const end   = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
      const start = new Date(now.getFullYear(), now.getMonth() + preset.months, 1);
      p.set("from", isoDate(start));
      p.set("to",   isoDate(end));
    }
    router.push(`?${p.toString()}`);
  }

  const current =
    !from && !to    ? "All Time"
    : from && !to && from.endsWith("-01-01") ? "This Year"
    : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => apply(p)}
            className={`px-3 py-1 text-sm rounded-md border transition-colors ${
              current === p.label
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Print Ledger
      </Button>
    </div>
  );
}
