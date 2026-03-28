import type { MetadataRoute } from 'next';
import { LocationRepository } from '@/server/repositories/location.repo';
import { RegionRepository } from '@/server/repositories/region.repo';
import { SITE_URL } from '@/lib/constants';
import type { LocationType } from '@/domain/enums';

/** Internal type key → Dutch URL slug */
const TYPE_SLUG_MAP: Record<LocationType, string> = {
  play: 'speeltuinen',
  farm: 'boerderijen',
  nature: 'natuur',
  museum: 'musea',
  swim: 'zwemmen',
  pancake: 'pannenkoeken',
  horeca: 'horeca',
  culture: 'cultuur',
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [regions, seoLocations] = await Promise.all([
    RegionRepository.getAll(),
    LocationRepository.getSeoIncluded(),
  ]);

  // Build region name → slug lookup (e.g. "Amsterdam" → "amsterdam")
  const regionNameToSlug = new Map(
    regions.map((r) => [r.name, r.slug]),
  );

  // 1. Homepage
  const homepage: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      priority: 1.0,
      changeFrequency: 'daily',
    },
  ];

  // 2. Region hub pages: /{region-slug}
  const regionPages: MetadataRoute.Sitemap = regions.map((region) => ({
    url: `${SITE_URL}/${region.slug}`,
    priority: 0.9,
    changeFrequency: 'weekly' as const,
  }));

  // 3. Type hub pages: /speeltuinen, /boerderijen, etc.
  const typePages: MetadataRoute.Sitemap = Object.values(TYPE_SLUG_MAP).map(
    (slug) => ({
      url: `${SITE_URL}/${slug}`,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }),
  );

  // 4. Location detail pages: /{region-slug}/{location-slug}
  const locationPages: MetadataRoute.Sitemap = seoLocations
    .filter((loc) => regionNameToSlug.has(loc.region))
    .map((loc) => ({
      url: `${SITE_URL}/${regionNameToSlug.get(loc.region)}/${loc.slug}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    }));

  return [...homepage, ...regionPages, ...typePages, ...locationPages];
}
