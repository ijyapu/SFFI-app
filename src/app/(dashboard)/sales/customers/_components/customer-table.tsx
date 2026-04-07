"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Phone, Mail, ShoppingBag } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SortButton } from "@/components/ui/sort-icon";
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { CustomerForm } from "./customer-form";
import { deleteCustomer } from "../../actions";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  pan: string | null;
  openingBalance: number;
  _count: { salesOrders: number };
};

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const [search, setSearch]           = useState("");
  const [formOpen, setFormOpen]       = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const { sortKey, sortDir, toggle }  = useSortable("name");

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVals: Record<string, string | number> = { name: a.name, email: a.email ?? "", orders: a._count.salesOrders };
      const bVals: Record<string, string | number> = { name: b.name, email: b.email ?? "", orders: b._count.salesOrders };
      return compareValues(aVals[sortKey], bVals[sortKey], sortDir);
    });
  }, [filtered, sortKey, sortDir]);

  async function handleDelete(id: string, name: string) {
    try {
      await deleteCustomer(id);
      toast.success(`"${name}" removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete customer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button onClick={() => { setEditCustomer(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {(() => { const sp = { sortKey, sortDir, toggle }; return (
            <TableRow>
              <TableHead><SortButton col="name"   label="Customer" {...sp} /></TableHead>
              <TableHead><SortButton col="email"  label="Contact"  {...sp} /></TableHead>
              <TableHead className="text-right"><SortButton col="orders" label="Orders" {...sp} className="justify-end" /></TableHead>
              <TableHead className="w-20" />
            </TableRow>
            ); })()}
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  {search ? "No customers match your search." : "No customers yet."}
                </TableCell>
              </TableRow>
            )}
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  {c.address && (
                    <div className="text-xs text-muted-foreground truncate max-w-48">{c.address}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-sm">
                    {c.email && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />{c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />{c.phone}
                      </span>
                    )}
                    {!c.email && !c.phone && "—"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="flex items-center justify-end gap-1 text-muted-foreground">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {c._count.salesOrders}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditCustomer(c); setFormOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove &quot;{c.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The customer will be soft-deleted. Existing orders will be preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id, c.name)}>
                            Remove
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

      <CustomerForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditCustomer(null); }}
        customer={editCustomer}
      />
    </div>
  );
}
