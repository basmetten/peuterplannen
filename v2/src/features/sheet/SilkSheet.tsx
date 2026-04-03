'use client';

import { type ReactNode, useCallback, useRef, useEffect } from 'react';
import { Sheet, Scroll } from '@silk-hq/components';
import type { SheetSnap } from './sheetMachine';

/* ---------- Snap ↔ Detent mapping ---------- */

// Silk detents: 0 = off-screen, 1 = peek (25lvh), 2 = half (50lvh), 3 = full (content height)
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
  children: ReactNode;
  className?: string;
}

/**
 * Silk-powered bottom sheet with scroll-to-drag handoff.
 *
 * Silk automatically handles:
 * - At non-last detents (peek, half): swipe gestures move the sheet
 * - At last detent (full): swipe gestures scroll the content
 * - Scroll at top + pull down: hands off from scroll to sheet drag
 *
 * We just set scrollGesture="auto" and let Silk coordinate.
 */
export function SilkSheet({
  snap,
  onSnapChange,
  children,
  className = '',
}: SilkSheetProps) {
  const isPresented = snap !== 'hidden';
  const activeDetent = SNAP_TO_DETENT[snap] ?? 1;
  const viewRef = useRef<HTMLDivElement>(null);

  // Track the last programmatic detent to ignore Silk echoing it back.
  const lastProgrammaticDetent = useRef(activeDetent);
  useEffect(() => {
    lastProgrammaticDetent.current = activeDetent;
  }, [activeDetent]);

  const handlePresentedChange = useCallback(
    (presented: boolean) => {
      if (!presented) onSnapChange('hidden');
    },
    [onSnapChange],
  );

  const handleActiveDetentChange = useCallback(
    (detent: number) => {
      // Skip echoes of our own programmatic detent changes
      if (detent === lastProgrammaticDetent.current) return;
      const newSnap = DETENT_TO_SNAP[detent];
      if (newSnap !== undefined) onSnapChange(newSnap);
    },
    [onSnapChange],
  );

  return (
    <Sheet.Root
      license="non-commercial"
      presented={isPresented}
      onPresentedChange={handlePresentedChange}
      activeDetent={activeDetent}
      onActiveDetentChange={handleActiveDetentChange}
      forComponent="closest"
    >
      <Sheet.Portal>
        <Sheet.View
          ref={viewRef}
          className={`SilkSheet-view ${className}`}
          style={{ zIndex: 30 }}
          contentPlacement="bottom"
          detents={[...DETENTS]}
          swipeDismissal={false}
          inertOutside={false}
          swipeOvershoot={true}
          nativeFocusScrollPrevention={true}
          enteringAnimationSettings={{ skip: true }}
        >
          <Sheet.Outlet
            stackingAnimation={{
              scale: [1, 0.933] as [number, number],
              borderRadius: ({ progress, tween }: { progress: number; tween: (s: string | number, e: string | number) => string }) =>
                tween('0px', `${progress * 12}px`),
            }}
          />
          <Sheet.Content className="SilkSheet-content">
            <Sheet.BleedingBackground className="bg-bg-primary" />

            <Sheet.SpecialWrapper.Root>
              <Sheet.SpecialWrapper.Content>
                <Sheet.Handle className="flex flex-shrink-0 cursor-grab items-center justify-center bg-bg-primary py-2 active:cursor-grabbing" />

                {/* Silk handles scroll-to-drag handoff automatically:
                    - Non-last detent: gestures move the sheet
                    - Last detent: gestures scroll content
                    - Scroll at top + pull down: transitions from scroll to sheet drag */}
                <Scroll.Root>
                  <Scroll.View
                    className="SilkSheet-scroll"
                    scrollGesture="auto"
                    safeArea="layout-viewport"
                    onScrollStart={{ dismissKeyboard: true }}
                  >
                    <Scroll.Content>
                      {children}
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
