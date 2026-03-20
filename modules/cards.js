import { state, DESKTOP_WIDTH, TYPE_LABELS, WEATHER_LABELS, WEATHER_ICONS, CATEGORY_IMAGES, TYPE_PHOTO_COLORS, PROMO_ITEMS, ADSENSE_PUB_ID, ADSENSE_SLOT_ID, ADSENSE_EVERY_N, BATCH_SIZE } from './state.js';
import { escapeHtml, safeUrl, getCardSupportingCopy, isNearDuplicateCopy, buildDetailUrl, buildMapsUrl } from './utils.js';
import { computePeuterScore, computePeuterScoreV2, getTopStrengths, getCardDecisionSentence, getCompactTrustChip, getCardQuickFacts } from './scoring.js';
import { isFavorite } from './favorites.js';
import { getTopTags, getWeatherBadge } from './tags.js';
import { isVisited } from './visited.js';
import bus from './bus.js';

let batchLocations = [];
let batchTravelTimes = {};
let batchPromoIndex = 0;
let batchRenderedCount = 0;
let batchSentinelObserver = null;
let batchPopularIds = new Set();

function getPopularIds(locations) {
    const byRegion = {};
    locations.forEach(loc => {
        const r = loc.region || 'onbekend';
        if (!byRegion[r]) byRegion[r] = [];
        byRegion[r].push(loc);
    });
    const popular = new Set();
    Object.values(byRegion).forEach(group => {
        const sorted = [...group].sort((a, b) => computePeuterScore(b) - computePeuterScore(a));
        const top10pct = Math.max(1, Math.ceil(sorted.length * 0.1));
        sorted.slice(0, top10pct).forEach(loc => popular.add(loc.id));
    });
    return popular;
}

