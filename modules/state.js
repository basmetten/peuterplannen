/**
 * @typedef {Object} UserLocation
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {string} name - Display name (city or 'Mijn locatie')
 */

/**
 * @typedef {Object} FacilityFilters
 * @property {boolean} coffee - Coffee available filter active
 * @property {boolean} diaper - Diaper changing filter active
 * @property {boolean} alcohol - Alcohol available filter active
 */

/**
 * @typedef {Object} AppState
 * @property {string[]} activeTags - Selected type filters (empty array = all types)
 * @property {boolean} activeFavorites - Whether favorites-only mode is active
 * @property {string} activeTag - Legacy computed property for backward compat (reads/writes activeTags + activeFavorites)
 * @property {string|null} activeWeather - Active weather filter ('indoor', 'outdoor', or null)
 * @property {string|null} activeRegion - Active region filter or null
 * @property {string|null} activeAgeGroup - Active age group ('dreumes', 'peuter', or null)
 * @property {number|null} activeRadius - Active radius filter in km or null
 * @property {string} activeSort - Sort mode ('default', 'peuterscore', 'az')
 * @property {Object<number, Object>} lastTravelTimes - Cached travel times keyed by location id
 * @property {FacilityFilters} activeFacilities - Active facility filters
 * @property {string|null} activePreset - Active preset filter key or null
 * @property {string|null} activeFoodFit - Active food fit filter ('full', 'snacks', or null)
 * @property {string|null} activePriceBand - Active price band filter ('free', 'budget', or null)
 * @property {{parking: boolean, buggy: boolean}} activePractical - Active practical filters
 * @property {number[]} sharedShortlistIds - Location ids from a shared shortlist URL
 * @property {boolean} filterPanelUserExpanded - Whether user manually expanded the filter panel
 * @property {UserLocation|null} userLocation - User's current location or null
 * @property {Array<Object>} allLocations - All currently filtered and sorted locations
 * @property {Object|null} autocomplete - Google Maps Autocomplete instance or null
 * @property {boolean} mapsLoaded - Whether Google Maps JS has loaded
 * @property {string} currentDisplayMode - Active display mode ('list' or 'map')
 * @property {Object|null} mapInstance - MapLibre GL map instance or null
 * @property {boolean} mapLoaded - Whether the map has finished loading tiles
 * @property {boolean} mapLibreReady - Whether MapLibre GL JS is available
 * @property {number|null} activeLocSheet - Location id shown in the detail sheet, or null
 * @property {Object|null} userLocationMarker - Map marker for user location or null
 * @property {string} currentView - Active navigation view ('home', 'favorites', etc.)
 * @property {string|null} locatieParam - Location slug from URL param or null
 * @property {number|null} currentWeatherCode - Current Open-Meteo weather code or null
 * @property {number|null} currentTemp - Current temperature in Celsius or null
 * @property {boolean} isRaining - Whether current weather indicates rain
 * @property {boolean} isSunny - Whether current weather indicates sunny and warm
 */

// === Configuration ===

/** @type {number} Breakpoint width in px above which desktop layout activates. */
export const DESKTOP_WIDTH = 680;

/** @type {string} Supabase REST API URL for the locations table. */
export const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";

/** @type {string} Supabase anon key (read-only, base64-decoded at runtime). */
export const SB_KEY = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==");

/** @type {string} Supabase REST API URL for the analytics_events table. */
export const SB_EVENTS_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/analytics_events";

// === Label Maps ===

