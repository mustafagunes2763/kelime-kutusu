// Kelime Kutusu servis çalışanı: uygulamayı önbellekten anında açar, arka planda günceller.
const CACHE = 'kk-v6';
const FB = 'https://www.gstatic.com/firebasejs/11.0.2/';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase kütüphanesi ve yazı tipleri: sürüm numaralı, değişmez; önce önbellek.
  if (url.href.startsWith(FB) || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => put(req, res))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json')) return; // sürüm kontrolü hep internetten
  // Kelime paketleri: önce internet (yeni paketler hemen görünsün), yoksa önbellek.
  if (url.pathname.includes('/packs/') || url.pathname.endsWith('seed.json')) {
    e.respondWith(fetch(req).then(res => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Sitenin kendi dosyaları: önbellekten hemen aç, arka planda internetten tazele.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
    const net = fetch(req).then(res => put(req, res)).catch(() => cached || caches.match('./index.html'));
    return cached || net;
  }));
});
