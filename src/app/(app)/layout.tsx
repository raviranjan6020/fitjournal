import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingCoachButton } from "@/components/layout/FloatingCoachButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="pb-24">{children}</div>
      <FloatingCoachButton />
      <BottomNav />
    </div>
  );
}
