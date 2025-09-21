self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('barkday-v1').then((cache) => cache.addAll([
      '/barkday/',
      '/barkday/index.html',
      '/barkday/style.css',
      '/barkday/app.js',
      '/barkday/privacy.html',
      '/barkday/terms.html',
      '/barkday/icon-192.png',
      '/barkday/icon-512.png'
    ]))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
