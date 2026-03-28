import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogRepository } from '@/server/repositories/blog.repo';
import { RegionRepository } from '@/server/repositories/region.repo';
import { SITE_URL } from '@/lib/constants';
import { Breadcrumb } from '@/components/patterns/Breadcrumb';
import { StructuredData } from '@/components/patterns/StructuredData';
import { ContentShell } from '@/components/layout/ContentShell';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import { TYPE_SLUGS } from '@/lib/seo';

// ---------------------------------------------------------------------------
// SSG — revalidate every 24 hours
// ---------------------------------------------------------------------------

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const canonical = `${SITE_URL}/guides`;

export const metadata: Metadata = {
  title: 'Gidsen — Uitjes met peuters per stad en thema',
  description:
    'Ontdek gidsen voor uitjes met peuters: stadsgidsen, seizoenstips en thema-artikelen. Van Amsterdam tot Maastricht — alles voor een ontspannen dag met kleintjes.',
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Gidsen — PeuterPlannen',
    description:
      'Gidsen voor uitjes met peuters in heel Nederland.',
    url: canonical,
    siteName: 'PeuterPlannen',
    type: 'website',
  },
};

// ---------------------------------------------------------------------------
// Featured post slugs (curated selection)
// ---------------------------------------------------------------------------

const FEATURED_SLUGS = [
  'amsterdam-met-peuters-en-kleuters',
  'dagje-uit-met-dreumes',
  'eerste-keer-kinderboerderij',
  'beste-buggy-voor-uitjes',
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function GuidesPage() {
  const allPosts = BlogRepository.getAll();
  const regions = await RegionRepository.getAll();

  // Featured: curated posts that exist in the data
  const featuredSlugs = new Set(FEATURED_SLUGS);
  const featured = allPosts.filter((p) => featuredSlugs.has(p.slug));

  // Latest: 8 most recent, excluding featured
  const latest = allPosts
    .filter((p) => !featuredSlugs.has(p.slug))
    .slice(0, 8);

  // City guides: posts whose slug matches "{city}-met-peuters" pattern
  const cityGuides = allPosts.filter(
    (p) => p.slug.endsWith('-met-peuters') || p.slug.endsWith('-met-peuters-en-kleuters'),
  );

  // Regions that have guides
  const regionsWithGuides = regions.filter((r) =>
    cityGuides.some((p) => p.related_regions.includes(r.slug)),
  );

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Gidsen — PeuterPlannen',
        description: 'Gidsen voor uitjes met peuters in heel Nederland.',
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Gidsen' },
        ],
      },
    ],
  };

  return (
    <ContentShell>
      <StructuredData data={structuredData} />

      <div className="px-4 pb-8 pt-2">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Gidsen' },
          ]}
        />

        {/* Header */}
        <header className="mb-6 mt-2">
          <h1 className="text-[22px] font-semibold leading-tight text-label">
            Gidsen
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
            Stadsgidsen, seizoenstips en praktische artikelen voor uitjes met peuters.
          </p>
        </header>

        {/* Featured guides */}
        {featured.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-[16px] font-semibold text-label">
              Uitgelicht
            </h2>
            <div className="flex flex-col gap-3">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-xl border border-separator bg-bg-primary p-4 transition-colors hover:bg-fill-tertiary"
                >
                  <p className="text-[15px] font-medium leading-snug text-label group-hover:text-accent">
                    {post.title}
                  </p>
                  {post.description && (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-label-secondary">
                      {post.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest */}
        {latest.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-[16px] font-semibold text-label">
              Recent
            </h2>
            <div className="flex flex-col gap-3">
              {latest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-xl border border-separator bg-bg-primary p-4 transition-colors hover:bg-fill-tertiary"
                >
                  <p className="text-[15px] font-medium leading-snug text-label group-hover:text-accent">
                    {post.title}
                  </p>
                  {post.date && (
                    <p className="mt-1 text-[12px] text-label-tertiary">
                      {formatDate(post.date)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Browse by city */}
        {regionsWithGuides.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-[16px] font-semibold text-label">
              Per stad
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {regionsWithGuides.map((region) => {
                const guide = cityGuides.find((p) =>
                  p.related_regions.includes(region.slug),
                );
                return (
                  <Link
                    key={region.slug}
                    href={guide ? `/blog/${guide.slug}` : `/${region.slug}`}
                    className="group rounded-xl border border-separator bg-bg-primary p-3 transition-colors hover:bg-fill-tertiary"
                  >
                    <p className="text-[14px] font-medium text-label group-hover:text-accent">
                      {region.name}
                    </p>
                    <p className="text-[12px] text-label-tertiary">
                      Stadsgids
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Browse by type */}
        <section className="mb-8">
          <h2 className="mb-3 text-[16px] font-semibold text-label">
            Per type
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(LOCATION_TYPE_LABELS) as [LocationType, string][]).map(
              ([typeKey, label]) => (
                <Link
                  key={typeKey}
                  href={`/${TYPE_SLUGS[typeKey]}`}
                  className="group flex items-center gap-2 rounded-xl border border-separator bg-bg-primary p-3 transition-colors hover:bg-fill-tertiary"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[typeKey] }}
                  />
                  <p className="text-[14px] font-medium text-label group-hover:text-accent">
                    {label}
                  </p>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* Link to all blog posts */}
        <div className="text-center">
          <Link
            href="/blog"
            className="text-[14px] font-medium text-accent hover:underline"
          >
            Alle {allPosts.length} artikelen →
          </Link>
        </div>
      </div>
    </ContentShell>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
