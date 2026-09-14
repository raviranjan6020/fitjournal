import { auth } from "@/lib/auth";
import { getSessionWithExercises } from "@/modules/workouts/service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { DeleteWorkoutButton } from "../_components/delete-workout-button";

function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const userId  = session!.user!.id as string;

  const workout = await getSessionWithExercises(userId, id);
  if (!workout) notFound();

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.filter(s => !s.isWarmup).length, 0);
  const totalVolume = workout.exercises.reduce((v, e) =>
    v + e.sets.filter(s => !s.isWarmup).reduce((sv, s) => sv + Number(s.weightKg) * s.reps, 0), 0);

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/workouts" className="size-9 -ml-1 shrink-0 grid place-items-center text-muted-foreground">
              <ChevronLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate capitalize">
                {workout.name ?? workout.workoutType.replace("_", " ")}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                {workout.date}{workout.durationMin ? ` · ${workout.durationMin} min` : ""}
              </p>
            </div>
          </div>
          <DeleteWorkoutButton
            sessionId={workout.id}
            workoutName={workout.name ?? workout.workoutType.replace("_", " ")}
            redirectTo="/workouts"
          />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Exercises" value={String(workout.exercises.length)} />
          <MiniStat label="Sets" value={String(totalSets)} />
          <MiniStat label="Volume" value={`${totalVolume.toLocaleString()}kg`} />
        </div>

        {workout.exercises.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold">No exercises logged</p>
            <p className="text-sm text-muted-foreground mt-1">This workout has no exercises or sets.</p>
          </div>
        ) : (
          workout.exercises.map(ex => (
            <section key={ex.id} className="bg-surface rounded-2xl ring-1 ring-black/5 overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm">{ex.name}</h3>
                <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {ex.muscleGroups.slice(0, 2).join(", ")}
                </p>
              </div>
              {ex.sets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No sets logged.</p>
              ) : (
                <div className="divide-y divide-border">
                  {ex.sets.map(s => {
                    // Best working set in *this* session for this exercise — a display
                    // hint, not the same all-time PR check as pr-detector.ts (which runs
                    // at log time against full history). Labelled "Top set" to avoid
                    // implying it's a lifetime record.
                    const isTopSet = !s.isWarmup && ex.sets
                      .filter(x => !x.isWarmup)
                      .every(x => e1rm(Number(x.weightKg), x.reps) <= e1rm(Number(s.weightKg), s.reps));
                    return (
                      <div key={s.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <span className={`w-5 text-xs font-bold text-center shrink-0 ${s.isWarmup ? "text-warning" : "text-muted-foreground"}`}>
                          {s.isWarmup ? "W" : s.setNumber}
                        </span>
                        <span className="font-mono flex-1">
                          {Number(s.weightKg)}kg × {s.reps}
                          {s.rpe && <span className="text-muted-foreground"> @ RPE {Number(s.rpe)}</span>}
                        </span>
                        {isTopSet && ex.sets.filter(x => !x.isWarmup).length > 1 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase shrink-0">
                            <Trophy className="size-3" /> Top set
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3 rounded-xl ring-1 ring-black/5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-semibold font-mono mt-0.5">{value}</p>
    </div>
  );
}
