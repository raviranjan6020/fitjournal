import { db } from "@/db";
import { analyticsSnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isoDate, addDays } from "@/lib/utils";
import { buildOverloadSignals } from "./engines/overload";
import { buildVolumeSignals } from "./engines/volume";
import { buildConsistencySignal } from "./engines/consistency";
import { buildGoalProgressSignal } from "./engines/goal-progress";
import { buildPlateauSignals } from "./engines/plateau";

export async function getOrBuildSnapshot(userId: string) {
  const today = isoDate();

  // Return fresh snapshot if exists and < 7 days old
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
  const today = isoDate();
  const periodEnd = today;
  const periodStart = addDays(today, -6);

  const [overload, volume, consistency, goalProgress, plateaus] = await Promise.all([
    buildOverloadSignals(userId),
    buildVolumeSignals(userId, periodStart),
    buildConsistencySignal(userId),
    buildGoalProgressSignal(userId),
    buildPlateauSignals(userId),
  ]);

  const content = {
    goal: goalProgress,
    nutrition: { protein_avg_g: null, protein_target_g: null, protein_status: "no_data", water_avg_l: null, water_status: "no_data" },
    sleep: { avg_hours: null, status: "no_data" },
    consistency,
    strength: overload,
    volume,
    plateaus,
    new_prs: [],
  };

  const [snapshot] = await db
    .insert(analyticsSnapshots)
    .values({ userId, snapshotDate: today, periodStart, periodEnd, content })
    .onConflictDoUpdate({
      target: [analyticsSnapshots.userId, analyticsSnapshots.snapshotDate],
      set: { content, periodStart, periodEnd },
    })
    .returning();

  return snapshot;
}
