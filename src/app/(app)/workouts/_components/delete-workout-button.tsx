"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface Props {
  sessionId: string;
  /** If provided, navigates here after a successful delete (detail page use).
   *  If omitted, calls onDeleted instead (list page use, removes the row in place). */
  redirectTo?: string;
  onDeleted?: () => void;
}

export function DeleteWorkoutButton({ sessionId, redirectTo, onDeleted }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setDeleting(false);
        setConfirming(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else onDeleted?.();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:inline">Delete?</span>
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs font-semibold text-danger px-2.5 py-1.5 rounded-lg bg-danger/10 disabled:opacity-60">
          {deleting ? "..." : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} disabled={deleting}
          className="text-xs font-semibold text-muted-foreground px-2.5 py-1.5 rounded-lg hover:bg-accent">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} aria-label="Delete workout"
      className="size-9 shrink-0 grid place-items-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors">
      <Trash2 className="size-4" />
    </button>
  );
}
