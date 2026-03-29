'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useSheetDrag, computeRadius } from '@/hooks/useSheetDrag';
import { SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-separator px-4 py-6">
      <Link
        href="/partner"
        className="block text-[14px] font-medium text-accent hover:underline"
      >
        Heb je een locatie? Beheer je listing →
      </Link>
      <div className="mt-3 flex gap-3 text-[12px] text-label-tertiary">
        <Link href="/privacy" className="hover:text-label-secondary">
          Privacy
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-label-secondary">
          Voorwaarden
        </Link>
        <span>·</span>
        <Link href="/about" className="hover:text-label-secondary">
          Over
        </Link>
        <span>·</span>
        <Link href="/contact" className="hover:text-label-secondary">
          Contact
        </Link>
      </div>
    </footer>
  );
}

/* ---------- Main Component ---------- */

interface ContentSheetContainerProps {
  children: ReactNode;
  /** When true, sheet starts at half (location pages). When false, full (blog/guides). */
  hasMapLocations: boolean;
}

/**
 * Responsive container for ContentShell content.
 *
 * Layout is CSS-first (no JS needed for correct SSR):
 * - Mobile: bottom sheet with .content-sheet class (half or full default via CSS).
 * - Desktop: 420px sidebar via @media override in globals.css.
 *
 * After hydration on mobile: adds drag behavior (handle + scroll-to-drag handoff).
 * Desktop: no drag handlers fire (enabled=false gate).
 */
export function ContentSheetContainer({
  children,
  hasMapLocations,
}: ContentSheetContainerProps) {
  const initialSnap: SheetSnap = hasMapLocations ? 'half' : 'full';
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  const [isMobile, setIsMobile] = useState(false);

  const snapPct = SNAP_POINTS[snap];

  // Detect mobile viewport (client-side only)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const {
    sheetRef,
    scrollRef,
    handleTouchStart,
    scrollTouchStart,
    scrollTouchMove,
    scrollTouchEnd,
    springDuration,
  } = useSheetDrag({
    snap,
    availableSnaps: ['peek', 'half', 'full'],
    onSnapChange: setSnap,
    enabled: isMobile,
  });

  const radiusValue = computeRadius(snapPct);

  // Use distance-proportional duration when available, otherwise default
  const transitionDuration = springDuration ? `${springDuration}ms` : 'var(--duration-sheet)';
  const radiusDuration = springDuration ? `${Math.min(springDuration, 200)}ms` : 'var(--duration-fast)';

  // Only apply inline styles after JS detects mobile viewport.
  // Before hydration, CSS classes (.content-sheet / .content-sheet--full) handle positioning.
  // On desktop, CSS @media overrides with !important — no inline styles needed.
  const mobileStyle = isMobile
    ? {
        transform: `translateY(${100 - snapPct}%)`,
        transition: `transform ${transitionDuration} var(--ease-default), border-radius ${radiusDuration} var(--ease-default)`,
        borderTopLeftRadius: `${radiusValue}px`,
        borderTopRightRadius: `${radiusValue}px`,
        boxShadow: 'var(--shadow-sheet)',
      }
    : undefined;

  return (
    <div
      ref={sheetRef}
      className={`content-sheet flex flex-col bg-bg-primary ${
        hasMapLocations ? '' : 'content-sheet--full'
      }`}
      style={mobileStyle}
    >
      {/* Drag handle — mobile only (hidden on desktop via md:hidden) */}
      <div
        className="flex flex-shrink-0 touch-none items-center justify-center py-2 md:hidden"
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-[5px] w-9 rounded-full"
          style={{ background: 'rgba(160, 130, 110, 0.30)' }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={scrollTouchStart}
        onTouchMove={scrollTouchMove}
        onTouchEnd={scrollTouchEnd}
      >
        {children}
        <Footer />
      </div>
    </div>
  );
}
