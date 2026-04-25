import { prisma } from "@/lib/prisma";

type Db = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Atomically claim the next document number for a given prefix.
 * Uses an upsert so the counter row is created on first use.
 * Always call this inside an existing transaction to keep the
 * document number and its parent record in the same atomic unit.
 */
export async function getNextDocumentNumber(
  prefix: string,
  db: Db = prisma
): Promise<string> {
  const counter = await db.documentCounter.upsert({
    where:  { prefix },
    create: { prefix, nextVal: 2 },
    update: { nextVal: { increment: 1 } },
  });
  // On CREATE nextVal is 2 → claimed = 1
  // On UPDATE nextVal is post-increment → claimed = pre-increment
  return `${prefix}${String(counter.nextVal - 1).padStart(4, "0")}`;
}
