'use client';

import { useState, useEffect } from 'react';

/** Breakpoint where layout switches from mobile sheet to desktop sidebar */
const DESKTOP_BREAKPOINT = 768;

/**
 * Returns true when viewport is ≥ 768px (desktop/tablet sidebar layout).
 * SSR-safe: defaults to false (mobile-first), updates on mount.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
