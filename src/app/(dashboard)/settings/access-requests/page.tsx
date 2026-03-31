import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccessRequestsClient } from "./_components/access-requests-client";

export const metadata = { title: "Access Requests — Settings" };

export default async function AccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("settings");

  const { tab = "PENDING" } = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED"].includes(tab) ? tab : "PENDING") as
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  const [pending, approved, rejected] = await Promise.all([
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
    prisma.accessRequest.count({ where: { status: "APPROVED" } }),
    prisma.accessRequest.count({ where: { status: "REJECTED" } }),
  ]);

  const requests = await prisma.accessRequest.findMany({
    where:   { status },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AccessRequestsClient
      requests={requests.map((r) => ({
        id:         r.id,
        fullName:   r.fullName,
        workEmail:  r.workEmail,
        department: r.department,
        jobTitle:   r.jobTitle,
        phone:      r.phone,
        reason:     r.reason,
        status:     r.status,
        reviewNote: r.reviewNote,
        createdAt:  r.createdAt.toISOString(),
      }))}
      counts={{ PENDING: pending, APPROVED: approved, REJECTED: rejected }}
      activeTab={status}
    />
  );
}
