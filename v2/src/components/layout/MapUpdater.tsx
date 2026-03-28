'use client';

import { useEffect } from 'react';
import { useMapState } from '@/context/MapStateContext';
import type { LocationSummary } from '@/domain/types';

interface MapUpdaterProps {
  locations: LocationSummary[];
  locationHrefs: Record<number, string>;
  highlightId?: number;
}

/**
 * Invisible client component that pushes page-specific map data into the
 * persistent map via React context. Rendered by ContentShell — each page
 * navigation mounts a new instance with the correct location data.
 */
export function MapUpdater({
  locations,
  locationHrefs,
  highlightId,
}: MapUpdaterProps) {
  const { setMapState } = useMapState();

  useEffect(() => {
    setMapState({ locations, locationHrefs, highlightId });
  }, [locations, locationHrefs, highlightId, setMapState]);

  return null;
}
