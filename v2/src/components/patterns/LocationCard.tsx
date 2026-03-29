'use client';

import { useState } from 'react';
import type { LocationSummary } from '@/domain/types';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';

interface LocationCardProps {
  location: LocationSummary;
  onTap: (location: LocationSummary) => void;
  isSelected?: boolean;
}

export function LocationCard({ location, onTap, isSelected }: LocationCardProps) {
  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';
  const score = location.ai_suitability_score_10;
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(location.id);
  const [bouncing, setBouncing] = useState(false);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(location.id);
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
  };

  return (
    <button
      type="button"
      data-testid="location-card"
      onClick={() => onTap(location)}
      className={`
        relative flex w-full gap-3 rounded-card bg-bg-tertiary p-4 text-left
        transition-shadow duration-fast ease-spring
        ${isSelected ? 'shadow-card ring-2 ring-accent/30' : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'}
      `}
    >
      {/* Favorite heart button */}
      <span
        role="button"
        tabIndex={0}
        aria-label={favorited ? 'Verwijder uit favorieten' : 'Bewaar als favoriet'}
        onClick={handleHeartClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHeartClick(e as unknown as React.MouseEvent); } }}
        className="absolute right-2 top-2 z-[1] flex h-[28px] w-[28px] items-center justify-center rounded-full bg-bg-tertiary/80 backdrop-blur-sm transition-transform duration-fast ease-spring"
        style={{ transform: bouncing ? 'scale(1.25)' : 'scale(1)' }}
      >
        {favorited ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-label-tertiary">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </span>

      {/* Photo */}
      <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-photo bg-bg-secondary">
        <OptimizedImage
          src={location.photo_url}
          size="card"
          alt={location.name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Name */}
        <h3 className="truncate text-[15px] font-semibold tracking-[-0.025em] text-label">
          {location.name}
        </h3>

        {/* Type badge + score */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-badge px-1.5 py-0.5 text-[11px] font-medium tracking-[0.014em] text-white"
            style={{ backgroundColor: typeColor }}
          >
            {LOCATION_TYPE_LABELS[location.type] ?? location.type}
          </span>

          {score !== null && (
            <span className="text-[13px] font-medium tabular-nums tracking-[0.002em] text-label-secondary">
              {score.toFixed(1)}
            </span>
          )}
        </div>

        {/* Highlight */}
        {location.toddler_highlight && (
          <p className="truncate text-[13px] tracking-[0.002em] text-label-secondary">
            {location.toddler_highlight}
          </p>
        )}
      </div>
    </button>
  );
}
