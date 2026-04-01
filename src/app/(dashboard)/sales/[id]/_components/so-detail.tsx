"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CheckCircle, XCircle, CreditCard, RotateCcw, Loader2,
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
import { SoPaymentForm } from "./so-payment-form";
import { ReturnForm }    from "./return-form";
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
  amountPaid: number;
  items: SoItem[];
  payments: Payment[];
};

export function SoDetail(props: Props) {
  const {
    id, orderNumber, status, customerName, orderDate, dueDate,
    notes, subtotal, totalAmount, amountPaid, items, payments,
  } = props;

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnOpen,  setReturnOpen]  = useState(false);
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

  const outstanding = totalAmount - amountPaid;
  const cfg = STATUS_CONFIG[status];

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
            {format(new Date(orderDate), "dd MMM yyyy")}
          </span>
          {dueDate && (
            <span className="text-muted-foreground text-sm">
              · Due {format(new Date(dueDate), "dd MMM yyyy")}
            </span>
          )}
        </div>

        <div className="flex gap-2">
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
          {(status === "CONFIRMED" || status === "PARTIALLY_PAID") && (
            <>
              <Button variant="outline" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Process Return
              </Button>
              {outstanding > 0.001 && (
                <Button onClick={() => setPaymentOpen(true)}>
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </Button>
              )}
            </>
          )}
          {status === "PAID" && (
            <Button variant="outline" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Process Return
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
                <span className="text-muted-foreground">Customer</span>
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
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>Rs {totalAmount.toFixed(2)}</span>
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
                      {format(new Date(p.paidAt), "dd MMM yyyy")}
                      {p.reference && ` · ${p.reference}`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SoPaymentForm
        soId={id}
        outstanding={outstanding}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
      />
      <ReturnForm
        soId={id}
        items={items}
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
      />
    </div>
  );
}
