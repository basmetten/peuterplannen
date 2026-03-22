/**
 * templates.js — Centralized HTML rendering helpers for location cards.
 *
 * Single source of truth for photo rendering and compact card markup.
 * Full cards (cards.js) and detail sheets (sheet.js) are too specialized
 * to fully extract here, but they use getPhotoData() for consistency.
 */

import { CATEGORY_IMAGES, TYPE_PHOTO_COLORS, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import { computePeuterScore } from './scoring.js';
import { getTopTags } from './tags.js';
import { isFavorite } from './favorites.js';

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

    // Distance/region
    const travelInfo = travelTimes ? travelTimes[loc.id] : null;
    const distance = travelInfo ? travelInfo.duration : (loc.region || '');

    const styleAttr = extraStyle ? ` style="${extraStyle}"` : '';
    const imgStyleAttr = imgStyle ? ` style="${imgStyle};background:${photoColor}"` : ` style="background:${photoColor}"`;

    return `<div class="compact-card" role="listitem"${styleAttr} data-id="${loc.id}">
            <img class="compact-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async"${imgStyleAttr}
                 onerror="if(!this.dataset.retried){this.dataset.retried='1';this.classList.remove('loaded');this.onload=function(){this.classList.add('loaded')};this.src='${escapeHtml(categoryImg)}'}">
            <div class="compact-card-body">
                <div class="compact-card-header">
                    <span class="compact-card-name">${escapeHtml(loc.name)}</span>
                    ${distance ? `<span class="compact-card-distance">${escapeHtml(String(distance))}</span>` : ''}
                </div>
                <div class="compact-card-meta">${escapeHtml(typeLabel)}</div>
            </div>
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
    const ps = computePeuterScore(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const tags = getTopTags(loc).slice(0, 2);
    const distance = loc.region || '';

    return `
        <div class="sheet-preview-card">
            <img class="sheet-preview-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async" style="background:${photoColor}"
                 onerror="if(!this.dataset.retried){this.dataset.retried='1';this.classList.remove('loaded');this.onload=function(){this.classList.add('loaded')};this.src='${escapeHtml(categoryImg)}'}">
            <div class="sheet-preview-body">
                <div class="sheet-preview-name">${escapeHtml(loc.name)}</div>
                <div class="sheet-preview-meta">${escapeHtml(typeLabel)}${distance ? ' \u00b7 ' + escapeHtml(String(distance)) : ''}</div>
                ${tags.length ? `<div class="sheet-preview-tags">${tags.map(t => `<span class="card-tag">${t.icon} ${t.label}</span>`).join('')}</div>` : ''}
            </div>
            <div class="sheet-preview-score">${ps}\u2605</div>
        </div>
        <div class="sheet-preview-actions">
            <button class="sheet-preview-btn sheet-preview-btn-primary" id="sheet-preview-meer">Meer info</button>
            <button class="sheet-preview-btn sheet-preview-btn-secondary" id="sheet-preview-route"
                onclick="window.open('https://maps.apple.com/?daddr=${loc.lat},${loc.lng}','_blank')">Route</button>
        </div>`;
}
