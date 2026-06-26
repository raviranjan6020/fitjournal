import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId   = session.user.id as string;

  // Find exercise by slug
  const [exercise] = await db
    .select({ id: exerciseLibrary.id, name: exerciseLibrary.name, slug: exerciseLibrary.slug, muscleGroups: exerciseLibrary.muscleGroups })
    .from(exerciseLibrary)
    .where(eq(exerciseLibrary.slug, slug))
    .limit(1);

  if (!exercise) return NextResponse.json({ error: "not found" }, { status: 404 });

  // All working sets for this user + exercise
  const rows = await db
    .select({
      sessionId:   workoutSessions.id,
      sessionDate: workoutSessions.date,
      weightKg:    workoutSets.weightKg,
      reps:        workoutSets.reps,
      isWarmup:    workoutSets.isWarmup,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions,     eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutExerciseLogs.exerciseId, exercise.id),
        eq(workoutSets.isWarmup, false),
      ),
    )
    .orderBy(desc(workoutSessions.date), asc(workoutSets.setNumber));

  // Group by session
  const sessionMap = new Map<string, { date: string; sets: { weightKg: number; reps: number }[] }>();
  for (const row of rows) {
    if (!sessionMap.has(row.sessionId)) {
      sessionMap.set(row.sessionId, { date: row.sessionDate, sets: [] });
    }
    sessionMap.get(row.sessionId)!.sets.push({ weightKg: Number(row.weightKg), reps: row.reps });
  }

  const sessions = [...sessionMap.values()].map(s => ({
    date:        s.date,
    sets:        s.sets.map(x => `${x.weightKg}×${x.reps}`).join(", "),
    best_e1rm:   Math.max(...s.sets.map(x => e1rm(x.weightKg, x.reps))),
    top_set:     s.sets.reduce((best, x) => x.weightKg > best.weightKg ? x : best, s.sets[0]),
  }));

  // Sparkline data (max weight per session, chronological)
  const chartData = [...sessions].reverse().map(s => s.top_set.weightKg);

  // PRs: best weight for common rep counts + estimated 1RM
  const allSets = rows.map(r => ({ weightKg: Number(r.weightKg), reps: r.reps }));
  const prs: Record<number, number> = {};
  for (const s of allSets) {
    if (!prs[s.reps] || s.weightKg > prs[s.reps]) prs[s.reps] = s.weightKg;
  }
  const bestE1rm   = allSets.length ? Math.max(...allSets.map(s => e1rm(s.weightKg, s.reps))) : 0;
  const best3rm    = prs[3]  ?? null;
  const best5rm    = prs[5]  ?? null;
  const best8rm    = prs[8]  ?? null;

  return NextResponse.json({
    exercise,
    sessions,
    chart_data: chartData,
    prs: {
      estimated_1rm: Math.round(bestE1rm * 10) / 10,
      "3rm": best3rm,
      "5rm": best5rm,
      "8rm": best8rm,
    },
    total_sessions: sessions.length,
    total_sets:     rows.length,
  });
}
