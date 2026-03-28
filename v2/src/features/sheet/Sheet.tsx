'use client';

import { useRef, useCallback, useEffect, type ReactNode } from 'react';
import { SNAP_POINTS, type SheetSnap } from './sheetMachine';

interface SheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  children: ReactNode;
  className?: string;
}

/** Pixels of movement before we commit to a drag direction */
const DRAG_THRESHOLD = 8;
/** Velocity (px/ms) that triggers a fling to the next snap */
const FLING_VELOCITY = 0.4;

/**
 * Resolve which snap point to land on after a drag ends.
 * Uses velocity for flings, otherwise picks the closest snap.
 */
function resolveSnap(currentPct: number, velocity: number, snaps: SheetSnap[]): SheetSnap {
  if (Math.abs(velocity) > FLING_VELOCITY) {
    if (velocity < 0) {
      // Dragging up → next higher snap
      return snaps.find((s) => SNAP_POINTS[s] > currentPct + 2) ?? snaps[snaps.length - 1];
    }
    // Dragging down → next lower snap
    return [...snaps].reverse().find((s) => SNAP_POINTS[s] < currentPct - 2) ?? snaps[0];
  }

  let closest = snaps[0];
  let closestDist = Infinity;
  for (const s of snaps) {
    const dist = Math.abs(SNAP_POINTS[s] - currentPct);
    if (dist < closestDist) {
      closestDist = dist;
      closest = s;
    }
  }
  return closest;
}

/**
 * Compute corner radius based on sheet position.
 * 16px from hidden through half, linearly morphs to 0 at full.
 */
function computeRadius(pct: number): number {
  const halfPct = SNAP_POINTS.half;
  const fullPct = SNAP_POINTS.full;
  if (pct <= halfPct) return 16;
  if (pct >= fullPct) return 0;
  return 16 * (1 - (pct - halfPct) / (fullPct - halfPct));
}

