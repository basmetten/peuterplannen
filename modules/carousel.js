/**
 * carousel.js — Horizontal preview-card carousel for small clusters.
 *
 * Shows when tapping a cluster of ≤5 items at high zoom on mobile.
 * Coordinates with sheet-engine (hides sheet), map (highlights markers),
 * and templates (preview card rendering).
 */

import { state, DESKTOP_WIDTH } from './state.js';
import { renderPreviewCard } from './templates.js';
import { highlightMarker } from './map.js';
import bus from './bus.js';

// --- Carousel state ---
let carouselVisible = false;
let carouselLocations = [];
let carouselActiveIndex = 0;
let showTimeout = null; // guards against rapid double-tap race condition

// --- Constants ---
const CARD_WIDTH = 280;
const CARD_GAP = 12;
const CAROUSEL_SHOW_DELAY = 150; // ms after sheet starts hiding
const CAROUSEL_DISMISS_SHEET_DELAY = 200; // ms before sheet returns

/**
 * Show the carousel for a set of locations.
 * Hides the sheet, renders preview cards, and slides the carousel up.
 *
 * @param {object[]} locations - Array of full location objects
 */
export function showCarousel(locations) {
    if (!locations.length || window.innerWidth >= DESKTOP_WIDTH) return;

    // If already visible, clean up first to avoid listener/timeout accumulation
    if (carouselVisible) {
        hideCarousel();
    }
    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }

    carouselLocations = locations;
    carouselActiveIndex = 0;

    // 1. Hide sheet with choreography
    bus.emit('sheet:setstate', 'hidden');
    const host = document.getElementById('sheet-scroll-host');
    if (host) host.setAttribute('data-carousel-active', '');

    // 2. Render preview cards
    const track = document.querySelector('.carousel-track');
    if (!track) return;

    // Remove any prior scroll listener before re-adding
    track.removeEventListener('scroll', onCarouselScroll);

    track.innerHTML = locations.map(loc => renderPreviewCard(loc)).join('');
    track.scrollLeft = 0;

    // 3. Render dot indicators
    const dots = document.querySelector('.carousel-dots');
    if (dots) {
        dots.innerHTML = locations.map((_, i) =>
            `<span class="carousel-dot${i === 0 ? ' active' : ''}" aria-selected="${i === 0}"></span>`
        ).join('');
    }

    // 4. Show carousel (after delay for sheet to start sliding down)
    showTimeout = setTimeout(() => {
        showTimeout = null;
        const el = document.getElementById('map-carousel');
        if (el) {
            el.classList.add('visible');
            carouselVisible = true;
        }
    }, CAROUSEL_SHOW_DELAY);

    // 5. Highlight first marker
    if (locations[0]) {
        highlightMarker(locations[0].id);
    }

    // 6. Fit map to show all carousel markers with bottom padding
    fitMapAboveCarousel(locations);

    // 7. Attach scroll listener for dot/marker sync
    track.addEventListener('scroll', onCarouselScroll, { passive: true });

    // 8. Card clicks — use event delegation on the track
    track.onclick = (e) => {
        const card = e.target.closest('.preview-card');
        if (!card) return;
        const locId = Number(card.dataset.locId);
        const loc = carouselLocations.find(l => l.id === locId);
        if (loc) {
            bus.emit('sheet:showlocation', loc);
            bus.emit('sheet:showdetail', loc);
        }
    };
}

/**
 * Hide the carousel and restore the sheet to peek state.
 */
export function hideCarousel() {
    if (!carouselVisible && !showTimeout) return;

    // Cancel pending show timeout (rapid double-tap guard)
    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }

    const el = document.getElementById('map-carousel');
    if (el) el.classList.remove('visible');
    carouselVisible = false;

    // Remove scroll listener
    const track = document.querySelector('.carousel-track');
    if (track) {
        track.removeEventListener('scroll', onCarouselScroll);
        track.onclick = null;
    }

    // Restore sheet after carousel starts sliding
    setTimeout(() => {
        const host = document.getElementById('sheet-scroll-host');
        if (host) host.removeAttribute('data-carousel-active');
        bus.emit('sheet:setstate', 'peek');
    }, CAROUSEL_DISMISS_SHEET_DELAY);

    // Clear marker highlight
    highlightMarker(null);
    carouselLocations = [];
}

/**
 * Check if carousel is currently visible.
 * @returns {boolean}
 */
export function isCarouselVisible() {
    return carouselVisible;
}

// --- Internal helpers ---

/**
 * Scroll handler — syncs dot indicators and marker highlighting.
 */
function onCarouselScroll(e) {
    const track = e.target;
    const cardStep = CARD_WIDTH + CARD_GAP;
    const index = Math.round(track.scrollLeft / cardStep);

    if (index !== carouselActiveIndex && index >= 0 && index < carouselLocations.length) {
        carouselActiveIndex = index;

        // Update dots
        document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
            dot.setAttribute('aria-selected', String(i === index));
        });

        // Highlight corresponding marker
        highlightMarker(carouselLocations[index].id);
    }
}

/**
 * Fit map bounds to show all carousel markers with bottom padding for the carousel.
 */
function fitMapAboveCarousel(locations) {
    if (!state.mapInstance || locations.length === 0) return;
    if (typeof maplibregl === 'undefined') return;

    const locs = locations.filter(l => l.lat && l.lng);
    if (locs.length === 0) return;

    if (locs.length === 1) {
        // Single location — just center it above the carousel
        state.mapInstance.easeTo({
            center: [locs[0].lng, locs[0].lat],
            offset: [0, -80], // shift up to account for carousel height
            duration: 400
        });
        return;
    }

    const bounds = new maplibregl.LngLatBounds();
    locs.forEach(l => bounds.extend([l.lng, l.lat]));

    // Extra bottom padding for the carousel (~250px)
    state.mapInstance.fitBounds(bounds, {
        padding: { top: 60, bottom: 280, left: 40, right: 40 },
        duration: 500,
        maxZoom: 16
    });
}