/** @type {Object<string, string>} Maps location type keys to Dutch display labels. */
export const TYPE_LABELS = { play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', horeca: 'Horeca', museum: 'Museum', swim: 'Zwemmen', pancake: 'Pannenkoeken' };

/** @type {Object<string, string>} Maps weather type keys to Dutch display labels. */
export const WEATHER_LABELS = { indoor: 'Binnen', outdoor: 'Buiten', hybrid: 'Binnen+buiten', both: 'Binnen+buiten' };

/** @type {Object<string, string>} Maps preset filter keys to Dutch display labels. */
export const PRESET_LABELS = {
    rain: 'Regenproof',
    'outdoor-coffee': 'Buiten + koffie',
    dreumesproof: 'Dreumesproof',
    peuterproof: 'Peuterproof',
    'short-drive': 'Korte rit',
    'lunch-play': 'Lunch + spelen',
    'terras-kids': 'Terrasje met de kids',
    'now-open': 'Nu open',
};

/** @type {Object<string, string>} Maps weather type keys to inline SVG icon markup. */
export const WEATHER_ICONS = {
    indoor: '<svg viewBox="0 0 24 24" class="weather-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    outdoor: '<svg viewBox="0 0 24 24" class="weather-icon"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    both: '<svg viewBox="0 0 24 24" class="weather-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="14" r="3"/></svg>',
    hybrid: '<svg viewBox="0 0 24 24" class="weather-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="14" r="3"/></svg>'
};

/** @type {Object<string, string>} Maps location type keys to brand hex colors. */
export const TYPE_COLORS = {
    play: '#6B9590', farm: '#8B7355', nature: '#4A7A76', horeca: '#D4775A',
    museum: '#8B6688', swim: '#5B9EC4', pancake: '#E8B870'
};

/** @type {string} Comma-separated Supabase select fields for the primary location query. */
export const FULL_LOCATION_SELECT = 'id,name,type,description,website,distance_from_city_center_km,region,coffee,alcohol,diaper,place_id,lat,lng,weather,last_verified,min_age,max_age,toddler_highlight,is_featured,featured_until,owner_verified,owner_photo_url,photo_url,photo_quality,rain_backup_quality,shade_or_shelter,parking_ease,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,noise_level,crowd_pattern,time_of_day_fit,price_band,opening_hours';

/** @type {string} Comma-separated Supabase select fields used as fallback when primary query fails. */
export const FALLBACK_LOCATION_SELECT = 'id,name,type,description,website,distance_from_city_center_km,region,coffee,alcohol,diaper,place_id,lat,lng,weather,last_verified,verification_source,min_age,max_age,toddler_highlight,is_featured,featured_until,owner_verified,owner_photo_url,photo_url,photo_quality,rain_backup_quality,shade_or_shelter,parking_ease,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,noise_level,crowd_pattern,time_of_day_fit,price_band,opening_hours';

/** @type {string} IndexedDB key used to store the cached locations payload. */
export const LOCATIONS_CACHE_KEY = 'pp_locations_cache_v5';

/** @type {number} Locations cache time-to-live in milliseconds (12 hours). */
export const LOCATIONS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

/** @type {string} IndexedDB database name for the app cache. */
export const LOCATIONS_CACHE_DB = 'pp-app-cache';

/** @type {string} IndexedDB object store name within the cache database. */
export const LOCATIONS_CACHE_STORE = 'kv';

/** @type {string} AdSense publisher ID. */
export const ADSENSE_PUB_ID = 'ca-pub-4964283748507156';

/** @type {string} AdSense ad slot ID (empty = disabled). */
export const ADSENSE_SLOT_ID = '';

/** @type {number} Insert a promo/ad card every N location cards. */
export const ADSENSE_EVERY_N = 10;

/** @type {Array<{title: string, text: string, url: string, cta: string, icon: string, donation: boolean}>} Rotating donation promo card definitions. */
export const PROMO_ITEMS = [
    { title: 'Dit is een hobbyproject', text: 'Geen team, geen budget. Wel 2138+ uitjes in Nederland. Stuur een koffie. ☕', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun PeuterPlannen', icon: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>', donation: true },
    { title: 'Gemaakt door een vader, voor ouders', text: 'Geen team, geen budget. Wel 2138+ uitjes. Een kleine bijdrage helpt.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun PeuterPlannen', icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', donation: true },
    { title: 'Iets nuttigs gevonden?', text: 'PeuterPlannen is gratis. Een kleine bijdrage houdt het zo.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Trakteer de maker', icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', donation: true },
    { title: '2138+ locaties, gratis', text: 'Gemaakt voor ouders in Nederland. Help het gratis te houden.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun via betaalverzoek', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', donation: true },
];

/** @type {number} Number of cards rendered per batch for progressive loading. */
export const BATCH_SIZE = 20;

/** @type {Object<string, number>} Maximum search radius in km per transport mode. */
export const TRANSPORT_RADIUS = { auto: 50, fiets: 5, ov: 25, lopen: 2, bakfiets: 8 };

/** @type {Object<string, number>} Average speed in km/h per transport mode for travel time estimates. */
export const SPEED_KMH = { auto: 50, fiets: 15, bakfiets: 12, ov: 35, lopen: 5 };

/** @type {Object<string, string>} Maps transport mode keys to Dutch display labels. */
export const TRANSPORT_LABELS = { auto: 'de auto', fiets: 'de fiets', ov: 'het OV', lopen: 'te voet', bakfiets: 'de bakfiets' };

/** @type {Object<string, string>} Maps location type keys to broader category groups. */
export const TYPE_GROUPS = { farm: 'outdoor', nature: 'outdoor', play: 'play', museum: 'culture', swim: 'water', horeca: 'food', pancake: 'food' };

/** @type {Object<string, string>} Maps location type keys to category hero image paths. */
export const CATEGORY_IMAGES = { play: '/images/categories/speeltuinen.webp', farm: '/images/categories/kinderboerderijen.webp', nature: '/images/categories/natuur.webp', museum: '/images/categories/musea.webp', swim: '/images/categories/zwemmen.webp', pancake: '/images/categories/pannenkoeken.webp', horeca: '/images/categories/horeca.webp', culture: '/images/categories/cultuur.webp' };

/** @type {Object<string, string>} Warm placeholder background colors per type, shown while photos load. */
export const TYPE_PHOTO_COLORS = {
    play: '#C5DDD9',    // teal-light (speeltuin)
    farm: '#D9CEB8',    // warm sand (boerderij)
    nature: '#B8D4C0',  // soft green (natuur)
    museum: '#D4C5D4',  // soft purple (museum)
    swim: '#B8D4E0',    // light blue (zwemmen)
    pancake: '#F0DCC0',  // warm cream (pannenkoeken)
    horeca: '#E8D5C4',  // warm beige (horeca)
};

/**
 * Canonical filter schema — single source of truth for all filter UI surfaces.
 * Each group has a key, Dutch label, and array of options.
 * @type {Array<{group: string, label: string, options: Array<{value: string, label: string, action: string}>}>}
 */
export const FILTER_SCHEMA = [
    { group: 'situaties', label: 'Situaties', options: [
        { value: 'rain', label: 'Regenproof', action: 'preset' },
        { value: 'outdoor-coffee', label: 'Buiten + koffie', action: 'preset' },
        { value: 'dreumesproof', label: 'Dreumesproof', action: 'preset' },
        { value: 'peuterproof', label: 'Peuterproof', action: 'preset' },
        { value: 'now-open', label: 'Nu open', action: 'preset' },
        { value: 'short-drive', label: 'Korte rit', action: 'preset' },
        { value: 'lunch-play', label: 'Lunch + spelen', action: 'preset' },
        { value: 'terras-kids', label: 'Terrasje + kids', action: 'preset' },
    ]},
    { group: 'weer', label: 'Weer', options: [
        { value: 'indoor', label: 'Binnen', action: 'weather' },
        { value: 'outdoor', label: 'Buiten', action: 'weather' },
    ]},
    { group: 'leeftijd', label: 'Leeftijd', options: [
        { value: 'dreumes', label: 'Dreumes (0-2)', action: 'age' },
        { value: 'peuter', label: 'Peuter (2-5)', action: 'age' },
    ]},
    { group: 'faciliteiten', label: 'Faciliteiten', options: [
        { value: 'coffee', label: 'Koffie', action: 'facility' },
        { value: 'diaper', label: 'Verschonen', action: 'facility' },
        { value: 'alcohol', label: 'Alcohol', action: 'facility' },
    ]},
    { group: 'eten_drinken', label: 'Eten & drinken', options: [
        { value: 'full', label: 'Restaurant', action: 'foodfit' },
        { value: 'snacks', label: 'Snacks', action: 'foodfit' },
    ]},
    { group: 'praktisch', label: 'Praktisch', options: [
        { value: 'parking', label: 'Makkelijk parkeren', action: 'practical' },
        { value: 'buggy', label: 'Buggy-vriendelijk', action: 'practical' },
        { value: 'free', label: 'Gratis', action: 'priceband' },
        { value: 'budget', label: 'Budget', action: 'priceband' },
    ]},
    { group: 'afstand', label: 'Afstand', options: [
        { value: '5', label: '5 km', action: 'radius' },
        { value: '10', label: '10 km', action: 'radius' },
        { value: '25', label: '25 km', action: 'radius' },
    ]},
    { group: 'persoonlijk', label: 'Persoonlijk', options: [
        { value: 'only', label: 'Alleen bewaard', action: 'saved' },
    ]},
];

// === Shared Constants ===

/** @type {Set<number>} WMO weather codes that indicate rain conditions. */
export const RAIN_CODES = new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,83,84,85,86,95,96,99]);

// === Shared Mutable State ===

/** @type {AppState} Global mutable application state shared across all modules. */
export const state = {
    activeTags: [],
    activeFavorites: false,
    activeWeather: null,
    activeRegion: null,
    activeAgeGroup: null,
    activeRadius: null,
    activeSort: 'default',
    lastTravelTimes: {},
    activeFacilities: { coffee: false, diaper: false, alcohol: false },
    activePreset: null,
    activeFoodFit: null,           // 'full' or 'snacks' or null
    activePriceBand: null,         // 'free' or 'budget' or null
    activePractical: { parking: false, buggy: false },
    sharedShortlistIds: [],
    filterPanelUserExpanded: false,
    userLocation: null,
    allLocations: [],
    autocomplete: null,
    mapsLoaded: false,
    currentDisplayMode: 'list',
    mapInstance: null,
    mapLoaded: false,
    mapLibreReady: false,
    activeLocSheet: null,
    userLocationMarker: null,
    currentView: 'home',
    locatieParam: null,
    currentWeatherCode: null,
    currentTemp: null,
    isRaining: false,
    isSunny: false,
};

// Backward-compatible getter/setter for `activeTag` — used by sheet-engine.js and other legacy code.
// Reads: returns 'favorites' if activeFavorites, first activeTags entry if single, or 'all'.
// Writes: maps string values to the new activeTags/activeFavorites properties.
Object.defineProperty(state, 'activeTag', {
    get() {
        if (state.activeFavorites) return 'favorites';
        if (state.activeTags.length === 1) return state.activeTags[0];
        if (state.activeTags.length === 0) return 'all';
        return state.activeTags[0]; // multi-select: return first for legacy readers
    },
    set(val) {
        if (val === 'favorites') {
            state.activeFavorites = true;
        } else if (val === 'all') {
            state.activeTags = [];
            state.activeFavorites = false;
        } else {
            state.activeTags = [val];
            state.activeFavorites = false;
        }
    },
    enumerable: true,
    configurable: true,
});
