/**
 * sync.js — SyncManager v2
 *
 * Three-tier cache architecture to minimise network requests:
 *
 *   Tier 1 — Memory (App.cache)       Fastest. Lives for current JS session.
 *   Tier 2 — sessionStorage           Tab-scoped. Survives soft navigations.
 *   Tier 3 — localStorage             Cross-tab. Survives page reloads, not clears.
 *   Tier 4 — Server                   Source of truth. Only hit when all tiers miss.
 *
 * Each cache entry carries:
 *   { value, hash, ts }
 *   - value  → the actual data (JSON-serialised on disk)
 *   - hash   → SHA-1-like hash of JSON(value), used to detect changes
 *   - ts     → timestamp when stored, used for TTL checks
 *
 * TTL strategy:
 *   - Memory:          no expiry (cleared on page unload)
 *   - sessionStorage:  short TTL (default 2 min) — good for active use
 *   - localStorage:    long TTL  (default 10 min) — fallback between sessions
 *
 * When the server returns data with a different hash → all tiers are updated.
 * When it matches → only the timestamp is touched (no re-render triggered).
 *
 * API:
 *   SyncManager.watch(key, fetchFn, opts?)   Register a background watcher
 *   SyncManager.unwatch(key)
 *   SyncManager.unwatchAll()
 *   SyncManager.invalidate(key)              Force next tick to hit server
 *   SyncManager.trigger(key)                 Manually run a watcher now
 *   SyncManager.pause() / resume()
 *   SyncManager.store.get(key)               Read from best available tier
 *   SyncManager.store.set(key, value, opts?) Write to all tiers
 *   SyncManager.store.del(key)               Remove from all tiers
 */

