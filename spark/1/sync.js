/**
 * sync.js — SyncManager v3
 *
 * Architecture:
 *  • 3-tier cache: memory → sessionStorage → localStorage
 *  • Delta sync: only fetches messages newer than last-known timestamp
 *  • Partial DOM patch: appends new message rows without re-rendering existing ones
 *  • Read receipts: marks messages read via IntersectionObserver when visible
 *  • Online presence: pings server every 30s with last_seen; shows "online / last seen X" in header
 *  • Optimistic-first: UI updates instantly from local state, server confirms in background
 *  • Cross-tab sync via localStorage storage events
 */

const SyncManager = (() => {

  const SESSION_TTL  = 2  * 60 * 1000;   // 2 min
  const LOCAL_TTL    = 10 * 60 * 1000;   // 10 min
  const PRESENCE_INT = 30 * 1000;        // ping every 30s
  const SS_PREFIX    = 'spark_ss_';
  const LS_PREFIX    = 'spark_ls_';

  const _watchers   = {};
  let   _paused     = false;
  let   _presenceTimer = null;

  /* ══════════════════════════════════════════════════════════
     INTERNAL UTILITIES
     ══════════════════════════════════════════════════════════ */

  /** djb2 hash — fast string fingerprint */
  const _hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  };

  const _now     = () => Date.now();
  const _serial  = (v) => JSON.stringify({ v, ts: _now() });
  const _deser   = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

  /* ── sessionStorage helpers ── */
  const _ssGet = (key) => {
    try {
      const obj = _deser(sessionStorage.getItem(SS_PREFIX + key));
      if (!obj || _now() - obj.ts > SESSION_TTL) { sessionStorage.removeItem(SS_PREFIX + key); return null; }
      return obj.v;
    } catch { return null; }
  };
  const _ssSet = (key, v) => { try { sessionStorage.setItem(SS_PREFIX + key, _serial(v)); } catch {} };
  const _ssDel = (key)    => { try { sessionStorage.removeItem(SS_PREFIX + key); } catch {} };

  /* ── localStorage helpers ── */
  const _lsGet = (key) => {
    try {
      const obj = _deser(localStorage.getItem(LS_PREFIX + key));
      if (!obj || _now() - obj.ts > LOCAL_TTL) { localStorage.removeItem(LS_PREFIX + key); return null; }
      return obj.v;
    } catch { return null; }
  };
  const _lsSet = (key, v) => { try { localStorage.setItem(LS_PREFIX + key, _serial(v)); } catch {} };
  const _lsDel = (key)    => { try { localStorage.removeItem(LS_PREFIX + key); } catch {} };

  /* ══════════════════════════════════════════════════════════
     STORE — unified 3-tier read/write
     ══════════════════════════════════════════════════════════ */

  const store = {
    /** Read from fastest tier available; warm higher tiers on a lower-tier hit. */
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

    /** Remove from all tiers. */
    del(key) { App.cache.del(key); _ssDel(key); _lsDel(key); },

    /** Mark dirty across all tiers → next fetch hits server. */
    dirty(key) { App.cache.dirty(key); _ssDel(key); _lsDel(key); },

    /** Hash a value. */
    hash: _hash,
  };

  /* ══════════════════════════════════════════════════════════
     FETCH + COMPARE  (hash-guarded — no wasted re-renders)
     ══════════════════════════════════════════════════════════ */

  /**
   * Fetch fresh data and compare to cached hash.
   * Returns { value, changed } — changed=false means no re-render needed.
   */
  const fetchAndCompare = async (key, fetchFn) => {
    const fresh     = await fetchFn();
    const freshHash = _hash(JSON.stringify(fresh));
    const cached    = store.get(key);
    const cachedHash = cached != null ? _hash(JSON.stringify(cached)) : null;

    if (freshHash === cachedHash) {
      // Refresh TTL without marking changed
      _ssSet(key, cached); _lsSet(key, cached);
      return { value: cached, changed: false };
    }

    store.set(key, fresh);
    return { value: fresh, changed: true };
  };

  /* ══════════════════════════════════════════════════════════
     DELTA SYNC  — message-level granularity
     ══════════════════════════════════════════════════════════ */

  const _chatDeltas = {};

  /** Safe CSS attribute selector escape (avoids CSS.escape browser gaps) */
  const _cssAttrEscape = (str) =>
    str ? str.replace(/["\\]/g, c => `\\${c}`) : '';

  const initChatDelta = (chatId, messages) => {
    const times = (messages || []).map(m => m.time).filter(Boolean);
    // Use reduce instead of Math.max(...) to avoid call-stack overflow on large arrays
    const lastMsgTime = times.reduce((max, t) => {
      try { const ts = new Date(t).getTime(); return ts > max ? ts : max; }
      catch { return max; }
    }, 0);
    _chatDeltas[chatId] = {
      lastMsgTime,
      msgSet: new Set(times),
    };
  };

  /**
   * Compute delta between known messages and fresh server messages.
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
        // Could be an edit / reaction update — mark for patch
        updatedMsgs.push(msg);
      }
    });

    // Detect soft-deletes (message changed to deleted state)
    const serverTimes = new Set(serverMsgs.map(m => m.time));
    const deletedTimes = [...delta.msgSet].filter(t => !serverTimes.has(t) && t);

    // Advance watermark — use reduce to avoid spread call-stack overflow
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
    // Use attribute selector with escaped value instead of CSS.escape (broader compat)
    const escaped = _cssAttrEscape(msgTime);
    const row = document.querySelector(`.msg-row[data-t="${escaped}"]`);
    if (row) patchFn(row);
  };

  /* ══════════════════════════════════════════════════════════
     READ RECEIPTS
     ══════════════════════════════════════════════════════════ */

  let _readObserver = null;
  const _pendingReads = new Set();

  /**
   * Start observing the message area.
   * Uses IntersectionObserver at 0.3 threshold — marks a received
   * message as "read" as soon as 30% of it enters the viewport.
   */
  const startReadObserver = (areaId, chatId, myId) => {
    stopReadObserver();
    const area = document.getElementById(areaId); if (!area) return;

    _readObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const row = entry.target;
        const t   = row.dataset.t;
        if (!t) return;
        // Only mark RECEIVED messages
        if (row.classList.contains('sent') || row.classList.contains('system')) return;
        if (_pendingReads.has(t)) return;
        _pendingReads.add(t);
        _markRead(chatId, t, myId);
        // Unobserve after marking
        _readObserver?.unobserve(row);
      });
    }, {
      root: area,
      threshold: 0.3,   // 30% visible = considered "read"
    });

    // Observe all current recv rows
    area.querySelectorAll('.msg-row.recv[data-t]').forEach(r => _readObserver.observe(r));
  };

  const stopReadObserver = () => {
    _readObserver?.disconnect();
    _readObserver = null;
    _pendingReads.clear();
  };

  /** Observe a newly appended message row (called after appendMessages). */
  const observeRow = (rowEl) => {
    if (_readObserver && rowEl.classList.contains('recv') && rowEl.dataset.t) {
      _readObserver.observe(rowEl);
    }
  };

  /** Server call + immediate DOM tick update */
  const _markRead = async (chatId, msgTime, myId) => {
    try {
      await Server.markMessageRead(chatId, msgTime, myId);
      // Update the tick icon on the SENDER'S side will happen via next poll
      // For the current user's view: no change needed (recv has no tick)
    } catch {}
  };

  /* ══════════════════════════════════════════════════════════
     ONLINE PRESENCE
     ══════════════════════════════════════════════════════════ */

  const startPresence = () => {
    stopPresence();
    _pingPresence();
    _presenceTimer = setInterval(_pingPresence, PRESENCE_INT);
  };

  const stopPresence = () => {
    clearInterval(_presenceTimer); _presenceTimer = null;
  };

  const _pingPresence = async () => {
    try { await Server.updatePresence(); } catch {}
  };

  /**
   * Get presence info for a user.
   * Returns { online: bool, last_seen: ISO string | null }
   */
  const getPresence = async (userId) => {
    try { return await Server.getUserPresence(userId); }
    catch { return { online: false, last_seen: null }; }
  };

  /* ══════════════════════════════════════════════════════════
     WATCHERS  — background polling
     ══════════════════════════════════════════════════════════ */

  /**
   * Register a background watcher.
   * opts: { ms, onUpdate(newValue) }  or just a number (ms)
   */
  const watch = (key, fetchFn, opts = {}) => {
    unwatch(key);
    const ms       = typeof opts === 'number' ? opts : (opts.ms ?? 20000);
    const onUpdate = typeof opts === 'object' ? opts.onUpdate : null;

    const tick = async () => {
      if (_paused) return;
      const cached = store.get(key);
      if (cached !== null && App.cache.fresh(key)) return;   // all tiers fresh
      try {
        const { value, changed } = await fetchAndCompare(key, fetchFn);
        if (changed && typeof onUpdate === 'function') onUpdate(value);
      } catch (e) { console.warn(`SyncManager[${key}]:`, e); }
    };

    _watchers[key] = { fetchFn, ms, onUpdate, timer: setInterval(tick, ms) };
  };

  const unwatch    = (key) => { if (_watchers[key]) { clearInterval(_watchers[key].timer); delete _watchers[key]; } };
  const unwatchAll = ()    => Object.keys(_watchers).forEach(unwatch);
  const invalidate = (key) => store.dirty(key);
  const touch      = invalidate;   // compat alias

  const trigger = async (key) => {
    const w = _watchers[key]; if (!w) return;
    try {
      const { value, changed } = await fetchAndCompare(key, w.fetchFn);
      if (changed && typeof w.onUpdate === 'function') w.onUpdate(value);
    } catch {}
  };

  const pause  = () => { _paused = true; };
  const resume = () => { _paused = false; };

  /* ══════════════════════════════════════════════════════════
     CROSS-TAB SYNC
     ══════════════════════════════════════════════════════════ */

  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(LS_PREFIX)) return;
    const key = e.key.slice(LS_PREFIX.length);
    App.cache.dirty(key);
  });

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════ */

  return {
    // Core
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
    // Utilities
    fetchAndCompare,
  };
})();
