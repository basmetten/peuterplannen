'use client';

import type { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

/** Desktop sidebar width in px — used by MapContainer for left offset */
export const SIDEBAR_WIDTH = 380;

/**
 * Desktop persistent sidebar (≥768px).
 * Fixed 380px left panel with scrollable content.
 * No sheet gestures, no drag handle — content scrolls naturally.
 */
export function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      className="fixed bottom-0 left-0 top-0 z-30 flex flex-col overflow-hidden bg-bg-primary"
      style={{
        width: SIDEBAR_WIDTH,
        borderRight: '0.5px solid var(--color-separator)',
      }}
    >
      {children}
    </aside>
  );
}
