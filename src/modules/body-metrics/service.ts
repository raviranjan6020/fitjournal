import { db } from "@/db";
import { bodyMetrics, sleepLogs, nutritionLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isoDate } from "@/lib/utils";

export interface CheckinInput {
  date?: string;
  weightKg?: number;
  bodyFatPct?: number;
  proteinG?: number;
  waterL?: number;
  calories?: number;
  sleepHours?: number;
  sleepQuality?: number;
  notes?: string;
}

/** Single check-in: upserts body_metrics + nutrition_logs + sleep_logs */
export async function upsertCheckin(userId: string, input: CheckinInput) {
  const date = input.date ?? isoDate();

  // Validate before writing anything, so an invalid field doesn't leave a
  // partial check-in (some tables written, one skipped).
  if (input.sleepHours !== undefined && input.sleepHours > 16) {
    throw new Error("Sleep hours > 16 rejected");
  }

  // Neon's HTTP driver doesn't support multi-statement transactions, but these
  // three upserts write to different tables with no dependency on each
  // other's results, so they can run concurrently instead of one after
  // another. Not atomic (a mid-flight failure can still leave a partial
  // check-in across tables) — same caveat as before, just faster.
  const [bodyRow, nutritionRow, sleepRow] = await Promise.all([
    (input.weightKg !== undefined || input.bodyFatPct !== undefined)
      ? db
          .insert(bodyMetrics)
          .values({
            userId,
            date,
            weightKg:   input.weightKg   !== undefined ? String(input.weightKg)   : undefined,
            bodyFatPct: input.bodyFatPct  !== undefined ? String(input.bodyFatPct) : undefined,
          })
          .onConflictDoUpdate({
            target: [bodyMetrics.userId, bodyMetrics.date],
            set: {
              weightKg:   input.weightKg   !== undefined ? String(input.weightKg)   : undefined,
              bodyFatPct: input.bodyFatPct  !== undefined ? String(input.bodyFatPct) : undefined,
              updatedAt: new Date(),
            },
          })
          .returning()
          .then(rows => rows[0])
      : Promise.resolve(undefined),

    (input.proteinG !== undefined || input.waterL !== undefined)
      ? db
          .insert(nutritionLogs)
          .values({
            userId,
            date,
            proteinG: input.proteinG,
            waterL:   input.waterL !== undefined ? String(input.waterL) : undefined,
            calories: input.calories,
          })
          .onConflictDoUpdate({
            target: [nutritionLogs.userId, nutritionLogs.date],
            set: {
              proteinG: input.proteinG,
              waterL:   input.waterL !== undefined ? String(input.waterL) : undefined,
              calories: input.calories,
              updatedAt: new Date(),
            },
          })
          .returning()
          .then(rows => rows[0])
      : Promise.resolve(undefined),

    (input.sleepHours !== undefined)
      ? db
          .insert(sleepLogs)
          .values({ userId, date, hours: String(input.sleepHours), quality: input.sleepQuality })
          .onConflictDoUpdate({
            target: [sleepLogs.userId, sleepLogs.date],
            set: { hours: String(input.sleepHours), quality: input.sleepQuality },
          })
          .returning()
          .then(rows => rows[0])
      : Promise.resolve(undefined),
  ]);

  const results: Record<string, unknown> = {};
  if (bodyRow !== undefined) results.bodyMetrics = bodyRow;
  if (nutritionRow !== undefined) results.nutrition = nutritionRow;
  if (sleepRow !== undefined) results.sleep = sleepRow;
  return results;
}

export async function getCheckinForDate(userId: string, date: string) {
  const [[metrics], [nutrition], [sleep]] = await Promise.all([
    db.select().from(bodyMetrics).where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, date))).limit(1),
    db.select().from(nutritionLogs).where(and(eq(nutritionLogs.userId, userId), eq(nutritionLogs.date, date))).limit(1),
    db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.date, date))).limit(1),
  ]);
  return { bodyMetrics: metrics ?? null, nutrition: nutrition ?? null, sleep: sleep ?? null };
}
