import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

// Server-rendered on purpose: currentUser() reads the session cookie the
// OAuth redirect just set directly from the request, authoritatively, with
// no dependency on the client Clerk SDK having hydrated yet. The previous
// client-side version (useUser()) could transiently see user === null right
// after redirect and bounce back to /sign-in, which — since the user really
// was signed in — just redirected straight back here, looping forever.
export default async function AuthCallbackPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (user.publicMetadata?.role) redirect("/dashboard");
  redirect("/pending");
}
