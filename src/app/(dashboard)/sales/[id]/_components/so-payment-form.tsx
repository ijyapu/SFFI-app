
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
import { recordSalesmanPayment } from "../../actions";

type Props = {
  soId: string;
  factoryAmount: number;
  outstanding: number;
  salesmanTotalOutstanding: number;
  open: boolean;
  onClose: () => void;
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

export function SoPaymentForm({ soId, factoryAmount, outstanding, salesmanTotalOutstanding, open, onClose }: Props) {
  const previousDebt = salesmanTotalOutstanding - outstanding;

  const form = useForm<SalesmanPaymentValues>({
    resolver: zodResolver(salesmanPaymentSchema),
    defaultValues: {
      amount:    Math.max(outstanding, 0),
      method:    "CASH",
      reference: "",
      notes:     "",
    },
  });

  async function onSubmit(values: SalesmanPaymentValues) {
    try {
      await recordSalesmanPayment(soId, values);
      toast.success(`Payment of Rs ${values.amount.toFixed(2)} recorded`);
      form.reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
  }

  const watchAmount = form.watch("amount") || 0;
  const closingBalance = salesmanTotalOutstanding - watchAmount;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
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
                  <FormLabel>Amount paid now (Rs) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={salesmanTotalOutstanding}
                      value={field.value || ""}
                      onChange={(e) => { const n = parseFloat(e.target.value); field.onChange(isNaN(n) ? 0 : n); }}
                    />
                  </FormControl>
                  {watchAmount > outstanding + 0.001 && (
                    <p className="text-xs text-amber-600">
                      Rs {(watchAmount - outstanding).toFixed(2)} will reduce previous debt
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Closing balance preview */}
            <div className="rounded-md border px-3 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Closing balance after payment</span>
              <span className={closingBalance > 0.005 ? "font-semibold text-amber-600" : "font-semibold text-green-600"}>
                Rs {closingBalance.toFixed(2)} {closingBalance > 0.005 ? "owed" : "settled"}
              </span>
            </div>
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
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Optional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
