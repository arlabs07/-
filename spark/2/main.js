/**
 * main.js — Spark App Shell v6
 *
 * Changes from v5:
 *  • hideChrome / showChrome are now no-ops on desktop (nav is a sidebar,
 *    hiding it would break the layout). They only act on mobile.
 *  • Window resize listener: when crossing the 768 breakpoint the current
 *    page re-renders so panels adjust without a full reload.
 *  • Desktop: bottom-nav hidden class is never set; the flex sidebar is
 *    always visible. setTitle() is also suppressed on desktop.
 *  • Skeleton helpers, smart cache, toast, modal — all unchanged.
 */

const App = (() => {

  let _page         = null;
  let _isAuth       = false;
  let _suppressHash = false;
  let _resizeTimer  = null;
  let _lastWasDesktop = false;

  const AUTH_PAGES = new Set(['login','signup','forgot','reset']);
  const APP_PAGES  = new Set(['chats','updates','communities','profile']);

  const MODULES = {
    chats:       () => ChatsPage,
    updates:     () => UpdatesPage,
    communities: () => CommunitiesPage,
    profile:     () => ProfilePage,
  };

  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

  /* ══════════════════════════════════════════════════════════
     SKELETON HELPERS
     ══════════════════════════════════════════════════════════ */
  const skel = {
    threads(n = 5) {
      return Array.from({length: n}, () => `
        <div class="skel-thread">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
          </div>
        </div>`).join('');
    },
    communities(n = 4) {
      return Array.from({length: n}, () => `
        <div class="skel-comm">
          <div class="skel skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
            <div class="skel skel-meta"></div>
          </div>
        </div>`).join('');
    },
    statuses(n = 4) {
      return Array.from({length: n}, () => `
        <div class="skel-status">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
          </div>
        </div>`).join('');
    },
    profile() {
      return `
        <div class="skel-profile">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel skel-name"></div>
          <div class="skel skel-sub"></div>
          <div class="skel skel-bio"></div>
        </div>`;
    },
    messages(n = 6) {
      const rows = ['sent','recv','recv','sent','recv','sent'];
      return `<div style="display:flex;flex-direction:column;padding:10px 12px;gap:6px">
        ${Array.from({length: n}, (_,i) => `<div class="skel skel-msg-${rows[i % rows.length]}"></div>`).join('')}
      </div>`;
    }
  };

  /* ══════════════════════════════════════════════════════════
     SMART CACHE
     ══════════════════════════════════════════════════════════ */
  const _store = {};
  const _dirty = new Set();

  const cache = {
    get(k)    { return _store[k] ?? null; },
    set(k, v) { _store[k] = v; _dirty.delete(k); },
    del(k)    { delete _store[k]; _dirty.delete(k); },
    clear()   { Object.keys(_store).forEach(k => delete _store[k]); _dirty.clear(); },
    dirty(k)  { _dirty.add(k); },
    fresh(k)  { return !!_store[k] && !_dirty.has(k); },
    stale(k)  { return !_store[k] || _dirty.has(k); },
  };

  /* ── Toast ─────────────────────────────────────────────── */
  let _toastTimer = null;
  const showToast = (msg, type = '', dur = 3000) => {
    const bar = document.getElementById('toast-bar');
    if (!bar) return;
    bar.textContent = msg;
    bar.className   = type ? `show toast-${type}` : 'show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { bar.className = ''; }, dur);
  };

  /* ── Chrome (header + bottom nav) ──────────────────────── */
  // On desktop: never hide/show chrome — the sidebar is always present.
  // On mobile:  hide when a chat/overlay takes full screen.
  const hideChrome = () => {
    if (_isDesktop()) return;   // ← key fix: no-op on desktop
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
  };
  const showChrome = () => {
    if (_isDesktop()) return;   // ← key fix: no-op on desktop
    document.getElementById('app-header').style.display = '';
    document.getElementById('bottom-nav').style.display = '';
  };

  /* ── Hash ───────────────────────────────────────────────── */
  const setHash = (hash) => { _suppressHash = true; window.location.hash = hash; };
  const goTo    = (hash) => { _suppressHash = false; window.location.hash = hash; };

  /* ── Header ─────────────────────────────────────────────── */
  const setTitle = (title, showBack = false) => {
    // On desktop the header is hidden entirely; skip to avoid flicker
    if (_isDesktop()) return;
    const logo = document.getElementById('hdr-logo');
    const ttl  = document.getElementById('hdr-title');
    const back = document.getElementById('btn-back');
    if (!logo || !ttl || !back) return;
    if (title) {
      logo.classList.add('hidden'); ttl.textContent = title; ttl.classList.remove('hidden');
    } else {
      logo.classList.remove('hidden'); ttl.classList.add('hidden');
    }
    back.classList.toggle('hidden', !showBack);
  };
  const setHeaderActions = () => {};

  /* ── Nav ────────────────────────────────────────────────── */
  const showNav = (show) => {
    if (_isDesktop()) return;   // sidebar always visible on desktop
    document.getElementById('bottom-nav')?.classList.toggle('hidden', !show);
  };

  const setActiveNav = (page) => {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const active = tab.dataset.page === page;
      tab.classList.toggle('active', active);
      const icon = tab.querySelector('.nav-icon');
      if (icon) icon.textContent = active ? tab.dataset.iconOn : tab.dataset.iconOff;
    });
  };

  const showPage = (pageId) => {
    document.querySelectorAll('#main-content .page').forEach(p =>
      p.classList.toggle('active', p.id === `page-${pageId}`)
    );
  };

  /* ── Refresh ────────────────────────────────────────────── */
  const refresh = () => {
    const icon = document.querySelector('#hdr-refresh .material-icons-round');
    if (icon) {
      icon.style.transition = 'transform 0.6s ease';
      icon.style.transform  = 'rotate(360deg)';
      setTimeout(() => { icon.style.transition = ''; icon.style.transform = ''; }, 650);
    }
    cache.dirty(_page);
    _renderPage(_page, null);
  };

  /* ── Router ─────────────────────────────────────────────── */
  const _renderPage = (page, param) => {
    if (!page) return;
    const container = document.getElementById(`page-${page}`);
    if (!container) return;
    switch (page) {
      case 'chats':       ChatsPage.render(container, param);       break;
      case 'updates':     UpdatesPage.render(container);            break;
      case 'communities': CommunitiesPage.render(container, param); break;
      case 'profile':     ProfilePage.render(container, param);     break;
    }
  };

  const navigate = (hash) => {
    const raw   = (hash || '').replace(/^#/, '');
    const parts = raw.split('/');
    const page  = parts[0] || (_isAuth ? 'chats' : 'login');
    const param = parts[1] || null;

    /* ── Invite deep-link ── */
    if (page === 'invite' && param) {
      if (!_isAuth) {
        try { sessionStorage.setItem('spark_pending_invite', param); } catch {}
        window.location.hash = '#login';
        return;
      }
      _handleInvite(param);
      return;
    }

    if (_page && _page !== page && MODULES[_page]) {
      const mod = MODULES[_page]();
      if (typeof mod.destroy === 'function') mod.destroy();
    }

    if (!_isAuth && !AUTH_PAGES.has(page)) { window.location.hash = '#login'; return; }
    if (_isAuth && AUTH_PAGES.has(page))   { window.location.hash = '#chats'; return; }

    _page = page;

    if (AUTH_PAGES.has(page)) {
      showPage('login'); showNav(false); setTitle(null, false);
      LoginPage.render(document.getElementById('page-login'), page, param);
      return;
    }

    if (APP_PAGES.has(page)) {
      showPage(page);
      showNav(true);
      setActiveNav(page);
      setTitle(null, false);
    }

    _renderPage(page, param);
  };

  const _handleInvite = async (token) => {
    showToast('Processing invite link...');
    try {
      const chatId = await Server.acceptInvite(token);
      if (chatId) {
        cache.dirty('chats_threads');
        window.location.hash = `#chats/${chatId}`;
        showToast('Contact added! Starting chat...', 'success');
      } else {
        showToast('Could not open chat from invite', 'error');
        window.location.hash = '#chats';
      }
    } catch (e) {
      showToast(e.message || 'Invalid invite link', 'error');
      window.location.hash = '#chats';
    }
  };

  const checkPendingInvite = async () => {
    try {
      const token = sessionStorage.getItem('spark_pending_invite');
      if (!token) return;
      sessionStorage.removeItem('spark_pending_invite');
      await _handleInvite(token);
    } catch {}
  };

  /* ── Modal ──────────────────────────────────────────────── */
  const showModal = (htmlContent, onClose) => {
    const overlay = document.getElementById('modal-overlay');
    const sheet   = document.getElementById('modal-sheet');
    if (!overlay || !sheet) return () => {};
    sheet.innerHTML = htmlContent;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => sheet.classList.add('open'));
    const close = () => {
      sheet.classList.remove('open');
      overlay.classList.add('hidden');
      if (typeof onClose === 'function') onClose();
    };
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    return close;
  };
  const closeModal = () => {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.getElementById('modal-sheet')?.classList.remove('open');
  };

  /* ── Avatar ─────────────────────────────────────────────── */
  const avatar = (url, name, cls = 'av-md') => {
    const initial = (String(name || '?')[0] || '?').toUpperCase();
    return `<div class="avatar ${cls}">
      ${url ? `<img src="${url}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div class="avatar-placeholder ${cls === 'av-sm' ? 'small' : ''}" style="${url ? 'display:none' : ''}">${initial}</div>
    </div>`;
  };

  /* ── Time ───────────────────────────────────────────────── */
  const timeAgo = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const formatTime = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return ''; }
  };

  /* ── Responsive re-render ────────────────────────────────── */
  // When the user resizes across the mobile/desktop breakpoint, re-render
  // the current page so dual panels appear/disappear correctly.
  const _onResize = () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const nowDesktop = _isDesktop();
      if (nowDesktop !== _lastWasDesktop) {
        _lastWasDesktop = nowDesktop;
        if (_page && APP_PAGES.has(_page)) {
          // Re-render current page so layout updates
          const mod = MODULES[_page]?.();
          if (mod && typeof mod.destroy === 'function') mod.destroy();
          _renderPage(_page, null);
        }
      }
    }, 200);
  };

  /* ── Init ───────────────────────────────────────────────── */
  const init = async () => {
    try {
      if (Server.isLoggedIn()) {
        const v = await Server.validate();
        if (v?.valid) {
          _isAuth = true;
          Server.currentUser    = v.user;
          Server.currentProfile = await Server.getProfile(v.user.id).catch(() => null);
        }
      }
    } catch (_) {}

    _lastWasDesktop = _isDesktop();

    document.getElementById('app-loader').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';

    /* Nav tab clicks */
    document.querySelectorAll('.nav-tab').forEach(tab =>
      tab.addEventListener('click', () => goTo('#' + tab.dataset.page))
    );
    document.getElementById('btn-back')?.addEventListener('click', () => history.back());
    document.getElementById('hdr-refresh')?.addEventListener('click', refresh);

    window.addEventListener('hashchange', () => {
      if (_suppressHash) { _suppressHash = false; return; }
      navigate(window.location.hash);
    });

    window.addEventListener('resize', _onResize, { passive: true });

    navigate(window.location.hash || (_isAuth ? '#chats' : '#login'));

    /* Prevent system callouts / selection */
    document.addEventListener('contextmenu', e => e.preventDefault(), { passive: false });
    document.addEventListener('selectstart', e => {
      const t = e.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault();
    }, { passive: false });
  };

  return {
    init, showToast, setTitle, setHeaderActions,
    showNav, setActiveNav, showModal, closeModal,
    hideChrome, showChrome,
    avatar, timeAgo, formatTime,
    cache, skel,
    isAuth: () => _isAuth, setAuth: v => { _isAuth = v; },
    goTo, setHash, refresh,
    checkPendingInvite,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
