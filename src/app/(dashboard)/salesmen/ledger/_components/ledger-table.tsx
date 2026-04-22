import { format } from "date-fns";
import { toNepaliDateString } from "@/lib/nepali-date";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { CustomerLedgerEntry } from "../actions";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function LedgerTable({
  entries,
  openingBalance,
  closingBalance,
  from,
  to,
}: {
  entries: CustomerLedgerEntry[];
  openingBalance: number;
  closingBalance: number;
  from: string;
  to: string;
}) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Date</TableHead>
            <TableHead className="w-32">Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead numeric className="w-32">Invoice (Rs)</TableHead>
            <TableHead numeric className="w-32">Received (Rs)</TableHead>
            <TableHead numeric className="w-32">Balance (Rs)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Opening balance row */}
          <TableRow className="bg-amber-50/50 dark:bg-amber-950/10 font-medium">
            <TableCell className="text-xs">
              <div>{format(new Date(from), "dd MMM yyyy")}</div>
              <div className="text-muted-foreground/60 text-[10px]">{toNepaliDateString(new Date(from))}</div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">—</TableCell>
            <TableCell className="text-sm font-semibold">Opening Balance</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">Opening</Badge>
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell numeric className={`font-bold ${openingBalance > 0.005 ? "text-blue-600" : "text-emerald-600"}`}>
              {fmt(openingBalance)}
            </TableCell>
          </TableRow>

          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No transactions in this period
              </TableCell>
            </TableRow>
          )}

          {entries.map((e) => (
            <TableRow
              key={e.id}
              className={
                e.type === "INVOICE"
                  ? "hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
                  : e.type === "COMMISSION"
                  ? "hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                  : e.type === "RETURN"
                  ? "hover:bg-orange-50/30 dark:hover:bg-orange-950/10"
                  : "hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10"
              }
            >
              <TableCell className="text-xs">
                <div>{format(new Date(e.date), "dd MMM yyyy")}</div>
                <div className="text-muted-foreground/60 text-[10px]">{toNepaliDateString(new Date(e.date))}</div>
              </TableCell>
              <TableCell className="text-xs font-mono">
                {e.salesOrderId ? (
                  <a
                    href={`/sales/${e.salesOrderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {e.reference}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  e.reference
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.description}</TableCell>
              <TableCell>
                {e.type === "INVOICE" && (
                  <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30">
                    Invoice
                  </Badge>
                )}
                {e.type === "COMMISSION" && (
                  <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    Commission
                  </Badge>
                )}
                {e.type === "PAYMENT" && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
                    Payment
                  </Badge>
                )}
                {e.type === "RETURN" && (
                  <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-950/30">
                    Return
                  </Badge>
                )}
              </TableCell>
              <TableCell numeric className="tabular-nums text-sm">
                {e.invoiceAmount > 0 ? fmt(e.invoiceAmount) : "—"}
              </TableCell>
              <TableCell numeric className={`tabular-nums text-sm ${e.type === "COMMISSION" ? "text-amber-600" : "text-emerald-700"}`}>
                {e.paymentAmount > 0 ? fmt(e.paymentAmount) : "—"}
              </TableCell>
              <TableCell numeric className={`tabular-nums text-sm font-medium ${e.balance > 0.005 ? "text-blue-600" : e.balance < -0.005 ? "text-orange-600" : "text-emerald-600"}`}>
                {fmt(e.balance)}
              </TableCell>
            </TableRow>
          ))}

          {/* Closing balance row */}
          <TableRow className={`font-semibold ${closingBalance > 0.005 ? "bg-blue-50/50 dark:bg-blue-950/10" : "bg-emerald-50/50 dark:bg-emerald-950/10"}`}>
            <TableCell className="text-xs">
              <div>{format(new Date(to), "dd MMM yyyy")}</div>
              <div className="text-muted-foreground/60 text-[10px]">{toNepaliDateString(new Date(to))}</div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">—</TableCell>
            <TableCell className="text-sm font-bold">Closing Balance</TableCell>
            <TableCell>
              <Badge variant="outline" className={`text-[10px] ${closingBalance > 0.005 ? "border-blue-400 text-blue-700 bg-blue-50" : "border-emerald-500 text-emerald-700 bg-emerald-50"}`}>
                Closing
              </Badge>
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell numeric className={`font-bold text-base ${closingBalance > 0.005 ? "text-blue-600" : "text-emerald-600"}`}>
              {fmt(closingBalance)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
