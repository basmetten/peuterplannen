// === Configuration ===
export const DESKTOP_WIDTH = 680;
export const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
export const SB_KEY = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==");
export const SB_EVENTS_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/analytics_events";

// === Label Maps ===
export const TYPE_LABELS = { play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', horeca: 'Horeca', museum: 'Museum', swim: 'Zwemmen', pancake: 'Pannenkoeken' };
export const WEATHER_LABELS = { indoor: 'Binnen', outdoor: 'Buiten', both: 'Binnen & buiten', hybrid: 'Binnen & buiten' };
export const PRESET_LABELS = {
    rain: 'Regenproof',
    'outdoor-coffee': 'Buiten + koffie',
    dreumesproof: 'Dreumesproof',
    peuterproof: 'Peuterproof',
    'short-drive': 'Korte rit',
    'lunch-play': 'Lunch + spelen',
    'terras-kids': 'Terrasje met de kids',
};
export const WEATHER_ICONS = {
    indoor: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    outdoor: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    both: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="14" r="3"/></svg>',
    hybrid: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="14" r="3"/></svg>'
};
export const TYPE_COLORS = {
    play: '#6B9590', farm: '#8B7355', nature: '#4A7A76', horeca: '#D4775A',
    museum: '#8B6688', swim: '#5B9EC4', pancake: '#E8B870'
};
export const LUNCH_PLAY_PATTERN = /(speelhoek|speelruimte|speeltuin|terras|kinderstoel|lunchen|pannenkoek|pannenkoeken|boerderij|restaurant|cafe|café)/i;

export const FULL_LOCATION_SELECT = 'id,name,type,description,website,distance_from_city_center_km,region,coffee,alcohol,diaper,place_id,lat,lng,weather,last_verified,min_age,max_age,toddler_highlight,is_featured,featured_until,owner_verified,owner_photo_url,photo_url,photo_quality,rain_backup_quality,shade_or_shelter,parking_ease,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,noise_level,crowd_pattern,time_of_day_fit,price_band';
export const FALLBACK_LOCATION_SELECT = 'id,name,type,description,website,distance_from_city_center_km,region,coffee,alcohol,diaper,place_id,lat,lng,weather,last_verified,verification_source,min_age,max_age,toddler_highlight,is_featured,featured_until,owner_verified,owner_photo_url,photo_url,photo_quality,rain_backup_quality,shade_or_shelter,parking_ease,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,noise_level,crowd_pattern,time_of_day_fit,price_band';

export const LOCATIONS_CACHE_KEY = 'pp_locations_cache_v4';
export const LOCATIONS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
export const LOCATIONS_CACHE_DB = 'pp-app-cache';
export const LOCATIONS_CACHE_STORE = 'kv';

export const ADSENSE_PUB_ID = 'ca-pub-4964283748507156';
export const ADSENSE_SLOT_ID = '';
export const ADSENSE_EVERY_N = 10;

export const PROMO_ITEMS = [
    { title: 'Dit is een hobbyproject', text: 'Geen team, geen budget. Wel 2138+ uitjes in Nederland. Stuur een koffie. ☕', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun PeuterPlannen', icon: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>', donation: true },
    { title: 'Gemaakt door een vader, voor ouders', text: 'Geen team, geen budget. Wel 2138+ uitjes. Een kleine bijdrage helpt.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun PeuterPlannen', icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', donation: true },
    { title: 'Iets nuttigs gevonden?', text: 'PeuterPlannen is gratis. Een kleine bijdrage houdt het zo.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Trakteer de maker', icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', donation: true },
    { title: '2138+ locaties, gratis', text: 'Gemaakt voor ouders in Nederland. Help het gratis te houden.', url: 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO', cta: 'Steun via betaalverzoek', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', donation: true },
];

export const BATCH_SIZE = 20;

export const TRANSPORT_RADIUS = { auto: 50, fiets: 5, ov: 25, lopen: 2, bakfiets: 8 };
export const SPEED_KMH = { auto: 50, fiets: 15, bakfiets: 12, ov: 35, lopen: 5 };
export const TRANSPORT_LABELS = { auto: 'de auto', fiets: 'de fiets', ov: 'het OV', lopen: 'te voet', bakfiets: 'de bakfiets' };
export const TYPE_GROUPS = { farm: 'outdoor', nature: 'outdoor', play: 'play', museum: 'culture', swim: 'water', horeca: 'food', pancake: 'food' };

export const CATEGORY_IMAGES = { play: '/images/categories/speeltuinen.webp', farm: '/images/categories/kinderboerderijen.webp', nature: '/images/categories/natuur.webp', museum: '/images/categories/musea.webp', swim: '/images/categories/zwemmen.webp', pancake: '/images/categories/pannenkoeken.webp', horeca: '/images/categories/horeca.webp', culture: '/images/categories/cultuur.webp' };

// Warm color placeholders per type (shown while photo loads)
export const TYPE_PHOTO_COLORS = {
    play: '#C5DDD9',    // teal-light (speeltuin)
    farm: '#D9CEB8',    // warm sand (boerderij)
    nature: '#B8D4C0',  // soft green (natuur)
    museum: '#D4C5D4',  // soft purple (museum)
    swim: '#B8D4E0',    // light blue (zwemmen)
    pancake: '#F0DCC0',  // warm cream (pannenkoeken)
    horeca: '#E8D5C4',  // warm beige (horeca)
};

// === Shared Mutable State ===
export const state = {
    activeTag: 'all',
    activeWeather: null,
    activeRegion: null,
    activeAgeGroup: null,
    activeRadius: null,
    activeSort: 'default',
    lastTravelTimes: {},
    activeFacilities: { coffee: false, diaper: false, alcohol: false },
    activePreset: null,
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
