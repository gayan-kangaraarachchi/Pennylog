// Pennylog service worker: keeps the app working offline.
// Bump CACHE whenever you change any file listed below, so installed copies pick up the new version.
const CACHE = "pennylog-v1";
const FILES = [
  "./", "./index.html", "./manifest.webmanifest", "./css/styles.css",
  "./js/i18n.js", "./js/locales/en-GB.js", "./js/locales/fi-FI.js", "./js/locales/sv-SE.js",
  "./js/app.js", "./js/register-sw.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first for our own files (so updates show up), cached copy when offline.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
