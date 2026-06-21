// Goal progress engine — weight trend vs goal thresholds
// TODO: implement per lld-analytics.md + lld-body-metrics.md (trend.ts)
export async function buildGoalProgressSignal(_userId: string) {
  return { type: null, weight_status: "no_data", recent_avg_kg: null, kg_per_week: null, kg_to_goal: null, message: "Insufficient data" };
}
