"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Wallet } from "lucide-react";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createSoSchema, type CreateSoValues } from "@/lib/validators/sales";
import { createSalesOrder } from "../../actions";

type Salesman = { id: string; name: string; commissionPct: number; outstanding: number };
type Product  = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  currentStock: number;
  unit: { name: string };
};

type WasteLine = { key: number; productId: string; quantity: number | ""; unitPrice: number | "" };

type Props = {
  salesmen: Salesman[];
  products:  Product[];
};

export function SoForm({ salesmen, products }: Props) {
  const router = useRouter();
  const wasteKeyRef = useRef(0);

  // Waste return state (independent from react-hook-form)
  const [wasteLines, setWasteLines] = useState<WasteLine[]>([]);
  const [wasteNotes, setWasteNotes] = useState("");

  // Payment state — defaults to factory amount, user can lower it for partial payment
  const [amountPaid, setAmountPaid] = useState(0);
  const paymentTouchedRef = useRef(false);

  const form = useForm<CreateSoValues>({
    resolver: zodResolver(createSoSchema),
    defaultValues: {
      customerId: "",
      dueDate:    "",
      notes:      "",
      items:      [{ productId: "", quantity: 1, unitPrice: 0 }],
      amountPaid: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems      = form.watch("items");
  const watchSalesmanId = form.watch("customerId");

  const subtotal         = watchItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const wasteTotal       = wasteLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const selectedSalesman = salesmen.find((c) => c.id === watchSalesmanId);
  const commissionPct    = selectedSalesman?.commissionPct ?? 25;
  const netAmount        = subtotal - wasteTotal;
  const commissionAmount = Math.round(netAmount * commissionPct) / 100;
  const factoryAmount    = netAmount - commissionAmount;

  // Keep amountPaid in sync with factoryAmount unless user has manually edited it
  useEffect(() => {
    if (!paymentTouchedRef.current) {
      setAmountPaid(factoryAmount);
    }
  }, [factoryAmount]);

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitPrice`, product.sellingPrice);
    }
  }

  function addWasteLine() {
    setWasteLines((prev) => [...prev, { key: wasteKeyRef.current++, productId: "", quantity: "", unitPrice: "" }]);
  }

  function removeWasteLine(key: number) {
    setWasteLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateWasteLine(key: number, patch: Partial<WasteLine>) {
    setWasteLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onSubmit(values: CreateSoValues) {
    const validWaste = wasteLines.filter(
      (l) => l.productId && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0
    );
    try {
      await createSalesOrder({
        ...values,
        amountPaid: Math.min(amountPaid, factoryAmount),
        returnItems: validWaste.length > 0
          ? validWaste.map((l) => ({
              productId: l.productId,
              quantity:  Number(l.quantity),
              unitPrice: Number(l.unitPrice),
            }))
          : undefined,
        returnNotes: wasteNotes.trim() || undefined,
      });
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
                <FormLabel>Salesman *</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select salesman">
                        {salesmen.find(c => c.id === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salesmen.map((c) => (
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

        {/* ── Order Items ── */}
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
                            <SelectTrigger className="h-10 w-full text-sm">
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

            {/* Summary footer */}
            <div className="px-3 py-2 bg-muted/30 space-y-1 text-sm">
              <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2">
                <div className="col-span-3 text-right text-muted-foreground">Total Taken</div>
                <div className="text-right font-semibold">Rs {subtotal.toFixed(2)}</div>
                <div />
              </div>
              {wasteTotal > 0.001 && (
                <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 text-orange-600">
                  <div className="col-span-3 text-right">Waste Deducted</div>
                  <div className="text-right">− Rs {wasteTotal.toFixed(2)}</div>
                  <div />
                </div>
              )}
              {subtotal > 0 && (
                <>
                  {wasteTotal > 0.001 && (
                    <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 text-muted-foreground">
                      <div className="col-span-3 text-right">Net Amount</div>
                      <div className="text-right">Rs {netAmount.toFixed(2)}</div>
                      <div />
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 text-amber-600">
                    <div className="col-span-3 text-right">Commission ({commissionPct}%)</div>
                    <div className="text-right">Rs {commissionAmount.toFixed(2)}</div>
                    <div />
                  </div>
                  <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 text-green-700 font-semibold">
                    <div className="col-span-3 text-right">Factory Amount</div>
                    <div className="text-right">Rs {factoryAmount.toFixed(2)}</div>
                    <div />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Waste Return ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              <h3 className="font-medium text-sm">Waste Return</h3>
              <span className="text-xs text-muted-foreground">(optional) — expired or damaged goods not restocked</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
              onClick={addWasteLine}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          <div className="rounded-lg border border-orange-200 divide-y bg-orange-50/20">
            <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-orange-100/40">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit Price (Rs)</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            {wasteLines.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground/50">
                No waste items — click &quot;Add Item&quot; to record returns
              </div>
            ) : (
              wasteLines.map((line) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2 px-3 py-2 items-start"
                  >
                    <Select
                      value={line.productId}
                      onValueChange={(v) => v && updateWasteLine(line.key, { productId: v })}
                    >
                      <SelectTrigger className="h-10 w-full text-sm">
                        <SelectValue placeholder="Select product">
                          {products.find((p) => p.id === line.productId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} label={p.name}>
                            {p.name}
                            <span className="ml-1 text-xs text-muted-foreground">({p.unit.name})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) => updateWasteLine(line.key, {
                        quantity: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.unitPrice}
                      onChange={(e) => updateWasteLine(line.key, {
                        unitPrice: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })}
                      className="h-8 text-sm"
                    />
                    <div className="text-right text-sm font-medium pt-1.5 text-orange-600">
                      {lineTotal > 0 ? lineTotal.toFixed(2) : <span className="text-muted-foreground/30">—</span>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mt-0.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeWasteLine(line.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}

            {wasteLines.length > 0 && wasteTotal > 0.001 && (
              <div className="px-3 py-2 bg-orange-100/40 text-sm">
                <div className="grid grid-cols-[1fr_110px_110px_80px_32px] gap-2">
                  <div className="col-span-3 text-right text-orange-700 font-medium">Total Waste Deducted</div>
                  <div className="text-right font-bold text-orange-700">Rs {wasteTotal.toFixed(2)}</div>
                  <div />
                </div>
              </div>
            )}
          </div>

          {wasteLines.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Waste Notes (optional)</Label>
              <Textarea
                value={wasteNotes}
                onChange={(e) => setWasteNotes(e.target.value)}
                rows={2}
                placeholder="e.g. expired, damaged packaging..."
                className="text-sm resize-none"
              />
            </div>
          )}
        </div>

        {/* ── Payment ── */}
        {selectedSalesman && factoryAmount > 0 && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Payment Received</h3>
            </div>

            {selectedSalesman.outstanding !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current outstanding balance</span>
                <span className={selectedSalesman.outstanding > 0 ? "font-medium text-amber-600" : "font-medium text-green-600"}>
                  Rs {Math.abs(selectedSalesman.outstanding).toFixed(2)}
                  {selectedSalesman.outstanding > 0 ? " owed" : " credit"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Amount paid now (Rs)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid === 0 ? "" : amountPaid}
                  onChange={(e) => {
                    paymentTouchedRef.current = true;
                    setAmountPaid(parseFloat(e.target.value) || 0);
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="pt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    paymentTouchedRef.current = false;
                    setAmountPaid(factoryAmount);
                  }}
                >
                  Full amount
                </Button>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">This order (factory amount)</span>
                <span>Rs {factoryAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid now</span>
                <span className="text-green-600">− Rs {Math.min(amountPaid, factoryAmount).toFixed(2)}</span>
              </div>
              {selectedSalesman.outstanding > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Previous balance</span>
                  <span className="text-amber-600">+ Rs {selectedSalesman.outstanding.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-semibold border-t pt-1 mt-1">
                <span>Closing balance</span>
                {(() => {
                  const closing = selectedSalesman.outstanding + factoryAmount - Math.min(amountPaid, factoryAmount);
                  return (
                    <span className={closing > 0.005 ? "text-amber-600" : "text-green-600"}>
                      Rs {closing.toFixed(2)} {closing > 0.005 ? "owed" : "settled"}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create Sales Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
