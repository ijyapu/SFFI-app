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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toNepaliDateString } from "@/lib/nepali-date";
import { PhotoUpload } from "@/components/ui/photo-upload";
import {
  updateVendorPayment, deleteVendorPayment, getInvoiceOptionsForPayment,
} from "../actions";
import type { OutstandingInvoice, LedgerEntry } from "../actions";

const METHODS = [
  { value: "CASH",          label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHECK",         label: "Cheque" },
  { value: "ESEWA",         label: "eSewa" },
  { value: "KHALTI",        label: "Khalti" },
  { value: "IME_PAY",       label: "IME Pay" },
  { value: "FONEPAY",       label: "FonePay" },
  { value: "OTHER",         label: "Other" },
];

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Payment = NonNullable<LedgerEntry["vendorPayment"]>;

export function EditPaymentDialog({
  open,
  onClose,
  supplierId,
  payment,
}: {
  open:       boolean;
  onClose:    () => void;
  supplierId: string;
  payment:    Payment | null;
}) {
  const router = useRouter();
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAlloc, setShowAlloc] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [invoiceOptions, setInvoiceOptions] = useState<OutstandingInvoice[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes,     setNotes]     = useState("");
  const [paidAt,    setPaidAt]    = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  // Load form state + invoice options whenever a payment is opened for editing.
  // Invoice options exclude THIS payment's own allocations from "already used",
  // so re-adjusting its allocation doesn't look like it's competing with itself.
  useEffect(() => {
    if (!open || !payment) return;
    setAmount(payment.amount.toString());
    setMethod(payment.method);
    setReference(payment.reference ?? "");
    setNotes(payment.notes ?? "");
    setPaidAt(payment.paidAt.slice(0, 10));
    setReceiptUrl(payment.receiptUrl);
    setShowAlloc(true);

    const allocMap: Record<string, string> = {};
    for (const a of payment.allocations) allocMap[a.purchaseId] = a.amount.toFixed(2);
    setAllocations(allocMap);

    setLoadingOptions(true);
    getInvoiceOptionsForPayment(supplierId, payment.id)
      .then(setInvoiceOptions)
      .catch(() => toast.error("Failed to load outstanding invoices"))
      .finally(() => setLoadingOptions(false));
  }, [open, payment, supplierId]);

  function setAlloc(purchaseId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [purchaseId]: val }));
  }

  const totalAmount    = parseFloat(amount) || 0;
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const unallocated    = totalAmount - totalAllocated;

  async function onSubmit() {
    if (!payment) return;
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
      await updateVendorPayment(payment.id, {
        amount:      totalAmount,
        method,
        reference:   reference || undefined,
        notes:       notes || undefined,
        receiptUrl:  receiptUrl || undefined,
        paidAt,
        allocations: allocList,
      });
      toast.success("Payment updated");
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update payment");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!payment) return;
    setDeleting(true);
    try {
      await deleteVendorPayment(payment.id);
      toast.success("Payment deleted");
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete payment");
      setDeleting(false);
    }
  }

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount + Date */}
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
              {paidAt && (
                <p className="text-xs text-muted-foreground">{toNepaliDateString(new Date(`${paidAt}T12:00:00`))}</p>
              )}
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
          {loadingOptions && (
            <p className="text-sm text-muted-foreground">Loading outstanding invoices…</p>
          )}

          {!loadingOptions && invoiceOptions.length > 0 && (
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
                  {invoiceOptions.map((inv) => (
                    <div
                      key={inv.purchaseId}
                      className="grid grid-cols-[1fr_auto_120px] items-center gap-3 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm font-mono font-medium">{inv.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="block">{toNepaliDateString(new Date(inv.date))}</span>
                          <span className="text-[10px] text-muted-foreground/60">{format(new Date(inv.date), "dd MMM yyyy")}</span>
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
        </div>

        <DialogFooter className="mt-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
                  disabled={saving || deleting}
                />
              }
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the Rs {fmt(payment.amount)} payment and free up whatever
                  it was allocated to. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving || deleting || totalAmount <= 0 || unallocated < -0.005}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
