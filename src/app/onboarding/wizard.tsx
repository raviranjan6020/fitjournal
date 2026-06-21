"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOALS = [
  { id: "fat_loss",      label: "Fat Loss",         desc: "Lose weight, keep muscle" },
  { id: "lean_bulk",     label: "Lean Bulk",         desc: "Slow, clean weight gain" },
  { id: "muscle_gain",   label: "Muscle Gain",       desc: "Hypertrophy focus" },
  { id: "strength_gain", label: "Strength Gain",     desc: "Heavier lifts, low reps" },
  { id: "recomposition", label: "Recomposition",     desc: "Build & lose at once" },
  { id: "maintain",      label: "Maintain",          desc: "Stay where you are" },
] as const;

type GoalId = (typeof GOALS)[number]["id"];

export function OnboardingWizard({ initialStep }: { initialStep: number }) {
  const router = useRouter();
  const [step, setStep]       = useState(initialStep);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName]         = useState("");
  const [dob, setDob]           = useState("");
  const [gender, setGender]     = useState("");
  const [height, setHeight]     = useState("");

  const [goal, setGoal]         = useState<GoalId | null>(null);
  const [startWeight, setStart] = useState("");
  const [targetWeight, setTarget] = useState("");

  const [emailOn, setEmail]     = useState(true);
  const [pushOn, setPush]       = useState(true);
  const [waOn, setWa]           = useState(false);
  const [waNumber, setWaNumber] = useState("");

  async function saveProfile() {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          heightCm: height ? Number(height) : undefined,
          dateOfBirth: dob || undefined,
          gender: gender || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setStep(3);
    } catch { setError("Failed to save profile. Try again."); }
    finally { setLoading(false); }
  }

  async function saveGoal() {
    if (!goal || !startWeight) return;
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/users/me/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: goal,
          startWeightKg: Number(startWeight),
          targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setStep(4);
    } catch { setError("Failed to save goal. Try again."); }
    finally { setLoading(false); }
  }

  async function savePrefs() {
    setError(null); setLoading(true);
    try {
      await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryEmail: emailOn, deliveryPush: pushOn, deliveryWhatsapp: waOn,
          whatsappNumber: waOn && waNumber ? waNumber : undefined,
        }),
      });
      setStep(5);
    } catch { setError("Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-md mx-auto px-5 py-8 pb-32">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-danger bg-danger/10 px-4 py-2 rounded-xl">{error}</p>
        )}

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="space-y-8 text-center pt-12">
            <div>
              <div className="size-16 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl font-bold">FJ</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">FitJournal</h1>
              <p className="text-muted-foreground mt-2">Track. Improve. Transform.</p>
            </div>
            <PrimaryBtn onClick={() => setStep(2)}>Get Started →</PrimaryBtn>
          </div>
        )}

        {/* Step 2 — Profile */}
        {step === 2 && (
          <div className="space-y-5">
            <Heading title="Your Profile" sub="A few basics to personalise insights." />
            <Field label="Name">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ravi Sharma" className={inp} />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inp} />
            </Field>
            <Field label="Gender">
              <select value={gender} onChange={e => setGender(e.target.value)} className={inp}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className={inp} />
            </Field>
            <PrimaryBtn onClick={saveProfile} loading={loading}>Next →</PrimaryBtn>
          </div>
        )}

        {/* Step 3 — Goal */}
        {step === 3 && (
          <div className="space-y-5">
            <Heading title="Your Goal" sub="What's your current fitness focus?" />
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`p-3 rounded-xl text-left ring-2 transition-all ${
                    goal === g.id
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-surface ring-transparent hover:ring-primary/10"
                  }`}
                >
                  <p className="text-sm font-semibold">{g.label}</p>
                  <p className={`text-[11px] mt-0.5 ${goal === g.id ? "opacity-80" : "text-muted-foreground"}`}>{g.desc}</p>
                </button>
              ))}
            </div>
            {goal && (
              <div className="space-y-3 pt-1">
                <Field label="Current weight (kg)">
                  <input type="number" value={startWeight} onChange={e => setStart(e.target.value)} placeholder="84.0" className={inp} />
                </Field>
                {goal !== "maintain" && (
                  <Field label="Target weight (kg)">
                    <input type="number" value={targetWeight} onChange={e => setTarget(e.target.value)} placeholder="80.0" className={inp} />
                  </Field>
                )}
              </div>
            )}
            <PrimaryBtn onClick={saveGoal} loading={loading} disabled={!goal || !startWeight}>Next →</PrimaryBtn>
          </div>
        )}

        {/* Step 4 — Delivery */}
        {step === 4 && (
          <div className="space-y-5">
            <Heading title="Weekly Report" sub="How should we send your insights?" />
            <Toggle label="Email" sub="Weekly report to your inbox" checked={emailOn} onChange={setEmail} />
            <Toggle label="Push notifications" sub="In-app alerts on your phone" checked={pushOn} onChange={setPush} />
            <Toggle label="WhatsApp" sub="Message on your number" checked={waOn} onChange={setWa} />
            {waOn && (
              <Field label="WhatsApp number">
                <input value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="+91 9876543210" className={inp} />
              </Field>
            )}
            <PrimaryBtn onClick={savePrefs} loading={loading}>Get Started →</PrimaryBtn>
          </div>
        )}

        {/* Step 5 — Done */}
        {step === 5 && (
          <div className="space-y-8 text-center pt-12">
            <div className="size-16 rounded-2xl bg-success/10 text-success mx-auto flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set!</h1>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                Your first insights arrive after 2 weeks of logging.
                Log workouts and daily check-ins to unlock your analytics.
              </p>
            </div>
            <PrimaryBtn onClick={() => router.push("/dashboard")}>Go to Dashboard →</PrimaryBtn>
          </div>
        )}

        {step > 1 && step < 5 && (
          <div className="text-center mt-6">
            <button onClick={() => router.push("/dashboard")} className="text-xs text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PrimaryBtn({ children, onClick, loading, disabled }: {
  children: React.ReactNode; onClick: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm mt-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="w-full bg-surface p-4 rounded-xl ring-1 ring-black/5 flex items-center justify-between gap-3"
    >
      <div className="text-left min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <span className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? "bg-primary" : "bg-muted"}`} aria-hidden>
        <span className={`block size-5 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

const inp = "w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none";
