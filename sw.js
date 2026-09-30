/* Offline cache for the app shell. Bump VERSION when files change. */
const VERSION = 'siltline-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icons/icon.svg', './css/styles.css',
  './js/art.js', './js/db.js', './js/catalog.js', './js/ui.js', './js/pdf.js', './js/app.js',
  './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Network first so updates show up right away; fall back to cache in the field. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
