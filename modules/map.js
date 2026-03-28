import { state, DESKTOP_WIDTH } from './state.js';
import { slugify } from './utils.js';
import bus from './bus.js';
import { showCarousel, hideCarousel, isCarouselVisible } from './carousel.js';

// --- Constants ---
const NL_CENTER_LNG = 5.1;
const NL_CENTER_LAT = 52.1;
const INITIAL_ZOOM = 7;
const MAP_FADE_DURATION = 300;
const MAX_PIXEL_RATIO = 2;
const CLUSTER_MAX_ZOOM = 13;
const CLUSTER_RADIUS = 45;
const CLUSTER_FLY_DURATION = 900;
const MARKER_OFFSET_RATIO = 0.20;
const MARKER_EASE_DURATION = 400;
const SINGLE_LOC_ZOOM = 14;
const FIT_BOUNDS_DURATION = 600;
const FIT_BOUNDS_MAX_ZOOM = 15;
const FIT_BOUNDS_PADDING = { top: 50, bottom: 60, left: 40, right: 40 };
const MARKER_RADIUS_DEFAULT = 10;
const MARKER_RADIUS_BOUNCE = 18;
const MARKER_RADIUS_SELECTED = 15;
const MARKER_BOUNCE_SETTLE_MS = 180;
const MARKER_STROKE_WIDTH = 2.5;
const MARKER_STROKE_WIDTH_SELECTED = 3;
const CAROUSEL_MAX_LEAVES = 5;
const COORD_TOLERANCE = 0.0001;
const POP_RING_CLEANUP_MS = 500;
const MAP_RESIZE_DELAY_MS = 50;

export function loadMapLibre() {
    if (state.mapLibreReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (window.maplibregl) { state.mapLibreReady = true; resolve(); return; }
        // Check if a script tag already exists (e.g. from preload + previous call)
        const existing = document.querySelector('script[src*="maplibre-gl"]');
        if (existing) {
            existing.onload = () => { state.mapLibreReady = true; resolve(); };
            existing.onerror = () => reject(new Error('MapLibre CDN unavailable'));
            if (window.maplibregl) { state.mapLibreReady = true; resolve(); }
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.js';
        script.async = true;
        script.onload = () => { state.mapLibreReady = true; resolve(); };
        script.onerror = () => {
            const mapTab = document.getElementById('tab-map');
            if (mapTab) mapTab.style.display = 'none';
            reject(new Error('MapLibre CDN unavailable'));
        };
        document.head.appendChild(script);
    });
}

function buildGeoJSON(locations) {
    return {
        type: 'FeatureCollection',
        features: locations
            .filter(loc => loc.lat && loc.lng)
            .map(loc => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
                properties: { id: loc.id, name: loc.name, type: loc.type }
            }))
    };
}

