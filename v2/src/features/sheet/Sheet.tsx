'use client';

import { type ReactNode } from 'react';
import { useSheetDrag, computeRadius } from '@/hooks/useSheetDrag';
import { SNAP_POINTS, type SheetSnap } from './sheetMachine';

interface SheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  children: ReactNode;
  className?: string;
}

export function Sheet({ snap, onSnapChange, children, className = '' }: SheetProps) {
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

  const radiusValue = computeRadius(snapPct);

  // Use distance-proportional duration when available, otherwise default
  const transitionDuration = springDuration ?? 'var(--duration-sheet)';
  const radiusDuration = springDuration ? `${Math.min(springDuration, 200)}ms` : 'var(--duration-fast)';

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col bg-bg-primary will-change-transform ${className}`}
      style={{
        transform: isHidden ? 'translateY(100%)' : `translateY(${100 - snapPct}%)`,
        transition: `transform ${typeof transitionDuration === 'number' ? `${transitionDuration}ms` : transitionDuration} var(--ease-default), border-radius ${radiusDuration} var(--ease-default)`,
        borderTopLeftRadius: `${radiusValue}px`,
        borderTopRightRadius: `${radiusValue}px`,
        boxShadow: isHidden ? 'none' : 'var(--shadow-sheet)',
        height: '100%',
      }}
    >
      {/* Drag handle — touch-none prevents browser scroll interference */}
      <div
        className="flex flex-shrink-0 touch-none items-center justify-center py-2"
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-[5px] w-9 rounded-full"
          style={{ background: 'rgba(160, 130, 110, 0.30)' }}
        />
      </div>

      {/* Scrollable content with scroll-to-drag handoff */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={scrollTouchStart}
        onTouchMove={scrollTouchMove}
        onTouchEnd={scrollTouchEnd}
      >
        {children}
        {/* Bottom spacer for TabBar (49px + safe area inset) */}
        <div className="h-[49px]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
