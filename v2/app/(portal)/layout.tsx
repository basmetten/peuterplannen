import Link from 'next/link';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary">
      <header className="border-b border-separator bg-bg-primary">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-label">
            PeuterPlannen
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex-1">{children}</main>
    </div>
  );
}
