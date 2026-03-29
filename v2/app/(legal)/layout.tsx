import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary">
      <header className="border-b border-separator bg-bg-primary">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-label">
            PeuterPlannen
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex-1">{children}</main>
      <footer className="border-t border-separator py-6">
        <div className="mx-auto flex max-w-3xl gap-4 px-4 text-[13px] text-label-tertiary">
          <Link href="/privacy" className="hover:text-label-secondary">Privacy</Link>
          <Link href="/terms" className="hover:text-label-secondary">Voorwaarden</Link>
          <Link href="/about" className="hover:text-label-secondary">Over</Link>
          <Link href="/contact" className="hover:text-label-secondary">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
