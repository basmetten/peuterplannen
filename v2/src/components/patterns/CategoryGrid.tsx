'use client';

import { LOCATION_TYPES, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/domain/category-icons';

interface CategoryGridProps {
  activeTypes: LocationType[];
  onTypeToggle: (type: LocationType) => void;
}

export function CategoryGrid({ activeTypes, onTypeToggle }: CategoryGridProps) {
  return (
    <div
      className="grid grid-cols-4 gap-y-3 gap-x-2 px-4 py-3"
      style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
    >
      {LOCATION_TYPES.map((type) => {
        const isActive = activeTypes.includes(type);
        const color = TYPE_COLORS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onTypeToggle(type)}
            aria-pressed={isActive}
            className="flex min-h-[44px] flex-col items-center gap-1"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-fast"
              style={isActive ? {
                backgroundColor: color,
              } : {
                border: '1.5px solid',
                borderColor: color,
                opacity: 0.6,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke={isActive ? 'white' : color}
                className="transition-colors duration-fast"
              >
                {CATEGORY_ICONS[type]}
              </svg>
            </div>
            <span
              className={`text-[11px] font-medium leading-tight tracking-[0.014em] transition-colors duration-fast ${
                isActive ? 'text-label' : 'text-label-secondary'
              }`}
            >
              {CATEGORY_LABELS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
