import { state, DESKTOP_WIDTH, TYPE_LABELS, PROMO_ITEMS, ADSENSE_PUB_ID, ADSENSE_SLOT_ID, ADSENSE_EVERY_N, BATCH_SIZE } from './state.js';
import { escapeHtml, buildDetailUrl } from './utils.js';
import { isFavorite } from './favorites.js';
import { getCardDecisionSentence } from './scoring.js';
import { getPhotoData } from './templates.js';
import bus from './bus.js';

let batchLocations = [];
let batchTravelTimes = {};
let batchPromoIndex = 0;
let batchRenderedCount = 0;
let batchSentinelObserver = null;

export function renderCards(locations, travelTimes = {}) {
    batchLocations = locations;
    batchTravelTimes = travelTimes;
    batchRenderedCount = 0;
    batchPromoIndex = 0;
    if (batchSentinelObserver) { batchSentinelObserver.disconnect(); batchSentinelObserver = null; }
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    container.setAttribute('role', 'feed');
    container.setAttribute('aria-label', 'Locaties');
    appendBatch();
}

function appendBatch() {
    const container = document.getElementById('results-container');
    const start = batchRenderedCount;
    const end = Math.min(start + BATCH_SIZE, batchLocations.length);
    const oldSentinel = document.getElementById('load-sentinel');
    if (oldSentinel) oldSentinel.remove();

    for (let index = start; index < end; index++) {
        const batchIdx = index - start;

        // Promo insertion every 6th card
        if ((index + 1) % 6 === 0) {
            const promo = PROMO_ITEMS[batchPromoIndex % PROMO_ITEMS.length];
            batchPromoIndex++;
            const adCard = document.createElement('article');
            adCard.className = 'loc-card promo-banner' + (promo.donation ? ' promo-donation' : '') + ' reveal';
            adCard.style.animationDelay = `${Math.min(batchIdx * 0.04, 0.2)}s`;
            adCard.innerHTML = `
                <div class="promo-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${promo.icon}</svg></div>
                <div class="promo-body">
                    <h2 class="card-name">${promo.title}</h2>
                    <p class="card-desc">${promo.text}</p>
                </div>
                <a href="${promo.url}" class="promo-cta">${promo.cta}</a>
            `;
            container.appendChild(adCard);
        }

        // AdSense insertion
        if (ADSENSE_PUB_ID && ADSENSE_SLOT_ID && index > 0 && index % ADSENSE_EVERY_N === 0) {
            const ael = document.createElement('article');
            ael.className = 'loc-card adsense-card';
            ael.innerHTML = `<span class="ad-label">Advertentie</span><ins class="adsbygoogle" style="display:block" data-ad-format="fluid" data-ad-layout-key="-6t+ed+2i-1n-4w" data-ad-client="${ADSENSE_PUB_ID}" data-ad-slot="${ADSENSE_SLOT_ID}"></ins>`;
            container.appendChild(ael);
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }

        const item = batchLocations[index];
        const travelInfo = batchTravelTimes[item.id];
        const card = renderScanCard(item, travelInfo, batchIdx);
        container.appendChild(card);
    }

    batchRenderedCount = end;
    if (batchRenderedCount < batchLocations.length) {
        const sentinel = document.createElement('div');
        sentinel.id = 'load-sentinel';
        sentinel.style.cssText = 'height: 1px; margin: 0;';
        container.appendChild(sentinel);
        batchSentinelObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                batchSentinelObserver.disconnect();
                batchSentinelObserver = null;
                appendBatch();
            }
        }, { rootMargin: '0px 0px 150px 0px' });
        batchSentinelObserver.observe(sentinel);
    }
}

/**
 * Renders a scan card with 5 elements:
 * 1. Photo (full-width, 3:2, type badge overlay)
 * 2. Heart (save button, floating on photo)
 * 3. Name + distance (one row)
 * 4. One-liner (decision sentence, 1 line max)
 * 5. Type badge (on photo)
 */
function renderScanCard(item, travelInfo, batchIdx) {
    const { imgSrc, categoryImg, photoColor, photoSrc } = getPhotoData(item);
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const isFav = isFavorite(item.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : '';

    // Distance
    let distance = '';
    if (state.userLocation && travelInfo) {
        distance = travelInfo.duration;
    } else if (item.region) {
        distance = item.region;
    }

    // One-liner: decision sentence or toddler highlight
    const oneLiner = getCardDecisionSentence(item, travelInfo) || item.toddler_highlight || '';

    const card = document.createElement('article');
    card.className = 'loc-card scan-card reveal';
    card.dataset.locId = item.id;
    card.setAttribute('aria-label', item.name);
    card.style.animationDelay = `${Math.min(batchIdx * 0.04, 0.2)}s`;

    // Desktop hover → map highlight
    if (window.innerWidth >= DESKTOP_WIDTH && item.lat && item.lng) {
        card.addEventListener('mouseenter', () => bus.emit('map:highlight', item.id));
        card.addEventListener('mouseleave', () => bus.emit('map:highlight', null));
    }

    // Click → detail view
    const detailUrl = buildDetailUrl(item);
    if (detailUrl) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-fav')) return;
            window.location.href = detailUrl;
        });
    }

    card.innerHTML = `
        <div class="scan-photo${!photoSrc ? ' scan-photo--category' : ''}" style="--photo-color: ${photoColor}">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" width="400" height="267"
                 onload="this.classList.add('loaded')"
                 onerror="if(this.dataset.retried){this.closest('.scan-photo').classList.add('scan-photo--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(categoryImg)}'}">
            <span class="scan-type-badge">${escapeHtml(typeLabel)}</span>
            <button class="card-fav scan-fav" onclick="toggleFavorite(${item.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}">
                <svg viewBox="0 0 24 24" style="${favStyle}" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>
        <div class="scan-body">
            <div class="scan-header">
                <h2 class="scan-name">${escapeHtml(item.name)}</h2>
                ${distance ? `<span class="scan-distance">${escapeHtml(String(distance))}</span>` : ''}
            </div>
            ${oneLiner ? `<p class="scan-oneliner">${escapeHtml(oneLiner)}</p>` : ''}
        </div>
    `;

    return card;
}

// Scroll card into view when map marker clicked (desktop)
function scrollToCard(locationId) {
    if (window.innerWidth < DESKTOP_WIDTH) return;
    const card = document.querySelector(`.scan-card[data-loc-id="${locationId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Bus listeners
bus.on('cards:render', renderCards);
bus.on('sheet:open', scrollToCard);
