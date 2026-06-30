import { auth } from "@/lib/auth";
import { getReport, markReportRead } from "@/modules/reporting/service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, TrendingUp, AlertTriangle, MessageSquare } from "lucide-react";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const report  = await getReport(session!.user!.id as string, id);
  if (!report) notFound();

  if (!report.isRead) await markReportRead(session!.user!.id as string, id);

  const c = report.content as {
    period_label: string; headline: string;
    weight: { start_kg: number | null; end_kg: number | null; delta_kg: number | null; trend_status: string; message: string } | null;
    nutrition: { protein_avg_g: number | null; protein_target_g: number; protein_status: string; water_avg_l: number | null };
    sleep: { avg_hours: number | null; status: string };
    workouts: { count: number; streak: number; status: string };
    strength_highlights: { name: string; status: string; change_kg: number | null; weeks_stalled?: number }[];
    new_prs: { name: string; weight_kg: number; reps: number }[];
    volume_summary: { adequate: string[]; moderate: string[]; low: string[] };
    recommendation: string;
    alerts: string[];
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/reports" className="size-9 -ml-1 grid place-items-center text-muted-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold">{c.period_label}</h1>
            <p className="text-xs text-muted-foreground">Weekly report</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* Headline */}
        <div className="bg-primary text-primary-foreground p-5 rounded-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Headline</p>
          <p className="text-lg font-semibold mt-1">{c.headline}</p>
        </div>

        {/* Weight */}
        {c.weight && (
          <Card>
            <h3 className="label">Weight</h3>
            <p className="text-xl font-semibold mt-1">
              {c.weight.start_kg ?? "—"} → {c.weight.end_kg}kg
              {c.weight.delta_kg !== null && (
                <span className={`text-sm font-mono ml-2 ${c.weight.delta_kg <= 0 ? "text-success" : "text-warning"}`}>
                  {c.weight.delta_kg > 0 ? "+" : ""}{c.weight.delta_kg}kg
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{c.weight.message}</p>
          </Card>
        )}

        {/* Workouts + Protein */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="!p-4">
            <p className="label">Workouts</p>
            <p className="text-xl font-semibold mt-1">{c.workouts.count}</p>
            <p className="text-[11px] text-muted-foreground">{c.workouts.streak}d streak</p>
          </Card>
          <Card className="!p-4">
            <p className="label">Protein</p>
            <p className="text-xl font-semibold mt-1">{c.nutrition.protein_avg_g ?? "—"}g</p>
            <p className={`text-[11px] ${c.nutrition.protein_status === "adequate" ? "text-success" : "text-warning"}`}>
              Target {c.nutrition.protein_target_g}g
            </p>
          </Card>
        </div>

        {/* Strength */}
        {c.strength_highlights.length > 0 && (
          <Card>
            <h3 className="label mb-3">Strength</h3>
            <div className="space-y-2 text-sm">
              {c.strength_highlights.map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-medium">{s.name}</span>
                  <span className={`font-mono text-xs font-semibold flex items-center gap-1 ${
                    s.status === "improving" ? "text-success" : s.status === "plateau" ? "text-danger" : "text-warning"
                  }`}>
                    {s.status === "improving" ? <TrendingUp className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    {s.change_kg ? `${s.change_kg > 0 ? "+" : ""}${s.change_kg}kg` : s.weeks_stalled ? `Stalled ${s.weeks_stalled}w` : s.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Alerts */}
        {c.alerts.length > 0 && (
          <Card className="border-l-4 border-warning">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-warning mb-2">Alerts</p>
            <ul className="space-y-1">
              {c.alerts.map((a, i) => <li key={i} className="text-sm text-muted-foreground">• {a}</li>)}
            </ul>
          </Card>
        )}

        {/* Recommendation */}
        <Card className="bg-foreground text-background !ring-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">This Week</p>
          <p className="text-sm mt-2 leading-relaxed">{c.recommendation}</p>
        </Card>

        {/* Coach CTA */}
        <Link href="/coach"
          className="w-full bg-surface ring-1 ring-border py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:ring-primary transition">
          <MessageSquare className="size-4 text-primary" /> Ask Coach about this report
        </Link>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface p-5 rounded-2xl ring-1 ring-black/5 ${className ?? ""}`}>{children}</div>;
}
