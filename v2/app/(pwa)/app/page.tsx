import { Suspense } from 'react';
import { LocationRepository } from '@/server/repositories/location.repo';
import { AppShell, AppShellSkeleton } from './AppShell';

export const metadata = {
  title: 'Kaart',
};

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  // Server-side: fetch all location summaries for initial render
  const locations = await LocationRepository.getAllSummaries();

  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShell initialLocations={locations} />
    </Suspense>
  );
}
