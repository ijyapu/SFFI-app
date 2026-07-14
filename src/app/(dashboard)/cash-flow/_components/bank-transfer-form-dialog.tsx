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
import { bankTransferSchema, type BankTransferFormValues } from "@/lib/validators/bank-transfer";
import { createBankTransfer, updateBankTransfer } from "../bank-transfer-actions";

const DIRECTION_LABELS: Record<string, string> = {
  DEPOSIT:    "Deposit to Bank",
  WITHDRAWAL: "Withdraw from Bank",
};

type Props = {
  mode: "create";
} | {
  mode: "edit";
  transfer: {
    id: string;
    direction: string;
    amount: number;
    reference: string | null;
    notes: string | null;
    photoUrl: string | null | undefined;
    transactedAt: string;
  };
};

export function BankTransferFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = props.mode === "edit";
  const today  = new Date().toISOString().split("T")[0];

  const form = useForm<BankTransferFormValues>({
    resolver: zodResolver(bankTransferSchema),
    defaultValues: isEdit
      ? {
          direction:    props.transfer.direction as BankTransferFormValues["direction"],
          amount:       props.transfer.amount,
          reference:    props.transfer.reference ?? "",
          notes:        props.transfer.notes ?? "",
          photoUrl:     props.transfer.photoUrl ?? null,
          transactedAt: props.transfer.transactedAt.split("T")[0],
        }
      : {
          direction:    "DEPOSIT",
          amount:       0,
          reference:    "",
          notes:        "",
          photoUrl:     null,
          transactedAt: today,
        },
  });

  async function onSubmit(values: BankTransferFormValues) {
    try {
      if (isEdit) {
        await updateBankTransfer(props.transfer.id, values);
        toast.success("Transfer updated");
      } else {
        await createBankTransfer(values);
        toast.success("Transfer recorded");
        form.reset({ direction: "DEPOSIT", amount: 0, reference: "", notes: "", photoUrl: null, transactedAt: today });
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
        <DialogTrigger render={<Button />}>
          <Plus className="h-4 w-4" />
          Record Transfer
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Bank Transfer" : "Record Bank Transfer"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                name="transactedAt"
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

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Deposit slip no, bank ref…" {...field} />
                  </FormControl>
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
                      label="Deposit Slip Photo (optional)"
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
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Record Transfer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
