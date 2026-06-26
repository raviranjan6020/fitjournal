/**
 * Plateau Engine — sparse-logging safe.
 * Compares best e1RM across trained weeks (skips untrained weeks).
 * Plateau = ≤0.5% e1RM gain for 2+ consecutive trained weeks.
 * Does NOT call within-week overload engine (breaks for once-weekly training).
 */
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export interface PlateauSignal {
  exercise:       string;   // slug
  name:           string;
  weeks_stalled:  number;
  last_weight_kg: number | null;
}

function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

function isoMonday(weekOffset: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  // Back to this Monday
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  // Then back weekOffset more weeks
  d.setUTCDate(d.getUTCDate() - weekOffset * 7);
  return d.toISOString().slice(0, 10);
}

export async function buildPlateauSignals(userId: string): Promise<PlateauSignal[]> {
  const sixWeeksAgo = isoMonday(6);

  const rows = await db
    .select({
      exerciseId:  workoutExerciseLogs.exerciseId,
      slug:        exerciseLibrary.slug,
      name:        exerciseLibrary.name,
      sessionDate: workoutSessions.date,
      weightKg:    workoutSets.weightKg,
      reps:        workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions,     eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .innerJoin(exerciseLibrary,     eq(workoutExerciseLogs.exerciseId, exerciseLibrary.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSets.isWarmup, false),
        gte(workoutSessions.date, sixWeeksAgo),
      ),
    );

  if (!rows.length) return [];

  // Build week-number helper (0 = current week, 1 = last week, ...)
  const thisMonday = isoMonday(0);
  function weekIndex(date: string): number {
    const diff = (new Date(thisMonday + "T12:00:00Z").getTime() - new Date(date + "T12:00:00Z").getTime());
    return Math.floor(diff / (7 * 86400000));
  }

  // Group: exerciseId → weekIndex → best e1RM
  const byEx = new Map<string, { slug: string; name: string; weeks: Map<number, number>; lastWeightKg: number }>();

  for (const row of rows) {
    if (!byEx.has(row.exerciseId)) {
      byEx.set(row.exerciseId, { slug: row.slug, name: row.name, weeks: new Map(), lastWeightKg: 0 });
    }
    const ex  = byEx.get(row.exerciseId)!;
    const wk  = weekIndex(row.sessionDate);
    const val = e1rm(Number(row.weightKg), row.reps);
    if (val > (ex.weeks.get(wk) ?? 0)) ex.weeks.set(wk, val);
    if (Number(row.weightKg) > ex.lastWeightKg) ex.lastWeightKg = Number(row.weightKg);
  }

  const plateaus: PlateauSignal[] = [];

  for (const [, ex] of byEx) {
    // Trained weeks sorted oldest→newest by week index (smaller = more recent)
    const trainedWeeks = [...ex.weeks.entries()].sort((a, b) => b[0] - a[0]); // newest first

    if (trainedWeeks.length < 3) continue; // need 3+ trained weeks

    // Count trailing stalled weeks from most recent
    let stalledStreak = 0;
    for (let i = 0; i < trainedWeeks.length - 1; i++) {
      const curr = trainedWeeks[i][1];
      const prev = trainedWeeks[i + 1][1];
      const gain = (curr - prev) / prev;
      if (gain <= 0.005) {  // ≤0.5% = no real progress
        stalledStreak++;
      } else {
        break;
      }
    }

    if (stalledStreak >= 2) {
      plateaus.push({
        exercise:       ex.slug,
        name:           ex.name,
        weeks_stalled:  stalledStreak,
        last_weight_kg: ex.lastWeightKg,
      });
    }
  }

  return plateaus;
}
