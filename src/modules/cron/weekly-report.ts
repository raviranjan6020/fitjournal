import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildSnapshot } from "@/modules/analytics/service";
import { generateWeeklyReport } from "@/modules/reporting/service";
import { isoDate, addDays } from "@/lib/utils";

export async function runWeeklyReports() {
  // Period = Mon–Sun just closed (cron fires Mon 02:00 UTC)
  const periodEnd   = addDays(isoDate(), -1); // yesterday = Sunday
  const periodStart = addDays(periodEnd, -6); // Monday

  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true));

  console.log(`[cron] weekly-report: ${activeUsers.length} users, period ${periodStart}–${periodEnd}`);

  let success = 0;
  let failed  = 0;

  for (const user of activeUsers) {
    try {
      // 1. Build/refresh analytics snapshot
      await buildSnapshot(user.id);
      // 2. Generate report
      await generateWeeklyReport(user.id, periodStart, periodEnd);
      // 3. TODO: deliver (email + push) — Epic 8
      success++;
    } catch (err) {
      console.error(`[cron] failed for ${user.id}:`, err);
      failed++;
    }
  }

  console.log(`[cron] complete: ${success} success, ${failed} failed`);
  return { success, failed, period: { start: periodStart, end: periodEnd } };
}
