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
      className="w-[160px] flex-shrink-0 overflow-hidden rounded-2xl bg-bg-secondary text-left transition-transform active:scale-[0.97]"
    >
      {guide.featured_image && (
        <OptimizedImage
          src={guide.featured_image}
          alt={guide.title}
          size="card"
          className="h-[90px] w-full object-cover"
        />
      )}
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-label">
          {guide.title}
        </h3>
      </div>
    </button>
  );
}
