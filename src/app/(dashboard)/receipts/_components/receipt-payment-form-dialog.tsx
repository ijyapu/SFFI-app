"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { receiptPaymentSchema, type ReceiptPaymentFormValues } from "@/lib/validators/receipts";
import { createReceiptPayment, updateReceiptPayment } from "../actions";

const METHOD_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHECK:         "Cheque",
  ESEWA:         "eSewa",
  KHALTI:        "Khalti",
  IME_PAY:       "IME Pay",
  FONEPAY:       "FonePay",
  OTHER:         "Other",
};

type Props = {
  mode: "create";
} | {
  mode: "edit";
  payment: {
    id:        string;
    paidTo:    string;
    amount:    number;
    method:    string;
    reference: string | null;
    notes:     string | null;
    photoUrl:  string | null | undefined;
    paidAt:    string;
  };
};

export function ReceiptPaymentFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = props.mode === "edit";

  const today = new Date().toISOString().split("T")[0]!;

  const form = useForm<ReceiptPaymentFormValues>({
    resolver: zodResolver(receiptPaymentSchema),
    defaultValues: isEdit
      ? {
          paidTo:    props.payment.paidTo,
          amount:    props.payment.amount,
          method:    props.payment.method as ReceiptPaymentFormValues["method"],
          reference: props.payment.reference ?? "",
          notes:     props.payment.notes ?? "",
          photoUrl:  props.payment.photoUrl ?? null,
          paidAt:    props.payment.paidAt.split("T")[0],
        }
      : {
          paidTo:    "",
          amount:    0,
          method:    "CASH",
          reference: "",
          notes:     "",
          photoUrl:  null,
          paidAt:    today,
        },
  });

  async function onSubmit(values: ReceiptPaymentFormValues) {
    try {
      if (isEdit) {
        await updateReceiptPayment(props.payment.id, values);
        toast.success("Payment updated");
      } else {
        await createReceiptPayment(values);
        toast.success("Payment recorded");
        form.reset({ paidTo: "", amount: 0, method: "CASH", reference: "", notes: "", photoUrl: null, paidAt: today });
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" />}>
          <Plus className="h-4 w-4" />
          Record Payment
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Payment" : "Record Payment Out"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="paidTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid To *</FormLabel>
                  <FormControl>
                    <Input placeholder="Person or company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rs) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    <FormControl>
                      <Input placeholder="Cheque no, txn ID…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional notes…" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhotoUpload
                      value={field.value ?? null}
                      onChange={field.onChange}
                      label="Proof Photo (optional)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
