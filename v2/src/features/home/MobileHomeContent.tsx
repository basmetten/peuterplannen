'use client';

import { SearchCommand } from '@/features/search/SearchCommand';
import { QuickFilterList } from '@/components/patterns/QuickFilterList';
import { GuidesEntryRow } from '@/components/patterns/GuidesEntryRow';
import type { LocationType } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';
import type { BlogPostMeta } from '@/domain/blog';
import type { SheetSnap } from '@/features/sheet/sheetMachine';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlan } from '@/hooks/usePlan';

interface MobileHomeContentProps {
  snap: SheetSnap;
  locations: LocationSummary[];
  guides: BlogPostMeta[];
  onCardTap: (location: LocationSummary) => void;
  onSearchFocus: () => void;
  onQueryChange: (query: string) => void;
  onCategoryTap: (type: LocationType) => void;
  onGuideListTap: () => void;
  onFavoritesTap: () => void;
  onPlanTap: () => void;
}

/**
 * Apple Maps-style mobile home sheet content.
 * Clean launchpad: search bar at peek, quick-filter rows + guides at half.
 * All detailed content lives in stacked sheets, not inline.
 */
export function MobileHomeContent({
  snap,
  locations,
  guides,
  onCardTap,
  onSearchFocus,
  onQueryChange,
  onCategoryTap,
  onGuideListTap,
  onFavoritesTap,
  onPlanTap,
}: MobileHomeContentProps) {
  const { count: favCount } = useFavorites();
  const { planIds } = usePlan();

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Search — always visible, even at peek */}
      <SearchCommand
        locations={locations}
        onSelect={onCardTap}
        onQueryChange={onQueryChange}
        onFocus={onSearchFocus}
      />

      {/* Everything below is hidden at peek — only search + handle visible */}
      {snap !== 'peek' && (
        <div className="flex flex-col gap-3 pb-4 pt-2">
          {/* Section: Find Nearby categories */}
          <div>
            <div className="px-4 pb-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-label-tertiary">
                Ontdek in de buurt
              </h2>
            </div>

            {/* Guides entry — prominent, above category rows */}
            <div className="px-4 pb-2">
              <GuidesEntryRow onTap={onGuideListTap} guideCount={guides.length} />
            </div>

            <QuickFilterList onCategoryTap={onCategoryTap} />
          </div>

          {/* Section: Personal (Bewaard / Plan) */}
          <div className="flex flex-col gap-[3px] px-4">

            {favCount > 0 && (
              <MiniEntryRow
                label={`Bewaard (${favCount})`}
                icon={
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15.77l-5.46 3.23 1.41-6.17L1.5 8.63l6.3-.53L10 2.5l2.2 5.6 6.3.53-4.45 4.2 1.41 6.17z" />
                  </svg>
                }
                iconBg="var(--color-system-yellow)"
                onTap={onFavoritesTap}
              />
            )}

            {planIds.length > 0 && (
              <MiniEntryRow
                label={`Je plan (${planIds.length})`}
                icon={
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h12v14l-6-3-6 3V4z" />
                  </svg>
                }
                iconBg="var(--color-system-green)"
                onTap={onPlanTap}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact entry row for Bewaard / Plan sections */
function MiniEntryRow({
  label,
  icon,
  iconBg,
  onTap,
}: {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl bg-bg-secondary/50 px-3 py-[8px] text-left transition-colors active:bg-bg-secondary"
    >
      <div
        className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <span className="flex-1 text-[15px] font-medium text-label">{label}</span>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-label-quaternary">
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
