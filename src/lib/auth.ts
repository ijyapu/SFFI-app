import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { AppRole } from "@/types/globals";
import { hasPermission, hasMinRole, type PermissionKey } from "@/lib/roles";

/** Get the current user's role from publicMetadata (server only) */
export async function getCurrentRole(): Promise<AppRole | null> {
  const user = await currentUser();
  return (user?.publicMetadata?.role as AppRole) ?? null;
}

/** Get current user's role and userId */
export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const role = (user?.publicMetadata?.role as AppRole) ?? null;
  return { userId, role };
}

/**
 * Server Component guard — redirects to /unauthorized if role check fails.
 * Use at the top of any protected Server Component or Server Action.
 */
export async function requirePermission(permission: PermissionKey): Promise<AppRole> {
  const role = await getCurrentRole();
  if (!role) {
    // Authenticated but no role assigned yet — send to pending review page
    redirect("/pending");
  }
  if (!hasPermission(role, permission)) {
    redirect("/unauthorized");
  }
  return role!;
}

export async function requireMinRole(minRole: AppRole): Promise<AppRole> {
  const role = await getCurrentRole();
  if (!role) redirect("/pending");
  if (!hasMinRole(role, minRole)) redirect("/unauthorized");
  return role!;
}

/** Full Clerk user object — use when you need name/email/image */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}

// Re-export helpers so callers only need to import from @/lib/auth
export { hasPermission, hasMinRole };
