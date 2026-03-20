import { state, DESKTOP_WIDTH } from './state.js';

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
        fadeDuration: 0,
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
                'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
                'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff'
            }
        });

        state.mapInstance.addLayer({
            id: 'cluster-count', type: 'symbol', source: 'locations',
            filter: ['has', 'point_count'],
            layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13, 'text-font': ['Noto Sans Regular'] },
            paint: { 'text-color': '#ffffff' }
        });

        state.mapInstance.addLayer({
            id: 'unclustered-point', type: 'circle', source: 'locations',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': ['match', ['get', 'type'],
                    'play', '#6B9590', 'farm', '#8B7355', 'nature', '#4A7A76',
                    'horeca', '#D4775A', 'museum', '#8B6688', 'swim', '#5B9EC4', 'pancake', '#E8B870',
                    '#D4775A'
                ],
                'circle-radius': 9, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff'
            }
        });

        state.mapInstance.on('click', 'clusters', (e) => {
            const features = state.mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            const clusterId = features[0].properties.cluster_id;
            state.mapInstance.getSource('locations').getClusterExpansionZoom(clusterId).then(zoom => {
                state.mapInstance.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
            });
        });

        state.mapInstance.on('click', 'unclustered-point', (e) => {
            const props = e.features[0].properties;
            const isMobile = window.innerWidth < DESKTOP_WIDTH;

            if (isMobile) {
                // Find the full location object for the preview
                const loc = state.allLocations.find(l => l.id === props.id);
                if (loc) {
                    window._pp_modules?.showLocationInSheet?.(loc);
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
                    window._pp_modules?.updateHash?.(`@${center.lat.toFixed(2)},${center.lng.toFixed(2)},${zoom}z/loc/${slug}`);
                }
            } else {
                window._pp_modules?.openLocSheet?.(props.id);
            }
        });

        state.mapInstance.on('click', (e) => {
            const features = state.mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters', 'unclustered-point'] });
            if (features.length === 0) {
                const isMobile = window.innerWidth < DESKTOP_WIDTH;
                if (isMobile) {
                    window._pp_modules?.hideLocationPreview?.();
                    window._pp_modules?.setSheetState?.('peek');
                    highlightMarker(null);
                    window._pp_modules?.updateHash?.('');
                } else {
                    window._pp_modules?.closeLocSheet?.();
                }
            }
        });

        state.mapInstance.on('mouseenter', 'clusters', () => { state.mapInstance.getCanvas().style.cursor = 'pointer'; });
        state.mapInstance.on('mouseleave', 'clusters', () => { state.mapInstance.getCanvas().style.cursor = ''; });
        state.mapInstance.on('mouseenter', 'unclustered-point', () => { state.mapInstance.getCanvas().style.cursor = 'pointer'; });
        state.mapInstance.on('mouseleave', 'unclustered-point', () => { state.mapInstance.getCanvas().style.cursor = ''; });

        updateMapMarkers(state.allLocations);
        updateUserLocationOnMap();
    });
}

export function updateMapMarkers(locations) {
    if (!state.mapInstance || !state.mapLoaded) return;
    const source = state.mapInstance.getSource('locations');
    if (source) source.setData(buildGeoJSON(locations));

    const noResults = document.getElementById('map-no-results');
    const hasResults = locations.filter(l => l.lat && l.lng).length > 0;
    noResults.classList.toggle('hidden', hasResults);

    const isDesktopSplit = window.innerWidth >= DESKTOP_WIDTH;
    if ((state.currentDisplayMode === 'map' || isDesktopSplit) && hasResults) fitMapToMarkers();
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
    try {
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-radius', [
            'case', ['==', ['get', 'id'], id ?? -1], 14, 9
        ]);
        state.mapInstance.setPaintProperty('unclustered-point', 'circle-stroke-width', [
            'case', ['==', ['get', 'id'], id ?? -1], 3, 2
        ]);
    } catch(e) {}
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
                if (!isDesktop) window._pp_modules?.switchView?.('home');
            });
        } else {
            state.mapInstance.resize();
            if (mode === 'map') fitMapToMarkers();
        }
    } else {
        resultsContainer.classList.remove('map-active');
        loader.classList.remove('map-active');
        mapContainer.classList.add('hidden');
        window._pp_modules?.closeLocSheet?.();
    }
}
