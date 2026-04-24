"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { COMPANY } from "@/lib/company";
import { z } from "zod";

const db = prisma as any;

const schema = z.object({
  name:        z.string().min(1),
  nameShort:   z.string().min(1),
  slogan:      z.string().min(1),
  address:     z.string().min(1),
  phone:       z.string().min(1),
  pan:         z.string().min(1),
  owner:       z.string().min(1),
  established: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
});

export type CompanyInfo = z.infer<typeof schema>;

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role) throw new Error("Unauthorized");
  try {
    const row = await db.companySettings.findUnique({ where: { id: "main" } });
    if (row) return row;
  } catch {}
  // Fall back to static config if DB row doesn't exist yet
  return {
    name:        COMPANY.name,
    nameShort:   COMPANY.nameShort,
    slogan:      COMPANY.slogan,
    address:     COMPANY.address,
    phone:       COMPANY.phone,
    pan:         COMPANY.pan,
    owner:       COMPANY.owner,
    established: COMPANY.established,
  };
}

export async function saveCompanyInfo(data: CompanyInfo): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin") throw new Error("Only admins can update company info");

  const parsed = schema.parse(data);

  await db.companySettings.upsert({
    where:  { id: "main" },
    update: { ...parsed, updatedBy: user.id },
    create: { id: "main", ...parsed, updatedBy: user.id },
  });

  revalidatePath("/company");
  revalidatePath("/settings/company");
}
