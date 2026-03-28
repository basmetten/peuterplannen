'use client';

import type { LocationSummary } from '@/domain/types';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';

interface LocationCardProps {
  location: LocationSummary;
  onTap: (location: LocationSummary) => void;
  isSelected?: boolean;
}

export function LocationCard({ location, onTap, isSelected }: LocationCardProps) {
  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';
  const score = location.ai_suitability_score_10;

  return (
    <button
      type="button"
      onClick={() => onTap(location)}
      className={`
        flex w-full gap-3 rounded-card bg-bg-tertiary p-4 text-left
        transition-shadow duration-fast ease-spring
        ${isSelected ? 'shadow-card ring-2 ring-accent/30' : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'}
      `}
    >
      {/* Photo */}
      <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-photo bg-bg-secondary">
        {location.photo_url ? (
          <img
            src={location.photo_url}
            alt={location.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-label-tertiary">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
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
