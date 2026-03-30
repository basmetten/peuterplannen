'use client';

import React, { type ReactNode } from 'react';

export type DesktopSection = 'browse' | 'guides' | 'favorites' | 'plan';

interface SidebarProps {
  children: ReactNode;
  collapsed?: boolean;
  activeSection: DesktopSection;
  onSectionChange: (section: DesktopSection) => void;
  favCount?: number;
  planCount?: number;
}

const NAV_WIDTH = 60;
const CONTENT_WIDTH = 380;

/** Total sidebar width (nav column + content panel) */
export const SIDEBAR_WIDTH = NAV_WIDTH + CONTENT_WIDTH;

/**
 * Desktop persistent sidebar (≥768px).
 * 60px icon nav column + 380px content panel.
 */
export function Sidebar({
  children,
  collapsed = false,
  activeSection,
  onSectionChange,
  favCount = 0,
  planCount = 0,
}: SidebarProps) {
  return (
    <aside
      className="fixed bottom-0 left-0 top-0 z-30 flex overflow-hidden bg-bg-primary transition-transform duration-200 ease-out"
      style={{
        width: SIDEBAR_WIDTH,
        borderRight: '0.5px solid var(--color-separator)',
        transform: collapsed ? `translateX(-${SIDEBAR_WIDTH}px)` : 'translateX(0)',
      }}
    >
      {/* Nav column */}
      <nav
        className="flex flex-shrink-0 flex-col items-center gap-1 border-r border-separator bg-bg-secondary/50 pt-4"
        style={{ width: NAV_WIDTH }}
      >
        <NavIcon
          icon="search"
          label="Ontdek"
          active={activeSection === 'browse'}
          onTap={() => onSectionChange('browse')}
        />
        <NavIcon
          icon="book"
          label="Gidsen"
          active={activeSection === 'guides'}
          onTap={() => onSectionChange('guides')}
        />
        <NavIcon
          icon="heart"
          label="Bewaard"
          active={activeSection === 'favorites'}
          badge={favCount}
          onTap={() => onSectionChange('favorites')}
        />
        <NavIcon
          icon="plan"
          label="Plan"
          active={activeSection === 'plan'}
          badge={planCount}
          onTap={() => onSectionChange('plan')}
        />
      </nav>

      {/* Content panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </aside>
  );
}

// --- Nav icon button ---

const ICONS: Record<string, React.ReactNode> = {
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h6a2 2 0 012 2v14a1 1 0 01-1-1H4V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 4h-6a2 2 0 00-2 2v14a1 1 0 011-1h7V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  plan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

function NavIcon({
  icon,
  label,
  active,
  badge = 0,
  onTap,
}: {
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`relative flex w-[48px] flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-label-tertiary hover:text-label-secondary'
      }`}
      aria-pressed={active}
      aria-label={label}
    >
      {ICONS[icon]}
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
