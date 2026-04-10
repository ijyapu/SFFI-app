"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { recordVendorPayment, type OutstandingInvoice } from "../actions";

const METHODS = [
  { value: "CASH",          label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE",         label: "Cheque" },
  { value: "ESEWA",         label: "eSewa" },
  { value: "KHALTI",        label: "Khalti" },
  { value: "IME_PAY",       label: "IME Pay" },
  { value: "FONEPAY",       label: "FonePay" },
  { value: "OTHER",         label: "Other" },
];

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Auto-FIFO: fill oldest invoices first up to paymentTotal
function autoAllocate(invoices: OutstandingInvoice[], paymentTotal: number) {
  const result: Record<string, string> = {};
  let remaining = paymentTotal;
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, inv.outstanding);
    result[inv.purchaseId] = apply.toFixed(2);
    remaining -= apply;
  }
  return result;
}

export function RecordPaymentButton({
  supplierId,
  supplierName,
  outstandingBalance,
  outstandingInvoices,
}: {
  supplierId:          string;
  supplierName:        string;
  outstandingBalance:  number;
  outstandingInvoices: OutstandingInvoice[];
}) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showAlloc, setShowAlloc] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Form state
  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes,     setNotes]     = useState("");
  const [paidAt,    setPaidAt]    = useState(today);
  // Per-invoice allocation amounts (as strings for input)
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  function onOpen() {
    setAmount("");
    setMethod("CASH");
    setReference("");
    setNotes("");
    setPaidAt(today);
    setAllocations({});
    setReceiptUrl(null);
    setShowAlloc(true);
    setOpen(true);
  }

  // When amount changes, auto-FIFO allocate
  useEffect(() => {
    const total = parseFloat(amount);
    if (!isNaN(total) && total > 0 && outstandingInvoices.length > 0) {
      setAllocations(autoAllocate(outstandingInvoices, total));
    } else {
      setAllocations({});
    }
  }, [amount, outstandingInvoices]);

  function setAlloc(purchaseId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [purchaseId]: val }));
  }

  const totalAmount    = parseFloat(amount) || 0;
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const unallocated    = totalAmount - totalAllocated;

  async function onSubmit() {
    if (totalAmount <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    if (totalAllocated > totalAmount + 0.005) {
      toast.error("Allocated amount exceeds total payment");
      return;
    }

    const allocList = Object.entries(allocations)
      .map(([purchaseId, v]) => ({ purchaseId, amount: parseFloat(v) || 0 }))
      .filter((a) => a.amount > 0.005);

    setSaving(true);
    try {
      await recordVendorPayment({
        supplierId,
        amount:      totalAmount,
        method,
        reference:   reference || undefined,
        notes:       notes || undefined,
        receiptUrl:  receiptUrl || undefined,
        paidAt,
        allocations: allocList,
      });
      toast.success(`Rs ${fmt(totalAmount)} payment recorded`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={onOpen} size="sm" className="gap-1.5">
        <PlusCircle className="h-4 w-4" />
        Record Payment
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment — {supplierName}</DialogTitle>
            {outstandingBalance > 0.005 && (
              <p className="text-sm text-muted-foreground">
                Total outstanding:{" "}
                <span className="font-semibold text-destructive">Rs {fmt(outstandingBalance)}</span>
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Amount (Rs) *</label>
                <Input
                  type="number" min={0} step="0.01" placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Payment Date *</label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>

            {/* Method */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Method *</label>
              <Select value={method} onValueChange={(v) => setMethod(v ?? "CASH")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Reference <span className="text-muted-foreground text-xs">(optional — cheque no., bank ref.)</span>
              </label>
              <Input
                placeholder="e.g. Cheque #1234, TXN-ABC"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g. Partial settlement for plastic + box credit"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Receipt photo */}
            <PhotoUpload
              value={receiptUrl}
              onChange={setReceiptUrl}
              label="Receipt / Proof of Payment (optional)"
            />

            {/* Invoice allocation */}
            {outstandingInvoices.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAlloc((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
                >
                  <span>
                    Allocate to invoices
                    {totalAllocated > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Rs {fmt(totalAllocated)} of Rs {fmt(totalAmount)} allocated
                      </span>
                    )}
                  </span>
                  {showAlloc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAlloc && (
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_auto_120px] gap-2 px-4 py-1.5 text-xs font-medium text-muted-foreground bg-muted/20">
                      <span>Invoice</span>
                      <span className="text-right">Outstanding</span>
                      <span className="text-right">Paying Now</span>
                    </div>
                    {outstandingInvoices.map((inv) => (
                      <div
                        key={inv.purchaseId}
                        className="grid grid-cols-[1fr_auto_120px] items-center gap-3 px-4 py-2"
                      >
                        <div>
                          <p className="text-sm font-mono font-medium">{inv.invoiceNo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(inv.date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-orange-600">Rs {fmt(inv.outstanding)}</p>
                          <p className="text-xs text-muted-foreground">of Rs {fmt(inv.totalCost)}</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={inv.outstanding}
                          step="0.01"
                          placeholder="0.00"
                          value={allocations[inv.purchaseId] ?? ""}
                          onChange={(e) => setAlloc(inv.purchaseId, e.target.value)}
                          className="h-8 text-sm text-right"
                        />
                      </div>
                    ))}

                    {/* Unallocated remainder */}
                    <div className="px-4 py-2.5 bg-muted/20 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Unallocated credit</span>
                      <Badge
                        variant="outline"
                        className={
                          unallocated < -0.005
                            ? "border-destructive text-destructive"
                            : unallocated > 0.005
                            ? "border-amber-400 text-amber-700"
                            : "border-emerald-500 text-emerald-700"
                        }
                      >
                        Rs {fmt(Math.abs(unallocated))}
                        {unallocated < -0.005 && " (over-allocated)"}
                        {unallocated > 0.005 && " (credit on account)"}
                        {Math.abs(unallocated) <= 0.005 && " (fully allocated)"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {outstandingInvoices.length === 0 && totalAmount > 0 && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                No outstanding invoices for this vendor. Payment will be recorded as a credit on account.
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving || totalAmount <= 0 || unallocated < -0.005}
            >
              {saving ? "Saving…" : `Record Rs ${totalAmount > 0 ? fmt(totalAmount) : "0.00"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
