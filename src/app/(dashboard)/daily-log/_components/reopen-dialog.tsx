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
              This will reverse all stock movements applied when the day was closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>All produced / used / sold / waste movements will be undone</li>
            <li>All entered quantities will be reset to zero</li>
            <li>Staff will need to re-enter and close the day again</li>
          </ul>
          <p className="text-sm font-medium text-destructive">
            This action is irreversible. Use only to correct a mistaken close.
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
