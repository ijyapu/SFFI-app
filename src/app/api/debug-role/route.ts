import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// TEMPORARY — delete this file after diagnosing the role issue
export async function GET() {
  const { userId, sessionClaims } = await auth();
  return NextResponse.json({
    userId,
    publicMetadata: sessionClaims?.publicMetadata ?? null,
    role: (sessionClaims?.publicMetadata as { role?: string })?.role ?? null,
  });
}
