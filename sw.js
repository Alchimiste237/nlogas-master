/* NLOGA — offline-first service worker (cache-first shell, network images). */
var CACHE = 'nloga-v13';
var SHELL = [
  './',
  'index.html',
  'css/styles.css?v=14',
  'js/analytics.js?v=1',
  'js/script.js?v=7',
  'js/i18n.js?v=5',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'logo.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  /* Navigations: network first, fall back to the cached shell offline. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  /* Static assets: cache first, then network (and cache the fresh copy). */
  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
