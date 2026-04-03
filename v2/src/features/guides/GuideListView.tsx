'use client';

import { useMemo } from 'react';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { HorizontalCardStrip } from '@/components/patterns/HorizontalCardStrip';
import type { BlogPostMeta } from '@/domain/blog';

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
    () => guides.filter((guide) => FEATURED_SLUGS.has(guide.slug)),
    [guides],
  );

  const cityGuides = useMemo(
    () => guides.filter((guide) =>
      guide.slug.endsWith('-met-peuters') || guide.slug.endsWith('-met-peuters-en-kleuters'),
    ),
    [guides],
  );

  const latest = useMemo(
    () => guides
      .filter((guide) => !FEATURED_SLUGS.has(guide.slug))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 8),
    [guides],
  );

  const heroGuide = featured[0] ?? guides[0] ?? null;

  const railGuides = useMemo(() => {
    if (!guides.length) return [];

    const seen = new Set<string>(heroGuide ? [heroGuide.slug] : []);
    const candidates = [...featured.slice(1), ...cityGuides, ...latest, ...guides];

    return candidates.filter((guide) => {
      if (seen.has(guide.slug)) return false;
      seen.add(guide.slug);
      return true;
    }).slice(0, 6);
  }, [cityGuides, featured, guides, heroGuide, latest]);

  const listGuides = useMemo(() => {
    const excluded = new Set<string>([
      ...(heroGuide ? [heroGuide.slug] : []),
      ...railGuides.map((guide) => guide.slug),
    ]);

    return [...latest, ...guides].filter((guide, index, arr) => (
      !excluded.has(guide.slug) && arr.findIndex((entry) => entry.slug === guide.slug) === index
    )).slice(0, 10);
  }, [guides, heroGuide, latest, railGuides]);

  return (
    <div className="flex flex-col gap-8 px-4 pb-8 pt-3">
      <section
        className="overflow-hidden rounded-[28px] p-[1px]"
        style={{
          background:
            'linear-gradient(140deg, rgba(205,179,155,0.42) 0%, rgba(255,255,255,0.9) 42%, rgba(235,222,209,0.82) 100%)',
        }}
      >
        <div className="rounded-[27px] bg-bg-primary px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-label-tertiary">
            Gidsen
          </p>
          <h2 className="mt-2 font-accent text-[30px] leading-[1.05] tracking-[-0.03em] text-label">
            Inspiratie voor ontspannen uitjes.
          </h2>
          <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-label-secondary">
            Verhalen, stadsgidsen en praktische tips om sneller een leuke plek voor peuters te vinden.
          </p>
        </div>
      </section>

      {heroGuide && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.16em] text-label-tertiary">
              Uitgelicht
            </h3>
            <span className="text-[12px] text-label-tertiary">
              {heroGuide.related_regions.length > 0
                ? regionLabel(heroGuide.related_regions[0])
                : 'Nieuwe gids'}
            </span>
          </div>
          <HeroGuideCard guide={heroGuide} onTap={onGuideTap} />
        </section>
      )}

      {railGuides.length > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="text-[18px] font-semibold text-label">Meer gidsen</h3>
            <p className="mt-1 text-[13px] text-label-secondary">
              Stadsgidsen en korte inspiratie voor onderweg.
            </p>
          </div>
          <HorizontalCardStrip>
            {railGuides.map((guide) => (
              <RailGuideCard key={guide.slug} guide={guide} onTap={onGuideTap} />
            ))}
          </HorizontalCardStrip>
        </section>
      )}

      {listGuides.length > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="text-[18px] font-semibold text-label">Praktisch & recent</h3>
            <p className="mt-1 text-[13px] text-label-secondary">
              Compacte gidsen voor een dag die soepel moet verlopen.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {listGuides.map((guide) => (
              <GuideListRow key={guide.slug} guide={guide} onTap={onGuideTap} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroGuideCard({
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
      className="w-full overflow-hidden rounded-[28px] bg-bg-primary text-left shadow-[0_12px_30px_rgba(31,23,19,0.10)] ring-1 ring-black/5 transition-transform active:scale-[0.985]"
    >
      <div className="relative">
        {guide.featured_image ? (
          <OptimizedImage
            src={guide.featured_image}
            alt={guide.title}
            size="hero"
            className="h-[230px] w-full object-cover"
          />
        ) : (
          <div
            className="h-[230px] w-full"
            style={{
              background:
                'linear-gradient(155deg, rgba(223,205,191,1) 0%, rgba(248,242,236,1) 48%, rgba(234,220,209,1) 100%)',
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
            <span>Uitgelicht</span>
            {guide.date && <span>· {formatDate(guide.date)}</span>}
          </div>
          <h4 className="mt-2 max-w-[14ch] font-accent text-[31px] leading-[1.02] tracking-[-0.035em] text-white">
            {guide.title}
          </h4>
        </div>
      </div>

      <div className="p-5">
        {guide.description && (
          <p className="text-[15px] leading-relaxed text-label-secondary">
            {guide.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {guide.related_regions.slice(0, 2).map((region) => (
              <span
                key={region}
                className="rounded-full bg-bg-secondary px-3 py-1 text-[12px] font-medium text-label-secondary"
              >
                {regionLabel(region)}
              </span>
            ))}
          </div>
          <span className="text-[13px] font-medium text-accent">Open gids</span>
        </div>
      </div>
    </button>
  );
}

function RailGuideCard({
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
      className="w-[212px] flex-shrink-0 overflow-hidden rounded-[24px] bg-bg-primary text-left shadow-[0_8px_24px_rgba(31,23,19,0.08)] ring-1 ring-black/5 transition-transform active:scale-[0.98]"
    >
      {guide.featured_image ? (
        <OptimizedImage
          src={guide.featured_image}
          alt={guide.title}
          size="hero"
          className="h-[132px] w-full object-cover"
        />
      ) : (
        <div
          className="h-[132px] w-full"
          style={{
            background:
              'linear-gradient(155deg, rgba(236,226,217,1) 0%, rgba(250,245,241,1) 100%)',
          }}
        />
      )}

      <div className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-label-tertiary">
          {guide.related_regions.length > 0 ? regionLabel(guide.related_regions[0]) : 'Gids'}
        </div>
        <h4 className="mt-2 line-clamp-2 font-accent text-[19px] leading-[1.1] tracking-[-0.02em] text-label">
          {guide.title}
        </h4>
        {guide.description && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-label-secondary">
            {guide.description}
          </p>
        )}
      </div>
    </button>
  );
}

function GuideListRow({
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
      className="flex items-center gap-4 rounded-[22px] bg-bg-tertiary p-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.985]"
    >
      {guide.featured_image ? (
        <OptimizedImage
          src={guide.featured_image}
          alt={guide.title}
          size="card"
          className="h-[64px] w-[64px] flex-shrink-0 rounded-[18px] object-cover"
        />
      ) : (
        <div
          className="h-[64px] w-[64px] flex-shrink-0 rounded-[18px]"
          style={{
            background:
              'linear-gradient(155deg, rgba(236,226,217,1) 0%, rgba(250,245,241,1) 100%)',
          }}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-label-tertiary">
          {guide.date ? formatDate(guide.date) : 'Gids'}
        </div>
        <span className="mt-1 block line-clamp-2 text-[15px] font-semibold leading-tight text-label">
          {guide.title}
        </span>
        {guide.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-label-secondary">
            {guide.description}
          </p>
        )}
      </div>
    </button>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });
}

function regionLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
