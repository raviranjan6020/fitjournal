import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="size-16 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center mb-6 shadow-lg">
            <span className="text-2xl font-bold">FJ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FitJournal</h1>
          <p className="text-muted-foreground mt-2">Track. Improve. Transform.</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-foreground text-background py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Continue with Google
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
