'use client';

interface GuidesEntryRowProps {
  onTap: () => void;
  guideCount?: number;
}

/**
 * Single entry row for the Guides section in the mobile home sheet.
 * Tapping opens a new stacked sheet with all guides.
 */
export function GuidesEntryRow({ onTap, guideCount }: GuidesEntryRowProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl bg-accent/[0.06] px-3.5 py-[12px] text-left transition-colors active:bg-accent/[0.12] border-l-[3px] border-accent"
    >
      {/* Book icon */}
      <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[10px] bg-accent">
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6c1.1 0 2 .9 2 2v12c0-.6-.4-1-1-1H2V3zM18 3h-6c-1.1 0-2 .9-2 2v12c0-.6.4-1 1-1h7V3z" />
        </svg>
      </div>

      {/* Label + subtitle */}
      <div className="flex-1 min-w-0">
        <span className="text-[16px] font-semibold text-label">Gidsen</span>
        <p className="text-[12.5px] text-label-secondary leading-tight mt-0.5">
          Tips en routes voor uitjes
          {guideCount ? ` (${guideCount})` : ''}
        </p>
      </div>

      {/* Chevron */}
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-accent/60">
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
