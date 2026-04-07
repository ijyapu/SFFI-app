"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";

type Supplier = { id: string; name: string; pan: string | null };

// Nepal FY helper (client-side)
function getNepalFYPresets() {
  // Approx AD dates for Nepal FY (Shrawan 1 to Ashadh end)
  // FY 2081-82: 2024-07-16 to 2025-07-15
  // FY 2082-83: 2025-07-16 to 2026-07-15
  const today = new Date();
  const year = today.getFullYear();

  // Current FY: if after July 16, it's year/year+1, else (year-1)/year
  const fyStartYear = today >= new Date(`${year}-07-16`) ? year : year - 1;

  return [
    {
      label: `Nepal FY ${fyStartYear + 57}-${fyStartYear + 58} (Current)`,
      from: `${fyStartYear}-07-16`,
      to:   `${fyStartYear + 1}-07-15`,
    },
    {
      label: `Nepal FY ${fyStartYear + 56}-${fyStartYear + 57} (Last)`,
      from: `${fyStartYear - 1}-07-16`,
      to:   `${fyStartYear}-07-15`,
    },
    {
      label: "This Month",
      from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
      to:   new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0],
    },
    {
      label: "Last Month",
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0],
      to:   new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0],
    },
    {
      label: "This Year (AD)",
      from: `${year}-01-01`,
      to:   `${year}-12-31`,
    },
  ];
}

export function LedgerFilters({
  suppliers,
  supplierId,
  from,
  to,
}: {
  suppliers: Supplier[];
  supplierId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo,   setLocalTo]   = useState(to);

  function navigate(params: { supplierId?: string; from?: string; to?: string }) {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.supplierId !== undefined) sp.set("supplierId", params.supplierId);
    if (params.from       !== undefined) sp.set("from",       params.from);
    if (params.to         !== undefined) sp.set("to",         params.to);
    startTransition(() => router.push(`/vendors/ledger?${sp.toString()}`));
  }

  function applyDates() {
    navigate({ from: localFrom, to: localTo });
  }

  const presets = getNepalFYPresets();

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Vendor selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Vendor</label>
        <Select value={supplierId} onValueChange={(v) => navigate({ supplierId: v ?? undefined })}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select vendor">
              {supplierId
                ? suppliers.find((s) => s.id === supplierId)?.name ?? "Select vendor"
                : "Select vendor"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span>{s.name}</span>
                {s.pan && <span className="ml-2 text-xs text-muted-foreground">PAN: {s.pan}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <input
          type="date" value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <input
          type="date" value={localTo}
          onChange={(e) => setLocalTo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <Button onClick={applyDates} disabled={isPending} size="sm">
        {isPending ? "Loading…" : "Apply"}
      </Button>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setLocalFrom(p.from);
              setLocalTo(p.to);
              navigate({ from: p.from, to: p.to });
            }}
            className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Print */}
      {supplierId && (
        <Button
          variant="outline" size="sm"
          className="ml-auto"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4 mr-1.5" />
          Print / PDF
        </Button>
      )}
    </div>
  );
}
