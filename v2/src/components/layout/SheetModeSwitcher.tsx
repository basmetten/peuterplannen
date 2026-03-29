'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';

export type SheetMode = 'ontdek' | 'bewaard' | 'plan';

interface SheetModeSwitcherProps {
  activeMode: SheetMode;
  onModeChange: (mode: SheetMode) => void;
}

export function SheetModeSwitcher({ activeMode, onModeChange }: SheetModeSwitcherProps) {
  const { count: favCount } = useFavorites();
  const { planIds } = usePlan();
  const planCount = planIds.length;

  return (
    <div className="flex justify-center gap-2 px-4 py-1.5">
      <ModePill
        label="Ontdek"
        active={activeMode === 'ontdek'}
        onTap={() => onModeChange('ontdek')}
      />
      <ModePill
        label="Bewaard"
        active={activeMode === 'bewaard'}
        badge={favCount}
        onTap={() => onModeChange('bewaard')}
      />
      <ModePill
        label="Plan"
        active={activeMode === 'plan'}
        badge={planCount}
        onTap={() => onModeChange('plan')}
      />
    </div>
  );
}

function ModePill({
  label,
  active,
  badge = 0,
  onTap,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`relative rounded-full px-4 py-1.5 text-[13px] font-medium tracking-[0.002em] transition-all duration-fast ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'bg-bg-secondary text-label-secondary'
      }`}
      aria-pressed={active}
      aria-label={badge > 0 ? `${label} (${badge})` : label}
    >
      {label}
      {badge > 0 && (
        <span
          className={`absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
            active
              ? 'bg-white text-accent'
              : 'bg-accent text-white'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
