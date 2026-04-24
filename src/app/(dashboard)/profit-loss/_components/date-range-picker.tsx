"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS = [
  {
    label: "Today",
    getRange: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(now) };
    },
  },
  {
    label: "This Month",
    getRange: () => {
      const now = new Date();
      return { from: startOfMonth(now), to: endOfMonth(now) };
    },
  },
  {
    label: "Last Month",
    getRange: () => {
      const last = subMonths(new Date(), 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    },
  },
  {
    label: "Last 3 Months",
    getRange: () => ({
      from: startOfMonth(subMonths(new Date(), 2)),
      to:   endOfMonth(new Date()),
    }),
  },
  {
    label: "This Year",
    getRange: () => {
      const now = new Date();
      return { from: startOfYear(now), to: endOfYear(now) };
    },
  },
];

export function DateRangePicker({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const router     = useRouter();
  const params     = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo,   setCustomTo]   = useState(to);

  function navigate(fromDate: Date, toDate: Date) {
    const q = new URLSearchParams(params.toString());
    q.set("from", format(fromDate, "yyyy-MM-dd"));
    q.set("to",   format(toDate,   "yyyy-MM-dd"));
    startTransition(() => router.push(`/profit-loss?${q.toString()}`));
  }

  function handleCustom() {
    if (!customFrom || !customTo) return;
    navigate(new Date(customFrom), new Date(customTo));
  }

  const activePreset = PRESETS.find((p) => {
    const r = p.getRange();
    return format(r.from, "yyyy-MM-dd") === from && format(r.to, "yyyy-MM-dd") === to;
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <Button
              key={preset.label}
              variant={isActive ? "default" : "outline"}
              size="sm"
              disabled={pending}
              onClick={() => {
                const r = preset.getRange();
                setCustomFrom(format(r.from, "yyyy-MM-dd"));
                setCustomTo(format(r.to, "yyyy-MM-dd"));
                navigate(r.from, r.to);
              }}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Custom range */}
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleCustom} disabled={pending}>
          Apply
        </Button>
      </div>
    </div>
  );
}
