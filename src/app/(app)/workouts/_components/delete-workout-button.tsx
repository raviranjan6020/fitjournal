"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";

interface Props {
  sessionId: string;
  workoutName: string;
  /** If provided, navigates here after a successful delete (detail page use).
   *  If omitted, calls onDeleted instead (list page use, removes the row in place). */
  redirectTo?: string;
  onDeleted?: () => void;
}

export function DeleteWorkoutButton({ sessionId, workoutName, redirectTo, onDeleted }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setDeleting(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else onDeleted?.();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} aria-label="Delete workout"
        className="size-9 shrink-0 grid place-items-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors">
        <Trash2 className="size-4" />
      </button>

      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5" onClick={() => !deleting && setConfirming(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-surface ring-1 ring-border rounded-3xl p-6 space-y-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="size-11 rounded-2xl bg-danger/10 text-danger grid place-items-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <button onClick={() => setConfirming(false)} disabled={deleting} aria-label="Cancel"
                className="size-8 -mr-1 -mt-1 grid place-items-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <div>
              <h2 className="text-base font-semibold">Delete this workout?</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {workoutName} and all its logged sets will be permanently removed. This can&apos;t be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-background ring-1 ring-border text-foreground hover:bg-accent transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-danger text-danger-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
