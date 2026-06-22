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

/** Single transactional check-in: upserts body_metrics + nutrition_logs + sleep_logs */
export async function upsertCheckin(userId: string, input: CheckinInput) {
  const date = input.date ?? isoDate();

  // Drizzle-neon doesn't have native transactions on HTTP driver; run sequentially.
  // For true atomicity, use Neon's pool + transaction when migrating to persistent server.
  const results: Record<string, unknown> = {};

  if (input.weightKg !== undefined || input.bodyFatPct !== undefined) {
    const [row] = await db
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
      .returning();
    results.bodyMetrics = row;
  }

  if (input.proteinG !== undefined || input.waterL !== undefined) {
    const [row] = await db
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
      .returning();
    results.nutrition = row;
  }

  if (input.sleepHours !== undefined) {
    if (input.sleepHours > 16) throw new Error("Sleep hours > 16 rejected");
    const [row] = await db
      .insert(sleepLogs)
      .values({ userId, date, hours: String(input.sleepHours), quality: input.sleepQuality })
      .onConflictDoUpdate({
        target: [sleepLogs.userId, sleepLogs.date],
        set: { hours: String(input.sleepHours), quality: input.sleepQuality },
      })
      .returning();
    results.sleep = row;
  }

  return results;
}

export async function getCheckinForDate(userId: string, date: string) {
  const [metrics] = await db.select().from(bodyMetrics).where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, date))).limit(1);
  const [nutrition] = await db.select().from(nutritionLogs).where(and(eq(nutritionLogs.userId, userId), eq(nutritionLogs.date, date))).limit(1);
  const [sleep] = await db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.date, date))).limit(1);
  return { bodyMetrics: metrics ?? null, nutrition: nutrition ?? null, sleep: sleep ?? null };
}
