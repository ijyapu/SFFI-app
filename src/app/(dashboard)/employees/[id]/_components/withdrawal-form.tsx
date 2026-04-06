
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod/v4";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { createWithdrawal } from "../../actions";

const schema = z.object({
  amount:      z.number({ error: "Amount is required" }).positive("Must be greater than 0"),
  takenAt:     z.string().min(1, "Date is required"),
  filedBy:     z.string().optional(),
  givenBy:     z.string().optional(),
  paymentMode: z.enum(["CASH", "ONLINE"]),
  notes:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: string;
  employeeName: string;
  monthlySalary: number;
  open: boolean;
  onClose: () => void;
}

export function WithdrawalForm({ employeeId, employeeName, monthlySalary, open, onClose }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:      undefined,
      takenAt:     format(new Date(), "yyyy-MM-dd"),
      filedBy:     user?.fullName ?? "",
      givenBy:     "",
      paymentMode: "CASH",
      notes:       "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createWithdrawal(employeeId, {
        ...values,
        photoUrl: photoUrl ?? undefined,
      });
      toast.success("Deduction recorded");
      form.reset({
        amount:      undefined,
        takenAt:     format(new Date(), "yyyy-MM-dd"),
        filedBy:     user?.fullName ?? "",
        givenBy:     "",
        paymentMode: "CASH",
        notes:       "",
      });
      setPhotoUrl(null);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record deduction");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Deduction</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {employeeName} · Monthly salary: Rs {monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rs) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="takenAt"
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

            {/* Filed by + Given by */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="filedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filed by</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Who is recording this" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="givenBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Given by</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Who gave the money" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment mode */}
            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment mode *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {(["CASH", "ONLINE"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => field.onChange(mode)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            field.value === mode
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {mode === "CASH" ? "Cash" : "Online"}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes (optional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Purpose, advance request, remarks…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo (optional) */}
            <PhotoUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              label="Proof photo (optional)"
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Record Deduction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
