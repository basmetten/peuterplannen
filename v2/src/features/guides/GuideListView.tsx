'use client';

import { useMemo } from 'react';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import type { BlogPostMeta } from '@/domain/blog';

// Same featured slugs as guides page
const FEATURED_SLUGS = new Set([
  'amsterdam-met-peuters-en-kleuters',
  'dagje-uit-met-dreumes',
  'eerste-keer-kinderboerderij',
  'beste-buggy-voor-uitjes',
]);

interface GuideListViewProps {
  guides: BlogPostMeta[];
  onGuideTap: (slug: string) => void;
}

export function GuideListView({ guides, onGuideTap }: GuideListViewProps) {
  const featured = useMemo(
    () => guides.filter((g) => FEATURED_SLUGS.has(g.slug)),
    [guides],
  );

  const cityGuides = useMemo(
    () => guides.filter((g) =>
      g.slug.endsWith('-met-peuters') || g.slug.endsWith('-met-peuters-en-kleuters'),
    ),
    [guides],
  );

  const latest = useMemo(
    () => guides
      .filter((g) => !FEATURED_SLUGS.has(g.slug))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 8),
    [guides],
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-[20px] font-semibold text-label">Gidsen</h2>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-widest text-label-tertiary">
            Uitgelicht
          </h3>
          <div className="flex flex-col gap-3">
            {featured.map((g) => (
              <FeaturedGuideCard key={g.slug} guide={g} onTap={onGuideTap} />
            ))}
          </div>
        </section>
      )}

      {/* Per stad */}
      {cityGuides.length > 0 && (
        <section>
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-widest text-label-tertiary">
            Per stad
          </h3>
          <div className="grid grid-cols-2 gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {cityGuides.map((g) => (
              <SmallGuideCard key={g.slug} guide={g} onTap={onGuideTap} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {latest.length > 0 && (
        <section>
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-widest text-label-tertiary">
            Recent
          </h3>
          <div className="flex flex-col gap-2">
            {latest.map((g) => (
              <SmallGuideCard key={g.slug} guide={g} onTap={onGuideTap} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeaturedGuideCard({
  guide,
  onTap,
}: {
  guide: BlogPostMeta;
  onTap: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(guide.slug)}
      className="w-full overflow-hidden rounded-2xl bg-bg-secondary text-left transition-transform active:scale-[0.98]"
    >
      {guide.featured_image && (
        <OptimizedImage
          src={guide.featured_image}
          alt={guide.title}
          size="hero"
          className="h-[140px] w-full object-cover"
        />
      )}
      <div className="p-3">
        <h4 className="text-[15px] font-medium leading-snug text-label">
          {guide.title}
        </h4>
        {guide.description && (
          <p className="mt-1 line-clamp-2 text-[13px] text-label-secondary">
            {guide.description}
          </p>
        )}
      </div>
    </button>
  );
}

function SmallGuideCard({
  guide,
  onTap,
}: {
  guide: BlogPostMeta;
  onTap: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(guide.slug)}
      className="flex items-center gap-3 rounded-xl bg-bg-secondary p-2.5 text-left transition-transform active:scale-[0.98]"
    >
      {guide.featured_image && (
        <OptimizedImage
          src={guide.featured_image}
          alt={guide.title}
          size="card"
          className="h-[48px] w-[48px] flex-shrink-0 rounded-lg object-cover"
        />
      )}
      <span className="line-clamp-2 text-[13px] font-medium leading-tight text-label">
        {guide.title}
      </span>
    </button>
  );
}
