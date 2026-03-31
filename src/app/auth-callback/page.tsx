"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const { user, isLoaded } = useUser();
  const router  = useRouter();
  const hasRun  = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    const role = user.publicMetadata?.role;

    if (role) {
      // Existing user with a role — go straight to dashboard, no reload needed
      router.replace("/dashboard");
    } else {
      // New user or role not yet in cached data — fetch fresh then decide
      user.reload().then(() => {
        if (user.publicMetadata?.role) {
          router.replace("/dashboard");
        } else {
          router.replace("/pending");
        }
      });
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  );
}
