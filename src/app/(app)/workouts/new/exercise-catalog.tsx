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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-auto bg-background rounded-t-2xl max-h-[88dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-3 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Exercise Catalog</h2>
            <p className="text-xs text-muted-foreground">Select exercises to add</p>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center text-muted-foreground"><X className="size-4" /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 space-y-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1.5">
          {filtered.map(ex => {
            const isAdded    = added.includes(ex.id);
            const isSelected = selected.has(ex.id);
            return (
              <button key={ex.id} onClick={() => !isAdded && toggle(ex.id)}
                disabled={isAdded}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  isAdded   ? "bg-muted opacity-50 cursor-not-allowed" :
                  isSelected ? "bg-primary/10 ring-1 ring-primary" :
                               "bg-surface ring-1 ring-black/5 hover:ring-primary/30"
                }`}>
                <div>
                  <p className="text-sm font-medium">{ex.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{ex.muscleGroups.join(", ")} · {ex.equipment}</p>
                </div>
                {isAdded && <span className="text-[10px] font-semibold text-muted-foreground uppercase">Added</span>}
                {isSelected && !isAdded && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        {selected.size > 0 && (
          <div className="px-5 py-4 border-t border-border">
            <button onClick={confirm}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm">
              Add {selected.size} Exercise{selected.size > 1 ? "s" : ""} to Workout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
