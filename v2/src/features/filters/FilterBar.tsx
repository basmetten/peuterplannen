'use client';

import { WEATHER_OPTIONS, PRICE_BANDS, PRICE_BAND_LABELS, AGE_PRESETS, SCORE_PRESETS } from '@/domain/enums';
import type { Weather, PriceBand, AgePresetKey } from '@/domain/enums';

interface FilterBarProps {
  activeWeather: Weather | null;
  activePriceBands: PriceBand[];
  activeMinScore: number | null;
  activeAgeKey: AgePresetKey | null;
  onWeatherChange: (weather: Weather | null) => void;
  onPriceBandToggle: (band: PriceBand) => void;
  onScoreChange: (score: number | null) => void;
  onAgeChange: (key: AgePresetKey | null) => void;
}

const WEATHER_LABELS: Record<Weather, string> = {
  indoor: 'Binnen',
  outdoor: 'Buiten',
  both: 'Beide',
};

export function FilterBar({
  activeWeather,
  activePriceBands,
  activeMinScore,
  activeAgeKey,
  onWeatherChange,
  onPriceBandToggle,
  onScoreChange,
  onAgeChange,
}: FilterBarProps) {
  return (
    <div className="px-4 pb-3">
      {/* Secondary filters — weather, price, score, age */}
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-none">
        {/* Weather */}
        {WEATHER_OPTIONS.map((w) => {
          const isActive = activeWeather === w;
          return (
            <Pill
              key={w}
              label={WEATHER_LABELS[w]}
              isActive={isActive}
              onClick={() => onWeatherChange(isActive ? null : w)}
            />
          );
        })}

        <Divider />

        {/* Price */}
        {PRICE_BANDS.map((band) => {
          const isActive = activePriceBands.includes(band);
          return (
            <Pill
              key={band}
              label={PRICE_BAND_LABELS[band]}
              isActive={isActive}
              onClick={() => onPriceBandToggle(band)}
            />
          );
        })}

        <Divider />

        {/* Score */}
        {SCORE_PRESETS.map((score) => {
          const isActive = activeMinScore === score;
          return (
            <Pill
              key={score}
              label={`${score}+`}
              isActive={isActive}
              onClick={() => onScoreChange(isActive ? null : score)}
            />
          );
        })}

        <Divider />

        {/* Age */}
        {AGE_PRESETS.map((preset) => {
          const isActive = activeAgeKey === preset.key;
          return (
            <Pill
              key={preset.key}
              label={preset.label}
              isActive={isActive}
              onClick={() => onAgeChange(isActive ? null : preset.key as AgePresetKey)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* --- Shared pill component --- */

function Pill({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`
        flex-shrink-0 rounded-pill px-2.5 py-1 text-[12px] font-medium tracking-[0.002em]
        transition-all duration-fast ease-spring
        ${isActive
          ? 'bg-accent text-white shadow-sm'
          : 'bg-bg-secondary text-label-secondary hover:bg-bg-secondary/80'
        }
      `}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-4 w-px flex-shrink-0 bg-separator" />;
}
