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

  const css = `
    .vb-hero{padding:100px 24px 72px;text-align:center;background:linear-gradient(180deg,var(--pp-bg-warm) 0%,var(--pp-bg) 100%)}
    .vb-hero h1{font-family:var(--pp-font-heading);font-size:clamp(28px,5.5vw,48px);color:var(--pp-text);line-height:1.08;letter-spacing:-.03em;margin:0 auto 18px;max-width:720px}
    .vb-hero p{font-size:clamp(16px,2.5vw,20px);color:var(--pp-text-secondary);max-width:560px;margin:0 auto 32px;line-height:1.6}
    .vb-hero-cta{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:var(--pp-primary);color:#fff;border-radius:var(--pp-radius-xs);font-family:var(--pp-font-ui);font-size:16px;font-weight:600;text-decoration:none;transition:background var(--pp-transition),box-shadow var(--pp-transition)}
    .vb-hero-cta:hover{background:var(--pp-primary-dark);box-shadow:0 8px 24px rgba(212,119,90,.3)}
    .vb-hero-stat{display:inline-block;margin-top:24px;font-size:14px;color:var(--pp-text-muted);font-weight:500}
    .vb-hero-stat strong{color:var(--pp-primary);font-weight:700}

    .vb-section{max-width:var(--pp-max-width);margin:0 auto;padding:64px 24px}
    .vb-section-title{font-family:var(--pp-font-heading);font-size:clamp(24px,4vw,36px);color:var(--pp-text);text-align:center;margin:0 0 12px;letter-spacing:-.02em}
    .vb-section-sub{font-size:16px;color:var(--pp-text-secondary);text-align:center;max-width:520px;margin:0 auto 48px;line-height:1.6}

    .vb-values{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;max-width:var(--pp-max-width);margin:0 auto;padding:0 24px 64px}
    .vb-value{background:var(--pp-surface);border:1px solid var(--pp-border);border-radius:var(--pp-radius-md);padding:28px 24px;text-align:center;transition:transform var(--pp-transition),box-shadow var(--pp-transition)}
    .vb-value:hover{transform:translateY(-3px);box-shadow:var(--pp-shadow-hover)}
    .vb-value-icon{width:48px;height:48px;margin:0 auto 16px;background:var(--pp-primary-light);border-radius:var(--pp-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--pp-primary)}
    .vb-value h3{font-family:var(--pp-font-heading);font-size:20px;color:var(--pp-text);margin:0 0 8px}
    .vb-value p{font-size:15px;color:var(--pp-text-secondary);line-height:1.6;margin:0}

    .vb-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;max-width:900px;margin:0 auto}
    .vb-tier{background:var(--pp-surface);border:1px solid var(--pp-border);border-radius:var(--pp-radius-lg);padding:36px 28px;position:relative;text-align:center;transition:transform var(--pp-transition),box-shadow var(--pp-transition)}
    .vb-tier:hover{transform:translateY(-3px);box-shadow:var(--pp-shadow-hover)}
    .vb-tier-highlight{border-color:var(--pp-primary);box-shadow:0 0 0 1px var(--pp-primary),var(--pp-shadow-md)}
    .vb-tier-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--pp-primary);color:#fff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:var(--pp-radius-pill);white-space:nowrap}
    .vb-tier-name{font-family:var(--pp-font-heading);font-size:22px;color:var(--pp-text);margin:8px 0 4px}
    .vb-tier-price{font-family:var(--pp-font-heading);font-size:42px;color:var(--pp-text);font-weight:700;letter-spacing:-.02em}
    .vb-tier-period{font-size:16px;color:var(--pp-text-muted);font-weight:400}
    .vb-tier-features{list-style:none;padding:0;margin:24px 0;text-align:left}
    .vb-tier-features li{display:flex;align-items:flex-start;gap:8px;font-size:14px;color:var(--pp-text-secondary);padding:6px 0;line-height:1.5}
    .vb-tier-features li svg{flex-shrink:0;color:var(--pp-secondary);margin-top:2px}
    .vb-tier-cta{display:block;padding:12px;border:1px solid var(--pp-border);border-radius:var(--pp-radius-xs);font-family:var(--pp-font-ui);font-size:15px;font-weight:600;color:var(--pp-text);text-decoration:none;transition:background var(--pp-transition),border-color var(--pp-transition)}
    .vb-tier-cta:hover{background:var(--pp-surface-hover);border-color:var(--pp-border-strong)}
    .vb-tier-cta-primary{background:var(--pp-primary);color:#fff;border-color:var(--pp-primary)}
    .vb-tier-cta-primary:hover{background:var(--pp-primary-dark);border-color:var(--pp-primary-dark)}

    .vb-social{background:var(--pp-bg-warm);padding:48px 24px;text-align:center;border-radius:var(--pp-radius-lg);max-width:800px;margin:0 auto 64px}
    .vb-social p{font-family:var(--pp-font-heading);font-size:clamp(20px,3.5vw,28px);color:var(--pp-text);margin:0;line-height:1.3}
    .vb-social strong{color:var(--pp-primary)}

    .vb-faq{max-width:680px;margin:0 auto}
    .vb-faq-item{border-bottom:1px solid var(--pp-border);padding:0}
    .vb-faq-item summary{padding:20px 0;font-family:var(--pp-font-heading);font-size:17px;color:var(--pp-text);cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
    .vb-faq-item summary::-webkit-details-marker{display:none}
    .vb-faq-item summary::after{content:'+';font-size:22px;color:var(--pp-text-muted);transition:transform var(--pp-transition)}
    .vb-faq-item[open] summary::after{transform:rotate(45deg)}
    .vb-faq-item p{padding:0 0 20px;font-size:15px;color:var(--pp-text-secondary);line-height:1.7;margin:0}

    .vb-bottom-cta{text-align:center;padding:80px 24px;background:linear-gradient(180deg,var(--pp-bg) 0%,var(--pp-bg-warm) 100%)}
    .vb-bottom-cta h2{font-family:var(--pp-font-heading);font-size:clamp(24px,4vw,36px);color:var(--pp-text);margin:0 0 16px;letter-spacing:-.02em}
    .vb-bottom-cta p{font-size:16px;color:var(--pp-text-secondary);margin:0 0 28px}
  `;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon(`
  <style>${css}</style>`)}
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
