'use client';

import dynamic from 'next/dynamic';
import { useIsDesktop } from '@/hooks/useIsDesktop';

/**
 * Lazy-loaded wrapper for PersistentMap.
 * - Only loads MapLibre JS/CSS on desktop (≥768px)
 * - Mobile clients never download the map bundle
 * - Uses next/dynamic with ssr: false for client-only loading
 */
const PersistentMapDynamic = dynamic(
  () =>
    import('./PersistentMap').then((m) => ({ default: m.PersistentMap })),
  {
    ssr: false,
    loading: () => <div className="h-full bg-bg-secondary" />,
  },
);

export function PersistentMapLoader() {
  const isDesktop = useIsDesktop();

  // Don't load MapLibre on mobile — save ~200KB
  if (!isDesktop) return <div className="h-full bg-bg-secondary" />;

  return <PersistentMapDynamic />;
}