export function initMap() {
    if (state.mapInstance) return;
    const container = document.getElementById('map');
    state.mapInstance = new maplibregl.Map({
        container: container,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [NL_CENTER_LNG, NL_CENTER_LAT],
        zoom: INITIAL_ZOOM,
        attributionControl: true,
        pixelRatio: Math.min(devicePixelRatio, MAX_PIXEL_RATIO),
        fadeDuration: MAP_FADE_DURATION,
        pitchWithRotate: false,
        dragRotate: false,
    });

    state.mapInstance.on('load', () => {
        state.mapLoaded = true;

        state.mapInstance.addSource('locations', {
            type: 'geojson',
            data: buildGeoJSON(state.allLocations),
            cluster: true,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
            clusterRadius: CLUSTER_RADIUS
        });

        state.mapInstance.addLayer({
            id: 'clusters', type: 'circle', source: 'locations',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#D4775A',
                'circle-radius': [
                    'step', ['get', 'point_count'],
                    18,      // default (small clusters)
                    10, 22,  // 10+ locations
                    30, 28,  // 30+ locations
                    100, 34  // 100+ locations
                ],
                'circle-radius-transition': { duration: 350, delay: 0 },
                'circle-opacity': 0.92,
                'circle-opacity-transition': { duration: 300, delay: 0 },
                'circle-stroke-width': 2.5,
                'circle-stroke-width-transition': { duration: 300, delay: 0 },
                'circle-stroke-color': '#ffffff'
            }
        });

        state.mapInstance.addLayer({
            id: 'cluster-count', type: 'symbol', source: 'locations',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-size': [
                    'step', ['get', 'point_count'],
                    13, 10, 14, 30, 15, 100, 16
                ],
                'text-font': ['Noto Sans Bold']
            },
            paint: { 'text-color': '#ffffff' }
        });

        state.mapInstance.addLayer({
            id: 'unclustered-point', type: 'circle', source: 'locations',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': ['match', ['get', 'type'],
                    'play', '#52B788', 'farm', '#8B6F47', 'nature', '#2D6A4F',
                    'horeca', '#E76F51', 'museum', '#7B2D8B', 'swim', '#2196F3', 'pancake', '#E9C46A',
                    '#D4775A'
                ],
                'circle-radius': 10,
                'circle-radius-transition': { duration: 250, delay: 0 },
                'circle-stroke-width': 2.5,
                'circle-stroke-width-transition': { duration: 250, delay: 0 },
                'circle-stroke-color': '#ffffff',
                'circle-stroke-color-transition': { duration: 200, delay: 0 },
                'circle-opacity': 0.9,
                'circle-opacity-transition': { duration: 300, delay: 0 }
            }
        });

        // Glow ring layer — renders behind unclustered-point for selected marker
        state.mapInstance.addLayer({
            id: 'marker-glow', type: 'circle', source: 'locations',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-radius': 0,
                'circle-radius-transition': { duration: 350, delay: 0 },
                'circle-color': 'transparent',
                'circle-stroke-width': 0,
                'circle-stroke-width-transition': { duration: 350, delay: 0 },
                'circle-stroke-color': 'rgba(212, 119, 90, 0.3)',
                'circle-opacity': 0,
                'circle-opacity-transition': { duration: 300, delay: 0 }
            }
        }, 'unclustered-point'); // insert below the marker layer

        state.mapInstance.on('click', 'clusters', (e) => {
            const features = state.mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            const clusterId = features[0].properties.cluster_id;
            const source = state.mapInstance.getSource('locations');
            const currentZoom = state.mapInstance.getZoom();
            const isMobile = window.innerWidth < DESKTOP_WIDTH;

            // Get cluster expansion zoom + leaf count in parallel
            Promise.all([
                source.getClusterExpansionZoom(clusterId),
                source.getClusterLeaves(clusterId, CAROUSEL_MAX_LEAVES + 1, 0)
            ]).then(([expansionZoom, leaves]) => {
                const leafCount = leaves.length;

                // Cut-off algorithm: small cluster at high zoom on mobile → carousel
                if (isMobile && leafCount <= CAROUSEL_MAX_LEAVES && currentZoom >= CLUSTER_MAX_ZOOM - 2) {
                    const locations = leaves
                        .map(f => state.allLocations.find(l => l.id === f.properties.id))
                        .filter(Boolean);
                    if (locations.length > 0) {
                        showCarousel(locations);
                        return;
                    }
                }

                // Default: zoom into cluster with staggered marker pop-in
                state.mapInstance.setPaintProperty('unclustered-point', 'circle-opacity', 0);
                state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-width', 0);
                state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', 0);

                state.mapInstance.flyTo({
                    center: features[0].geometry.coordinates,
                    zoom: expansionZoom,
                    duration: CLUSTER_FLY_DURATION,
                    easing: (t) => 1 - Math.pow(1 - t, 3)
                });

                state.mapInstance.once('moveend', () => {
                    state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', MARKER_RADIUS_DEFAULT);
                    state.mapInstance.setPaintProperty('unclustered-point', 'circle-opacity', 0.9);
                    state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-width', MARKER_STROKE_WIDTH);
                });
            });
        });

        state.mapInstance.on('click', 'unclustered-point', (e) => {
            const props = e.features[0].properties;
            const isMobile = window.innerWidth < DESKTOP_WIDTH;
            const clickCoords = e.features[0].geometry.coordinates;

            // Dismiss carousel if it's open
            if (isCarouselVisible()) {
                hideCarousel();
            }

            if (isMobile) {
                // Check for multiple locations at same coordinates
                const colocated = state.allLocations.filter(l =>
                    l.lat && l.lng &&
                    Math.abs(l.lat - clickCoords[1]) < COORD_TOLERANCE &&
                    Math.abs(l.lng - clickCoords[0]) < COORD_TOLERANCE
                );

                if (colocated.length > 1) {
                    // Multiple locations at same spot → show carousel
                    showCarousel(colocated);
                    return;
                }

                // Single location — show preview as usual
                const loc = state.allLocations.find(l => l.id === props.id);
                if (loc) {
                    bus.emit('sheet:showlocation', loc);
                    highlightMarker(props.id);

                    // Center marker in upper portion of viewport (above the half-sheet)
                    const coords = e.features[0].geometry.coordinates.slice();
                    const vh = window.innerHeight;
                    const offsetY = vh * MARKER_OFFSET_RATIO;
                    state.mapInstance.easeTo({
                        center: coords,
                        offset: [0, -offsetY],
                        duration: MARKER_EASE_DURATION
                    });

                    // Deep linking: update hash with map position + location slug
                    const slug = slugify(loc.name);
                    const center = state.mapInstance.getCenter();
                    const zoom = Math.round(state.mapInstance.getZoom());
                    bus.emit('hash:update', `@${center.lat.toFixed(2)},${center.lng.toFixed(2)},${zoom}z/loc/${slug}`);
                }
            } else {
                bus.emit('sheet:open', props.id);
            }
        });

        state.mapInstance.on('click', (e) => {
            const features = state.mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters', 'unclustered-point'] });
            if (features.length === 0) {
                // Dismiss carousel if visible
                if (isCarouselVisible()) {
                    hideCarousel();
                    return;
                }

                const isMobile = window.innerWidth < DESKTOP_WIDTH;
                if (isMobile) {
                    bus.emit('sheet:hidepreview');
                    bus.emit('sheet:setstate', 'peek');
                    highlightMarker(null);
                    bus.emit('hash:update', '');
                } else {
                    bus.emit('sheet:close');
                }
            }
        });

        state.mapInstance.on('mouseenter', 'clusters', () => { state.mapInstance.getCanvas().style.cursor = 'pointer'; });
        state.mapInstance.on('mouseleave', 'clusters', () => { state.mapInstance.getCanvas().style.cursor = ''; });
        state.mapInstance.on('mouseenter', 'unclustered-point', () => { state.mapInstance.getCanvas().style.cursor = 'pointer'; });
        state.mapInstance.on('mouseleave', 'unclustered-point', () => { state.mapInstance.getCanvas().style.cursor = ''; });

        updateMapMarkers(state.allLocations);
        updateUserLocationOnMap();
        // Flush any data that arrived before map was ready
        flushPendingMarkers();
    });
}

