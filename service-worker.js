const CACHE_NAME = 'trading-journal-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './src/pages/accounts.html',
  './src/pages/calendar.html',
  './src/pages/trades.html',
  './src/css/styles.css',
  './src/css/accounts.css',
  './src/css/calendar.css',
  './src/css/dashboard.css',
  './src/css/trades.css',
  './src/js/accounts.js',
  './src/js/calendar.js',
  './src/js/dashboard.js',
  './src/js/trades.js',
  './src/icons/icon-192.png',
  './src/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
