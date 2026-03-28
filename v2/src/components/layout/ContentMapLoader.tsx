'use client';

import dynamic from 'next/dynamic';
import type { LocationSummary } from '@/domain/types';

/**
 * Lazy-loaded wrapper for ContentMap.
 * Ensures maplibre-gl JS/CSS is only downloaded on pages that actually render a map.
 * Used by ContentShell's desktop right panel when locations are provided.
 */
const ContentMapDynamic = dynamic(
  () => import('./ContentMap').then((m) => ({ default: m.ContentMap })),
  {
    ssr: false,
    loading: () => <div className="h-full bg-bg-secondary" />,
  },
);

interface ContentMapLoaderProps {
  locations: LocationSummary[];
  locationHrefs: Record<number, string>;
  highlightId?: number;
}

export function ContentMapLoader(props: ContentMapLoaderProps) {
  return <ContentMapDynamic {...props} />;
}
