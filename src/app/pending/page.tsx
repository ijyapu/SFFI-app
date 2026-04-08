import { COMPANY } from "@/lib/company";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PendingAccess } from "@/components/auth/pending-access";
import { PendingRoleWatcher } from "@/components/auth/pending-role-watcher";

export const metadata = { title: "Access Pending Approval — {COMPANY.nameShort} ERP" };

export default async function PendingPage() {
  const user = await currentUser();

  // Not signed in — go to sign in
  if (!user) redirect("/sign-in");

  // Already has a role — go to dashboard
  if (user.publicMetadata?.role) redirect("/dashboard");

  const name  = [user.firstName, user.lastName].filter(Boolean).join(" ")
                || user.emailAddresses[0]?.emailAddress
                || "there";
  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <>
      <PendingRoleWatcher />
      <PendingAccess name={name} email={email} />
    </>
  );
}
