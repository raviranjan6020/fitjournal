/**
 * Weekly Report Builder
 * Takes an analytics snapshot → produces a report content object.
 * Priority logic for headline + recommendation.
 */

interface SnapshotContent {
  goal: { type: string | null; weight_status: string; recent_avg_kg: number | null; kg_per_week: number | null; kg_to_goal: number | null; message: string };
  nutrition: { protein_avg_g: number | null; protein_target_g: number; protein_status: string; water_avg_l: number | null; water_status: string };
  sleep: { avg_hours: number | null; status: string };
  consistency: { workouts_this_week: number; avg_per_week_4w: number; streak_days: number; target_per_week: number; status: string };
  strength: { exercise: string; name: string; status: string; change_kg: number | null; last_weight_kg: number | null }[];
  volume: Record<string, { sets: number; status: string }>;
  plateaus: { exercise: string; name: string; weeks_stalled: number; last_weight_kg: number | null }[];
  new_prs: { exercise: string; name: string; weight_kg: number; reps: number }[];
}

export interface ReportContent {
  period_label: string;
  headline: string;
  weight: { start_kg: number | null; end_kg: number | null; delta_kg: number | null; trend_status: string; message: string } | null;
  nutrition: { protein_avg_g: number | null; protein_target_g: number; protein_status: string; water_avg_l: number | null };
  sleep: { avg_hours: number | null; status: string };
  workouts: { count: number; streak: number; status: string };
  strength_highlights: { name: string; status: string; change_kg: number | null; weeks_stalled?: number }[];
  new_prs: { name: string; weight_kg: number; reps: number }[];
  volume_summary: { adequate: string[]; moderate: string[]; low: string[] };
  recommendation: string;
  alerts: string[];
}

export function buildWeeklyReport(
  snapshot: SnapshotContent,
  prevSnapshot: SnapshotContent | null,
  periodStart: string,
  _periodEnd: string,
): ReportContent {
  const periodLabel = `Week of ${formatDateShort(periodStart)}`;

  // Weight
  const weightStart = prevSnapshot?.goal?.recent_avg_kg ?? null;
  const weightEnd   = snapshot.goal?.recent_avg_kg ?? null;
  const deltaKg     = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null;

  // Volume summary
  const adequate: string[] = [];
  const moderate: string[] = [];
  const low: string[] = [];
  for (const [muscle, v] of Object.entries(snapshot.volume)) {
    if (v.status === "adequate") adequate.push(muscle);
    else if (v.status === "moderate") moderate.push(muscle);
    else low.push(muscle);
  }

  // Strength highlights (top 5)
  const strengthHighlights = [
    ...snapshot.strength.slice(0, 4).map(s => ({ name: s.name, status: s.status, change_kg: s.change_kg })),
    ...snapshot.plateaus.map(p => ({ name: p.name, status: "plateau" as string, change_kg: null, weeks_stalled: p.weeks_stalled })),
  ].slice(0, 5);

  // Headline (priority)
  const headline = buildHeadline(snapshot);
  const recommendation = buildRecommendation(snapshot);
  const alerts = buildAlerts(snapshot);

  return {
    period_label: periodLabel,
    headline,
    weight: weightEnd ? { start_kg: weightStart, end_kg: weightEnd, delta_kg: deltaKg, trend_status: snapshot.goal.weight_status, message: snapshot.goal.message } : null,
    nutrition: { protein_avg_g: snapshot.nutrition.protein_avg_g, protein_target_g: snapshot.nutrition.protein_target_g, protein_status: snapshot.nutrition.protein_status, water_avg_l: snapshot.nutrition.water_avg_l },
    sleep: snapshot.sleep,
    workouts: { count: snapshot.consistency.workouts_this_week, streak: snapshot.consistency.streak_days, status: snapshot.consistency.status },
    strength_highlights: strengthHighlights,
    new_prs: snapshot.new_prs.map(p => ({ name: p.name, weight_kg: p.weight_kg, reps: p.reps })),
    volume_summary: { adequate, moderate, low },
    recommendation,
    alerts,
  };
}

function buildHeadline(s: SnapshotContent): string {
  if (s.new_prs.length > 0) return `New PR on ${s.new_prs[0].name} this week! 🎉`;
  if (s.goal.weight_status === "on_track" && s.consistency.status === "good") return "Solid week — on track.";
  if (s.plateaus.length > 0) return `${s.plateaus[0].name} stalled ${s.plateaus[0].weeks_stalled} weeks. Needs attention.`;
  if (s.nutrition.protein_status === "very_low") return "Protein was below target most days.";
  return "Here's your weekly summary.";
}

function buildRecommendation(s: SnapshotContent): string {
  if (s.plateaus.length > 0) return `${s.plateaus[0].name} has stalled — try a rep range change (e.g. 4×8 → 5×5).`;
  if (s.goal.weight_status === "too_fast" && s.goal.type === "lean_bulk") return "Reduce calories slightly. Aim for 0.25–0.4% gain/week.";
  if (s.goal.weight_status === "too_slow" && s.goal.type === "fat_loss") return "Slight deficit increase or add one cardio session.";
  if (s.nutrition.protein_status === "very_low") return `Hit protein target ${s.nutrition.protein_target_g}g on 5/7 days this week.`;
  const lowMuscles = Object.entries(s.volume).filter(([, v]) => v.status === "low").map(([m]) => m);
  if (lowMuscles.length > 0) return `${capitalize(lowMuscles[0])} volume low. Add 2–4 sets next week.`;
  if (s.consistency.status === "low") return `Aim for ${s.consistency.target_per_week} workouts this week.`;
  return "Keep it up. Same plan next week.";
}

function buildAlerts(s: SnapshotContent): string[] {
  const alerts: string[] = [];
  if (s.goal.weight_status === "too_fast") alerts.push("Weight changing too fast — adjust intake.");
  if (s.nutrition.protein_status === "very_low") alerts.push(`Protein very low (${s.nutrition.protein_avg_g}g vs ${s.nutrition.protein_target_g}g target).`);
  if (s.sleep.status === "low" && s.sleep.avg_hours) alerts.push(`Average sleep ${s.sleep.avg_hours}h — below 7h target.`);
  for (const p of s.plateaus) alerts.push(`${p.name} stalled ${p.weeks_stalled} weeks.`);
  return alerts;
}

function formatDateShort(date: string) {
  const d = new Date(date + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
