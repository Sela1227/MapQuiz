/* MapQuiz service worker — cache-first 離線（V1.6.0） */
var CACHE = "mapquiz-v2.1.1";
var ASSETS = [
  "./", "./index.html", "./css/style.css", "./js/app.js", "./js/data.js",
  "./data/landmarks.js", "./data/world.js", "./data/world-landmarks.js", "./data/world-facts.js", "./data/taiwan-facts.js", "./data/world-capitals.js", "./data/world-flags.js",
  "./assets/app-logo.png", "./assets/sela.svg",
  "./favicon/favicon-16x16.png", "./favicon/favicon-32x32.png", "./favicon/favicon.ico",
  "./favicon/apple-touch-icon.png", "./favicon/android-chrome-192x192.png",
  "./favicon/android-chrome-512x512.png", "./site.webmanifest"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }));
});
