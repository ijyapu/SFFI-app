import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { AuditLogTable, type AuditEntry } from "./_components/audit-log-table";

export const metadata = { title: "Audit Log — Settings — Shanti Special Food Industry ERP" };

const PAGE_SIZE = 30;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? "1", 10));

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
  ]);

  // Resolve Clerk user emails for display
  const userIds = Array.from(new Set(logs.map((l) => l.userId)));
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    try {
      const client = await clerkClient();
      const { data: users } = await client.users.getUserList({ userId: userIds, limit: 100 });
      for (const u of users) {
        const email = u.emailAddresses[0]?.emailAddress ?? u.id;
        userMap.set(u.id, email);
      }
    } catch {
      // Non-fatal — fall back to userId
    }
  }

  const entries: AuditEntry[] = logs.map((l) => ({
    id:         l.id,
    userId:     l.userId,
    userLabel:  userMap.get(l.userId) ?? l.userId,
    action:     l.action,
    entityType: l.entityType,
    entityId:   l.entityId,
    before:     l.before,
    after:      l.after,
    createdAt:  l.createdAt.toISOString(),
  }));

  return (
    <AuditLogTable
      entries={entries}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
