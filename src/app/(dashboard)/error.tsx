"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    // Client-side capture — adds user + route context Sentry's server-side
    // captureRequestError (in instrumentation.ts) may not have.
    Sentry.captureException(error, {
      extra: {
        digest:    error.digest,
        route:     pathname,
        userId:    user?.id,
        timestamp: new Date().toISOString(),
      },
    });

    // Structured log visible in browser devtools for developers.
    // In production, error.message / error.stack are intentionally empty for
    // server component errors — only the digest is available client-side.
    console.error("[ERP] Dashboard page error", {
      digest:    error.digest,
      route:     pathname,
      userId:    user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [error, pathname, user?.id]);

  return <ErrorDisplay error={error} reset={reset} />;
}
