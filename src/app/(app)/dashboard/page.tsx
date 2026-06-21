import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <h1 className="text-2xl font-semibold">Hi, {session?.user?.name?.split(" ")[0]} 👋</h1>
      <p className="text-gray-500 mt-1">Dashboard — wire to API (issue #48)</p>
    </div>
  );
}
