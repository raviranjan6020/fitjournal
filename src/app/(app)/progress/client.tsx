"use client";

import { useState } from "react";
import { Flame, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

const tabs = ["Weight", "Strength", "Volume", "Consistency"] as const;
type Tab = typeof tabs[number];

interface GoalSignal { type: string | null; weight_status: string; recent_avg_kg: number | null; kg_per_week: number | null; kg_to_goal: number | null; message: string }
interface OverloadSignal { exercise: string; name: string; status: string; change_kg: number | null; last_weight_kg: number | null }
interface VolumeSignal { sets: number; status: "adequate" | "moderate" | "low" }
interface ConsistencySignal { workouts_this_week: number; avg_per_week_4w: number; streak_days: number; target_per_week: number; status: string }

interface Props {
  weightHistory: { date: string; kg: number }[];
  snapshot: Record<string, unknown>;
  sessionDates: string[];
}

export function ProgressClient({ weightHistory, snapshot, sessionDates }: Props) {
  const [tab, setTab] = useState<Tab>("Weight");

  const goal        = snapshot.goal        as GoalSignal       | null;
  const strength    = snapshot.strength    as OverloadSignal[] | undefined ?? [];
  const volume      = snapshot.volume      as Record<string, VolumeSignal> | undefined ?? {};
  const consistency = snapshot.consistency as ConsistencySignal | null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold">Progress</h1>
          <p className="text-xs text-muted-foreground">Trends &amp; analytics</p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 bg-surface p-1 rounded-xl ring-1 ring-black/5">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Weight"      && <WeightTab  weightHistory={weightHistory} goal={goal} />}
        {tab === "Strength"    && <StrengthTab strength={strength} />}
        {tab === "Volume"      && <VolumeTab  volume={volume} />}
        {tab === "Consistency" && <ConsistencyTab consistency={consistency} sessionDates={sessionDates} />}
      </div>
    </div>
  );
}

// ── Weight ────────────────────────────────────────────────────────────────────

function WeightTab({ weightHistory, goal }: { weightHistory: { date: string; kg: number }[]; goal: GoalSignal | null }) {
  const kgs = weightHistory.map(w => w.kg);
  const min = Math.min(...kgs, 0);
  const max = Math.max(...kgs, 1);
  const pts = kgs.map((v, i) => {
    const x = kgs.length < 2 ? 50 : (i / (kgs.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min)) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <>
      <Card>
        <h3 className="label mb-3">Weight ({weightHistory.length} entries)</h3>
        {kgs.length > 1 ? (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40">
              <polyline points={`0,100 ${pts} 100,100`} fill="oklch(0.58 0.225 258 / 0.08)" />
              <polyline points={pts} fill="none" stroke="oklch(0.58 0.225 258)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-2 font-mono">
              <span>{kgs[0]}kg</span><span>{kgs[kgs.length - 1]}kg</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Log weight daily to see chart.</p>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Current"  value={goal?.recent_avg_kg ? `${goal.recent_avg_kg}kg` : "—"} />
        <MiniStat label="Trend"    value={goal?.kg_per_week   ? `${goal.kg_per_week}kg/wk` : "—"} tone={goal?.weight_status === "on_track" ? "text-success" : goal?.weight_status === "no_data" ? "" : "text-warning"} />
        <MiniStat label="Target"   value={goal?.kg_to_goal !== null && goal?.kg_to_goal !== undefined ? `${goal.kg_to_goal}kg to go` : "—"} />
        <MiniStat label="Status"   value={goal?.weight_status ?? "—"} />
      </div>
      {goal?.message && <p className="text-xs text-muted-foreground">{goal.message}</p>}
    </>
  );
}

// ── Strength ──────────────────────────────────────────────────────────────────

function StrengthTab({ strength }: { strength: OverloadSignal[] }) {
  if (!strength.length) return (
    <Card><p className="text-sm text-muted-foreground text-center py-8">Log workouts to see strength trends.</p></Card>
  );

  return (
    <Card>
      <h3 className="label mb-4">Key lifts — session over session</h3>
      <div className="space-y-4">
        {strength.map(s => (
          <div key={s.exercise} className="flex items-center justify-between gap-3">
            <Link href={`/exercises/${s.exercise}`} className="text-sm font-medium hover:text-primary">{s.name}</Link>
            <div className="flex items-center gap-2 shrink-0">
              {s.status === "improving" ? (
                <TrendingUp className="size-4 text-success" />
              ) : s.status === "regressed" ? (
                <AlertTriangle className="size-4 text-danger" />
              ) : (
                <AlertTriangle className="size-4 text-warning" />
              )}
              <span className={`text-xs font-semibold font-mono ${s.status === "improving" ? "text-success" : s.status === "regressed" ? "text-danger" : "text-warning"}`}>
                {s.change_kg !== null && s.change_kg !== 0 ? `${s.change_kg > 0 ? "+" : ""}${s.change_kg}kg` : s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Volume ────────────────────────────────────────────────────────────────────

function VolumeTab({ volume }: { volume: Record<string, VolumeSignal> }) {
  const entries = Object.entries(volume).sort((a, b) => b[1].sets - a[1].sets);
  if (!entries.length) return (
    <Card><p className="text-sm text-muted-foreground text-center py-8">Log workouts to see volume data.</p></Card>
  );

  const barColor = { adequate: "bg-success", moderate: "bg-warning", low: "bg-danger" };
  const txtColor = { adequate: "text-success", moderate: "text-warning", low: "text-danger" };

  return (
    <Card>
      <h3 className="label mb-4">Sets per muscle — this week</h3>
      <div className="space-y-4">
        {entries.map(([muscle, v]) => (
          <div key={muscle} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium capitalize">{muscle}</span>
              <span className={`font-mono font-semibold text-xs ${txtColor[v.status]}`}>{v.sets} sets</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${barColor[v.status]} rounded-full`}
                style={{ width: `${Math.min(100, (v.sets / 15) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Consistency ───────────────────────────────────────────────────────────────

function ConsistencyTab({ consistency, sessionDates }: { consistency: ConsistencySignal | null; sessionDates: string[] }) {
  const dateSet = new Set(sessionDates);

  // Build last 56 days grid
  const days: { date: string; trained: boolean }[] = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, trained: dateSet.has(iso) });
  }

  return (
    <>
      {/* Streak card */}
      <Card>
        <div className="flex items-center gap-3">
          <Flame className="size-10 text-warning" />
          <div>
            <p className="text-2xl font-bold">{consistency?.streak_days ?? 0} days</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="This week" value={`${consistency?.workouts_this_week ?? 0} / ${consistency?.target_per_week ?? 4}`} />
        <MiniStat label="4-wk avg"  value={`${consistency?.avg_per_week_4w ?? 0} / wk`} />
      </div>
      {/* Heatmap */}
      <Card>
        <h3 className="label mb-3">Last 8 weeks</h3>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => (
            <div key={d.date} title={d.date}
              className={`aspect-square rounded-sm ${d.trained ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>8 weeks ago</span><span>Today</span>
        </div>
      </Card>
    </>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface p-5 rounded-2xl ring-1 ring-black/5 ${className ?? ""}`}>{children}</div>;
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="!p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${tone ?? ""}`}>{value}</p>
    </Card>
  );
}
