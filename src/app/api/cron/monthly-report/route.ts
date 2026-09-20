import { NextResponse } from "next/server";
import {
  isTodayNepaliDay5, currentNepaliMonth, shiftBsMonth, getNepaliMonthRange, buildMonthlyReportData,
} from "@/lib/monthly-report";
import { sendMonthlyReportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron hits this once a day (see vercel.json). Most days it's a no-op --
 * the report only actually sends on the 5th of the Nepali month, for the Nepali
 * month that just ended, to ADMIN_EMAIL.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const authorized = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && !authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?force=1 bypasses the day-5 check for manual testing -- only usable by
  // whoever already has CRON_SECRET, so this doesn't weaken the endpoint.
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isTodayNepaliDay5()) {
    return NextResponse.json({ skipped: true, reason: "not the 5th of the Nepali month" });
  }

  const { year, monthIndex } = currentNepaliMonth();
  const reportMonth = shiftBsMonth(year, monthIndex, -1); // the month that just ended

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "ADMIN_EMAIL not configured" }, { status: 500 });
  }

  try {
    const data = await buildMonthlyReportData(reportMonth.year, reportMonth.monthIndex);
    await sendMonthlyReportEmail(adminEmail, data);
    return NextResponse.json({ sent: true, month: getNepaliMonthRange(reportMonth.year, reportMonth.monthIndex).label });
  } catch (e) {
    console.error("[cron/monthly-report] failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to generate report" }, { status: 500 });
  }
}
