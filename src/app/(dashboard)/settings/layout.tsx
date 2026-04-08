import { requirePermission } from "@/lib/auth";
import { SettingsNav } from "./_components/settings-nav";

export const metadata = { title: "Settings" };

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage system-wide configuration — admin only.
        </p>
      </div>

      <SettingsNav />

      {children}
    </div>
  );
}
