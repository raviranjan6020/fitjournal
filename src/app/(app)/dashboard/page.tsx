import { auth } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/service";
import { getCheckinForDate } from "@/modules/body-metrics/service";
import { computeWeightTrend } from "@/modules/body-metrics/trend";
import { isoDate } from "@/lib/utils";
import Link from "next/link";
import { InlineCheckin } from "./inline-checkin";

export default async function DashboardPage() {
  const session = await auth();
  const userId  = session!.user!.id as string;
  const today   = isoDate();

  const [profile, todayCheckin, trend] = await Promise.all([
    getUserProfile(userId),
    getCheckinForDate(userId, today),
    computeWeightTrend(userId, null).catch(() => null),
  ]);

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const goal      = profile?.goal;
  const prefs     = profile?.preferences;
  const checkedIn = !!(todayCheckin.bodyMetrics || todayCheckin.nutrition || todayCheckin.sleep);

  const trendStatus = trend?.status ?? "no_data";
  const statusColor = {
    on_track: "text-success",
    too_slow: "text-warning",
    too_fast: "text-danger",
    gaining:  "text-danger",
    drifting: "text-warning",
    no_data:  "text-muted-foreground",
  }[trendStatus];

  return (
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <header className="bg-surface px-5 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight mt-0.5">Hi, {firstName} 👋</h1>
          </div>
          <Link href="/settings"
            className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm ring-1 ring-black/10">
            {(profile?.name ?? "?").slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">

        {/* Goal card */}
        {goal ? (
          <section className="bg-surface p-5 rounded-2xl ring-1 ring-black/5 space-y-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Goal: {goal.goalType.replace(/_/g, " ")}
                </h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-semibold">
                    {todayCheckin.bodyMetrics?.weightKg
                      ? `${Number(todayCheckin.bodyMetrics.weightKg)}kg`
                      : trend?.recent_avg_kg ? `${trend.recent_avg_kg}kg` : "—"}
                  </span>
                  {goal.targetWeightKg && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-2xl font-semibold text-muted-foreground/70">{goal.targetWeightKg}kg</span>
                    </>
                  )}
                </div>
              </div>
              {trendStatus !== "no_data" ? (
                <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusColor} bg-muted`}>
                  {trendStatus.replace(/_/g, " ")}
                </span>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full text-muted-foreground bg-muted">
                  Tracking
                </span>
              )}
            </div>
            {/* Show trend message when available, else show days logged */}
            {trendStatus !== "no_data" && trend?.message ? (
              <p className="text-xs text-muted-foreground">{trend.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {trend && trend.data_points > 0
                  ? `${trend.data_points} weigh-ins logged. Trend unlocks after ${Math.max(0, 8 - trend.data_points)} more.`
                  : "Log your weight daily to track progress."}
              </p>
            )}
          </section>
        ) : (
          <section className="bg-accent p-5 rounded-2xl ring-1 ring-primary/10">
            <p className="text-sm font-medium">No goal set.</p>
            <Link href="/onboarding?force=1" className="text-sm font-semibold text-primary mt-1 block">Set your goal →</Link>
          </section>
        )}

        {/* Today check-in — inline form (Lovable spec: dark card, 2x2 grid) */}
        {checkedIn ? (
          <section className="bg-success/10 border border-success/20 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-success">Today&apos;s check-in done ✓</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {todayCheckin.bodyMetrics?.weightKg && `${Number(todayCheckin.bodyMetrics.weightKg)}kg  `}
                {todayCheckin.nutrition?.proteinG && `${todayCheckin.nutrition.proteinG}g protein  `}
                {todayCheckin.sleep?.hours && `${Number(todayCheckin.sleep.hours)}h sleep`}
              </p>
            </div>
            <Link href="/checkin" className="text-xs font-semibold text-primary">Edit</Link>
          </section>
        ) : (
          <InlineCheckin proteinTarget={prefs?.proteinTargetG ? Number(prefs.proteinTargetG) : 134} waterTarget={prefs?.waterTargetL ? Number(prefs.waterTargetL) : 2.5} />
        )}

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Weight" value={trend?.recent_avg_kg ? `${trend.recent_avg_kg}kg` : "—"} />
          <StatCard label="Protein" value={todayCheckin.nutrition?.proteinG ? `${todayCheckin.nutrition.proteinG}g` : "—"}
            target={prefs?.proteinTargetG ? `/${Number(prefs.proteinTargetG)}g` : undefined} />
          <StatCard label="Sleep" value={todayCheckin.sleep?.hours ? `${Number(todayCheckin.sleep.hours)}h` : "—"} />
        </section>

      </div>
    </div>
  );
}

function StatCard({ label, value, target }: { label: string; value: string; target?: string }) {
  return (
    <div className="bg-surface p-3 rounded-xl ring-1 ring-black/5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold mt-0.5">
        {value}
        {target && <span className="text-xs text-muted-foreground font-normal">{target}</span>}
      </p>
    </div>
  );
}
