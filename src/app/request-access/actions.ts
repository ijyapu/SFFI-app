"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendRequestReceivedEmail, sendAdminNewRequestAlert } from "@/lib/email";

const schema = z.object({
  fullName:   z.string().min(2, "Full name is required"),
  workEmail:  z.string().email("Enter a valid email address"),
  department: z.string().min(1, "Department is required"),
  jobTitle:   z.string().min(1, "Job title is required"),
  phone:      z.string().optional(),
  reason:     z.string().optional(),
});

export type RequestAccessValues = z.infer<typeof schema>;

export async function submitAccessRequest(values: RequestAccessValues) {
  const data = schema.parse(values);

  // Prevent duplicate pending requests from the same email
  const existing = await prisma.accessRequest.findFirst({
    where: { workEmail: data.workEmail, status: "PENDING" },
  });
  if (existing) {
    throw new Error(
      "A pending request for this email already exists. Please wait for administrator review."
    );
  }

  await prisma.accessRequest.create({ data });

  // Fire emails in parallel — failures are logged but never throw to the user
  await Promise.allSettled([
    sendRequestReceivedEmail(data.workEmail, data.fullName),
    sendAdminNewRequestAlert({
      fullName:   data.fullName,
      workEmail:  data.workEmail,
      department: data.department,
      jobTitle:   data.jobTitle,
      phone:      data.phone,
      reason:     data.reason,
    }),
  ]);
}
