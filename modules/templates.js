/**
 * templates.js — Centralized HTML rendering helpers for location cards.
 *
 * Single source of truth for photo rendering and compact card markup.
 * Full cards (cards.js) and detail sheets (sheet.js) are too specialized
 * to fully extract here, but they use getPhotoData() for consistency.
 */

import { state, CATEGORY_IMAGES, TYPE_PHOTO_COLORS, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import { computePeuterScore } from './scoring.js';
import { isFavorite } from './favorites.js';
import { getKenmerkenTags, getDistanceLabel, getUnifiedOneLiner } from './card-data.js';

// === Shared photo data ===

/**
 * Returns all photo-related data for a location.
 * Used by cards.js, sheet-engine.js, layout.js, sheet.js.
 */
export function getPhotoData(loc) {
    const photoSrc = loc.photo_url || loc.owner_photo_url;
    const categoryImg = CATEGORY_IMAGES[loc.type] || CATEGORY_IMAGES.play;
    const imgSrc = photoSrc || categoryImg;
    const photoColor = TYPE_PHOTO_COLORS[loc.type] || '#E8D5C4';
    const fallbackSrc = photoSrc ? categoryImg : '';
    return { photoSrc, categoryImg, imgSrc, photoColor, fallbackSrc, hasPhoto: !!photoSrc };
}

// === Card image (used by cards.js full card) ===

/**
 * Renders the photo container for a full location card.
 * Returns an HTML string.
 */
export function renderCardPhoto(loc) {
    const { photoSrc, categoryImg, imgSrc, photoColor, fallbackSrc } = getPhotoData(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;

    return `<div class="loc-img photo-container${!photoSrc ? ' loc-img--category' : ''}" style="--photo-color: ${photoColor}">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async" width="400" height="267"
                     onload="this.classList.add('loaded')"
                     onerror="if(this.dataset.retried){this.closest('.loc-img').classList.add('loc-img--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(fallbackSrc || categoryImg)}'}">
                <span class="loc-type-badge">${escapeHtml(typeLabel)}</span>
              </div>`;
}

// === Compact card (used by sheet-engine.js + layout.js) ===

/**
 * Renders a compact card HTML string for use in sheet list and mobile list.
 *
 * @param {object} loc - Location object
 * @param {object} [opts] - Options
 * @param {object} [opts.travelTimes] - Travel time map { id: { duration } }
 * @param {boolean} [opts.showTags] - Show tag chips (default: true)
 * @param {boolean} [opts.showVisited] - Show visited badge (default: true)
 * @param {string} [opts.extraStyle] - Extra inline style on root element
 * @param {string} [opts.imgStyle] - Extra inline style on img element
 * @returns {string} HTML string
 */
export function renderCompactCard(loc, opts = {}) {
    const { travelTimes, extraStyle, imgStyle } = opts;
    const { imgSrc, categoryImg, photoColor } = getPhotoData(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const isFav = isFavorite(loc.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : '';

    // Distance/region — unified via card-data
    const travelInfo = travelTimes ? travelTimes[loc.id] : null;
    const distance = getDistanceLabel(loc, travelInfo);

    const styleAttr = extraStyle ? ` style="${extraStyle}"` : '';
    const imgStyleAttr = imgStyle ? ` style="${imgStyle};background:${photoColor}"` : ` style="background:${photoColor}"`;

    // Score badge with tier classes
    const ps = computePeuterScore(loc);
    const scoreClass = ps >= 8 ? ' score-high' : ps >= 7 ? ' score-mid' : '';
    const scoreBadge = ps ? `<span class="compact-card-score${scoreClass}">\u2605 ${ps}</span>` : '';

    // Facility + weather tags — unified via card-data kenmerken
    const kenmerkenTags = getKenmerkenTags(loc, 3);
    const facilityHtml = kenmerkenTags.length
        ? kenmerkenTags.map(k => `<span class="compact-card-facilities" title="${escapeHtml(k.label)}">${k.icon}</span>`).join('')
        : '';

    // Region in meta line (shown when distance is travel time, so region isn't already shown there)
    const regionHtml = loc.region && travelInfo
        ? `<span class="compact-card-region-sep">\u00b7</span>${escapeHtml(loc.region)}`
        : '';

    // Distance pill with pin icon SVG
    const pinSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    const distanceHtml = distance ? `<span class="compact-card-distance">${pinSvg}${escapeHtml(String(distance))}</span>` : '';

    // Opening status line (only if data is available)
    const statusHtml = loc.always_open
        ? '<div class="compact-card-status"><span class="status-open">Altijd open</span></div>'
        : (loc.opening_hours
            ? `<div class="compact-card-status"><span class="status-hours">${escapeHtml(loc.opening_hours)}</span></div>`
            : '');

    return `<div class="compact-card" role="listitem"${styleAttr} data-loc-id="${loc.id}">
            <img class="compact-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async" width="72" height="72"${imgStyleAttr}
                 onerror="if(!this.dataset.retried){this.dataset.retried='1';this.classList.remove('loaded');this.onload=function(){this.classList.add('loaded')};this.src='${escapeHtml(categoryImg)}'}">
            <div class="compact-card-body">
                <div class="compact-card-header">
                    <span class="compact-card-name">${escapeHtml(loc.name)}</span>
                    ${distanceHtml}
                </div>
                <div class="compact-card-meta">${escapeHtml(typeLabel)}${regionHtml}${facilityHtml}</div>
                ${statusHtml}
            </div>
            ${scoreBadge}
            <button class="compact-card-fav" onclick="event.stopPropagation();toggleFavorite(${loc.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan'}">
                <svg viewBox="0 0 24 24" style="${favStyle}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>`;
}

// === Sheet preview card (used by sheet-engine.js showLocationInSheet) ===

/**
 * Renders the preview card shown in the sheet when tapping a map marker.
 *
 * @param {object} loc - Location object
 * @returns {string} HTML string
 */
export function renderSheetPreview(loc) {
    const { imgSrc, categoryImg, photoColor } = getPhotoData(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;

    // Distance — unified via card-data (picks up GPS travel time when available)
    const travelInfo = state.lastTravelTimes ? state.lastTravelTimes[loc.id] : null;
    const distance = getDistanceLabel(loc, travelInfo);

    const isFav = isFavorite(loc.id);
    const favClass = isFav ? ' active' : '';

    // Practical reasons — unified via card-data kenmerken tags (max 3)
    const kenmerkenTags = getKenmerkenTags(loc, 3);
    const reasonsHtml = kenmerkenTags.length
        ? `<div class="sheet-preview-reasons-section">
            <span class="sheet-preview-reasons-label">Waarom nu handig</span>
            <div class="sheet-preview-reasons">${kenmerkenTags.map(r => `<span class="preview-reason">${escapeHtml(r.label)}</span>`).join('')}</div>
           </div>`
        : '';

    return `
        <div class="sheet-preview-card sheet-preview-card--dominant">
            <div class="sheet-preview-hero" style="--photo-color: ${photoColor}">
                <img class="sheet-preview-img sheet-preview-img--wide" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async" width="400" height="175"
                     onerror="if(!this.dataset.retried){this.dataset.retried='1';this.classList.remove('loaded');this.onload=function(){this.classList.add('loaded')};this.src='${escapeHtml(categoryImg)}'}">
                <span class="sheet-preview-type-badge">${escapeHtml(typeLabel)}</span>
            </div>
            <div class="sheet-preview-body">
                <div class="sheet-preview-header">
                    <div>
                        <div class="sheet-preview-name">${escapeHtml(loc.name)}</div>
                        <div class="sheet-preview-meta">${escapeHtml(typeLabel)}${distance ? ' \u00b7 ' + escapeHtml(String(distance)) : ''}</div>
                    </div>
                    <button class="sheet-preview-fav${favClass}" id="sheet-preview-fav" onclick="event.stopPropagation();toggleFavorite(${loc.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Bewaar'}">
                        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                </div>
                ${reasonsHtml}
            </div>
        </div>
        <div class="sheet-preview-actions">
            <button class="sheet-preview-btn sheet-preview-btn-primary" id="sheet-preview-meer">Details</button>
            ${loc.lat && loc.lng ? `<button class="sheet-preview-btn sheet-preview-btn-secondary" id="sheet-preview-route"
                onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat + ',' + loc.lng)}','_blank')">Route</button>` : ''}
        </div>`;
}

// === Sheet scan card (used by sheet-engine.js mobile list) ===

/**
 * Renders a scan-card-style card as an HTML string for the mobile sheet list.
 * Same visual structure as the desktop scan cards in cards.js, but returns
 * an HTML string (not a DOM element) and is adapted for the sheet context.
 *
 * @param {object} loc - Location object
 * @param {object} [opts] - Options
 * @param {object} [opts.travelTimes] - Travel time map { id: { duration } }
 * @returns {string} HTML string
 */
export function renderSheetScanCard(loc, opts = {}) {
    const { travelTimes } = opts;
    const { imgSrc, categoryImg, photoColor, photoSrc } = getPhotoData(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const isFav = isFavorite(loc.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : '';

    // Distance — unified via card-data
    const travelInfo = travelTimes ? travelTimes[loc.id] : null;
    const distance = getDistanceLabel(loc, travelInfo);

    // One-liner — unified 3-step chain via card-data
    const oneLiner = getUnifiedOneLiner(loc, travelInfo);

    // Kenmerken tags — unified via card-data (max 3, identical to desktop scan card)
    const kenmerkenTags = getKenmerkenTags(loc, 3);

    return `<article class="scan-card sheet-scan-card" data-loc-id="${loc.id}" role="listitem">
        <div class="scan-photo${!photoSrc ? ' scan-photo--category' : ''}" style="--photo-color: ${photoColor}">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async" width="400" height="160"
                 onload="this.classList.add('loaded')"
                 onerror="if(this.dataset.retried){this.closest('.scan-photo').classList.add('scan-photo--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(categoryImg)}'}">
            <span class="scan-type-badge">${escapeHtml(typeLabel)}</span>
            <button class="card-fav scan-fav" onclick="event.stopPropagation();toggleFavorite(${loc.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}">
                <svg viewBox="0 0 24 24" style="${favStyle}" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>
        <div class="scan-body">
            <div class="scan-header">
                <h2 class="scan-name">${escapeHtml(loc.name)}</h2>
                ${distance ? `<span class="scan-distance">${escapeHtml(String(distance))}</span>` : ''}
            </div>
            <div class="scan-meta">${escapeHtml(typeLabel)}${distance ? '' : (loc.region ? ' \u00b7 ' + escapeHtml(loc.region) : '')}</div>
            ${kenmerkenTags.length ? `<div class="scan-kenmerken">${kenmerkenTags.map(k => `<span class="scan-kenmerk">${escapeHtml(k.label)}</span>`).join('')}</div>` : ''}
            ${oneLiner ? `<p class="scan-oneliner">${escapeHtml(oneLiner)}</p>` : ''}
        </div>
    </article>`;
}
