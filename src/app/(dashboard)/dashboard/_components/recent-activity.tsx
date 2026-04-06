"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SO_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",     cls: "bg-gray-100 text-gray-600" },
  CONFIRMED:      { label: "Confirmed", cls: "bg-blue-50 text-blue-700" },
  PARTIALLY_PAID: { label: "Partial",   cls: "bg-amber-50 text-amber-700" },
  PAID:           { label: "Paid",      cls: "bg-emerald-50 text-emerald-700" },
  CANCELLED:      { label: "Cancelled", cls: "bg-red-50 text-red-600" },
};

const PO_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:              { label: "Draft",     cls: "bg-gray-100 text-gray-600" },
  CONFIRMED:          { label: "Confirmed", cls: "bg-blue-50 text-blue-700" },
  PARTIALLY_RECEIVED: { label: "Partial",   cls: "bg-amber-50 text-amber-700" },
  RECEIVED:           { label: "Received",  cls: "bg-emerald-50 text-emerald-700" },
  CANCELLED:          { label: "Cancelled", cls: "bg-red-50 text-red-600" },
};

type RecentSO = {
  id: string; orderNumber: string; customerName: string;
  totalAmount: number; status: string; orderDate: string;
};
type RecentPO = {
  id: string; orderNumber: string; supplierName: string;
  totalAmount: number; status: string; orderDate: string;
};

function fmt(n: number) {
  return `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RecentActivity({ recentSales, recentPurchases }: { recentSales: RecentSO[]; recentPurchases: RecentPO[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

      {/* Sales */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Sales</CardTitle>
            <Link href="/sales" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No sales orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentSales.map((so) => {
                const badge = SO_BADGE[so.status] ?? { label: so.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <Link
                    key={so.id}
                    href={`/sales/${so.id}`}
                    className="flex items-center justify-between py-2.5 gap-4 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{so.orderNumber}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium truncate mt-0.5">{so.customerName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{fmt(so.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(so.orderDate), "dd MMM")}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchases */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Purchases</CardTitle>
            <Link href="/purchases" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No purchase orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentPurchases.map((po) => {
                const badge = PO_BADGE[po.status] ?? { label: po.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <Link
                    key={po.id}
                    href={`/purchases/${po.id}`}
                    className="flex items-center justify-between py-2.5 gap-4 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{po.orderNumber}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium truncate mt-0.5">{po.supplierName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{fmt(po.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(po.orderDate), "dd MMM")}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
