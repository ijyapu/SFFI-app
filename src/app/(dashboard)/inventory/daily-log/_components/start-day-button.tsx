"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDailyLog } from "../actions";

type Props = { dateStr: string; productCount: number };

export function StartDayButton({ dateStr, productCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStart() {
    startTransition(async () => {
      try {
        await startDailyLog(dateStr);
        toast.success("Daily log started. Opening stock snapshotted.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start log");
      }
    });
  }

  return (
    <Button onClick={handleStart} disabled={isPending}>
      <PlayCircle className="h-4 w-4" />
      {isPending ? "Starting..." : `Start Day (${productCount} products)`}
    </Button>
  );
}
