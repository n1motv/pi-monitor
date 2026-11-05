// Cache de l'interface seulement (jamais l'API) : l'app s'ouvre hors ligne, les donnees viennent toujours du Pi.
const V = 'pimon-v2', FILES = ['./', 'style.css', 'core.js', 'bridge.js', 'common.js', 'app.js', 'fonts/geist.woff2', 'fonts/geist-mono.woff2', 'icon.svg', 'icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // reseau d'abord (interface toujours a jour), cache en secours
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
