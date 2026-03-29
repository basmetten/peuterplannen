'use client';

import { type ReactNode } from 'react';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { SNAP_POINTS, type SheetSnap } from './sheetMachine';

interface SheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Sticky header rendered between drag handle and scrollable content */
  stickyHeader?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Sheet({ snap, onSnapChange, stickyHeader, children, className = '' }: SheetProps) {
  const snapPct = SNAP_POINTS[snap];
  const isHidden = snap === 'hidden';

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
    onSnapChange,
    enabled: true, // Sheet.tsx is always mobile (only rendered in AppShell mobile path)
  });

  // floatFactor: 1 at peek (25%), ~0.6 at half (50%), 0 at full (92%)
  const floatFactor = isHidden ? 0 : Math.max(0, Math.min(1, (92 - snapPct) / 67));

  // Use distance-proportional duration when available, otherwise default
  const durationMs = springDuration ?? 350;
  const durationStr = `${durationMs}ms`;

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden ${className}`}
      style={{
        transform: isHidden ? 'translateY(100%)' : `translateY(${100 - snapPct}%)`,
        transition: `transform ${durationStr} var(--ease-default), border-radius ${durationStr} var(--ease-default), margin ${durationStr} var(--ease-default)`,
        marginInline: `${floatFactor * 12}px`,
        marginBottom: `${floatFactor * 8}px`,
        borderRadius: `${floatFactor * 16}px`,
        filter: floatFactor > 0
          ? `drop-shadow(0 -2px ${8 + floatFactor * 8}px rgba(0,0,0,${(0.04 + floatFactor * 0.06).toFixed(2)}))`
          : undefined,
        willChange: 'transform',
        height: '100%',
      }}
    >
      {/* Drag handle — glass background, touch-none prevents browser scroll interference */}
      <div
        className="glass flex flex-shrink-0 touch-none items-center justify-center py-2"
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-[5px] w-9 rounded-full"
          style={{ background: 'rgba(160, 130, 110, 0.30)' }}
        />
      </div>

      {/* Sticky header (mode pills) — glass background, stays fixed above scroll */}
      {stickyHeader && (
        <div className="flex-shrink-0 glass">{stickyHeader}</div>
      )}

      {/* Scrollable content with scroll-to-drag handoff — solid background for readability */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain bg-bg-primary"
        style={{ contain: 'layout style' }}
        onTouchStart={scrollTouchStart}
        onTouchMove={scrollTouchMove}
        onTouchEnd={scrollTouchEnd}
      >
        {children}
        {/* Bottom safe-area spacer for iPhone home indicator */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
