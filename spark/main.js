/**
 * main.js — Spark App Shell v5
 * + Skeleton helpers (App.skel)
 * + Smart cache with dirty tracking
 */

const App = (() => {

  let _page         = null;
  let _isAuth       = false;
  let _suppressHash = false;

  const AUTH_PAGES = new Set(['login','signup','forgot','reset']);
  const APP_PAGES  = new Set(['chats','updates','communities','profile']);

  const MODULES = {
    chats:       () => ChatsPage,
    updates:     () => UpdatesPage,
    communities: () => CommunitiesPage,
    profile:     () => ProfilePage,
  };

  /* ══════════════════════════════════════════════════════════
     SKELETON HELPER  —  centralised skeleton HTML factory
     ══════════════════════════════════════════════════════════ */
  const skel = {
    /** N thread-list skeleton rows */
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
    /** N community skeleton rows */
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
    /** N status skeleton rows */
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
    /** Profile header skeleton */
    profile() {
      return `
        <div class="skel-profile">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel skel-name"></div>
          <div class="skel skel-sub"></div>
          <div class="skel skel-bio"></div>
        </div>`;
    },
    /** Chat messages skeleton */
    messages(n = 6) {
      const rows = ['sent','recv','recv','sent','recv','sent'];
      return `<div style="display:flex;flex-direction:column;padding:10px 12px;gap:6px">
        ${Array.from({length: n}, (_,i) => `<div class="skel skel-msg-${rows[i % rows.length]}"></div>`).join('')}
      </div>`;
    }
  };

  /* ══════════════════════════════════════════════════════════
     SMART CACHE  —  dirty-flag aware
     ══════════════════════════════════════════════════════════ */
  const _store = {};
  const _dirty = new Set();

  const cache = {
    get(k)      { return _store[k] ?? null; },
    set(k, v)   { _store[k] = v; _dirty.delete(k); },
    del(k)      { delete _store[k]; _dirty.delete(k); },
    clear()     { Object.keys(_store).forEach(k => delete _store[k]); _dirty.clear(); },
    /** Mark key stale — will force re-fetch on next load */
    dirty(k)    { _dirty.add(k); },
    /** True if cache has data AND is not dirty */
    fresh(k)    { return !!_store[k] && !_dirty.has(k); },
    /** True if missing or dirty */
    stale(k)    { return !_store[k] || _dirty.has(k); },
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

  /* ── Chrome ─────────────────────────────────────────────── */
  const hideChrome = () => {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
  };
  const showChrome = () => {
    document.getElementById('app-header').style.display = '';
    document.getElementById('bottom-nav').style.display = '';
  };

  /* ── Hash ───────────────────────────────────────────────── */
  const setHash = (hash) => { _suppressHash = true; window.location.hash = hash; };
  const goTo    = (hash) => { _suppressHash = false; window.location.hash = hash; };

  /* ── Header ─────────────────────────────────────────────── */
  const setTitle = (title, showBack = false) => {
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
    // Mark current page cache as dirty to force reload
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
      showPage(page); showNav(true); setActiveNav(page); setTitle(null, false);
    }

    _renderPage(page, param);
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
      <div class="avatar-placeholder" style="${url ? 'display:none' : ''}">${initial}</div>
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

    document.getElementById('app-loader').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';

    document.querySelectorAll('.nav-tab').forEach(tab =>
      tab.addEventListener('click', () => goTo('#' + tab.dataset.page))
    );
    document.getElementById('btn-back')?.addEventListener('click', () => history.back());
    document.getElementById('hdr-refresh')?.addEventListener('click', refresh);

    window.addEventListener('hashchange', () => {
      if (_suppressHash) { _suppressHash = false; return; }
      navigate(window.location.hash);
    });

    navigate(window.location.hash || (_isAuth ? '#chats' : '#login'));

    // Disable system image long-press overlay and text-selection handles
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
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
