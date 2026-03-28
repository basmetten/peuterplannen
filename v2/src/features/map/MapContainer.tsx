'use client';

import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LocationSummary } from '@/domain/types';

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron';
const NL_CENTER: [number, number] = [4.9, 52.37];
const INITIAL_ZOOM = 8;

const SOURCE_ID = 'locations';
const CLUSTER_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';
const MARKER_LAYER = 'markers';
const MARKER_SELECTED_LAYER = 'markers-selected';

/** Max cluster size that triggers carousel instead of zoom */
const CAROUSEL_CLUSTER_MAX = 5;
/** Min zoom level for carousel trigger */
const CAROUSEL_MIN_ZOOM = 14;

interface MapContainerProps {
  locations: LocationSummary[];
  selectedId: number | null;
  /** Active carousel location — gets terracotta ring highlight */
  carouselActiveId?: number | null;
  onMarkerClick: (location: LocationSummary) => void;
  onMapClick: () => void;
  /** Called when a small cluster is tapped (zoom ≥ 14, ≤ 5 members) */
  onClusterExpand?: (locations: LocationSummary[]) => void;
  bottomPadding?: number;
  /** Left offset in px for desktop sidebar */
  leftOffset?: number;
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
      properties: {
        id: loc.id,
        name: loc.name,
        slug: loc.slug,
        type: loc.type,
        region: loc.region,
        toddler_highlight: loc.toddler_highlight,
        weather: loc.weather,
        ai_suitability_score_10: loc.ai_suitability_score_10,
        photo_url: loc.photo_url,
        is_featured: loc.is_featured,
        price_band: loc.price_band,
      },
    })),
  };
}

export function MapContainer({
  locations,
  selectedId,
  carouselActiveId,
  onMarkerClick,
  onMapClick,
  onClusterExpand,
  bottomPadding = 0,
  leftOffset = 0,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Stable refs for callbacks to avoid stale closures
  const cbRef = useRef({ onMarkerClick, onMapClick, onClusterExpand, locations });
  cbRef.current = { onMarkerClick, onMapClick, onClusterExpand, locations };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: NL_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(cbRef.current.locations),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 50, 34],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      });

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

      map.addLayer({
        id: MARKER_SELECTED_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], -1],
        paint: {
          'circle-color': '#C05A3A',
          'circle-radius': 11,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
    });

    // Cluster click → zoom or carousel
    map.on('click', CLUSTER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties.cluster_id;
      const pointCount = feature.properties.point_count;
      const currentZoom = map.getZoom();
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;

      // Small cluster at high zoom → carousel overlay
      if (
        currentZoom >= CAROUSEL_MIN_ZOOM &&
        pointCount <= CAROUSEL_CLUSTER_MAX &&
        cbRef.current.onClusterExpand
      ) {
        source.getClusterLeaves(clusterId, CAROUSEL_CLUSTER_MAX, 0).then((features) => {
          const resolved = features
            .map((f) => {
              const id = f.properties?.id;
              return cbRef.current.locations.find((l) => l.id === id);
            })
            .filter((l): l is LocationSummary => l !== undefined);

          if (resolved.length > 1) {
            // Center map on the cluster
            map.flyTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: Math.max(currentZoom, 15),
              duration: 400,
            });
            cbRef.current.onClusterExpand!(resolved);
          } else if (resolved.length === 1) {
            // Single location — go straight to detail
            cbRef.current.onMarkerClick(resolved[0]);
          }
        });
        return;
      }

      // Normal: zoom in to expand cluster
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.flyTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
          duration: 500,
        });
      });
    });

    // Marker click
    map.on('click', MARKER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = feature.properties.id;
      const loc = cbRef.current.locations.find((l) => l.id === id);
      if (loc) cbRef.current.onMarkerClick(loc);
    });

    // Empty map click
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [MARKER_LAYER, CLUSTER_LAYER],
      });
      if (features.length === 0) cbRef.current.onMapClick();
    });

    // Cursor styles
    map.on('mouseenter', MARKER_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', MARKER_LAYER, () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ''; });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Update data when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(toGeoJSON(locations));
    }
  }, [locations]);

  // Update selected marker highlight (detail view or carousel active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(MARKER_SELECTED_LAYER)) return;
    const highlightId = selectedId ?? carouselActiveId ?? null;
    map.setFilter(MARKER_SELECTED_LAYER, highlightId
      ? ['==', ['get', 'id'], highlightId]
      : ['==', ['get', 'id'], -1],
    );
  }, [selectedId, carouselActiveId]);

  // Resize map when sidebar offset changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Small delay to let CSS transition complete
    const timer = setTimeout(() => map.resize(), 50);
    return () => clearTimeout(timer);
  }, [leftOffset]);

  // Fly to selected marker
  useEffect(() => {
    const map = mapRef.current;
    if (!selectedId || !map) return;
    const loc = locations.find((l) => l.id === selectedId);
    if (loc) {
      map.flyTo({
        center: [loc.lng, loc.lat],
        zoom: Math.max(map.getZoom(), 13),
        duration: 600,
        padding: { bottom: bottomPadding },
      });
    }
  }, [selectedId, locations, bottomPadding]);

  return (
    <div className="absolute inset-0" style={{ left: leftOffset }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
