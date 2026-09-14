/**
 * Consistency Engine
 * Workouts this week, 4-week avg vs target, current streak.
 * Good = avg ≥ 75% of weekly_workout_target over last 4 weeks.
 */
import { db } from "@/db";
import { workoutSessions, usersPreferences } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

type UserPreferences = typeof usersPreferences.$inferSelect;

export interface ConsistencySignal {
  workouts_this_week: number;
  avg_per_week_4w:    number;
  streak_days:        number;
  target_per_week:    number;
  status: "good" | "low";
}

// Longest streak this engine will ever report — bounds the session query so
// it doesn't grow unboundedly for long-time users. A real streak longer than
// this is exceedingly rare, and reporting "365+ days" vs the true count
// doesn't change what the user should do differently.
const MAX_STREAK_DAYS = 365;

export async function buildConsistencySignal(userId: string, prefs: UserPreferences | null): Promise<ConsistencySignal> {
  const today = new Date().toISOString().slice(0, 10);

  // Get Monday of current week
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const weekStart = d.toISOString().slice(0, 10);

  // 4-week window start
  const fourWeeksAgo = new Date(today + "T12:00:00Z");
  fourWeeksAgo.setUTCDate(fourWeeksAgo.getUTCDate() - 28);
  const window4w = fourWeeksAgo.toISOString().slice(0, 10);

  // Query window covers everything this function needs: the 4-week average
  // and a streak up to MAX_STREAK_DAYS. Previously fetched every session the
  // user had ever logged with no date filter at all.
  const queryStart = new Date(today + "T12:00:00Z");
  queryStart.setUTCDate(queryStart.getUTCDate() - MAX_STREAK_DAYS);
  const queryStartStr = queryStart.toISOString().slice(0, 10);

  const sessions = await db
    .select({ date: workoutSessions.date })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, queryStartStr)))
    .orderBy(workoutSessions.date);

  const target = Number(prefs?.weeklyWorkoutTarget ?? 4);

  const dates = sessions.map(s => s.date);

  const thisWeek   = dates.filter(d => d >= weekStart).length;
  const last4wDays = dates.filter(d => d >= window4w);
  const avg4w      = Math.round((last4wDays.length / 4) * 10) / 10;

  // Streak: consecutive days with ≥1 workout counting backwards from today
  const dateSet = new Set(dates);
  let streak = 0;
  const cur = new Date(today + "T12:00:00Z");
  while (dateSet.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  return {
    workouts_this_week: thisWeek,
    avg_per_week_4w:    avg4w,
    streak_days:        streak,
    target_per_week:    target,
    status:             avg4w >= target * 0.75 ? "good" : "low",
  };
}
