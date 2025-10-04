// service-worker.js
const CACHE_NAME = 'barkday-v4'; // ⬅️ bump this

// Build cache list relative to the SW scope (handles /Barkday/ vs /barkday/)
const SCOPE = self.registration.scope; // e.g., https://candidquality.github.io/Barkday/
const path = (p) => new URL(p, SCOPE).pathname;

// Only precache IMMUTABLE assets (icons, static pages). DO NOT precache HTML shell or JS/CSS.
const ASSETS = [
  // removed: path('./'), path('index.html'), path('app.js'), path('style.css')
  path('privacy.html'),
  path('terms.html'),
  path('icon-192.png'),
  path('icon-256.png'),
  path('icon-384.png'),
  path('icon-512.png'),
  path('icon-maskable-192.png'),
  path('icon-maskable-512.png'),
  path('favicon.ico'),
  path('favicon-96x96.png'),
  path('favicon.svg'),
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Network-first for HTML *and* for app.js / style.css (so new versions always win)
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const isCritical = url.pathname.endsWith('/app.js') || url.pathname.endsWith('/style.css');
  if (isHTML || isCritical) {
    event.respondWith((async () => {
      try {
        // bypass HTTP cache
        return await fetch(req, { cache: 'no-store' });
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // fallback to any cached copy (ignore search so /app.js?v=... can fall back to /app.js if you ever precache it)
        const match = await cache.match(req, { ignoreSearch: true });
        return match || Response.error();
      }
    })());
    return;
  }

  // 2) Cache-first (stale-while-revalidate) for images/icons
  if (/\.(png|svg|ico)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      const fetchPromise = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // 3) Everything else: passthrough
  event.respondWith(fetch(req));
});
