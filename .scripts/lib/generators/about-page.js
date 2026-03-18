const fs = require('fs');
const path = require('path');
const { ROOT, TIKKIE_URL, LOCATION_COUNT, TYPE_MAP } = require('../config');
const { replaceMarker } = require('../helpers');

function updateAbout(data) {
  const { regions, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');

  // META_ABOUT
  const metaHTML = `    <meta name="description" content="PeuterPlannen helpt ouders met peuters de leukste uitjes te vinden in heel Nederland. ${total}+ geverifieerde locaties in ${regions.length} regio's.">`;
  content = replaceMarker(content, 'META_ABOUT', metaHTML);

  // STATS_ABOUT
  const statsHTML = `        <div class="stats-row">
            <div class="stat-card">
                <strong>${total}+</strong>
                <span>Locaties</span>
            </div>
            <div class="stat-card">
                <strong>${regions.length}</strong>
                <span>Regio's</span>
            </div>
            <div class="stat-card">
                <strong>${Object.keys(TYPE_MAP).length}</strong>
                <span>Categorieën</span>
            </div>
        </div>`;
  content = replaceMarker(content, 'STATS_ABOUT', statsHTML);

  // SUPPORT_ABOUT
  const count = LOCATION_COUNT > 0 ? LOCATION_COUNT : total;
  const supportAboutHTML = `        <div class="support-about-section">
            <div class="support-about-inner">
                <h2>Steun PeuterPlannen</h2>
                <p>Dit bouw ik in mijn vrije tijd, vanuit Utrecht. Geen team, geen investors, geen advertenties. Wat er binnenkomt gaat naar serverkosten (~€10/maand) en nieuwe functies. De rest doe ik erbij. ${count}+ locaties beschikbaar, voor iedereen gratis.</p>
                <div class="support-about-amounts">
                    <span class="support-about-pill">€2</span>
                    <span class="support-about-pill support-about-pill-mid">€5</span>
                    <span class="support-about-pill">€10</span>
                </div>
                <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="support-about-cta">Stuur een bijdrage via betaalverzoek</a>
                <p class="support-about-subline">Elk bedrag is welkom.</p>
            </div>
        </div>`;
  content = replaceMarker(content, 'SUPPORT_ABOUT', supportAboutHTML);
  content = content.replace(/\d+ locaties waarover je kunt vertrouwen/g, `${total} locaties waarover je kunt vertrouwen`);

  fs.writeFileSync(path.join(ROOT, 'about.html'), content);
  console.log(`Updated about.html (${total}+ locaties, ${regions.length} regio's)`);
}

module.exports = { updateAbout };
