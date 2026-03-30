'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { LocationSummary } from '@/domain/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapState {
  locations: LocationSummary[];
  locationHrefs: Record<number, string>;
  highlightId?: number;
}

interface MapStateContextValue {
  mapState: MapState;
  setMapState: (state: MapState) => void;
  /** When true, AppShell's MapContainer is active — PersistentMap should not render */
  appMapActive: boolean;
  setAppMapActive: (active: boolean) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MapStateContext = createContext<MapStateContextValue | null>(null);

const EMPTY_STATE: MapState = { locations: [], locationHrefs: {} };

export function MapStateProvider({ children }: { children: ReactNode }) {
  const [mapState, setMapState] = useState<MapState>(EMPTY_STATE);
  const [appMapActive, setAppMapActive] = useState(false);

  return (
    <MapStateContext.Provider value={{ mapState, setMapState, appMapActive, setAppMapActive }}>
      {children}
    </MapStateContext.Provider>
  );
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error('useMapState must be used within MapStateProvider');
  return ctx;
}
