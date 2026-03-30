'use client';

import { useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
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
 */
export function CarouselOverlay({
  locations,
  activeId,
  onCardTap,
  onActiveChange,
  visible,
}: CarouselOverlayProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'keepSnaps',
  });

  // Sync active card when Embla settles on a new slide
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    const loc = locations[index];
    if (loc && loc.id !== activeId) {
      onActiveChange(loc.id);
    }
  }, [emblaApi, locations, activeId, onActiveChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Scroll to active card when activeId changes externally (e.g. marker tap)
  useEffect(() => {
    if (!emblaApi || !activeId) return;
    const index = locations.findIndex((l) => l.id === activeId);
    if (index >= 0 && index !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(index);
    }
  }, [emblaApi, activeId, locations]);

  return (
    <div
      className={`
        pointer-events-none fixed inset-x-0 bottom-0 z-20
        transition-transform duration-default ease-spring
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="pointer-events-auto overflow-hidden px-4 pb-2" ref={emblaRef}>
        <div className="flex gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="min-w-0 flex-shrink-0">
              <CarouselCard
                location={loc}
                onTap={onCardTap}
                isActive={loc.id === activeId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
