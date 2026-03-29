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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { deleteSalesOrder } from "../actions";

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",           className: "bg-gray-100 text-gray-700" },
  CONFIRMED:      { label: "Confirmed",       className: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID: { label: "Partial",         className: "bg-amber-100 text-amber-700" },
  PAID:           { label: "Paid",            className: "bg-green-100 text-green-700" },
  CANCELLED:      { label: "Cancelled",       className: "bg-red-100 text-red-700" },
} as const;

type SO = {
  id: string;
  orderNumber: string;
  status: keyof typeof STATUS_CONFIG;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  amountPaid: number;
};

export function SoTable({ orders }: { orders: SO[] }) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string, orderNumber: string) {
    try {
      await deleteSalesOrder(id);
      toast.success(`${orderNumber} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete order");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by SO number or customer..."
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
              <TableHead>SO Number</TableHead>
              <TableHead>Customer</TableHead>
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
                    : "No sales orders yet."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((so) => {
              const cfg = STATUS_CONFIG[so.status];
              const outstanding = so.totalAmount - so.amountPaid;
              return (
                <TableRow key={so.id}>
                  <TableCell className="font-mono font-medium">{so.orderNumber}</TableCell>
                  <TableCell>{so.customerName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(so.orderDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cfg.className}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {so.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {outstanding > 0.001 ? (
                      <span className="text-destructive font-medium">
                        {outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-green-600">Collected</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/sales/${so.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      {(so.status === "DRAFT" || so.status === "CANCELLED") && (
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {so.orderNumber}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Only draft or cancelled orders with no payments can be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(so.id, so.orderNumber)}>
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
