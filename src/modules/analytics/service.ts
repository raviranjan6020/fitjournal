/**
 * Analytics Service — orchestrates all 5 engines, writes snapshot.
 * Snapshot is consumed by Reporting + AI Coach.
 */
import { db } from "@/db";
import { analyticsSnapshots, nutritionLogs, sleepLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isoDate, addDays } from "@/lib/utils";
import { buildOverloadSignals } from "./engines/overload";
import { buildVolumeSignals } from "./engines/volume";
import { buildConsistencySignal } from "./engines/consistency";
import { buildGoalProgressSignal } from "./engines/goal-progress";
import { buildPlateauSignals } from "./engines/plateau";
import { getPreferences } from "@/modules/users/service";

export async function getOrBuildSnapshot(userId: string) {
  const today = isoDate();

  // Return if fresh (< 7 days old)
  const [latest] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.userId, userId))
    .orderBy(desc(analyticsSnapshots.snapshotDate))
    .limit(1);

  if (latest && latest.snapshotDate >= addDays(today, -7)) {
    return latest;
  }

  return buildSnapshot(userId);
}

export async function buildSnapshot(userId: string) {
  const today      = isoDate();
  const weekStart  = getMondayOfWeek(today);
  const sevenAgo   = addDays(today, -7);

  // Run all engines in parallel
  const [overload, volume, consistency, goalProgress, plateaus, nutrition, sleep] = await Promise.all([
    buildOverloadSignals(userId),
    buildVolumeSignals(userId, weekStart),
    buildConsistencySignal(userId),
    buildGoalProgressSignal(userId),
    buildPlateauSignals(userId),
    getNutritionSummary(userId, sevenAgo),
    getSleepSummary(userId, sevenAgo),
  ]);

  const content = {
    goal:        goalProgress,
    nutrition,
    sleep,
    consistency,
    strength:    overload,
    volume,
    plateaus,
    new_prs:     [], // PRs collected at set-log time, not recomputed here
  };

  const [snapshot] = await db
    .insert(analyticsSnapshots)
    .values({ userId, snapshotDate: today, periodStart: weekStart, periodEnd: today, content })
    .onConflictDoUpdate({
      target: [analyticsSnapshots.userId, analyticsSnapshots.snapshotDate],
      set: { content, periodStart: weekStart, periodEnd: today },
    })
    .returning();

  return snapshot;
}

// ── Nutrition 7-day summary ───────────────────────────────────────────────────

async function getNutritionSummary(userId: string, _since: string) {
  const prefs = await getPreferences(userId);
  const proteinTarget = Number(prefs?.proteinTargetG ?? 134);
  const waterTarget   = Number(prefs?.waterTargetL   ?? 2.5);

  const rows = await db
    .select({ proteinG: nutritionLogs.proteinG, waterL: nutritionLogs.waterL })
    .from(nutritionLogs)
    .where(eq(nutritionLogs.userId, userId));

  const proteinEntries = rows.filter(r => r.proteinG !== null).map(r => r.proteinG!);
  const waterEntries   = rows.filter(r => r.waterL   !== null).map(r => Number(r.waterL));

  const proteinAvg = proteinEntries.length ? mean(proteinEntries) : null;
  const waterAvg   = waterEntries.length   ? mean(waterEntries)   : null;

  const proteinStatus = proteinAvg === null     ? "no_data"
    : proteinAvg >= proteinTarget               ? "adequate"
    : proteinAvg >= proteinTarget * 0.875       ? "low"
    : "very_low";

  const waterStatus = waterAvg === null ? "no_data"
    : waterAvg >= waterTarget ? "adequate" : "low";

  return {
    protein_avg_g:    proteinAvg !== null ? Math.round(proteinAvg) : null,
    protein_target_g: proteinTarget,
    protein_status:   proteinStatus,
    water_avg_l:      waterAvg !== null ? Math.round(waterAvg * 10) / 10 : null,
    water_target_l:   waterTarget,
    water_status:     waterStatus,
  };
}

async function getSleepSummary(userId: string, _since: string) {
  const rows = await db
    .select({ hours: sleepLogs.hours })
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, userId));

  const vals = rows.filter(r => r.hours !== null).map(r => Number(r.hours));
  const avg  = vals.length ? mean(vals) : null;

  return {
    avg_hours: avg !== null ? Math.round(avg * 10) / 10 : null,
    status:    avg === null ? "no_data" : avg >= 7 ? "good" : "low",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function getMondayOfWeek(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
