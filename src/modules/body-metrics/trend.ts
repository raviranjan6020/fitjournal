import { db } from "@/db";
import { bodyMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { THRESHOLDS } from "@/lib/constants";
import type { GoalType } from "@/lib/constants";

export interface TrendResult {
  status: "on_track" | "too_fast" | "too_slow" | "gaining" | "drifting" | "no_data";
  recent_avg_kg: number | null;
  kg_per_week: number | null;
  pct_per_week: number | null;
  data_points: number;
  message: string;
}

export async function computeWeightTrend(userId: string, goalType: GoalType | null): Promise<TrendResult> {
  // Fetch last 90 days — enough for any window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db
    .select({ date: bodyMetrics.date, weightKg: bodyMetrics.weightKg })
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(bodyMetrics.date);

  const entries = rows
    .filter(r => r.weightKg && Number(r.weightKg) > 0 && r.date >= cutoffStr)
    .map(r => ({ date: r.date, weightKg: Number(r.weightKg) }));

  const noData: TrendResult = { status: "no_data", recent_avg_kg: null, kg_per_week: null, pct_per_week: null, data_points: entries.length, message: "Log weight for 2+ weeks to see your trend." };

  if (entries.length < THRESHOLDS.coldStart.minWeighIns) return noData;

  const first = entries[0].date;
  const last  = entries[entries.length - 1].date;
  const spanDays = (new Date(last).getTime() - new Date(first).getTime()) / 86400000;
  if (spanDays < THRESHOLDS.coldStart.minDays) return noData;

  const today = last;

  // Date-anchored windows — sparse-logging safe
  const recent   = entries.filter(e => e.date >  offsetDate(today, -7)).map(e => e.weightKg);
  const baseline = entries.filter(e => e.date >  offsetDate(today, -21) && e.date <= offsetDate(today, -14)).map(e => e.weightKg);

  if (!recent.length || !baseline.length) return noData;

  const recentAvg   = mean(recent);
  const baselineAvg = mean(baseline);
  const kgPerWeek   = (recentAvg - baselineAvg) / 2; // windows ~2 weeks apart
  const pctPerWeek  = (kgPerWeek / baselineAvg) * 100;

  const status = classifyTrend(kgPerWeek, pctPerWeek, goalType);
  const message = buildMessage(status, kgPerWeek, recentAvg, goalType);

  return { status, recent_avg_kg: round(recentAvg, 2), kg_per_week: round(kgPerWeek, 3), pct_per_week: round(pctPerWeek, 2), data_points: entries.length, message };
}

function classifyTrend(kgPerWeek: number, pctPerWeek: number, goal: GoalType | null): TrendResult["status"] {
  const g = goal ?? "maintain";

  if (g === "fat_loss") {
    if (pctPerWeek > 0.1)   return "gaining";
    if (pctPerWeek > -0.25) return "too_slow";
    if (pctPerWeek >= -1.0) return "on_track";
    return "too_fast";
  }
  if (g === "lean_bulk" || g === "muscle_gain" || g === "strength_gain" || g === "recomposition") {
    if (pctPerWeek < 0.1)  return "too_slow";
    if (pctPerWeek <= 0.5) return "on_track";
    return "too_fast";
  }
  // maintain
  return Math.abs(pctPerWeek) <= 0.2 ? "on_track" : "drifting";
}

function buildMessage(status: TrendResult["status"], kgPerWeek: number, recentAvg: number, goal: GoalType | null): string {
  const dir = kgPerWeek >= 0 ? `+${round(kgPerWeek, 2)}` : `${round(kgPerWeek, 2)}`;
  switch (status) {
    case "on_track":  return `${dir}kg/week — on track for ${goal ?? "your goal"}.`;
    case "too_fast":  return kgPerWeek < 0 ? `Losing ${Math.abs(round(kgPerWeek,2))}kg/week — too fast, risk losing muscle.` : `Gaining ${round(kgPerWeek,2)}kg/week — too fast, excess fat likely.`;
    case "too_slow":  return `${dir}kg/week — progress slower than target.`;
    case "gaining":   return `Weight trending up (+${round(kgPerWeek,2)}kg/week) — wrong direction for fat loss.`;
    case "drifting":  return `Weight drifting (${dir}kg/week). Aim to stay within ±0.2%/week.`;
    default:          return "Not enough data yet.";
  }
}

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function round(n: number, dp: number) { return Math.round(n * 10 ** dp) / 10 ** dp; }
function offsetDate(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
