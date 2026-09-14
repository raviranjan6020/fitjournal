import { db } from "@/db";
import { reports, analyticsSnapshots } from "@/db/schema";
import { eq, desc, and, gte, lte, lt } from "drizzle-orm";
import { buildWeeklyReport } from "./builder";
import { addDays } from "@/lib/utils";

export async function listReports(userId: string, limit = 20) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.periodEnd))
    .limit(limit);
}

export async function getReport(userId: string, reportId: string) {
  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .limit(1);
  return report ?? null;
}

export async function markReportRead(userId: string, reportId: string) {
  await db
    .update(reports)
    .set({ isRead: true })
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));
}

export async function generateWeeklyReport(userId: string, periodStart: string, periodEnd: string) {
  // The analytics snapshot is a rolling "as of" snapshot (dated when it was built),
  // not a historical per-week record. The normal cadence builds it the day *after*
  // periodEnd (cron runs Monday for the Mon–Sun week that just closed), so we can't
  // require snapshotDate to fall inside [periodStart, periodEnd] — that would reject
  // the very snapshot the cron just built. Instead: take the most recent snapshot no
  // more than a few days after periodEnd, which covers both the cron's "day after"
  // cadence and on-demand generation for the current/most recent period. This still
  // rejects snapshots left over from an unrelated, much later period.
  const snapshotCutoff = addDays(periodEnd, 3);

  // These two queries are independent (both keyed off periodStart/periodEnd,
  // neither depends on the other's result), so run them together. In the
  // rare case current turns out to be missing, previous was fetched
  // needlessly — a small tradeoff for saving a full round trip on the common
  // path where current does exist.
  const [[current], [previous]] = await Promise.all([
    db
      .select()
      .from(analyticsSnapshots)
      .where(
        and(
          eq(analyticsSnapshots.userId, userId),
          lte(analyticsSnapshots.snapshotDate, snapshotCutoff),
          gte(analyticsSnapshots.snapshotDate, periodStart),
        ),
      )
      .orderBy(desc(analyticsSnapshots.snapshotDate))
      .limit(1),
    // Previous snapshot (for weight delta) — most recent snapshot before this period
    db
      .select()
      .from(analyticsSnapshots)
      .where(
        and(
          eq(analyticsSnapshots.userId, userId),
          lt(analyticsSnapshots.snapshotDate, periodStart),
        ),
      )
      .orderBy(desc(analyticsSnapshots.snapshotDate))
      .limit(1),
  ]);

  if (!current) return null;

  const content = buildWeeklyReport(
    current.content as Parameters<typeof buildWeeklyReport>[0],
    previous?.content as Parameters<typeof buildWeeklyReport>[1] ?? null,
    periodStart,
    periodEnd,
  );

  // Upsert report (idempotent: UNIQUE user+type+period_end)
  const [report] = await db
    .insert(reports)
    .values({
      userId,
      reportType: "weekly",
      periodStart,
      periodEnd,
      snapshotId: current.id,
      content: content as unknown as Record<string, unknown>,
      isRead: false,
    })
    .onConflictDoUpdate({
      target: [reports.userId, reports.reportType, reports.periodEnd],
      set: { content: content as unknown as Record<string, unknown>, snapshotId: current.id },
    })
    .returning();

  return report;
}
