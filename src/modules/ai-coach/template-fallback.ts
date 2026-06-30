/**
 * Template-based coach — answers common questions from analytics data.
 * No LLM needed. Used when OPENAI_API_KEY is not set.
 */

interface SnapshotContent {
  goal?: { type: string | null; weight_status: string; recent_avg_kg: number | null; kg_per_week: number | null; message: string };
  nutrition?: { protein_avg_g: number | null; protein_target_g: number; protein_status: string };
  sleep?: { avg_hours: number | null; status: string };
  consistency?: { workouts_this_week: number; avg_per_week_4w: number; streak_days: number; status: string };
  strength?: { name: string; status: string; change_kg: number | null; last_weight_kg: number | null }[];
  volume?: Record<string, { sets: number; status: string }>;
  plateaus?: { name: string; weeks_stalled: number }[];
}

export function templateAnswer(question: string, content: Record<string, unknown>): string {
  const s = content as SnapshotContent;
  const q = question.toLowerCase();

  // Stalled / plateau questions
  if (q.includes("stall") || q.includes("plateau") || q.includes("not progressing")) {
    if (s.plateaus?.length) {
      const p = s.plateaus[0];
      const sleepNote = s.sleep?.status === "low" ? ` Your sleep averages ${s.sleep.avg_hours}h — below 7h needed for recovery.` : "";
      const volumeNote = s.volume ? (() => {
        const low = Object.entries(s.volume).filter(([, v]) => v.status === "low");
        return low.length ? ` ${low[0][0]} volume is low (${low[0][1].sets} sets/week).` : "";
      })() : "";
      return `${p.name} has been stalled for ${p.weeks_stalled} weeks.${sleepNote}${volumeNote} Try changing rep range (e.g. 5×5 → 4×8) or adding 2-3 sets per week.`;
    }
    const stalled = s.strength?.filter(e => e.status === "stalled");
    if (stalled?.length) {
      return `${stalled[0].name} hasn't progressed recently. Consider a deload week, change rep scheme, or increase training frequency for that lift.`;
    }
    return "No exercises currently stalled based on your data. Keep pushing progressive overload.";
  }

  // Protein questions
  if (q.includes("protein") || q.includes("eating enough")) {
    if (!s.nutrition?.protein_avg_g) return "Not enough nutrition data yet. Log your daily protein to get insights.";
    const diff = s.nutrition.protein_avg_g - s.nutrition.protein_target_g;
    if (diff >= 0) return `You're hitting ${s.nutrition.protein_avg_g}g/day (target: ${s.nutrition.protein_target_g}g). Protein is adequate — keep it up.`;
    return `You're averaging ${s.nutrition.protein_avg_g}g/day, which is ${Math.abs(Math.round(diff))}g below your ${s.nutrition.protein_target_g}g target. Try adding a protein shake or extra serving of meat/eggs.`;
  }

  // Weight / bulk / cut questions
  if (q.includes("weight") || q.includes("bulk") || q.includes("losing") || q.includes("gaining") || q.includes("fat loss")) {
    if (!s.goal?.kg_per_week) return "Not enough weight data yet. Log daily for 2+ weeks to see trends.";
    return s.goal.message;
  }

  // Volume questions
  if (q.includes("volume") || q.includes("enough sets") || q.includes("training enough")) {
    if (!s.volume || !Object.keys(s.volume).length) return "Log workouts to see volume data.";
    const low    = Object.entries(s.volume).filter(([, v]) => v.status === "low").map(([m]) => m);
    const adequate = Object.entries(s.volume).filter(([, v]) => v.status === "adequate").map(([m]) => m);
    if (low.length) return `Volume is low for: ${low.join(", ")}. Aim for 10+ sets/week per muscle. Adequate: ${adequate.join(", ") || "none yet"}.`;
    return `Volume looks good across all muscle groups (${adequate.join(", ")}). All hitting 10+ sets/week.`;
  }

  // Sleep questions
  if (q.includes("sleep") || q.includes("recovery")) {
    if (!s.sleep?.avg_hours) return "Log sleep daily to get recovery insights.";
    if (s.sleep.status === "good") return `Sleep is good — averaging ${s.sleep.avg_hours}h/night (≥7h target). This supports recovery.`;
    return `Sleep averaging ${s.sleep.avg_hours}h — below the 7h minimum for optimal recovery. This may impact strength gains and fat loss. Prioritize 7-8h.`;
  }

  // Focus / what to do this week
  if (q.includes("focus") || q.includes("this week") || q.includes("should i")) {
    const tips: string[] = [];
    if (s.plateaus?.length) tips.push(`Address ${s.plateaus[0].name} stall — try rep range change.`);
    if (s.nutrition?.protein_status === "very_low" || s.nutrition?.protein_status === "low") tips.push(`Hit protein target (${s.nutrition.protein_target_g}g) on 5+ days.`);
    if (s.sleep?.status === "low") tips.push(`Prioritize 7h+ sleep.`);
    if (s.consistency?.status === "low") tips.push(`Hit your workout target this week.`);
    const lowVol = s.volume ? Object.entries(s.volume).filter(([, v]) => v.status === "low") : [];
    if (lowVol.length) tips.push(`Add volume for ${lowVol[0][0]}.`);
    if (!tips.length) tips.push("Stay consistent. Same plan as last week — it's working.");
    return `This week focus on:\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  }

  // Consistency / streak
  if (q.includes("consistent") || q.includes("streak") || q.includes("workout")) {
    if (!s.consistency) return "Log workouts to track consistency.";
    return `You've done ${s.consistency.workouts_this_week} workouts this week (${s.consistency.avg_per_week_4w}/wk avg over 4 weeks). Current streak: ${s.consistency.streak_days} days. Status: ${s.consistency.status}.`;
  }

  // Fallback
  return `Based on your data: ${s.goal?.message ?? "Keep logging to get more insights."} Ask me about protein, weight trend, volume, sleep, or specific exercises.`;
}
