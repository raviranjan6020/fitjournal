import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildSnapshot } from "@/modules/analytics/service";
import { isoDate, addDays } from "@/lib/utils";

export async function runWeeklyReports() {
  // period = Mon–Sun just closed (cron fires Mon 02:00 UTC)
  const periodEnd   = addDays(isoDate(), -1); // yesterday = Sunday
  const periodStart = addDays(periodEnd, -6); // Monday

  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true));

  console.log(`[cron] weekly-report: ${activeUsers.length} users, period ${periodStart}–${periodEnd}`);

  for (const user of activeUsers) {
    try {
      // 1. Build analytics snapshot
      await buildSnapshot(user.id);
      // 2. TODO: build report (reporting/builder.ts)
      // 3. TODO: deliver (delivery/service.ts)
      console.log(`[cron] done: ${user.id}`);
    } catch (err) {
      console.error(`[cron] failed for ${user.id}:`, err);
      // continue processing other users
    }
  }
}
