# PeuterPlannen Groeiplan

> **Doel:** Groei in kwaliteit, gebruik en omzet — gebaseerd op uitgebreide analyse met gesimuleerde focusgroepen (ouders, SEO-specialist, growth-marketeer, content-strateeg, performance-expert, monetisatie-expert).
> **Repo (lokaal):** `/Users/basmetten/peuterplannen`
> **Repo (GitHub):** `github.com/basmetten/peuterplannen` (private)
> **Datum:** 2026-03-15
> **Eigenaar:** Bas Metten (basmetten@gmail.com)

---

## ARCHITECTUUR-ASSESSMENT: IS DE STACK GOED GENOEG?

**Kort antwoord: ja. De stack is professioneel en schaalbaar. Geen wijzigingen nodig.**

| Component | Beoordeling | Schaalbaarheid |
|-----------|-------------|----------------|
| **GitHub Pages** | Uitstekend voor static-first site. Gratis, betrouwbaar, Git-based deploys. | Tot ~100K pageviews/maand prima. Daarna eventueel naar Cloudflare Pages (1-regel wijziging in deploy). |
| **Cloudflare** | Enterprise-grade CDN, Workers, DDoS, analytics. Gratis tier is genereus. | Schaalt praktisch onbeperkt. |
| **Supabase** | PostgreSQL, Auth, Edge Functions, realtime. Perfect voor database + API. | Free tier: 500MB DB, 2GB bandwidth. Pro plan (~€25/mo) bij groei — prima. |
| **Node.js build** | Solide static site generator, incrementele builds, audits. | 2.200 pagina's in seconden. Schaalt naar 10.000+ zonder problemen. |

**Wat grotere bedrijven anders doen:** Ze gebruiken vaak Next.js/Nuxt met server-side rendering, een headless CMS (Contentful/Sanity), en Vercel/Netlify hosting. Maar dat voegt complexiteit en kosten toe die PeuterPlannen nu niet nodig heeft. De huidige vanilla HTML/JS + Supabase stack is bewust gekozen en juist een kracht: maximale performance, minimale afhankelijkheden, volledige controle.

