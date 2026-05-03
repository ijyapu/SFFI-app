import { clerkClient, auth } from "@clerk/nextjs/server";
import { requirePermission, getCurrentRole } from "@/lib/auth";
import { UserRoleTable, type UserRow } from "./_components/user-role-table";
import type { AppRole } from "@/types/globals";

export const metadata = { title: "Users & Roles — Settings" };

export default async function UsersPage() {
  const [currentRole] = await Promise.all([
    getCurrentRole(),
    requirePermission("settings"),
  ]);
  const { userId: currentUserId } = await auth();

  const client = await clerkClient();
  const { data: clerkUsers } = await client.users.getUserList({
    limit:   200,
    orderBy: "-created_at",
  });

  const users: UserRow[] = clerkUsers.map((u) => ({
    id:            u.id,
    email:         u.emailAddresses[0]?.emailAddress ?? "(no email)",
    fullName:      u.fullName,
    imageUrl:      u.imageUrl,
    role:          (u.publicMetadata?.role as AppRole) ?? null,
    createdAt:     new Date(u.createdAt).toISOString(),
    isCurrentUser: u.id === currentUserId,
  }));

  return <UserRoleTable users={users} currentRole={currentRole} />;
}
