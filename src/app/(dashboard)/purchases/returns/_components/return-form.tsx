"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NepaliDateHint } from "@/components/ui/nepali-date-hint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PurchaseInvoiceOption, ReturnableItem } from "../actions";
import { getPurchaseItemsForReturn, createSupplierReturn, updateSupplierReturn } from "../actions";

type Supplier = { id: string; name: string };
type ItemRow = ReturnableItem & { selectedQty: number };

function Rs(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ExistingReturn = {
  id: string;
  returnNumber: string;
  purchaseId: string;
  supplierId: string;
  invoiceNo: string;
  supplierName: string;
  returnDate: string;
  reason: string | null;
  items: { productId: string; quantity: number; unitPrice: number }[];
};

type Props =
  | { mode: "add"; invoices: PurchaseInvoiceOption[]; suppliers: Supplier[]; existing?: never }
  | { mode: "edit"; existing: ExistingReturn; invoices?: never; suppliers?: never };

export function ReturnForm(props: Props) {
  const { mode } = props;
  const isEdit = mode === "edit";

  const [supplierId, setSupplierId] = useState(isEdit ? props.existing.supplierId : "");
  const [purchaseId, setPurchaseId] = useState(isEdit ? props.existing.purchaseId : "");
  const [returnDate, setReturnDate] = useState(isEdit ? props.existing.returnDate : format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState(isEdit ? props.existing.reason ?? "" : "");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const invoicesForSupplier = !isEdit
    ? (supplierId ? props.invoices.filter((i) => i.supplierId === supplierId) : props.invoices)
    : [];

  async function loadItems(forPurchaseId: string) {
    setLoadingItems(true);
    try {
      const returnable = await getPurchaseItemsForReturn(forPurchaseId, isEdit ? props.existing.id : undefined);
      if (isEdit) {
        const qtyByProduct = new Map(props.existing.items.map((i) => [i.productId, i]));
        setItems(returnable.map((r) => {
          const existingItem = qtyByProduct.get(r.productId);
          return {
            ...r,
            unitPrice: existingItem?.unitPrice ?? r.unitPrice,
            maxReturnable: r.maxReturnable + (existingItem?.quantity ?? 0),
            selectedQty: existingItem?.quantity ?? 0,
          };
        }));
      } else {
        setItems(returnable.map((r) => ({ ...r, selectedQty: 0 })));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice items");
    } finally {
      setLoadingItems(false);
    }
  }

  // Load items once on mount for edit mode; on invoice change for add mode.
  if (isEdit && loadedFor !== props.existing.id) {
    setLoadedFor(props.existing.id);
    loadItems(props.existing.purchaseId);
  }

  function handleSupplierChange(id: string) {
    setSupplierId(id);
    setPurchaseId("");
    setItems([]);
  }

  function handlePurchaseChange(id: string) {
    setPurchaseId(id);
    setItems([]);
    loadItems(id);
  }

  function setQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((it) => it.productId === productId
        ? { ...it, selectedQty: Math.max(0, Math.min(qty, it.maxReturnable)) }
        : it
      )
    );
  }

  function lineAmounts(it: ItemRow) {
    const gross  = it.selectedQty * it.unitPrice;
    const vat    = gross * (it.vatPct / 100);
    const excise = gross * (it.excisePct / 100);
    return { gross, vat, excise, total: gross + vat + excise };
  }

  const selectedItems = items.filter((it) => it.selectedQty > 0);
  const totalAmount = selectedItems.reduce((s, it) => s + lineAmounts(it).total, 0);
  const totalVat    = selectedItems.reduce((s, it) => s + lineAmounts(it).vat, 0);
  const totalExcise = selectedItems.reduce((s, it) => s + lineAmounts(it).excise, 0);

  function handleSave() {
    if (!isEdit && (!supplierId || !purchaseId)) {
      toast.error("Select a vendor and invoice first");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Enter a quantity for at least one item");
      return;
    }
    const payloadItems = selectedItems.map((it) => ({
      productId: it.productId,
      quantity: it.selectedQty,
      unitPrice: it.unitPrice,
    }));

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateSupplierReturn(props.existing.id, {
            returnDate,
            reason: reason || undefined,
            items: payloadItems,
          });
          toast.success(`${props.existing.returnNumber} updated`);
        } else {
          await createSupplierReturn({
            purchaseId,
            supplierId,
            returnDate,
            reason: reason || undefined,
            items: payloadItems,
          });
          toast.success("Purchase return recorded");
        }
        router.push("/purchases/returns");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save return");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Return Date *</Label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <NepaliDateHint value={returnDate} />
        </div>

        {isEdit ? (
          <div className="space-y-1.5">
            <Label>Vendor / Invoice</Label>
            <p className="h-10 flex items-center text-sm text-muted-foreground">
              {props.existing.supplierName} · {props.existing.invoiceNo}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Vendor *</Label>
            <Select value={supplierId} onValueChange={(v) => v && handleSupplierChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor">
                  {props.suppliers.find((s) => s.id === supplierId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent searchable>
                {props.suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isEdit && (
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Invoice No. *</Label>
            <Select
              value={purchaseId}
              onValueChange={(v) => v && handlePurchaseChange(v)}
              disabled={invoicesForSupplier.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={supplierId ? "Select invoice" : "Select a vendor first"}>
                  {invoicesForSupplier.find((i) => i.id === purchaseId)?.invoiceNo}
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
        )}
      </div>

      {loadingItems && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
          Loading invoice items...
        </div>
      )}

      {!loadingItems && (isEdit || purchaseId) && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Product</TableHead>
                <TableHead numeric>Purchased</TableHead>
                <TableHead numeric>Already Returned</TableHead>
                <TableHead numeric className="w-32">Return Qty</TableHead>
                <TableHead numeric>VAT</TableHead>
                <TableHead numeric>Excise</TableHead>
                <TableHead numeric>Amount (Rs)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableEmptyRow colSpan={7} message="No returnable items on this invoice." />
              )}
              {items.map((it) => {
                const amounts = lineAmounts(it);
                return (
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
                        className="h-9 w-28 rounded border border-input bg-transparent px-2 text-right text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </TableCell>
                    <TableCell numeric className="text-sm text-blue-600">
                      {it.selectedQty > 0 && it.vatPct > 0 ? Rs(amounts.vat) : "—"}
                    </TableCell>
                    <TableCell numeric className="text-sm text-purple-600">
                      {it.selectedQty > 0 && it.excisePct > 0 ? Rs(amounts.excise) : "—"}
                    </TableCell>
                    <TableCell numeric className="text-sm font-medium">
                      {it.selectedQty > 0 ? Rs(amounts.total) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="flex flex-col items-end gap-0.5 text-sm rounded-lg border bg-card p-4">
          {totalVat > 0 && <div className="text-blue-600">VAT: Rs {Rs(totalVat)}</div>}
          {totalExcise > 0 && <div className="text-purple-600">Excise: Rs {Rs(totalExcise)}</div>}
          <div className="font-semibold text-base">Total: Rs {Rs(totalAmount)}</div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Optional — e.g. over-delivered, wrong item, damaged on arrival..."
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {isEdit && (
            <Link href={`/purchases/returns/${props.existing.id}/print`} target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
              <Printer className="h-4 w-4" />
              Print
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchases/returns" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
          <Button onClick={handleSave} disabled={isPending || loadingItems || selectedItems.length === 0}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Save Return"}
          </Button>
        </div>
      </div>
    </div>
  );
}
