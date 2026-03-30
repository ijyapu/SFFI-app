"use client";

import { useState } from "react";
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
import { SupplierForm } from "./supplier-form";
import { deleteSupplier } from "../../actions";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  pan: string | null;
  _count: { purchases: number };
};

export function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName ?? "").toLowerCase().includes(search.toLowerCase())
  );

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
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button onClick={() => { setEditSupplier(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Supplier
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search ? "No suppliers match your search." : "No suppliers yet."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => (
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