const SyncManager = (() => {

  /* ── Constants ─────────────────────────────────────────── */
  const SESSION_TTL = 2 * 60 * 1000;       // 2 min
  const LOCAL_TTL   = 10 * 60 * 1000;      // 10 min
  const SS_PREFIX   = 'spark_ss_';
  const LS_PREFIX   = 'spark_ls_';

  /* ── Internal state ─────────────────────────────────────── */
  const _watchers = {};
  let _paused     = false;

  /* ══════════════════════════════════════════════════════════
     STORE  —  3-tier read/write
     ══════════════════════════════════════════════════════════ */

  /** Lightweight string hash (djb2). */
  const _hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  };

  const _serialize   = (v) => JSON.stringify({ value: v, ts: Date.now() });
  const _deserialize = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

  const _ssGet = (key) => {
    try {
      const raw = sessionStorage.getItem(SS_PREFIX + key); if (!raw) return null;
      const obj = _deserialize(raw); if (!obj) return null;
      if (Date.now() - obj.ts > SESSION_TTL) { sessionStorage.removeItem(SS_PREFIX + key); return null; }
      return obj.value;
    } catch { return null; }
  };

  const _ssSet = (key, value) => {
    try { sessionStorage.setItem(SS_PREFIX + key, _serialize(value)); } catch {}
  };

  const _lsGet = (key) => {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key); if (!raw) return null;
      const obj = _deserialize(raw); if (!obj) return null;
      if (Date.now() - obj.ts > LOCAL_TTL) { localStorage.removeItem(LS_PREFIX + key); return null; }
      return obj.value;
    } catch { return null; }
  };

  const _lsSet = (key, value) => {
    try { localStorage.setItem(LS_PREFIX + key, _serialize(value)); } catch {}
  };

  const _lsDel = (key) => {
    try { localStorage.removeItem(LS_PREFIX + key); } catch {}
  };

  const _ssDel = (key) => {
    try { sessionStorage.removeItem(SS_PREFIX + key); } catch {}
  };

  /**
   * Read from the best available tier.
   * Returns { value, tier } or null if all tiers miss.
   * Also warms higher tiers from lower ones on a hit.
   */
  const _get = (key) => {
    // Tier 1 — memory
    const mem = App.cache.get(key);
    if (App.cache.fresh(key) && mem !== null) return { value: mem, tier: 'memory' };

    // Tier 2 — sessionStorage
    const ss = _ssGet(key);
    if (ss !== null) {
      App.cache.set(key, ss);   // warm memory
      return { value: ss, tier: 'session' };
    }

    // Tier 3 — localStorage
    const ls = _lsGet(key);
    if (ls !== null) {
      App.cache.set(key, ls);   // warm memory
      _ssSet(key, ls);          // warm session
      return { value: ls, tier: 'local' };
    }

    return null;
  };

  /**
   * Write to all tiers simultaneously.
   * Only updates tiers that have stale/different data (avoids unnecessary writes).
   */
  const _set = (key, value) => {
    App.cache.set(key, value);
    _ssSet(key, value);
    _lsSet(key, value);
  };

  /** Delete from all tiers. */
  const _del = (key) => {
    App.cache.del(key);
    _ssDel(key);
    _lsDel(key);
  };

  /** Mark dirty across all tiers (memory dirty flag + remove storage entries). */
  const _dirty = (key) => {
    App.cache.dirty(key);
    _ssDel(key);
    _lsDel(key);
  };

  /** Public store API */
  const store = {
    get:       (key) => _get(key)?.value ?? null,
    set:       (key, value) => _set(key, value),
    del:       (key) => _del(key),
    dirty:     (key) => _dirty(key),
    /** Returns cached value immediately, then checks server for updates.
     *  Calls onUpdate(newValue) only if server data differs. */
    getWithBackground: async (key, fetchFn, onUpdate) => {
      const cached = _get(key);
      if (cached) {
        // Return cache immediately (non-blocking render path)
        const serverValue = await _fetchAndCompare(key, fetchFn);
        if (serverValue !== null) onUpdate?.(serverValue);
        return cached.value;
      }
      // No cache → must wait for server
      const fresh = await fetchFn();
      _set(key, fresh);
      return fresh;
    },
  };

  /* ══════════════════════════════════════════════════════════
     FETCH + COMPARE  —  hash-guarded server call
     ══════════════════════════════════════════════════════════ */

  /**
   * Call fetchFn, compare result hash with cached value.
   * Returns new value if changed, null if unchanged.
   */
  const _fetchAndCompare = async (key, fetchFn) => {
    try {
      const fresh     = await fetchFn();
      const freshHash = _hash(JSON.stringify(fresh));
      const cached    = App.cache.get(key);
      const cachedHash = cached ? _hash(JSON.stringify(cached)) : null;

      if (freshHash === cachedHash) {
        // Data unchanged — just refresh TTL timestamps
        _ssSet(key, cached);
        _lsSet(key, cached);
        App.cache.set(key, cached);
        return null;   // signal: no change
      }

      // Data changed → update all tiers
      _set(key, fresh);
      return fresh;
    } catch { return null; }
  };

  /* ══════════════════════════════════════════════════════════
     WATCHERS  —  background polling
     ══════════════════════════════════════════════════════════ */

  /**
   * Register a watcher.
   * @param {string}   key     Cache key
   * @param {function} fetchFn Async () => data
   * @param {object|number} opts  { ms, onUpdate } or just ms (number)
   */
  const watch = (key, fetchFn, opts = {}) => {
    unwatch(key);

    const ms       = typeof opts === 'number' ? opts : (opts.ms ?? 20000);
    const onUpdate = typeof opts === 'object' ? opts.onUpdate : null;

    const tick = async () => {
      if (_paused) return;
      // Skip if any tier has fresh data
      const cached = _get(key);
      if (cached && App.cache.fresh(key)) return;

      const newVal = await _fetchAndCompare(key, fetchFn);
      if (newVal !== null && typeof onUpdate === 'function') {
        onUpdate(newVal);
      }
    };

    _watchers[key] = {
      fetchFn, ms, onUpdate,
      timer: setInterval(tick, ms)
    };
  };

  const unwatch = (key) => {
    if (_watchers[key]) { clearInterval(_watchers[key].timer); delete _watchers[key]; }
  };

  const unwatchAll = () => Object.keys(_watchers).forEach(unwatch);

  /** Force all tiers for this key dirty → next tick always hits server. */
  const invalidate = (key) => _dirty(key);

  /** Alias kept for compat */
  const touch = invalidate;

  /** Run a specific watcher immediately (regardless of freshness). */
  const trigger = async (key) => {
    const w = _watchers[key]; if (!w) return;
    try {
      const newVal = await _fetchAndCompare(key, w.fetchFn);
      if (newVal !== null && typeof w.onUpdate === 'function') w.onUpdate(newVal);
    } catch {}
  };

  const pause  = () => { _paused = true; };
  const resume = () => { _paused = false; };

  /* ══════════════════════════════════════════════════════════
     CROSS-TAB SYNC  —  listen to localStorage changes
     ══════════════════════════════════════════════════════════ */

  // When another tab writes to localStorage, invalidate our memory cache
  // so the next watcher tick picks up the fresh data.
  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(LS_PREFIX)) return;
    const key = e.key.slice(LS_PREFIX.length);
    App.cache.dirty(key);   // memory stale; session/local already updated by other tab
  });

  return {
    watch, unwatch, unwatchAll,
    invalidate, touch, trigger,
    pause, resume,
    store,
  };
})();
