'use client';

import { useCallback, useRef } from 'react';

/**
 * iOS-like press feedback: scale down on press, spring back on release.
 * Necessary because iOS Safari doesn't reliably trigger :active CSS.
 */
export function usePressable() {
  const ref = useRef<HTMLElement>(null);

  const onPointerDown = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'scale(0.96)';
    ref.current.style.transition = 'transform 80ms ease-out';
  }, []);

  const onPointerUp = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'scale(1)';
    ref.current.style.transition = 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)';
  }, []);

  return {
    ref,
    onPointerDown,
    onPointerUp,
    onPointerLeave: onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
