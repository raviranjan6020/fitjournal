import { auth } from "@/lib/auth";
import { listReports } from "@/modules/reporting/service";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  const reports = await listReports(session!.user!.id as string);

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-xs text-muted-foreground">Your weekly progress summaries</p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-3">
        {reports.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto grid place-items-center">
              <FileText className="size-6" />
            </div>
            <p className="text-base font-semibold">No reports yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your first weekly report will be generated next Monday. Keep logging to get insights!
            </p>
          </div>
        ) : (
          reports.map(r => {
            const content = r.content as { period_label?: string; headline?: string };
            return (
              <Link key={r.id} href={`/reports/${r.id}`}
                className="block bg-surface p-4 rounded-2xl ring-1 ring-black/5 hover:ring-primary/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-mono">{r.periodEnd}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate">
                      {content?.headline ?? content?.period_label ?? "Weekly Report"}
                    </p>
                  </div>
                  {!r.isRead && (
                    <span className="shrink-0 size-2 rounded-full bg-primary mt-2" />
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
