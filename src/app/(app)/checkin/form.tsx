"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface Props {
  today: string;
  existing: { bodyMetrics: { weightKg?: string | null } | null; nutrition: { proteinG?: number | null; waterL?: string | null } | null; sleep: { hours?: string | null; quality?: number | null } | null };
  yesterdayWeight: number | null;
  proteinTarget: number;
  waterTarget: number;
}

export function CheckinForm({ today, existing, yesterdayWeight, proteinTarget, waterTarget }: Props) {
  const router  = useRouter();
  const [weight,  setWeight]  = useState(existing.bodyMetrics?.weightKg  ? String(Number(existing.bodyMetrics.weightKg)) : "");
  const [protein, setProtein] = useState(existing.nutrition?.proteinG    ? String(existing.nutrition.proteinG)  : "");
  const [water,   setWater]   = useState(existing.nutrition?.waterL      ? String(Number(existing.nutrition.waterL))    : "");
  const [sleep,   setSleep]   = useState(existing.sleep?.hours           ? String(Number(existing.sleep.hours)) : "");
  const [quality, setQuality] = useState(existing.sleep?.quality ?? 4);
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  async function save() {
    setError(null); setLoading(true);
    try {
      const body: Record<string, unknown> = { date: today };
      if (weight)  body.weightKg   = Number(weight);
      if (protein) body.proteinG   = Number(protein);
      if (water)   body.waterL     = Number(water);
      if (sleep)   body.sleepHours = Number(sleep);
      body.sleepQuality = quality;
      if (notes)   body.notes      = notes;

      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header — matches Lovable PageHeader */}
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="size-9 -ml-1 grid place-items-center text-muted-foreground hover:text-foreground">
              ←
            </button>
            <div>
              <h1 className="text-base font-semibold leading-tight">Daily Check-in</h1>
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{dateLabel}</p>

        {error && <p className="text-sm text-danger bg-danger/10 px-4 py-2 rounded-xl">{error}</p>}

        <Field label="Weight (kg)" hint={yesterdayWeight ? `Yesterday: ${yesterdayWeight}kg` : undefined}>
          <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="84.2" className={inp} />
        </Field>

        <Field label="Protein (g)" hint={`Target: ${proteinTarget}g`}>
          <input type="number" value={protein} onChange={e => setProtein(e.target.value)}
            placeholder={String(proteinTarget)} className={inp} />
        </Field>

        <Field label="Water (L)" hint={`Target: ${waterTarget}L`}>
          <input type="number" step="0.1" value={water} onChange={e => setWater(e.target.value)}
            placeholder={String(waterTarget)} className={inp} />
        </Field>

        <Field label="Sleep last night (h)">
          <input type="number" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)}
            placeholder="7.5" className={inp} />
        </Field>

        {/* Sleep quality */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sleep quality</span>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setQuality(n)} aria-label={`Quality ${n} of 5`}
                className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-colors ${
                  n <= quality ? "bg-primary text-primary-foreground" : "bg-surface ring-1 ring-border"
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <Field label="Notes (optional)">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            className={inp + " resize-none"} placeholder="Felt strong today..." />
        </Field>

        <button onClick={save} disabled={loading || saved}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {saved ? <><Check className="size-4" /> Saved!</> : loading ? "Saving…" : "Save Check-in"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inp = "w-full bg-surface border border-border rounded-lg px-3 py-3 text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none";
