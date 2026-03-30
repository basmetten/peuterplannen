'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationQueries } from '@/features/map/queries';
import { LOCATION_TYPE_LABELS, PRICE_BAND_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { PriceBand } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';
import { getPhotoUrl } from '@/lib/image';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { HorizontalCardStrip } from '@/components/patterns/HorizontalCardStrip';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';
import { trackWebsiteClick, trackRouteClick, trackDetailScrollDepth } from '@/lib/analytics';

interface NearbyLocation extends LocationSummary {
  distance: number;
}

interface DetailViewProps {
  locationId: number;
  onClose: () => void;
  nearbyLocations?: NearbyLocation[];
  onNearbyTap?: (location: LocationSummary) => void;
}

export function DetailView({ locationId, onClose, nearbyLocations = [], onNearbyTap }: DetailViewProps) {
  const { data: location, isLoading } = useQuery(locationQueries.detail(locationId));
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInPlan, addToPlan, removeFromPlan } = usePlan();
  const [bouncing, setBouncing] = useState(false);

  const favorited = isFavorite(locationId);
  const inPlan = isInPlan(locationId);

  // Scroll depth tracking
  const firedRef = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const MILESTONES = [25, 50, 75, 100];

  const setMarkerRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    markerRefs.current[index] = el;
  }, []);

  useEffect(() => {
    firedRef.current = new Set<number>();

    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const depth = Number(entry.target.getAttribute('data-depth'));
        if (depth && !firedRef.current.has(depth)) {
          firedRef.current.add(depth);
          trackDetailScrollDepth(locationId, depth);
        }
      }
    }, { threshold: 0.1 });

    for (const el of markerRefs.current) {
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [locationId]);

  const handleToggleFavorite = () => {
    toggleFavorite(locationId);
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
  };

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
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-bg-primary px-4 pb-2">
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
      {getPhotoUrl(location.photo_url) && (
        <div className="mx-4 mb-4 overflow-hidden rounded-photo">
          <OptimizedImage
            src={location.photo_url}
            size="hero"
            alt={location.name}
            loading="eager"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {/* Scroll depth marker: 25% */}
      <div ref={setMarkerRef(0)} data-depth="25" aria-hidden="true" />

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
        {location.website && /^https?:\/\//i.test(location.website) && (
          <ActionButton
            label="Website"
            href={location.website}
            onClick={() => trackWebsiteClick(locationId, location.website!)}
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
          onClick={() => trackRouteClick(locationId, 'google_maps')}
          primary
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          }
        />
        <FavoriteActionButton
          favorited={favorited}
          bouncing={bouncing}
          onToggle={handleToggleFavorite}
        />
        <PlanActionButton
          inPlan={inPlan}
          onToggle={() => inPlan ? removeFromPlan(locationId) : addToPlan(locationId)}
        />
      </div>

      {/* Scroll depth marker: 50% */}
      <div ref={setMarkerRef(1)} data-depth="50" aria-hidden="true" />

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

      {/* Facilities */}
      {(location.coffee || location.diaper || location.weather) && (
        <>
          {/* Divider (after description OR after score section) */}
          <div className="hairline mx-4 my-4" />
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
        </>
      )}

      {/* Scroll depth marker: 75% */}
      <div ref={setMarkerRef(2)} data-depth="75" aria-hidden="true" />

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

      {/* Nearby locations */}
      {nearbyLocations.length > 0 && onNearbyTap && (
        <>
          <div className="hairline mx-4 my-4" />
          <div className="px-4">
            <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.025em] text-label">
              In de buurt
            </h3>
            <HorizontalCardStrip>
              {nearbyLocations.map(loc => (
                <div key={loc.id} className="min-w-[140px] flex-shrink-0">
                  <NearbyCard location={loc} onTap={() => onNearbyTap(loc)} />
                </div>
              ))}
            </HorizontalCardStrip>
          </div>
        </>
      )}

      {/* Scroll depth marker: 100% */}
      <div ref={setMarkerRef(3)} data-depth="100" aria-hidden="true" />
    </div>
  );
}

/** Action button (Apple Maps circular style) */
function ActionButton({
  label,
  href,
  icon,
  primary = false,
  onClick,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
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

/** Favorite action button (matches ActionButton style) */
function FavoriteActionButton({
  favorited,
  bouncing,
  onToggle,
}: {
  favorited: boolean;
  bouncing: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1"
      aria-label={favorited ? 'Verwijder uit favorieten' : 'Bewaar als favoriet'}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-fast ease-spring ${
          favorited ? 'bg-accent text-white' : 'bg-bg-secondary text-label'
        }`}
        style={{ transform: bouncing ? 'scale(1.2)' : 'scale(1)' }}
      >
        {favorited ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </div>
      <span className="text-[11px] tracking-[0.014em] text-accent">
        {favorited ? 'Bewaard' : 'Bewaren'}
      </span>
    </button>
  );
}

/** Plan action button (matches ActionButton style) */
function PlanActionButton({
  inPlan,
  onToggle,
}: {
  inPlan: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1"
      aria-label={inPlan ? 'Verwijder uit plan' : 'Toevoegen aan plan'}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-fast ease-spring ${
          inPlan ? 'bg-accent text-white' : 'bg-bg-secondary text-label'
        }`}
      >
        {inPlan ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </div>
      <span className="text-[11px] tracking-[0.014em] text-accent">
        {inPlan ? 'In plan' : 'Plan'}
      </span>
    </button>
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

/** Compact card for "In de buurt" horizontal scroll */
function NearbyCard({ location, onTap }: { location: NearbyLocation; onTap: () => void }) {
  const typeColor = TYPE_COLORS[location.type] ?? 'var(--color-label-secondary)';
  const distanceStr = location.distance < 1
    ? `${Math.round(location.distance * 1000)} m`
    : `${location.distance.toFixed(1)} km`;

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-[140px] flex-shrink-0 flex-col overflow-hidden rounded-card bg-bg-secondary"
    >
      {getPhotoUrl(location.photo_url) ? (
        <OptimizedImage
          src={location.photo_url}
          size="card"
          alt={location.name}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-bg-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-label-quaternary)" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}
      <div className="flex flex-col gap-0.5 p-2">
        <span className="truncate text-[13px] font-medium text-label">{location.name}</span>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: typeColor }}
          />
          <span className="text-[11px] text-label-secondary">{distanceStr}</span>
        </div>
      </div>
    </button>
  );
}

/** Loading skeleton */
function DetailSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4">
      <div className="mb-4 h-6 w-20 rounded-badge bg-bg-secondary" />
      <div className="mb-4 aspect-[4/3] w-full rounded-photo bg-bg-secondary" />
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
