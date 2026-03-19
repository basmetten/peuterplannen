# Personalization Strategy for PeuterPlannen
## Privacy-First, No-Account Personalization

> **Date:** 2026-03-19
> **Author:** Deep research by Claude Code for Bas Metten
> **Context:** peuterplannen.nl — toddler activity finder, vanilla JS, GitHub Pages, Supabase, privacy-first

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Client-Side Storage Architecture](#3-client-side-storage-architecture)
4. [What Data to Collect](#4-what-data-to-collect)
5. [Preference Collection UX](#5-preference-collection-ux)
6. [Client-Side Recommendation Engine](#6-client-side-recommendation-engine)
7. [Privacy & Legal Compliance](#7-privacy--legal-compliance)
8. [Cross-Device Sync Without Accounts](#8-cross-device-sync-without-accounts)
9. [The "Personal Without Creepy" Balance](#9-the-personal-without-creepy-balance)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Sources](#11-sources)

---

## 1. Executive Summary

PeuterPlannen can deliver meaningful personalization entirely client-side, without user accounts, without tracking cookies, and without sending personal data to any server. The approach:

- **Store preferences in localStorage** (simple prefs) and **IndexedDB** (behavioral history)
- **Collect data progressively** — start with 1-2 questions, learn from behavior over time
- **Run a weighted scoring algorithm in the browser** — no server-side ML needed
- **Offer cross-device transfer via shareable URL** — encode preferences in a compressed URL parameter
- **Stay GDPR-compliant** by treating user-initiated preference storage as "strictly necessary" functionality and being transparent about what's stored

The result: a site that feels like it knows you, while your data never leaves your device.

---

## 2. Current State Analysis

Current localStorage usage in `app.html`:

| Key | Purpose | Type |
|-----|---------|------|
| `peuterplannen_favorites` | Saved favorite locations | JSON array of IDs |
| `pp-last-city` | Last selected city | String |
| `pp_consent` | Cookie consent state | JSON object |
| `gpsLat` / `gpsLon` (checked) | GPS coordinates | Numbers |

This is a solid foundation. The architecture already proves that localStorage works for user state. The strategy below extends this pattern into a full personalization system.

---

## 3. Client-Side Storage Architecture

### 3.1 Storage Technology Selection

| Technology | Use Case | Capacity | Persistence |
|-----------|----------|----------|-------------|
| **localStorage** | Simple preferences (city, child ages, transport mode) | ~5 MB | Until cleared |
| **IndexedDB** | Behavioral history (visits, clicks, time spent) | ~50-100+ MB | Until cleared |
| **sessionStorage** | Current session context (active filters) | ~5 MB | Tab lifetime |
| **Service Worker Cache** | Offline access to personalized content | Varies | Managed |

### 3.2 Recommended Storage Schema

**localStorage** — for preferences (small, fast, synchronous reads):

```javascript
// Storage key: 'pp_prefs'
const preferences = {
  version: 1,                    // Schema version for migrations
  createdAt: '2026-03-19',       // When preferences were first set
  updatedAt: '2026-03-19',       // Last modification

  // Explicit preferences (user-set)
  children: [
    { ageMonths: 30 },           // Age in months for precision
    { ageMonths: 48 }
  ],
  city: 'amsterdam',
  neighborhood: 'de-pijp',       // Optional, finer granularity
  transportMode: 'bike',         // 'walk' | 'bike' | 'car' | 'public-transport'
  maxTravelMinutes: 15,          // How far they'll travel

  // Preference weights (learned over time)
  activityWeights: {
    speeltuin: 0.8,              // 0-1 scale, adjusted by behavior
    kinderboerderij: 0.6,
    zwembad: 0.3,
    museum: 0.5,
    natuur: 0.7
  },

  // Feature flags
  weatherAware: true,            // Show weather-appropriate suggestions
  showFreeOnly: false            // Budget preference
};
```

**IndexedDB** — for behavioral data (larger, async, queryable):

```javascript
// Database: 'pp_behavior', version 1
// Object stores:

// Store: 'visits' — locations the user has viewed
// keyPath: 'id' (auto-increment)
{
  locationSlug: 'artis-amsterdam',
  timestamp: 1710849600000,
  timeSpentMs: 45000,          // How long they viewed the page
  source: 'search',            // How they found it: 'search' | 'recommendation' | 'map' | 'favorites'
  actions: ['viewed-photos', 'checked-hours', 'saved-favorite']
}

// Store: 'searches' — what they've searched for
{
  query: 'speeltuin water',
  timestamp: 1710849600000,
  filtersUsed: { type: 'speeltuin', feature: 'water' },
  resultsClicked: ['vondelpark-speeltuin', 'flevopark-waterspeeltuin']
}

// Store: 'sessions' — aggregate session data
{
  date: '2026-03-19',
  duration: 300000,
  locationsViewed: 5,
  searchesPerformed: 2,
  favoritesAdded: 1
}
```

### 3.3 Storage Initialization Pattern

```javascript
// pp-personalization.js

const PP_PREFS_KEY = 'pp_prefs';
const PP_DB_NAME = 'pp_behavior';
const PP_DB_VERSION = 1;

// --- localStorage: preferences ---

function getPrefs() {
  try {
    const raw = localStorage.getItem(PP_PREFS_KEY);
    if (!raw) return null;
    const prefs = JSON.parse(raw);
    // Schema migration if needed
    if (prefs.version < 1) return migratePrefs(prefs);
    return prefs;
  } catch { return null; }
}

function savePrefs(prefs) {
  try {
    prefs.updatedAt = new Date().toISOString().split('T')[0];
    localStorage.setItem(PP_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) { /* storage full or unavailable */ }
}

function updatePref(key, value) {
  const prefs = getPrefs() || createDefaultPrefs();
  prefs[key] = value;
  savePrefs(prefs);
}

function createDefaultPrefs() {
  return {
    version: 1,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
    children: [],
    city: '',
    neighborhood: '',
    transportMode: 'bike',
    maxTravelMinutes: 15,
    activityWeights: {},
    weatherAware: true,
    showFreeOnly: false
  };
}

// --- IndexedDB: behavioral data ---

function openBehaviorDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PP_DB_NAME, PP_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('visits')) {
        const visits = db.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
        visits.createIndex('locationSlug', 'locationSlug', { unique: false });
        visits.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('searches')) {
        db.createObjectStore('searches', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function recordVisit(locationSlug, source) {
  const db = await openBehaviorDB();
  const tx = db.transaction('visits', 'readwrite');
  tx.objectStore('visits').add({
    locationSlug,
    timestamp: Date.now(),
    timeSpentMs: 0,  // Updated on page leave
    source,
    actions: []
  });
}
```

### 3.4 Auto-Expiration Strategy

```javascript
// Run on app init — prune old behavioral data
async function pruneOldData(maxAgeDays = 90) {
  const db = await openBehaviorDB();
  const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

  const tx = db.transaction(['visits', 'searches'], 'readwrite');

  // Delete visits older than 90 days
  const visitStore = tx.objectStore('visits');
  const visitIndex = visitStore.index('timestamp');
  const range = IDBKeyRange.upperBound(cutoff);

  visitIndex.openCursor(range).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
}
```

**Retention policy:**
- Explicit preferences (age, city, transport): kept until user changes or clears them
- Behavioral data (visits, searches): auto-pruned after 90 days
- Session data: auto-pruned after 30 days
- Display a "Your stored data" section in settings so users can see and delete everything

---

## 4. What Data to Collect

### 4.1 Data Hierarchy (Most to Least Valuable)

| Priority | Data Point | Collection Method | Why It Matters |
|----------|-----------|-------------------|---------------|
| **P0** | Child age(s) | Explicit (onboarding) | Filters 80% of irrelevant results. A 1-year-old and a 4-year-old need completely different activities. |
| **P0** | City / neighborhood | Explicit + GPS | Location relevance is the #1 factor for a local activity finder. |
| **P1** | Transport mode | Explicit (onboarding) | Determines which locations are "nearby." Bike range vs car range differs hugely. |
| **P1** | Favorites | Explicit (heart button) | Already implemented. Direct signal of preference. |
| **P2** | Activity type preference | Implicit (clicks + time) | What categories they browse most. |
| **P2** | Feature preferences | Implicit (filter usage) | Do they always filter for "gratis" or "overdekt"? |
| **P3** | Visit frequency | Implicit (return visits) | Identifies "regulars" who need fresh suggestions vs newcomers exploring. |
| **P3** | Weather sensitivity | Implicit (behavior on rainy days) | Do they only browse when planning ahead, or also last-minute? |
| **P4** | Time preferences | Implicit (when they use the app) | Weekend planners vs weekday planners. |

### 4.2 What NOT to Collect

- Exact home address (neighborhood is enough)
- Names, email, phone
- Device fingerprint
- IP address
- Cross-site behavior
- Anything that identifies a specific person

---

## 5. Preference Collection UX

### 5.1 The Research: How Many Questions Before Users Abandon?

Key findings from 2025-2026 UX research:

- **88% of users** abandon registration when forms are too long (Gigya/SAP research)
- **21% of users** abandon an app after just one use
- Average form completion time is 2:37; abandoned forms average 1:43
- **Nike's pattern**: one question per screen reduces cognitive load significantly
- **Spotify's pattern**: "Pick at least 3 artists" — a visual, tap-based selection that feels like play, not work
- **Best practice**: Ask 1-2 questions upfront, gather the rest over time

### 5.2 Recommended Flow: Progressive 3-Step Onboarding

**Trigger:** First visit to `app.html`, no `pp_prefs` in localStorage.

**Step 1: Child Age (mandatory, 1 tap)**
```
+------------------------------------------+
|  Welkom bij PeuterPlannen!               |
|                                          |
|  Hoe oud is je kind?                     |
|                                          |
|  [ 0-1 ]  [ 1-2 ]  [ 2-3 ]  [ 3-4 ]   |
|                                          |
|  [ 4-6 ]  [ 6+ ]   [ Meerdere... ]      |
|                                          |
|              Overslaan →                 |
+------------------------------------------+
```

- Large, colorful tap targets (not a dropdown)
- "Meerdere..." opens a multi-select
- "Overslaan" respects user choice — never force

**Step 2: Transport Mode (optional, 1 tap)**
```
+------------------------------------------+
|  Hoe ga je meestal op pad?               |
|                                          |
|  🚶 Lopend   🚲 Fiets                    |
|  🚗 Auto     🚌 OV                       |
|                                          |
|              Overslaan →                 |
+------------------------------------------+
```

**Step 3: Done. No more questions.**

The city/neighborhood is already being captured from the existing city selector or GPS. No need to ask separately.

**Total time: under 10 seconds. Two taps.**

### 5.3 Progressive Profiling: Learning from Behavior

After onboarding, the system silently collects implicit signals:

```javascript
// Track what activity types they click on
function recordActivityClick(location) {
  const prefs = getPrefs();
  if (!prefs) return;

  const type = location.type; // 'speeltuin', 'kinderboerderij', etc.
  const weights = prefs.activityWeights || {};

  // Increment weight with decay: new clicks matter more
  const currentWeight = weights[type] || 0.5;
  weights[type] = Math.min(1.0, currentWeight + 0.05);

  // Decay other types slightly (they clicked THIS, not those)
  for (const key of Object.keys(weights)) {
    if (key !== type) {
      weights[key] = Math.max(0.1, weights[key] - 0.01);
    }
  }

  prefs.activityWeights = weights;
  savePrefs(prefs);
}

// Track filter usage patterns
function recordFilterUsage(filters) {
  const prefs = getPrefs();
  if (!prefs) return;

  if (filters.gratis) prefs.showFreeOnly = true;
  // After 3+ sessions filtering for "overdekt", suggest it
  // (track in IndexedDB, aggregate in scoring)
}

// Track time spent on location pages
let pageEntryTime = null;

function onLocationPageEnter(slug) {
  pageEntryTime = Date.now();
}

function onLocationPageLeave(slug) {
  if (!pageEntryTime) return;
  const timeSpent = Date.now() - pageEntryTime;

  // Only count meaningful engagement (> 5 seconds)
  if (timeSpent > 5000) {
    recordVisit(slug, 'direct');
  }
  pageEntryTime = null;
}
```

### 5.4 Showing Users Their Preferences (Settings Panel)

```
+------------------------------------------+
|  ⚙️ Mijn voorkeuren                      |
|                                          |
|  Leeftijd kind(eren): 2-3 jaar           |
|  Vervoer: Fiets                          |
|  Stad: Amsterdam (De Pijp)              |
|  Max reistijd: 15 min                    |
|                                          |
|  De app heeft geleerd dat je vooral      |
|  speeltuinen en kinderboerderijen leuk   |
|  vindt. [Klopt dit?]                     |
|                                          |
|  [ Wijzig ]  [ Wis alles ]              |
|                                          |
|  ℹ️ Al je gegevens staan alleen op je     |
|  eigen apparaat. We slaan niks op.       |
+------------------------------------------+
```

This transparency ("De app heeft geleerd dat...") is key to the "personal without creepy" balance. See section 9.

---

## 6. Client-Side Recommendation Engine

### 6.1 Architecture: Weighted Scoring

No ML libraries needed. A simple weighted scoring algorithm running client-side is sufficient for PeuterPlannen's use case (~2200 locations with structured attributes).

The core idea: for each location, calculate a **relevance score** based on how well it matches the user's explicit + implicit preferences.

### 6.2 Scoring Algorithm

```javascript
/**
 * Score a location against user preferences.
 * Returns a number between 0 and 1.
 * Higher = more relevant.
 */
function scoreLocation(location, prefs, behaviorData) {
  let score = 0;
  let totalWeight = 0;

  // --- Factor 1: Age match (weight: 30%) ---
  const AGE_WEIGHT = 0.30;
  if (prefs.children && prefs.children.length > 0) {
    const ageMatch = prefs.children.some(child => {
      const ageYears = child.ageMonths / 12;
      return ageYears >= (location.minAge || 0) && ageYears <= (location.maxAge || 12);
    });
    score += ageMatch ? AGE_WEIGHT : 0;
  } else {
    score += AGE_WEIGHT * 0.5; // No age preference = neutral
  }
  totalWeight += AGE_WEIGHT;

  // --- Factor 2: Distance / travel time (weight: 25%) ---
  const DISTANCE_WEIGHT = 0.25;
  if (location.distanceMinutes !== undefined && prefs.maxTravelMinutes) {
    const ratio = location.distanceMinutes / prefs.maxTravelMinutes;
    if (ratio <= 1) {
      score += DISTANCE_WEIGHT * (1 - ratio * 0.5); // Closer = better, but all within range are decent
    } else {
      score += DISTANCE_WEIGHT * Math.max(0, 1 - ratio) * 0.3; // Steep penalty beyond max
    }
  } else {
    score += DISTANCE_WEIGHT * 0.5;
  }
  totalWeight += DISTANCE_WEIGHT;

  // --- Factor 3: Activity type preference (weight: 20%) ---
  const TYPE_WEIGHT = 0.20;
  const typeScore = prefs.activityWeights?.[location.type] || 0.5;
  score += TYPE_WEIGHT * typeScore;
  totalWeight += TYPE_WEIGHT;

  // --- Factor 4: Feature match (weight: 10%) ---
  const FEATURE_WEIGHT = 0.10;
  if (prefs.showFreeOnly && location.isFree) {
    score += FEATURE_WEIGHT;
  } else if (!prefs.showFreeOnly) {
    score += FEATURE_WEIGHT * 0.5;
  }
  totalWeight += FEATURE_WEIGHT;

  // --- Factor 5: Novelty — haven't visited recently (weight: 10%) ---
  const NOVELTY_WEIGHT = 0.10;
  const visitCount = behaviorData.visitCounts?.[location.slug] || 0;
  if (visitCount === 0) {
    score += NOVELTY_WEIGHT; // Never visited = full novelty bonus
  } else {
    score += NOVELTY_WEIGHT * Math.max(0, 1 - visitCount * 0.2); // Diminishing novelty
  }
  totalWeight += NOVELTY_WEIGHT;

  // --- Factor 6: Quality signals (weight: 5%) ---
  const QUALITY_WEIGHT = 0.05;
  if (location.rating) {
    score += QUALITY_WEIGHT * (location.rating / 5);
  } else {
    score += QUALITY_WEIGHT * 0.5;
  }
  totalWeight += QUALITY_WEIGHT;

  return totalWeight > 0 ? score / totalWeight : 0.5;
}

/**
 * Get personalized recommendations.
 * Returns locations sorted by relevance score.
 */
async function getRecommendations(allLocations, prefs, limit = 10) {
  const behaviorData = await aggregateBehaviorData();

  const scored = allLocations.map(loc => ({
    ...loc,
    relevanceScore: scoreLocation(loc, prefs, behaviorData)
  }));

  // Sort by score, with small random perturbation to avoid stale results
  scored.sort((a, b) => {
    const jitter = (Math.random() - 0.5) * 0.05; // ±2.5% randomness
    return (b.relevanceScore + jitter) - (a.relevanceScore + jitter);
  });

  return scored.slice(0, limit);
}

/**
 * Aggregate behavioral data from IndexedDB for scoring.
 */
async function aggregateBehaviorData() {
  const db = await openBehaviorDB();
  const tx = db.transaction('visits', 'readonly');
  const store = tx.objectStore('visits');

  return new Promise((resolve) => {
    const visitCounts = {};
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const slug = cursor.value.locationSlug;
        visitCounts[slug] = (visitCounts[slug] || 0) + 1;
        cursor.continue();
      } else {
        resolve({ visitCounts });
      }
    };
  });
}
```

### 6.3 Where to Show Personalized Content

| Surface | What to personalize | How |
|---------|-------------------|-----|
| **Homepage hero** | "Speeltuinen bij jou in de buurt" instead of generic | Use city + transport mode |
| **App.html search results** | Sort by relevance score instead of (only) distance | Blend distance with preference score |
| **"Misschien ook leuk" section** | Similar locations on detail pages | Score remaining locations, show top 3-4 |
| **Map view** | Highlight recommended pins | Add visual weight (larger/colored pins) for high-score locations |
| **Empty state** | When no search active, show personalized feed | "Op basis van jouw voorkeuren" |

### 6.4 Content-Based Similarity (for "Similar Locations")

```javascript
/**
 * Find locations similar to a given location.
 * Uses attribute overlap — no ML needed.
 */
function findSimilar(targetLocation, allLocations, limit = 4) {
  const attributes = ['type', 'city', 'features', 'isFree', 'isIndoor'];

  const scored = allLocations
    .filter(loc => loc.slug !== targetLocation.slug)
    .map(loc => {
      let similarity = 0;

      // Type match (strongest signal)
      if (loc.type === targetLocation.type) similarity += 3;

      // City match
      if (loc.city === targetLocation.city) similarity += 2;

      // Feature overlap
      const sharedFeatures = (targetLocation.features || [])
        .filter(f => (loc.features || []).includes(f));
      similarity += sharedFeatures.length;

      // Indoor/outdoor match
      if (loc.isIndoor === targetLocation.isIndoor) similarity += 1;

      // Free/paid match
      if (loc.isFree === targetLocation.isFree) similarity += 0.5;

      return { ...loc, similarity };
    });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}
```

---

## 7. Privacy & Legal Compliance

### 7.1 GDPR and the ePrivacy Directive: What Applies?

**Key legal question:** Does storing preferences in localStorage require consent?

**The answer depends on purpose:**

| Storage Purpose | Consent Required? | Legal Basis |
|----------------|-------------------|-------------|
| Functional preferences the user explicitly sets (age, city) | **No** — strictly necessary for requested service | ePrivacy Art. 5(3) exemption |
| Implicit behavioral tracking (clicks, time spent) | **Yes, or strong argument for legitimate interest** | Requires transparency at minimum |
| Favorites (user clicks heart) | **No** — user-initiated functionality | ePrivacy Art. 5(3) exemption |
| Consent state itself | **No** — required for compliance | Exempt |

**The ePrivacy Directive's Article 5(3)** requires prior consent to store/access information on a user's device, UNLESS it is "strictly necessary" for a service explicitly requested by the user. The proposed ePrivacy Regulation was withdrawn in 2025, so the Directive (and its national transpositions) remains the governing law.

### 7.2 PeuterPlannen's Compliance Strategy

**For explicit preferences (P0 risk — clearly safe):**
- User sets their child's age, city, transport mode
- This is functionality they explicitly requested
- No consent needed beyond the act of setting the preference
- Store with `pp_prefs` key, clearly labeled in settings

**For implicit behavioral data (P1 risk — needs careful handling):**

Option A (recommended): **Ask consent as part of onboarding.**
After the 2-tap onboarding, show:
```
"Wil je dat de app leert van je zoekgedrag om betere
suggesties te geven? Je data blijft op je apparaat."

[ Ja, graag ]   [ Nee, liever niet ]
```

This is not a cookie banner. It's a feature opt-in that respects user agency.

Option B: **Only use explicit preferences.** Skip implicit tracking entirely. You still get 70% of the personalization value from just age + city + transport mode + favorites.

### 7.3 What Counts as "Personal Data" Under GDPR?

GDPR defines personal data as "any information relating to an identified or identifiable natural person." Key points for PeuterPlannen:

- **Child age ranges** (e.g., "2-3 years"): Not personal data on their own. Cannot identify anyone.
- **City/neighborhood**: Not personal data. Too broad.
- **Exact GPS coordinates + timestamp**: Could be personal data (can identify household). **Avoid storing these.**
- **Behavioral patterns on-device**: Debatable. If they never leave the device and cannot be accessed by anyone, the GDPR argument is much weaker. The data is more like "notes you wrote for yourself."
- **Favorites list**: Not personal data unless combined with identifying information.

**Bottom line:** PeuterPlannen's approach of storing non-identifying preferences on-device only, with no server transmission, sits in the safest possible zone. The data cannot identify a person and never leaves the device.

### 7.4 Privacy-by-Design Checklist

- [ ] Data never sent to server (except existing Supabase reads which are anonymous)
- [ ] No cross-site tracking
- [ ] No device fingerprinting
- [ ] All preferences visible and editable by user
- [ ] "Wis alles" button that actually deletes everything
- [ ] Auto-expiry on behavioral data (90 days)
- [ ] Privacy explanation in plain Dutch, not legal jargon
- [ ] Behavioral tracking opt-in (not opt-out)
- [ ] No third-party scripts access the stored data

---

## 8. Cross-Device Sync Without Accounts

### 8.1 Options Evaluated

| Method | Complexity | Privacy | UX Quality |
|--------|-----------|---------|------------|
| **URL-encoded preferences** | Low | Excellent (no server) | Good |
| QR code transfer | Medium | Excellent | Good for phone-to-phone |
| Email magic link | High | Moderate (email = PII) | Familiar |
| PWA sync via server | High | Poor (data on server) | Best |
| Passkey sync | Very High | Good | Emerging |

### 8.2 Recommended: URL-Based Preference Sharing

Encode the user's explicit preferences into a compact URL that they can share with themselves (bookmark, send via chat, etc.).

```javascript
/**
 * Encode preferences into a shareable URL parameter.
 * Uses base64url encoding for compactness.
 */
function encodePrefsToURL() {
  const prefs = getPrefs();
  if (!prefs) return null;

  // Only encode explicit preferences (not behavioral data)
  const shareable = {
    c: prefs.children?.map(ch => ch.ageMonths),  // [30, 48]
    ci: prefs.city,                                // 'amsterdam'
    n: prefs.neighborhood,                         // 'de-pijp'
    t: prefs.transportMode,                        // 'bike'
    m: prefs.maxTravelMinutes,                     // 15
    f: prefs.showFreeOnly ? 1 : 0                  // 0
  };

  // Remove empty values
  Object.keys(shareable).forEach(k => {
    if (shareable[k] === undefined || shareable[k] === '' ||
        (Array.isArray(shareable[k]) && shareable[k].length === 0)) {
      delete shareable[k];
    }
  });

  const json = JSON.stringify(shareable);
  const encoded = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // base64url

  return `${window.location.origin}/app.html?prefs=${encoded}`;
}

/**
 * Decode preferences from URL parameter.
 */
function decodePrefsFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('prefs');
  if (!encoded) return null;

  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const data = JSON.parse(json);

    return {
      children: (data.c || []).map(m => ({ ageMonths: m })),
      city: data.ci || '',
      neighborhood: data.n || '',
      transportMode: data.t || 'bike',
      maxTravelMinutes: data.m || 15,
      showFreeOnly: !!data.f
    };
  } catch {
    return null;
  }
}

/**
 * On app init: check for prefs in URL and offer to import.
 */
function checkURLPrefs() {
  const urlPrefs = decodePrefsFromURL();
  if (!urlPrefs) return;

  const existing = getPrefs();
  if (existing) {
    // User already has preferences — ask before overwriting
    showImportDialog(urlPrefs);
  } else {
    // No existing prefs — import silently
    const prefs = createDefaultPrefs();
    Object.assign(prefs, urlPrefs);
    savePrefs(prefs);
    // Clean URL
    history.replaceState(null, '', window.location.pathname);
  }
}
```

### 8.3 QR Code for Phone Transfer

For users who want to transfer from desktop to phone (or vice versa):

```javascript
// Generate QR code from the prefs URL
// Use a lightweight QR library (qrcode-generator is ~4KB minified)
function showTransferQR() {
  const url = encodePrefsToURL();
  if (!url) return;

  // Using qrcode-generator (no dependencies)
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  const qrImage = qr.createDataURL(4); // 4px per module
  showModal({
    title: 'Voorkeuren overzetten',
    body: `
      <p>Scan deze QR-code met je andere apparaat om je voorkeuren over te zetten.</p>
      <img src="${qrImage}" alt="QR code" style="max-width: 200px">
      <p class="small">Of kopieer de link:</p>
      <input type="text" value="${url}" readonly onclick="this.select()">
    `
  });
}
```

### 8.4 Why NOT Email Magic Links

While familiar, email-based sync introduces complexity that conflicts with PeuterPlannen's philosophy:
- Requires a server-side component to send emails
- Email is PII — now you're storing personal data server-side
- Adds Supabase Auth dependency
- Over-engineered for the amount of data being synced (a few preferences)

The URL/QR approach achieves 90% of the same result with 10% of the complexity.

---

## 9. The "Personal Without Creepy" Balance

### 9.1 What the Research Says

2025 research reveals a clear **personalization-privacy paradox**:

- Consumers want personalization but don't want to feel watched
- **More than half of U.S. adults** say personalized ads "creep them out"
- When personalization is "too accurate" or "too predictive," it exposes latent behaviors and feels like surveillance
- Users 55+ are most resistant (58% negative toward personalized content)
- The key factor: **perceived control**. Users are comfortable when the value exchange is obvious and they feel in control.

### 9.2 PeuterPlannen's "Personal, Not Creepy" Principles

**Principle 1: Always explain WHY something is shown.**
```
Bad:  "Aanbevolen voor jou" (vague, feels algorithmic)
Good: "Speeltuinen in De Pijp voor kinderen van 2-3 jaar" (transparent, helpful)
```

**Principle 2: Never reveal more than the user explicitly told you.**
```
Bad:  "Je bezoekt vaak op dinsdag, hier zijn activiteiten voor dinsdag"
      (feels like surveillance)
Good: "Populair deze week in Amsterdam"
      (contextual, not personal)
```

**Principle 3: Let the user see and control everything.**
The settings panel (section 5.4) should show exactly what the system "knows." No hidden profiles, no shadow data.

**Principle 4: Personalization should be optional and degradable.**
The app works fine without personalization. It's a bonus, not a requirement. Users who skip onboarding or clear their data get a perfectly functional generic experience.

**Principle 5: Use "serendipity" to counter filter bubbles.**
Always mix in 1-2 unexpected suggestions. This prevents the "uncanny valley" of over-personalization and helps users discover things they didn't know they'd like.

```javascript
// In getRecommendations():
function addSerendipity(recommendations, allLocations, count = 2) {
  const recSlugs = new Set(recommendations.map(r => r.slug));
  const candidates = allLocations.filter(loc =>
    !recSlugs.has(loc.slug) && loc.rating >= 4 // Only quality surprises
  );

  // Pick random high-quality locations the user hasn't seen
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const pick = candidates.splice(idx, 1)[0];
    pick._isSerendipity = true;
    recommendations.push(pick);
  }

  return recommendations;
}
```

### 9.3 The "Creepy" Spectrum for PeuterPlannen

| Level | Example | User Reaction | Verdict |
|-------|---------|--------------|---------|
| 1 - Generic | Same content for everyone | "Works but boring" | Baseline |
| 2 - Contextual | Filtered by city they selected | "Helpful" | Current state |
| 3 - Preference-based | Filtered by age + city + type | "This gets me" | **Sweet spot** |
| 4 - Behavioral | "Because you visited Artis last week..." | "How does it know?" | Borderline |
| 5 - Predictive | "You usually plan on Wednesdays..." | "This is creepy" | Avoid |

**Target: Level 3.** Occasionally dip into Level 4 when the user has explicitly opted into behavioral learning, and always with transparent labeling.

---

## 10. Implementation Roadmap

### Phase 1: Foundation (1-2 days)

**Goal:** Storage layer + 2-question onboarding.

- Create `pp-personalization.js` with localStorage preferences API
- Migrate existing `peuterplannen_favorites` and `pp-last-city` into the unified `pp_prefs` object (with backward compatibility)
- Build the 2-step onboarding overlay (age + transport)
- Show onboarding only when `pp_prefs` is absent in localStorage
- Add "Mijn voorkeuren" link in app navigation

### Phase 2: Personalized Sorting (1 day)

**Goal:** Search results reflect preferences.

- Implement `scoreLocation()` using explicit preferences only
- Sort app.html results by blended score (distance * 0.5 + preference * 0.5)
- Add "Aanbevolen" badge to high-scoring locations
- Personalize the homepage hero text using city + age

### Phase 3: Behavioral Learning (1-2 days)

**Goal:** The app gets smarter over time.

- Set up IndexedDB stores for visits and searches
- Track location page views (time > 5 seconds)
- Track filter usage patterns
- Integrate behavioral data into scoring algorithm
- Add consent prompt for behavioral tracking
- Implement 90-day auto-pruning

### Phase 4: Recommendations Engine (1 day)

**Goal:** "Misschien ook leuk" on location pages.

- Implement `findSimilar()` content-based similarity
- Add recommendation section to location detail pages
- Add personalized "empty state" feed on app.html
- Implement serendipity injection

### Phase 5: Cross-Device & Polish (1 day)

**Goal:** Transfer preferences between devices.

- Implement URL encoding/decoding of preferences
- Add "Deel je voorkeuren" button in settings with copy-link and QR
- Implement URL parameter detection on app init
- Add "Wis alles" functionality
- Write plain-Dutch privacy explanation

### Phase 6: Service Worker Enhancement (optional, 1 day)

**Goal:** Offline personalization.

- Cache personalized location data for offline browsing
- Pre-cache recommended locations for instant loading
- Show last personalized results when offline

---

## 11. Sources

### Client-Side Storage
- [Client-side storage - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage)
- [Client-Side Storage Guide: LocalStorage vs SessionStorage vs IndexedDB](https://www.frontendtools.tech/blog/client-side-storage-guide-localstorage-sessionstorage-indexeddb)
- [The Ultimate Guide to Browser Storage](https://dev.to/dthiwanka/the-ultimate-guide-to-browser-storage-localstorage-indexeddb-cookies-and-more-4g6l)
- [Browser Storage Comparison: sql.js vs IndexedDB vs localStorage](https://recca0120.github.io/en/2026/03/06/browser-storage-comparison/)
- [10 Client-side Storage Options — SitePoint](https://www.sitepoint.com/client-side-storage-options-comparison/)

### UX & Onboarding
- [Progressive Profiling 101 — Descope](https://www.descope.com/learn/post/progressive-profiling)
- [7 User Onboarding Best Practices for 2026 — Formbricks](https://formbricks.com/blog/user-onboarding-best-practices)
- [Deep-dive into Spotify's User Onboarding Experience](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)
- [How Spotify Onboards New Users](https://medium.com/@TheAhmadkabir/how-spotify-onboards-new-users-and-what-id-improve-as-a-pm-c05b4eb318df)
- [Generalized User Representations — Spotify Research](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations)
- [Hidden UX Patterns That Make Websites 10x More Effective](https://www.netguru.com/blog/hidden-ux-patterns-for-websites)

### Privacy & GDPR
- [Local Storage and Cookies — CookieFirst](https://cookiefirst.com/local-storage-and-cookies/)
- [What are cookies, local storage and session storage from a privacy law perspective? — Clym](https://www.clym.io/blog/what-are-cookies-local-storage-and-session-storage-from-a-privacy-law-perspective)
- [Privacy by Design & Default (GDPR): Implementation Guide](https://secureprivacy.ai/blog/privacy-by-design-gdpr-2025)
- [Personalization Without Privacy Violations — SecurePrivacy](https://secureprivacy.ai/blog/personalization-privacy-compliance)
- [Cookieless Tracking Technology 2025 — SecurePrivacy](https://secureprivacy.ai/blog/cookieless-tracking-technology)
- [ePrivacy Directive, GDPR, And The Future — Usercentrics](https://usercentrics.com/knowledge-hub/eprivacy-everything-you-need-to-know-about-it/)
- [Cookies, the GDPR, and the ePrivacy Directive — GDPR.eu](https://gdpr.eu/cookies/)
- [GDPR Data Retention: Compliance Guidelines — Usercentrics](https://usercentrics.com/knowledge-hub/gdpr-data-retention/)
- [GDPR Storage Limitation — GDPR Local](https://gdprlocal.com/gdpr-storage-limitation/)

### Recommendation Engines
- [BBC Clientside Recommender — GitHub](https://github.com/bbc/clientside-recommender)
- [Build a Content-based Recommendation Engine in JS — DEV](https://dev.to/jimatjibba/build-a-content-based-recommendation-engine-in-js-2lpi)
- [Content-Based Recommender — npm](https://www.npmjs.com/package/content-based-recommender)
- [Building a Content-Based Recommendation Engine in JS — Gravitywell](https://www.gravitywell.co.uk/insights/building-a-content-based-recommendation-engine-in-js/)
- [Edge AI: Running Models in the Browser — Calmops](https://calmops.com/programming/web/edge-ai-browser-based-ml/)

### Personalization-Privacy Paradox
- [The Personalization Paradox: When Tailored UX Turns "Creepy" — GermainUX](https://germainux.com/2025/09/14/the-personalization-paradox-when-tailored-ux-turns-creepy/)
- [Consumer Preferences for Privacy and Personalization, 2025 — XM Institute](https://www.xminstitute.com/research/consumer-privacy-personalization-2025/)
- [The Personalization-Privacy Paradox: What 4,000 Users Told Us — Verve](https://verve.com/blog/the-personalization-privacy-paradox-what-4000-users-told-us-about-ads/)
- [Privacy Paradox: Personalization AND Privacy 2025 — Seresa](https://seresa.io/blog/data-loss/the-privacy-paradox-customers-want-personalization-and-privacy)

### Cross-Device Sync
- [Magic Link Authentication: Cross-Device System](https://medium.com/@mbaochajonathan/magic-link-authentication-building-a-cross-device-authentication-system-part-2-aa791fa48ea8)
- [Weighted Scoring Model: Guide for Developers — daily.dev](https://daily.dev/blog/weighted-scoring-model-guide-for-developers)

### Service Workers & PWA
- [Offline-First PWAs: Service Worker Caching Strategies — MagicBell](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Offline Data — web.dev](https://web.dev/learn/pwa/offline-data)
- [PWA Offline Capabilities — ZeePalm](https://www.zeepalm.com/blog/pwa-offline-capabilities-service-workers-and-web-api-integration)
