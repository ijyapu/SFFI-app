import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Depends entirely on the caller's auth state — must never be statically
// prerendered/cached, or every visitor gets whatever the build-time result was.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const role = user?.publicMetadata?.role;

  if (!role) redirect("/pending");

  redirect("/dashboard");
}
