import { requirePermission } from "@/lib/auth";
import { ReportsNav } from "./_components/reports-nav";

export const metadata = { title: "Reports" };

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("reports");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Operational and financial snapshots.</p>
      </div>
      <ReportsNav />
      {children}
    </div>
  );
}
