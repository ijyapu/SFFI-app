"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salesmanPaymentSchema, type SalesmanPaymentValues } from "@/lib/validators/sales";
import { recordSalesmanPayment, updateSalesmanPayment } from "../../actions";

export type ExistingPayment = {
  id:        string;
  amount:    number;
  method:    string;
  paidAt:    string; // ISO string
  reference: string | null;
  notes:     string | null;
};

type Props = {
  soId:                     string;
  factoryAmount:            number;
  outstanding:              number;
  salesmanTotalOutstanding: number;
  open:                     boolean;
  onClose:                  () => void;
  editPayment?:             ExistingPayment;
};

const METHOD_LABELS = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  ESEWA:         "eSewa",
  KHALTI:        "Khalti",
  IME_PAY:       "IME Pay",
  FONEPAY:       "fonePay",
  CHECK:         "Cheque",
  OTHER:         "Other",
};

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function SoPaymentForm({
  soId, factoryAmount, outstanding, salesmanTotalOutstanding, open, onClose, editPayment,
}: Props) {
  const isEdit       = !!editPayment;
  const previousDebt = salesmanTotalOutstanding - outstanding;

  const form = useForm<SalesmanPaymentValues>({
    resolver: zodResolver(salesmanPaymentSchema),
    defaultValues: {
      amount:    0,
      method:    "CASH",
      paidAt:    todayStr(),
      reference: "",
      notes:     "",
    },
  });

  // Populate edit values whenever the dialog opens with a payment to edit
  useEffect(() => {
    if (open && editPayment) {
      form.reset({
        amount:    editPayment.amount,
        method:    editPayment.method as SalesmanPaymentValues["method"],
        paidAt:    editPayment.paidAt.slice(0, 10),
        reference: editPayment.reference ?? "",
        notes:     editPayment.notes ?? "",
      });
    } else if (open && !editPayment) {
      form.reset({
        amount:    0,
        method:    "CASH",
        paidAt:    todayStr(),
        reference: "",
        notes:     "",
      });
    }
  }, [open, editPayment, form]);

  const watchAmount = form.watch("amount") || 0;

  // In edit mode: outstanding = current total − (new amount − old amount swapped in)
  // salesmanTotalOutstanding already has editPayment.amount counted as paid,
  // so after the edit the delta is (watchAmount − editPayment.amount).
  const closingBalance = isEdit
    ? salesmanTotalOutstanding + editPayment.amount - watchAmount
    : salesmanTotalOutstanding - watchAmount;

  async function onSubmit(values: SalesmanPaymentValues) {
    try {
      if (isEdit) {
        await updateSalesmanPayment(editPayment.id, values);
        toast.success("Payment updated");
      } else {
        await recordSalesmanPayment(soId, values);
        toast.success(`Payment of Rs ${values.amount.toFixed(2)} recorded`);
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payment" : "Record Payment"}</DialogTitle>
        </DialogHeader>

        {/* Balance breakdown */}
        <div className="rounded-md bg-muted/40 p-3 space-y-1.5 text-sm -mt-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">This order (factory amount)</span>
            <span>Rs {factoryAmount.toFixed(2)}</span>
          </div>
          {outstanding > 0.001 && (
            <div className="flex justify-between text-destructive">
              <span>Remaining on this order</span>
              <span>Rs {outstanding.toFixed(2)}</span>
            </div>
          )}
          {previousDebt > 0.001 && (
            <div className="flex justify-between text-amber-600">
              <span>Previous debt</span>
              <span>Rs {previousDebt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-0.5 text-destructive">
            <span>Total outstanding</span>
            <span>Rs {salesmanTotalOutstanding.toFixed(2)}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount paid (Rs) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min="0" step="0.01"
                      value={field.value || ""}
                      onChange={(e) => { const n = parseFloat(e.target.value); field.onChange(isNaN(n) ? 0 : n); }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Running balance preview */}
            <div className="rounded-md border px-3 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Balance after {isEdit ? "edit" : "payment"}</span>
              <span className={closingBalance > 0.005 ? "font-semibold text-amber-600" : "font-semibold text-green-600"}>
                Rs {Math.max(0, closingBalance).toFixed(2)} {closingBalance > 0.005 ? "owed" : "settled"}
              </span>
            </div>

            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date money was received *</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayStr()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {METHOD_LABELS[field.value as keyof typeof METHOD_LABELS]}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(METHOD_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl><Input {...field} placeholder="Optional" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} rows={2} placeholder="Optional" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
