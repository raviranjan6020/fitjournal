import { auth } from "@/lib/auth";
import { getOrBuildSnapshot } from "@/modules/analytics/service";
import { db } from "@/db";
import { bodyMetrics, workoutSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProgressClient } from "./client";

export default async function ProgressPage() {
  const session = await auth();
  const userId  = session!.user!.id as string;

  const [snapshot, weightRows, sessionDates] = await Promise.all([
    getOrBuildSnapshot(userId),
    db.select({ date: bodyMetrics.date, weightKg: bodyMetrics.weightKg })
      .from(bodyMetrics)
      .where(eq(bodyMetrics.userId, userId))
      .orderBy(desc(bodyMetrics.date))
      .limit(30),
    db.select({ date: workoutSessions.date })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.date))
      .limit(56),
  ]);

  const weightHistory = weightRows
    .filter(r => r.weightKg)
    .reverse()
    .map(r => ({ date: r.date, kg: Number(r.weightKg) }));

  const content = snapshot.content as Record<string, unknown>;

  return (
    <ProgressClient
      weightHistory={weightHistory}
      snapshot={content}
      sessionDates={sessionDates.map(s => s.date)}
    />
  );
}
