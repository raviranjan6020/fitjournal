import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="pb-24">{children}</div>
      {/* TODO: BottomNav component */}
    </div>
  );
}
