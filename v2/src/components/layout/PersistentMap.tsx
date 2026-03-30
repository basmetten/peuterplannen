'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState } from '@/context/MapStateContext';
import type { LocationSummary } from '@/domain/types';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/positron';
const NL_CENTER: [number, number] = [4.9, 52.37];
const NL_ZOOM = 8;

const SOURCE_ID = 'persistent-locations';
const CLUSTER_LAYER = 'persistent-clusters';
const CLUSTER_COUNT_LAYER = 'persistent-cluster-count';
const MARKER_LAYER = 'persistent-markers';
const MARKER_HIGHLIGHT_LAYER = 'persistent-markers-highlight';

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
 * Persistent MapLibre GL map that lives in the (app) layout.
 * Never unmounts during intra-app navigation. Reads location data from
 * MapStateContext (pushed by MapUpdater in each page's ContentShell).
 *
 * When locations change: updates GeoJSON source, fits bounds.
 * When highlightId changes: updates highlight filter.
 * Falls back to neutral background if WebGL fails.
 */
export function PersistentMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const prevLocIdsRef = useRef<string>('');
  const router = useRouter();
  const { mapState } = useMapState();

  // Stable refs for event handler closures
  const dataRef = useRef({ locationHrefs: mapState.locationHrefs, router });
  dataRef.current = { locationHrefs: mapState.locationHrefs, router };

  // ------------------------------------------------------------------
  // Initialize map once (persists across navigations)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

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
        pixelRatio: 1,
        maxTileCacheSize: 12,
        fadeDuration: 0,
      });
    } catch {
      setMapError(true);
      return;
    }

    mapRef.current = map;
    map.on('error', () => setMapError(true));
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    map.on('load', () => {
      // Remove 3D fill-extrusion layers — can use 900MB+ at street zoom on iOS
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'fill-extrusion') {
          map.removeLayer(layer.id);
        }
      }

      // Empty GeoJSON source — data is pushed by MapUpdater via context
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
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
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            10,
            24,
            50,
            30,
          ],
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
        filter: ['==', ['get', 'id'], -1], // No highlight initially
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': 11,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      setMapLoaded(true);
    });

    // Cluster click → zoom in
    map.on('click', CLUSTER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source
        .getClusterExpansionZoom(feature.properties.cluster_id)
        .then((zoom) => {
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
  }, []); // Init once — layout never unmounts within (app)

  // ------------------------------------------------------------------
  // Update GeoJSON source + fit bounds when locations change
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const { locations } = mapState;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    // Always update source data (cheap operation)
    source.setData(toGeoJSON(locations));

    // Only fit bounds when the set of location IDs actually changed
    const locIds = locations
      .map((l) => l.id)
      .sort((a, b) => a - b)
      .join(',');
    if (locIds === prevLocIdsRef.current) return;
    prevLocIdsRef.current = locIds;

    if (locations.length === 0) {
      // No locations — zoom back to NL overview
      map.flyTo({ center: NL_CENTER, zoom: NL_ZOOM, duration: 800 });
    } else if (locations.length === 1) {
      map.flyTo({
        center: [locations[0].lng, locations[0].lat],
        zoom: 14,
        duration: 800,
      });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      for (const loc of locations) bounds.extend([loc.lng, loc.lat]);
      map.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 14,
        duration: 800,
      });
    }
  }, [mapLoaded, mapState]);

  // ------------------------------------------------------------------
  // Update highlight filter when highlightId changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map || !map.getLayer(MARKER_HIGHLIGHT_LAYER)) return;

    map.setFilter(
      MARKER_HIGHLIGHT_LAYER,
      mapState.highlightId
        ? ['==', ['get', 'id'], mapState.highlightId]
        : ['==', ['get', 'id'], -1],
    );
  }, [mapLoaded, mapState.highlightId]);

  if (mapError) {
    return <div className="h-full bg-bg-secondary" />;
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
