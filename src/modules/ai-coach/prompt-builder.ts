/**
 * Prompt Builder — converts analytics snapshot into concise system prompt.
 * Budget: ~500 tokens for system prompt. Keeps it structured + scannable for LLM.
 */

interface SnapshotContent {
  goal?: { type: string | null; weight_status: string; recent_avg_kg: number | null; kg_per_week: number | null; kg_to_goal: number | null; message: string };
  nutrition?: { protein_avg_g: number | null; protein_target_g: number; protein_status: string; water_avg_l: number | null; water_status: string };
  sleep?: { avg_hours: number | null; status: string };
  consistency?: { workouts_this_week: number; avg_per_week_4w: number; streak_days: number; target_per_week: number; status: string };
  strength?: { exercise: string; name: string; status: string; change_kg: number | null; last_weight_kg: number | null }[];
  volume?: Record<string, { sets: number; status: string }>;
  plateaus?: { exercise: string; name: string; weeks_stalled: number; last_weight_kg: number | null }[];
  new_prs?: { exercise: string; name: string; weight_kg: number; reps: number }[];
}

export function buildSystemPrompt(content: Record<string, unknown>): string {
  const s = content as SnapshotContent;

  const sections: string[] = [];

  // Goal
  if (s.goal) {
    sections.push(`GOAL: ${s.goal.type ?? "not set"} — Status: ${s.goal.weight_status}
Weight trend: ${s.goal.kg_per_week ?? "N/A"} kg/week | Current: ${s.goal.recent_avg_kg ?? "?"}kg | To goal: ${s.goal.kg_to_goal ?? "?"}kg`);
  }

  // Nutrition
  if (s.nutrition) {
    sections.push(`NUTRITION (7d avg):
Protein: ${s.nutrition.protein_avg_g ?? "?"}g / ${s.nutrition.protein_target_g}g target — ${s.nutrition.protein_status}
Water: ${s.nutrition.water_avg_l ?? "?"}L — ${s.nutrition.water_status}`);
  }

  // Sleep
  if (s.sleep) {
    sections.push(`SLEEP: ${s.sleep.avg_hours ?? "?"}h avg — ${s.sleep.status}`);
  }

  // Consistency
  if (s.consistency) {
    sections.push(`CONSISTENCY: ${s.consistency.workouts_this_week} workouts this week | ${s.consistency.avg_per_week_4w}/wk (4-wk avg) | ${s.consistency.streak_days}d streak — ${s.consistency.status}`);
  }

  // Strength
  if (s.strength?.length) {
    const lines = s.strength.slice(0, 6).map(ex =>
      `  ${ex.name}: ${ex.status}${ex.change_kg ? ` (${ex.change_kg > 0 ? "+" : ""}${ex.change_kg}kg)` : ""} @ ${ex.last_weight_kg ?? "?"}kg`
    );
    sections.push(`STRENGTH:\n${lines.join("\n")}`);
  }

  // Volume
  if (s.volume && Object.keys(s.volume).length) {
    const entries = Object.entries(s.volume).map(([m, v]) => `${m}: ${v.sets} sets (${v.status})`);
    sections.push(`VOLUME (sets/muscle/week): ${entries.join(", ")}`);
  }

  // Plateaus
  if (s.plateaus?.length) {
    sections.push(`PLATEAUS: ${s.plateaus.map(p => `${p.name} stalled ${p.weeks_stalled}w`).join(", ")}`);
  }

  // PRs
  if (s.new_prs?.length) {
    sections.push(`NEW PRs: ${s.new_prs.map(p => `${p.name} ${p.weight_kg}kg×${p.reps}`).join(", ")}`);
  }

  return `You are FitJournal Coach — a direct, data-driven fitness advisor.

Here is the user's analytics for the past week:

${sections.join("\n\n")}

---
Rules:
- Answer ONLY based on the data above. Do not hallucinate trends not present.
- Be direct. 2–4 sentences unless the question requires more.
- If data is insufficient to answer, say so clearly.
- If the question is outside fitness/nutrition/recovery scope, politely decline.
- Use specific numbers from the data when making recommendations.`;
}
