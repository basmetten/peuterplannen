'use client';

import { LOCATION_TYPES, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';

interface CategoryGridProps {
  activeTypes: LocationType[];
  onTypeToggle: (type: LocationType) => void;
}

/** Short labels for the grid cells (shorter than LOCATION_TYPE_LABELS for compact layout) */
const GRID_LABELS: Record<LocationType, string> = {
  play: 'Speeltuin',
  farm: 'Boerderij',
  nature: 'Natuur',
  museum: 'Museum',
  swim: 'Zwembad',
  pancake: 'Pannenkoek',
  horeca: 'Horeca',
  culture: 'Cultuur',
};

/** SVG icon paths for each type (20×20 viewBox) */
const ICONS: Record<LocationType, React.ReactNode> = {
  play: (
    // Swing set
    <path d="M4 3v14M16 3v14M4 3h12M7 3l-1 10M13 3l1 10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  farm: (
    // Barn
    <path d="M3 10l7-6 7 6M5 10v6h10v-6M8 16v-4h4v4M10 4v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  nature: (
    // Tree
    <path d="M10 17v-4M6 13l4-10 4 10H6zM4 13h12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  museum: (
    // Building with columns
    <path d="M3 17h14M5 8v9M9 8v9M11 8v9M15 8v9M3 8h14l-7-5-7 5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  swim: (
    // Waves
    <path d="M2 8c2-2 4 0 6-2s4 0 6-2M2 12c2-2 4 0 6-2s4 0 6-2M2 16c2-2 4 0 6-2s4 0 6-2" strokeWidth="1.5" strokeLinecap="round" />
  ),
  pancake: (
    // Stack of pancakes
    <path d="M4 14c0 1.5 2.7 3 6 3s6-1.5 6-3M4 10c0 1.5 2.7 3 6 3s6-1.5 6-3M4 10c0-1.5 2.7-3 6-3s6 1.5 6 3M4 10v4M16 10v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  horeca: (
    // Coffee cup
    <path d="M5 5h8v7c0 2-1.5 3-4 3s-4-1-4-3V5zM13 7h2c1 0 2 .5 2 2s-1 2-2 2h-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  culture: (
    // Theater masks
    <path d="M7 4C4 4 3 6.5 3 9s1 5 4 5c1.5 0 2.5-.8 3-2M13 4c3 0 4 2.5 4 5s-1 5-4 5c-1.5 0-2.5-.8-3-2M5.5 7.5h.01M8.5 7.5h.01M5 10c.5.8 1.5 1 2 1M11.5 7.5h.01M14.5 7.5h.01M12 10.5c.5-.5 1.2-.5 2 0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

export function CategoryGrid({ activeTypes, onTypeToggle }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-y-3 gap-x-2 px-4 py-3">
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
                {ICONS[type]}
              </svg>
            </div>
            <span
              className={`text-[11px] font-medium leading-tight tracking-[0.014em] transition-colors duration-fast ${
                isActive ? 'text-label' : 'text-label-secondary'
              }`}
            >
              {GRID_LABELS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
