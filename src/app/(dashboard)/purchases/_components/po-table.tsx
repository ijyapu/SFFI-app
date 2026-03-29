"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { deletePurchaseOrder } from "../actions";

const STATUS_CONFIG = {
  DRAFT:              { label: "Draft",               className: "bg-gray-100 text-gray-700" },
  CONFIRMED:          { label: "Confirmed",           className: "bg-blue-100 text-blue-700" },
  PARTIALLY_RECEIVED: { label: "Partial",             className: "bg-amber-100 text-amber-700" },
  RECEIVED:           { label: "Received",            className: "bg-green-100 text-green-700" },
  CANCELLED:          { label: "Cancelled",           className: "bg-red-100 text-red-700" },
} as const;

type PO = {
  id: string;
  orderNumber: string;
  status: keyof typeof STATUS_CONFIG;
  supplierName: string;
  orderDate: string;
  totalAmount: number;
  amountPaid: number;
  itemCount: number;
};

export function PoTable({ orders }: { orders: PO[] }) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string, orderNumber: string) {
    try {
      await deletePurchaseOrder(id);
      toast.success(`${orderNumber} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete order");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by PO number or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total (Rs)</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search || statusFilter !== "all"
                    ? "No orders match your filters."
                    : "No purchase orders yet."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((po) => {
              const cfg = STATUS_CONFIG[po.status];
              const outstanding = po.totalAmount - po.amountPaid;
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-medium">{po.orderNumber}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(po.orderDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cfg.className}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {outstanding > 0.001 ? (
                      <span className="text-destructive font-medium">
                        {outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-green-600">Paid</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/purchases/${po.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      {po.status === "DRAFT" && (
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {po.orderNumber}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Draft orders with no payments can be deleted permanently.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(po.id, po.orderNumber)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {orders.length} orders
      </p>
    </div>
  );
}
