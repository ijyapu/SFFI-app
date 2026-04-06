"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createUnit, deleteUnit } from "../actions";

type Props = {
  open: boolean;
  onClose: () => void;
  units: { id: string; name: string }[];
};

export function UnitDialog({ open, onClose, units }: Props) {
  const [pending, setPending]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [value, setValue]       = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await createUnit(value.trim());
      toast.success(`Unit "${value.trim()}" added`);
      setValue("");
      inputRef.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    setPending(id);
    try {
      await deleteUnit(id);
      toast.success(`Unit "${name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Units</DialogTitle>
        </DialogHeader>

        {/* Add new unit */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="e.g. kg, pcs, litre, box…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="icon" onClick={handleAdd} disabled={saving || !value.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Existing units */}
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No units yet. Add one above.
          </p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <span>{unit.name}</span>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button variant="ghost" size="icon-sm" disabled={pending === unit.id} />}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete &quot;{unit.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You cannot delete a unit that is assigned to active products.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(unit.id, unit.name)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
