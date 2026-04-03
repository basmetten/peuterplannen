'use client';

import { useMemo } from 'react';
import { TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/domain/category-icons';
import { getSmartCategoryOrder } from '@/lib/category-order';

interface QuickFilterListProps {
  onCategoryTap: (type: LocationType) => void;
}

/**
 * Apple Maps "Find Nearby" style category rows.
 * Full-width buttons with colored icons, smart-ordered by time of day.
 */
export function QuickFilterList({ onCategoryTap }: QuickFilterListProps) {
  const categories = useMemo(
    () => getSmartCategoryOrder(new Date().getHours()),
    [],
  );

  return (
    <div className="flex flex-col gap-[3px] px-4">
      {categories.map((type) => {
        const color = TYPE_COLORS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onCategoryTap(type)}
            className="flex w-full items-center gap-3 rounded-xl bg-bg-secondary/50 px-3 py-[8px] text-left transition-colors active:bg-bg-secondary"
          >
            {/* Colored icon circle */}
            <div
              className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: color }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="white"
              >
                {CATEGORY_ICONS[type]}
              </svg>
            </div>

            {/* Label */}
            <span className="flex-1 text-[15px] font-medium text-label">
              {CATEGORY_LABELS[type]}
            </span>

            {/* Chevron */}
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-label-quaternary">
              <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
