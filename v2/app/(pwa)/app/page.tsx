import { Suspense } from 'react';
import { LocationRepository } from '@/server/repositories/location.repo';
import { AppShell } from './AppShell';

export const metadata = {
  title: 'Kaart',
};

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  // Server-side: fetch all location summaries for initial render
  const locations = await LocationRepository.getAllSummaries();

  return (
    <Suspense fallback={<MapSkeleton />}>
      <AppShell initialLocations={locations} />
    </Suspense>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-[15px] text-label-secondary">Kaart laden...</p>
      </div>
    </div>
  );
}
