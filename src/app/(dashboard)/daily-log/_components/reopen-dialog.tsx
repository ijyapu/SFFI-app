"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { reopenDailyLog } from "../actions";

type Props = { logId: string; dateLabel: string };

export function ReopenDialog({ logId, dateLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleReopen() {
    startTransition(async () => {
      try {
        await reopenDailyLog(logId);
        toast.success(`Log for ${dateLabel} reopened. Stock movements reversed.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reopen log");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reopen
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Daily Log — {dateLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This unlocks the log so you can correct produced, used, waste, or damaged quantities,
              then close it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>Stock movements from closing are reversed</li>
            <li><strong>Manually entered values are preserved</strong> — produced, used, waste, damaged</li>
            <li>Sold and fresh-return quantities are re-synced live from sales orders</li>
            <li>You must re-close the day to re-apply movements to inventory</li>
          </ul>
          <p className="text-sm font-medium text-amber-700">
            Closing the day again will re-apply all movements. Re-close promptly to keep stock accurate.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopen}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Reopening..." : "Yes, Reopen Log"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
