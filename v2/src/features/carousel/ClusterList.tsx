'use client';

import type { LocationSummary } from '@/domain/types';
import { LocationCard } from '@/components/patterns/LocationCard';

interface ClusterListProps {
  locations: LocationSummary[];
  onCardTap: (location: LocationSummary) => void;
  onClose: () => void;
}

/**
 * Vertical list of location cards shown in the sheet when a map cluster is tapped (mobile).
 * Replaces the horizontal CarouselOverlay on mobile.
 * Featured locations sort to top with "Aanbevolen" badge.
 */
export function ClusterList({ locations, onCardTap, onClose }: ClusterListProps) {
  return (
    <div>
      {/* Back button */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-[44px] items-center gap-1.5 text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[15px] font-medium">Terug naar kaart</span>
        </button>
      </div>

      {/* Count header */}
      <div className="px-4 pb-2">
        <p className="text-[13px] tracking-[0.002em] text-label-secondary">
          {locations.length} locaties in dit gebied
        </p>
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {locations.map((loc) => (
          <div key={loc.id} className="relative">
            <LocationCard
              location={loc}
              onTap={onCardTap}
              isSelected={false}
            />
            {loc.is_featured && (
              <span className="absolute right-2 top-2 z-[1] rounded-badge bg-accent px-2 py-0.5 text-[10px] font-medium text-white">
                Aanbevolen
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
