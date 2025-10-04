// service-worker.js  (network-first for index and app.js, cache-first for the rest)
const CACHE = 'bd-v6-2025-10-03';

const PRECACHE = [
  './',
  'style.css?v=4',
  'privacy.html',
  'terms.html',
  'favicon.ico',
  'favicon-96x96.png',
  'favicon.svg',
  'icon-192.png',
  'icon-256.png',
  'icon-384.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate';
  const isAppJs = url.pathname.endsWith('/app.js') || url.pathname.endsWith('app.js');

  // --- Network-first for index.html (navigations) and app.js (any query string) ---
  if (isNav || isAppJs) {
    event.respondWith(
      fetch(req).then((res) => {
        // keep an offline copy (ignore ?v=... for app.js)
        const copy = res.clone();
        caches.open(CACHE).then((c) => {
          const key = isAppJs ? new Request(url.origin + url.pathname) : req;
          c.put(key, copy);
        });
        return res;
      }).catch(() => {
        if (isAppJs) {
          // fallback to cached app.js (ignore search)
          return caches.match(new Request(url.origin + url.pathname), { ignoreSearch: true });
        }
        // fallback to cached shell
        return caches.match('./');
      })
    );
    return;
  }

  // --- Everything else: cache-first (ignore search) ---
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
