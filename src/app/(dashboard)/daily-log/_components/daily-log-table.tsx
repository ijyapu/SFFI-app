"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Check, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
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

// Header class helpers — computed cols get a muted tint, editable cols stay default
const CH_COMPUTED = "bg-muted/40 text-muted-foreground font-medium text-[11px] px-2 py-2 whitespace-nowrap";
const CH_EDITABLE = "font-semibold text-[11px] px-2 py-2 whitespace-nowrap";

export function DailyLogTable({ items, isOpen }: Props) {
  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => ({ ...item, _saving: false, _saved: false, _dirty: false }))
  );
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

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

      setRows((p) => p.map((r) => r.id === itemId ? { ...r, _saving: true, _dirty: false } : r));

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
        setRows((p) => p.map((r) => r.id === itemId ? { ...r, _saving: false, _saved: true } : r));
        setTimeout(() => {
          setRows((p) => p.map((r) => r.id === itemId ? { ...r, _saved: false } : r));
        }, 2000);
      } catch (err) {
        setRows((p) => p.map((r) => r.id === itemId ? { ...r, _saving: false, _dirty: true } : r));
        toast.error(err instanceof Error ? err.message : "Save failed — please try again");
      }
    }, 700);

    saveTimers.current.set(itemId, timer);
  }, []);

  function updateField<
    K extends keyof Pick<
      RowState,
      "producedQty" | "freshReturnQty" | "usedQty" | "soldQty" | "wasteQty" | "damagedQty" | "notes"
    >
  >(itemId: string, field: K, value: RowState[K]) {
    setRows((prev) =>
      prev.map((r) => r.id === itemId ? { ...r, [field]: value, _dirty: true, _saved: false } : r)
    );
    scheduleSave(itemId);
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

  // Compact numeric input — shorter than standard h-8
  const numInputCls =
    "h-7 w-20 rounded border border-input bg-transparent px-2 text-right text-xs tabular-nums " +
    "outline-none placeholder:text-muted-foreground/40 " +
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 " +
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/20";

  function numInput(
    row: RowState,
    field: keyof Pick<RowState, "producedQty" | "freshReturnQty" | "usedQty" | "soldQty" | "wasteQty" | "damagedQty">,
    colorCls?: string
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
        onChange={(e) => updateField(row.id, field, parseFloat(e.target.value) || 0)}
        onBlur={(e) => updateField(row.id, field, parseFloat(e.target.value) || 0)}
        className={cn(numInputCls, colorCls)}
      />
    );
  }

  return (
    /* overflow-y-auto + max-h gives the table its own scroll context so the sticky header works */
    <div className="rounded-lg border overflow-x-auto overflow-y-auto max-h-[72vh] xl:max-h-[80vh]">
      <Table>
        {/* sticky top-0 — sticks inside the scroll container above */}
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="bg-muted/60 border-b-2 border-border hover:bg-muted/60">

            {/* Product — sticky in both axes */}
            <TableHead className="min-w-40 sticky left-0 z-30 bg-muted/60 font-bold text-foreground text-xs border-r px-3 py-2">
              Product
            </TableHead>

            {/* ── Computed: opening & purchases ─────────────────── */}
            <TableHead className={cn(CH_COMPUTED, "text-right w-20")} title="Opening stock carried from previous day">
              Opening
            </TableHead>
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-slate-600")} title="Auto-pulled from today's purchase orders — already in stock">
              Purch.
            </TableHead>

            {/* ── Editable IN ─ left separator marks editable zone ─ */}
            <TableHead className={cn(CH_EDITABLE, "text-right w-20 text-emerald-700 border-l-2 border-border")} title="Produced today">
              Produced
            </TableHead>

            {/* ── Editable OUT ──────────────────────────────────── */}
            <TableHead className={cn(CH_EDITABLE, "text-right w-20 text-orange-600")} title="Used in production">
              Used
            </TableHead>

            {/* ── Computed: sold & returns ──────────────────────── */}
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-rose-600")} title="Auto-pulled from today's confirmed sales orders — not editable here">
              Sold
            </TableHead>
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-emerald-600")} title="Fresh returns auto-pulled from today's sales returns">
              Fr.Ret.
            </TableHead>
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-amber-600")} title="Waste returns — informational only, not deducted here">
              Wst.Ret.
            </TableHead>

            {/* ── Editable: waste & damaged ─────────────────────── */}
            <TableHead className={cn(CH_EDITABLE, "text-right w-20 text-rose-600")} title="Wasted today">
              Waste
            </TableHead>
            <TableHead className={cn(CH_EDITABLE, "text-right w-20 text-rose-600")} title="Damaged today">
              Damaged
            </TableHead>

            {/* ── Computed: adjustments ─ right separator ───────── */}
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-teal-600 border-l-2 border-border")} title="Inventory adjustment (adds stock) — set from Inventory section">
              Adj.In
            </TableHead>
            <TableHead className={cn(CH_COMPUTED, "text-right w-20 text-red-600")} title="Inventory adjustment (removes stock) — set from Inventory section">
              Adj.Out
            </TableHead>

            {/* ── Computed: closing ─────────────────────────────── */}
            <TableHead
              className="w-24 text-right px-2 py-2 font-bold text-foreground text-xs bg-muted/60 border-l-2 border-border whitespace-nowrap"
              title="Closing = Opening + Purchased + Produced + Fr.Ret. + Adj.In − Used − Sold − Waste − Damaged − Adj.Out"
            >
              Closing
            </TableHead>

            <TableHead className="min-w-28 text-[11px] font-medium text-muted-foreground px-2 py-2">Notes</TableHead>
            <TableHead className="w-5 px-1 py-2" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableEmptyRow colSpan={16} message="No products in this log." />
          )}

          {grouped.map(({ catId, catName, rows: catRows }) => {
            const collapsed = collapsedCats.has(catId);

            const totals = catRows.reduce(
              (acc, r) => ({
                produced: acc.produced + r.producedQty,
                used:     acc.used     + r.usedQty,
                sold:     acc.sold     + r.soldQty,
                waste:    acc.waste    + r.wasteQty + r.damagedQty,
              }),
              { produced: 0, used: 0, sold: 0, waste: 0 }
            );
            const hasActivity = totals.produced > 0 || totals.used > 0 || totals.sold > 0 || totals.waste > 0;

            return (
              <React.Fragment key={catId}>
                {/* Category header — click to collapse/expand */}
                <TableRow
                  className="bg-muted/25 hover:bg-muted/35 border-y border-border/50 cursor-pointer select-none"
                  onClick={() => toggleCat(catId)}
                >
                  <TableCell colSpan={16} className="py-1.5 px-3">
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
                      {/* Summary totals — shown when collapsed or always */}
                      {hasActivity && (
                        <span className="flex items-center gap-2.5 text-[11px] ml-1">
                          {totals.produced > 0 && (
                            <span className="text-emerald-600 font-medium">+{fmt(totals.produced)} prod.</span>
                          )}
                          {totals.used > 0 && (
                            <span className="text-orange-500">{fmt(totals.used)} used</span>
                          )}
                          {totals.sold > 0 && (
                            <span className="text-rose-500">{fmt(totals.sold)} sold</span>
                          )}
                          {totals.waste > 0 && (
                            <span className="text-rose-400">{fmt(totals.waste)} waste</span>
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Product rows — hidden when category is collapsed */}
                {!collapsed && catRows.map((row) => {
                  const closing    = calcClosing(row);
                  const hasRowActivity = (
                    row.producedQty + row.freshReturnQty + row.usedQty + row.soldQty +
                    row.wasteQty + row.damagedQty + row.adjustInQty + row.adjustOutQty
                  ) > 0;
                  const isNegative     = closing < -0.001;
                  const openingStale   = row.openingOutdated;
                  const hasDelta       = row.formulaDelta !== 0;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "align-middle transition-colors duration-100",
                        isNegative
                          ? "bg-red-50/50 hover:bg-red-50/70"
                          : !hasRowActivity && "text-muted-foreground/60",
                      )}
                    >
                      {/* Product — sticky left */}
                      <TableCell className="sticky left-0 z-10 bg-background px-3 py-1.5 border-r border-border/30">
                        <div className={cn("font-medium text-xs leading-tight", hasRowActivity ? "text-foreground" : "")}>
                          {row.productName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
                          {row.productSku} · {row.unitName}
                        </div>
                      </TableCell>

                      {/* Opening — amber if stale */}
                      <TableCell className={cn(
                        "text-right tabular-nums text-xs px-2 py-1.5",
                        openingStale ? "text-amber-600 font-semibold" : "",
                      )}>
                        {fmt(row.openingQty)}
                        {openingStale && (
                          <span className="ml-0.5 text-[9px] align-super">⚠</span>
                        )}
                      </TableCell>

                      {/* Purchased (computed) */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-slate-600">
                        {row.purchasedQty > 0
                          ? `+${fmt(row.purchasedQty)}`
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Produced (editable) — left separator */}
                      <TableCell className="text-right px-1.5 py-1 border-l-2 border-border/40">
                        {numInput(row, "producedQty")}
                      </TableCell>

                      {/* Used (editable) */}
                      <TableCell className="text-right px-1.5 py-1">
                        {numInput(row, "usedQty")}
                      </TableCell>

                      {/* Sold (computed — from confirmed sales orders) */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-rose-600">
                        {row.soldQty > 0
                          ? fmt(row.soldQty)
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Fresh Return (computed) */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-emerald-700">
                        {row.freshReturnQty > 0
                          ? `+${fmt(row.freshReturnQty)}`
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Waste Return (computed, informational) */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-amber-600">
                        {row.wasteReturnQty > 0
                          ? fmt(row.wasteReturnQty)
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Waste (editable) */}
                      <TableCell className="text-right px-1.5 py-1">
                        {numInput(row, "wasteQty")}
                      </TableCell>

                      {/* Damaged (editable) */}
                      <TableCell className="text-right px-1.5 py-1">
                        {numInput(row, "damagedQty")}
                      </TableCell>

                      {/* Adj. In (computed) — right separator */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-teal-700 border-l-2 border-border/40">
                        {row.adjustInQty > 0
                          ? `+${fmt(row.adjustInQty)}`
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Adj. Out (computed) */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-red-700">
                        {row.adjustOutQty > 0
                          ? `−${fmt(row.adjustOutQty)}`
                          : <span className="text-muted-foreground/30">—</span>}
                      </TableCell>

                      {/* Closing (computed) — highlighted */}
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 border-l-2 border-border/40 bg-muted/10">
                        {isNegative ? (
                          <span className="text-red-600 font-bold">{closing.toFixed(3)}</span>
                        ) : (
                          <span className={cn(
                            "font-semibold",
                            hasRowActivity ? "text-foreground" : "text-muted-foreground/50"
                          )}>
                            {fmt(closing)}
                          </span>
                        )}
                        {hasDelta && (
                          <span
                            className="ml-0.5 text-[9px] text-amber-500 align-super"
                            title={`Formula delta: ${row.formulaDelta > 0 ? "+" : ""}${row.formulaDelta.toFixed(3)} — figures changed after close`}
                          >
                            Δ
                          </span>
                        )}
                      </TableCell>

                      {/* Notes (editable) */}
                      <TableCell className="px-1.5 py-1">
                        <input
                          type="text"
                          disabled={!isOpen}
                          placeholder={isOpen ? "notes…" : ""}
                          value={row.notes ?? ""}
                          onChange={(e) => updateField(row.id, "notes", e.target.value || null)}
                          className="h-7 w-full min-w-24 rounded border border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 disabled:bg-muted/20 disabled:cursor-not-allowed"
                        />
                      </TableCell>

                      {/* Save status indicator */}
                      <TableCell className="w-5 text-center px-1 py-1.5">
                        {row._saving && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        {!row._saving && row._saved && (
                          <Check className="h-3 w-3 text-emerald-500" />
                        )}
                        {!row._saving && !row._saved && row._dirty && (
                          <span
                            className="block h-1.5 w-1.5 rounded-full bg-amber-400 mx-auto"
                            title="Unsaved changes"
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
      <div className="px-3 py-2 border-t bg-muted/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
          Unsaved
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-500" />
          Saved
        </span>
        <span>
          <span className="inline-block rounded bg-muted/50 px-1 text-[10px] text-muted-foreground">Purch · Sold · Fr.Ret · Adj</span>
          {" "}auto-computed from orders · read-only
        </span>
        <span>
          <span className="font-medium text-foreground/70">Closing</span>
          {" = "}Op + Prod + Purch + FrRet + AdjIn − Used − Sold − Waste − Dmg − AdjOut
        </span>
        <span>Click a category row to collapse it</span>
      </div>
    </div>
  );
}
