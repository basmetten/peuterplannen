'use client';

import { useRef, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';

/**
 * Freezes MapLibre's render loop during sheet animations to prevent
 * GPU contention between WebGL and CSS animations on iOS Safari.
 *
 * Usage: call freeze() before sheet animation starts, unfreeze() after it settles.
 */
export function useMapFreeze(mapRef: React.RefObject<maplibregl.Map | null>) {
  const savedTriggerRepaint = useRef<(() => void) | null>(null);

  const freeze = useCallback(() => {
    const map = mapRef.current;
    if (!map || savedTriggerRepaint.current) return; // already frozen
    savedTriggerRepaint.current = map.triggerRepaint.bind(map);
    map.triggerRepaint = () => {}; // no-op — stops render loop
  }, [mapRef]);

  const unfreeze = useCallback(() => {
    const map = mapRef.current;
    if (!map || !savedTriggerRepaint.current) return;
    map.triggerRepaint = savedTriggerRepaint.current;
    savedTriggerRepaint.current = null;
    map.triggerRepaint(); // schedule one repaint to catch up
  }, [mapRef]);

  return { freeze, unfreeze };
}
