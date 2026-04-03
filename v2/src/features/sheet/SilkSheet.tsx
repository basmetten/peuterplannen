'use client';

import { type ReactNode, useCallback, useRef, useEffect } from 'react';
import { Sheet, Scroll } from '@silk-hq/components';
import type { SheetSnap } from './sheetMachine';

/* ---------- Snap ↔ Detent mapping ---------- */

// Silk detents: 1 = peek (25lvh), 2 = half (50lvh), 3 = full (content height)
// The browse sheet is always presented (no hidden state).
const DETENTS = ['25lvh', '50lvh'] as const;

const SNAP_TO_DETENT: Record<SheetSnap, number> = {
  peek: 1,
  half: 2,
  full: 3,
};

const DETENT_TO_SNAP: Record<number, SheetSnap> = {
  1: 'peek',
  2: 'half',
  3: 'full',
};

/* ---------- Component ---------- */

interface SilkSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Per-frame travel progress callback (0 = offscreen, 1 = full). Drives map dimming. */
  onTravelProgress?: (progress: number, progressAtDetents: Record<number, number>) => void;
  /** Fires when travel status changes (entering, stepping, idleInside, etc.) */
  onTravelStatusChange?: (status: string) => void;
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
  onTravelProgress,
  onTravelStatusChange,
  children,
  className = '',
}: SilkSheetProps) {
  const isPresented = true; // Browse sheet is always visible
  const activeDetent = SNAP_TO_DETENT[snap] ?? 1;
  const viewRef = useRef<HTMLDivElement>(null);

  // Track the last programmatic detent to ignore Silk echoing it back.
  const lastProgrammaticDetent = useRef(activeDetent);
  useEffect(() => {
    lastProgrammaticDetent.current = activeDetent;
  }, [activeDetent]);

  const handlePresentedChange = useCallback(
    (presented: boolean) => {
      if (!presented) onSnapChange('peek'); // Browse sheet falls back to peek, never hides
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

  // Per-frame travel handler — drives map dimming and other travel-synced effects
  const handleTravel = useCallback(
    ({ progress, progressAtDetents }: { progress: number; range: unknown; progressAtDetents: Record<number, number> }) => {
      onTravelProgress?.(progress, progressAtDetents);
    },
    [onTravelProgress],
  );

  // Travel status handler — e.g. freeze map during travel
  const handleTravelStatusChange = useCallback(
    (status: string) => {
      onTravelStatusChange?.(status);
    },
    [onTravelStatusChange],
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
          onTravel={handleTravel}
          onTravelStatusChange={handleTravelStatusChange}
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
                <Sheet.Handle className="flex flex-shrink-0 cursor-grab items-center justify-center bg-bg-primary py-2 active:cursor-grabbing">
                  {/* Grip pill — styled as JSX child, not via data-silk CSS selectors */}
                  <div className="h-[5px] w-9 rounded-full" style={{ background: 'rgba(160, 130, 110, 0.30)' }} />
                </Sheet.Handle>

                {/* Silk handles scroll-to-drag handoff automatically:
                    - Non-last detent: gestures move the sheet
                    - Last detent: gestures scroll content
                    - Scroll at top + pull down: transitions from scroll to sheet drag */}
                <Scroll.Root>
                  <Scroll.View
                    scrollGesture="auto"
                    safeArea="layout-viewport"
                    onScrollStart={{ dismissKeyboard: true }}
                  >
                    <Scroll.Content>
                      <div className="bg-bg-primary">
                        {children}
                      </div>
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
