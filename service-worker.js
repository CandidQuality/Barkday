// service-worker.js
const CACHE_NAME = 'barkday-v3';

// Build cache list relative to the SW scope (handles /Barkday/ vs /barkday/)
const SCOPE = self.registration.scope; // e.g., https://candidquality.github.io/Barkday/
const path = (p) => new URL(p, SCOPE).pathname;

const ASSETS = [
  path('./'),            // -> /Barkday/
  path('index.html'),
  path('style.css'),
  path('app.js'),
  path('privacy.html'),
  path('terms.html'),
  path('icon-192.png'),
  path('icon-512.png'),
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
