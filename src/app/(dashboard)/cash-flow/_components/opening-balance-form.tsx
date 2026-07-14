"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = {
  label?: string;
  current: number;
  canEdit: boolean;
  onSave: (amount: number) => Promise<void>;
};

export function OpeningBalanceForm({ label = "Seed opening balance", current, canEdit, onSave }: Props) {
  const [editing, setEditing]   = useState(false);
  const [value, setValue]       = useState(current.toFixed(2));
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid non-negative amount.");
      return;
    }
    startTransition(async () => {
      try {
        await onSave(amount);
        toast.success("Opening balance updated.");
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleCancel() {
    setValue(current.toFixed(2));
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">{label}:</span>
      {editing ? (
        <>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Rs</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={value === "0" ? "" : value}
              onChange={(e) => setValue(e.target.value)}
              className="h-7 w-36 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            />
          </div>
          <Button size="icon-sm" variant="ghost" onClick={handleSave} disabled={pending}>
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleCancel} disabled={pending}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm font-semibold tabular-nums">
            Rs {current.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          {canEdit && (
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} title="Edit opening balance">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
