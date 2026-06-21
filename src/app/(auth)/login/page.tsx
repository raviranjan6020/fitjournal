"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="size-16 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">FJ</span>
          </div>
          <h1 className="text-3xl font-bold">FitJournal</h1>
          <p className="text-gray-500 mt-2">Track. Improve. Transform.</p>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
