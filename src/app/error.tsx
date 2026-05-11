"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    Sentry.captureException(error, {
      extra: {
        digest:    error.digest,
        route:     pathname,
        userId:    user?.id,
        timestamp: new Date().toISOString(),
      },
    });
    console.error("[ERP] Root page error", {
      digest:    error.digest,
      route:     pathname,
      userId:    user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [error, pathname, user?.id]);

  return <ErrorDisplay error={error} reset={reset} />;
}
