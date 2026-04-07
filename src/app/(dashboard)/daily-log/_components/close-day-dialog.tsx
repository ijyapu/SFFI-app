"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
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
import { closeDailyLog } from "../actions";

type Props = { logId: string; dateLabel: string };

export function CloseDayDialog({ logId, dateLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    startTransition(async () => {
      try {
        await closeDailyLog(logId);
        toast.success(`Daily log for ${dateLabel} closed. Inventory updated.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to close log");
      }
    });
  }

  return (
    <>
      <Button variant="default" onClick={() => setOpen(true)}>
        <Lock className="h-4 w-4" />
        Close Day
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Daily Log — {dateLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will apply all recorded activity to live inventory.
          </AlertDialogDescription>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>Produced quantities will be added to stock</li>
            <li>Used, sold, waste, and damaged quantities will be deducted</li>
            <li>Purchases are already in inventory and will not be re-applied</li>
          </ul>
          <p className="text-sm font-medium text-foreground">
            The log will be locked and cannot be edited after closing.
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} disabled={isPending}>
            {isPending ? "Closing..." : "Yes, Close Day"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
