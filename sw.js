// PeuterPlannen Service Worker v2
// Separated caches with strategy per resource type

const SHELL_CACHE = 'pp-shell-v3';
const FONTS_CACHE = 'pp-fonts-v1';
const IMAGES_CACHE = 'pp-images-v1';
const TILES_CACHE = 'pp-tiles-v1';

const KNOWN_CACHES = [SHELL_CACHE, FONTS_CACHE, IMAGES_CACHE, TILES_CACHE];

// App shell to precache on install
const PRECACHE_URLS = [
  '/app.html',
  '/app.bundle.css',
  '/app.bundle.js',
  '/manifest.json'
];

// Offline fallback page (inline)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PeuterPlannen — Offline</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
background:#FAF7F2;color:#2D2A26;display:flex;align-items:center;justify-content:center;
min-height:100vh;min-height:100dvh;padding:24px;text-align:center}
.offline{max-width:360px}
h1{font-size:1.5rem;margin-bottom:12px;color:#D4775A}
p{font-size:1rem;line-height:1.5;margin-bottom:24px;color:#6B6560}
a{display:inline-block;padding:12px 28px;background:#D4775A;color:#fff;
border-radius:12px;text-decoration:none;font-weight:600;font-size:0.95rem}
a:active{opacity:0.85}
</style>
</head>
<body>
<div class="offline">
<h1>Je bent offline</h1>
<p>PeuterPlannen heeft een internetverbinding nodig om locaties te laden. Controleer je verbinding en probeer het opnieuw.</p>
<a href="/app.html">Opnieuw proberen</a>
</div>
</body>
</html>`;

const OFFLINE_CACHE_KEY = '/offline.html';

// ——— Install: precache shell + offline fallback ———
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      Promise.all([
        cache.addAll(PRECACHE_URLS),
        cache.put(new Request(OFFLINE_CACHE_KEY), new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }))
      ])
    )
  );
  self.skipWaiting();
});

// ——— Activate: clean old caches ———
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !KNOWN_CACHES.includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ——— Helpers ———

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com' ||
         /\.(woff2?|ttf|otf)(\?|$)/.test(url.pathname);
}

function isImage(url) {
  return /\.(png|jpe?g|webp|avif|svg|gif|ico)(\?|$)/.test(url.pathname);
}

function isMapTile(url) {
  // Common tile servers
  return url.hostname.includes('tile') ||
         url.hostname.includes('maptiler') ||
         url.hostname.includes('openstreetmap') ||
         /\/tiles\//.test(url.pathname) ||
         /\/\d+\/\d+\/\d+\.(png|pbf|mvt)/.test(url.pathname);
}

function isSupabaseAPI(url) {
  return url.hostname.includes('supabase');
}

function isStaticAsset(url) {
  return /\.(css|js)(\?|$)/.test(url.pathname) &&
         url.origin === self.location.origin;
}

function isLocationThumbnail(url) {
  return url.hostname.includes('supabase') && /storage/.test(url.pathname);
}

// ——— Caching strategies ———

// Cache-first: return cached version, fall back to network (and cache it)
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      });
    })
  );
}

// Stale-while-revalidate: return cached immediately, update in background
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
}

// Network-first: try network, fall back to cache
function networkFirst(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    fetch(request).then(response => {
      if (response.ok && !response.redirected) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() =>
      cache.match(request)
    )
  );
}

// ——— Fetch handler ———
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Supabase API — network-first (always want latest data)
  if (isSupabaseAPI(url) && !isLocationThumbnail(url)) {
    // Don't cache API calls, just let them through
    return;
  }

  // 2. Google Fonts — cache-first (they're versioned/immutable)
  if (isFont(url)) {
    event.respondWith(cacheFirst(request, FONTS_CACHE));
    return;
  }

  // 3. Map tiles — stale-while-revalidate
  if (isMapTile(url)) {
    event.respondWith(staleWhileRevalidate(request, TILES_CACHE));
    return;
  }

  // 4. Location thumbnails (Supabase storage) — stale-while-revalidate
  if (isLocationThumbnail(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGES_CACHE));
    return;
  }

  // 5. Same-origin images & icons — cache-first
  if (url.origin === self.location.origin && isImage(url)) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    return;
  }

  // 6. Same-origin static assets (CSS/JS bundles) — cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 7. Navigation requests (app.html, index.html) — network-first with offline fallback
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).then(response => {
        if (response) return response;
        return caches.match(OFFLINE_CACHE_KEY);
      })
    );
    return;
  }

  // 8. Other same-origin requests — network-first
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // Cross-origin requests not matched above — just fetch normally
});