**Wanneer upgraden:** Als je ooit server-side rendering nodig hebt (bijv. voor gepersonaliseerde pagina's), verplaats je de static output naar Cloudflare Pages (ondersteunt SSR via Workers). Dat is een middag werk, geen architectuurwijziging.

---

## EERSTE STAP — VOORDAT JE IETS DOET

```bash
cd /Users/basmetten/peuterplannen
git remote -v        # verwacht: origin  git@github.com:basmetten/peuterplannen.git
git checkout main && git pull origin main
node --version       # verwacht: v20+
npm ci
```

Als iets faalt: **STOP en vraag de user**.

---

## LEESWIJZER VOOR CLAUDE CODE

Dit plan is ontworpen voor fase-voor-fase uitvoering door Claude Code. Working directory MOET `/Users/basmetten/peuterplannen` zijn.

Bij context-verlies: lees `plan.md`, check de status tracker onderaan, hervat bij eerste fase met `TODO` of `IN_PROGRESS`.

### Agent-strategie: EFFICIËNT WERKEN MET SUB-AGENTS

**Waarom sub-agents cruciaal zijn:**
De context window loopt vol bij grote taken. Sub-agents draaien in hun eigen context window. Alleen hun samenvatting komt terug in de main context. Dit betekent: een sub-agent kan 50 bestanden lezen, maar de main agent ziet alleen "Dit is wat ik gevonden heb: ..."

**4 custom agents staan klaar in `.claude/agents/`:**

| Agent | Model | Isolatie | Wanneer gebruiken |
|-------|-------|----------|-------------------|
| `researcher` | Haiku | Nee | Codebase verkennen, bestanden zoeken, patronen vinden. Retourneert alleen samenvatting. |
| `implementer` | Sonnet | Worktree | Code-wijzigingen uitvoeren in isolatie. Build draait in de worktree. Breekt main niet. |
| `verifier` | Haiku | Nee | Na elke fase: draait build + 3 audits. Rapporteert alleen fouten. |
| `content-writer` | Opus | Nee | Blogposts en editorial content schrijven in de juiste stijl. |

**Werkpatroon per fase:**
```
1. RESEARCH (optioneel): Lanceer researcher-agent(s) parallel om context te verzamelen
   → Main ontvangt alleen samenvattingen (geen vol context window)

2. IMPLEMENTATIE: Lanceer implementer-agent(s) in worktree
   → Wijzigingen geïsoleerd, build draait in worktree
   → Bij meerdere onafhankelijke taken: lanceer PARALLEL

3. VERIFICATIE: Lanceer verifier-agent
   → Draait npm run build + 3 audits
   → Rapporteert alleen fouten

4. COMMIT: Main agent commit (NIET de sub-agents)
```

**Parallelisatie-regels:**
- Fasen 1 en 2 zijn ONAFHANKELIJK → lanceer parallel als je beide tegelijk doet
- Binnen een fase: als twee bestanden onafhankelijk zijn, bewerk ze in parallelle sub-agents
- Voorbeeld fase 4: lanceer 4.1 (ga-init.js fix) + 4.2 (JSON-LD trim) + 4.3 (SVG sprites) PARALLEL — ze raken verschillende bestanden
- Content-schrijf-taken (fase 7, 8, 9): lanceer meerdere content-writer agents PARALLEL voor verschillende posts

**Context-bescherming:**
- Lees NOOIT grote bestanden (>200 regels) in de main context als je ze niet direct gaat bewerken
- Delegeer codebase-exploratie ALTIJD naar researcher of Explore agents
- Na elke fase: overweeg of de main context schoon genoeg is om door te gaan
- Bij twijfel: doe `/compact` of start een nieuwe sessie en hervat bij de volgende TODO fase

**Sub-agent beperkingen (belangrijk):**
- Sub-agents kunnen GEEN andere sub-agents spawnen — alleen de main agent kan dat
- Sub-agents beginnen zonder context tenzij je ze hervat (resume parameter)
- Geef sub-agents altijd genoeg instructie om zelfstandig te werken
- Worktree-agents: wijzigingen moeten handmatig gemerged worden als ze klaar zijn

### Commit-strategie
- Elke fase krijgt 1-3 commits met descriptieve messages
- Draai na elke structurele wijziging: `npm run build` + de 3 audits
- Bij twijfel: commit NIET, vraag de user

### Verificatie na elke fase
```bash
npm run build
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
git diff --stat  # review op onbedoelde wijzigingen
```

---

## WAT ER AL GOED IS (NIET AANRAKEN)

- **Situatie-navigatie** ("Regenachtige dag", "Koffie en spelen", "Dreumes-uitjes") — uniek in NL, geen concurrent doet dit
- **Contentvoice** — direct, warm, praktisch, authentiek ouderperspectief
- **Data-rijkheid** — 40+ velden per locatie (buggy-friendliness, shade, noise, crowd, parking)
- **Facility-badges** (Koffie, Luierruimte) — beantwoorden echte logistieke vragen
- **Regionale dekking** inclusief omliggende gemeenten (Utrechtse Heuvelrug!)
- **Build-systeem** — modulair, incrementeel, geaudit, CI/CD elke 10 minuten
- **"Plan mijn dag" wizard** — unieke feature, geen concurrent heeft dit
- **Partner-portal** — Stripe, claims, observaties: volledig gebouwd en klaar voor schaal
- **SEO-fundament** — structured data, split sitemaps, BreadcrumbList, FAQ schema

---

## FASE 1: TYPOGRAFIE & VISUELE UPGRADE
**Status:** `DONE`
**Agents:** `researcher` (onderzoek huidige font-gebruik) → `implementer` (CSS + font bestanden) → `verifier`
**Prioriteit:** HOOG — de site moet er "gelikt" uitzien, niet als een side project
**Doel:** Modern editorial design met mixed typography — serif italic accent + clean sans-serif

### Achtergrond: de trend die we willen

De trend heet **"mixed typography"** of **"neo-editorial"**: in dezelfde heading of zin wissel je tussen een clean sans-serif font en een warm serif italic accent font. Dit creëert een magazine-achtig gevoel dat visueel rijker en professioneler oogt.

**Voorbeelden van hoe dit eruitziet:**
- "De beste *peuteruitjes* voor jouw kleintje" — waar *peuteruitjes* in een warm serif italic staat
- "Ontdek wat werkt voor *jouw gezin*" — het accent woord in italic serif
- "*Speeltuinen* in Amsterdam" — de categorie in serif, de stad in sans-serif
- "2138 locaties. *Menselijk geverifieerd.*" — de tagline in serif italic

Het effect: warmte, persoonlijkheid, editorial autoriteit. Precies wat een ouder-gericht merk nodig heeft.

### Fontkeuze

**Accent font:** **Instrument Serif Italic** (Google Fonts, gratis)
- Zeer populair in modern webdesign (2024-2026)
- Warm en expressief zonder overdreven te zijn
- Heeft prachtige italic die perfect werkt als accent in sans-serif headings
- Licht, laadt snel (~12-15 KB WOFF2)

**Alternatief:** **DM Serif Display** — van dezelfde foundry als DM Sans (het huidige body font). Perfecte familie-match.

**Behouden:**
- DM Sans voor body text
- Familjen Grotesk voor standaard headings (maar Instrument Serif Italic wordt het accent)

### Stappen

#### 1.1 Download en self-host Instrument Serif Italic
```bash
# Download WOFF2 van Google Fonts (of via fontsource)
# Plaats in /fonts/instrument-serif-italic.woff2
```

#### 1.2 Voeg @font-face toe
**Bestand:** `fonts.css`

```css
/* Instrument Serif — Accent/Editorial italic */
@font-face {
  font-family: 'Instrument Serif';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/instrument-serif-italic.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

#### 1.3 Definieer CSS-klasse voor accent-typografie
**Bestand:** `css/style.css` (en inline op `index.html`)

```css
/* Editorial accent typography */
.accent, .pp-accent {
  font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 400;
}

/* Headings met accent woorden */
h1 .accent, h2 .accent, h3 .accent {
  font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 400;
  /* Iets groter dan omringende text voor visueel evenwicht */
  font-size: 1.05em;
}
```

#### 1.4 Pas homepage headings aan
**Bestand:** `index.html`

Transformaties:
- Hero h1: `De beste <span class="accent">peuteruitjes</span> voor jouw kleintje`
- Features h2: `Zoek op type, weer en <span class="accent">voorzieningen</span>`
- Cities h2: `Peuteruitjes in heel <span class="accent">Nederland</span>`
- Stats: `<span class="accent">Menselijk</span> geverifieerd`

#### 1.5 Pas gegenereerde pagina headings aan
**Bestanden:** Generatoren in `.scripts/lib/generators/`

**Stadspagina's** (`city-pages.js`):
- `<h1><span class="accent">{CityName}</span> met peuters</h1>`

**Type-pagina's** (`type-pages.js`):
- `<h1><span class="accent">Speeltuinen</span> voor peuters in Nederland</h1>`

**Locatiepagina's** (`location-pages.js`):
- De locatienaam zelf NIET in accent (dat is de feitelijke identifier)
- Maar de type-badge of intro-tekst kan accent bevatten: `<span class="accent">{typeLabel}</span> in {city}`

**Blogposts** (`blog.js`):
- Per post: de meest expressieve frase in de titel als accent
- Markdown uitbreiding: `*tekst*` in titels renderen als `<span class="accent">tekst</span>` i.p.v. `<em>`

**Cluster-pagina's** (`cluster-pages.js`):
- `<h1>Uitjes voor een <span class="accent">regenachtige dag</span> met peuter</h1>`

#### 1.6 Preload het accent font
**Bestanden:** `index.html` + `.scripts/lib/html-shared.js` (sharedHead functie)

```html
<link rel="preload" href="/fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
```

#### 1.7 Verwijder ongebruikte fonts
- **Plus Jakarta Sans** (3 weights, 36 KB): controleer of het daadwerkelijk als primaire font gebruikt wordt. Zo niet → verwijder uit `fonts.css` en de WOFF2-bestanden.
- **DM Sans italic** en **DM Sans 500**: controleer gebruik. Verwijder als onnodig.
- **Besparing:** 36-64 KB aan font-downloads

#### 1.8 Extra visuele polish (klein maar merkbaar)
**Bestanden:** `css/style.css`, `index.html`

- **Card hover-animatie verfijnen:** voeg subtiele `rotate(-0.5deg)` toe aan card hover voor speelsheid
- **Gradient text accent:** de `.accent` class kan optioneel een subtiel kleurverloop krijgen:
  ```css
  h1 .accent {
    background: linear-gradient(135deg, var(--pp-primary), var(--pp-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  ```
  Dit combineert de serif italic met het bestaande kleurenpalet. Test of dit mooi oogt — zo niet, gebruik gewoon `color: var(--pp-primary)`.

### Verificatie
- Visuele check: open `index.html` in browser, verifieer dat accent-woorden in serif italic staan
- Font loading: verifieer in DevTools Network tab dat alleen benodigde fonts geladen worden
- `npm run build` + audits

---

## FASE 2: SEO-GRADUATIE VERFIJNEN (NIET AFZWAKKEN)
**Status:** `DONE`
**Agents:** `implementer` (seo-policy.js + config.js wijzigen) → `verifier` (build + tel index vs noindex)
**Prioriteit:** HOOG
**Doel:** Meer locaties laten gradueren naar volledige pagina's ZONDER kwaliteitsstandaard te verlagen

### Achtergrond: waarom de graduatie slim is

Het bestaande systeem is bewust ontworpen: locaties beginnen als `noindex` redirects en "verdienen" een volledige pagina door aan kwaliteitscriteria te voldoen. Dit beschermt tegen:
- Google's Helpful Content Update (bestraft sites met veel dunne pagina's)
- Slechte gebruikerservaring (ouder landt op lege/dunne pagina → bounce)
- Reputatieschade bij zoekmachines (thin content → lagere domain authority)

**Het probleem is niet het systeem, maar de drempel.** De huidige functie `computeLocationSeoTier()` in `seo-policy.js` vereist dat ALLE 8 criteria tegelijk waar zijn. Dat is te streng — één ontbrekend veld (bijv. geen `toddler_highlight`) blokkeert een verder complete locatie.

### Wat we NIET doen
- We gooien de poorten NIET open
- We indexeren GEEN locaties zonder beschrijving
- We indexeren GEEN locaties met AI-slop of filler
- We verlagen de standaard NIET — we maken de beoordeling proportioneler

### Stappen

#### 2.1 Wijzig `computeLocationSeoTier()` naar 6-van-8
**Bestand:** `.scripts/lib/seo-policy.js` (regels 282-298)

**Huidige logica:**
```javascript
const eligible = passed === total; // ALLE 8 moeten true zijn
```

**Nieuwe logica:**
```javascript
// Coords en non-filler beschrijving zijn ALTIJD verplicht (niet-onderhandelbaar)
const mandatory = hasCoords && hasDescription && noSlop && noGeneric;
// Daarnaast minimaal 2 van de overige 4 optionele criteria
const optionalPassed = [hasHighlight, hasWeather, hasAgeRange, hasFacility].filter(Boolean).length;
const eligible = mandatory && optionalPassed >= 2;
```

**Waarom 6-van-8 en niet lager:**
- `hasCoords` — zonder coordinaten is de pagina niet bruikbaar (geen kaart, geen route)
- `hasDescription >= 90` — onder 90 karakters is de pagina echt te dun
- `noSlop` + `noGeneric` — AI-gegenereerde rommel beschadigt vertrouwen
- 2 van 4 optioneel — toddler_highlight, weather, ageRange, en facility zijn allemaal "nice to have" maar niet make-or-break

**Verwacht effect:** ~50-70% meer locaties gradueren (van ~400 naar ~800-1.200), maar alleen locaties met echte content.

#### 2.2 Verlaag `SEO_INDEX_THRESHOLD` van 8 naar 6
**Bestand:** `.scripts/lib/config.js` (regel ~261)

Dit verlaagt de drempel voor het secundaire pad in `applySeoPolicy()` (regel 208):
```javascript
strongContent && structuredSignals >= 4 && loc.seoQualityScore >= SEO_INDEX_THRESHOLD
```

Met threshold 6 in plaats van 8 kunnen meer locaties via dit pad gradueren.

#### 2.3 GEEN wijziging aan de beschrijvingsdrempel
- `hasDescription` blijft `desc.length >= 90`. Dit is een gezonde minimum.
- Locaties met <90 karakters beschrijving zijn echt te dun voor een volledige pagina.

#### 2.4 Meet het effect
Na de build, vergelijk de output:
```bash
npm run build 2>&1 | grep "SEO policy applied"
# Vergelijk: (X index, Y support) — hoeveel zijn er verschoven?
```

Log de oude en nieuwe aantallen zodat we weten wat er veranderd is. Als het effect te groot is (>80% indexed), overweeg `optionalPassed >= 3`. Als het te klein is (<30% groei), overweeg `optionalPassed >= 1`.

### Waarom dit werkt voor de lange termijn
- Het systeem blijft kwaliteitsgestuurd
- Locaties die nog niet gradueren zijn zichtbaar in `computeGraduationMetrics()` — je kunt gericht data verrijken om ze te laten promoveren
- De `nearPromotion` lijst toont locaties die 1 criterium missen — die kun je prioriteren in de pipeline
- Naarmate de data verbetert, gradueren steeds meer locaties automatisch

---

## FASE 3: CITY+TYPE COMBINATIEPAGINA'S
**Status:** `DONE`
**Agents:** `researcher` (bekijk bestaande city-pages.js en type-pages.js) → `implementer` in worktree (nieuwe generator + sitemap + audits aanpassen) → `verifier`
**Prioriteit:** HOOG — grootste SEO-gap versus concurrenten
**Doel:** ~100-154 nieuwe hub-pagina's voor zoekopdrachten als "speeltuin amsterdam"

### Achtergrond
Concurrenten (Kidsproof, UitMetKinderen, DagjeWeg) ranken voor "speeltuin [stad]" en "kinderboerderij [stad]" omdat ze dedicated pagina's hebben per combinatie. PeuterPlannen heeft dit niet. De data is er al.

### Stappen

#### 3.1 Maak nieuwe generator
**Nieuw bestand:** `.scripts/lib/generators/city-type-pages.js`

Genereer voor elke regio × type combinatie met **minimaal 3 locaties** een pagina:
- **URL:** `/{stad}/speeltuinen/index.html`, `/{stad}/kinderboerderijen/index.html`, etc.
- Gebruik de typografie-upgrade uit fase 1: `<h1><span class="accent">Speeltuinen</span> in Amsterdam</h1>`

**Pagina-inhoud:**
```html
<title>Speeltuinen in Amsterdam voor peuters | PeuterPlannen</title>
<meta name="description" content="De {count} beste speeltuinen in Amsterdam voor peuters en kleuters. Geverifieerd met koffie, verschonen en weer-info.">
<meta name="robots" content="index,follow">

<!-- BreadcrumbList: Home > Amsterdam > Speeltuinen -->
<!-- JSON-LD ItemList (max 20 items) -->

<h1><span class="accent">Speeltuinen</span> in Amsterdam</h1>
<!-- Intro: 2-3 zinnen uit seo-content library, of gegenereerd -->
<!-- Locatiekaarten gefilterd op stad + type, gesorteerd op seoQualityScore -->
<!-- FAQ sectie (2-3 vragen specifiek voor dit type in deze stad) -->
<!-- Links naar: stadspagina, type-pagina, gerelateerde clusters -->
```

#### 3.2 Voeg toe aan sitemaps
**Bestand:** `.scripts/lib/generators/sitemaps.js`
- Nieuw shard: `sitemap-city-types.xml`
- Priority: `0.85`, Changefreq: `weekly`

#### 3.3 Interne links
- **Stadspagina's** → per type-sectie een link naar city+type pagina
- **Type-pagina's** → per stad een link naar city+type pagina
- **Locatiepagina's** → breadcrumb uitbreiden: Home > Amsterdam > Speeltuinen > Vondelpark

#### 3.4 Audits aanpassen
- `audit_internal_consistency.js` moet de nieuwe pagina's valideren
- `audit_seo_quality.js` moet meta tags en structured data checken

---

## FASE 4: PERFORMANCE OPTIMALISATIES
**Status:** `DONE`
**Agents:** Lanceer 4 `implementer`-agents PARALLEL (4.1-4.4 raken verschillende bestanden) → `verifier`
**Prioriteit:** HOOG — Core Web Vitals beïnvloeden Google-ranking

### 4.1 Fix render-blocking ga-init.js
**Zoek in:** `.scripts/lib/html-shared.js` of generator templates

- Verander `<script src="/ga-init.js">` naar `<script src="/ga-init.js" defer>`
- **Impact:** 100-300ms LCP verbetering op stadspagina's

### 4.2 Trim JSON-LD op listing-pagina's
**Bestanden:** `.scripts/lib/generators/city-pages.js`, `.scripts/lib/generators/type-pages.js`

- Beperk ItemList JSON-LD tot maximaal 20 items (nu: alle 198+ in Amsterdam)
- Google vindt individuele items via hun eigen detailpagina's
- **Impact:** amsterdam.html van 416 KB → ~260 KB raw

### 4.3 SVG sprite voor herhaalde badges
**Bestand:** `.scripts/lib/html-shared.js` (de `locationCard()` of badge-functies)

- Definieer SVG-iconen (koffie, luier, wijn) eenmalig als `<svg style="display:none"><defs>...</defs></svg>`
- Refereer met `<svg><use href="#icon-coffee"/></svg>`
- **Impact:** amsterdam.html: 92 KB SVG → ~5 KB

### 4.4 Sitemap lastmod fixen
**Bestand:** `.scripts/lib/generators/sitemaps.js`

- Stop met `todayISO()` als default lastmod — Google negeert dit
- Gebruik `last_verified_at` of `updated_at` per locatie
- Stadspagina's: gebruik meest recente locatie-update in die stad

### 4.5 Cache-headers voor statische assets
**Bestand:** `_headers`

```
/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/css/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=604800
```

### 4.6 Hero image responsive + WebP
**Bestand:** `index.html`

```html
<picture>
  <source type="image/webp"
    srcset="/images/hero-768.webp 768w, /images/hero-1408.webp 1408w"
    sizes="(max-width: 768px) 768px, 1408px">
  <img src="/images/hero-1408.jpg" width="1408" height="768"
    alt="Ouder en peuter bij een speeltuin" fetchpriority="high" decoding="async">
</picture>
```
Genereer WebP-varianten via `optimize_images.js`.

### 4.7 Pre-size AdSense slots
- Voeg `min-height: 250px` toe aan ad containers
- **Impact:** CLS van ~0.15 → <0.05

---

## FASE 5: UX-VERBETERINGEN
**Status:** `DONE`
**Agents:** `implementer` (meerdere parallel voor onafhankelijke 5.x items) → `verifier`
**Prioriteit:** HOOG

### 5.1 Verwijder beta-taal
**Bestand:** `index.html`

- Verwijder de hero-kicker "Wordt voorbereid voor landelijke rollout"
- Vervang door niets, of door: "2138 geverifieerde locaties in 22 steden"
- **Waarom:** Dit signaleert "niet klaar" aan ouders. De site IS klaar.

### 5.2 Verminder meta-commentaar op gegenereerde pagina's
- Verwijder passages over WAAROM de site zo werkt ("Waarom deze categorie een keuzehulp is, geen export")
- Behoud praktische editorial content (dagtips, leeftijdsadvies)

### 5.3 Voeg zoekbalk toe aan homepage hero
**Bestand:** `index.html`

```html
<form action="/app.html" method="get" class="hero-search">
  <input type="text" name="q" placeholder="Zoek een stad, type of locatie..."
    aria-label="Zoek uitjes" autocomplete="off">
  <button type="submit">Zoeken</button>
</form>
```
Style consistent met het design-system. Bij submit → redirect naar `app.html?q={input}`.

### 5.4 Verbeter app cold start
**Bestand:** `app.html`

Bij laden zonder parameters:
- Toon prominent "Gebruik mijn locatie" knop in plaats van leeg scherm
- Toon "Populaire steden" als fallback
- Sla laatste locatie op in `localStorage` voor herhaaldbezoek

### 5.5 Voeg share-knoppen toe aan blogposts
**Bestand:** `.scripts/lib/generators/blog.js`

```html
<div class="blog-share">
  <a href="https://wa.me/?text={encodedTitle}%20{encodedUrl}"
    target="_blank" rel="noopener" aria-label="Deel via WhatsApp">
    Deel via WhatsApp
  </a>
  <button onclick="navigator.share?.({title:'{title}',url:'{url}'})"
    aria-label="Deel dit artikel">
    Delen
  </button>
</div>
```

### 5.6 Voeg "Stuur naar partner" toe na Plan mijn dag
**Bestand:** `app.html`

Na het genereren van een dagplan:
```html
<a href="https://wa.me/?text=Ik%20heb%20een%20dagje-uit%20plan%20gemaakt%20op%20PeuterPlannen%3A%20{planUrl}"
   class="share-plan-btn">
  Stuur dit plan naar je partner
</a>
```

### 5.7 SEO titel en meta description optimalisatie
**Bestand:** `.scripts/lib/generators/location-pages.js`

- **Titels:** Van `{Name} — peuteruitje in {City}` naar `{Name} — {typeLabel} voor peuters in {City}`
  - Voorbeeld: "Artis — dierentuin voor peuters in Amsterdam | PeuterPlannen"
- **Meta descriptions:** Verwijder de boilerplate `practicalTail` ("Bekijk waarom deze plek werkt..."). Gebruik die ruimte voor unieke content.
- **Blogposts:** Van `{Title} | PeuterPlannen Blog` naar `{Title} | PeuterPlannen`

---

## FASE 6: E-MAIL CAPTURE & NIEUWSBRIEF
**Status:** `TODO`
**Agents:** `implementer` (technische integratie: signup forms + API script) → `verifier` + **🔴 ACTIE VOOR BAS** (account aanmaken)
**Prioriteit:** HOOG — dit is het enige retentiemechanisme dat werkt bij lage traffic
**Provider:** Buttondown (buttondown.com)

### Beslissing: Buttondown

**Gekozen na vergelijking van 7 diensten** (Buttondown, MailerLite, Brevo, Resend, Kit, Loops, Beehiiv).

**Waarom Buttondown:**
- **API perfect voor onze workflow:** `POST /v1/emails` met `status: "draft"` → Bas reviewt in UI → send. Claude Code kan volledige newsletters genereren en als draft pushen.
- **Markdown-native:** Claude Code genereert Markdown, POST naar API, klaar. Geen HTML templating nodig.
- **Privacy-first:** Geen tracking bloat, geen data verkoop. Past bij een Nederlands ouder-publiek.
- **Simpel:** Doet newsletters, doet ze goed, geen feature bloat.
- **GDPR-compliant:** Subscribers kunnen data export/deletion aanvragen.
- **Indie favoriet:** Vertrouwd door indie hackers en kleine scale-ups.

**Gratis tier:** 100 subscribers. Daarna $9/maand voor 1.000 subs.
**Fallback:** Als 100 subs te snel bereikt wordt zonder budget, switch naar MailerLite (500 gratis subs, EU data-opslag in DE/NL). API-integratie is vergelijkbaar.

### 🔴 ACTIE VOOR BAS: Maak Buttondown account aan
1. Ga naar https://buttondown.com en maak een account aan
2. Ga naar Settings → API Keys → kopieer je API key
3. Sla de API key op als GitHub Secret: `BUTTONDOWN_API_KEY`
   ```bash
   gh secret set BUTTONDOWN_API_KEY --repo basmetten/peuterplannen
   ```
4. Optioneel: stel je nieuwsbrief naam in op "PeuterPlannen" en voeg een beschrijving toe

Na aanmelding kan Claude Code de volledige integratie bouwen.

### Stappen (nadat account klaar is)

#### 6.1 Voeg Buttondown signup-formulier toe op 4 plekken
- `index.html` — boven de footer
- `.scripts/lib/generators/blog.js` — onderaan elke blogpost
- `.scripts/lib/generators/city-pages.js` — onderaan elke stadspagina
- `app.html` — na "Plan mijn dag" resultaat

**Implementatie:** Gebruik Buttondown's standaard embed form:
```html
<form action="https://buttondown.com/api/emails/embed-subscribe/peuterplannen"
      method="post" target="popupwindow" class="newsletter-form">
  <p class="newsletter-heading">Elke vrijdag: 3 uitjes die passen bij het weer</p>
  <div class="newsletter-fields">
    <input type="email" name="email" placeholder="jouw@email.nl" required aria-label="E-mailadres">
    <button type="submit">Aanmelden</button>
  </div>
  <p class="newsletter-disclaimer">Geen spam. Uitschrijven wanneer je wilt.</p>
</form>
```

De `newsletterHTML()` functie in `html-shared.js` retourneert nu `''` — vul deze met het formulier.

#### 6.2 CSP-header updaten
**Bestand:** `_headers`
- Voeg `https://buttondown.com` toe aan `form-action` in de Content-Security-Policy
- Voeg `https://buttondown.com` toe aan `connect-src` (voor eventuele JS-integratie)

#### 6.3 Privacy-pagina updaten
**Bestand:** `privacy/index.html` (of generator)
- Vermeld Buttondown als nieuwsbrief-provider
- Leg uit: alleen e-mailadres wordt opgeslagen
- Link naar Buttondown's privacy policy
- Vermeld recht op uitschrijving en data-verwijdering

#### 6.4 Automatisering: wekelijkse nieuwsbrief via Buttondown API
**Nieuw script:** `.scripts/ops/generate-newsletter.js`

Draait elke donderdag via ops-cadence workflow:
1. Haalt weerbericht op voor het weekend (Open-Meteo API, al in CSP whitelist)
2. Selecteert 3-5 locaties per top-regio die passen bij het weer
3. Genereert Markdown nieuwsbrief
4. POST naar Buttondown API als draft:
   ```bash
   curl -X POST https://api.buttondown.com/v1/emails \
     -H "Authorization: Token $BUTTONDOWN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"subject": "Weekend-uitjes: ...", "body": "...", "status": "draft"}'
   ```
5. Draft verschijnt in Buttondown dashboard

**🔴 ACTIE VOOR BAS (wekelijks):** Open Buttondown dashboard, review de draft, klik "Send". ~5 minuten per week.

#### 6.5 Toekomstige automatisering (optioneel, na eerste 50 subscribers)
- **Welkomstmail:** Automatische drip via Buttondown Automations
- **Segmentatie op regio:** Tag subscribers op stad/regio voor gerichte content
- **RSS-to-email:** Automatisch blogposts naar subscribers (Buttondown ondersteunt dit)

---

## FASE 7: SEIZOENSCONTENT — GEAUTOMATISEERD PUBLICATIESCHEMA
**Status:** `TODO`
**Agents:** Meerdere `content-writer` agents PARALLEL (1 per post) → `verifier`
**Prioriteit:** HOOG — seizoenspieken zijn de grootste traffic-kans

### Achtergrond
Seizoenszoektermen hebben enorme pieken: "meivakantie met kinderen" = 8.000-12.000 zoekopdrachten/maand in april. Content moet 4-6 weken VOOR het seizoen gepubliceerd worden zodat Google het kan indexeren.

### Posts (publiceer in deze volgorde):

| # | Titel | Target keyword | Publiceer voor | Est. volume |
|---|-------|---------------|----------------|-------------|
| 1 | Pasen met peuters: 12 activiteiten buiten en binnen | pasen met kinderen | 22 maart (URGENT) | 3-6K/mo |
| 2 | Koningsdag met peuter 2026: tips voor een ontspannen dag | koningsdag met kinderen | 10 april | 5-8K/mo |
| 3 | Kindvriendelijke terrassen 2026 | kindvriendelijk terras | 15 april | 2-4K/mo |
| 4 | Meivakantie met peuters: 15 uitjes | meivakantie uitjes kinderen | 12 april | 8-12K/mo |
| 5 | Zomervakantie met peuter: weekplanning | zomervakantie met peuter | eind mei | 5-8K/mo |
| 6 | Herfstvakantie met peuters: 20 uitjes | herfstvakantie uitjes kinderen | september | 6-10K/mo |

### Schrijfrichtlijnen
- Minimaal 1.500 woorden per post
- 8-10 inline links naar specifieke locatiepagina's (`/amsterdam/vondelpark/`, niet naar de app)
- 2-3 links naar andere blogposts
- Praktische tone (zoals bestaande posts)
- FAQ-sectie onderaan (2-3 vragen → FAQ structured data)
- Gebruik accent-typografie uit fase 1 in titels

### Automatisering: seizoenskalender
Maak een bestand `content/editorial-calendar.json`:
```json
[
  {"slug": "pasen-met-peuters", "publish_before": "2026-03-22", "status": "todo"},
  {"slug": "koningsdag-peuter-2026", "publish_before": "2026-04-10", "status": "todo"},
  ...
]
```
De ops-cadence workflow kan checken of posts op tijd gepubliceerd worden en waarschuwen als deadlines naderen.

---

## FASE 8: EVERGREEN CONTENT — TOP 8 GAP-VULLERS
**Status:** `TODO`
**Agents:** Meerdere `content-writer` agents PARALLEL (1 per post) + `implementer` (bestaande posts uitbreiden) → `verifier`
**Prioriteit:** MEDIUM-HOOG

### Posts gerangschikt op verwachte traffic:

| # | Titel | Target keyword | Est. volume |
|---|-------|---------------|-------------|
| 1 | Kinderfeestje voor 3 jaar: 10 locaties en ideeën | kinderfeestje 3 jaar | 4-6K/mo |
| 2 | Pretparken voor peuters: de beste keuzes in Nederland | pretpark peuter | 3-5K/mo |
| 3 | Dagje uit met een 1-jarige: wat kan er eigenlijk al? | uitje met baby | 2-3K/mo |
| 4 | Dagje uit met opa en oma: 15 uitjes | uitje opa oma kleinkinderen | 2-3K/mo |
| 5 | Beste speeltuinen Amsterdam voor peuters (2026) | beste speeltuinen amsterdam | 2-3K/mo |
| 6 | Museum met peuter: zo overleef je het | museum met peuter | 1.5-2.5K/mo |
| 7 | Eerste keer naar de kinderboerderij | kinderboerderij met baby | 1-2K/mo |
| 8 | Pannenkoekenrestaurant met speeltuin: de beste per provincie | pannenkoekenrestaurant speeltuin | 2-3.5K/mo |

### Bestaande posts versterken
Alle 21 bestaande posts zijn 400-800 woorden — te kort. Prioriteit voor uitbreiding naar 1.500+:
1. `amsterdam-met-peuters-en-kleuters.md`
2. `rotterdam-met-peuters.md`
3. `utrecht-met-peuters.md`
4. `den-haag-met-peuters.md`

Voeg per uitgebreide post 8-10 inline links naar locatiepagina's toe.

---

## FASE 9: ONTBREKENDE STADSGIDSEN
**Status:** `TODO`
**Agents:** Meerdere `content-writer` agents PARALLEL (2-3 per batch) → `verifier`
**Prioriteit:** MEDIUM
**Doel:** Blogposts voor alle 22 steden (nu 11 van 22)

Ontbrekend (gerangschikt op zoekvolume):
1. Arnhem (Burgers' Zoo = veel zoekvolume)
2. Apeldoorn (Apenheul = veel zoekvolume)
3. Leiden
4. Almere
5. 's-Hertogenbosch
6. Tilburg
7. Maastricht
8. Zwolle
9. Enschede
10. Dordrecht
11. Gooi en Vechtstreek

Minimaal 1.500 woorden per post, met lokaal karakter (niet copy-paste van Amsterdam-format).

---

## FASE 10: INTERNE LINKING MESH
**Status:** `TODO`
**Agents:** `researcher` (analyseer huidige link-structuur) → `implementer` (links toevoegen in generators + content) → `verifier`
**Prioriteit:** MEDIUM

### 10.1 Blog → locatiepagina links
- Elke blogpost: 5-10 inline links naar locatiepagina's
- Format: `[Vondelpark](/amsterdam/vondelpark/)` — NIET naar de app

### 10.2 Blog → blog cross-links
- Elke blogpost: 2-3 links naar andere relevante posts
- "Lees ook: [Goedkoop op stap met peuters](/blog/goedkoop-op-stap-peuters/)"

### 10.3 Locatiepagina → city+type pagina (na fase 3)
- Breadcrumb: Home > Amsterdam > Speeltuinen > Vondelpark

---

## FASE 11: DUNNE PAGINA'S FIXEN
**Status:** `TODO`
**Agents:** `researcher` (audit welke cluster-pagina's <10 locaties hebben) → `implementer` (criteria verbreden of noindex) → `verifier`
**Prioriteit:** MEDIUM

### 11.1 Fix dreumes-uitjes.html
- Toont nu slechts 1 locatie — dit schaadt credibiliteit
- Verbreed filtering: verlaag leeftijdsdrempel of voeg locatietypes toe die geschikt zijn voor dreumesen
- Elke cluster-pagina moet minimaal 10 locaties tonen

### 11.2 Audit alle cluster-pagina's
- Controleer alle CLUSTER_PAGES op minimum content
- Pagina's met <10 locaties: verbreed criteria OF noindex tijdelijk

---

## FASE 12: AFFILIATE & MONETISATIE-BASIS
**Status:** `TODO`
**Agents:** `implementer` (affiliate blokken in generators) + `content-writer` (3 affiliate blogposts) → `verifier` + **🔴 ACTIE VOOR BAS**
**Prioriteit:** MEDIUM
**Doel:** €50-200/maand binnen 60 dagen

### 🔴 ACTIE VOOR BAS: Meld je aan bij Bol.com Partner Programma
- Ga naar partnerplatform.bol.com
- Aanmelden met zakelijk of persoonlijk account
- Na goedkeuring: ontvang affiliate tag

### 🔴 ACTIE VOOR BAS: Meld je aan bij TheFork affiliate programma
- Voor reserveringsknoppen op restaurantpagina's
- €1.50-4.00 per voltooide reservering

### Stappen (nadat affiliate tags beschikbaar zijn)

#### 12.1 Voeg "Wat meenemen?" blok toe aan locatiepagina's
**Bestand:** `.scripts/lib/generators/location-pages.js`

Per type:
- Speeltuinen: zonnebrand, waterflesje, picknickkleed
- Kinderboerderijen: laarzen, handgel, schone kleren
- Zwemmen: zwemluier, badpakje, handdoek

Links worden affiliate-ready (met Bol.com tag als placeholder tot tag beschikbaar is).

#### 12.2 Schrijf 3 affiliate-gerichte blogposts
1. "De beste buggy voor uitjes met je peuter"
2. "Wat meenemen naar de speeltuin — een checklist"
3. "Regenkleding voor peuters: wat werkt echt"

#### 12.3 TheFork reserveringsknoppen op restaurantpagina's
Na aanmelding bij TheFork: voeg reserveerknop toe aan horeca- en pannenkoekenpagina's.

### Realistische verwachting
- Bol.com affiliate: €20-50/maand na 60 dagen
- TheFork affiliate: €10-30/maand
- Totaal: €30-80/maand (groeit mee met traffic)

---

## FASE 13: SOCIAL MEDIA FUNDAMENT
**Status:** `TODO`
**Agent:** N/A — **🔴 VOLLEDIG ACTIE VOOR BAS**
**Prioriteit:** MEDIUM

### 🔴 ACTIE VOOR BAS: Pinterest Business Account
1. Maak account aan op Pinterest Business
2. Claim website (verificatie via HTML tag of DNS)
3. Maak boards aan:
   - Per type: "Speeltuinen Nederland", "Kinderboerderijen", "Musea voor peuters"
   - Per situatie: "Peuteruitjes bij regen", "Dagje uit met dreumes"
   - Per stad: "Amsterdam met peuters", "Utrecht met peuters"
4. Pin elke blogpost als verticale afbeelding (1000x1500px)
5. **Investering:** 30 minuten/week

**Claude Code kan helpen:** Pinterest meta tags toevoegen, OG images per blogpost genereren.

### 🔴 ACTIE VOOR BAS: Instagram Account
1. Maak @peuterplannen account aan
2. Post 3x/week: locatie-highlights, weekend-suggesties, "Ken je deze plek?"
3. Hashtags: #peuteruitje #dagjeuitmetkids #kindvriendelijk #uitjesmetkinderen

### Technische ondersteuning (Claude Code)

#### 13.1 Pinterest meta tags
**Bestand:** `.scripts/lib/html-shared.js`
```html
<meta name="pinterest-rich-pin" content="true">
```

#### 13.2 Unieke OG images per blogpost
**Bestand:** `.scripts/lib/generators/blog.js`
- Genereer per blogpost een OG-image met titel als tekst overlay
- Template: warme achtergrond (--pp-bg-cream) + titel in Instrument Serif Italic + PeuterPlannen logo

---

## FASE 14: AUTOMATISERING VOOR DOORLOPENDE GROEI
**Status:** `TODO`
**Agents:** `implementer` (meerdere parallel: 14.1-14.4 zijn onafhankelijke scripts) → `verifier`
**Prioriteit:** MEDIUM
**Doel:** Systemen bouwen die groei automatisch aandrijven

### 14.1 Automatische content-freshness
**Nieuw script:** `.scripts/ops/auto-refresh-content.js`

Draait wekelijks via `ops-cadence.yml`:
1. Controleert welke locaties >6 maanden niet geverifieerd zijn
2. Genereert quality-tasks voor her-verificatie
3. Update `last_context_refresh_at` na controle

### 14.2 Automatische SEO-monitoring
**Nieuw script:** `.scripts/ops/seo-health-check.js`

Draait wekelijks:
1. Telt geïndexeerde vs noindex pagina's
2. Checkt of cluster-pagina's voldoende locaties hebben (>10)
3. Rapporteert welke locaties dicht bij graduatie zijn (nearPromotion)
4. Output als markdown rapport naar `output/seo-report.md`

### 14.3 Automatische nieuwsbrief-content
**Nieuw script:** `.scripts/ops/generate-newsletter.js`

Draait elke donderdag via ops-cadence:
1. Haalt weerbericht op (Open-Meteo API)
2. Selecteert 3-5 passende locaties per top-regio
3. Genereert markdown nieuwsbrief
4. Slaat op als `output/newsletter-draft.md`
5. **🔴 ACTIE VOOR BAS:** Review en verstuur via newsletter-provider

### 14.4 Seizoenskalender-checker
**Toevoegen aan:** `.github/workflows/ops-cadence.yml`

Checkt `content/editorial-calendar.json` en waarschuwt als:
- Een post <2 weken van deadline nog status "todo" heeft
- Een seizoensevent nadert zonder content

---

## FASE 15: DIRECT OUTREACH (NIET-TECHNISCH)
**Status:** `TODO`
**Agent:** N/A — **🔴 ACTIE VOOR BAS**
**Prioriteit:** MEDIUM-LAAG

### 🔴 ACTIE VOOR BAS: Founding partner deals
1. Email 5-10 premium indoor speelparadijzen (Monkey Town, Ballorig, Jimmy's)
2. Aanbod: €50/jaar founding partner tarief (normaal €90/jaar)
3. Inclusief: verified badge, featured placement, editorial write-up
4. **Template email** kan Claude Code voor je schrijven — vraag erom

### 🔴 ACTIE VOOR BAS: Facebook groepen
1. Zoek 5-10 lokale oudergroepen ("Ouders in Amsterdam", "Mama's Utrecht", etc.)
2. Deel waardevolle content (niet spammen): "Het regent dit weekend — hier zijn 5 indoor peuteruitjes in [stad]"
3. Link naar relevante blogpost of situatiepagina
4. **Investering:** 1-2 uur/week

### 🔴 ACTIE VOOR BAS: Backlinks via gemeenten/VVV
1. Email de toerisme/vrijetijds-afdeling van je top-5 steden
2. Pitch: "Wij hebben de meest complete gids voor peuteruitjes in uw stad — gratis en geverifieerd"
3. Vraag om een link vanuit hun "uitjes" of "gezinnen" pagina

---

## STATUS TRACKER

| Fase | Titel | Status | Prioriteit | Wie |
|------|-------|--------|------------|-----|
| 1 | Typografie & visuele upgrade | `DONE` | HOOG | Claude Code |
| 2 | SEO-graduatie verfijnen | `DONE` | HOOG | Claude Code |
| 3 | City+type combinatiepagina's | `DONE` | HOOG | Claude Code |
| 4 | Performance optimalisaties | `DONE` | HOOG | Claude Code |
| 5 | UX-verbeteringen | `DONE` | HOOG | Claude Code |
| 6 | E-mail capture & nieuwsbrief | `TODO` | HOOG | Claude Code + 🔴 Bas |
| 7 | Seizoenscontent (6 posts) | `TODO` | HOOG | Claude Code |
| 8 | Evergreen content (8 posts) | `TODO` | MEDIUM-HOOG | Claude Code |
| 9 | Ontbrekende stadsgidsen (11 posts) | `TODO` | MEDIUM | Claude Code |
| 10 | Interne linking mesh | `TODO` | MEDIUM | Claude Code |
| 11 | Dunne pagina's fixen | `TODO` | MEDIUM | Claude Code |
| 12 | Affiliate & monetisatie | `TODO` | MEDIUM | Claude Code + 🔴 Bas |
| 13 | Social media fundament | `TODO` | MEDIUM | Claude Code + 🔴 Bas |
| 14 | Automatisering | `TODO` | MEDIUM | Claude Code |
| 15 | Direct outreach | `TODO` | MEDIUM-LAAG | 🔴 Bas |

---

## SAMENVATTING: ACTIES VOOR BAS

| Wanneer | Actie | Geschatte tijd |
|---------|-------|----------------|
| **Deze week** | Buttondown account aanmaken + API key als GitHub Secret | 15 min |
| **Deze week** | Bol.com Partner Programma aanmelden | 15 min |
| **Deze week** | Pinterest Business account aanmaken + website claimen | 30 min |
| **Wekelijks** | Buttondown dashboard: review draft, klik Send | 5 min/week |
| **Wekelijks** | 1-2 pins maken op Pinterest | 30 min/week |
| **Wekelijks** | 1-2 posts in ouder-Facebook-groepen | 30 min/week |
| **Eenmalig** | 5-10 founding partner emails sturen | 2 uur |
| **Eenmalig** | 5 gemeente/VVV emails voor backlinks | 1 uur |
| **Optioneel** | Instagram account + 3x/week posten | 2 uur/week |

**Totaal wekelijkse investering (minimaal):** ~1.5 uur/week
**Totaal eenmalig:** ~5 uur

---

## VERWACHTE IMPACT (90 DAGEN)

### Organische groei
- Fase 2 (SEO verfijning): 50-70% meer geïndexeerde pagina's → meer long-tail traffic
- Fase 3 (city+type): 100-154 nieuwe hub-pagina's voor de meest gezochte queries
- Fase 7+8 (content): 14 nieuwe blogposts targeting 40.000+ maandelijkse zoekopdrachten

### Visuele kwaliteit
- Fase 1 (typografie): het verschil tussen "netjes" en "professioneel editorial"
- Accent typography geeft de site een eigen gezicht dat zich onderscheidt van concurrenten

### Gebruikersretentie
- Fase 6 (e-mail): 50-200 subscribers in eerste 2 maanden → 20-40% terugkeerpercentage
- Fase 5 (UX): snellere time-to-value, betere sharing → meer word-of-mouth

### Omzet (realistisch)
- Fase 12 (affiliate): €30-80/maand na 60 dagen
- Featured listings: pas viable bij 10.000+ maandelijkse bezoekers (verwacht: 3-6 maanden)
- AdSense: groeit proportioneel met traffic

### Wat NIET meetbaar is maar cruciaal
- Elke gedeelde locatie-link is een mini-billboard
- Pinterest compound-effect bouwt over maanden op
- Nieuwsbrief-subscribers zijn je meest waardevolle asset
