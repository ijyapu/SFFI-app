"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function ErrorDisplay({ error, reset }: Props) {
  const { user } = useUser();
  const pathname = usePathname();
  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full space-y-5">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Something went wrong while loading this page. The error has been
            reported automatically.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-left text-xs space-y-1">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Error ID:</span>{" "}
              <code className="font-mono select-all">{error.digest}</code>
            </p>
            {isAdmin && (
              <p className="text-muted-foreground">
                Search for this ID in{" "}
                <span className="font-medium text-foreground">Vercel logs</span> or{" "}
                <span className="font-medium text-foreground">Sentry</span> to see
                the full error.
                {pathname && (
                  <>
                    {" "}Route:{" "}
                    <code className="font-mono">{pathname}</code>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
            <Home className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
