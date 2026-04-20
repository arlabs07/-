/**
 * sync.js — SyncManager v4
 *
 * What changed from v3:
 *  • watch() is now a pure interval-based system — it calls fetchFn()
 *    every `ms` milliseconds, nothing more. The old fetchAndCompare
 *    wrapping was silently short-circuiting all polls after the first run
 *    (the watcher's own store.set made App.cache.fresh(key) = true, so
 *    every subsequent tick returned early — breaking real-time chat sync).
 *  • Per-watcher `running` flag prevents overlapping / stacked requests.
 *  • document.hidden guard: polls are skipped while the tab is invisible,
 *    saving battery and avoiding pointless Parqra requests.
 *  • visibilitychange listener: the moment the user switches back to the
 *    tab, every active watcher fires once immediately so the UI is fresh.
 *  • fetchAndCompare is kept as an explicit utility (used nowhere in watch
 *    anymore, but available for callers that want hash-based dedup).
 *  • Everything else — store (3-tier cache), delta sync, read receipts,
 *    online presence — is unchanged and correct.
 */

const SyncManager = (() => {

  /* ── TTLs & prefixes ────────────────────────────────────────── */
  const SESSION_TTL  = 2  * 60 * 1000;   // memory / sessionStorage freshness
  const LOCAL_TTL    = 10 * 60 * 1000;   // localStorage freshness
  const PRESENCE_INT = 30 * 1000;        // presence ping cadence
  const SS_PREFIX    = 'spark_ss_';
  const LS_PREFIX    = 'spark_ls_';

  const _watchers   = {};          // key → { timer, fetchFn, ms, running }
  let   _paused     = false;
  let   _presenceTimer = null;

  /* ══════════════════════════════════════════════════════════════
     INTERNAL UTILITIES
     ══════════════════════════════════════════════════════════════ */

  /** djb2 hash — fast string fingerprint for change-detection. */
  const _hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  };

  const _now    = () => Date.now();
  const _serial = (v)   => JSON.stringify({ v, ts: _now() });
  const _deser  = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

  /* ── sessionStorage helpers (2 min TTL) ── */
  const _ssGet = (key) => {
    try {
      const obj = _deser(sessionStorage.getItem(SS_PREFIX + key));
      if (!obj || _now() - obj.ts > SESSION_TTL) {
        sessionStorage.removeItem(SS_PREFIX + key);
        return null;
      }
      return obj.v;
    } catch { return null; }
  };
  const _ssSet = (key, v) => { try { sessionStorage.setItem(SS_PREFIX + key, _serial(v)); } catch {} };
  const _ssDel = (key)    => { try { sessionStorage.removeItem(SS_PREFIX + key); } catch {} };

  /* ── localStorage helpers (10 min TTL) ── */
  const _lsGet = (key) => {
    try {
      const obj = _deser(localStorage.getItem(LS_PREFIX + key));
      if (!obj || _now() - obj.ts > LOCAL_TTL) {
        localStorage.removeItem(LS_PREFIX + key);
        return null;
      }
      return obj.v;
    } catch { return null; }
  };
  const _lsSet = (key, v) => { try { localStorage.setItem(LS_PREFIX + key, _serial(v)); } catch {} };
  const _lsDel = (key)    => { try { localStorage.removeItem(LS_PREFIX + key); } catch {} };

  /* ══════════════════════════════════════════════════════════════
     STORE — unified 3-tier read/write
     (memory → sessionStorage → localStorage)
     ══════════════════════════════════════════════════════════════ */

  const store = {
    /** Read from fastest available tier; promote hits upward. */
    get(key) {
      if (App.cache.fresh(key)) return App.cache.get(key);
      const ss = _ssGet(key);
      if (ss !== null) { App.cache.set(key, ss); return ss; }
      const ls = _lsGet(key);
      if (ls !== null) { App.cache.set(key, ls); _ssSet(key, ls); return ls; }
      return null;
    },

    /** Write to all tiers simultaneously. */
    set(key, value) {
      App.cache.set(key, value);
      _ssSet(key, value);
      _lsSet(key, value);
    },

    del(key)   { App.cache.del(key);   _ssDel(key); _lsDel(key); },
    dirty(key) { App.cache.dirty(key); _ssDel(key); _lsDel(key); },
    hash: _hash,
  };

  /* ══════════════════════════════════════════════════════════════
     FETCH + COMPARE  (explicit utility — NOT used inside watch)
     For callers that want hash-guarded re-renders on their own terms.
     ══════════════════════════════════════════════════════════════ */

  /**
   * Fetch fresh data and compare to cached hash.
   * Returns { value, changed } — changed=false means no re-render needed.
   */
  const fetchAndCompare = async (key, fetchFn) => {
    const fresh      = await fetchFn();
    const freshHash  = _hash(JSON.stringify(fresh));
    const cached     = store.get(key);
    const cachedHash = cached != null ? _hash(JSON.stringify(cached)) : null;

    if (freshHash === cachedHash) {
      // Refresh TTL without triggering a re-render
      _ssSet(key, cached);
      _lsSet(key, cached);
      return { value: cached, changed: false };
    }

    store.set(key, fresh);
    return { value: fresh, changed: true };
  };

  /* ══════════════════════════════════════════════════════════════
     DELTA SYNC  — message-level granularity
     ══════════════════════════════════════════════════════════════ */

  const _chatDeltas = {};

  /** Safe CSS attribute selector escape. */
  const _cssAttrEscape = (str) =>
    str ? str.replace(/["\\]/g, c => `\\${c}`) : '';

  /**
   * Seed the known-message state for a chat.
   * Call once when the ChatWindow loads its initial message list.
   */
  const initChatDelta = (chatId, messages) => {
    const times = (messages || []).map(m => m.time).filter(Boolean);
    const lastMsgTime = times.reduce((max, t) => {
      try { const ts = new Date(t).getTime(); return ts > max ? ts : max; }
      catch { return max; }
    }, 0);
    _chatDeltas[chatId] = { lastMsgTime, msgSet: new Set(times) };
  };

  /**
   * Compute which server messages are new vs. updated vs. removed.
   * Returns { newMsgs, updatedMsgs, deletedTimes }
   */
  const computeDelta = (chatId, serverMsgs) => {
    const delta = _chatDeltas[chatId];
    if (!delta) return { newMsgs: serverMsgs, updatedMsgs: [], deletedTimes: [] };

    const newMsgs     = [];
    const updatedMsgs = [];

    serverMsgs.forEach(msg => {
      if (!delta.msgSet.has(msg.time)) {
        newMsgs.push(msg);
        delta.msgSet.add(msg.time);
      } else {
        updatedMsgs.push(msg);
      }
    });

    const serverTimes  = new Set(serverMsgs.map(m => m.time));
    const deletedTimes = [...delta.msgSet].filter(t => !serverTimes.has(t) && t);

    const allTimes = serverMsgs.map(m => m.time).filter(Boolean);
    if (allTimes.length) {
      delta.lastMsgTime = allTimes.reduce((max, t) => {
        try { const ts = new Date(t).getTime(); return ts > max ? ts : max; }
        catch { return max; }
      }, delta.lastMsgTime);
    }

    return { newMsgs, updatedMsgs, deletedTimes };
  };

  /** Append new message rows to the DOM without touching existing ones. */
  const appendMessages = (areaId, newMsgs, renderMsgHtml, bindMsg) => {
    const area = document.getElementById(areaId); if (!area) return;
    const wasBot = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
    const frag   = document.createDocumentFragment();

    newMsgs.forEach(msg => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderMsgHtml(msg);
      const el = wrapper.firstElementChild;
      if (el) { bindMsg?.(el, msg); frag.appendChild(el); }
    });

    area.appendChild(frag);
    if (wasBot) area.scrollTop = area.scrollHeight;
  };

  /** Patch an existing message row in-place (reactions, edits, deletions). */
  const patchMessage = (msgTime, patchFn) => {
    const escaped = _cssAttrEscape(msgTime);
    const row = document.querySelector(`.msg-row[data-t="${escaped}"]`);
    if (row) patchFn(row);
  };

  /* ══════════════════════════════════════════════════════════════
     READ RECEIPTS
     ══════════════════════════════════════════════════════════════ */

  let _readObserver   = null;
  const _pendingReads = new Set();

  const startReadObserver = (areaId, chatId, myId) => {
    stopReadObserver();
    const area = document.getElementById(areaId); if (!area) return;

    _readObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const row = entry.target;
        const t   = row.dataset.t;
        if (!t) return;
        if (row.classList.contains('sent') || row.classList.contains('system')) return;
        if (_pendingReads.has(t)) return;
        _pendingReads.add(t);
        _markRead(chatId, t, myId);
        _readObserver?.unobserve(row);
      });
    }, { root: area, threshold: 0.3 });

    area.querySelectorAll('.msg-row.recv[data-t]').forEach(r => _readObserver.observe(r));
  };

  const stopReadObserver = () => {
    _readObserver?.disconnect();
    _readObserver = null;
    _pendingReads.clear();
  };

  /** Observe a newly appended message row. */
  const observeRow = (rowEl) => {
    if (_readObserver && rowEl.classList.contains('recv') && rowEl.dataset.t) {
      _readObserver.observe(rowEl);
    }
  };

  const _markRead = async (chatId, msgTime, myId) => {
    try { await Server.markMessageRead(chatId, msgTime, myId); }
    catch {}
  };

  /* ══════════════════════════════════════════════════════════════
     ONLINE PRESENCE
     ══════════════════════════════════════════════════════════════ */

  const startPresence = () => {
    stopPresence();
    _pingPresence();
    _presenceTimer = setInterval(_pingPresence, PRESENCE_INT);
  };

  const stopPresence = () => {
    clearInterval(_presenceTimer);
    _presenceTimer = null;
  };

  const _pingPresence = async () => {
    try { await Server.updatePresence(); } catch {}
  };

  const getPresence = async (userId) => {
    try { return await Server.getUserPresence(userId); }
    catch { return { online: false, last_seen: null }; }
  };

  /* ══════════════════════════════════════════════════════════════
     WATCHERS  — background polling  (v4: fixed, simple, correct)
     ══════════════════════════════════════════════════════════════

     Design principles:
       1. Call fetchFn() on a fixed interval — no cache-freshness gate
          (the old gate was the root bug: after the first run it set the
          cache fresh, so every subsequent tick was skipped entirely).
       2. One request at a time per watcher (running flag).
       3. Skip while document.hidden (saves battery / quota).
       4. On visibilitychange (tab becomes active) fire all watchers
          immediately so the user never sees stale data on return.
  ══════════════════════════════════════════════════════════════ */

  /**
   * Register a watcher that calls fetchFn every `ms` milliseconds.
   *
   * @param {string}   key       - Unique identifier (used to cancel via unwatch)
   * @param {Function} fetchFn   - Async function to call. Return value is ignored.
   * @param {number|{ms:number}} opts - Interval in ms, or options object with .ms
   */
  const watch = (key, fetchFn, opts = {}) => {
    unwatch(key);   // clear any existing watcher for this key

    const ms = typeof opts === 'number' ? opts : (opts.ms ?? 20000);

    const watcher = { fetchFn, ms, running: false, timer: null };

    const tick = async () => {
      // Guard 1: manually paused (e.g. during heavy operations)
      if (_paused) return;
      // Guard 2: tab is not visible — skip to save quota
      if (typeof document !== 'undefined' && document.hidden) return;
      // Guard 3: previous request still in-flight — skip this tick
      if (watcher.running) return;

      watcher.running = true;
      try {
        await fetchFn();
      } catch (e) {
        console.warn(`SyncManager[${key}]:`, e);
      } finally {
        watcher.running = false;
      }
    };

    watcher.timer = setInterval(tick, ms);
    _watchers[key] = watcher;
  };

  const unwatch = (key) => {
    if (_watchers[key]) {
      clearInterval(_watchers[key].timer);
      delete _watchers[key];
    }
  };

  const unwatchAll = () => Object.keys(_watchers).forEach(unwatch);

  const invalidate = (key) => store.dirty(key);
  const touch      = invalidate;   // compat alias

  /**
   * Manually trigger a watcher's fetchFn once, outside the normal interval.
   * Useful after a known data-changing operation.
   */
  const trigger = async (key) => {
    const w = _watchers[key]; if (!w || w.running) return;
    w.running = true;
    try { await w.fetchFn(); }
    catch (e) { console.warn(`SyncManager.trigger[${key}]:`, e); }
    finally { w.running = false; }
  };

  const pause  = () => { _paused = true; };
  const resume = () => { _paused = false; };

  /* ── Page Visibility: wake all watchers when tab becomes active ── */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      // Tab just became visible — immediately fire every active watcher
      // so the user sees fresh data without waiting for the next interval.
      Object.entries(_watchers).forEach(([key, w]) => {
        if (w.running) return;
        w.running = true;
        Promise.resolve(w.fetchFn())
          .catch(e => console.warn(`SyncManager visibility[${key}]:`, e))
          .finally(() => { w.running = false; });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     CROSS-TAB SYNC
     ══════════════════════════════════════════════════════════════ */

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (!e.key?.startsWith(LS_PREFIX)) return;
      // Another tab wrote to localStorage — mark our memory cache dirty
      // so the next watcher tick fetches fresh data.
      const key = e.key.slice(LS_PREFIX.length);
      App.cache.dirty(key);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════════ */

  return {
    // Core polling
    watch, unwatch, unwatchAll, invalidate, touch, trigger,
    pause, resume,
    // Store
    store,
    // Delta sync
    initChatDelta, computeDelta, appendMessages, patchMessage,
    // Read receipts
    startReadObserver, stopReadObserver, observeRow,
    // Presence
    startPresence, stopPresence, getPresence,
    // Explicit hash-guarded fetch utility (call directly when needed)
    fetchAndCompare,
  };
})();