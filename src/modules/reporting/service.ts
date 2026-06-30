import { db } from "@/db";
import { reports, analyticsSnapshots } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { buildWeeklyReport } from "./builder";

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
  // Get current snapshot (should already be built by analytics)
  const [current] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.userId, userId))
    .orderBy(desc(analyticsSnapshots.snapshotDate))
    .limit(1);

  if (!current) return null;

  // Previous snapshot (for weight delta)
  const [previous] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.userId, userId))
    .orderBy(desc(analyticsSnapshots.snapshotDate))
    .limit(2)
    .then(rows => rows.slice(1)); // second row = previous

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
