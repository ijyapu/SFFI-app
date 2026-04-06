"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSoSchema, type CreateSoValues } from "@/lib/validators/sales";
import { createSalesOrder } from "../../actions";

type Customer = { id: string; name: string };
type Product  = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  currentStock: number;
  unit: { name: string };
};

type Props = {
  customers: Customer[];
  products:  Product[];
};

export function SoForm({ customers, products }: Props) {
  const router = useRouter();

  const form = useForm<CreateSoValues>({
    resolver: zodResolver(createSoSchema),
    defaultValues: {
      customerId: "",
      dueDate:    "",
      notes:      "",
      items:      [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");

  const subtotal = watchItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0),
    0
  );

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitPrice`, product.sellingPrice);
    }
  }

  async function onSubmit(values: CreateSoValues) {
    try {
      await createSalesOrder(values);
      toast.success("Sales order created");
      router.push("/sales");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer *</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer">
                        {customers.find(c => c.id === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
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
                <Textarea {...field} rows={2} placeholder="Optional order notes..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Line items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Order Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {form.formState.errors.items?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
          )}

          <div className="rounded-lg border divide-y">
            <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit Price (Rs)</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            {fields.map((field, index) => {
              const qty   = watchItems[index]?.quantity || 0;
              const price = watchItems[index]?.unitPrice || 0;
              const lineTotal = qty * price;
              const selectedProduct = products.find(
                (p) => p.id === watchItems[index]?.productId
              );

              return (
                <div key={field.id} className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 items-start">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <Select
                          value={f.value}
                          onValueChange={(v) => v && handleProductChange(index, v)}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select product">
                                {products.find(p => p.id === f.value)?.name}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id} label={p.name}>
                                {p.name}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({p.currentStock.toLocaleString(undefined, { maximumFractionDigits: 3 })} {p.unit.name})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduct && (
                          <p className="text-xs text-muted-foreground pt-0.5">
                            {selectedProduct.currentStock <= 0
                              ? <span className="text-destructive">Out of stock</span>
                              : `${selectedProduct.currentStock.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${selectedProduct.unit.name} available`
                            }
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            className="h-8 text-sm"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={f.value === 0 ? "" : f.value}
                            onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            className="h-8 text-sm"
                            type="number"
                            min="0"
                            step="0.01"
                            value={f.value === 0 ? "" : f.value}
                            onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-right text-sm font-medium pt-1.5">
                    {lineTotal.toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mt-0.5"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}

            <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 bg-muted/30">
              <div className="col-span-3 text-right text-sm font-medium text-muted-foreground">
                Subtotal
              </div>
              <div className="text-right text-sm font-semibold">
                Rs {subtotal.toFixed(2)}
              </div>
              <div />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create Draft Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
