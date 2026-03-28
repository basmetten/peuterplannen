'use client';

import { useQuery } from '@tanstack/react-query';
import { locationQueries } from '@/features/map/queries';
import { LOCATION_TYPE_LABELS, PRICE_BAND_LABELS } from '@/domain/enums';
import type { PriceBand } from '@/domain/enums';

interface DetailViewProps {
  locationId: number;
  onClose: () => void;
}

/** Category color mapping */
const TYPE_COLORS: Record<string, string> = {
  play: 'var(--color-cat-play)',
  farm: 'var(--color-cat-farm)',
  nature: 'var(--color-cat-nature)',
  museum: 'var(--color-cat-museum)',
  culture: 'var(--color-cat-culture)',
  swim: 'var(--color-cat-swim)',
  pancake: 'var(--color-cat-pancake)',
  horeca: 'var(--color-cat-horeca)',
};

export function DetailView({ locationId, onClose }: DetailViewProps) {
  const { data: location, isLoading } = useQuery(locationQueries.detail(locationId));

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!location) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-label-secondary">Locatie niet gevonden</p>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';
  const score = location.ai_suitability_score_10;

  return (
    <div className="pb-8">
      {/* Back button */}
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-bg-primary/95 px-4 pb-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full transition-colors hover:bg-bg-secondary"
          aria-label="Terug"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1" />
      </div>

      {/* Hero photo */}
      {location.photo_url && (
        <div className="mx-4 mb-4 overflow-hidden rounded-photo">
          <img
            src={location.photo_url}
            alt={location.name}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="px-4">
        {/* Type badge */}
        <span
          className="inline-flex items-center rounded-badge px-2 py-0.5 text-[11px] font-medium tracking-[0.014em] text-white"
          style={{ backgroundColor: typeColor }}
        >
          {LOCATION_TYPE_LABELS[location.type] ?? location.type}
        </span>

        {/* Name (Newsreader) */}
        <h2 className="mt-2 font-accent text-[28px] font-normal leading-[1.15] tracking-[-0.029em] text-label">
          {location.name}
        </h2>

        {/* Region */}
        <p className="mt-1 text-[15px] tracking-normal text-label-secondary">
          {location.region}
        </p>

        {/* Score + price */}
        <div className="mt-3 flex items-center gap-4">
          {score !== null && (
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: scoreColor(score) }}
              >
                {score.toFixed(1)}
              </div>
              <span className="text-[13px] text-label-secondary">Peuterscore</span>
            </div>
          )}

          {location.price_band && (
            <span className="text-[13px] text-label-secondary">
              {PRICE_BAND_LABELS[location.price_band as PriceBand]}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="hairline mx-4 my-4" />

      {/* Action buttons (Apple Maps style) */}
      <div className="flex justify-center gap-4 px-4">
        {location.website && (
          <ActionButton
            label="Website"
            href={location.website}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
          />
        )}
        <ActionButton
          label="Route"
          href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
          primary
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          }
        />
      </div>

      {/* Divider */}
      <div className="hairline mx-4 my-4" />

      {/* Description */}
      {location.description && (
        <div className="px-4">
          <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.025em] text-label">
            Over deze locatie
          </h3>
          <p className="text-[15px] leading-[1.5] tracking-normal text-label-secondary">
            {location.description}
          </p>
        </div>
      )}

      {/* Divider */}
      {location.description && <div className="hairline mx-4 my-4" />}

      {/* Facilities */}
      <div className="px-4">
        <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.025em] text-label">
          Faciliteiten
        </h3>
        <div className="flex flex-wrap gap-2">
          {location.coffee && <FacilityBadge label="Koffie" />}
          {location.diaper && <FacilityBadge label="Verschoonplek" />}
          {location.weather && <FacilityBadge label={weatherLabel(location.weather)} />}
        </div>
      </div>

      {/* Opening hours */}
      {location.opening_hours && (
        <>
          <div className="hairline mx-4 my-4" />
          <div className="px-4">
            <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.025em] text-label">
              Openingstijden
            </h3>
            <p className="whitespace-pre-line text-[15px] leading-[1.5] tracking-normal text-label-secondary">
              {location.opening_hours}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Action button (Apple Maps circular style) */
function ActionButton({
  label,
  href,
  icon,
  primary = false,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          primary
            ? 'bg-accent text-white'
            : 'bg-bg-secondary text-label'
        }`}
      >
        {icon}
      </div>
      <span className="text-[11px] tracking-[0.014em] text-accent">
        {label}
      </span>
    </a>
  );
}

/** Facility badge */
function FacilityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-badge bg-bg-secondary px-2.5 py-1 text-[13px] tracking-[0.002em] text-label-secondary">
      {label}
    </span>
  );
}

/** Score color based on value */
function scoreColor(score: number): string {
  if (score >= 8) return 'var(--color-system-green)';
  if (score >= 6) return 'var(--color-accent)';
  return 'var(--color-label-secondary)';
}

/** Weather label */
function weatherLabel(weather: string): string {
  switch (weather) {
    case 'indoor': return 'Binnen';
    case 'outdoor': return 'Buiten';
    case 'both': return 'Binnen & buiten';
    default: return weather;
  }
}

/** Loading skeleton */
function DetailSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4">
      <div className="mb-4 h-6 w-20 rounded-badge bg-bg-secondary" />
      <div className="mb-3 aspect-[4/3] w-full rounded-photo bg-bg-secondary" />
      <div className="mb-2 h-8 w-3/4 rounded bg-bg-secondary" />
      <div className="mb-4 h-4 w-1/3 rounded bg-bg-secondary" />
      <div className="mb-8 flex gap-4">
        <div className="h-12 w-12 rounded-full bg-bg-secondary" />
        <div className="h-12 w-12 rounded-full bg-bg-secondary" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-bg-secondary" />
        <div className="h-4 w-5/6 rounded bg-bg-secondary" />
        <div className="h-4 w-4/6 rounded bg-bg-secondary" />
      </div>
    </div>
  );
}
