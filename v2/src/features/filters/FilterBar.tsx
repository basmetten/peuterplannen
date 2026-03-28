'use client';

import { useCallback } from 'react';
import { LOCATION_TYPES, WEATHER_OPTIONS, LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType, Weather } from '@/domain/enums';

interface FilterBarProps {
  activeTypes: LocationType[];
  activeWeather: Weather | null;
  onTypeToggle: (type: LocationType) => void;
  onWeatherChange: (weather: Weather | null) => void;
}


const WEATHER_LABELS: Record<Weather, string> = {
  indoor: 'Binnen',
  outdoor: 'Buiten',
  both: 'Beide',
};

export function FilterBar({
  activeTypes,
  activeWeather,
  onTypeToggle,
  onWeatherChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-3">
      {/* Type chips — horizontal scroll */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {LOCATION_TYPES.map((type) => {
          const isActive = activeTypes.includes(type);
          const color = TYPE_COLORS[type];
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTypeToggle(type)}
              className={`
                flex-shrink-0 rounded-pill px-3 py-1.5 text-[13px] font-medium tracking-[0.002em]
                transition-all duration-fast ease-spring
                ${isActive
                  ? 'text-white shadow-sm'
                  : 'bg-bg-secondary text-label-secondary hover:bg-bg-secondary/80'
                }
              `}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              {LOCATION_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Weather pills */}
      <div className="flex gap-2">
        {WEATHER_OPTIONS.map((w) => {
          const isActive = activeWeather === w;
          return (
            <button
              key={w}
              type="button"
              aria-pressed={isActive}
              onClick={() => onWeatherChange(isActive ? null : w)}
              className={`
                rounded-pill px-3 py-1.5 text-[13px] font-medium tracking-[0.002em]
                transition-all duration-fast ease-spring
                ${isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-bg-secondary text-label-secondary hover:bg-bg-secondary/80'
                }
              `}
            >
              {WEATHER_LABELS[w]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
