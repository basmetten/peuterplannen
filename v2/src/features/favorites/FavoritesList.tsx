'use client';

import { useMemo } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { LocationCard } from '@/components/patterns/LocationCard';
import type { LocationSummary } from '@/domain/types';

interface FavoritesListProps {
  locations: LocationSummary[];
  onCardTap: (location: LocationSummary) => void;
  selectedId: number | null;
}

export function FavoritesList({ locations, onCardTap, selectedId }: FavoritesListProps) {
  const { favorites } = useFavorites();

  const favoriteLocations = useMemo(
    () => locations.filter((loc) => favorites.has(loc.id)),
    [locations, favorites],
  );

  if (favoriteLocations.length === 0) {
    return <FavoritesEmptyState />;
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-label">
          Bewaard
        </h2>
        <p className="mt-0.5 text-[13px] tracking-[0.002em] text-label-secondary">
          {favoriteLocations.length} {favoriteLocations.length === 1 ? 'locatie' : 'locaties'}
        </p>
      </div>

      {/* Divider */}
      <div className="hairline" />

      {/* Card list */}
      <div className="flex flex-col gap-2 px-4 py-3">
        {favoriteLocations.map((loc, i) => (
          <div
            key={loc.id}
            className="animate-[fadeSlideIn_300ms_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <LocationCard
              location={loc}
              onTap={onCardTap}
              isSelected={loc.id === selectedId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoritesEmptyState() {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      {/* Heart icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-label-tertiary">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-label">
        Nog geen favorieten
      </h3>
      <p className="mt-2 text-[15px] leading-[1.5] tracking-normal text-label-secondary">
        Tik op het hartje bij een locatie om deze te bewaren
      </p>
    </div>
  );
}
