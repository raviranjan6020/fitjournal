import { auth } from "@/lib/auth";
import { buildSnapshot } from "@/modules/analytics/service";
import { generateWeeklyReport } from "@/modules/reporting/service";
import { isoDate, addDays } from "@/lib/utils";
import { NextResponse } from "next/server";

// Manual trigger — generate a report for the most recently completed Mon–Sun
// week (or the partial week-to-date if it's the user's first report).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const today  = isoDate();

  // Monday of the current week
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const thisMonday = d.toISOString().slice(0, 10);

  // Most recently completed week: last Monday → yesterday (Sunday), unless
  // that would be empty, in which case fall back to week-to-date so a
  // first-time user can still get a report from partial data.
  const lastMonday = addDays(thisMonday, -7);
  const lastSunday = addDays(thisMonday, -1);

  const periodStart = today === thisMonday ? thisMonday : lastMonday;
  const periodEnd   = today === thisMonday ? today      : lastSunday;

  await buildSnapshot(userId);
  const report = await generateWeeklyReport(userId, periodStart, periodEnd);
  if (!report) return NextResponse.json({ error: "Not enough data yet to generate a report. Log a few workouts or check-ins first." }, { status: 400 });

  return NextResponse.json(report, { status: 201 });
}
