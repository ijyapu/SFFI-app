"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Check, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import type { ProductionEntryRow } from "../actions";
import { upsertProductionEntry } from "../actions";

type RowState = ProductionEntryRow & {
  _saving: boolean;
  _saved: boolean;
  _dirty: boolean;
};

type Props = {
  date: string; // YYYY-MM-DD
  items: ProductionEntryRow[];
};

function fmt(n: number): string {
  if (n === 0) return "0";
  return parseFloat(n.toFixed(3)).toString();
}

// Server actions throw plain Error("Unauthenticated") / Error("Unauthorized") —
// translate those (and unrecognized/network failures) into messages a non-technical
// user can act on, instead of surfacing the raw internal error string.
function describeSaveError(err: unknown): { message: string; isSessionError: boolean } {
  const raw = err instanceof Error ? err.message : "";
  if (raw === "Unauthenticated") {
    return { message: "Your session has expired. Please sign in again to keep saving.", isSessionError: true };
  }
  if (raw === "Unauthorized") {
    return { message: "You no longer have permission to edit this.", isSessionError: true };
  }
  if (raw) return { message: raw, isSessionError: false };
  return { message: "Couldn't save — check your internet connection and try again.", isSessionError: false };
}

export function ProductionTable({ date, items }: Props) {
  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => ({ ...item, _saving: false, _saved: false, _dirty: false }))
  );
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Full remount happens via `key={date}` on the parent, but keep state in sync
  // defensively if items ever change without a remount.
  useEffect(() => {
    setRows(items.map((item) => ({ ...item, _saving: false, _saved: false, _dirty: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const rowsRef = useRef<RowState[]>(rows);
  useEffect(() => { rowsRef.current = rows; });

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sessionErrorShown = useRef(false);

  const scheduleSave = useCallback((productId: string) => {
    const existing = saveTimers.current.get(productId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      saveTimers.current.delete(productId);
      const row = rowsRef.current.find((r) => r.productId === productId);
      if (!row || !row._dirty) return;

      setRows((p) => p.map((r) => r.productId === productId ? { ...r, _saving: true, _dirty: false } : r));

      try {
        await upsertProductionEntry(date, productId, {
          producedQty: row.producedQty,
          usedQty: row.usedQty,
          wasteQty: row.wasteQty,
          damagedQty: row.damagedQty,
          notes: row.notes,
        });
        setRows((p) => p.map((r) => r.productId === productId ? { ...r, _saving: false, _saved: true } : r));
        setTimeout(() => {
          setRows((p) => p.map((r) => r.productId === productId ? { ...r, _saved: false } : r));
        }, 2000);
      } catch (err) {
        setRows((p) => p.map((r) => r.productId === productId ? { ...r, _saving: false, _dirty: true } : r));
        const { message, isSessionError } = describeSaveError(err);

        if (isSessionError) {
          if (!sessionErrorShown.current) {
            sessionErrorShown.current = true;
            toast.error(message, {
              duration: Infinity,
              action: { label: "Sign in", onClick: () => { window.location.href = "/sign-in"; } },
            });
          }
        } else {
          toast.error(message);
        }
      }
    }, 700);

    saveTimers.current.set(productId, timer);
  }, [date]);

  function updateField<
    K extends keyof Pick<RowState, "producedQty" | "usedQty" | "wasteQty" | "damagedQty" | "notes">
  >(productId: string, field: K, value: RowState[K]) {
    setRows((prev) =>
      prev.map((r) => r.productId === productId ? { ...r, [field]: value, _dirty: true, _saved: false } : r)
    );
    scheduleSave(productId);
  }

  function toggleCat(catId: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
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

  const numInputCls =
    "h-7 w-20 rounded border border-input bg-transparent px-2 text-right text-xs tabular-nums " +
    "outline-none placeholder:text-muted-foreground/40 " +
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

  function numInput(row: RowState, field: keyof Pick<RowState, "producedQty" | "usedQty" | "wasteQty" | "damagedQty">, colorCls?: string) {
    const val = row[field] as number;
    return (
      <input
        key={`${row.productId}-${field}`}
        type="number"
        step="0.001"
        min="0"
        placeholder="—"
        defaultValue={val === 0 ? "" : val}
        onChange={(e) => updateField(row.productId, field, parseFloat(e.target.value) || 0)}
        onBlur={(e) => updateField(row.productId, field, parseFloat(e.target.value) || 0)}
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(numInputCls, colorCls)}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto overflow-y-auto max-h-[72vh] xl:max-h-[80vh]">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="bg-muted/60 border-b-2 border-border hover:bg-muted/60">
            <TableHead className="min-w-40 sticky left-0 z-30 bg-muted/60 font-bold text-foreground text-xs border-r px-3 py-2">
              Product
            </TableHead>
            <TableHead className="text-right w-20 font-semibold text-[11px] px-2 py-2 whitespace-nowrap text-emerald-700" title="Produced today">
              Produced
            </TableHead>
            <TableHead className="text-right w-20 font-semibold text-[11px] px-2 py-2 whitespace-nowrap text-orange-600" title="Used today">
              Used
            </TableHead>
            <TableHead className="text-right w-20 font-semibold text-[11px] px-2 py-2 whitespace-nowrap text-rose-600" title="Wasted today">
              Waste
            </TableHead>
            <TableHead className="text-right w-20 font-semibold text-[11px] px-2 py-2 whitespace-nowrap text-rose-600" title="Damaged today">
              Damaged
            </TableHead>
            <TableHead className="min-w-28 text-[11px] font-medium text-muted-foreground px-2 py-2">Notes</TableHead>
            <TableHead className="w-5 px-1 py-2" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableEmptyRow colSpan={7} message="No active products." />
          )}

          {grouped.map(({ catId, catName, rows: catRows }) => {
            const collapsed = collapsedCats.has(catId);

            const totals = catRows.reduce(
              (acc, r) => ({
                produced: acc.produced + r.producedQty,
                used: acc.used + r.usedQty,
                waste: acc.waste + r.wasteQty + r.damagedQty,
              }),
              { produced: 0, used: 0, waste: 0 }
            );
            const hasActivity = totals.produced > 0 || totals.used > 0 || totals.waste > 0;

            return (
              <React.Fragment key={catId}>
                <TableRow
                  className="bg-muted/25 hover:bg-muted/35 border-y border-border/50 cursor-pointer select-none"
                  onClick={() => toggleCat(catId)}
                >
                  <TableCell colSpan={7} className="py-1.5 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                          !collapsed && "rotate-90"
                        )}
                        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                      />
                      <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                        {catName}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50">
                        {catRows.length} item{catRows.length !== 1 ? "s" : ""}
                      </span>
                      {hasActivity && (
                        <span className="flex items-center gap-2.5 text-[11px] ml-1">
                          {totals.produced > 0 && (
                            <span className="text-emerald-600 font-medium">+{fmt(totals.produced)} prod.</span>
                          )}
                          {totals.used > 0 && (
                            <span className="text-orange-500">{fmt(totals.used)} used</span>
                          )}
                          {totals.waste > 0 && (
                            <span className="text-rose-400">{fmt(totals.waste)} waste</span>
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {!collapsed && catRows.map((row) => {
                  const hasRowActivity = (row.producedQty + row.usedQty + row.wasteQty + row.damagedQty) > 0;

                  return (
                    <TableRow
                      key={row.productId}
                      className={cn("align-middle transition-colors duration-100", !hasRowActivity && "text-muted-foreground/60")}
                    >
                      <TableCell className="sticky left-0 z-10 bg-background px-3 py-1.5 border-r border-border/30">
                        <div className={cn("font-medium text-xs leading-tight", hasRowActivity ? "text-foreground" : "")}>
                          {row.productName}
                        </div>
                        <div className="flex items-center gap-1 leading-tight mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{row.productSku}</span>
                          <span
                            className="inline-flex items-center rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-foreground/70"
                            title="Unit for every quantity column in this row"
                          >
                            {row.unitName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right px-1.5 py-1">{numInput(row, "producedQty")}</TableCell>
                      <TableCell className="text-right px-1.5 py-1">{numInput(row, "usedQty")}</TableCell>
                      <TableCell className="text-right px-1.5 py-1">{numInput(row, "wasteQty")}</TableCell>
                      <TableCell className="text-right px-1.5 py-1">{numInput(row, "damagedQty")}</TableCell>

                      <TableCell className="px-1.5 py-1">
                        <input
                          type="text"
                          placeholder="notes…"
                          value={row.notes ?? ""}
                          onChange={(e) => updateField(row.productId, "notes", e.target.value || null)}
                          className="h-7 w-full min-w-24 rounded border border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                      </TableCell>

                      <TableCell className="w-5 text-center px-1 py-1.5">
                        {row._saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        {!row._saving && row._saved && <Check className="h-3 w-3 text-emerald-500" />}
                        {!row._saving && !row._saved && row._dirty && (
                          <span className="block h-1.5 w-1.5 rounded-full bg-amber-400 mx-auto" title="Unsaved changes" />
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

      <div className="px-3 py-2 border-t bg-muted/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
          Unsaved
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-500" />
          Saved — updates Inventory immediately
        </span>
        <span>Click a category row to collapse it</span>
      </div>
    </div>
  );
}
