import type { MetadataRoute } from 'next';
import { LocationRepository } from '@/server/repositories/location.repo';
import { RegionRepository } from '@/server/repositories/region.repo';
import { BlogRepository } from '@/server/repositories/blog.repo';
import { SITE_URL } from '@/lib/constants';
import { TYPE_SLUGS } from '@/lib/seo';

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
  const typePages: MetadataRoute.Sitemap = Object.values(TYPE_SLUGS).map(
    (slug) => ({
      url: `${SITE_URL}/${slug}`,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }),
  );

  // 4. City+type combo pages: /{region-slug}/{type-slug}
  const comboPages: MetadataRoute.Sitemap = regions.flatMap((region) =>
    Object.values(TYPE_SLUGS).map((typeSlug) => ({
      url: `${SITE_URL}/${region.slug}/${typeSlug}`,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    })),
  );

  // 5. Location detail pages: /{region-slug}/{location-slug}
  const locationPages: MetadataRoute.Sitemap = seoLocations
    .filter((loc) => regionNameToSlug.has(loc.region))
    .map((loc) => ({
      url: `${SITE_URL}/${regionNameToSlug.get(loc.region)}/${loc.slug}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    }));

  // 6. Blog index + guides overview
  const contentPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/blog`,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    },
    {
      url: `${SITE_URL}/guides`,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    },
  ];

  // 7. Blog post pages: /blog/{slug}
  const blogPosts: MetadataRoute.Sitemap = BlogRepository.getAll().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    priority: 0.5,
    changeFrequency: 'monthly' as const,
    ...(post.date ? { lastModified: new Date(post.date) } : {}),
  }));

  return [
    ...homepage,
    ...regionPages,
    ...typePages,
    ...comboPages,
    ...locationPages,
    ...contentPages,
    ...blogPosts,
  ];
}
