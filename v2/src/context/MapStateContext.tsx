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
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MapStateContext = createContext<MapStateContextValue | null>(null);

const EMPTY_STATE: MapState = { locations: [], locationHrefs: {} };

export function MapStateProvider({ children }: { children: ReactNode }) {
  const [mapState, setMapState] = useState<MapState>(EMPTY_STATE);

  return (
    <MapStateContext.Provider value={{ mapState, setMapState }}>
      {children}
    </MapStateContext.Provider>
  );
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error('useMapState must be used within MapStateProvider');
  return ctx;
}
