/**
 * Goal Progress Engine
 * Delegates to weight trend engine, classifies vs goal-specific thresholds.
 * Returns recent_avg_kg so Reporting can compute week-over-week delta.
 */
import { computeWeightTrend } from "@/modules/body-metrics/trend";
import { getActiveGoal } from "@/modules/users/service";
import type { GoalType } from "@/lib/constants";

export interface GoalProgressSignal {
  type: string | null;
  weight_status: "on_track" | "too_fast" | "too_slow" | "gaining" | "drifting" | "no_data";
  recent_avg_kg: number | null;
  kg_per_week:   number | null;
  kg_to_goal:    number | null;   // always positive (absolute distance)
  message:       string;
}

export async function buildGoalProgressSignal(userId: string): Promise<GoalProgressSignal> {
  const goal  = await getActiveGoal(userId);
  const trend = await computeWeightTrend(userId, (goal?.goalType as GoalType) ?? null);

  if (trend.status === "no_data") {
    return {
      type:          goal?.goalType ?? null,
      weight_status: "no_data",
      recent_avg_kg: null,
      kg_per_week:   null,
      kg_to_goal:    null,
      message:       "Log weight for 2+ weeks to see goal progress.",
    };
  }

  const kgToGoal = goal?.targetWeightKg && trend.recent_avg_kg !== null
    ? Math.abs(Number(goal.targetWeightKg) - trend.recent_avg_kg)
    : null;

  return {
    type:          goal?.goalType ?? null,
    weight_status: trend.status as GoalProgressSignal["weight_status"],
    recent_avg_kg: trend.recent_avg_kg,
    kg_per_week:   trend.kg_per_week,
    kg_to_goal:    kgToGoal !== null ? Math.round(kgToGoal * 10) / 10 : null,
    message:       trend.message,
  };
}
