import Link from 'next/link';

/**
 * ContentShell — wraps server-rendered content (region hubs, detail pages)
 * in an app-like visual: sidebar panel on desktop, scrollable sheet on mobile.
 * No header/footer chrome. Sheet footer with partner + legal links.
 *
 * This is used for SSR/SSG pages within the (app) route group that aren't
 * the interactive map home page.
 */
export function ContentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      {/* Sidebar / sheet content */}
      <div className="relative z-10 flex w-full flex-col overflow-y-auto bg-bg-primary md:max-w-[420px] md:border-r md:border-separator md:shadow-lg">
        <div className="flex-1">{children}</div>

        {/* Sheet footer */}
        <footer className="border-t border-separator px-4 py-6">
          <Link
            href="/partner"
            className="block text-[14px] font-medium text-accent hover:underline"
          >
            Heb je een locatie? Beheer je listing →
          </Link>
          <div className="mt-3 flex gap-3 text-[12px] text-label-tertiary">
            <Link href="/privacy" className="hover:text-label-secondary">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-label-secondary">Voorwaarden</Link>
            <span>·</span>
            <Link href="/about" className="hover:text-label-secondary">Over</Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-label-secondary">Contact</Link>
          </div>
        </footer>
      </div>

      {/* Map placeholder (desktop only — visible as right panel) */}
      <div className="hidden flex-1 bg-bg-secondary md:block">
        <div className="flex h-full items-center justify-center text-label-tertiary">
          {/* Map will be interactive in a future iteration */}
        </div>
      </div>
    </div>
  );
}
