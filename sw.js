/* Service worker: network-first so deployed updates show right away;
   falls back to cache when offline. */
const CACHE = "art-portfolio-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/config.js",
  "./js/data.js",
  "./js/cloud.js",
  "./js/icons.js",
  "./js/app.js",
  "./js/achievements.js",
  "./js/gallery.js",
  "./js/favorites.js",
  "./js/doodle.js",
  "./js/quiz.js",
  "./js/guestbook.js",
  "./js/admin.js",
  "./assets/img/avatar.svg",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for same-origin GETs: always try the network, update the
// cache, and only use the cache if the network fails (offline).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // let cross-origin (Firebase/gstatic) pass through
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
