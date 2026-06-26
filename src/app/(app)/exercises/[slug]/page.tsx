import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  const { slug } = await params;
  const userId = session!.user!.id as string;

  const [exercise] = await db
    .select({ id: exerciseLibrary.id, name: exerciseLibrary.name, slug: exerciseLibrary.slug, muscleGroups: exerciseLibrary.muscleGroups })
    .from(exerciseLibrary)
    .where(eq(exerciseLibrary.slug, slug))
    .limit(1);

  if (!exercise) notFound();

  const rows = await db
    .select({ sessionId: workoutSessions.id, sessionDate: workoutSessions.date, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutExerciseLogs.exerciseId, exercise.id), eq(workoutSets.isWarmup, false)))
    .orderBy(desc(workoutSessions.date), asc(workoutSets.setNumber));

  function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

  const sessionMap = new Map<string, { date: string; sets: { weightKg: number; reps: number }[] }>();
  for (const row of rows) {
    if (!sessionMap.has(row.sessionId)) sessionMap.set(row.sessionId, { date: row.sessionDate, sets: [] });
    sessionMap.get(row.sessionId)!.sets.push({ weightKg: Number(row.weightKg), reps: row.reps });
  }
  const sessions = [...sessionMap.values()];
  const allSets  = rows.map(r => ({ weightKg: Number(r.weightKg), reps: r.reps }));
  const bestE1rm = allSets.length ? Math.max(...allSets.map(s => e1rm(s.weightKg, s.reps))) : 0;
  const prs: Record<number, number> = {};
  for (const s of allSets) if (!prs[s.reps] || s.weightKg > prs[s.reps]) prs[s.reps] = s.weightKg;
  const chartData = [...sessions].reverse().map(s => Math.max(...s.sets.map(x => x.weightKg)));

  // Sparkline
  const min = Math.min(...chartData, 0);
  const max = Math.max(...chartData, 1);
  const pts = chartData.map((v, i) => {
    const x = chartData.length < 2 ? 50 : (i / (chartData.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min)) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/progress" className="size-9 -ml-1 grid place-items-center text-muted-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold">{exercise.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{exercise.muscleGroups.slice(0,2).join(", ")}</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold">No history yet</p>
            <p className="text-sm text-muted-foreground mt-1">Log this exercise to see your progress.</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max weight per session</h3>
                {bestE1rm > 0 && (
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <TrendingUp className="size-3" /> e1RM {Math.round(bestE1rm)}kg
                  </span>
                )}
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
                {chartData.length > 1 && (
                  <>
                    <polyline points={`0,100 ${pts} 100,100`} fill="oklch(0.58 0.225 258 / 0.08)" stroke="none" />
                    <polyline points={pts} fill="none" stroke="oklch(0.58 0.225 258)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </div>

            {/* PRs */}
            <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Personal Records</h3>
              <dl className="space-y-2 text-sm">
                {bestE1rm > 0 && <PRRow label="Estimated 1RM" val={`${Math.round(bestE1rm * 10) / 10}kg`} />}
                {prs[3]  && <PRRow label="3 rep max"  val={`${prs[3]}kg`} />}
                {prs[5]  && <PRRow label="5 rep max"  val={`${prs[5]}kg`} />}
                {prs[8]  && <PRRow label="8 rep max"  val={`${prs[8]}kg`} />}
                {prs[10] && <PRRow label="10 rep max" val={`${prs[10]}kg`} />}
              </dl>
            </div>

            {/* Session log */}
            <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Sessions ({sessions.length})
              </h3>
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr] gap-2 items-baseline text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{s.date}</span>
                    <span className="font-mono text-xs truncate">{s.sets.map(x => `${x.weightKg}×${x.reps}`).join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PRRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-semibold">{val}</dd>
    </div>
  );
}