export function Sheet({ snap, onSnapChange, children, className = '' }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dragState = useRef({
    active: false,
    startY: 0,
    startPct: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    committed: false,
    source: 'handle' as 'handle' | 'scroll',
    // Scroll-to-drag tracking
    touchStartY: 0,
    scrollTopAtStart: 0,
  });

  const snapPct = SNAP_POINTS[snap];
  const isHidden = snap === 'hidden';

  // Available snap points (browse mode — detail mode handled by parent via onSnapChange)
  const snapsRef = useRef<SheetSnap[]>(['peek', 'half', 'full']);

  // --- Core drag logic ---

  const applyPosition = useCallback((pct: number) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${100 - pct}%)`;
    const r = computeRadius(pct);
    el.style.borderTopLeftRadius = `${r}px`;
    el.style.borderTopRightRadius = `${r}px`;
  }, []);

  const clearInlineStyles = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.borderTopLeftRadius = '';
    el.style.borderTopRightRadius = '';
  }, []);

  const getCurrentPct = useCallback((): number => {
    const el = sheetRef.current;
    if (!el) return snapPct;
    const match = el.style.transform.match(/translateY\((.+)%\)/);
    return match ? 100 - parseFloat(match[1]) : snapPct;
  }, [snapPct]);

  const trackVelocity = useCallback((clientY: number) => {
    const ds = dragState.current;
    const now = performance.now();
    const dt = now - ds.lastTime;
    if (dt > 0 && dt < 100) {
      // Exponential moving average for smooth velocity
      const instant = (ds.lastY - clientY) / dt; // positive = up
      ds.velocity = ds.velocity * 0.6 + instant * 0.4;
    }
    ds.lastY = clientY;
    ds.lastTime = now;
  }, []);

  const beginDrag = useCallback((clientY: number, source: 'handle' | 'scroll') => {
    const ds = dragState.current;
    ds.active = true;
    ds.startY = clientY;
    ds.startPct = snapPct;
    ds.lastY = clientY;
    ds.lastTime = performance.now();
    ds.velocity = 0;
    ds.committed = false;
    ds.source = source;

    // Disable scroll while dragging
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = 'hidden';
    }
  }, [snapPct]);

  const moveDrag = useCallback((clientY: number) => {
    const ds = dragState.current;
    if (!ds.active) return;

    const deltaY = ds.startY - clientY;

    // Wait for threshold before committing to drag
    if (!ds.committed) {
      if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
      ds.committed = true;
      // Reset start so first visible frame isn't a jump
      ds.startY = clientY;
      ds.lastY = clientY;
      ds.lastTime = performance.now();
      return;
    }

    trackVelocity(clientY);

    const viewportH = window.innerHeight;
    const deltaPct = (ds.startY - clientY) / viewportH * 100;
    const newPct = Math.max(0, Math.min(100, ds.startPct + deltaPct));

    applyPosition(newPct);
  }, [applyPosition, trackVelocity]);

  const endDrag = useCallback(() => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.active = false;

    // Re-enable scroll
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = '';
    }

    // If we never committed, no movement happened
    if (!ds.committed) {
      clearInlineStyles();
      return;
    }

    const currentPct = getCurrentPct();
    clearInlineStyles();

    const resolved = resolveSnap(currentPct, ds.velocity, snapsRef.current);
    onSnapChange(resolved);
  }, [getCurrentPct, clearInlineStyles, onSnapChange]);

  // --- Handle touch (always starts drag) ---

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scroll
    beginDrag(e.touches[0].clientY, 'handle');
  }, [beginDrag]);

  // Handle-initiated drags use global listeners for move/end
  useEffect(() => {
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
  }, [moveDrag, endDrag]);

  // --- Scroll-to-drag handoff ---
  // When user is scrolled to top and pulls down, sheet should start moving down.

  const onScrollTouchStart = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    const scrollEl = scrollRef.current;
    ds.touchStartY = e.touches[0].clientY;
    ds.scrollTopAtStart = scrollEl?.scrollTop ?? 0;
  }, []);

  const onScrollTouchMove = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    const scrollEl = scrollRef.current;

    // If we're already in sheet-drag mode, continue dragging
    if (ds.active && ds.source === 'scroll') {
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
      return;
    }

    // Don't initiate from scroll if we're already dragging from handle
    if (ds.active) return;

    if (!scrollEl) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - ds.touchStartY; // positive = pulling down

    // Scroll-to-drag handoff:
    // If content is at the top AND user is pulling down past threshold
    if (scrollEl.scrollTop <= 0 && deltaY > DRAG_THRESHOLD && ds.scrollTopAtStart <= 0) {
      e.preventDefault();
      beginDrag(currentY, 'scroll');
    }
  }, [beginDrag, moveDrag]);

  const onScrollTouchEnd = useCallback(() => {
    const ds = dragState.current;
    if (ds.active && ds.source === 'scroll') {
      endDrag();
    }
  }, [endDrag]);

  // --- Computed styles ---

  const radiusValue = computeRadius(snapPct);

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col bg-bg-primary will-change-transform ${className}`}
      style={{
        transform: isHidden ? 'translateY(100%)' : `translateY(${100 - snapPct}%)`,
        transition: 'transform var(--duration-sheet) var(--ease-default), border-radius var(--duration-fast) var(--ease-default)',
        borderTopLeftRadius: `${radiusValue}px`,
        borderTopRightRadius: `${radiusValue}px`,
        boxShadow: isHidden ? 'none' : 'var(--shadow-sheet)',
        height: '100%',
      }}
    >
      {/* Drag handle — touch-none prevents browser scroll interference */}
      <div
        className="flex flex-shrink-0 touch-none items-center justify-center py-2"
        onTouchStart={onHandleTouchStart}
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
        onTouchStart={onScrollTouchStart}
        onTouchMove={onScrollTouchMove}
        onTouchEnd={onScrollTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
