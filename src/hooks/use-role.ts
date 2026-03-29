"use client";

import { useUser } from "@clerk/nextjs";
import type { AppRole } from "@/types/globals";
import { hasPermission, hasMinRole, type PermissionKey } from "@/lib/roles";

/** Client-side hook to read the current user's role and check permissions */
export function useRole() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as AppRole) ?? null;

  return {
    role,
    can: (permission: PermissionKey) => hasPermission(role, permission),
    isAtLeast: (minRole: AppRole) => hasMinRole(role, minRole),
    isAdmin: role === "admin",
  };
}
