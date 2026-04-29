"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Check, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { DailyLogItemRow } from "../actions";
import { updateDailyLogItem } from "../actions";

type RowState = DailyLogItemRow & {
  _saving: boolean;
  _saved: boolean;
  _dirty: boolean;
};

type Props = {
  items: DailyLogItemRow[];
  isOpen: boolean;
};

function calcClosing(row: RowState): number {
  return (
    row.openingQty +
    row.purchasedQty +
    row.producedQty +
    row.freshReturnQty +
    row.adjustInQty -
    row.usedQty -
    row.soldQty -
    row.wasteQty -
    row.damagedQty -
    row.adjustOutQty
  );
}

function fmt(n: number): string {
  if (n === 0) return "0";
  return parseFloat(n.toFixed(3)).toString();
}

export function DailyLogTable({ items, isOpen }: Props) {
  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => ({ ...item, _saving: false, _saved: false, _dirty: false }))
  );

  const rowsRef = useRef<RowState[]>(rows);
  useEffect(() => { rowsRef.current = rows; });

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleSave = useCallback((itemId: string) => {
    const existing = saveTimers.current.get(itemId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      saveTimers.current.delete(itemId);

      const row = rowsRef.current.find((r) => r.id === itemId);
      if (!row || !row._dirty) return;

      setRows((p) =>
        p.map((r) => r.id === itemId ? { ...r, _saving: true, _dirty: false } : r)
      );

      try {
        await updateDailyLogItem(itemId, {
          producedQty:    row.producedQty,
          freshReturnQty: row.freshReturnQty,
          usedQty:        row.usedQty,
          soldQty:        row.soldQty,
          wasteQty:       row.wasteQty,
          damagedQty:     row.damagedQty,
          notes:          row.notes,
        });

        setRows((p) =>
          p.map((r) => r.id === itemId ? { ...r, _saving: false, _saved: true } : r)
        );

        setTimeout(() => {
          setRows((p) =>
            p.map((r) => r.id === itemId ? { ...r, _saved: false } : r)
          );
        }, 2000);
      } catch (err) {
        setRows((p) =>
          p.map((r) => r.id === itemId ? { ...r, _saving: false, _dirty: true } : r)
        );
        toast.error(err instanceof Error ? err.message : "Save failed — please try again");
      }
    }, 700);

    saveTimers.current.set(itemId, timer);
  }, []);

  function updateField<
    K extends keyof Pick<
      RowState,
      "producedQty" | "freshReturnQty" | "usedQty" | "soldQty" | "wasteQty" | "damagedQty" | "notes"
    >,
  >(itemId: string, field: K, value: RowState[K]) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === itemId ? { ...r, [field]: value, _dirty: true, _saved: false } : r
      )
    );
    scheduleSave(itemId);
  }

  const grouped: { catId: string; catName: string; rows: RowState[] }[] = [];
  const seen = new Map<string, number>();
  for (const row of rows) {
    const idx = seen.get(row.categoryId);
    if (idx === undefined) {
      seen.set(row.categoryId, grouped.length);
      grouped.push({ catId: row.categoryId, catName: row.categoryName, rows: [row] });
    } else {
      grouped[idx]!.rows.push(row);
    }
  }

  const numInputClass =
    "h-8 w-24 rounded-md border border-input bg-transparent px-2 text-right text-sm tabular-nums " +
    "outline-none placeholder:text-muted-foreground/40 " +
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30";

  function numInput(
    row: RowState,
    field: keyof Pick<RowState, "producedQty" | "freshReturnQty" | "usedQty" | "soldQty" | "wasteQty" | "damagedQty">,
    colorClass?: string
  ) {
    const val = row[field] as number;
    return (
      <input
        key={`${row.id}-${field}`}
        type="number"
        step="0.001"
        min="0"
        disabled={!isOpen}
        placeholder="—"
        defaultValue={val === 0 ? "" : val}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value) || 0;
          updateField(row.id, field, parsed);
        }}
        onBlur={(e) => {
          const parsed = parseFloat(e.target.value) || 0;
          updateField(row.id, field, parsed);
        }}
        className={`${numInputClass}${colorClass ? ` ${colorClass}` : ""}`}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 border-b-2 border-border">
            <TableHead className="min-w-40 sticky left-0 bg-muted/60 font-bold text-foreground">Product</TableHead>
            <TableHead className="w-20 text-right font-semibold text-foreground/80">Opening</TableHead>
            <TableHead className="w-20 text-right text-blue-600 font-semibold">
              Purchased
              <span className="block text-[10px] font-normal text-blue-400 normal-case tracking-normal">auto</span>
            </TableHead>
            <TableHead className="w-22 text-right text-emerald-700 font-semibold">Produced</TableHead>
            <TableHead className="w-22 text-right text-orange-600 font-semibold">Used</TableHead>
            <TableHead className="w-22 text-right text-rose-600 font-semibold">Sold</TableHead>
            <TableHead className="w-22 text-right text-emerald-600 font-semibold">
              Fresh Ret.
              <span className="block text-[10px] font-normal text-emerald-400 normal-case tracking-normal">returned</span>
            </TableHead>
            <TableHead className="w-22 text-right text-amber-600 font-semibold">
              Waste Ret.
              <span className="block text-[10px] font-normal text-amber-400 normal-case tracking-normal">auto</span>
            </TableHead>
            <TableHead className="w-22 text-right text-rose-600 font-semibold">Waste</TableHead>
            <TableHead className="w-22 text-right text-rose-600 font-semibold">Damaged</TableHead>
            <TableHead className="w-22 text-right border-l text-teal-700 font-semibold">
              Adj. In
              <span className="block text-[10px] font-normal text-teal-500 normal-case tracking-normal">+stock</span>
            </TableHead>
            <TableHead className="w-22 text-right text-red-700 font-semibold">
              Adj. Out
              <span className="block text-[10px] font-normal text-red-400 normal-case tracking-normal">−stock</span>
            </TableHead>
            <TableHead className="w-22 text-right font-bold text-foreground border-l bg-muted/60">Closing</TableHead>
            <TableHead className="min-w-30 font-semibold text-foreground/80">Notes</TableHead>
            <TableHead className="w-6" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={15} className="text-center py-10 text-muted-foreground">
                No products in this log
              </TableCell>
            </TableRow>
          )}

          {grouped.map(({ catId, catName, rows: catRows }) => {
            const totals = catRows.reduce(
              (acc, r) => ({
                produced:  acc.produced  + r.producedQty,
                used:      acc.used      + r.usedQty,
                sold:      acc.sold      + r.soldQty,
                waste:     acc.waste     + r.wasteQty + r.damagedQty,
                adjustIn:  acc.adjustIn  + r.adjustInQty,
                adjustOut: acc.adjustOut + r.adjustOutQty,
              }),
              { produced: 0, used: 0, sold: 0, waste: 0, adjustIn: 0, adjustOut: 0 }
            );

            return (
              <React.Fragment key={catId}>
                <TableRow className="bg-primary/8 hover:bg-primary/8 border-y border-primary/15">
                  <TableCell colSpan={15} className="py-2 px-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold uppercase tracking-widest text-primary">{catName}</span>
                      <span className="text-xs text-muted-foreground/60">({catRows.length} items)</span>
                    </div>
                    {(totals.produced > 0 || totals.used > 0 || totals.sold > 0 || totals.waste > 0 || totals.adjustIn > 0 || totals.adjustOut > 0) && (
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {totals.produced > 0 && (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            <TrendingUp className="inline h-3 w-3 mr-0.5" />
                            +{fmt(totals.produced)} produced
                          </span>
                        )}
                        {totals.used > 0 && (
                          <span className="text-[11px] text-orange-500 font-medium">
                            {fmt(totals.used)} used
                          </span>
                        )}
                        {totals.sold > 0 && (
                          <span className="text-[11px] text-rose-500 font-medium">
                            {fmt(totals.sold)} sold
                          </span>
                        )}
                        {totals.waste > 0 && (
                          <span className="text-[11px] text-rose-400 font-medium">
                            <TrendingDown className="inline h-3 w-3 mr-0.5" />
                            {fmt(totals.waste)} waste/damaged
                          </span>
                        )}
                        {totals.adjustIn > 0 && (
                          <span className="text-[11px] text-teal-600 font-medium">
                            +{fmt(totals.adjustIn)} adj. in
                          </span>
                        )}
                        {totals.adjustOut > 0 && (
                          <span className="text-[11px] text-red-600 font-medium">
                            −{fmt(totals.adjustOut)} adj. out
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>

                {catRows.map((row) => {
                  const closing    = calcClosing(row);
                  const hasActivity = row.producedQty + row.freshReturnQty + row.usedQty + row.soldQty + row.wasteQty + row.damagedQty + row.adjustInQty + row.adjustOutQty > 0;

                  return (
                    <TableRow
                      key={row.id}
                      className={`align-middle transition-colors ${
                        hasActivity ? "" : "text-muted-foreground/70"
                      }`}
                    >
                      {/* Product */}
                      <TableCell className="sticky left-0 bg-background">
                        <div className={`font-medium text-sm ${hasActivity ? "text-foreground" : ""}`}>
                          {row.productName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {row.productSku} · {row.unitName}
                        </div>
                      </TableCell>

                      {/* Opening */}
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt(row.openingQty)}
                      </TableCell>

                      {/* Purchased (read-only) */}
                      <TableCell className="text-right tabular-nums text-sm text-blue-600">
                        {row.purchasedQty > 0 ? `+${fmt(row.purchasedQty)}` : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      {/* Produced */}
                      <TableCell className="text-right">{numInput(row, "producedQty")}</TableCell>
                      {/* Used */}
                      <TableCell className="text-right">{numInput(row, "usedQty")}</TableCell>
                      {/* Sold */}
                      <TableCell className="text-right">{numInput(row, "soldQty")}</TableCell>
                      {/* Fresh Return */}
                      <TableCell className="text-right">{numInput(row, "freshReturnQty", "text-emerald-700")}</TableCell>
                      {/* Waste Return (read-only) */}
                      <TableCell className="text-right tabular-nums text-sm text-amber-600">
                        {row.wasteReturnQty > 0 ? fmt(row.wasteReturnQty) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      {/* Waste */}
                      <TableCell className="text-right">{numInput(row, "wasteQty")}</TableCell>
                      {/* Damaged */}
                      <TableCell className="text-right">{numInput(row, "damagedQty")}</TableCell>

                      {/* Adj. In — read-only, sourced from Inventory adjustments */}
                      <TableCell className="text-right tabular-nums text-sm border-l text-teal-700">
                        {row.adjustInQty > 0 ? `+${fmt(row.adjustInQty)}` : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      {/* Adj. Out — read-only, sourced from Inventory adjustments */}
                      <TableCell className="text-right tabular-nums text-sm text-red-700">
                        {row.adjustOutQty > 0 ? `−${fmt(row.adjustOutQty)}` : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      {/* Closing */}
                      <TableCell className="text-right tabular-nums text-sm font-semibold border-l">
                        {closing < 0 ? (
                          <span className="text-red-600 font-bold">{closing.toFixed(3)}</span>
                        ) : (
                          <span className={hasActivity ? "text-foreground" : "text-muted-foreground/50"}>
                            {fmt(closing)}
                          </span>
                        )}
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        <Input
                          type="text"
                          disabled={!isOpen}
                          placeholder={isOpen ? "Notes..." : "—"}
                          value={row.notes ?? ""}
                          onChange={(e) =>
                            updateField(row.id, "notes", e.target.value || null)
                          }
                          className="h-8 text-sm disabled:opacity-60"
                        />
                      </TableCell>

                      {/* Row status indicator */}
                      <TableCell className="w-6 text-center pr-2">
                        {row._saving && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                        {!row._saving && row._saved && (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {!row._saving && !row._saved && row._dirty && (
                          <span
                            className="block h-2 w-2 rounded-full bg-amber-400 mx-auto"
                            title="Unsaved"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t bg-muted/10 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
          Saving…
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-500" />
          Saved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-blue-600">Purchased</span>
          auto-pulled from today&apos;s purchases · already in stock
        </span>
        <span>
          <span className="font-medium">Closing</span>
          {" = "}Opening + Purchased + Produced + Fresh Ret. + Adj. In − Used − Sold − Waste − Damaged − Adj. Out
        </span>
      </div>
    </div>
  );
}
