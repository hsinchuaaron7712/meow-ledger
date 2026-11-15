// 喵喵代付帳 service worker：讓 App 在完全離線時也能打開
// 改了 index.html 之後，把版本號 +1，手機上的 App 就會更新
const CACHE = 'meow-ledger-v5';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];
const LIB_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isApp = url.origin === location.origin;
  const isLib = LIB_HOSTS.includes(url.hostname);
  if (!isApp && !isLib) return; // Firestore、登入等請求直接走網路

  if (isApp) {
    // App 本身：先拿網路上的新版，離線時用快取
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else {
    // Firebase SDK、字型：版本固定，先用快取
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
  }
});
