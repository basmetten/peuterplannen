import { Suspense } from 'react';
import { LocationRepository } from '@/server/repositories/location.repo';
import { BlogRepository } from '@/server/repositories/blog.repo';
import { AppShell, AppShellSkeleton } from './AppShell';

export const metadata = {
  title: 'Ontdek de leukste uitjes met peuters',
};

export const revalidate = 300;

// Featured guide slugs (curated)
const FEATURED_SLUGS = [
  'amsterdam-met-peuters-en-kleuters',
  'dagje-uit-met-dreumes',
  'eerste-keer-kinderboerderij',
  'beste-buggy-voor-uitjes',
];

export default async function AppPage() {
  const locations = await LocationRepository.getAllSummaries();

  // Pass guide metadata from server (BlogRepository is server-only)
  const allPosts = BlogRepository.getAll();
  const featuredSet = new Set(FEATURED_SLUGS);
  const guides = [
    ...allPosts.filter(p => featuredSet.has(p.slug)),
    ...allPosts.filter(p => !featuredSet.has(p.slug) && p.featured_image).slice(0, 4),
  ].slice(0, 8);

  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShell initialLocations={locations} initialGuides={guides} />
    </Suspense>
  );
}
