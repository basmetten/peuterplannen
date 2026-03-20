const CACHE_NAME = 'peuterplannen-v6';
const STATIC_ASSETS = [
  '/',
  '/app.html',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/manifest.json',
  '/fonts.css',
  '/design-system.css',
  '/style.min.css',
  '/nav-floating.css',
  '/nav-floating.js',
  '/app.bundle.css',
  '/app.bundle.js',
  '/consent.js'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for known static assets only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Only handle known static asset paths
  const path = url.pathname;
  if (!STATIC_ASSETS.includes(path)) return;

  // Cache key without query string (assets use ?v= cache busters)
  const cacheKey = url.origin + url.pathname;

  // Skip navigate requests to avoid caching redirects
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, clone));
        }
        return response;
      }).catch(() => caches.match(cacheKey))
    );
    return;
  }

  // Sub-resources: stale-while-revalidate
  event.respondWith(
    caches.match(cacheKey).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response.ok && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
