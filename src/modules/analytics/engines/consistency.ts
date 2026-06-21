// Consistency engine — workouts this week, 4-week avg, streak
// TODO: implement per lld-analytics.md
export async function buildConsistencySignal(_userId: string) {
  return { workouts_this_week: 0, avg_per_week_4w: 0, streak_days: 0, status: "no_data" };
}