// Queue for data arriving before map is ready
let pendingMarkerData = null;

export function updateMapMarkers(locations) {
    if (!state.mapInstance || !state.mapLoaded) {
        // Queue data — will be applied when map fires 'load'
        pendingMarkerData = locations;
        return;
    }
    pendingMarkerData = null;
    const source = state.mapInstance.getSource('locations');
    if (source) source.setData(buildGeoJSON(locations));

    const noResults = document.getElementById('map-no-results');
    const hasResults = locations.filter(l => l.lat && l.lng).length > 0;
    if (noResults) noResults.classList.toggle('hidden', hasResults);

    const isDesktopSplit = window.innerWidth >= DESKTOP_WIDTH;
    if ((state.currentDisplayMode === 'map' || isDesktopSplit) && hasResults) fitMapToMarkers();
}

export function flushPendingMarkers() {
    if (pendingMarkerData) {
        updateMapMarkers(pendingMarkerData);
    }
}

export function fitMapToMarkers() {
    if (!state.mapInstance || !state.mapLoaded) return;
    const locs = state.allLocations.filter(l => l.lat && l.lng);
    if (locs.length === 0) return;

    if (locs.length === 1) {
        state.mapInstance.easeTo({ center: [locs[0].lng, locs[0].lat], zoom: SINGLE_LOC_ZOOM, duration: FIT_BOUNDS_DURATION });
        return;
    }

    const bounds = new maplibregl.LngLatBounds();
    locs.forEach(l => bounds.extend([l.lng, l.lat]));
    if (state.userLocation) bounds.extend([state.userLocation.lng, state.userLocation.lat]);
    state.mapInstance.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, duration: FIT_BOUNDS_DURATION, maxZoom: FIT_BOUNDS_MAX_ZOOM });
}

export function updateUserLocationOnMap() {
    if (!state.mapInstance || !state.mapLoaded) return;
    if (state.userLocationMarker) { state.userLocationMarker.remove(); state.userLocationMarker = null; }
    if (!state.userLocation) return;

    const el = document.createElement('div');
    el.className = 'user-location-dot';
    state.userLocationMarker = new maplibregl.Marker({ element: el })
        .setLngLat([state.userLocation.lng, state.userLocation.lat])
        .addTo(state.mapInstance);
}

