
import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { receiveGoods } from "../../actions";

type PoItem = {
  id: string;
  productName: string;
  unitName: string;
  quantity: number;
  receivedQty: number;
  unitCost: number;
};

type Props = {
  poId: string;
  items: PoItem[];
  open: boolean;
  onClose: () => void;
};

type FieldErrors = {
  items?: string;
  quantities?: Record<string, string>;
};

export function ReceiveForm({ poId, items, open, onClose }: Props) {
  const pending = items.filter((i) => Number(i.quantity) > Number(i.receivedQty));

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      pending.map((i) => [i.id, Number(i.quantity) - Number(i.receivedQty)])
    )
  );
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<FieldErrors>({});

  function validate() {
    const qtyErrors: Record<string, string> = {};
    let hasAny = false;

    for (const item of pending) {
      const remaining = Number(item.quantity) - Number(item.receivedQty);
      const val = quantities[item.id] ?? 0;
      if (val < 0) {
        qtyErrors[item.id] = "Cannot be negative";
      } else if (val > remaining) {
        qtyErrors[item.id] = `Max ${remaining.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${item.unitName}`;
      } else if (val > 0) {
        hasAny = true;
      }
    }

    const next: FieldErrors = {};
    if (Object.keys(qtyErrors).length > 0) next.quantities = qtyErrors;
    if (!hasAny && Object.keys(qtyErrors).length === 0) {
      next.items = "Enter at least one quantity to receive";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const receiveItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, receiveQty]) => ({ itemId, receiveQty }));

    setLoading(true);
    try {
      await receiveGoods(poId, { items: receiveItems, notes: notes || undefined });
      toast.success("Goods received and stock updated");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to receive goods");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Receive Goods
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter quantities received. Stock will be updated immediately.
          </p>

          <div className="rounded-lg border divide-y">
            <div className="grid grid-cols-[1fr_100px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
              <span>Product</span>
              <span className="text-right">Remaining</span>
              <span className="text-right">Receiving</span>
            </div>
            {pending.map((item) => {
              const remaining = Number(item.quantity) - Number(item.receivedQty);
              const qtyError  = errors.quantities?.[item.id];
              return (
                <div key={item.id}>
                  <div className="grid grid-cols-[1fr_100px_80px] gap-2 px-3 py-2 items-center">
                    <div>
                      <div className="text-sm font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.unitName}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {remaining.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </div>
                    <Input
                      className={`h-8 text-sm text-right ${qtyError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      type="number"
                      min="0"
                      max={remaining}
                      step="0.001"
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => {
                        setQuantities((prev) => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }));
                        if (errors.quantities?.[item.id]) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (next.quantities) {
                              const q = { ...next.quantities };
                              delete q[item.id];
                              next.quantities = Object.keys(q).length ? q : undefined;
                            }
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {qtyError && (
                    <p className="px-3 pb-1.5 text-xs text-destructive">{qtyError}</p>
                  )}
                </div>
              );
            })}
          </div>

          {errors.items && (
            <p className="text-xs text-destructive">{errors.items}</p>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery note, batch number, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating Stock..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
