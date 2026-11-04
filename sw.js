// Service worker: primero intenta internet (siempre lo más nuevo); sin conexión usa la copia guardada.
// Supabase y el CDN no pasan por aquí (solo archivos de este sitio).
var CACHE = 'kequito-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match('./'); });
    })
  );
});
