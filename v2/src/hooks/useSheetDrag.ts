'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { SNAP_POINTS, type SheetSnap } from '@/features/sheet/sheetMachine';

/* ---------- Constants ---------- */

/** Pixels of movement before we commit to a drag direction */
const DRAG_THRESHOLD = 8;
/** Velocity (px/ms) that triggers a fling to the next snap */
const FLING_VELOCITY = 0.4;
/** Velocity (px/ms) that triggers a strong fling to first/last snap */
const STRONG_FLING_VELOCITY = 2.0;
/** After a scroll-blocked drag attempt, ignore drags for this many ms (vaul pattern) */
const SCROLL_LOCK_TIMEOUT = 100;

/* ---------- Pure helpers ---------- */

/**
 * Resolve which snap point to land on after a drag ends.
 * Uses velocity for flings, otherwise picks the closest snap.
 */
export function resolveSnap(
  currentPct: number,
  velocity: number,
  snaps: SheetSnap[],
): SheetSnap {
  const absVelocity = Math.abs(velocity);

  // Strong fling (>2 px/ms): jump to first or last snap (vaul pattern)
  if (absVelocity > STRONG_FLING_VELOCITY) {
    return velocity > 0 ? snaps[snaps.length - 1] : snaps[0];
  }

  // Normal fling (>0.4 px/ms): move one snap in drag direction
  if (absVelocity > FLING_VELOCITY) {
    if (velocity < 0) {
      // Dragging down → next lower snap
      return (
        [...snaps].reverse().find((s) => SNAP_POINTS[s] < currentPct - 2) ??
        snaps[0]
      );
    }
    // Dragging up → next higher snap
    return (
      snaps.find((s) => SNAP_POINTS[s] > currentPct + 2) ??
      snaps[snaps.length - 1]
    );
  }

  // Slow drag: closest snap by absolute distance
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
 * Logarithmic rubber-band resistance when dragging past bounds (vaul pattern).
 * At 100px overshoot → ~21px movement. At 300px → ~30px. Heavy resistance.
 */
function rubberBand(offset: number): number {
  return Math.max(0, 8 * (Math.log(offset + 1) - 2));
}

/**
 * Compute distance-proportional spring duration.
 * Short snaps (25%): ~250ms (snappy). Long snaps (67%): ~450ms (smooth).
 */
export function getSpringDuration(fromPct: number, toPct: number): number {
  const distance = Math.abs(fromPct - toPct);
  const factor = Math.min(distance / 50, 1);
  return Math.round(200 + factor * 250);
}

/* ---------- Hook ---------- */

interface UseSheetDragOptions {
  /** Current snap state */
  snap: SheetSnap;
  /** Which snaps are available (e.g., ['peek', 'half', 'full']) */
  availableSnaps: SheetSnap[];
  /** Called when drag resolves to a new snap */
  onSnapChange: (snap: SheetSnap) => void;
  /** Set to false on desktop to disable all drag handling */
  enabled: boolean;
}

interface UseSheetDragReturn {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  handleTouchStart: (e: React.TouchEvent) => void;
  scrollTouchStart: (e: React.TouchEvent) => void;
  scrollTouchMove: (e: React.TouchEvent) => void;
  scrollTouchEnd: () => void;
  /** Distance-proportional spring duration (ms) for the current snap transition. Resets to null after animation. */
  springDuration: number | null;
}

interface DragState {
  active: boolean;
  startY: number;
  startPct: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  committed: boolean;
  source: 'handle' | 'scroll';
  // Scroll-to-drag tracking
  touchStartY: number;
  scrollTopAtStart: number;
  // Scroll lock: timestamp of last scroll-blocked drag attempt (vaul pattern)
  lastScrollBlockTime: number;
}

export function useSheetDrag({
  snap,
  availableSnaps,
  onSnapChange,
  enabled,
}: UseSheetDragOptions): UseSheetDragReturn {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const snapPct = SNAP_POINTS[snap];

  // Track current position in a ref (replaces regex parsing of inline styles)
  const currentPctRef = useRef<number>(snapPct);

  // Keep snap options in a ref for stable closure access
  const snapsRef = useRef(availableSnaps);
  snapsRef.current = availableSnaps;

  // Keep snap pct in a ref for closures
  const snapPctRef = useRef(snapPct);
  snapPctRef.current = snapPct;

  // Sync currentPctRef when snap changes externally (not during drag)
  const dragState = useRef<DragState>({
    active: false,
    startY: 0,
    startPct: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    committed: false,
    source: 'handle',
    touchStartY: 0,
    scrollTopAtStart: 0,
    lastScrollBlockTime: 0,
  });

  // When snap changes from outside (state machine), sync position ref
  useEffect(() => {
    if (!dragState.current.active) {
      currentPctRef.current = SNAP_POINTS[snap];
    }
  }, [snap]);

  // --- Overscroll prevention at full state ---
  // Suppress iOS Safari elastic bounce when at full snap
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !enabled) return;
    if (snap === 'full') {
      scrollEl.style.overscrollBehaviorY = 'none';
    } else {
      scrollEl.style.overscrollBehaviorY = '';
    }
  }, [snap, enabled]);

  /* --- Core drag logic --- */

  const applyPosition = useCallback((pct: number) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${100 - pct}%)`;
    currentPctRef.current = pct;
  }, []);

  const clearInlineStyles = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
  }, []);

  // Distance-proportional spring duration — exposed as state so the component
  // can use it in its React-controlled style prop. This avoids race conditions
  // between direct DOM manipulation and React's style reconciliation.
  const [springDuration, setSpringDuration] = useState<number | null>(null);
  const springTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    ds.startPct = snapPctRef.current;
    ds.lastY = clientY;
    ds.lastTime = performance.now();
    ds.velocity = 0;
    ds.committed = false;
    ds.source = source;

    // Disable scroll while dragging
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = 'hidden';
    }
  }, []);

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
    const deltaPct = ((ds.startY - clientY) / viewportH) * 100;
    let newPct = ds.startPct + deltaPct;

    // Determine bounds from available snaps
    const minPct = SNAP_POINTS[snapsRef.current[0]];
    const maxPct = SNAP_POINTS[snapsRef.current[snapsRef.current.length - 1]];

    // Apply rubber-banding at edges instead of hard clamping
    if (newPct < minPct) {
      const overshoot = minPct - newPct;
      newPct = minPct - rubberBand(overshoot);
    } else if (newPct > maxPct) {
      const overshoot = newPct - maxPct;
      newPct = maxPct + rubberBand(overshoot);
    }

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

    const fromPct = currentPctRef.current;
    const resolved = resolveSnap(fromPct, ds.velocity, snapsRef.current);
    const toPct = SNAP_POINTS[resolved];

    // Clear drag overrides so React's style prop controls transform
    clearInlineStyles();

    // Set distance-proportional duration — component reads this via springDuration
    const duration = getSpringDuration(fromPct, toPct);
    setSpringDuration(duration);

    // Reset to default after animation completes
    if (springTimerRef.current) clearTimeout(springTimerRef.current);
    springTimerRef.current = setTimeout(() => setSpringDuration(null), duration + 50);

    // Notify parent → React re-renders with new transform + our custom duration
    onSnapChange(resolved);
  }, [clearInlineStyles, onSnapChange]);

  /* --- Handle touch (always starts drag) --- */

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault(); // Prevent scroll
    beginDrag(e.touches[0].clientY, 'handle');
  }, [enabled, beginDrag]);

  // Handle-initiated drags use global listeners for move/end
  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled, moveDrag, endDrag]);

  /* --- Scroll-to-drag handoff --- */

  const scrollTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const ds = dragState.current;
    ds.touchStartY = e.touches[0].clientY;
    ds.scrollTopAtStart = scrollRef.current?.scrollTop ?? 0;

    // At non-full snaps, prevent content scroll entirely (Apple Maps behavior)
    const isAtFull = snapPctRef.current >= SNAP_POINTS[snapsRef.current[snapsRef.current.length - 1]];
    if (!isAtFull && scrollRef.current) {
      scrollRef.current.style.overflowY = 'hidden';
    }
  }, [enabled]);

  const scrollTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const ds = dragState.current;

    // If we're already in sheet-drag mode, continue dragging
    if (ds.active && ds.source === 'scroll') {
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
      return;
    }

    // Don't initiate from scroll if we're already dragging from handle
    if (ds.active) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - ds.touchStartY; // positive = pulling down
    const absDelta = Math.abs(deltaY);

    // Apple Maps behavior: at non-full snaps, swiping ANYWHERE moves the sheet.
    // Content scrolling is only allowed at the full (highest) snap.
    const isAtFull = snapPctRef.current >= SNAP_POINTS[snapsRef.current[snapsRef.current.length - 1]];

    if (!isAtFull) {
      // At peek/half: always drag the sheet, never scroll content
      if (absDelta > DRAG_THRESHOLD) {
        e.preventDefault();
        beginDrag(currentY, 'scroll');
      }
      return;
    }

    // --- At full snap: scroll-to-drag handoff (pull down past scrollTop=0) ---

    const scrollTop = scrollEl.scrollTop;

    // If content is NOT at the top, record scroll block time (vaul pattern).
    if (scrollTop > 0) {
      ds.lastScrollBlockTime = performance.now();
      return;
    }

    // Scroll lock: ignore drag attempts within 100ms of a scroll-blocked event
    if (performance.now() - ds.lastScrollBlockTime < SCROLL_LOCK_TIMEOUT) {
      return;
    }

    if (
      scrollTop <= 0 &&
      deltaY > DRAG_THRESHOLD &&
      ds.scrollTopAtStart <= 0
    ) {
      e.preventDefault();
      beginDrag(currentY, 'scroll');
      dragState.current.velocity = -0.1; // slight downward momentum
    }
  }, [enabled, beginDrag, moveDrag]);

  const scrollTouchEnd = useCallback(() => {
    if (!enabled) return;
    // Restore scroll if we locked it at non-full snap
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = '';
    }
    const ds = dragState.current;
    if (ds.active && ds.source === 'scroll') {
      endDrag();
    }
  }, [enabled, endDrag]);

  return {
    sheetRef,
    scrollRef,
    handleTouchStart,
    scrollTouchStart,
    scrollTouchMove,
    scrollTouchEnd,
    springDuration,
  };
}
