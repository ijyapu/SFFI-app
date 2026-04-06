
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { processSalesReturn } from "../../actions";

type SoItem = {
  id: string;
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
};

type Props = {
  soId: string;
  items: SoItem[];
  open: boolean;
  onClose: () => void;
};

type FieldErrors = {
  items?: string;
  quantities?: Record<string, string>;
  reason?: string;
};

export function ReturnForm({ soId, items, open, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(items.map((i) => [i.productId, 0]))
  );
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<FieldErrors>({});

  function validate() {
    const qtyErrors: Record<string, string> = {};
    let hasAny = false;

    for (const item of items) {
      const val = quantities[item.productId] ?? 0;
      if (val < 0) {
        qtyErrors[item.productId] = "Cannot be negative";
      } else if (val > item.quantity) {
        qtyErrors[item.productId] = `Max ${item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${item.unitName}`;
      } else if (val > 0) {
        hasAny = true;
      }
    }

    const next: FieldErrors = {};
    if (Object.keys(qtyErrors).length > 0) next.quantities = qtyErrors;
    if (!hasAny && Object.keys(qtyErrors).length === 0) {
      next.items = "Enter at least one quantity to return";
    }
    if (!reason.trim()) next.reason = "Reason is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const returnItems = items
      .filter((i) => (quantities[i.productId] ?? 0) > 0)
      .map((i) => ({
        productId: i.productId,
        quantity:  quantities[i.productId] ?? 0,
        unitPrice: i.unitPrice,
      }));

    setLoading(true);
    try {
      await processSalesReturn(soId, { reason: reason.trim(), items: returnItems });
      toast.success("Return processed and stock restored");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process return");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Process Sales Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Returned items will be added back to inventory stock.
          </p>

          <div className="rounded-lg border divide-y">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
              <span>Product</span>
              <span className="text-right">Sold</span>
              <span className="text-right">Returning</span>
            </div>
            {items.map((item) => {
              const qtyError = errors.quantities?.[item.productId];
              return (
                <div key={item.id}>
                  <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-3 py-2 items-center">
                    <div>
                      <div className="text-sm font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.unitName}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </div>
                    <Input
                      className={`h-8 text-sm text-right ${qtyError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      type="number"
                      min="0"
                      max={item.quantity}
                      step="0.001"
                      value={quantities[item.productId] ?? 0}
                      onChange={(e) => {
                        setQuantities((prev) => ({ ...prev, [item.productId]: parseFloat(e.target.value) || 0 }));
                        if (errors.quantities?.[item.productId]) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (next.quantities) {
                              const q = { ...next.quantities };
                              delete q[item.productId];
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
            <Label className={`text-sm ${errors.reason ? "text-destructive" : ""}`}>
              Reason *
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }));
              }}
              rows={2}
              placeholder="e.g. Customer rejected delivery, damaged goods, wrong product..."
              className={errors.reason ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processing..." : "Process Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
