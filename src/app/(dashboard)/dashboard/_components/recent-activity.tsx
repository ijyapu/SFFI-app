"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DateDisplay } from "@/components/ui/date-display";
import { ERPSection } from "@/components/ui/erp-section";
import { formatAmount } from "@/lib/format";

const SO_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  CONFIRMED:      { label: "Confirmed", cls: "bg-slate-100 text-slate-700" },
  PARTIALLY_PAID: { label: "Partial",   cls: "bg-amber-100 text-amber-700" },
  PAID:           { label: "Paid",      cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED:      { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

const PO_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:              { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  CONFIRMED:          { label: "Confirmed", cls: "bg-slate-100 text-slate-700" },
  PARTIALLY_RECEIVED: { label: "Partial",   cls: "bg-amber-100 text-amber-700" },
  RECEIVED:           { label: "Received",  cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED:          { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

type RecentSO = {
  id: string; orderNumber: string; salesmanName: string;
  totalAmount: number; status: string; orderDate: string;
};
type RecentPO = {
  id: string; orderNumber: string; supplierName: string;
  totalAmount: number; status: string; orderDate: string;
};

export function RecentActivity({ recentSales, recentPurchases }: { recentSales: RecentSO[]; recentPurchases: RecentPO[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

      <ERPSection header={
        <>
          <p className="text-sm font-semibold">Recent Sales</p>
          <Link href="/sales" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </>
      }>
        <div className="px-4 divide-y divide-border">
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No sales orders yet.</p>
          ) : (
            recentSales.map((so) => {
              const badge = SO_BADGE[so.status] ?? { label: so.status, cls: "bg-muted text-muted-foreground" };
              return (
                <Link
                  key={so.id}
                  href={`/sales/${so.id}`}
                  className="flex items-center justify-between py-2.5 gap-4 hover:bg-muted/30 -mx-4 px-4 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{so.orderNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-sm font-medium truncate mt-0.5">{so.salesmanName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{formatAmount(so.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground"><DateDisplay date={so.orderDate} fmt="dd MMM" nepali="day-month" /></div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ERPSection>

      <ERPSection header={
        <>
          <p className="text-sm font-semibold">Recent Purchases</p>
          <Link href="/purchases" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </>
      }>
        <div className="px-4 divide-y divide-border">
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No purchase orders yet.</p>
          ) : (
            recentPurchases.map((po) => {
              const badge = PO_BADGE[po.status] ?? { label: po.status, cls: "bg-muted text-muted-foreground" };
              return (
                <Link
                  key={po.id}
                  href={`/purchases/${po.id}`}
                  className="flex items-center justify-between py-2.5 gap-4 hover:bg-muted/30 -mx-4 px-4 transition-colors"
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
                    <div className="text-sm font-semibold tabular-nums">{formatAmount(po.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground"><DateDisplay date={po.orderDate} fmt="dd MMM" nepali="day-month" /></div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ERPSection>

    </div>
  );
}
