'use client';

import { useMemo } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { LocationCard } from '@/components/patterns/LocationCard';
import type { LocationSummary } from '@/domain/types';

interface PlanViewProps {
  locations: LocationSummary[];
  onCardTap: (location: LocationSummary) => void;
  selectedId: number | null;
}

export function PlanView({ locations, onCardTap, selectedId }: PlanViewProps) {
  const { planIds, removeFromPlan, moveUp, moveDown, clearPlan } = usePlan();

  // Resolve IDs to LocationSummary objects, preserving plan order
  const planLocations = useMemo(() => {
    const map = new Map(locations.map((l) => [l.id, l]));
    return planIds.map((id) => map.get(id)).filter((l): l is LocationSummary => l !== undefined);
  }, [locations, planIds]);

  if (planLocations.length === 0) {
    return <PlanEmptyState />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-label">
            Dagplanner
          </h2>
          <p className="mt-0.5 text-[13px] tracking-[0.002em] text-label-secondary">
            {planLocations.length} {planLocations.length === 1 ? 'locatie' : 'locaties'}
          </p>
        </div>
        <button
          type="button"
          onClick={clearPlan}
          className="text-[13px] font-medium text-accent hover:text-accent-hover"
        >
          Wis alles
        </button>
      </div>

      {/* Divider */}
      <div className="hairline" />

      {/* Ordered list with reorder controls */}
      <div className="flex flex-col gap-1 px-4 py-3">
        {planLocations.map((loc, i) => (
          <div
            key={loc.id}
            className="animate-[fadeSlideIn_300ms_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <div className="flex items-center gap-2">
              {/* Order number */}
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
                {i + 1}
              </div>

              {/* Card */}
              <div className="min-w-0 flex-1">
                <LocationCard
                  location={loc}
                  onTap={onCardTap}
                  isSelected={loc.id === selectedId}
                />
              </div>

              {/* Reorder + remove controls */}
              <div className="flex flex-shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveUp(loc.id)}
                  disabled={i === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-label-secondary transition-colors hover:bg-bg-secondary disabled:opacity-25"
                  aria-label="Omhoog"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3L3 7.5M7 3l4 4.5M7 3v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(loc.id)}
                  disabled={i === planLocations.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-label-secondary transition-colors hover:bg-bg-secondary disabled:opacity-25"
                  aria-label="Omlaag"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 11L3 6.5M7 11l4-4.5M7 11V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromPlan(loc.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-label-tertiary transition-colors hover:bg-bg-secondary hover:text-system-red"
                  aria-label="Verwijder"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Connector line between items */}
            {i < planLocations.length - 1 && (
              <div className="ml-3 h-3 w-px bg-separator" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanEmptyState() {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      {/* Route/list icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-label-tertiary">
          <circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="5" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8v2c0 2.2 1.8 4 4 4h6c2.2 0 4-1.8 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="19" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 16v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-label">
        Plan je dag
      </h3>
      <p className="mt-2 max-w-[240px] text-[15px] leading-[1.5] tracking-normal text-label-secondary">
        Open een locatie en tik op &lsquo;Toevoegen aan plan&rsquo; om je dagje uit samen te stellen
      </p>
    </div>
  );
}