export function renderCards(locations, travelTimes = {}) {
    batchLocations = locations;
    batchTravelTimes = travelTimes;
    batchRenderedCount = 0;
    batchPromoIndex = 0;
    batchPopularIds = getPopularIds(locations);
    if (batchSentinelObserver) { batchSentinelObserver.disconnect(); batchSentinelObserver = null; }
    const container = document.getElementById('results-container');
    container.innerHTML = '';
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
        if (ADSENSE_PUB_ID && ADSENSE_SLOT_ID && index > 0 && index % ADSENSE_EVERY_N === 0) {
            const ael = document.createElement('article');
            ael.className = 'loc-card adsense-card';
            ael.innerHTML = `<span class="ad-label">Advertentie</span><ins class="adsbygoogle" style="display:block" data-ad-format="fluid" data-ad-layout-key="-6t+ed+2i-1n-4w" data-ad-client="${ADSENSE_PUB_ID}" data-ad-slot="${ADSENSE_SLOT_ID}"></ins>`;
            container.appendChild(ael);
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }
        const item = batchLocations[index];
        const travelInfo = batchTravelTimes[item.id];
        const isFav = isFavorite(item.id);
        const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : 'fill: none; stroke: #9B8688;';
        const typeLabel = TYPE_LABELS[item.type] || item.type;
        const weatherLabel = WEATHER_LABELS[item.weather] || '';
        const weatherIcon = WEATHER_ICONS[item.weather] || '';

        let distancePill = '';
        if (state.userLocation && travelInfo) {
            distancePill = `<span class="pill pill-distance">${travelInfo.duration}</span>`;
        } else if (item.region) {
            distancePill = `<span class="pill pill-region">${item.region}</span>`;
        }

        const ps = computePeuterScore(item);
        const psBase = ps - (item.is_featured && item.featured_until && new Date(item.featured_until) > new Date() ? 5 : 0);
        const psColor = psBase >= 7 ? '#4A7A4A' : psBase >= 4 ? '#C07830' : '#9E9E9E';
        const psBadge = `<span class="peuterscore" style="background:${psColor}18;color:${psColor};border:1px solid ${psColor}30" data-tooltip="Peuterscore: ${psBase}/10">${psBase}★</span>`;
        const weather = state.isRaining ? 'rain' : state.isSunny ? 'sun' : null;
        const v2Result = computePeuterScoreV2(item, { weather, dayOfWeek: new Date().getDay() });
        const strengths = getTopStrengths(v2Result, { weather });
        const strengthHtml = strengths.slice(0, 2).map(s =>
            `<span class="card-strength">${escapeHtml(s.label)}</span>`
        ).join('');
        const isFeaturedNow = item.is_featured && item.featured_until && new Date(item.featured_until) > new Date();
        const featuredBadge = isFeaturedNow ? `<span class="badge-featured">★ Aanbevolen</span>` : '';
        const verifiedBadge = item.owner_verified ? `<span class="badge-verified" data-tooltip="Geverifieerd door eigenaar">✓</span>` : '';
        const visitedBadge = isVisited(item.id) ? `<span class="card-badge-visited">Bezocht</span>` : '';
        const popularBadge = batchPopularIds.has(item.id) ? `<span class="card-badge-popular">Populair in ${escapeHtml(item.region || 'jouw regio')}</span>` : '';

        const ageInfo = (item.min_age !== null && item.max_age !== null) ? `<span class="age-range">${item.min_age}-${item.max_age} jaar</span>` : '';
        const supportingCopy = getCardSupportingCopy(item);

        const facilities = [];
        if (item.coffee) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>Koffie</span>');
        if (item.diaper) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z"/><path d="M6 9.01V9"/></svg>Verschonen</span>');
        if (item.alcohol) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 3h10v9a5 5 0 0 1-10 0V3z"/></svg>Alcohol</span>');
        const decisionSentence = getCardDecisionSentence(item, travelInfo);
        const trustChip = getCompactTrustChip(item);
        const quickFacts = getCardQuickFacts(item, travelInfo);
        const tags = getTopTags(item);
        const weatherBadge = getWeatherBadge(item);
        const supportingIsDuplicate = supportingCopy && decisionSentence && isNearDuplicateCopy(supportingCopy, decisionSentence);

        const photoSrc = item.photo_url || item.owner_photo_url;
        const categoryImg = CATEGORY_IMAGES[item.type] || CATEGORY_IMAGES.play;
        const imgSrc = photoSrc || categoryImg;
        const photoColor = TYPE_PHOTO_COLORS[item.type] || '#E8D5C4';
        const fallbackSrc = photoSrc ? categoryImg : '';
        const cardImgHTML = `<div class="loc-img photo-container${!photoSrc ? ' loc-img--category' : ''}" style="--photo-color: ${photoColor}">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" width="400" height="267"
                     onload="this.classList.add('loaded')"
                     onerror="if(this.dataset.retried){this.closest('.loc-img').classList.add('loc-img--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(fallbackSrc || categoryImg)}'}">
                <span class="loc-type-badge">${escapeHtml(typeLabel)}</span>
              </div>`;

        const card = document.createElement('article');
        card.className = 'loc-card reveal';
        card.style.animationDelay = `${Math.min(batchIdx * 0.04, 0.2)}s`;
        if (window.innerWidth >= DESKTOP_WIDTH && item.lat && item.lng) {
            card.addEventListener('mouseenter', () => bus.emit('map:highlight', item.id));
            card.addEventListener('mouseleave', () => bus.emit('map:highlight', null));
        }
        card.innerHTML = `
            ${cardImgHTML}
            <div class="card-top">
                <div class="card-pills">
                    ${featuredBadge}
                    <span class="pill pill-type">${typeLabel}</span>
                    ${weatherLabel ? `<span class="pill pill-weather">${weatherIcon}${weatherLabel}</span>` : ''}
                    ${distancePill}
                    ${psBadge}
                    ${weatherBadge ? `<span class="pill pill-weather-badge ${weatherBadge.className}">${weatherBadge.label}</span>` : ''}
                </div>
                <button class="card-fav" onclick="toggleFavorite(${item.id}, this)" data-tooltip="${isFav ? 'Verwijder favoriet' : 'Opslaan'}" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}">
                    <svg viewBox="0 0 24 24" style="${favStyle}" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            </div>
            ${ageInfo}
            <h2 class="card-name">${escapeHtml(item.name)}${verifiedBadge}</h2>
            ${tags.length ? `<div class="card-tags">${tags.map(t => `<span class="card-tag">${t.icon} ${t.label}</span>`).join('')}</div>` : ''}
            ${(visitedBadge || popularBadge) ? `<div class="card-tags">${popularBadge}${visitedBadge}</div>` : ''}
            ${strengths.length ? `<div class="card-strengths">${strengthHtml}</div>` : ''}
            ${supportingCopy && !supportingIsDuplicate ? `<p class="card-supporting">${escapeHtml(supportingCopy)}</p>` : ''}
            ${(trustChip || quickFacts.length) ? `<div class="card-trust">
                ${trustChip ? `<span class="trust-chip ${trustChip.tone === 'positive' ? 'is-positive' : 'is-neutral'}">${escapeHtml(trustChip.label)}</span>` : ''}
                ${quickFacts.map((fact) => `<span class="quickfact-chip">${escapeHtml(fact)}</span>`).join('')}
            </div>` : ''}
            <div class="card-decision-row">
                <span class="card-decision-kicker">Beste match nu</span>
                <p class="card-decision-copy">${escapeHtml(decisionSentence)}</p>
            </div>
            ${facilities.length ? `<div class="card-facilities">${facilities.join('')}</div>` : ''}
            <div class="card-actions">
                ${buildDetailUrl(item) ? `<a href="${buildDetailUrl(item)}" class="btn btn-detail">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    Meer info
                </a>` : ''}
                <a href="${buildMapsUrl(item)}" target="_blank" rel="noopener" class="btn btn-maps">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Route
                </a>
                ${safeUrl(item.website) ? `<a href="${safeUrl(item.website)}" target="_blank" rel="noopener" class="btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Website</a>` : ''}
                <button class="btn btn-share" data-tooltip="Delen" aria-label="Deel ${escapeHtml(item.name)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
        const shareButton = card.querySelector('.btn-share');
        if (shareButton) {
            shareButton.addEventListener('click', () => bus.emit('location:share', item));
        }
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

// Bus listeners
bus.on('cards:render', renderCards);
