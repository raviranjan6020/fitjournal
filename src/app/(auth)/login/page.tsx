import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; mode?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  const { callbackUrl, mode } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div className="size-16 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <div className="w-5 h-5 bg-primary-foreground rotate-45" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight italic">
            <span className="underline decoration-primary decoration-2 underline-offset-4">FITJOURNAL</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Track. Improve. Transform.</p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-surface p-1 rounded-xl ring-1 ring-border">
          <a href="/login?mode=signin"
            className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-lg transition-colors ${!isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Sign In
          </a>
          <a href="/login?mode=signup"
            className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-lg transition-colors ${isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Sign Up
          </a>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center">
          {isSignUp
            ? "Create your account to start tracking workouts, body weight, and get weekly progress insights."
            : "Welcome back! Sign in to continue your fitness journey."
          }
        </p>

        {/* Google OAuth button */}
        <form
          action={async () => {
            "use server";
            const redirectTo = isSignUp ? "/onboarding" : (callbackUrl ?? "/dashboard");
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full bg-surface border border-border text-foreground py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 hover:bg-accent active:scale-[0.98] transition-all"
          >
            <GoogleIcon />
            {isSignUp ? "Sign up with Google" : "Sign in with Google"}
          </button>
        </form>

        {/* Alternate link */}
        <p className="text-xs text-muted-foreground text-center">
          {isSignUp ? (
            <>Already have an account? <a href="/login?mode=signin" className="text-primary font-semibold">Sign in</a></>
          ) : (
            <>New here? <a href="/login?mode=signup" className="text-primary font-semibold">Create account</a></>
          )}
        </p>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          By continuing you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
