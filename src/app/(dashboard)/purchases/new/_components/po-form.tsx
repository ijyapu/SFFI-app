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
import { createPoSchema, type CreatePoValues } from "@/lib/validators/purchase";
import { createPurchaseOrder } from "../../actions";

type Supplier = { id: string; name: string };
type Product  = { id: string; name: string; sku: string; costPrice: number; unit: { name: string } };

type Props = {
  suppliers: Supplier[];
  products:  Product[];
};

export function PoForm({ suppliers, products }: Props) {
  const router = useRouter();

  const form = useForm<CreatePoValues>({
    resolver: zodResolver(createPoSchema),
    defaultValues: {
      supplierId:   "",
      expectedDate: "",
      notes:        "",
      items:        [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");

  const subtotal = watchItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0),
    0
  );

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitCost`, product.costPrice);
    }
  }

  async function onSubmit(values: CreatePoValues) {
    try {
      await createPurchaseOrder(values);
      toast.success("Purchase order created");
      router.push("/purchases");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier *</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Delivery</FormLabel>
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} placeholder="Optional notes for this order..." />
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
              onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {form.formState.errors.items?.root && (
            <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
          )}
          {form.formState.errors.items?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
          )}

          <div className="rounded-lg border divide-y">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit Cost (Rs)</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            {fields.map((field, index) => {
              const qty  = watchItems[index]?.quantity || 0;
              const cost = watchItems[index]?.unitCost || 0;
              const lineTotal = qty * cost;
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
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                                <span className="ml-1 text-muted-foreground text-xs">({p.sku})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduct && (
                          <p className="text-xs text-muted-foreground pt-0.5">
                            {selectedProduct.unit.name}
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
                            value={f.value}
                            onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitCost`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            className="h-8 text-sm"
                            type="number"
                            min="0"
                            step="0.01"
                            value={f.value}
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

            {/* Subtotal row */}
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

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchases")}
          >
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
