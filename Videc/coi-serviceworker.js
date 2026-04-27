/*
 * coi-serviceworker — Cross-Origin Isolation Service Worker
 * Enables SharedArrayBuffer access required by FFmpeg WASM
 * Based on https://github.com/gzuidhof/coi-serviceworker (MIT)
 */

if (typeof window === 'undefined') {
  // ── SERVICE WORKER SCOPE ──────────────────────────────────────────────────
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil(clients.claim()));

  self.addEventListener('fetch', function (event) {
    if (
      event.request.cache === 'only-if-cached' &&
      event.request.mode !== 'same-origin'
    ) return;

    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch(e => console.error('[COI-SW]', e))
    );
  });

} else {
  // ── MAIN THREAD SCOPE ─────────────────────────────────────────────────────
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem('coi-reloaded');
    window.sessionStorage.removeItem('coi-reloaded');

    // Already isolated — nothing to do
    if (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated) return;

    // Not a secure context (e.g., file:// protocol)
    if (!window.isSecureContext) {
      console.warn('[COI] Requires a secure context. Use http://localhost or HTTPS.');
      window.__coiFailed = true;
      return;
    }

    // Reload loop protection
    if (reloadedBySelf) {
      console.warn('[COI] Could not achieve cross-origin isolation after reload.');
      window.__coiFailed = true;
      return;
    }

    // Register this script as a service worker, then reload
    navigator.serviceWorker
      .register(window.document.currentScript.src)
      .then(reg => {
        if (reg.installing) {
          window.sessionStorage.setItem('coi-reloaded', '1');
          window.location.reload();
        }
      })
      .catch(err => {
        console.error('[COI] SW registration failed:', err);
        window.__coiFailed = true;
      });
  })();
}
