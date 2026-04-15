"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Phone, Mail } from "lucide-react";
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
import { SupplierForm } from "./supplier-form";
import { deleteSupplier } from "../../purchases/actions";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  pan: string | null;
  openingBalance: number;
  _count: { purchases: number };
};

export function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const { sortKey, sortDir, toggle } = useSortable("name");

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVals: Record<string, string | number> = { name: a.name, contactName: a.contactName ?? "", orders: a._count.purchases };
      const bVals: Record<string, string | number> = { name: b.name, contactName: b.contactName ?? "", orders: b._count.purchases };
      return compareValues(aVals[sortKey], bVals[sortKey], sortDir);
    });
  }, [filtered, sortKey, sortDir]);

  async function handleDelete(id: string, name: string) {
    try {
      await deleteSupplier(id);
      toast.success(`"${name}" removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete supplier");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button onClick={() => { setEditSupplier(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Vendor
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {(() => { const sp = { sortKey, sortDir, toggle }; return (
            <TableRow>
              <TableHead><SortButton col="name"        label="Vendor" {...sp} /></TableHead>
              <TableHead><SortButton col="contactName" label="Contact"  {...sp} /></TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead className="text-right"><SortButton col="orders" label="Orders" {...sp} className="justify-end" /></TableHead>
              <TableHead className="w-20" />
            </TableRow>
            ); })()}
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search ? "No vendors match your search." : "No vendors yet."}
                </TableCell>
              </TableRow>
            )}
            {sorted.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  {s.address && (
                    <div className="text-xs text-muted-foreground truncate max-w-48">{s.address}</div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.contactName ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-sm">
                    {s.email && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {s.email}
                      </span>
                    )}
                    {s.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </span>
                    )}
                    {!s.email && !s.phone && "—"}
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {s._count.purchases}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditSupplier(s); setFormOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove &quot;{s.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The supplier will be soft-deleted. Existing purchase orders will be preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id, s.name)}>
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

      <SupplierForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSupplier(null); }}
        supplier={editSupplier}
      />
    </div>
  );
}
