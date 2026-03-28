'use client';

import type { LocationSummary } from '@/domain/types';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import { getPhotoUrl } from '@/lib/image';

interface CarouselCardProps {
  location: LocationSummary;
  onTap: (location: LocationSummary) => void;
  isActive?: boolean;
}

/**
 * Compact carousel card (~200px wide) for horizontal scrolling overlay.
 * Design spec: docs/v2/design-system.md §8.3
 */
export function CarouselCard({ location, onTap, isActive }: CarouselCardProps) {
  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';
  const score = location.ai_suitability_score_10;

  return (
    <button
      type="button"
      onClick={() => onTap(location)}
      className={`
        flex w-[200px] flex-shrink-0 snap-center gap-3
        rounded-card bg-bg-tertiary p-4 text-left
        transition-all duration-fast ease-spring
        ${isActive
          ? 'shadow-card ring-2 ring-accent/40 scale-[1.02]'
          : 'shadow-[0_1px_4px_rgba(0,0,0,0.08)] scale-100'
        }
      `}
    >
      {/* Photo */}
      <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-photo bg-bg-secondary">
        {getPhotoUrl(location.photo_url) ? (
          <img
            src={getPhotoUrl(location.photo_url)!}
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
        {/* Name — bold, single line */}
        <h3 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.025em] text-label">
          {location.name}
        </h3>

        {/* Type badge */}
        <span
          className="inline-flex w-fit items-center rounded-badge px-1.5 py-0.5 text-[11px] font-medium tracking-[0.014em] text-white"
          style={{ backgroundColor: typeColor }}
        >
          {LOCATION_TYPE_LABELS[location.type] ?? location.type}
        </span>

        {/* Score */}
        {score !== null && (
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-semibold tabular-nums text-accent">
              {score.toFixed(1)}
            </span>
            <span className="text-[11px] text-label-tertiary">/10</span>
          </div>
        )}
      </div>
    </button>
  );
}
