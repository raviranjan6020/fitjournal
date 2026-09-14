import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Dumbbell, TrendingUp, Sparkles, BellRing, ShieldCheck } from "lucide-react";

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-sm grid place-items-center">
              <div className="w-3.5 h-3.5 bg-background rotate-45" />
            </div>
            <span className="text-lg font-bold tracking-tight italic">
              <span className="underline decoration-primary decoration-2 underline-offset-4">FITJOURNAL</span>
            </span>
          </div>
          <Link href="/login?mode=signin"
            className="text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 pt-16 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          You&apos;ve logged 40 workouts.
          <br />
          <span className="text-primary">Are you actually getting stronger?</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          Most fitness apps are just a spreadsheet with better fonts. FitJournal looks at your
          training, sleep, and food together and tells you straight up what&apos;s working and
          what&apos;s stuck.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login?mode=signup"
            className="bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
            Create free account
          </Link>
          <Link href="/login?mode=signin"
            className="bg-surface ring-1 ring-border px-6 py-3.5 rounded-xl font-semibold text-sm hover:ring-primary/50 transition-colors">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card, just sign in with Google.</p>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-5 pb-20">
        <div className="grid sm:grid-cols-2 gap-4">
          <FeatureCard
            icon={Dumbbell}
            title="Logging that doesn't slow you down"
            description="Weight, reps, RPE, done. It catches your PRs automatically so you don't have to remember what you lifted last time."
          />
          <FeatureCard
            icon={TrendingUp}
            title="It notices when a lift stalls"
            description="Not a vibe. An engine watches your numbers week over week and flags a plateau, low volume, or a weight trend headed the wrong way."
          />
          <FeatureCard
            icon={Sparkles}
            title="Ask it anything about your training"
            description="Why did my squat stop moving? Am I eating enough protein? It answers from your actual logs, it doesn&apos;t make things up."
          />
          <FeatureCard
            icon={BellRing}
            title="One report a week, not a notification every hour"
            description="A short weekly summary: what improved, what stalled, and one thing to change next week."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-5 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <Step number={1} title="Log what you already do" description="Workouts, weight, sleep, food. Log as much or as little as you already track." />
          <Step number={2} title="Let it crunch the numbers" description="Plateau checks, training volume, consistency, and goal progress get computed from your real history, not rough averages." />
          <Step number={3} title="Get a straight answer" description="A weekly report and an AI coach that actually tell you what's working and what to fix." />
        </div>
      </section>

      {/* Trust / privacy */}
      <section className="max-w-4xl mx-auto px-5 pb-24">
        <div className="bg-surface ring-1 ring-border rounded-2xl p-6 flex items-start gap-4">
          <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Your data is yours</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Every insight comes from what you actually logged. No made-up numbers, no
              password to remember either, just sign in with Google.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-5 pb-20 text-center">
        <h2 className="text-2xl font-bold">See what your first week looks like</h2>
        <p className="text-sm text-muted-foreground mt-2">Sign up takes about a minute.</p>
        <Link href="/login?mode=signup"
          className="inline-block mt-6 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
          Create free account
        </Link>
      </section>

      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} FitJournal</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface ring-1 ring-border rounded-2xl p-5">
      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
}
