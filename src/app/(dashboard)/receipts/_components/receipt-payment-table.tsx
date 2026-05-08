"use client";

import { useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, ImageIcon } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SortButton } from "@/components/ui/sort-icon";
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { DateDisplay } from "@/components/ui/date-display";
import { ReceiptPaymentFormDialog } from "./receipt-payment-form-dialog";
import { deleteReceiptPayment } from "../actions";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHECK: "Cheque",
  ESEWA: "eSewa", KHALTI: "Khalti", IME_PAY: "IME Pay",
  FONEPAY: "FonePay", OTHER: "Other",
};

type Payment = {
  id:            string;
  paymentNumber: string;
  paidTo:        string;
  amount:        number;
  method:        string;
  reference:     string | null;
  notes:         string | null;
  photoUrl:      string | null | undefined;
  paidAt:        string;
};

export function ReceiptPaymentTable({ payments }: { payments: Payment[] }) {
  const { sortKey, sortDir, toggle } = useSortable("paidAt");

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) => compareValues(
      a[sortKey as keyof Payment] ?? "",
      b[sortKey as keyof Payment] ?? "",
      sortDir
    ));
  }, [payments, sortKey, sortDir]);

  async function handleDelete(id: string) {
    try {
      await deleteReceiptPayment(id);
      toast.success("Payment deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const sp = { sortKey, sortDir, toggle };

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortButton col="paymentNumber" label="Payment #" {...sp} /></TableHead>
            <TableHead><SortButton col="paidTo"        label="Paid To"   {...sp} /></TableHead>
            <TableHead numeric><SortButton col="amount" label="Amount (Rs)" {...sp} className="justify-end" /></TableHead>
            <TableHead><SortButton col="method"  label="Method" {...sp} /></TableHead>
            <TableHead>Reference</TableHead>
            <TableHead><SortButton col="paidAt"  label="Date"   {...sp} /></TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Photo</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs font-semibold">{p.paymentNumber}</TableCell>
              <TableCell className="font-medium">{p.paidTo}</TableCell>
              <TableCell numeric className="font-semibold text-red-600">
                Rs {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                  {METHOD_LABELS[p.method] ?? p.method}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{p.reference ?? "—"}</TableCell>
              <TableCell className="text-sm">
                <DateDisplay date={p.paidAt} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-45 truncate">
                {p.notes ?? "—"}
              </TableCell>
              <TableCell>
                {p.photoUrl ? (
                  <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" title="View photo">
                    <Image
                      src={p.photoUrl}
                      alt="Proof"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded object-cover border border-border hover:opacity-80 transition-opacity"
                    />
                  </a>
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <ReceiptPaymentFormDialog mode="edit" payment={p} />
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {p.paymentNumber} paid to {p.paidTo}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90 text-white"
                          onClick={() => handleDelete(p.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
