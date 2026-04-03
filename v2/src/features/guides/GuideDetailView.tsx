'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { GuideCard } from '@/components/patterns/GuideCard';
import { HorizontalCardStrip } from '@/components/patterns/HorizontalCardStrip';
import { renderMarkdownClient } from '@/lib/markdown-client';
import type { BlogPost, BlogPostMeta } from '@/domain/blog';
import type { LocationSummary } from '@/domain/types';
import { LOCATION_TYPE_LABELS, PRICE_BAND_LABELS } from '@/domain/enums';

interface GuideDetailViewProps {
  slug: string;
  allGuides: BlogPostMeta[];
  locations: LocationSummary[];
  onClose: () => void;
  onLocationTap: (location: LocationSummary) => void;
  onGuideTap: (slug: string) => void;
}

export function GuideDetailView({
  slug,
  allGuides,
  locations,
  onClose,
  onLocationTap,
  onGuideTap,
}: GuideDetailViewProps) {
  const [guide, setGuide] = useState<BlogPost | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBodyHtml('');
    setGuide(null);

    (async () => {
      try {
        const data = await import('@/content/blog-posts.generated.json');
        const posts = (data.default ?? data) as BlogPost[];
        const post = posts.find((entry) => entry.slug === slug);
        if (cancelled) return;
        if (post) {
          setGuide(post);
          const html = await renderMarkdownClient(post.body);
          if (!cancelled) setBodyHtml(html);
        }
      } catch (err) {
        console.error('Failed to load guide:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const guideLocations = useMemo(() => {
    if (!guide) return [];
    return locations.filter((loc) =>
      guide.related_regions.some(
        (region) => loc.region.toLowerCase().replace(/\s+/g, '-') === region,
      ),
    ).slice(0, 8);
  }, [guide, locations]);

  const relatedGuides = useMemo(() => {
    if (!guide) return [];
    const guideTags = new Set(guide.tags);
    return allGuides
      .filter((entry) => entry.slug !== slug && entry.tags.some((tag) => guideTags.has(tag)))
      .slice(0, 6);
  }, [allGuides, guide, slug]);

  const readingTime = guide ? Math.max(1, Math.round(guide.body.split(/\s+/).length / 200)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-[280px] animate-pulse rounded-[28px] bg-bg-secondary" />
        <div className="h-[120px] animate-pulse rounded-[24px] bg-bg-secondary" />
        <div className="h-[110px] animate-pulse rounded-[24px] bg-bg-secondary" />
        <div className="h-[320px] animate-pulse rounded-[24px] bg-bg-secondary" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-label-quaternary">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <p className="text-[15px] text-label-secondary">Gids niet gevonden</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 hidden items-center justify-between bg-bg-primary/95 px-4 py-2 backdrop-blur-sm md:flex">
        <button
          type="button"
          onClick={onClose}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-bg-secondary"
          aria-label="Terug"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-[13px] font-medium text-label-tertiary">Gids</div>
        <div className="h-[40px] w-[40px]" aria-hidden />
      </div>

      <div className="px-4 pb-6 pt-2">
        <section className="overflow-hidden rounded-[30px] bg-bg-primary shadow-[0_12px_32px_rgba(35,24,18,0.10)] ring-1 ring-black/5">
          <div className="relative">
            {guide.featured_image ? (
              <OptimizedImage
                src={guide.featured_image}
                alt={guide.title}
                size="hero"
                className="h-[280px] w-full object-cover md:h-[320px]"
                loading="eager"
              />
            ) : (
              <div
                className="h-[280px] w-full md:h-[320px]"
                style={{
                  background:
                    'linear-gradient(155deg, rgba(223,205,191,1) 0%, rgba(248,242,236,1) 50%, rgba(234,220,209,1) 100%)',
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/12 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                <span>Gids</span>
                {guide.date && <span>· {formatDate(guide.date)}</span>}
                {readingTime > 0 && <span>· {readingTime} min lezen</span>}
              </div>
              <h1 className="mt-3 max-w-[14ch] font-accent text-[34px] font-semibold leading-[0.98] tracking-[-0.04em] text-white md:text-[40px]">
                {guide.title}
              </h1>
              {guide.description && (
                <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-white/88">
                  {guide.description}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 py-5 md:px-6">
            <div className="flex flex-wrap gap-2">
              <MetaPill>{guide.related_regions.length} regio&apos;s</MetaPill>
              <MetaPill>{guideLocations.length} plekken</MetaPill>
              {guide.tags[0] && <MetaPill>{guide.tags[0]}</MetaPill>}
            </div>

            {guide.related_regions.length > 0 && (
              <p className="mt-4 text-[14px] leading-relaxed text-label-secondary">
                Voor {guide.related_regions.slice(0, 3).map(formatRegionLabel).join(', ')}
                {guide.related_regions.length > 3 ? ' en meer' : ''}.
              </p>
            )}
          </div>
        </section>

        {guideLocations.length > 0 && (
          <section className="mt-6">
            <div className="mb-3">
              <h2 className="text-[19px] font-semibold text-label">Plekken in deze gids</h2>
              <p className="mt-1 text-[13px] text-label-secondary">
                Direct door naar een plek als deze gids je iets aanspreekt.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {guideLocations.map((location) => (
                <GuideLocationRow
                  key={location.id}
                  location={location}
                  onTap={onLocationTap}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-[28px] bg-bg-primary shadow-[0_10px_24px_rgba(35,24,18,0.06)] ring-1 ring-black/5">
          <div className="px-5 py-4 md:px-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-label-tertiary">
              Verhaal
            </div>
          </div>
          <div className="hairline" />
          <div
            className="blog-content px-5 py-5 md:px-6"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </section>

        {relatedGuides.length > 0 && (
          <section className="mt-6 pb-2">
            <div className="mb-3">
              <h2 className="text-[19px] font-semibold text-label">Meer gidsen</h2>
              <p className="mt-1 text-[13px] text-label-secondary">
                Nog een route om snel nieuwe plekken te ontdekken.
              </p>
            </div>
            <HorizontalCardStrip>
              {relatedGuides.map((entry) => (
                <GuideCard key={entry.slug} guide={entry} onTap={onGuideTap} />
              ))}
            </HorizontalCardStrip>
          </section>
        )}
      </div>
    </div>
  );
}

function GuideLocationRow({
  location,
  onTap,
}: {
  location: LocationSummary;
  onTap: (location: LocationSummary) => void;
}) {
  const score = location.ai_suitability_score_10;
  const metaBits = [
    LOCATION_TYPE_LABELS[location.type] ?? location.type,
    location.price_band ? PRICE_BAND_LABELS[location.price_band] : null,
    ageRangeLabel(location.min_age, location.max_age),
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onTap(location)}
      className="flex w-full items-center gap-4 rounded-[24px] bg-bg-tertiary p-3.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.985]"
    >
      <div className="h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-[20px] bg-bg-secondary">
        <OptimizedImage
          src={location.photo_url}
          alt={location.name}
          size="hero"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-label-tertiary">
          {metaBits.map((bit) => (
            <span key={bit}>{bit}</span>
          ))}
        </div>

        <h3 className="mt-2 text-[17px] font-semibold leading-tight tracking-[-0.02em] text-label">
          {location.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-label-secondary">
          {location.toddler_highlight ?? `${formatRegionLabel(location.region)} voor jonge kinderen.`}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-label-tertiary">
            {formatRegionLabel(location.region)}
          </span>
          {score !== null ? (
            <span className="rounded-full bg-bg-primary px-2.5 py-1 text-[12px] font-medium text-label-secondary">
              {score.toFixed(1)}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-accent">Bekijk plek</span>
          )}
        </div>
      </div>
    </button>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRegionLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ageRangeLabel(minAge: number | null, maxAge: number | null): string | null {
  if (minAge === null && maxAge === null) return null;
  if (minAge !== null && maxAge !== null) return `${minAge}-${maxAge} jaar`;
  if (minAge !== null) return `vanaf ${minAge} jaar`;
  return `tot ${maxAge} jaar`;
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-bg-secondary px-3 py-1 text-[12px] font-medium text-label-secondary">
      {children}
    </span>
  );
}
