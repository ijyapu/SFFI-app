"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NepaliDateHint } from "@/components/ui/nepali-date-hint";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import type { SupplierReturnRow, ReturnableItem } from "../actions";
import { getSupplierReturnDetail, getPurchaseItemsForReturn, updateSupplierReturn } from "../actions";

type ItemRow = ReturnableItem & { selectedQty: number };

function Rs(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EditReturnDialog({ row, open, onClose }: { row: SupplierReturnRow; open: boolean; onClose: () => void }) {
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (open && loadedFor !== row.id) {
    setLoadedFor(row.id);
    setLoading(true);
    Promise.all([
      getSupplierReturnDetail(row.id),
      getPurchaseItemsForReturn(row.purchaseId, row.id),
    ]).then(([detail, returnable]) => {
      setReturnDate(detail.returnDate);
      setReason(detail.reason ?? "");
      const qtyByProduct = new Map(detail.items.map((i) => [i.productId, i]));
      setItems(returnable.map((r) => {
        const existing = qtyByProduct.get(r.productId);
        return {
          ...r,
          unitPrice: existing?.unitPrice ?? r.unitPrice,
          // This return's own current quantity is not counted in maxReturnable (excluded server-side),
          // so add it back in — this item can be set anywhere up to its own qty + whatever's still free.
          maxReturnable: r.maxReturnable + (existing?.quantity ?? 0),
          selectedQty: existing?.quantity ?? 0,
        };
      }));
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to load return");
    }).finally(() => setLoading(false));
  }

  function setQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((it) => it.productId === productId
        ? { ...it, selectedQty: Math.max(0, Math.min(qty, it.maxReturnable)) }
        : it
      )
    );
  }

  const selectedItems = items.filter((it) => it.selectedQty > 0);
  const totalAmount = selectedItems.reduce((s, it) => s + it.selectedQty * it.unitPrice, 0);

  function handleSave() {
    if (selectedItems.length === 0) {
      toast.error("Enter a quantity for at least one item");
      return;
    }
    startTransition(async () => {
      try {
        await updateSupplierReturn(row.id, {
          returnDate,
          reason: reason || undefined,
          items: selectedItems.map((it) => ({ productId: it.productId, quantity: it.selectedQty, unitPrice: it.unitPrice })),
        });
        toast.success(`${row.returnNumber} updated`);
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update return");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return {row.returnNumber}</DialogTitle>
          <DialogDescription>
            {row.supplierName} · Invoice {row.invoiceNo}. Editing recomputes stock, Vendor Ledger, and
            the Daily Log to match the corrected quantities.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Return Date *</Label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <NepaliDateHint value={returnDate} />
              </div>
              <div className="space-y-1">
                <Label>Vendor / Invoice</Label>
                <p className="h-9 flex items-center text-sm text-muted-foreground">
                  {row.supplierName} · {row.invoiceNo}
                </p>
              </div>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Product</TableHead>
                    <TableHead numeric>Purchased</TableHead>
                    <TableHead numeric className="w-28">Return Qty</TableHead>
                    <TableHead numeric>Amount (Rs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableEmptyRow colSpan={4} message="No returnable items on this invoice." />
                  )}
                  {items.map((it) => (
                    <TableRow key={it.productId} className={it.maxReturnable <= 0 ? "opacity-40" : ""}>
                      <TableCell>
                        <div className="text-sm font-medium">{it.productName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.sku} · {it.unitName}</div>
                      </TableCell>
                      <TableCell numeric className="text-sm">{it.quantityPurchased}</TableCell>
                      <TableCell numeric>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          max={it.maxReturnable}
                          disabled={it.maxReturnable <= 0}
                          value={it.selectedQty === 0 ? "" : it.selectedQty}
                          onChange={(e) => setQty(it.productId, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 w-24 rounded border border-input bg-transparent px-2 text-right text-xs tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </TableCell>
                      <TableCell numeric className="text-sm font-medium">
                        {it.selectedQty > 0 ? Rs(it.selectedQty * it.unitPrice) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex justify-end text-sm font-semibold">
                Total: Rs {Rs(totalAmount)}
              </div>
            )}

            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || loading || selectedItems.length === 0}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
