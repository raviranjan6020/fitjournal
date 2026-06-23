import { auth } from "@/lib/auth";
import { listSessions } from "@/modules/workouts/service";
import Link from "next/link";

export default async function WorkoutsPage() {
  const session  = await auth();
  const userId   = session!.user!.id as string;
  const sessions = await listSessions(userId, 20, 0);

  return (
    <div className="bg-background min-h-dvh">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-base font-semibold">Workouts</h1>
          <Link href="/workouts/new" className="text-sm font-semibold text-primary">+ Log</Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-base font-semibold">No workouts logged yet</p>
            <p className="text-sm text-muted-foreground">Start tracking your training.</p>
            <Link href="/workouts/new"
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold">
              Log First Workout
            </Link>
          </div>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="bg-surface p-4 rounded-2xl ring-1 ring-black/5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{s.name ?? s.workoutType.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.date}{s.durationMin ? ` · ${s.durationMin} min` : ""}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                  {s.workoutType.replace("_", " ")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
