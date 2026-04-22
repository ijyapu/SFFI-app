"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, FlaskConical, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { upsertRecipe, deleteRecipe } from "../actions";

type Product = { id: string; name: string; sku: string; unitName: string; costPrice: number };
type IngredientLine = { key: number; productId: string; quantity: number | "" };

let nextKey = 1;
function emptyLine(): IngredientLine {
  return { key: nextKey++, productId: "", quantity: "" };
}

export function RecipeEditor({
  product,
  existingRecipe,
  availableIngredients,
}: {
  product: { id: string; name: string; sku: string; unitName: string; costPrice: number; sellingPrice: number; categoryName: string };
  existingRecipe: {
    yieldQty: number;
    notes: string | null;
    ingredients: { productId: string; productName: string; unitName: string; quantity: number; costPrice: number }[];
  } | null;
  availableIngredients: Product[];
}) {
  const router = useRouter();

  const [yieldQty,  setYieldQty]  = useState<number | "">(existingRecipe?.yieldQty ?? 1);
  const [notes,     setNotes]     = useState(existingRecipe?.notes ?? "");
  const [lines,     setLines]     = useState<IngredientLine[]>(() =>
    existingRecipe && existingRecipe.ingredients.length > 0
      ? existingRecipe.ingredients.map((i) => ({ key: nextKey++, productId: i.productId, quantity: i.quantity }))
      : [emptyLine()]
  );
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const productMap = useMemo(
    () => new Map(availableIngredients.map((p) => [p.id, p])),
    [availableIngredients]
  );

  // Real-time batch cost
  const batchCost = useMemo(() =>
    lines.reduce((sum, l) => {
      const qty  = Number(l.quantity) || 0;
      const cost = productMap.get(l.productId)?.costPrice ?? 0;
      return sum + qty * cost;
    }, 0),
    [lines, productMap]
  );

  const yieldNum    = Number(yieldQty) || 0;
  const costPerUnit = yieldNum > 0 ? batchCost / yieldNum : 0;
  const margin      = product.sellingPrice > 0 && costPerUnit > 0
    ? ((product.sellingPrice - costPerUnit) / product.sellingPrice) * 100
    : null;

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: number) {
    setLines((prev) => prev.length > 1 ? prev.filter((l) => l.key !== key) : prev);
  }

  function updateLine(key: number, patch: Partial<Omit<IngredientLine, "key">>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${key}_productId`];
      delete next[`${key}_quantity`];
      delete next["_global"];
      return next;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!yieldQty || Number(yieldQty) <= 0) errs["yieldQty"] = "Must be > 0";
    let hasValid = false;
    for (const l of lines) {
      if (!l.productId) errs[`${l.key}_productId`] = "Select an ingredient";
      if (l.quantity === "" || Number(l.quantity) <= 0) errs[`${l.key}_quantity`] = "Must be > 0";
      if (l.productId && Number(l.quantity) > 0) hasValid = true;
    }
    if (!hasValid && Object.keys(errs).length === 0) errs["_global"] = "Add at least one ingredient";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
      await upsertRecipe(product.id, {
        yieldQty:    Number(yieldQty),
        notes:       notes.trim() || undefined,
        ingredients: validLines.map((l) => ({
          productId: l.productId,
          quantity:  Number(l.quantity),
        })),
      });
      toast.success("Recipe saved");
      router.push("/costing/recipes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    try {
      await deleteRecipe(product.id);
      toast.success("Recipe deleted");
      router.push("/costing/recipes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete recipe");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cost summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Batch Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Batch Cost</p>
            <p className="text-xl font-bold tabular-nums">
              Rs {batchCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Yield</p>
            <p className="text-xl font-bold tabular-nums">
              {yieldNum > 0 ? yieldNum.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "—"} {product.unitName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Cost / Unit</p>
            <p className="text-xl font-bold text-blue-600 tabular-nums">
              {costPerUnit > 0
                ? `Rs ${costPerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Margin</p>
            <p className={`text-xl font-bold tabular-nums ${margin === null ? "text-muted-foreground/40" : margin >= 0 ? "text-green-600" : "text-destructive"}`}>
              {margin !== null ? `${margin >= 0 ? "+" : ""}${margin.toFixed(1)}%` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Yield + notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Batch Yield ({product.unitName})
          </Label>
          <Input
            type="number" min="0.001" step="0.001" placeholder="1"
            value={yieldQty}
            onChange={(e) => {
              setYieldQty(e.target.value === "" ? "" : parseFloat(e.target.value));
              setErrors((prev) => { const n = { ...prev }; delete n["yieldQty"]; return n; });
            }}
            className={errors["yieldQty"] ? "border-destructive" : ""}
          />
          {errors["yieldQty"] && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors["yieldQty"]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes <span className="normal-case font-normal tracking-normal">(optional)</span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Production notes..."
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* Ingredients table */}
      <div className="rounded-lg border">
        {/* Header */}
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_10rem_10rem_3rem] bg-muted/30 border-b">
          <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</div>
          <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Ingredient</div>
          <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">Qty / Batch</div>
          <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">Line Cost (Rs)</div>
          <div />
        </div>

        {/* Rows */}
        <div className="divide-y">
          {lines.map((line, idx) => {
            const ing       = productMap.get(line.productId);
            const qty       = Number(line.quantity) || 0;
            const lineCost  = qty * (ing?.costPrice ?? 0);
            const errProd   = errors[`${line.key}_productId`];
            const errQty    = errors[`${line.key}_quantity`];

            return (
              <div
                key={line.key}
                className={`grid grid-cols-[3rem_minmax(0,1fr)_10rem_10rem_3rem] items-start ${
                  errProd || errQty ? "bg-destructive/5" : "hover:bg-muted/10"
                }`}
              >
                <div className="px-4 py-2.5 text-sm text-muted-foreground/50 tabular-nums self-center">{idx + 1}</div>

                <div className="px-3 py-2 space-y-1">
                  <Select
                    value={line.productId}
                    onValueChange={(v) => v && updateLine(line.key, { productId: v })}
                  >
                    <SelectTrigger className={`h-8 w-full text-sm ${errProd ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Choose ingredient…">
                        {ing ? `${ing.name} (${ing.unitName})` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent searchable>
                      {availableIngredients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{" "}
                          <span className="text-xs text-muted-foreground">({p.unitName} · Rs {p.costPrice.toFixed(2)})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errProd && <p className="flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="h-3 w-3" />{errProd}</p>}
                </div>

                <div className="px-3 py-2 space-y-1">
                  <Input
                    type="number" min="0.001" step="0.001" placeholder="0"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, {
                      quantity: e.target.value === "" ? "" : parseFloat(e.target.value),
                    })}
                    className={`h-8 text-sm text-right tabular-nums ${errQty ? "border-destructive" : ""}`}
                  />
                  {errQty && <p className="text-[11px] text-destructive text-right">{errQty}</p>}
                </div>

                <div className="px-3 py-2 flex items-center justify-end min-h-10">
                  {lineCost > 0 ? (
                    <span className="text-sm tabular-nums font-semibold text-blue-600">
                      {lineCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30 text-sm">—</span>
                  )}
                </div>

                <div className="flex items-center justify-center min-h-10">
                  <Button
                    type="button" variant="ghost" size="icon"
                    disabled={lines.length === 1}
                    onClick={() => removeLine(line.key)}
                    className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 disabled:opacity-20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add Ingredient
          </Button>
          <div className="text-sm text-muted-foreground tabular-nums">
            Total: <span className="font-semibold text-foreground">
              Rs {batchCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Errors + actions */}
      {errors["_global"] && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{errors["_global"]}
        </p>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        {existingRecipe ? (
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Recipe"}
          </Button>
        ) : <div />}

        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : existingRecipe ? "Update Recipe" : "Save Recipe"}
        </Button>
      </div>
    </div>
  );
}
