'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';

/* ---------- Constants ---------- */

const DRAG_THRESHOLD = 8;
const FLING_VELOCITY = 0.4;
const AVAILABLE_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/* ---------- Helpers (mirrored from Sheet.tsx) ---------- */

function resolveSnap(currentPct: number, velocity: number): SheetSnap {
  if (Math.abs(velocity) > FLING_VELOCITY) {
    if (velocity < 0) {
      return (
        AVAILABLE_SNAPS.find((s) => SNAP_POINTS[s] > currentPct + 2) ??
        AVAILABLE_SNAPS[AVAILABLE_SNAPS.length - 1]
      );
    }
    return (
      [...AVAILABLE_SNAPS]
        .reverse()
        .find((s) => SNAP_POINTS[s] < currentPct - 2) ?? AVAILABLE_SNAPS[0]
    );
  }

  let closest = AVAILABLE_SNAPS[0];
  let closestDist = Infinity;
  for (const s of AVAILABLE_SNAPS) {
    const dist = Math.abs(SNAP_POINTS[s] - currentPct);
    if (dist < closestDist) {
      closestDist = dist;
      closest = s;
    }
  }
  return closest;
}

function computeRadius(pct: number): number {
  const halfPct = SNAP_POINTS.half;
  const fullPct = SNAP_POINTS.full;
  if (pct <= halfPct) return 16;
  if (pct >= fullPct) return 0;
  return 16 * (1 - (pct - halfPct) / (fullPct - halfPct));
}

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
 * Desktop: no drag handlers fire (isMobile gate).
 */
