/**
 * sw.js — Spark Service Worker v2
 *
 * Strategy:
 *  • App-shell files  → CacheFirst (CSS/JS/HTML/fonts)
 *  • Parqra API calls → NetworkFirst (real-time data)
 *  • Images/CDN       → StaleWhileRevalidate
 *  • Offline fallback → Cached shell index.html
 *
 * Data persistence:
 *  • App posts 'SAVE_DATA' messages with current store snapshot
 *  • SW saves payload to a dedicated 'spark-data-v1' cache as synthetic
 *    JSON responses, keyed by arbitrary string keys
 *  • On startup the app reads them back via 'GET_DATA' messages
 *  • On activate, old caches are deleted
 */

const SHELL_CACHE   = 'spark-shell-v10';
const DATA_CACHE    = 'spark-data-v1';
const CDN_CACHE     = 'spark-cdn-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './main.css',
  './main.js',
  './login.css',
  './login.js',
  './chat.css',
  './chat.js',
  './chats.css',
  './chats.js',
  './communities.css',
  './communities.js',
  './profile.css',
  './profile.js',
  './updates.css',
  './updates.js',
  './camera.css',
  './camera.js',
  './sync.js',
  './encryption.js',
  './server.js',
  './ai.js',
  './manifest.json',
];

/* ── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      // Cache shell files, ignoring individual failures
      return Promise.allSettled(
        SHELL_FILES.map(f =>
          cache.add(f).catch(() => {/* ignore missing files during dev */})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ────────────────────────────────────────────── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      const keep = new Set([SHELL_CACHE, DATA_CACHE, CDN_CACHE]);
      return Promise.all(
        keys.filter(k => !keep.has(k)).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* ── FETCH ───────────────────────────────────────────────── */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin service-worker scripts, and extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── Parqra API: NetworkFirst ──
  if (url.hostname.includes('supabase.co') || url.hostname.includes('pollinations.ai')) {
    e.respondWith(networkFirst(request));
    return;
  }

  // ── Google Fonts (external, immutable): CacheFirst ──
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  // ── CDN images / avatars: StaleWhileRevalidate ──
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i)) {
    e.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // ── App shell files: CacheFirst, fall back to network ──
  if (url.origin === self.location.origin) {
    e.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
});

/* ── CACHE STRATEGIES ────────────────────────────────────── */

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Offline: nothing we can do for API calls
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No network connection' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh the cache entry in the background
    refreshInBackground(request, cacheName);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('./index.html');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  return cached || await networkPromise || new Response('', { status: 404 });
}

function refreshInBackground(request, cacheName) {
  // Skip versioned files — they're immutable by URL
  const url = request.url;
  if (url.includes('?v=')) return;

  fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response));
    }
  }).catch(() => {});
}

/* ── MESSAGES FROM APP ───────────────────────────────────── */
// The app posts structured messages to save/retrieve offline data.
//
// SAVE_DATA  { type, key, data }   → stores JSON blob in DATA_CACHE
// GET_DATA   { type, key }         → replies with stored blob or null
// CLEAR_DATA { type }              → deletes all keys in DATA_CACHE

self.addEventListener('message', (e) => {
  const { data: msg, ports } = e;
  if (!msg || !msg.type) return;

  if (msg.type === 'SAVE_DATA') {
    // Persist a JSON snapshot keyed by msg.key
    const payload = JSON.stringify({ ts: Date.now(), data: msg.data });
    const response = new Response(payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    caches.open(DATA_CACHE).then(cache => {
      cache.put(`/_sw_data_/${msg.key}`, response);
    });
    return;
  }

  if (msg.type === 'GET_DATA') {
    caches.open(DATA_CACHE).then(async cache => {
      const resp = await cache.match(`/_sw_data_/${msg.key}`);
      if (resp) {
        const json = await resp.json();
        ports[0]?.postMessage({ ok: true, data: json.data, ts: json.ts });
      } else {
        ports[0]?.postMessage({ ok: false, data: null });
      }
    });
    return;
  }

  if (msg.type === 'CLEAR_DATA') {
    caches.open(DATA_CACHE).then(async cache => {
      const keys = await cache.keys();
      await Promise.all(keys.map(k => cache.delete(k)));
      ports[0]?.postMessage({ ok: true });
    });
    return;
  }

  if (msg.type === 'UPDATE_SHELL') {
    // Force-refresh all shell files (called after detecting new version)
    e.waitUntil(
      caches.open(SHELL_CACHE).then(cache => {
        return Promise.allSettled(
          SHELL_FILES.map(f => fetch(f).then(r => r.ok ? cache.put(f, r) : null).catch(() => {}))
        );
      }).then(() => ports[0]?.postMessage({ ok: true }))
    );
    return;
  }
});

/* ── BACKGROUND SYNC (for offline message queue) ─────────── */
self.addEventListener('sync', (e) => {
  if (e.tag === 'spark-offline-queue') {
    e.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  // The app stores failed requests in DATA_CACHE under '_queue_'
  const cache   = await caches.open(DATA_CACHE);
  const qResp   = await cache.match('/_sw_data_/_queue_');
  if (!qResp) return;

  const { data: queue } = await qResp.json();
  if (!Array.isArray(queue) || !queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await fetch(item.url, {
        method:  item.method,
        headers: item.headers,
        body:    item.body,
      });
    } catch {
      remaining.push(item);
    }
  }

  // Save remaining (failed) items back
  const updated = new Response(JSON.stringify({ ts: Date.now(), data: remaining }), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put('/_sw_data_/_queue_', updated);
}
