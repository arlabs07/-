/**
 * sw.js — Spark Service Worker v1
 *
 * Strategy: Network-only.
 * The app runs entirely online. This service worker exists purely to
 * satisfy the PWA installability requirement. It does NOT cache anything
 * and does NOT enable offline mode — all requests go straight to the network.
 *
 * This means:
 *  - App is installable to home screen / desktop
 *  - All data is always fresh from the server
 *  - No stale content issues
 *  - No extra storage usage
 */

const SW_VERSION = 'spark-v1';

/* Install — skip waiting so new SW activates immediately */
self.addEventListener('install', () => {
  self.skipWaiting();
});

/* Activate — claim all clients immediately */
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

/* Fetch — pure network passthrough */
self.addEventListener('fetch', e => {
  // Only intercept GET requests; let POST/etc go normally
  if (e.request.method !== 'GET') return;

  // Pass all requests straight to the network
  e.respondWith(
    fetch(e.request).catch(() => {
      // If completely offline, return a minimal offline page
      return new Response(
        `<!DOCTYPE html><html><head><title>Spark</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;
          justify-content:center;height:100vh;margin:0;background:#000;color:#f0f0f0;gap:16px;text-align:center;}
          h2{margin:0}p{color:#5a5a5a;font-size:13px}</style></head>
        <body><h2>⚡ Spark</h2>
          <p>You're offline.<br>Spark requires an internet connection to work.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
