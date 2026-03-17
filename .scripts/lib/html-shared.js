const fs = require('fs');
const { TIKKIE_URL, ASSET_VERSION, CRITICAL_EDITORIAL_GUIDE_CSS } = require('./config');
const { escapeHtml, parseDateSafe } = require('./helpers');
const { getBlogEntriesBySlug } = require('./seo-content');

function formatEditorialDate(value) {
  const d = parseDateSafe(value);
  if (!d) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function editorialMetaHTML(entry) {
  if (!entry) return '';
  const label = entry.editorial_label || 'PeuterPlannen redactie';
  const updated = formatEditorialDate(entry.updated_at);
  const bits = [`<span>${escapeHtml(label)}</span>`];
  if (updated) bits.push(`<span>Laatst bijgewerkt ${escapeHtml(updated)}</span>`);
  bits.push('<a href="/methode/">Hoe we selecteren</a>');
  return `<div class="editorial-meta">${bits.join('')}</div>`;
}

function editorialBodyHTML(entry, extraClass = '') {
  if (!entry?.bodyHtml) return '';
  const className = ['editorial-body', extraClass].filter(Boolean).join(' ');
  return `<div class="${className}">${entry.bodyHtml}</div>`;
}

function relatedBlogLinksHTML(slugs = [], heading = 'Meer inspiratie') {
  const entries = getBlogEntriesBySlug(slugs);
  if (!entries.length) return '';
  return `<div class="related-blogs">
      <h3>${escapeHtml(heading)}</h3>
      <ul>${entries.map((entry) => `<li><a href="/blog/${entry.slug}/">${escapeHtml(entry.title)}</a></li>`).join('')}</ul>
    </div>`;
}

const NAV_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" class="nav-logo-svg" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#D4775A"/><path d="M20 6c-5.5 0-10 4.5-10 10 0 7 10 20 10 20s10-13 10-20c0-5.5-4.5-10-10-10z" fill="white"/><circle cx="20" cy="16" r="4" fill="#D4775A"/></svg>';

function navHTML(ctaText = 'Open App', ctaHref = '/app.html') {
  return `<a href="#main-content" class="skip-link">Naar hoofdinhoud</a>
<nav aria-label="Hoofdnavigatie" class="floating-nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      ${NAV_LOGO_SVG}
      <span class="logo-text"><span class="logo-top">Peuter</span><span class="logo-bottom">Plannen</span></span>
    </a>
    <div class="nav-links">
      <a href="/" class="nav-link">Home</a>
      <a href="/ontdekken/" class="nav-link">Ontdekken</a>
      <a href="/about.html" class="nav-link">Over</a>
      <a href="/blog/" class="nav-link">Inspiratie</a>
      <a href="/contact.html" class="nav-link">Contact</a>
      <a href="${ctaHref}" class="nav-cta">${ctaText}</a>
    </div>
    <button class="nav-burger" aria-label="Menu openen" aria-expanded="false" aria-controls="nav-mobile-menu">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>
  <div class="nav-mobile" id="nav-mobile-menu" aria-hidden="true">
    <a href="/" class="nav-mobile-link">Home</a>
    <a href="/ontdekken/" class="nav-mobile-link">Ontdekken</a>
    <a href="/about.html" class="nav-mobile-link">Over</a>
    <a href="/blog/" class="nav-mobile-link">Inspiratie</a>
    <a href="/contact.html" class="nav-mobile-link">Contact</a>
    <a href="${ctaHref}" class="nav-mobile-link nav-mobile-cta nav-cta">${ctaText}</a>
  </div>
</nav>`;
}

function footerHTML() {
  return `<footer>
  <nav aria-label="Footernavigatie">
  <p>&copy; 2026 PeuterPlannen &middot; <a href="/">Home</a> &middot; <a href="/ontdekken/">Ontdekken</a> &middot; <a href="/app.html">App</a> &middot; <a href="/blog/">Inspiratie</a> &middot; <a href="/methode/">Methode</a> &middot; <a href="/contact.html">Contact</a> &middot; <a href="/about.html">Over</a> &middot; <a href="/voor-bedrijven/">Voor bedrijven</a> &middot; <a href="${TIKKIE_URL}" target="_blank" rel="noopener">Steun ons</a> &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/disclaimer/">Disclaimer</a></p>
  </nav>
</footer>`;
}

function newsletterHTML() {
  return `<div class="newsletter-signup">
  <h3>Elke vrijdag: 3 uitjes die passen bij het weer</h3>
  <form action="https://buttondown.com/api/emails/embed-subscribe/peuterplannen"
        method="post" target="popupwindow"
        onsubmit="window.open('https://buttondown.com/peuterplannen','popupwindow')">
    <input type="email" name="email" placeholder="jouw@email.nl" required
      aria-label="E-mailadres voor nieuwsbrief">
    <button type="submit">Aanmelden</button>
  </form>
  <p style="font-size:13px;opacity:0.85;margin-top:12px;">Geen spam. Uitschrijven wanneer je wilt.</p>
</div>`;
}

function svgSpriteDefs() {
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none;position:absolute">
  <symbol id="icon-coffee" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" y1="2" x2="6" y2="4"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="14" y1="2" x2="14" y2="4"/>
  </symbol>
  <symbol id="icon-alcohol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 22h8"/>
    <path d="M12 11v11"/>
    <path d="m19 3-7 8-7-8Z"/>
  </symbol>
  <symbol id="icon-diaper" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 12h.01"/>
    <path d="M15 12h.01"/>
    <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/>
    <path d="M19.5 10c.3 0 .5.1.7.3.2.2.3.4.3.7 0 2.8-2 8-7.5 8S5.5 13.8 5.5 11c0-.3.1-.5.3-.7.2-.2.4-.3.7-.3"/>
    <path d="M6 10V6c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v4"/>
  </symbol>
</svg>`;
}

function badgeHTML(loc) {
  const badges = [];
  if (loc.coffee) badges.push(`<span class="badge-pill badge-coffee"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-coffee"/></svg>Koffie</span>`);
  if (loc.alcohol) badges.push(`<span class="badge-pill badge-alcohol"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-alcohol"/></svg>Alcohol</span>`);
  if (loc.diaper) badges.push(`<span class="badge-pill badge-diaper"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-diaper"/></svg>Luierruimte</span>`);
  return badges.length ? `<span class="badges">${badges.join('')}</span>` : '';
}

function revealScript() {
  return `<script src="/reveal.js"></script>`;
}

function supportHTML(variant = 'default', count = 0) {
  const displayCount = count > 0 ? count : 660;
  if (variant === 'category') {
    return `<section class="support-section">
  <div class="support-inner">
    <h3>Gratis voor jou, niet voor mij</h3>
    <p>Dit is een hobbyproject uit Utrecht — geen team, geen advertenties, wel ${displayCount}+ uitjes in Nederland. Als jij dit handig vindt, is een bijdrage welkom.</p>
    <div class="support-amounts">
      <span class="support-pill">€2</span>
      <span class="support-pill support-pill-mid">€5</span>
      <span class="support-pill">€10</span>
    </div>
    <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="btn-support">
      Steun PeuterPlannen
    </a>
  </div>
</section>`;
  }
  return `<section class="support-section">
  <div class="support-inner">
    <h3>Iets nuttigs gevonden?</h3>
    <p>PeuterPlannen is gratis — de serverkosten zijn dat niet. Als je hier iets aan gehad hebt, helpt een kleine bijdrage om het zo te houden voor anderen.</p>
    <p class="support-count">${displayCount}+ locaties beschikbaar in heel Nederland.</p>
    <div class="support-amounts">
      <span class="support-pill">€2</span>
      <span class="support-pill support-pill-mid">€5</span>
      <span class="support-pill">€10</span>
    </div>
    <p class="support-impact">De server kost ~€10 per maand. Elk beetje telt.</p>
    <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="btn-support">
      Stuur een bijdrage
    </a>
  </div>
</section>`;
}

function headCommon(extra = '') {
  const dsHref = `/design-system.css?v=${ASSET_VERSION}`;
  const styleHref = `/style.min.css?v=${ASSET_VERSION}`;
  const navCssHref = `/nav-floating.css?v=${ASSET_VERSION}`;
  const navJsHref = `/nav-floating.js?v=${ASSET_VERSION}`;
  return `  <!-- Google tag (gtag.js) — Consent Mode v2 -->
  <script src="/ga-init.js" defer></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-46RW178B97"></script>
  <script src="/consent.js" defer></script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4964283748507156" crossorigin="anonymous"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="view-transition" content="same-origin">
  <meta name="theme-color" content="#D4775A">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preload" href="/design-system.css" as="style">
  <link rel="preload" href="/style.min.css" as="style">
  <link rel="preload" href="/fonts/familjen-grotesk-500.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/fonts.css">
  <link rel="stylesheet" href="${dsHref}">
  <link rel="stylesheet" href="${styleHref}">
  <style>${CRITICAL_EDITORIAL_GUIDE_CSS}</style>
  <link rel="stylesheet" href="${navCssHref}">
  <script src="${navJsHref}" defer></script>
  <script src="/error-reporter.js" defer></script>
  <meta name="pinterest-rich-pin" content="true">
  <meta name="p:domain_verify" content="f99a54c30c1801d1bef6ab0dd15f83cf">${extra}`;
}

function rewriteAssetVersions(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const replacements = [
    [/\/design-system\.css(?:\?v=[^"]*)?/g, `/design-system.css?v=${ASSET_VERSION}`],
    [/\/style\.min\.css(?:\?v=[^"]*)?/g, `/style.min.css?v=${ASSET_VERSION}`],
    [/\/nav-floating\.css(?:\?v=[^"]*)?/g, `/nav-floating.css?v=${ASSET_VERSION}`],
    [/\/nav-floating\.js(?:\?v=[^"]*)?/g, `/nav-floating.js?v=${ASSET_VERSION}`],
    [/\/admin\/portal-shell\.css(?:\?v=[^"]*)?/g, `/admin/portal-shell.css?v=${ASSET_VERSION}`],
    [/\/partner\/portal-shell\.css(?:\?v=[^"]*)?/g, `/partner/portal-shell.css?v=${ASSET_VERSION}`],
    [/\/admin\/admin\.js(?:\?v=[^"]*)?/g, `/admin/admin.js?v=${ASSET_VERSION}`],
    [/\/partner\/partner\.js(?:\?v=[^"]*)?/g, `/partner/partner.js?v=${ASSET_VERSION}`],
  ];
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const next = html.replace(pattern, replacement);
    if (next !== html) {
      changed = true;
      html = next;
    }
  }
  if (changed) fs.writeFileSync(filePath, html);
}

// --- Affiliate helpers ---

const AFFILIATE_DISCLAIMER = '<p style="font-size: 11px; color: #999; margin-top: 4px;">* Affiliatelink — wij ontvangen een kleine commissie</p>';

function affiliateTicketHTML(loc, affiliate) {
  if (!affiliate.tiqets.tag) return '';
  if (!['museum', 'swim', 'play'].includes(loc.type)) return '';
  const url = loc.ticket_url || affiliate.tiqets.baseUrl;
  return `<div style="margin: 16px 0;">
  <a href="${url}" target="_blank" rel="noopener sponsored" style="border: 2px solid var(--primary); color: var(--primary); background: white; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">🎟️ Tickets kopen</a>
  ${AFFILIATE_DISCLAIMER}
</div>`;
}

const BOL_PRODUCTS = {
  play:    [{ name: 'Zonnebrand kind', q: 'zonnebrand+kind' }, { name: 'Drinkfles peuter', q: 'drinkfles+peuter' }, { name: 'Picknickkleed', q: 'picknickkleed' }],
  nature:  [{ name: 'Zonnebrand kind', q: 'zonnebrand+kind' }, { name: 'Drinkfles peuter', q: 'drinkfles+peuter' }, { name: 'Picknickkleed', q: 'picknickkleed' }],
  farm:    [{ name: 'Regenlaarsjes peuter', q: 'regenlaarsjes+peuter' }, { name: 'Handgel kinderen', q: 'handgel+kinderen' }, { name: 'Reservekleding peuter', q: 'reservekleding+peuter' }],
  swim:    [{ name: 'Zwemluier', q: 'zwemluier+baby' }, { name: 'Badpakje peuter', q: 'badpakje+peuter' }, { name: 'Handdoek kinderen', q: 'handdoek+kinderen' }],
  museum:  [{ name: 'Buggy compact', q: 'buggy+compact' }, { name: 'Snackdoosje peuter', q: 'snackdoosje+peuter' }, { name: 'Oordopjes kinderen', q: 'oordopjes+kinderen' }],
};

function affiliateProductsHTML(type, affiliate) {
  if (!affiliate.bol.tag) return '';
  const products = BOL_PRODUCTS[type];
  if (!products) return '';
  const baseUrl = affiliate.bol.baseUrl.replace('{tag}', affiliate.bol.tag);
  const items = products.map(p => {
    const url = `${baseUrl}${encodeURIComponent('https://www.bol.com/nl/nl/s/?searchtext=' + p.q)}`;
    return `<li><a href="${url}" target="_blank" rel="noopener sponsored">${p.name}</a></li>`;
  }).join('\n      ');
  return `<div style="background: #f8f7f5; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
    <strong>Wat meenemen?</strong>
    <ul style="margin: 8px 0 4px; padding-left: 20px; list-style: disc;">
      ${items}
    </ul>
    ${AFFILIATE_DISCLAIMER}
  </div>`;
}

function affiliateReservationHTML(loc, affiliate) {
  if (!affiliate.theFork.tag) return '';
  if (!['horeca', 'pancake'].includes(loc.type)) return '';
  const url = loc.ticket_url || affiliate.theFork.baseUrl;
  return `<div style="margin: 16px 0;">
  <a href="${url}" target="_blank" rel="noopener sponsored" style="border: 2px solid var(--primary); color: var(--primary); background: white; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">🍽️ Reserveer een tafel</a>
  ${AFFILIATE_DISCLAIMER}
</div>`;
}

function affiliateBookingHTML(regionName, affiliate) {
  if (!affiliate.booking.tag) return '';
  const url = `${affiliate.booking.baseUrl}searchresults.html?aid=${affiliate.booking.tag}&ss=${encodeURIComponent(regionName)}&nflt=hotelfacility%3D28`;
  return `<div style="background: #f0f7f6; border-radius: 12px; padding: 16px 24px; margin: 24px 0;">
  <strong>Weekendje weg in ${regionName}?</strong>
  <p style="margin: 4px 0 12px; font-size: 14px; color: #555;">Bekijk gezinsvriendelijke hotels in de buurt.</p>
  <a href="${url}" target="_blank" rel="noopener sponsored" style="color: var(--primary); font-weight: 600; text-decoration: none;">Hotels bekijken →</a>
  ${AFFILIATE_DISCLAIMER}
</div>`;
}

module.exports = {
  formatEditorialDate,
  editorialMetaHTML,
  editorialBodyHTML,
  relatedBlogLinksHTML,
  NAV_LOGO_SVG,
  navHTML,
  footerHTML,
  newsletterHTML,
  svgSpriteDefs,
  badgeHTML,
  revealScript,
  supportHTML,
  headCommon,
  rewriteAssetVersions,
  affiliateTicketHTML,
  affiliateProductsHTML,
  affiliateReservationHTML,
  affiliateBookingHTML,
};
