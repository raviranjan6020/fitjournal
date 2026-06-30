import { auth } from "@/lib/auth";
import { buildSnapshot } from "@/modules/analytics/service";
import { generateWeeklyReport } from "@/modules/reporting/service";
import { isoDate, addDays } from "@/lib/utils";
import { NextResponse } from "next/server";

// Manual trigger — generate a report for the last 7 days (for testing)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId    = session.user.id as string;
  const periodEnd = isoDate();
  const periodStart = addDays(periodEnd, -6);

  await buildSnapshot(userId);
  const report = await generateWeeklyReport(userId, periodStart, periodEnd);
  if (!report) return NextResponse.json({ error: "not enough data to generate report" }, { status: 400 });

  return NextResponse.json(report, { status: 201 });
}
