"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncMissingProducts } from "../actions";

export function SyncProductsButton({ logId, missingCount }: { logId: string; missingCount: number }) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const { added } = await syncMissingProducts(logId);
      toast.success(`Added ${added} product${added !== 1 ? "s" : ""} to this log`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sync products");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSync} disabled={loading}>
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      Add {missingCount} missing product{missingCount !== 1 ? "s" : ""}
    </Button>
  );
}
