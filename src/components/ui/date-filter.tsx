"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const PRESETS = [
  {
    label: "Today",
    getRange: () => { const now = new Date(); return { from: now, to: now }; },
  },
  {
    label: "This Week",
    getRange: () => {
      const now = new Date();
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
    },
  },
  {
    label: "This Month",
    getRange: () => { const now = new Date(); return { from: startOfMonth(now), to: endOfMonth(now) }; },
  },
  {
    label: "Last Month",
    getRange: () => { const last = subMonths(new Date(), 1); return { from: startOfMonth(last), to: endOfMonth(last) }; },
  },
];

export function DateFilter({ from, to }: { from?: string; to?: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo,   setCustomTo]   = useState(to   ?? "");

  function navigate(fromStr?: string, toStr?: string) {
    const q = new URLSearchParams(params.toString());
    if (fromStr) q.set("from", fromStr); else q.delete("from");
    if (toStr)   q.set("to",   toStr);   else q.delete("to");
    startTransition(() => router.push(`${pathname}?${q.toString()}`));
  }

  function handlePreset(getRange: () => { from: Date; to: Date }) {
    const r = getRange();
    const f = format(r.from, "yyyy-MM-dd");
    const t = format(r.to,   "yyyy-MM-dd");
    setCustomFrom(f);
    setCustomTo(t);
    navigate(f, t);
  }

  function handleApply() {
    if (!customFrom || !customTo) return;
    navigate(customFrom, customTo);
  }

  function handleClear() {
    setCustomFrom("");
    setCustomTo("");
    navigate(undefined, undefined);
  }

  const isFiltered = !!from || !!to;

  const activePreset = PRESETS.find((p) => {
    const r = p.getRange();
    return format(r.from, "yyyy-MM-dd") === from && format(r.to, "yyyy-MM-dd") === to;
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-2 flex-wrap items-center">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset?.label === preset.label ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => handlePreset(preset.getRange)}
          >
            {preset.label}
          </Button>
        ))}
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={pending}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
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
        <Button size="sm" variant="outline" onClick={handleApply} disabled={pending || !customFrom || !customTo}>
          Apply
        </Button>
      </div>
    </div>
  );
}
