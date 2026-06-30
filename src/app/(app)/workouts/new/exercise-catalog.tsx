"use client";

import { useState, useEffect } from "react";
import { Search, X, Check } from "lucide-react";

interface Exercise { id: string; name: string; muscleGroups: string[]; equipment: string | null }

const MUSCLES = ["chest","back","legs","shoulders","biceps","triceps","core","cardio","glutes","hamstrings","quads","calves"];

interface Props {
  added: string[];
  onAdd: (exercises: { id: string; name: string }[]) => void;
  onClose: () => void;
}

export function ExerciseCatalog({ added, onAdd, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [q,         setQ]         = useState("");
  const [muscle,    setMuscle]    = useState("");
  const [selected,  setSelected]  = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/exercises")
      .then(r => r.json())
      .then(setExercises);
  }, []);

  const filtered = exercises.filter(e => {
    const mQ = !q || e.name.toLowerCase().includes(q.toLowerCase());
    const mM = !muscle || e.muscleGroups.includes(muscle);
    return mQ && mM;
  });

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function confirm() {
    const toAdd = exercises.filter(e => selected.has(e.id));
    onAdd(toAdd);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative mt-auto w-full bg-background rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 shrink-0" />

        {/* Header */}
        <div className="px-5 pb-3 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Exercise Catalog</h2>
            <p className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select exercises to add"}
            </p>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center text-muted-foreground"><X className="size-4" /></button>
        </div>

        {/* Search + filters */}
        <div className="px-5 py-3 space-y-2 shrink-0">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            <button onClick={() => setMuscle("")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!muscle ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border"}`}>
              All
            </button>
            {MUSCLES.map(m => (
              <button key={m} onClick={() => setMuscle(muscle === m ? "" : m)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${muscle === m ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable exercise list — extra bottom padding for CTA */}
        <div className={`flex-1 overflow-y-auto px-4 space-y-2 ${selected.size > 0 ? "pb-24" : "pb-6"}`}>
          {filtered.map(ex => {
            const isAdded    = added.includes(ex.id);
            const isSelected = selected.has(ex.id);
            return (
              <button key={ex.id} onClick={() => !isAdded && toggle(ex.id)}
                disabled={isAdded}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors min-h-[56px] ${
                  isAdded    ? "bg-muted opacity-50 cursor-not-allowed" :
                  isSelected ? "bg-primary/10 ring-2 ring-primary" :
                               "bg-surface ring-1 ring-black/5 active:bg-accent"
                }`}>
                <span className={`shrink-0 size-5 rounded-md border-2 grid place-items-center transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}>
                  {isSelected && <Check className="size-3 text-primary-foreground" />}
                  {isAdded && <Check className="size-3 text-muted-foreground" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize truncate">
                    {ex.muscleGroups.slice(0,2).join(", ")} · {ex.equipment}
                  </p>
                </div>
                {isAdded && <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0">Added</span>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No exercises found.</p>
          )}
        </div>

        {/* Fixed CTA — always visible, above safe area */}
        {selected.size > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button onClick={confirm}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform">
              Add {selected.size} Exercise{selected.size > 1 ? "s" : ""} to Workout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
