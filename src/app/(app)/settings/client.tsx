"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { useAppTheme, THEMES } from "@/components/layout/AppThemeProvider";

type Profile = {
  name: string | null; email: string; heightCm: string | null;
  dateOfBirth: string | null; gender: string | null;
  goal: { goalType: string; startWeightKg: string | null; targetWeightKg: string | null; startDate: string | null } | null;
  preferences: {
    proteinTargetG: string | null; waterTargetL: string | null;
    weeklyWorkoutTarget: string | null;
    deliveryEmail: boolean; deliveryWhatsapp: boolean; deliveryPush: boolean;
    whatsappNumber: string | null;
  } | null;
};

const tabs = ["Profile", "Goal", "Preferences"] as const;

export function SettingsClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [tab,     setTab]     = useState<typeof tabs[number]>("Profile");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Profile state
  const [name,    setName]    = useState(profile.name    ?? "");
  const [height,  setHeight]  = useState(profile.heightCm ? String(Number(profile.heightCm)) : "");
  const [dob,     setDob]     = useState(profile.dateOfBirth ?? "");
  const [gender,  setGender]  = useState(profile.gender ?? "");

  // Preferences state
  const prefs = profile.preferences;
  const [proteinT, setProteinT] = useState(prefs?.proteinTargetG ? String(Math.round(Number(prefs.proteinTargetG))) : "");
  const [waterT,   setWaterT]   = useState(prefs?.waterTargetL   ? String(Number(prefs.waterTargetL)) : "");
  const [workoutT, setWorkoutT] = useState(prefs?.weeklyWorkoutTarget ? String(Number(prefs.weeklyWorkoutTarget)) : "4");
  const [emailOn,  setEmail]    = useState(prefs?.deliveryEmail    ?? true);
  const [pushOn,   setPush]     = useState(prefs?.deliveryPush     ?? true);
  const [waOn,     setWa]       = useState(prefs?.deliveryWhatsapp ?? false);

  async function saveProfile() {
    setError(null); setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, heightCm: height ? Number(height) : undefined, dateOfBirth: dob || undefined, gender: gender || undefined }),
      });
      if (!res.ok) throw new Error();
      flash();
    } catch { setError("Failed to save."); }
    finally { setSaving(false); }
  }

  async function savePrefs() {
    setError(null); setSaving(true);
    try {
      const res = await fetch("/api/users/me/preferences", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proteinTargetG: proteinT ? Number(proteinT) : undefined, waterTargetL: waterT ? Number(waterT) : undefined, weeklyWorkoutTarget: workoutT ? Number(workoutT) : undefined, deliveryEmail: emailOn, deliveryPush: pushOn, deliveryWhatsapp: waOn }),
      });
      if (!res.ok) throw new Error();
      flash();
    } catch { setError("Failed to save."); }
    finally { setSaving(false); }
  }

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const g = profile.goal;

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-surface px-5 py-4 border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="size-9 -ml-1 grid place-items-center text-muted-foreground">
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-base font-semibold">Settings</h1>
          {saved && <span className="text-xs font-semibold text-success ml-auto">Saved ✓</span>}
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 bg-surface p-1 rounded-xl ring-1 ring-black/5">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-danger bg-danger/10 px-4 py-2 rounded-xl">{error}</p>}

        {/* Profile tab */}
        {tab === "Profile" && (
          <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5 space-y-4">
            <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className={inp} /></Field>
            <Field label="Email"><input disabled value={profile.email} className={inp + " opacity-60"} /></Field>
            <Field label="Height (cm)"><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className={inp} /></Field>
            <Field label="Date of birth"><input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inp} /></Field>
            <Field label="Gender">
              <select value={gender} onChange={e => setGender(e.target.value)} className={inp}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
            <SaveBtn onClick={saveProfile} loading={saving} />
          </div>
        )}

        {/* Goal tab */}
        {tab === "Goal" && (
          <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5 space-y-3">
            {g ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current goal</p>
                <p className="text-xl font-bold capitalize">{g.goalType.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground">
                  {g.startWeightKg && `Start: ${g.startWeightKg}kg`}
                  {g.targetWeightKg && ` · Target: ${g.targetWeightKg}kg`}
                  {g.startDate && ` · Since ${g.startDate}`}
                </p>
                <button onClick={() => router.push("/onboarding?force=1")}
                  className="w-full bg-foreground text-background py-3 rounded-xl text-sm font-semibold mt-2">
                  Change Goal
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No active goal.</p>
                <button onClick={() => router.push("/onboarding?force=1")}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold">
                  Set Goal
                </button>
              </>
            )}
          </div>
        )}

        {/* Preferences tab */}
        {tab === "Preferences" && (
          <div className="bg-surface p-5 rounded-2xl ring-1 ring-black/5 space-y-4">
            <Field label="Weekly workout target">
              <input type="number" value={workoutT} onChange={e => setWorkoutT(e.target.value)} className={inp} />
            </Field>
            <Field label="Protein target (g)" hint={`Auto: 1.6 × ${profile.heightCm ?? "?"}cm`}>
              <input type="number" value={proteinT} onChange={e => setProteinT(e.target.value)} className={inp} />
            </Field>
            <Field label="Water target (L)">
              <input type="number" step="0.1" value={waterT} onChange={e => setWaterT(e.target.value)} className={inp} />
            </Field>
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery</p>
              <Toggle label="Email reports" checked={emailOn} onChange={setEmail} />
              <Toggle label="Push notifications" checked={pushOn} onChange={setPush} />
              <Toggle label="WhatsApp" checked={waOn} onChange={setWa} />
            </div>
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</p>
              <ThemePicker />
              <ModePicker />
            </div>
            <SaveBtn onClick={savePrefs} loading={saving} />
          </div>
        )}

        {/* Logout */}
        <button
          onClick={async () => {
            await fetch("/api/auth/signout", { method: "POST" });
            router.push("/login");
          }}
          className="w-full bg-danger/10 text-danger py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-danger/20 transition"
        >
          <LogOut className="size-4" /> Sign Out
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

function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-60">
      {loading ? "Saving…" : "Save"}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className="w-full flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? "bg-primary" : "bg-border"}`} aria-hidden>
        <span className={`block size-5 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

const inp = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none";

function ThemePicker() {
  const { theme, setTheme } = useAppTheme();
  return (
    <div className="space-y-2 py-2">
      <span className="text-sm font-medium">Color Theme</span>
      <div className="flex gap-2">
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setTheme(t.id)}
            aria-label={t.label}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              theme === t.id ? "ring-2 ring-offset-2 ring-offset-background" : "ring-1 ring-border"
            }`}
            style={{ ["--tw-ring-color" as string]: t.color }}>
            <span className="size-5 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="text-muted-foreground">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModePicker() {
  const { mode, setMode } = useAppTheme();
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">Mode</span>
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(["dark", "light"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${mode === m ? "bg-surface text-foreground" : "text-muted-foreground"}`}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
