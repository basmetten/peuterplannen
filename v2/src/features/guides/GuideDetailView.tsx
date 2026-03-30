'use client';

import { useState, useEffect, useMemo } from 'react';
import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import { LocationCard } from '@/components/patterns/LocationCard';
import { HorizontalCardStrip } from '@/components/patterns/HorizontalCardStrip';
import { renderMarkdownClient } from '@/lib/markdown-client';
import type { BlogPost, BlogPostMeta } from '@/domain/blog';
import type { LocationSummary } from '@/domain/types';

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

  // Load guide data via dynamic import
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBodyHtml('');
    setGuide(null);

    (async () => {
      try {
        const data = await import('@/content/blog-posts.generated.json');
        const posts = (data.default ?? data) as BlogPost[];
        const post = posts.find((p) => p.slug === slug);
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

    return () => { cancelled = true; };
  }, [slug]);

  // Related locations (matching guide's related_regions)
  const guideLocations = useMemo(() => {
    if (!guide) return [];
    return locations.filter((loc) =>
      guide.related_regions.some(
        (region) => loc.region.toLowerCase().replace(/\s+/g, '-') === region,
      ),
    ).slice(0, 8);
  }, [guide, locations]);

  // Related guides (same tags, excluding current)
  const relatedGuides = useMemo(() => {
    if (!guide) return [];
    const guideTags = new Set(guide.tags);
    return allGuides
      .filter((g) => g.slug !== slug && g.tags.some((t) => guideTags.has(t)))
      .slice(0, 6);
  }, [guide, allGuides, slug]);

  // Reading time estimate
  const readingTime = guide ? Math.max(1, Math.round(guide.body.split(/\s+/).length / 200)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-[200px] animate-pulse rounded-2xl bg-bg-secondary" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-bg-secondary" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-bg-secondary" />
        <div className="mt-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-bg-secondary" style={{ width: `${85 - i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-[32px]">📖</span>
        <p className="text-[15px] text-label-secondary">Gids niet gevonden</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero image */}
      {guide.featured_image && (
        <div className="relative">
          <OptimizedImage
            src={guide.featured_image}
            alt={guide.title}
            size="hero"
            className="h-[220px] w-full object-cover"
            loading="eager"
          />
        </div>
      )}

      {/* Title + meta */}
      <div className="px-4 pt-4">
        <h1 className="font-accent text-[24px] font-semibold leading-tight text-label">
          {guide.title}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-label-tertiary">
          {guide.date && (
            <span>{formatDate(guide.date)}</span>
          )}
          {guide.date && readingTime > 0 && <span>·</span>}
          {readingTime > 0 && <span>{readingTime} min lezen</span>}
        </div>

        {guide.description && (
          <p className="mt-3 text-[15px] leading-relaxed text-label-secondary">
            {guide.description}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="hairline mx-4 mt-4" />
      <div
        className="blog-content px-4 py-4"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {/* Related locations */}
      {guideLocations.length > 0 && (
        <section className="pb-4">
          <div className="hairline mx-4 mb-4" />
          <h2 className="px-4 pb-3 text-[15px] font-semibold text-label">
            Locaties in deze gids
          </h2>
          <div className="flex flex-col gap-2 px-4">
            {guideLocations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onTap={onLocationTap}
              />
            ))}
          </div>
        </section>
      )}

      {/* Related guides */}
      {relatedGuides.length > 0 && (
        <section className="pb-6">
          <div className="hairline mx-4 mb-4" />
          <h2 className="px-4 pb-3 text-[15px] font-semibold text-label">
            Meer gidsen
          </h2>
          <HorizontalCardStrip className="px-4">
            {relatedGuides.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => onGuideTap(g.slug)}
                className="w-[160px] flex-shrink-0 overflow-hidden rounded-2xl bg-bg-secondary text-left transition-transform active:scale-[0.97]"
              >
                {g.featured_image && (
                  <OptimizedImage
                    src={g.featured_image}
                    alt={g.title}
                    size="card"
                    className="h-[90px] w-full object-cover"
                  />
                )}
                <div className="p-2.5">
                  <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-label">
                    {g.title}
                  </h3>
                </div>
              </button>
            ))}
          </HorizontalCardStrip>
        </section>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
