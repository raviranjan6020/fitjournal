import { auth } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/service";
import { getCheckinForDate } from "@/modules/body-metrics/service";
import { getOrBuildSnapshot } from "@/modules/analytics/service";
import { listSessions } from "@/modules/workouts/service";
import { isoDate } from "@/lib/utils";
import Link from "next/link";
import { Flame, Dumbbell, Beef, ArrowRight, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { InlineCheckin } from "./inline-checkin";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default async function DashboardPage() {
  const session  = await auth();
  const userId   = session!.user!.id as string;
  const today    = isoDate();

  const [profile, todayCheckin, snapshot, recentSessions] = await Promise.all([
    getUserProfile(userId),
    getCheckinForDate(userId, today),
    getOrBuildSnapshot(userId).catch(() => null),
    listSessions(userId, 1, 0),
  ]);

  const initials     = (profile?.name ?? "?").slice(0, 2).toUpperCase();
  const goal         = profile?.goal;
  const prefs        = profile?.preferences;
  const checkedIn    = !!(todayCheckin.bodyMetrics || todayCheckin.nutrition || todayCheckin.sleep);
  const lastSession  = recentSessions[0] ?? null;

  const content    = snapshot?.content as Record<string, unknown> | null;
  const goalSignal = content?.goal as { weight_status: string; recent_avg_kg: number | null; kg_per_week: number | null; kg_to_goal: number | null; message: string } | null;
  const strength   = (content?.strength as { exercise: string; name: string; status: string; change_kg: number | null }[]) ?? [];
  const consistency = content?.consistency as { workouts_this_week: number; streak_days: number; target_per_week: number; avg_per_week_4w: number } | null;

  const weeklyTarget   = Number(prefs?.weeklyWorkoutTarget ?? 4);
  const workoutsThisWk = consistency?.workouts_this_week ?? 0;
  const weeklyPct      = Math.min(100, Math.round((Math.min(workoutsThisWk, weeklyTarget) / weeklyTarget) * 100));
  const progressPct    = goal?.startWeightKg && goal?.targetWeightKg && goalSignal?.recent_avg_kg
    ? Math.min(100, Math.max(0, ((Number(goal.startWeightKg) - goalSignal.recent_avg_kg) / (Number(goal.startWeightKg) - Number(goal.targetWeightKg))) * 100))
    : 0;

  const weeklySegments = Array.from({ length: weeklyTarget }, (_, i) => i < workoutsThisWk);

  const toneClass = { improving: "text-success", stalled: "text-warning", regressed: "text-danger", no_data: "text-muted-foreground" };

  return (
    <div className="min-h-dvh bg-background text-foreground font-sans">
      <div className="max-w-md mx-auto px-5 pt-6 pb-28 space-y-6">

        {/* Brand header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-sm grid place-items-center">
              <div className="w-3.5 h-3.5 bg-background rotate-45" />
            </div>
            <h1 className="text-lg font-bold tracking-tight italic">
              <span className="underline decoration-primary decoration-2 underline-offset-4">FITJOURNAL</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/settings" aria-label="Settings"
              className="size-10 rounded-full border border-border bg-surface grid place-items-center text-xs font-semibold text-muted-foreground">
              {initials}
            </Link>
          </div>
        </header>

        {/* Weekly goal card */}
        <section className="bg-surface border border-border rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Weekly Goal</p>
              <h2 className="text-2xl font-bold tracking-tight">
                {Math.min(workoutsThisWk, weeklyTarget)} of {weeklyTarget} Workouts
              </h2>
            </div>
            <p className="text-sm font-semibold text-primary font-mono">{weeklyPct}%</p>
          </div>

          {/* Segmented bar */}
          <div className="flex gap-1.5">
            {weeklySegments.map((filled, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${filled ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {/* Weight sub-line */}
          {goal && (
            <div className="mt-5 pt-4 border-t border-border flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {goal.goalType.replace(/_/g, " ")}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono">{goalSignal?.recent_avg_kg ?? "—"}</span>
                  <span className="text-muted-foreground text-sm">→</span>
                  <span className="text-sm text-muted-foreground font-mono">{goal.targetWeightKg ?? "—"}kg</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {goalSignal?.kg_per_week ? `${goalSignal.kg_per_week}kg / wk` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {goalSignal?.kg_to_goal ? `~${Math.round(goalSignal.kg_to_goal / Math.abs(goalSignal.kg_per_week ?? 1))}w left` : "tracking"}
                </p>
              </div>
            </div>
          )}
          {progressPct > 0 && (
            <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard icon={Flame}    label="Streak"   value={String(consistency?.streak_days ?? 0)}   unit="d" />
          <StatCard icon={Dumbbell} label="This wk"  value={String(workoutsThisWk)} unit={`/${weeklyTarget}`} />
          <StatCard icon={Beef}     label="Protein"  value={todayCheckin.nutrition?.proteinG ? String(todayCheckin.nutrition.proteinG) : "—"} unit="g" />
        </section>

        {/* Check-in */}
        {checkedIn ? (
          <section className="bg-success/10 border border-success/20 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-success">Today&apos;s check-in done ✓</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {todayCheckin.bodyMetrics?.weightKg && `${Number(todayCheckin.bodyMetrics.weightKg)}kg  `}
                {todayCheckin.nutrition?.proteinG && `${todayCheckin.nutrition.proteinG}g protein`}
              </p>
            </div>
            <Link href="/checkin" className="text-xs font-semibold text-primary">Edit</Link>
          </section>
        ) : (
          <InlineCheckin
            proteinTarget={prefs?.proteinTargetG ? Number(prefs.proteinTargetG) : 134}
            waterTarget={prefs?.waterTargetL ? Number(prefs.waterTargetL) : 2.5}
          />
        )}

        {/* Last workout */}
        {lastSession && (
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Workout</h3>
              <span className="text-[10px] text-muted-foreground font-mono uppercase">{lastSession.date}</span>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0">
                  <h4 className="font-semibold">{lastSession.name ?? lastSession.workoutType.replace("_"," ") + " Session"}</h4>
                </div>
                <span className="ml-3 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight capitalize">
                  {lastSession.workoutType.replace("_"," ")}
                </span>
              </div>
              <Link href="/workouts/new"
                className="w-full py-2.5 px-3 bg-background border border-border hover:border-muted-foreground text-sm font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition">
                Log Today&apos;s Workout <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </section>
        )}

        {!lastSession && (
          <Link href="/workouts/new"
            className="block bg-surface border border-border p-5 rounded-2xl text-center space-y-1 hover:border-primary transition">
            <p className="text-sm font-semibold">Log your first workout</p>
            <p className="text-xs text-muted-foreground">Start tracking your training →</p>
          </Link>
        )}

        {/* Strength snapshot */}
        {strength.length > 0 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Strength Snapshot</h3>
              <Link href="/progress" className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
                See all <ChevronRight className="size-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {strength.slice(0, 4).map(row => (
                <Link key={row.exercise} href={`/exercises/${row.exercise}`}
                  className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border hover:border-muted-foreground transition">
                  <span className="text-sm font-medium truncate">{row.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.status === "improving" ? <TrendingUp className="size-3.5 text-success" /> : <AlertTriangle className="size-3.5 text-warning" />}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${toneClass[row.status as keyof typeof toneClass] ?? "text-muted-foreground"}`}>
                      {row.change_kg !== null && row.change_kg !== 0 ? `${row.change_kg > 0 ? "+" : ""}${row.change_kg}kg` : row.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface border border-border p-3 rounded-xl">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className="font-mono text-lg font-semibold mt-1">
        {value}{unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}
