const fs = require('fs');
const path = require('path');
const { ROOT, PARTNER_TIERS, analyticsHTML, ASSET_VERSION } = require('../config');
const { escapeHtml } = require('../helpers');
const { navHTML, footerHTML, headCommon, revealScript } = require('../html-shared');

function tierCardHTML(tier) {
  const highlightClass = tier.highlight ? ' vb-tier-highlight' : '';
  const badge = tier.badge ? `<span class="vb-tier-badge">${escapeHtml(tier.badge)}</span>` : '';
  const features = tier.features.map((f) => `<li><svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>${escapeHtml(f)}</li>`).join('');
  return `<div class="vb-tier${highlightClass}">
      ${badge}
      <h3 class="vb-tier-name">${escapeHtml(tier.name)}</h3>
      <div class="vb-tier-price">${escapeHtml(tier.price)}<span class="vb-tier-period">${escapeHtml(tier.period)}</span></div>
      <ul class="vb-tier-features">${features}</ul>
      <a href="/partner/" class="vb-tier-cta${tier.highlight ? ' vb-tier-cta-primary' : ''}">${escapeHtml(tier.cta)}</a>
    </div>`;
}

function faqItemHTML(q, a) {
  return `<details class="vb-faq-item">
      <summary>${escapeHtml(q)}</summary>
      <p>${escapeHtml(a)}</p>
    </details>`;
}

function generatePartnerLanding(data) {
  const total = data.total || data.locations.length;
  const regionCount = data.regions.length;

  const faqs = [
    ['Hoe kan ik mijn locatie claimen?', 'Maak een gratis account aan in het partnerportaal. Zoek je locatie op en dien een claim in. Na verificatie krijg je volledige toegang tot je profiel.'],
    ['Wat kost het om op PeuterPlannen te staan?', 'Staan op PeuterPlannen is gratis. Je kunt je profiel claimen en beheren zonder kosten. Voor extra zichtbaarheid bieden we Featured-abonnementen aan.'],
    ['Wat houdt het Geverifieerd-badge in?', 'Het Geverifieerd-badge laat ouders zien dat jouw locatie door de eigenaar wordt beheerd en dat de informatie actueel is. Dit vergroot het vertrouwen.'],
    ['Kan ik mijn abonnement opzeggen?', 'Ja, het maandelijkse Featured-abonnement is per maand opzegbaar. Bij het jaarabonnement loop je het jaar uit.'],
    ['Hoeveel ouders gebruiken PeuterPlannen?', 'PeuterPlannen groeit gestaag. We hebben ' + total + '+ locaties in ' + regionCount + ' regio\u2019s door heel Nederland. Ouders vinden ons via Google en mond-tot-mond.'],
    ['Kan ik mijn openingstijden en beschrijving aanpassen?', 'Ja, zodra je je locatie hebt geclaimd kun je je beschrijving, highlights, openingstijden, foto en faciliteiten aanpassen via het partnerportaal.'],
  ];


  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>Voor bedrijven \u2014 PeuterPlannen</title>
  <meta name="description" content="Beheer je locatie op PeuterPlannen. Claim je profiel, update je informatie en bereik meer gezinnen met kinderen in jouw regio.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/voor-bedrijven/">
  <meta property="og:title" content="Voor bedrijven \u2014 PeuterPlannen">
  <meta property="og:description" content="Beheer je locatie op PeuterPlannen. Claim je profiel, update je informatie en bereik meer gezinnen met kinderen in jouw regio.">
  <meta property="og:url" content="https://peuterplannen.nl/voor-bedrijven/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/images/og/default.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Voor bedrijven — PeuterPlannen">
  <script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(([q, a]) => ({
    "@type": "Question",
    "name": q,
    "acceptedAnswer": { "@type": "Answer", "text": a }
  }))
}, null, 2)}
  </script>
</head>
<body>
${navHTML('Partnerportaal', '/partner/')}

<section class="vb-hero">
  <h1>Sta je op PeuterPlannen? Beheer je profiel en bereik meer gezinnen.</h1>
  <p>PeuterPlannen helpt ouders de beste uitjes en locaties voor jonge kinderen te vinden. Zorg dat jouw locatie er op z\u2019n best uitziet.</p>
  <a href="/partner/" class="vb-hero-cta">Ga naar het partnerportaal</a>
  <br><span class="vb-hero-stat"><strong>${total}+</strong> locaties in <strong>${regionCount}</strong> regio\u2019s vertrouwen op PeuterPlannen</span>
</section>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; Voor bedrijven
</nav>

<main id="main-content">

<section class="vb-values pp-stagger">
  <div class="vb-value">
    <div class="vb-value-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
    </div>
    <h3>Geverifieerd badge</h3>
    <p>Laat ouders zien dat jouw locatie door de eigenaar wordt beheerd. Actuele informatie vergroot het vertrouwen.</p>
  </div>
  <div class="vb-value">
    <div class="vb-value-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
    <h3>Uitgelichte listing</h3>
    <p>Featured locaties staan bovenaan in zoekresultaten en worden uitgelicht in hun regio. Meer zichtbaarheid, meer bezoekers.</p>
  </div>
  <div class="vb-value">
    <div class="vb-value-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
    </div>
    <h3>Profielbeheer</h3>
    <p>Pas je beschrijving, foto, openingstijden en faciliteiten aan. Houd je profiel actueel vanuit \xe9\xe9n plek.</p>
  </div>
</section>

<section class="vb-section">
  <h2 class="vb-section-title">Kies het plan dat bij je past</h2>
  <p class="vb-section-sub">Van gratis profielbeheer tot maximale zichtbaarheid \u2014 je betaalt alleen voor wat je nodig hebt.</p>
  <div class="vb-tiers pp-stagger">
    ${PARTNER_TIERS.map(tierCardHTML).join('\n    ')}
  </div>
</section>

<div class="vb-social">
  <p><strong>${total}+</strong> locaties in heel Nederland staan al op PeuterPlannen</p>
</div>

<section class="vb-section">
  <h2 class="vb-section-title">Veelgestelde vragen</h2>
  <p class="vb-section-sub">Alles wat je moet weten over je locatie op PeuterPlannen.</p>
  <div class="vb-faq">
    ${faqs.map(([q, a]) => faqItemHTML(q, a)).join('\n    ')}
  </div>
</section>

<section class="vb-bottom-cta">
  <h2>Klaar om je locatie te beheren?</h2>
  <p>Claim je profiel in 2 minuten. Geen creditcard nodig.</p>
  <a href="/partner/" class="vb-hero-cta">Open het partnerportaal</a>
</section>

</main>
${footerHTML()}
${revealScript()}
${analyticsHTML()}
</body>
</html>`;

  const targetDir = path.join(ROOT, 'voor-bedrijven');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html);
  console.log('  voor-bedrijven/index.html');
  return { slug: 'voor-bedrijven', path: '/voor-bedrijven/' };
}

module.exports = { generatePartnerLanding };
