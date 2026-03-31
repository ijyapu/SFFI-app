"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Polls Clerk's user object every 4 seconds.
 * The moment a role appears in publicMetadata, redirects to /dashboard.
 * Mounted inside the pending page so approved users never have to refresh.
 */
export function PendingRoleWatcher() {
  const { user } = useUser();
  const router   = useRouter();

  useEffect(() => {
    // Check immediately on mount (handles the case where the role was
    // just assigned and the page is freshly loaded)
    if (user?.publicMetadata?.role) {
      router.replace("/dashboard");
      return;
    }

    const interval = setInterval(async () => {
      // Force Clerk to re-fetch the user from the server
      await user?.reload();
      if (user?.publicMetadata?.role) {
        clearInterval(interval);
        router.replace("/dashboard");
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, router]);

  return null;
}
