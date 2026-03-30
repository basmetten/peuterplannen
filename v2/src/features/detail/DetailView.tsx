'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
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

  const handleShare = () => {
    const regionSlug = location?.region?.toLowerCase().replace(/\s+/g, '-') ?? '';
    const shareUrl = location
      ? `${window.location.origin}/${regionSlug}/${location.slug}`
      : window.location.href;
    if (navigator.share) {
      navigator.share({ url: shareUrl, title: location?.name ?? '' });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
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

  // Check if any "Goed om te weten" fields exist
  const hasGoodToKnow = !!(
    location.buggy_friendliness ||
    location.toilet_confidence ||
    location.parking_ease ||
    location.food_fit ||
    location.rain_backup_quality ||
    location.noise_level ||
    location.shade_or_shelter
  );

  return (
    <div className="pb-8">
      {/* 1. Header — Share (left) + X close (right) */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-bg-primary px-4 pb-2 pt-1">
        <button
          type="button"
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary"
          aria-label="Delen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary"
          aria-label="Sluiten"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 2. Type badge */}
      <div className="px-4">
        <span
          className="inline-flex items-center rounded-badge px-2 py-0.5 text-[11px] font-medium tracking-[0.014em] text-white"
          style={{ backgroundColor: typeColor }}
        >
          {LOCATION_TYPE_LABELS[location.type] ?? location.type}
        </span>

        {/* 3. Location name (Newsreader) */}
        <h2 className="mt-2 font-accent text-[28px] font-normal leading-[1.15] tracking-[-0.029em] text-label">
          {location.name}
        </h2>

        {/* 4. Region */}
        <p className="mt-1 text-[15px] tracking-normal text-label-secondary">
          {location.region}
        </p>
      </div>

      {/* Scroll depth marker: 25% */}
      <div ref={setMarkerRef(0)} data-depth="25" aria-hidden="true" />

      {/* 5. Action buttons */}
      <div className="mt-3 flex justify-center gap-4 px-4">
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

      {/* 6. Quick info row */}
      <div className="mt-4 flex items-start justify-evenly px-4 py-2">
        {score !== null && (
          <QuickInfoItem
            label="Score"
            value={score.toFixed(1)}
            valueColor={scoreColor(score)}
          />
        )}
        {location.weather && (
          <QuickInfoItem label="Type" value={weatherLabel(location.weather)} />
        )}
        {location.price_band && (
          <QuickInfoItem label="Prijs" value={PRICE_BAND_LABELS[location.price_band as PriceBand]} />
        )}
      </div>

      {/* 7. Hero photo (below quick info — Apple Maps pattern) */}
      {getPhotoUrl(location.photo_url) && (
        <div className="mx-4 mt-3 overflow-hidden rounded-photo">
          <OptimizedImage
            src={location.photo_url}
            size="hero"
            alt={location.name}
            loading="eager"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      {/* Scroll depth marker: 50% */}
      <div ref={setMarkerRef(1)} data-depth="50" aria-hidden="true" />

      {/* 8. Description */}
      {location.description && (
        <>
          <div className="hairline mx-4 my-4" />
          <div className="px-4">
            <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.025em] text-label">
              Over deze locatie
            </h3>
            <p className="text-[15px] leading-[1.5] tracking-normal text-label-secondary">
              {location.description}
            </p>
          </div>
        </>
      )}

      {/* 9. "Goed om te weten" — hidden DB fields */}
      {hasGoodToKnow && (
        <>
          <div className="hairline mx-4 my-4" />
          <div className="px-4">
            <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.025em] text-label">
              Goed om te weten
            </h3>
            <div className="flex flex-col gap-2.5">
              {location.buggy_friendliness && (
                <GoodToKnowRow
                  icon={<StrollerIcon />}
                  label="Kinderwagen"
                  value={location.buggy_friendliness}
                />
              )}
              {location.toilet_confidence && (
                <GoodToKnowRow
                  icon={<ToiletIcon />}
                  label="Toilet"
                  value={location.toilet_confidence}
                />
              )}
              {location.parking_ease && (
                <GoodToKnowRow
                  icon={<ParkingIcon />}
                  label="Parkeren"
                  value={location.parking_ease}
                />
              )}
              {location.food_fit && (
                <GoodToKnowRow
                  icon={<FoodIcon />}
                  label="Eten & drinken"
                  value={location.food_fit}
                />
              )}
              {location.rain_backup_quality && (
                <GoodToKnowRow
                  icon={<UmbrellaIcon />}
                  label="Bij regen"
                  value={location.rain_backup_quality}
                />
              )}
              {location.noise_level && (
                <GoodToKnowRow
                  icon={<VolumeIcon />}
                  label="Geluidsniveau"
                  value={location.noise_level}
                />
              )}
              {location.shade_or_shelter && (
                <GoodToKnowRow
                  icon={<SunIcon />}
                  label="Schaduw"
                  value={location.shade_or_shelter}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Scroll depth marker: 75% */}
      <div ref={setMarkerRef(2)} data-depth="75" aria-hidden="true" />

      {/* 10. Facilities */}
      {(location.coffee || location.diaper) && (
        <>
          <div className="hairline mx-4 my-4" />
          <div className="px-4">
            <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.025em] text-label">
              Faciliteiten
            </h3>
            <div className="flex flex-wrap gap-2">
              {location.coffee && <FacilityBadge label="Koffie" />}
              {location.diaper && <FacilityBadge label="Verschoonplek" />}
            </div>
          </div>
        </>
      )}

      {/* 11. Opening hours */}
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

      {/* 12. Nearby locations */}
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

/* ---------- Quick info row ---------- */

function QuickInfoItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-[11px] text-label-tertiary">{label}</span>
      <span className="text-[15px] font-medium" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}

/* ---------- "Goed om te weten" row ---------- */

function GoodToKnowRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center text-label-secondary">{icon}</span>
      <span className="text-[15px] text-label-secondary">{label}</span>
      <span className="ml-auto text-[15px] text-label">{value}</span>
    </div>
  );
}

/* ---------- "Goed om te weten" icons (20x20 stroke SVGs) ---------- */

function StrollerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
      <path d="M3 3h2l1 4h10l-1.5 6H7L5 5" />
    </svg>
  );
}

function ToiletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v4M6 6h8a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a2 2 0 0 1 2-2z" />
      <path d="M8 14v4M12 14v4" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M8 14V6h3a3 3 0 0 1 0 6H8" />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v6a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V3" />
      <path d="M7 3v4M7 13v5" />
      <path d="M15 3v3a3 3 0 0 1-3 3h0M15 3c0 3 2 4 2 6s-2 3-2 3v6" />
    </svg>
  );
}

function UmbrellaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v1M10 11v5a2 2 0 0 1-4 0" />
      <path d="M3 11a7 7 0 0 1 14 0" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4 7 8 7 13 3 13 17 8 13 4 13" />
      <path d="M16 6.5a4.5 4.5 0 0 1 0 7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M2 10h2M16 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" />
    </svg>
  );
}

/* ---------- Action buttons ---------- */

function ActionButton({
  label,
  href,
  icon,
  primary = false,
  onClick,
}: {
  label: string;
  href: string;
  icon: ReactNode;
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

/* ---------- Helpers ---------- */

function FacilityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-badge bg-bg-secondary px-2.5 py-1 text-[13px] tracking-[0.002em] text-label-secondary">
      {label}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--color-system-green)';
  if (score >= 6) return 'var(--color-accent)';
  return 'var(--color-label-secondary)';
}

function weatherLabel(weather: string): string {
  switch (weather) {
    case 'indoor': return 'Binnen';
    case 'outdoor': return 'Buiten';
    case 'both': return 'Binnen & buiten';
    default: return weather;
  }
}

/* ---------- Nearby card ---------- */

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

/* ---------- Loading skeleton ---------- */

function DetailSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4">
      <div className="mb-3 flex justify-between">
        <div className="h-10 w-10 rounded-full bg-bg-secondary" />
        <div className="h-10 w-10 rounded-full bg-bg-secondary" />
      </div>
      <div className="mb-2 h-5 w-16 rounded-badge bg-bg-secondary" />
      <div className="mb-2 h-8 w-3/4 rounded bg-bg-secondary" />
      <div className="mb-4 h-4 w-1/3 rounded bg-bg-secondary" />
      <div className="mb-4 flex justify-center gap-4">
        <div className="h-12 w-12 rounded-full bg-bg-secondary" />
        <div className="h-12 w-12 rounded-full bg-bg-secondary" />
        <div className="h-12 w-12 rounded-full bg-bg-secondary" />
      </div>
      {/* Quick info skeleton */}
      <div className="mb-3 flex gap-4 px-0 py-2">
        <div className="h-4 w-16 rounded bg-bg-secondary" />
        <div className="h-4 w-20 rounded bg-bg-secondary" />
        <div className="h-4 w-12 rounded bg-bg-secondary" />
      </div>
      <div className="mb-4 aspect-[4/3] w-full rounded-photo bg-bg-secondary" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-bg-secondary" />
        <div className="h-4 w-5/6 rounded bg-bg-secondary" />
        <div className="h-4 w-4/6 rounded bg-bg-secondary" />
      </div>
    </div>
  );
}
