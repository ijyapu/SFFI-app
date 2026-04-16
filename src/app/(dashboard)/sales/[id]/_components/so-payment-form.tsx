
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

export function SoPaymentForm({ soId, factoryAmount, outstanding, open, onClose }: Props) {
  const form = useForm<SalesmanPaymentValues>({
    resolver: zodResolver(salesmanPaymentSchema),
    defaultValues: {
      amount:    outstanding,
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground -mt-2 space-y-0.5">
          <p>Factory amount: <span className="font-medium text-foreground">Rs {factoryAmount.toFixed(2)}</span></p>
          <p>Outstanding: <span className="font-medium text-destructive">Rs {outstanding.toFixed(2)}</span></p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (Rs) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={outstanding}
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
