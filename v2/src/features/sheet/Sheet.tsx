'use client';

import { useRef, useCallback, useEffect, type ReactNode } from 'react';
import { SNAP_POINTS, type SheetSnap } from './sheetMachine';

interface SheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  children: ReactNode;
  className?: string;
}

/** Pixel threshold to consider a drag intentional */
const DRAG_THRESHOLD = 10;
/** Velocity (px/ms) that triggers a fling */
const FLING_VELOCITY = 0.5;

/**
 * Find the closest snap point based on current position and drag direction.
 */
function resolveSnap(currentPct: number, velocity: number, isDetail: boolean): SheetSnap {
  const snaps: SheetSnap[] = isDetail
    ? ['hidden', 'half', 'full']
    : ['peek', 'half', 'full'];

  // Fling: snap in drag direction
  if (Math.abs(velocity) > FLING_VELOCITY) {
    if (velocity < 0) {
      // Dragging up → go to next higher snap
      return snaps.find((s) => SNAP_POINTS[s] > currentPct) ?? snaps[snaps.length - 1];
    } else {
      // Dragging down → go to next lower snap
      return [...snaps].reverse().find((s) => SNAP_POINTS[s] < currentPct) ?? snaps[0];
    }
  }

  // No fling: closest snap
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

export function Sheet({ snap, onSnapChange, children, className = '' }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isDragging: false,
    startY: 0,
    startPct: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  const snapPct = SNAP_POINTS[snap];
  const isDetail = snap === 'hidden' || !sheetRef.current; // rough heuristic
  const isHidden = snap === 'hidden';

  const handleDragStart = useCallback((clientY: number) => {
    const ds = dragState.current;
    ds.isDragging = true;
    ds.startY = clientY;
    ds.startPct = snapPct;
    ds.lastY = clientY;
    ds.lastTime = Date.now();
    ds.velocity = 0;
  }, [snapPct]);

  const handleDragMove = useCallback((clientY: number) => {
    const ds = dragState.current;
    if (!ds.isDragging || !sheetRef.current) return;

    const deltaY = ds.startY - clientY;
    const viewportH = window.innerHeight;
    const deltaPct = (deltaY / viewportH) * 100;
    const newPct = Math.max(0, Math.min(100, ds.startPct + deltaPct));

    // Track velocity
    const now = Date.now();
    const dt = now - ds.lastTime;
    if (dt > 0) {
      ds.velocity = (ds.lastY - clientY) / dt; // positive = dragging up
    }
    ds.lastY = clientY;
    ds.lastTime = now;

    // Apply transform directly for 60fps
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translateY(${100 - newPct}%)`;
  }, []);

  const handleDragEnd = useCallback(() => {
    const ds = dragState.current;
    if (!ds.isDragging || !sheetRef.current) return;
    ds.isDragging = false;

    // Calculate current position
    const transform = sheetRef.current.style.transform;
    const match = transform.match(/translateY\((.+)%\)/);
    const translatePct = match ? parseFloat(match[1]) : 100 - snapPct;
    const currentPct = 100 - translatePct;

    // Reset transition
    sheetRef.current.style.transition = '';
    sheetRef.current.style.transform = '';

    const resolved = resolveSnap(currentPct, ds.velocity, false);
    onSnapChange(resolved);
  }, [snapPct, onSnapChange]);

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle touch on the drag handle area (first 44px)
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touchY = e.touches[0].clientY;
    const sheetTop = rect.top;
    // Allow drag from handle area (top 48px) or when scrolled to top
    if (touchY - sheetTop < 48) {
      handleDragStart(e.touches[0].clientY);
    }
  }, [handleDragStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragState.current.isDragging) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    }
  }, [handleDragMove]);

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Corner radius: 16px at peek, morphing to 0 at full
  const radiusScale = snap === 'full' ? 0 : 1;

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col bg-bg-primary will-change-transform ${className}`}
      style={{
        transform: isHidden ? 'translateY(100%)' : `translateY(${100 - snapPct}%)`,
        transition: 'transform var(--duration-sheet) var(--ease-default)',
        borderTopLeftRadius: `calc(var(--radius-sheet) * ${radiusScale})`,
        borderTopRightRadius: `calc(var(--radius-sheet) * ${radiusScale})`,
        boxShadow: isHidden ? 'none' : 'var(--shadow-sheet)',
        height: '100%',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex flex-shrink-0 items-center justify-center py-2">
        <div
          className="h-[5px] w-9 rounded-full"
          style={{ background: 'rgba(160, 130, 110, 0.30)' }}
        />
      </div>

      {/* Sheet content (scrollable) */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
