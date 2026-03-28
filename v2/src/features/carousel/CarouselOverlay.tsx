'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { LocationSummary } from '@/domain/types';
import { CarouselCard } from './CarouselCard';

interface CarouselOverlayProps {
  /** Locations to display in the carousel */
  locations: LocationSummary[];
  /** Currently highlighted location (synced with map marker) */
  activeId: number | null;
  /** Called when a card is tapped */
  onCardTap: (location: LocationSummary) => void;
  /** Called when the active card changes via scroll */
  onActiveChange: (locationId: number) => void;
  /** Whether the carousel is visible */
  visible: boolean;
}

/**
 * Horizontal scroll-snap carousel floating above the map.
 * Appears when a small cluster (≤5, zoom ≥14) is tapped.
 * Not part of the sheet — map-level overlay.
 *
 * Spec: docs/v2/user-flows.md §8, docs/v2/information-architecture.md §4
 */
export function CarouselOverlay({
  locations,
  activeId,
  onCardTap,
  onActiveChange,
  visible,
}: CarouselOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Detect active card after scroll ends
  const handleScrollEnd = useCallback(() => {
    const container = scrollRef.current;
    if (!container || locations.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestId = locations[0].id;
    let closestDist = Infinity;

    for (const child of container.children) {
      const childRect = child.getBoundingClientRect();
      const childCenter = childRect.left + childRect.width / 2;
      const dist = Math.abs(childCenter - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        const id = Number(child.getAttribute('data-id'));
        if (!isNaN(id)) closestId = id;
      }
    }

    if (closestId !== activeId) {
      onActiveChange(closestId);
    }
    isScrollingRef.current = false;
  }, [locations, activeId, onActiveChange]);

  // Use scrollend if supported, fall back to scroll + debounce
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Modern browsers: scrollend event
    if ('onscrollend' in window) {
      container.addEventListener('scrollend', handleScrollEnd);
      return () => container.removeEventListener('scrollend', handleScrollEnd);
    }

    // Fallback: debounced scroll
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      isScrollingRef.current = true;
      clearTimeout(timer);
      timer = setTimeout(handleScrollEnd, 120);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [handleScrollEnd]);

  // Scroll to the active card when activeId changes externally (e.g. marker tap)
  useEffect(() => {
    if (!activeId || isScrollingRef.current) return;
    const container = scrollRef.current;
    if (!container) return;

    const target = container.querySelector(`[data-id="${activeId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <div
      className={`
        pointer-events-none fixed inset-x-0 bottom-0 z-20
        transition-transform duration-default ease-spring
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div
        ref={scrollRef}
        className="
          pointer-events-auto flex gap-3 overflow-x-auto
          scroll-smooth px-4 pb-2
          scrollbar-none
        "
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {locations.map((loc) => (
          <div key={loc.id} data-id={loc.id} className="snap-center">
            <CarouselCard
              location={loc}
              onTap={onCardTap}
              isActive={loc.id === activeId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
