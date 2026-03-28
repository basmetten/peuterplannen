export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-separator bg-bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
          <span className="text-lg font-semibold tracking-tight text-label">
            PeuterPlannen
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-separator bg-bg-secondary py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-label-secondary">
          &copy; {new Date().getFullYear()} PeuterPlannen
        </div>
      </footer>
    </div>
  );
}
