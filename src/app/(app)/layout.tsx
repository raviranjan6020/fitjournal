export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="pb-24">{children}</div>
      {/* TODO: BottomNav — issue #47 */}
    </div>
  );
}
