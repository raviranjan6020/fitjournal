"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InlineCheckin({ proteinTarget, waterTarget }: { proteinTarget: number; waterTarget: number }) {
  const router  = useRouter();
  const [weight,  setWeight]  = useState("");
  const [protein, setProtein] = useState("");
  const [water,   setWater]   = useState("");
  const [sleep,   setSleep]   = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const body: Record<string, unknown> = {};
    if (weight)  body.weightKg   = Number(weight);
    if (protein) body.proteinG   = Number(protein);
    if (water)   body.waterL     = Number(water);
    if (sleep)   body.sleepHours = Number(sleep);

    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    router.refresh(); // re-render dashboard with new data
  }

  const fields = [
    { label: "Weight (kg)", placeholder: "84.1", value: weight, set: setWeight },
    { label: "Protein (g)", placeholder: String(proteinTarget), value: protein, set: setProtein },
    { label: "Water (L)",   placeholder: String(waterTarget),   value: water,   set: setWater  },
    { label: "Sleep (h)",   placeholder: "7.5",                 value: sleep,   set: setSleep  },
  ];

  return (
    <section className="bg-surface border border-border p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today&apos;s Check-in</h3>
        <span className="text-[10px] text-muted-foreground font-mono uppercase">~30 sec</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.label} className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">{f.label}</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder={f.placeholder}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save Check-in"}
      </button>
    </section>
  );
}
