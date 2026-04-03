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
  const isHidden = false; // Browse sheet is always visible

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

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl shadow-sheet ${className}`}
      style={{
        transform: isHidden ? 'translateY(100%)' : `translateY(${100 - snapPct}%)`,
        transition: `transform ${springDuration ? `${springDuration}ms` : 'var(--duration-sheet)'} var(--ease-default)`,
        height: '100%',
      }}
    >
      {/* Drag handle — solid bg, touch-none prevents browser scroll interference */}
      <div
        className="flex flex-shrink-0 touch-none items-center justify-center bg-bg-primary py-2"
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-[5px] w-9 rounded-full"
          style={{ background: 'rgba(160, 130, 110, 0.30)' }}
        />
      </div>

      {/* Sticky header (mode pills) — solid bg, stays fixed above scroll */}
      {stickyHeader && (
        <div className="flex-shrink-0 bg-bg-primary">{stickyHeader}</div>
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