export function highlightMarker(id) {
    if (!state.mapInstance) return;
    const selecting = id != null;
    try {
        if (selecting) {
            // Bounce effect: briefly overshoot then settle
            state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', [
                'case', ['==', ['get', 'id'], id], MARKER_RADIUS_BOUNCE, MARKER_RADIUS_DEFAULT
            ]);
            setTimeout(() => {
                try {
                    state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', [
                        'case', ['==', ['get', 'id'], id], MARKER_RADIUS_SELECTED, MARKER_RADIUS_DEFAULT
                    ]);
                } catch(e) { console.warn('[map:highlightMarker] Bounce settle failed:', e.message); }
            }, MARKER_BOUNCE_SETTLE_MS);
        } else {
            state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', MARKER_RADIUS_DEFAULT);
        }
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-width', [
            'case', ['==', ['get', 'id'], id ?? -1], MARKER_STROKE_WIDTH_SELECTED, MARKER_STROKE_WIDTH
        ]);
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-color', [
            'case', ['==', ['get', 'id'], id ?? -1], '#D4775A', '#ffffff'
        ]);

        // Glow ring layer — shows behind selected marker
        const GLOW_RADIUS = 22;
        const GLOW_STROKE = 5;
        if (selecting) {
            state.mapInstance.setPaintProperty('marker-glow', 'circle-radius', [
                'case', ['==', ['get', 'id'], id], GLOW_RADIUS, 0
            ]);
            state.mapInstance.setPaintProperty('marker-glow', 'circle-stroke-width', [
                'case', ['==', ['get', 'id'], id], GLOW_STROKE, 0
            ]);
            state.mapInstance.setPaintProperty('marker-glow', 'circle-opacity', [
                'case', ['==', ['get', 'id'], id], 1, 0
            ]);
        } else {
            state.mapInstance.setPaintProperty('marker-glow', 'circle-radius', 0);
            state.mapInstance.setPaintProperty('marker-glow', 'circle-stroke-width', 0);
            state.mapInstance.setPaintProperty('marker-glow', 'circle-opacity', 0);
        }
    } catch(e) { console.warn('[map:highlightMarker] Paint property update failed:', e.message); }

    // Pop-ring animation overlay on the selected marker
    if (selecting) {
        showPopRing(id);
    }
}

/** Show a temporary expanding ring at the marker's screen position */
function showPopRing(id) {
    if (!state.mapInstance) return;
    // Find the feature's coordinates from the source data
    const source = state.mapInstance.getSource('locations');
    if (!source) return;
    const loc = state.allLocations.find(l => l.id === id);
    if (!loc || !loc.lng || !loc.lat) return;

    const point = state.mapInstance.project([loc.lng, loc.lat]);
    const container = state.mapInstance.getContainer();

    const ring = document.createElement('div');
    ring.className = 'marker-pop-ring';
    ring.style.left = point.x + 'px';
    ring.style.top = point.y + 'px';
    container.appendChild(ring);

    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    // Safety cleanup if animationend doesn't fire
    setTimeout(() => { if (ring.parentNode) ring.remove(); }, POP_RING_CLEANUP_MS);
}

export function setDisplayMode(mode) {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    state.currentDisplayMode = mode;
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    const mapContainer = document.getElementById('map-container');

    if (mode === 'map' || isDesktop) {
        if (!isDesktop) {
            resultsContainer.classList.add('map-active');
            loader.classList.add('map-active');
        }
        mapContainer.classList.remove('hidden');

        if (!state.mapInstance) {
            loadMapLibre().then(() => { initMap(); }).catch(err => {
                console.warn('Map unavailable:', err);
                const mapTab = document.getElementById('tab-map');
                if (mapTab) mapTab.style.display = 'none';
                if (!isDesktop) bus.emit('view:switch', 'home');
            });
        } else {
            state.mapInstance.resize();
            if (mode === 'map') fitMapToMarkers();
        }
    } else {
        resultsContainer.classList.remove('map-active');
        loader.classList.remove('map-active');
        mapContainer.classList.add('hidden');
        bus.emit('sheet:close');
    }
}

// Bus listeners
bus.on('map:update', updateMapMarkers);
bus.on('map:userlocation', updateUserLocationOnMap);
bus.on('map:highlight', highlightMarker);
bus.on('map:displaymode', setDisplayMode);
