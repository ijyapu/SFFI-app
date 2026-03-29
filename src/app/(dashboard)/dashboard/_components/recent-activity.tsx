"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ShoppingCart, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SO_STATUS = {
  DRAFT:          { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  CONFIRMED:      { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: { label: "Partial",   className: "bg-amber-100 text-amber-700" },
  PAID:           { label: "Paid",      className: "bg-green-100 text-green-700" },
  CANCELLED:      { label: "Cancelled", className: "bg-red-100 text-red-700" },
} as const;

const PO_STATUS = {
  DRAFT:              { label: "Draft",    className: "bg-gray-100 text-gray-700" },
  CONFIRMED:          { label: "Confirmed",className: "bg-blue-100 text-blue-700" },
  PARTIALLY_RECEIVED: { label: "Partial",  className: "bg-amber-100 text-amber-700" },
  RECEIVED:           { label: "Received", className: "bg-green-100 text-green-700" },
  CANCELLED:          { label: "Cancelled",className: "bg-red-100 text-red-700" },
} as const;

type RecentSO = {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: keyof typeof SO_STATUS;
  orderDate: string;
};

type RecentPO = {
  id: string;
  orderNumber: string;
  supplierName: string;
  totalAmount: number;
  status: keyof typeof PO_STATUS;
  orderDate: string;
};

export function RecentActivity({
  recentSales,
  recentPurchases,
}: {
  recentSales: RecentSO[];
  recentPurchases: RecentPO[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Recent Sales */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Recent Sales
          </h3>
          <Link href="/sales" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No sales orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recentSales.map((so) => {
              const cfg = SO_STATUS[so.status];
              return (
                <Link
                  key={so.id}
                  href={`/sales/${so.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{so.orderNumber}</span>
                      <Badge variant="secondary" className={`${cfg.className} text-xs`}>{cfg.label}</Badge>
                    </div>
                    <div className="text-sm font-medium truncate">{so.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(so.orderDate), "dd MMM yyyy")}
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0 ml-4">
                    Rs {so.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Purchases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Recent Purchases
          </h3>
          <Link href="/purchases" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {recentPurchases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No purchase orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recentPurchases.map((po) => {
              const cfg = PO_STATUS[po.status];
              return (
                <Link
                  key={po.id}
                  href={`/purchases/${po.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{po.orderNumber}</span>
                      <Badge variant="secondary" className={`${cfg.className} text-xs`}>{cfg.label}</Badge>
                    </div>
                    <div className="text-sm font-medium truncate">{po.supplierName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(po.orderDate), "dd MMM yyyy")}
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0 ml-4">
                    Rs {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
