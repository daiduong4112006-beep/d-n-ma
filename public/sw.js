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

async function remember(cacheName, key, response, max) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response.clone());
    if (max) await trim(cacheName, max);
  } catch {
    // Cache quota/private mode must never turn a successful network request into an error.
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: dùng bản đã lưu, cập nhật ngầm
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return; // Auth, Supabase, AI: always use the network.
  if (url.pathname.startsWith('/api/')) return;

  // Trang (điều hướng): ưu tiên mạng, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          // Do not replace the working offline app with a proxy/server error page.
          if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
            await remember(SHELL, '/', res);
          }
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
        fetch(req).then(async (res) => {
          if (res.ok) await remember(ASSETS, req, res, 150);
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
        .then(async (res) => {
          if (res.ok || res.type === 'opaque') await remember(MEDIA, req, res, 400);
          return res;
        })
        .catch(() => hit);
      event.waitUntil(network.then(() => undefined));
      return hit || network;
    })
  );
});
