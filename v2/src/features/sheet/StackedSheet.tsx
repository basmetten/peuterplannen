'use client';

import { type ReactNode, useCallback, useState } from 'react';
import { Sheet, Scroll } from '@silk-hq/components';

interface StackedSheetProps {
  presented: boolean;
  onClose: () => void;
  swipe?: boolean;
  /** Accessible title for screen readers */
  title?: string;
  children: ReactNode;
}

/**
 * A stacked sheet layer that pushes over the home sheet.
 * Used for detail, guide, favorites, plan, and cluster views.
 * When presented, the home sheet scales back (93.3%) via SheetStack's stacking animation.
 */
export function StackedSheet({
  presented,
  onClose,
  swipe = true,
  title,
  children,
}: StackedSheetProps) {
  // Track whether exit animation is complete before allowing unmount
  const [safeToUnmount, setSafeToUnmount] = useState(!presented);

  const handlePresentedChange = useCallback(
    (p: boolean) => {
      if (!p) onClose();
    },
    [onClose],
  );

  const handleSafeToUnmount = useCallback((safe: boolean) => {
    setSafeToUnmount(safe);
  }, []);

  // Keep content mounted until exit animation completes
  const shouldRenderContent = presented || !safeToUnmount;

  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={handlePresentedChange}
      onSafeToUnmountChange={handleSafeToUnmount}
      forComponent="closest"
      sheetRole="dialog"
    >
      <Sheet.Portal>
        <Sheet.View
          contentPlacement="bottom"
          swipeDismissal={swipe}
          inertOutside={false}
          nativeEdgeSwipePrevention={true}
          swipeOvershoot={true}
          style={{ zIndex: 31 }}
        >
          <Sheet.Content className="SilkSheet-content">
            <Sheet.BleedingBackground className="bg-bg-primary" />
            {title && <Sheet.Title className="sr-only">{title}</Sheet.Title>}

            <Sheet.SpecialWrapper.Root>
              <Sheet.SpecialWrapper.Content>
                {/* Close button header */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div /> {/* spacer */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-[44px] w-[44px] items-center justify-center"
                    aria-label="Sluiten"
                  >
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-bg-secondary">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M1 1l12 12M13 1L1 13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                </div>

                <Scroll.Root>
                  <Scroll.View
                    scrollGesture="auto"
                    scrollGestureTrap={{ yEnd: true }}
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
