"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { correctDailyLogEntry } from "../actions";

type Props = {
  logId: string;
  productId: string;
  productName: string;
  producedQty: number;
  usedQty: number;
  wasteQty: number;
  damagedQty: number;
};

export function CorrectEntryDialog({ logId, productId, productName, producedQty, usedQty, wasteQty, damagedQty }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ producedQty, usedQty, wasteQty, damagedQty });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    if (next) setValues({ producedQty, usedQty, wasteQty, damagedQty });
    setOpen(next);
  }

  function field(key: keyof typeof values, label: string, colorCls: string) {
    return (
      <div className="space-y-1">
        <Label className={colorCls}>{label}</Label>
        <input
          type="number"
          step="0.001"
          min="0"
          value={values[key] === 0 ? "" : values[key]}
          onChange={(e) => setValues((v) => ({ ...v, [key]: parseFloat(e.target.value) || 0 }))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
    );
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await correctDailyLogEntry(logId, productId, values);
        toast.success(`"${productName}" corrected — stock and closing figures updated.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to correct entry");
      }
    });
  }

  const unchanged =
    values.producedQty === producedQty && values.usedQty === usedQty &&
    values.wasteQty === wasteQty && values.damagedQty === damagedQty;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Correct this entry"
      >
        <Wrench className="h-3 w-3" />
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Entry — {productName}</DialogTitle>
            <DialogDescription>
              This day is already closed. Only the difference between the old and new numbers is
              applied to stock — not the full day&apos;s amount — so this stays safe even if most
              of that stock has since been sold or used elsewhere.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {field("producedQty", "Produced", "text-emerald-700")}
            {field("usedQty", "Used", "text-orange-600")}
            {field("wasteQty", "Waste", "text-rose-600")}
            {field("damagedQty", "Damaged", "text-rose-600")}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || unchanged}>
              {isPending ? "Saving..." : "Save Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
