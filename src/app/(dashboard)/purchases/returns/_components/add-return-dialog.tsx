"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NepaliDateHint } from "@/components/ui/nepali-date-hint";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import type { PurchaseInvoiceOption, ReturnableItem } from "../actions";
import { getPurchaseItemsForReturn, createSupplierReturn } from "../actions";

type Supplier = { id: string; name: string };

type ItemRow = ReturnableItem & { selectedQty: number };

function Rs(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_STATE = {
  supplierId: "",
  purchaseId: "",
  returnDate: format(new Date(), "yyyy-MM-dd"),
  reason: "",
};

export function AddReturnDialog({ invoices, suppliers }: { invoices: PurchaseInvoiceOption[]; suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(EMPTY_STATE);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setFields(EMPTY_STATE);
    setItems([]);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  const invoicesForSupplier = fields.supplierId
    ? invoices.filter((i) => i.supplierId === fields.supplierId)
    : invoices;

  async function handleSupplierChange(supplierId: string) {
    setFields((f) => ({ ...f, supplierId, purchaseId: "" }));
    setItems([]);
  }

  async function handlePurchaseChange(purchaseId: string) {
    setFields((f) => ({ ...f, purchaseId }));
    setItems([]);
    setLoadingItems(true);
    try {
      const returnable = await getPurchaseItemsForReturn(purchaseId);
      setItems(returnable.map((r) => ({ ...r, selectedQty: 0 })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice items");
    } finally {
      setLoadingItems(false);
    }
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
    if (!fields.supplierId || !fields.purchaseId) {
      toast.error("Select a vendor and invoice first");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Enter a quantity for at least one item");
      return;
    }
    startTransition(async () => {
      try {
        await createSupplierReturn({
          purchaseId: fields.purchaseId,
          supplierId: fields.supplierId,
          returnDate: fields.returnDate,
          reason: fields.reason || undefined,
          items: selectedItems.map((it) => ({
            productId: it.productId,
            quantity: it.selectedQty,
            unitPrice: it.unitPrice,
          })),
        });
        toast.success("Purchase return recorded");
        handleOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save return");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Return
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Purchase Return</DialogTitle>
            <DialogDescription>
              Record goods sent back to a supplier against a specific invoice. This removes the
              returned quantity from Inventory and credits the amount off what's owed on that invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Return Date *</Label>
              <input
                type="date"
                value={fields.returnDate}
                onChange={(e) => setFields((f) => ({ ...f, returnDate: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <NepaliDateHint value={fields.returnDate} />
            </div>

            <div className="space-y-1">
              <Label>Vendor *</Label>
              <Select value={fields.supplierId} onValueChange={(v) => v && handleSupplierChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor">
                    {suppliers.find((s) => s.id === fields.supplierId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent searchable>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Invoice No. *</Label>
              <Select
                value={fields.purchaseId}
                onValueChange={(v) => v && handlePurchaseChange(v)}
                disabled={invoicesForSupplier.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={fields.supplierId ? "Select invoice" : "Select a vendor first"}>
                    {invoicesForSupplier.find((i) => i.id === fields.purchaseId)?.invoiceNo}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent searchable>
                  {invoicesForSupplier.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.invoiceNo} — {format(new Date(i.date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingItems && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invoice items...
            </div>
          )}

          {!loadingItems && fields.purchaseId && (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Product</TableHead>
                    <TableHead numeric>Purchased</TableHead>
                    <TableHead numeric>Already Returned</TableHead>
                    <TableHead numeric className="w-28">Return Qty</TableHead>
                    <TableHead numeric>Amount (Rs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableEmptyRow colSpan={5} message="No returnable items on this invoice." />
                  )}
                  {items.map((it) => (
                    <TableRow key={it.productId} className={it.maxReturnable <= 0 ? "opacity-40" : ""}>
                      <TableCell>
                        <div className="text-sm font-medium">{it.productName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.sku} · {it.unitName}</div>
                      </TableCell>
                      <TableCell numeric className="text-sm">{it.quantityPurchased}</TableCell>
                      <TableCell numeric className="text-sm text-muted-foreground">
                        {it.alreadyReturned > 0 ? it.alreadyReturned : "—"}
                      </TableCell>
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
          )}

          {selectedItems.length > 0 && (
            <div className="flex justify-end text-sm font-semibold">
              Total: Rs {Rs(totalAmount)}
            </div>
          )}

          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea
              value={fields.reason}
              onChange={(e) => setFields((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              placeholder="Optional — e.g. over-delivered, wrong item, damaged on arrival..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || selectedItems.length === 0}>
              {isPending ? "Saving..." : "Save Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
