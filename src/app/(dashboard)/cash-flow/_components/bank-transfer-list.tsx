"use client";

import { useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, ImageIcon, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
import { formatAmount } from "@/lib/format";
import { BankTransferFormDialog } from "./bank-transfer-form-dialog";
import { deleteBankTransfer } from "../bank-transfer-actions";
import type { BankTransferEntry } from "../actions";

const DIRECTION_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
};

const DIRECTION_COLORS: Record<string, string> = {
  DEPOSIT: "bg-emerald-100 text-emerald-700",
  WITHDRAWAL: "bg-amber-100 text-amber-700",
};

export function BankTransferList({ transfers }: { transfers: BankTransferEntry[] }) {
  const { sortKey, sortDir, toggle } = useSortable("transactedAt");

  const sorted = useMemo(() => {
    return [...transfers].sort((a, b) => compareValues(
      a[sortKey as keyof BankTransferEntry] ?? "",
      b[sortKey as keyof BankTransferEntry] ?? "",
      sortDir
    ));
  }, [transfers, sortKey, sortDir]);

  async function handleDelete(id: string) {
    try {
      await deleteBankTransfer(id);
      toast.success("Transfer deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const sp = { sortKey, sortDir, toggle };

  if (transfers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No bank transfers recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortButton col="direction" label="Direction" {...sp} /></TableHead>
            <TableHead><SortButton col="bankName" label="Bank" {...sp} /></TableHead>
            <TableHead numeric><SortButton col="amount" label="Amount (Rs)" {...sp} className="justify-end" /></TableHead>
            <TableHead>Reference</TableHead>
            <TableHead><SortButton col="transactedAt" label="Date" {...sp} /></TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Photo</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Badge variant="secondary" className={`text-xs gap-1 ${DIRECTION_COLORS[t.direction]}`}>
                  {t.direction === "DEPOSIT"
                    ? <ArrowDownToLine className="h-3 w-3" />
                    : <ArrowUpFromLine className="h-3 w-3" />}
                  {DIRECTION_LABELS[t.direction]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{t.bankName ?? "—"}</TableCell>
              <TableCell numeric className="font-semibold">
                {formatAmount(t.amount)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{t.reference ?? "—"}</TableCell>
              <TableCell className="text-sm">
                <DateDisplay date={t.transactedAt} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-45 truncate">
                {t.notes ?? "—"}
              </TableCell>
              <TableCell>
                {t.photoUrl ? (
                  <a href={t.photoUrl} target="_blank" rel="noopener noreferrer" title="View photo">
                    <Image
                      src={t.photoUrl}
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
                  <BankTransferFormDialog mode="edit" transfer={t} />
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this {DIRECTION_LABELS[t.direction].toLowerCase()} of {formatAmount(t.amount)}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90 text-white"
                          onClick={() => handleDelete(t.id)}
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
