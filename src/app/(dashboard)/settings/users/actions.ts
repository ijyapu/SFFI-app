"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { requirePermission } from "@/lib/auth";
import type { AppRole } from "@/types/globals";
import { z } from "zod/v4";

const VALID_ROLES: AppRole[] = ["admin", "manager", "accountant", "employee"];

const schema = z.object({
  userId: z.string().min(1),
  role:   z.enum(["admin", "manager", "accountant", "employee", "none"]),
});

export async function setUserRole(userId: string, role: AppRole | "none") {
  await requirePermission("settings");

  // Prevent an admin from removing their own admin role
  const { userId: currentUserId } = await auth();
  if (userId === currentUserId && role !== "admin") {
    throw new Error("You cannot remove your own admin role.");
  }

  schema.parse({ userId, role });

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: role === "none" ? undefined : role,
    },
  });

  revalidatePath("/settings/users");
}
