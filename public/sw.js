/* DUN MASTER – Service worker: cho phép mở app và ôn tập khi mất mạng. */
const SHELL = 'dun-shell-v1';
const ASSETS = 'dun-assets-v1';
const MEDIA = 'dun-media-v1';
const KEEP = [SHELL, ASSETS, MEDIA];
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: dùng bản đã lưu, cập nhật ngầm
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return; // Firebase, Gemini… đi thẳng mạng
  if (url.pathname.startsWith('/api/')) return;

  // Trang (điều hướng): ưu tiên mạng, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/', { cacheName: SHELL }))
    );
    return;
  }

  // File build có mã băm trong tên → không bao giờ đổi → lấy cache trước
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(ASSETS).then((c) => c.put(req, copy)).then(() => trim(ASSETS, 150));
          }
          return res;
        })
      )
    );
    return;
  }

  // Ảnh SPK, font, icon…: trả bản đã lưu ngay, đồng thời tải bản mới
  event.respondWith(
    caches.open(MEDIA).then(async (cache) => {
      const hit = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).then(() => trim(MEDIA, 400));
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
