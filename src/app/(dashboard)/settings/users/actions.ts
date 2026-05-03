"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { requirePermission, getCurrentRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail } from "@/lib/email";
import type { AppRole } from "@/types/globals";
import { z } from "zod/v4";

const schema = z.object({
  userId: z.string().min(1),
  role:   z.enum(["superadmin", "admin", "manager", "accountant", "employee", "none"]),
});

export async function setUserRole(userId: string, role: AppRole | "none") {
  await requirePermission("settings");

  const callerRole                    = await getCurrentRole();
  const isSuperAdmin                  = callerRole === "superadmin";
  const { userId: currentUserId }     = await auth();

  // Self-demotion protection
  if (userId === currentUserId) {
    if (isSuperAdmin && role !== "superadmin") {
      throw new Error("You cannot remove your own superadmin role.");
    }
    if (!isSuperAdmin && role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }
  }

  // Only superadmins can assign the superadmin role
  if (role === "superadmin" && !isSuperAdmin) {
    throw new Error("Only a superadmin can assign the superadmin role.");
  }

  schema.parse({ userId, role });

  const client = await clerkClient();

  // Fetch target user first so we can check their current role before making changes
  const clerkUser = await client.users.getUser(userId);
  const targetCurrentRole = clerkUser.publicMetadata?.role as AppRole | undefined;

  if (!isSuperAdmin && targetCurrentRole === "superadmin") {
    throw new Error("Only a superadmin can change another superadmin's role.");
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role: role === "none" ? undefined : role },
  });

  await prisma.auditLog.create({
    data: {
      userId:     currentUserId!,
      action:     "SET_USER_ROLE",
      entityType: "User",
      entityId:   userId,
      after:      { role },
    },
  });

  // Send approval email when a real role is assigned
  if (role !== "none") {
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    const name = clerkUser.firstName ?? clerkUser.username ?? "there";

    if (email) {
      sendApprovalEmail(email, name, role).catch((err) =>
        console.error("[setUserRole] email failed:", err)
      );
    }
  }

  revalidatePath("/settings/users");
}

export async function deleteUser(userId: string) {
  await requirePermission("settings");

  const callerRole = await getCurrentRole();
  if (callerRole !== "superadmin") {
    throw new Error("Only superadmins can delete users.");
  }

  const { userId: currentUserId } = await auth();
  if (userId === currentUserId) {
    throw new Error("You cannot delete your own account.");
  }

  const client = await clerkClient();

  // Capture user info for the audit log before deletion
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "(unknown)";

  await client.users.deleteUser(userId);

  await prisma.auditLog.create({
    data: {
      userId:     currentUserId!,
      action:     "USER_DELETE",
      entityType: "User",
      entityId:   userId,
      before:     { email, role: clerkUser.publicMetadata?.role ?? null },
    },
  });

  revalidatePath("/settings/users");
}
