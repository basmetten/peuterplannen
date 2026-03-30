'use client';

import { type ReactNode, useCallback, useRef, useState, useEffect } from 'react';
import { Sheet, Scroll } from '@silk-hq/components';
import type { SheetSnap } from './sheetMachine';

/* ---------- Snap ↔ Detent mapping ---------- */

// Silk detents: 0 = off-screen, 1 = peek (25lvh), 2 = half (50lvh), 3 = full (content height = 92lvh)
const DETENTS = ['25lvh', '50lvh'] as const;

const SNAP_TO_DETENT: Record<SheetSnap, number> = {
  hidden: 0,
  peek: 1,
  half: 2,
  full: 3,
};

const DETENT_TO_SNAP: Record<number, SheetSnap> = {
  0: 'hidden',
  1: 'peek',
  2: 'half',
  3: 'full',
};

/* ---------- Component ---------- */

interface SilkSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  stickyHeader?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SilkSheet({
  snap,
  onSnapChange,
  stickyHeader,
  children,
  className = '',
}: SilkSheetProps) {
  const isPresented = snap !== 'hidden';
  const activeDetent = SNAP_TO_DETENT[snap] || 1;

  // Track whether sheet reached last detent (full) — enables content scrolling
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  // Prevent re-entrant updates during stepping
  const travelStatusRef = useRef<string>('idleOutside');

  const handlePresentedChange = useCallback(
    (presented: boolean) => {
      if (!presented) {
        onSnapChange('hidden');
      }
    },
    [onSnapChange],
  );

  const handleActiveDetentChange = useCallback(
    (detent: number) => {
      const newSnap = DETENT_TO_SNAP[detent];
      if (newSnap) {
        onSnapChange(newSnap);
      }
    },
    [onSnapChange],
  );

  // Enable scroll only at last detent (full)
  const handleTravelRangeChange = useCallback(
    ({ start }: { start: number; end: number }) => {
      // Detent 3 is the last (full) — enable scrolling
      setScrollEnabled(start >= 3);
    },
    [],
  );

  const handleTravelStatusChange = useCallback((status: string) => {
    travelStatusRef.current = status;
    // Reset scroll when dismissed
    if (status === 'idleOutside') {
      setScrollEnabled(false);
    }
  }, []);

  // Dismiss keyboard when dragging down from full
  const handleTravel = useCallback(
    ({ progress }: { progress: number }) => {
      if (progress < 0.999 && viewRef.current) {
        viewRef.current.focus();
      }
    },
    [],
  );

  return (
    <Sheet.Root
      license="non-commercial"
      presented={isPresented}
      onPresentedChange={handlePresentedChange}
      activeDetent={activeDetent}
      onActiveDetentChange={handleActiveDetentChange}
    >
      <Sheet.Portal>
        <Sheet.View
          ref={viewRef}
          className={`SilkSheet-view ${className}`}
          contentPlacement="bottom"
          detents={[...DETENTS]}
          swipeDismissal={false}
          inertOutside={false}
          nativeEdgeSwipePrevention={true}
          swipeOvershoot={true}
          nativeFocusScrollPrevention={true}
          onTravelRangeChange={handleTravelRangeChange}
          onTravelStatusChange={handleTravelStatusChange}
          onTravel={handleTravel}
        >
          <Sheet.Content className="SilkSheet-content">
            <Sheet.BleedingBackground className="bg-bg-primary" />

            {/* SpecialWrapper required for Safari when inertOutside={false} without backdrop */}
            <Sheet.SpecialWrapper.Root>
              <Sheet.SpecialWrapper.Content>
                {/* Drag handle */}
                <div className="flex flex-shrink-0 items-center justify-center bg-bg-primary py-2">
                  <Sheet.Handle asChild>
                    <div
                      className="h-[5px] w-9 rounded-full"
                      style={{ background: 'rgba(160, 130, 110, 0.30)' }}
                    />
                  </Sheet.Handle>
                </div>

                {/* Sticky header (mode pills + search bar) */}
                {stickyHeader && (
                  <div className="flex-shrink-0 bg-bg-primary">{stickyHeader}</div>
                )}

                {/* Scrollable content with scroll-to-drag handoff */}
                <Scroll.Root>
                  <Scroll.View
                    className="SilkSheet-scroll"
                    scrollGesture={scrollEnabled ? 'auto' : false}
                    scrollGestureTrap={{ yEnd: true }}
                    safeArea="layout-viewport"
                    onScrollStart={{ dismissKeyboard: true }}
                  >
                    <Scroll.Content>
                      {children}
                      {/* Bottom safe-area spacer for iPhone home indicator */}
                      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
                    </Scroll.Content>
                  </Scroll.View>
                </Scroll.Root>
              </Sheet.SpecialWrapper.Content>
            </Sheet.SpecialWrapper.Root>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
