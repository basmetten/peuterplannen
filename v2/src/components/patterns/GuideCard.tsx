'use client';

import { OptimizedImage } from '@/components/patterns/OptimizedImage';
import type { BlogPostMeta } from '@/domain/blog';

interface GuideCardProps {
  guide: BlogPostMeta;
  onTap: (slug: string) => void;
}

export function GuideCard({ guide, onTap }: GuideCardProps) {
  return (
    <button
      type="button"
      onClick={() => onTap(guide.slug)}
      className="w-[188px] flex-shrink-0 overflow-hidden rounded-[24px] bg-bg-primary text-left shadow-[0_8px_24px_rgba(34,24,18,0.08)] ring-1 ring-black/5 transition-transform active:scale-[0.97]"
    >
      <div className="relative">
        {guide.featured_image ? (
          <OptimizedImage
            src={guide.featured_image}
            alt={guide.title}
            size="card"
            className="h-[112px] w-full object-cover"
          />
        ) : (
          <div
            className="h-[112px] w-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(227,209,193,1) 0%, rgba(248,241,234,1) 55%, rgba(244,229,214,1) 100%)',
            }}
          />
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-label-tertiary">
          <span>Gids</span>
          {guide.date && (
            <>
              <span>·</span>
              <span>{formatShortDate(guide.date)}</span>
            </>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 font-accent text-[17px] leading-[1.15] tracking-[-0.025em] text-label">
          {guide.title}
        </h3>

        {guide.description && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-label-secondary">
            {guide.description}
          </p>
        )}
      </div>
    </button>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });
}
