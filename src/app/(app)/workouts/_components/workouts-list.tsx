"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteWorkoutButton } from "./delete-workout-button";

interface WorkoutRow {
  id: string;
  name: string | null;
  workoutType: string;
  date: string;
  durationMin: number | null;
}

export function WorkoutsList({ initialSessions }: { initialSessions: WorkoutRow[] }) {
  const [sessions, setSessions] = useState(initialSessions);

  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <div key={s.id} className="bg-surface p-4 rounded-2xl ring-1 ring-black/5 flex items-center gap-3">
          <Link href={`/workouts/${s.id}`} className="flex-1 min-w-0 flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="font-semibold capitalize truncate">{s.name ?? s.workoutType.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.date}{s.durationMin ? ` · ${s.durationMin} min` : ""}</p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              {s.workoutType.replace("_", " ")}
            </span>
          </Link>
          <DeleteWorkoutButton
            sessionId={s.id}
            onDeleted={() => setSessions(prev => prev.filter(x => x.id !== s.id))}
          />
        </div>
      ))}
    </div>
  );
}
