"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Timer, Check, Trophy } from "lucide-react";
import { ExerciseCatalog } from "./exercise-catalog";

type Stage = "setup" | "active" | "complete";

type SetRow = { id?: string; w: string; r: string; done: boolean; isPR?: boolean; isWarmup?: boolean; saving?: boolean };
type ActiveExercise = {
  logId: string;
  exerciseId: string;
  name: string;
  lastSets: { weightKg: string; reps: number }[];
  sets: SetRow[];
};

const WORKOUT_TYPES = ["push","pull","legs","upper","lower","full_body","custom"] as const;
const DEFAULTS: Record<string, string[]> = {
  push:      ["Bench Press","Overhead Press","Incline Fly","Tricep Pushdown"],
  pull:      ["Barbell Row","Lat Pulldown","Face Pull","Dumbbell Curl"],
  legs:      ["Squat","Romanian Deadlift","Leg Press","Calf Raise"],
  upper:     ["Bench Press","Barbell Row","Overhead Press","Pull-up"],
  lower:     ["Squat","Romanian Deadlift","Lunges","Calf Raise"],
  full_body: ["Squat","Bench Press","Barbell Row","Plank"],
};

export function WorkoutLogger() {
  const router = useRouter();
  const [stage,     setStage]     = useState<Stage>("setup");
  const [type,      setType]      = useState("push");
  const [name,      setName]      = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [catalog,   setCatalog]   = useState(false);
  const [elapsedS,  setElapsed]   = useState(0);
  const [newPRs,    setNewPRs]    = useState<{ name: string; weightKg: number; reps: number }[]>([]);
  const [loading,   setLoading]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stage === "active") {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const elapsed = `${String(Math.floor(elapsedS / 60)).padStart(2,"0")}:${String(elapsedS % 60).padStart(2,"0")}`;

  async function startWorkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/workouts/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutType: type, name: name.trim() || undefined }),
      });
      const session = await res.json();
      setSessionId(session.id);

      const defaultNames = DEFAULTS[type] ?? [];
      if (defaultNames.length) {
        const libRes = await fetch("/api/exercises");
        const lib: { id: string; name: string; slug: string }[] = await libRes.json();
        const toAdd = lib.filter(e => defaultNames.includes(e.name));

        const seeded: ActiveExercise[] = [];
        for (const ex of toAdd) {
          const logRes = await fetch(`/api/workouts/sessions/${session.id}/exercises`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exerciseId: ex.id }),
          });
          const log = await logRes.json();
          const prefillRes = await fetch(`/api/exercises?lastSets=${ex.id}`);
          const lastSets = await prefillRes.json();
          seeded.push({ logId: log.id, exerciseId: ex.id, name: ex.name, lastSets, sets: [{ w: "", r: "", done: false }] });
        }
        setExercises(seeded);
      }
      setStage("active");
    } finally { setLoading(false); }
  }

  async function addExercisesFromCatalog(selected: { id: string; name: string }[]) {
    if (!sessionId) return;
    const added: ActiveExercise[] = [];
    for (const ex of selected) {
      if (exercises.find(e => e.exerciseId === ex.id)) continue;
      const logRes = await fetch(`/api/workouts/sessions/${sessionId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: ex.id }),
      });
      const log = await logRes.json();
      const prefillRes = await fetch(`/api/exercises?lastSets=${ex.id}`);
      const lastSets = await prefillRes.json();
      added.push({ logId: log.id, exerciseId: ex.id, name: ex.name, lastSets, sets: [{ w: "", r: "", done: false }] });
    }
    setExercises(prev => [...prev, ...added]);
    setCatalog(false);
  }

  function updateSet(eIdx: number, sIdx: number, field: "w" | "r", val: string) {
    setExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
      ...e,
      sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, [field]: val }),
    }));
  }

  async function submitSet(eIdx: number, sIdx: number) {
    const ex  = exercises[eIdx];
    const set = ex.sets[sIdx];

    // Already saved — don't double-submit
    if (set.done || set.saving || set.id) return;

    // Require both fields
    if (!set.w || !set.r) return;

    const weightKg = Number(set.w);
    const reps     = Number(set.r);
    if (isNaN(weightKg) || isNaN(reps) || weightKg <= 0 || reps <= 0) return;

    // Mark as saving to prevent double-tap
    setExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
      ...e, sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, saving: true }),
    }));

    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}/exercises/${ex.logId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg, reps, isWarmup: set.isWarmup ?? false }),
      });
      const saved = await res.json();
      if (saved.isPR) {
        setNewPRs(prev => [...prev, { name: ex.name, weightKg, reps }]);
      }
      setExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
        ...e,
        sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, done: true, saving: false, id: saved.id, isPR: saved.isPR }),
      }));
    } catch {
      // Reset saving state on error
      setExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
        ...e, sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, saving: false }),
      }));
    }
  }

  function addSet(eIdx: number, isWarmup = false) {
    setExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
      ...e,
      sets: [...e.sets, { w: "", r: "", done: false, isWarmup }],
    }));
  }

  async function finish() {
    if (sessionId) {
      await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMin: Math.max(1, Math.round(elapsedS / 60)) }),
      });
      if (timerRef.current) clearInterval(timerRef.current);
      setStage("complete");
    }
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (stage === "setup") return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="size-9 grid place-items-center text-muted-foreground"><X className="size-5" /></button>
          <p className="text-sm font-semibold">New Workout</p>
          <span className="w-9" />
        </div>
      </header>
      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <Field label="Workout type">
          <div className="flex flex-wrap gap-2">
            {WORKOUT_TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${type === t ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border text-foreground"}`}>
                {t.replace("_"," ")}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Name (optional)">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={`Monday ${type.replace("_"," ")}`} className={inp} />
        </Field>
        <p className="text-xs text-muted-foreground">Default exercises for {type.replace("_"," ")} will be added automatically.</p>
        <button onClick={startWorkout} disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm disabled:opacity-60">
          {loading ? "Starting..." : "Start Workout →"}
        </button>
      </div>
    </div>
  );

  // ── ACTIVE ─────────────────────────────────────────────────────────────────
  if (stage === "active") return (
    <div className="min-h-dvh bg-background pb-6">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="size-9 grid place-items-center text-muted-foreground"><X className="size-5" /></button>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize">{name || type.replace("_"," ")}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Timer className="size-3" />{elapsed}</p>
          </div>
          <button onClick={finish} className="text-sm font-semibold text-primary">Finish</button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-4">
        <button onClick={() => setCatalog(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2">
          <Plus className="size-4" /> Add Exercise
        </button>

        {exercises.map((ex, eIdx) => (
          <section key={ex.logId} className="bg-surface rounded-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">{ex.name}</h3>
              {ex.lastSets.length > 0 && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Last: {ex.lastSets.map(s => `${s.weightKg}×${s.reps}`).join(", ")}
                </p>
              )}
            </div>

            {/* Set rows */}
            <div className="divide-y divide-border">
              {ex.sets.map((s, sIdx) => (
                <div key={sIdx} className={`px-3 py-2.5 flex items-center gap-2 ${s.done ? "bg-success/5" : ""}`}>
                  <span className={`w-5 text-xs font-bold text-center shrink-0 ${s.isWarmup ? "text-warning" : "text-muted-foreground"}`}>
                    {s.isWarmup ? "W" : sIdx + 1}
                  </span>
                  <input type="number" inputMode="decimal" step="0.5" placeholder="kg" value={s.w}
                    onChange={e => updateSet(eIdx, sIdx, "w", e.target.value)}
                    disabled={s.done}
                    className="flex-1 min-w-0 bg-background rounded-lg px-2.5 py-2.5 text-sm font-mono text-center border border-border outline-none focus:border-primary disabled:opacity-60" />
                  <span className="text-muted-foreground text-sm shrink-0">×</span>
                  <input type="number" inputMode="numeric" placeholder="reps" value={s.r}
                    onChange={e => updateSet(eIdx, sIdx, "r", e.target.value)}
                    disabled={s.done}
                    className="flex-1 min-w-0 bg-background rounded-lg px-2.5 py-2.5 text-sm font-mono text-center border border-border outline-none focus:border-primary disabled:opacity-60" />
                  <button
                    onClick={() => submitSet(eIdx, sIdx)}
                    disabled={s.done || s.saving || !s.w || !s.r}
                    aria-label={s.done ? "Set saved" : "Save set"}
                    className={`size-10 shrink-0 rounded-lg grid place-items-center transition-colors ${
                      s.done   ? "bg-success text-white" :
                      s.saving ? "bg-warning/20 text-warning animate-pulse" :
                      (s.w && s.r) ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                    <Check className="size-4" />
                  </button>
                  {s.isPR && <span className="text-[10px] font-bold text-success uppercase shrink-0">PR</span>}
                </div>
              ))}
            </div>

            <div className="flex divide-x divide-border">
              <button onClick={() => addSet(eIdx, false)} className="flex-1 py-3 text-xs font-semibold text-primary hover:bg-accent">+ Set</button>
              <button onClick={() => addSet(eIdx, true)} className="flex-1 py-3 text-xs font-semibold text-warning hover:bg-accent">W+ Warmup</button>
            </div>
          </section>
        ))}

        <button onClick={finish}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm">
          Finish Workout
        </button>
      </div>

      {catalog && (
        <ExerciseCatalog
          added={exercises.map(e => e.exerciseId)}
          onAdd={addExercisesFromCatalog}
          onClose={() => setCatalog(false)}
        />
      )}
    </div>
  );

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  const totalSets = exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const totalVol  = exercises.reduce((n, e) =>
    n + e.sets.filter(s => s.done && s.w && s.r).reduce((v, s) => v + Number(s.w) * Number(s.r), 0), 0);

  return (
    <div className="min-h-dvh bg-background flex items-center">
      <div className="max-w-md mx-auto px-5 py-12 space-y-6 text-center w-full">
        <div className="size-20 rounded-3xl bg-success/10 text-success mx-auto grid place-items-center">
          <Trophy className="size-10" />
        </div>
        {newPRs.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold">New PR! 🎉</h2>
            {newPRs.map((pr, i) => (
              <p key={i} className="text-muted-foreground mt-1">{pr.name} — {pr.weightKg}kg × {pr.reps}</p>
            ))}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold">Workout Complete!</h2>
            <p className="text-muted-foreground mt-2">Great work.</p>
          </div>
        )}
        <div className="bg-surface rounded-2xl ring-1 ring-black/5 p-5 text-left space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
          <div className="space-y-2 text-sm">
            <Row k="Exercises" v={String(exercises.length)} />
            <Row k="Sets completed" v={String(totalSets)} />
            <Row k="Duration" v={`${Math.max(1, Math.round(elapsedS / 60))} min`} />
            <Row k="Total volume" v={`${totalVol.toLocaleString()} kg`} />
          </div>
        </div>
        <button onClick={() => router.push("/dashboard")}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold font-mono">{v}</dd>
    </div>
  );
}

const inp = "w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none";
