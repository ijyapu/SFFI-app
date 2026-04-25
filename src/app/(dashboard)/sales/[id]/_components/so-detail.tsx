"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DateDisplay } from "@/components/ui/date-display";
import {
  CheckCircle, XCircle, CreditCard, Loader2, Pencil,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SortButton } from "@/components/ui/sort-icon";
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { SoPaymentForm }    from "./so-payment-form";
import { ReturnFormInline } from "./return-form-inline";
import { confirmSalesOrder, cancelSalesOrder } from "../../actions";

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",           className: "bg-gray-100 text-gray-700" },
  CONFIRMED:      { label: "Confirmed",       className: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: { label: "Partial Payment", className: "bg-amber-100 text-amber-700" },
  PAID:           { label: "Paid",            className: "bg-green-100 text-green-700" },
  CANCELLED:      { label: "Cancelled",       className: "bg-red-100 text-red-700" },
} as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHECK: "Cheque", OTHER: "Other",
};

type SoItem = {
  id: string;
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paidAt: string;
};

type ReturnItem = {
  id: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type SalesReturn = {
  id: string;
  returnNumber: string;
  returnType: "WASTE" | "FRESH";
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  items: ReturnItem[];
};

type Product = { id: string; name: string; unitName: string };

type Props = {
  id: string;
  orderNumber: string;
  status: keyof typeof STATUS_CONFIG;
  customerName: string;
  orderDate: string;
  dueDate: string | null;
  notes: string | null;
  subtotal: number;
  totalAmount: number;
  commissionPct: number;
  commissionAmount: number;
  factoryAmount: number;
  amountPaid: number;
  items: SoItem[];
  payments: Payment[];
  returns: SalesReturn[];
  products: Product[];
  salesmanTotalOutstanding: number;
};

export function SoDetail(props: Props) {
  const {
    id, orderNumber, status, customerName, orderDate, dueDate,
    notes, totalAmount, commissionPct, commissionAmount, factoryAmount,
    amountPaid, items, payments, returns, products, salesmanTotalOutstanding,
  } = props;

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const { sortKey, sortDir, toggle }  = useSortable("productName");

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const aVals: Record<string, string | number> = { productName: a.productName, quantity: a.quantity, unitPrice: a.unitPrice, totalPrice: a.totalPrice };
      const bVals: Record<string, string | number> = { productName: b.productName, quantity: b.quantity, unitPrice: b.unitPrice, totalPrice: b.totalPrice };
      return compareValues(aVals[sortKey], bVals[sortKey], sortDir);
    });
  }, [items, sortKey, sortDir]);

  const wasteReturns  = returns.filter((r) => r.returnType !== "FRESH");
  const freshReturns  = returns.filter((r) => r.returnType === "FRESH");
  const totalReturns  = returns.reduce((sum, r) => sum + r.totalAmount, 0);
  const netAmount     = totalAmount - totalReturns;
  const outstanding   = factoryAmount - amountPaid;
  const cfg = STATUS_CONFIG[status];

  // Whether return recording is allowed (any active confirmed order)
  const canRecordReturn = status === "CONFIRMED" || status === "PARTIALLY_PAID" || status === "PAID";

  async function handleConfirm() {
    setConfirming(true);
    try {
      await confirmSalesOrder(id);
      toast.success("Order confirmed — stock deducted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm order");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this sales order?")) return;
    setCancelling(true);
    try {
      await cancelSalesOrder(id);
      toast.success("Order cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={`${cfg.className} text-sm px-3 py-1`}>
            {cfg.label}
          </Badge>
          <span className="text-muted-foreground text-sm">
            <DateDisplay date={orderDate} />
          </span>
          {dueDate && (
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              · Due <DateDisplay date={dueDate} />
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {status !== "CANCELLED" && (
            <Link
              href={`/sales/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Pencil className="h-4 w-4" />
              Edit Order
            </Link>
          )}
          {status === "DRAFT" && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirm &amp; Dispatch
              </Button>
            </>
          )}
          {!["DRAFT", "CANCELLED"].includes(status) && salesmanTotalOutstanding > 0.001 && (
            <Button onClick={() => setPaymentOpen(true)}>
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items + order info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salesman</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono">{orderNumber}</span>
              </div>
              {notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-right">{notes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                {(() => { const sp = { sortKey, sortDir, toggle }; return (
                <TableRow>
                  <TableHead><SortButton col="productName" label="Product"    {...sp} /></TableHead>
                  <TableHead numeric><SortButton col="quantity"   label="Qty"        {...sp} className="justify-end" /></TableHead>
                  <TableHead numeric><SortButton col="unitPrice"  label="Unit Price" {...sp} className="justify-end" /></TableHead>
                  <TableHead numeric><SortButton col="totalPrice" label="Total"      {...sp} className="justify-end" /></TableHead>
                </TableRow>
                ); })()}
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.unitName}</div>
                    </TableCell>
                    <TableCell numeric>
                      {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      Rs {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell numeric className="font-medium">
                      Rs {item.totalPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Taken</span>
                <span>Rs {totalAmount.toFixed(2)}</span>
              </div>

              {totalReturns > 0.001 && (
                <div className="flex justify-between text-orange-600">
                  <span>Returns Deducted</span>
                  <span>− Rs {totalReturns.toFixed(2)}</span>
                </div>
              )}

              {totalReturns > 0.001 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-muted-foreground">
                    <span>Net Amount</span>
                    <span>Rs {netAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-amber-600">
                <span className="flex items-center gap-1">
                  Commission
                  <span className="text-xs bg-amber-100 text-amber-700 rounded px-1 py-0.5 font-mono">
                    {netAmount.toFixed(2)} × {commissionPct}%
                  </span>
                </span>
                <span>− Rs {commissionAmount.toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Factory Amount</span>
                <span>Rs {factoryAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Collected</span>
                <span>Rs {amountPaid.toFixed(2)}</span>
              </div>
              {outstanding > 0.001 && (
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Outstanding</span>
                  <span>Rs {outstanding.toFixed(2)}</span>
                </div>
              )}
              {outstanding <= 0.001 && amountPaid > 0 && (
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Fully collected
                </div>
              )}
            </CardContent>
          </Card>

          {payments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Rs {p.amount.toFixed(2)}</span>
                      <span className="text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <DateDisplay date={p.paidAt} />
                      {p.reference && ` · ${p.reference}`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {returns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Returns from Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {returns.map((r) => {
                  const isFresh = r.returnType === "FRESH";
                  return (
                    <div key={r.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium">{r.returnNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isFresh ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {isFresh ? "Fresh" : "Waste"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <DateDisplay date={r.createdAt} />
                        {r.notes && ` · ${r.notes}`}
                      </div>
                      <div className="rounded border divide-y text-xs">
                        {r.items.map((i) => (
                          <div key={i.id} className="flex justify-between px-2 py-1">
                            <span>{i.productName} <span className="text-muted-foreground">({i.unitName})</span></span>
                            <span className="tabular-nums">×{i.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} = Rs {i.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">{isFresh ? "Restocked & deducted" : "Total deducted"}</span>
                        <span>Rs {r.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Return forms — always visible for active orders */}
      {canRecordReturn && (
        <div className="space-y-4">
          <ReturnFormInline
            soId={id}
            products={products}
            previousReturns={wasteReturns}
            returnType="WASTE"
          />
          <ReturnFormInline
            soId={id}
            products={products}
            previousReturns={freshReturns}
            returnType="FRESH"
          />
        </div>
      )}

      <SoPaymentForm
        soId={id}
        factoryAmount={factoryAmount}
        outstanding={outstanding}
        salesmanTotalOutstanding={salesmanTotalOutstanding}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
      />
    </div>
  );
}
