"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail } from "@/lib/email";
import type { AppRole } from "@/types/globals";
import { z } from "zod/v4";

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

  const [clerkUser] = await Promise.all([
    client.users.getUser(userId),
    client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role === "none" ? undefined : role,
      },
    }),
  ]);

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
