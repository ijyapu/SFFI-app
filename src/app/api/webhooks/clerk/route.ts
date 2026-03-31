import { headers } from "next/headers";
import { Webhook } from "svix";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string | null;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 });
  }

  const headersList = await headers();
  const svixId        = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh   = new Webhook(secret);

  let event: ClerkUserCreatedEvent;
  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (event.type !== "user.created") {
    return new Response("OK", { status: 200 });
  }

  const { first_name, email_addresses, primary_email_address_id } = event.data;
  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id
  )?.email_address ?? email_addresses[0]?.email_address;

  if (!primaryEmail) {
    return new Response("No email found", { status: 200 });
  }

  const firstName = first_name ?? "there";

  // Send welcome / pending review email via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from:    "SSFI ERP <noreply@ssfi.com.np>",
        to:      primaryEmail,
        subject: "Your SSFI account is under review",
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <!-- Header -->
    <div style="background:#0f172a;padding:24px 32px;">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">SSFI ERP</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Shanti Special Food Industry Pvt. Ltd.</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Account Under Review</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Hi ${firstName},<br><br>
        Thank you for registering on the <strong>SSFI Enterprise Portal</strong>.
        Your account has been received and is currently being reviewed by our administrator.
      </p>
      <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.05em;">What happens next</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
          An administrator will review your account and assign the appropriate access role.
          This typically happens within one business day. You will be able to sign in and
          access the portal once your account is approved.
        </p>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;">
        If you have any questions, please contact your manager or system administrator.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        © ${new Date().getFullYear()} Shanti Special Food Industry Pvt. Ltd. · Nepal
      </p>
    </div>
  </div>
</body>
</html>
        `.trim(),
      });
    } catch (err) {
      console.error("[webhook] Failed to send email:", err);
    }
  } else {
    console.log(
      `[webhook] New user registered: ${primaryEmail} — RESEND_API_KEY not set, skipping email`
    );
  }

  return new Response("OK", { status: 200 });
}
