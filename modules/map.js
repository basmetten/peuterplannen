import { state, DESKTOP_WIDTH } from './state.js';
import bus from './bus.js';

export function loadMapLibre() {
    if (state.mapLibreReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (window.maplibregl) { state.mapLibreReady = true; resolve(); return; }
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
        center: [5.1, 52.1],
        zoom: 7,
        attributionControl: true,
        pixelRatio: Math.min(devicePixelRatio, 2),
        fadeDuration: 300,
        pitchWithRotate: false,
        dragRotate: false,
    });

    state.mapInstance.on('load', () => {
        state.mapLoaded = true;

        state.mapInstance.addSource('locations', {
            type: 'geojson',
            data: buildGeoJSON(state.allLocations),
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 45
        });

        state.mapInstance.addLayer({
            id: 'clusters', type: 'circle', source: 'locations',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#D4775A',
                'circle-radius': [
                    'step', ['get', 'point_count'],
                    14,      // default (small clusters)
                    10, 16,  // 10+ locations
                    50, 19,  // 50+ locations
                    100, 22, // 100+ locations
                    200, 26  // 200+ locations
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
                    12, 10, 12, 50, 13, 100, 14
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

        state.mapInstance.on('click', 'clusters', (e) => {
            const features = state.mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            const clusterId = features[0].properties.cluster_id;
            state.mapInstance.getSource('locations').getClusterExpansionZoom(clusterId).then(zoom => {
                state.mapInstance.flyTo({ center: features[0].geometry.coordinates, zoom: zoom, duration: 800 });
            });
        });

        state.mapInstance.on('click', 'unclustered-point', (e) => {
            const props = e.features[0].properties;
            const isMobile = window.innerWidth < DESKTOP_WIDTH;

            if (isMobile) {
                // Find the full location object for the preview
                const loc = state.allLocations.find(l => l.id === props.id);
                if (loc) {
                    bus.emit('sheet:showlocation', loc);
                    highlightMarker(props.id);

                    // Center marker in upper portion of viewport (above the half-sheet)
                    const coords = e.features[0].geometry.coordinates.slice();
                    const vh = window.innerHeight;
                    // Sheet at half = 55% of viewport, so place marker at ~25% from top
                    const offsetY = vh * 0.20;
                    state.mapInstance.easeTo({
                        center: coords,
                        offset: [0, -offsetY],
                        duration: 400
                    });

                    // Deep linking: update hash with map position + location slug
                    const slug = (loc.name || '').toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
        state.mapInstance.easeTo({ center: [locs[0].lng, locs[0].lat], zoom: 14, duration: 600 });
        return;
    }

    const bounds = new maplibregl.LngLatBounds();
    locs.forEach(l => bounds.extend([l.lng, l.lat]));
    if (state.userLocation) bounds.extend([state.userLocation.lng, state.userLocation.lat]);
    state.mapInstance.fitBounds(bounds, { padding: { top: 50, bottom: 60, left: 40, right: 40 }, duration: 600, maxZoom: 15 });
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
            // Bounce effect: briefly overshoot to 18px then settle at 15px
            state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', [
                'case', ['==', ['get', 'id'], id], 18, 10
            ]);
            setTimeout(() => {
                try {
                    state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', [
                        'case', ['==', ['get', 'id'], id], 15, 10
                    ]);
                } catch(e) {}
            }, 180);
        } else {
            state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', 10);
        }
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-width', [
            'case', ['==', ['get', 'id'], id ?? -1], 3, 2.5
        ]);
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-color', [
            'case', ['==', ['get', 'id'], id ?? -1], '#D4775A', '#ffffff'
        ]);
    } catch(e) {}

    // Pulse animation on map container for visual feedback
    if (selecting) {
        const mapEl = document.getElementById('map-container');
        if (mapEl) {
            mapEl.classList.remove('marker-pulse');
            void mapEl.offsetWidth;
            mapEl.classList.add('marker-pulse');
        }
    }
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
