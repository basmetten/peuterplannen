'use client';

import dynamic from 'next/dynamic';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useMapState } from '@/context/MapStateContext';

/**
 * Lazy-loaded wrapper for PersistentMap.
 * - Only loads MapLibre JS/CSS on desktop (≥768px)
 * - Mobile clients never download the map bundle
 * - Uses next/dynamic with ssr: false for client-only loading
 * - Does NOT render when AppShell's MapContainer is active (prevents dual WebGL contexts)
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
  const { appMapActive } = useMapState();

  // Don't load MapLibre on mobile — save ~200KB
  if (!isDesktop) return <div className="h-full bg-bg-secondary" />;

  // Don't render when AppShell has its own MapContainer (prevents 2 WebGL contexts)
  if (appMapActive) return <div className="h-full bg-bg-secondary" />;

  return <PersistentMapDynamic />;
}
