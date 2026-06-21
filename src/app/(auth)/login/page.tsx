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
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div
            className="size-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: "#0066FF" }}
          >
            <span className="text-white text-2xl font-bold">FJ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FitJournal</h1>
          <p className="text-gray-500 mt-2">Track. Improve. Transform.</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#0066FF" }}
          >
            Continue with Google
          </button>
        </form>

        <p className="text-xs text-gray-400">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
