import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";

export default async function SettingsPage() {
  await requirePermission("settings");
  redirect("/settings/company");
}
