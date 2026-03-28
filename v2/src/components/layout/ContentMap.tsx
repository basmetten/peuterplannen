'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LocationSummary } from '@/domain/types';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/positron';
const NL_CENTER: [number, number] = [4.9, 52.37];
const NL_ZOOM = 8;

const SOURCE_ID = 'content-locations';
const CLUSTER_LAYER = 'content-clusters';
const CLUSTER_COUNT_LAYER = 'content-cluster-count';
const MARKER_LAYER = 'content-markers';
const MARKER_HIGHLIGHT_LAYER = 'content-markers-highlight';

interface ContentMapProps {
  locations: LocationSummary[];
  /** Map from location ID → href for click navigation */
  locationHrefs: Record<number, string>;
  /** Location ID to highlight with a larger marker */
  highlightId?: number;
}

function toGeoJSON(locs: LocationSummary[]) {
  return {
    type: 'FeatureCollection' as const,
    features: locs.map((loc) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [loc.lng, loc.lat] as [number, number],
      },
      properties: { id: loc.id },
    })),
  };
}

/**
 * Lightweight map for SSR content pages (desktop right panel).
 * Shows location markers with clustering. Marker click navigates to detail page.
 * No carousel, no sheet interaction — read-only with navigation.
 * Falls back to neutral background if WebGL is unavailable.
 */
export function ContentMap({
  locations,
  locationHrefs,
  highlightId,
}: ContentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const router = useRouter();

  // Stable refs to avoid stale closures in map event handlers
  const dataRef = useRef({ locationHrefs, router });
  dataRef.current = { locationHrefs, router };

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || locations.length === 0) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: NL_CENTER,
        zoom: NL_ZOOM,
        minZoom: 4,
        maxZoom: 18,
        attributionControl: false,
      });
    } catch {
      // WebGL unavailable or other init failure
      setMapError(true);
      return;
    }

    mapRef.current = map;

    // Catch async errors (e.g., WebGL context lost)
    map.on('error', () => {
      setMapError(true);
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    map.on('load', () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(locations),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // Cluster circles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual markers
      map.addLayer({
        id: MARKER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Highlighted marker (larger ring)
      map.addLayer({
        id: MARKER_HIGHLIGHT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: highlightId
          ? ['==', ['get', 'id'], highlightId]
          : ['==', ['get', 'id'], -1],
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': 11,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Fit bounds to show all locations
      if (locations.length === 1) {
        map.jumpTo({ center: [locations[0].lng, locations[0].lat], zoom: 14 });
      } else if (locations.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const loc of locations) {
          bounds.extend([loc.lng, loc.lat]);
        }
        map.fitBounds(bounds, {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom: 14,
          duration: 0,
        });
      }
    });

    // Cluster click → zoom in
    map.on('click', CLUSTER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties.cluster_id;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.flyTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
          duration: 500,
        });
      });
    });

    // Marker click → navigate to detail page
    map.on('click', MARKER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = feature.properties.id;
      const href = dataRef.current.locationHrefs[id];
      if (href) dataRef.current.router.push(href);
    });

    // Cursor styles
    const canvas = map.getCanvas();
    map.on('mouseenter', MARKER_LAYER, () => {
      canvas.style.cursor = 'pointer';
    });
    map.on('mouseleave', MARKER_LAYER, () => {
      canvas.style.cursor = '';
    });
    map.on('mouseenter', CLUSTER_LAYER, () => {
      canvas.style.cursor = 'pointer';
    });
    map.on('mouseleave', CLUSTER_LAYER, () => {
      canvas.style.cursor = '';
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Init once — component remounts on route change

  // Update highlighted marker when highlightId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(MARKER_HIGHLIGHT_LAYER))
      return;
    map.setFilter(
      MARKER_HIGHLIGHT_LAYER,
      highlightId
        ? ['==', ['get', 'id'], highlightId]
        : ['==', ['get', 'id'], -1],
    );
  }, [highlightId]);

  // Graceful fallback if WebGL fails
  if (mapError) {
    return <div className="h-full bg-bg-secondary" />;
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
