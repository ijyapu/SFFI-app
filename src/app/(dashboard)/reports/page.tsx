import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";

export default async function ReportsPage() {
  await requirePermission("reports");
  redirect("/reports/analytics");
}
