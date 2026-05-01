import { COMPANY } from "@/lib/company";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { Resend } from "resend";

const ADMIN = process.env.ADMIN_EMAIL ?? "shrestha.bikas23@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ssfi.work";

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

  const FROM = `${COMPANY.nameShort} ERP <noreply@ssfi.work>`;
  const year = new Date().getFullYear();

  if (resend) {
    // Email 1 — tell the new user their account is under review
    const userHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#0f172a;padding:24px 32px;">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">${COMPANY.nameShort} ERP</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">${COMPANY.name}</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Account Under Review</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Hi ${firstName},<br><br>
        Thank you for registering on the <strong>${COMPANY.nameShort} Enterprise Portal</strong>.
        Your account has been received and is currently being reviewed by the administrator.
      </p>
      <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.05em;">What happens next</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
          An administrator will review your account and assign the appropriate access role.
          This typically happens within one business day. You will receive another email once approved.
        </p>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;">
        If you have any questions, contact your manager or the system administrator at
        <a href="mailto:${ADMIN}" style="color:#dc2626;">${ADMIN}</a>.
      </p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">© ${year} ${COMPANY.name} · Nepal</p>
    </div>
  </div>
</body>
</html>`;

    // Email 2 — alert the admin that a new user is waiting for approval
    const adminHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#0f172a;padding:24px 32px;">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">${COMPANY.nameShort} ERP</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Admin Notification</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">New User Signed Up</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        A new user has created an account and is waiting for a role to be assigned.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-right:1px solid #e2e8f0;white-space:nowrap;">Name</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${firstName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;border-right:1px solid #e2e8f0;white-space:nowrap;">Email</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${primaryEmail}</td>
        </tr>
      </table>
      <a href="${APP_URL}/settings/users" style="display:inline-block;background:#dc2626;color:#fff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;text-decoration:none;">
        Assign Role in Settings
      </a>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">© ${year} ${COMPANY.name} · Nepal</p>
    </div>
  </div>
</body>
</html>`;

    await Promise.allSettled([
      resend.emails.send({ from: FROM, to: primaryEmail, subject: `Your ${COMPANY.nameShort} ERP account is under review`, html: userHtml }),
      resend.emails.send({ from: FROM, to: ADMIN, subject: `New user signed up: ${firstName} (${primaryEmail})`, html: adminHtml }),
    ]);
  } else {
    console.log(`[webhook] New user registered: ${primaryEmail} — RESEND_API_KEY not set, skipping emails`);
  }

  return new Response("OK", { status: 200 });
}
