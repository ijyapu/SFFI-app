"use server";

import { headers } from "next/headers";
import { Webhook } from "svix";
import { sendRequestReceivedEmail, sendAdminNewRequestAlert } from "@/lib/email";

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    first_name: string | null;
    last_name:  string | null;
    email_addresses:          { email_address: string; id: string }[];
    primary_email_address_id: string | null;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 });

  const headersList  = await headers();
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

  if (event.type !== "user.created") return new Response("OK", { status: 200 });

  const { first_name, email_addresses, primary_email_address_id } = event.data;
  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id
  )?.email_address ?? email_addresses[0]?.email_address;

  if (!primaryEmail) return new Response("No email found", { status: 200 });

  const firstName = first_name ?? "there";

  await Promise.allSettled([
    sendRequestReceivedEmail(primaryEmail, firstName),
    sendAdminNewRequestAlert({ fullName: firstName, workEmail: primaryEmail }),
  ]);

  return new Response("OK", { status: 200 });
}