export function ContentSheetContainer({
  children,
  hasMapLocations,
}: ContentSheetContainerProps) {
  const initialSnap: SheetSnap = hasMapLocations ? 'half' : 'full';
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  /* ---- Drag state ---- */

  const dragState = useRef({
    active: false,
    startY: 0,
    startPct: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    committed: false,
    source: 'handle' as 'handle' | 'scroll',
    touchStartY: 0,
    scrollTopAtStart: 0,
  });

  /* ---- Core drag logic ---- */

  const applyPosition = useCallback((pct: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${100 - pct}%)`;
    const r = computeRadius(pct);
    el.style.borderTopLeftRadius = `${r}px`;
    el.style.borderTopRightRadius = `${r}px`;
  }, []);

  const clearInlineStyles = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.borderTopLeftRadius = '';
    el.style.borderTopRightRadius = '';
  }, []);

  const getCurrentPct = useCallback((): number => {
    const el = containerRef.current;
    if (!el) return snapPct;
    const match = el.style.transform.match(/translateY\((.+)%\)/);
    return match ? 100 - parseFloat(match[1]) : snapPct;
  }, [snapPct]);

  const trackVelocity = useCallback((clientY: number) => {
    const ds = dragState.current;
    const now = performance.now();
    const dt = now - ds.lastTime;
    if (dt > 0 && dt < 100) {
      const instant = (ds.lastY - clientY) / dt;
      ds.velocity = ds.velocity * 0.6 + instant * 0.4;
    }
    ds.lastY = clientY;
    ds.lastTime = now;
  }, []);

  const beginDrag = useCallback(
    (clientY: number, source: 'handle' | 'scroll') => {
      const ds = dragState.current;
      ds.active = true;
      ds.startY = clientY;
      ds.startPct = snapPct;
      ds.lastY = clientY;
      ds.lastTime = performance.now();
      ds.velocity = 0;
      ds.committed = false;
      ds.source = source;

      if (scrollRef.current) {
        scrollRef.current.style.overflowY = 'hidden';
      }
    },
    [snapPct],
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      const ds = dragState.current;
      if (!ds.active) return;

      const deltaY = ds.startY - clientY;

      if (!ds.committed) {
        if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
        ds.committed = true;
        ds.startY = clientY;
        ds.lastY = clientY;
        ds.lastTime = performance.now();
        return;
      }

      trackVelocity(clientY);

      const viewportH = window.innerHeight;
      const deltaPct = ((ds.startY - clientY) / viewportH) * 100;
      const newPct = Math.max(0, Math.min(100, ds.startPct + deltaPct));

      applyPosition(newPct);
    },
    [applyPosition, trackVelocity],
  );

  const endDrag = useCallback(() => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.active = false;

    if (scrollRef.current) {
      scrollRef.current.style.overflowY = '';
    }

    if (!ds.committed) {
      clearInlineStyles();
      return;
    }

    const currentPct = getCurrentPct();
    clearInlineStyles();

    const resolved = resolveSnap(currentPct, ds.velocity);
    setSnap(resolved);
  }, [getCurrentPct, clearInlineStyles]);

  /* ---- Handle touch (drag handle) ---- */

  const onHandleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      e.preventDefault();
      beginDrag(e.touches[0].clientY, 'handle');
    },
    [isMobile, beginDrag],
  );

  // Global listeners for handle-initiated drags
  useEffect(() => {
    if (!isMobile) return;

    const onMove = (e: TouchEvent) => {
      const ds = dragState.current;
      if (!ds.active || ds.source !== 'handle') return;
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
    };

    const onEnd = () => {
      const ds = dragState.current;
      if (!ds.active || ds.source !== 'handle') return;
      endDrag();
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isMobile, moveDrag, endDrag]);

  /* ---- Scroll-to-drag handoff ---- */

  const onScrollTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const ds = dragState.current;
      ds.touchStartY = e.touches[0].clientY;
      ds.scrollTopAtStart = scrollRef.current?.scrollTop ?? 0;
    },
    [isMobile],
  );

  const onScrollTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const ds = dragState.current;

      if (ds.active && ds.source === 'scroll') {
        e.preventDefault();
        moveDrag(e.touches[0].clientY);
        return;
      }

      if (ds.active) return;
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - ds.touchStartY;

      if (
        scrollEl.scrollTop <= 0 &&
        deltaY > DRAG_THRESHOLD &&
        ds.scrollTopAtStart <= 0
      ) {
        e.preventDefault();
        beginDrag(currentY, 'scroll');
      }
    },
    [isMobile, beginDrag, moveDrag],
  );

  const onScrollTouchEnd = useCallback(() => {
    if (!isMobile) return;
    const ds = dragState.current;
    if (ds.active && ds.source === 'scroll') {
      endDrag();
    }
  }, [isMobile, endDrag]);

  /* ---- Computed mobile styles ---- */

  const radiusValue = computeRadius(snapPct);

  // Only apply inline styles after JS detects mobile viewport.
  // Before hydration, CSS classes (.content-sheet / .content-sheet--full) handle positioning.
  // On desktop, CSS @media overrides with !important — no inline styles needed.
  const mobileStyle = isMobile
    ? {
        transform: `translateY(${100 - snapPct}%)`,
        transition:
          'transform var(--duration-sheet) var(--ease-default), border-radius var(--duration-fast) var(--ease-default)',
        borderTopLeftRadius: `${radiusValue}px`,
        borderTopRightRadius: `${radiusValue}px`,
        boxShadow: 'var(--shadow-sheet)',
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`content-sheet flex flex-col bg-bg-primary ${
        hasMapLocations ? '' : 'content-sheet--full'
      }`}
      style={mobileStyle}
    >
      {/* Drag handle — mobile only (hidden on desktop via md:hidden) */}
      <div
        className="flex flex-shrink-0 touch-none items-center justify-center py-2 md:hidden"
        onTouchStart={onHandleTouchStart}
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
        onTouchStart={onScrollTouchStart}
        onTouchMove={onScrollTouchMove}
        onTouchEnd={onScrollTouchEnd}
      >
        {children}
        <Footer />
      </div>
    </div>
  );
}
