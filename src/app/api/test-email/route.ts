import { NextResponse } from "next/server";
import { Resend } from "resend";

// DELETE THIS FILE after confirming email works.
// Access: GET /api/test-email (admin only via Vercel preview or locally)
export async function GET() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY is not set" }, { status: 500 });
  }

  const resend = new Resend(key);

  const { data, error } = await resend.emails.send({
    from:    "SSFI ERP <noreply@ssfi.work>",
    to:      process.env.ADMIN_EMAIL ?? "shrestha.bikas23@gmail.com",
    subject: "Resend test email",
    html:    "<p>If you received this, Resend is working correctly.</p>",
  });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
