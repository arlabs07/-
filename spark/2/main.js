/**
 * main.js — Spark App Shell v9
 * - No service worker
 * - Clears old SW caches on boot
 * - Guest mode: invite-only, chats page only
 * - Desktop: NO sidebar — nav pill lives inside left panels
 * - Mobile: 5-tab floating pill (#bottom-nav) with chats/updates/groups/people/profile
 */

const App = (() => {

  let _page           = null;
  let _isAuth         = false;
  let _suppressHash   = false;
  let _resizeTimer    = null;
  let _lastWasDesktop = false;
  let _guestMode      = false;

  const AUTH_PAGES = new Set(['login','signup','forgot','reset']);
  const APP_PAGES  = new Set(['chats','updates','communities','people','profile']);

  const MODULES = {
    chats:       () => ChatsPage,
    updates:     () => UpdatesPage,
    communities: () => CommunitiesPage,
    people:      () => ChatsPage,   // people tab renders inside ChatsPage
    profile:     () => ProfilePage,
  };

  const _isDesktop = () => window.matchMedia('(min-width:768px)').matches;

  /* ── Clear old SW caches ─────────────────────────────────── */
  const _clearOldCaches = () => {
    if ('caches' in window) {
      caches.keys().then(keys =>
        keys.forEach(k => { if (k.startsWith('spark-')) caches.delete(k).catch(()=>{}); })
      ).catch(()=>{});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister().catch(()=>{})))
        .catch(()=>{});
    }
    try {
      const toRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('spark_ss_')) toRemove.push(k);
      }
      toRemove.forEach(k => sessionStorage.removeItem(k));
    } catch {}
    try {
      const pfx = 'spark_ls_';
      const cut = Date.now() - 24*60*60*1000;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(pfx)) continue;
        try {
          const obj = JSON.parse(localStorage.getItem(k));
          if (obj?.ts && obj.ts < cut) localStorage.removeItem(k);
        } catch { localStorage.removeItem(k); }
      }
    } catch {}
  };

  /* ══════════════════════════════════════════════════════════
     SKELETON HELPERS
     ══════════════════════════════════════════════════════════ */
  const skel = {
    threads(n=5) {
      return Array.from({length:n},()=>`
        <div class="skel-thread">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
          </div>
        </div>`).join('');
    },
    communities(n=4) {
      return Array.from({length:n},()=>`
        <div class="skel-comm">
          <div class="skel skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
            <div class="skel skel-meta"></div>
          </div>
        </div>`).join('');
    },
    statuses(n=4) {
      return Array.from({length:n},()=>`
        <div class="skel-status">
          <div class="skel skel-circle skel-av"></div>
          <div class="skel-body">
            <div class="skel skel-name"></div>
            <div class="skel skel-sub"></div>
          </div>
        </div>`).join('');
    },
    profile() {
      return `<div class="skel-profile">
        <div class="skel skel-circle skel-av"></div>
        <div class="skel skel-name"></div>
        <div class="skel skel-sub"></div>
        <div class="skel skel-bio"></div>
      </div>`;
    },
    messages(n=6) {
      const rows=['sent','recv','recv','sent','recv','sent'];
      return `<div style="display:flex;flex-direction:column;padding:10px 12px;gap:6px">
        ${Array.from({length:n},(_,i)=>`<div class="skel skel-msg-${rows[i%rows.length]}"></div>`).join('')}
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
    set(k,v)  { _store[k]=v; _dirty.delete(k); },
    del(k)    { delete _store[k]; _dirty.delete(k); },
    clear()   { Object.keys(_store).forEach(k=>delete _store[k]); _dirty.clear(); },
    dirty(k)  { _dirty.add(k); },
    fresh(k)  { return !!_store[k] && !_dirty.has(k); },
    stale(k)  { return !_store[k] || _dirty.has(k); },
  };

  /* ── Toast ──────────────────────────────────────────────── */
  let _toastTimer = null;
  const showToast = (msg, type='', dur=3000) => {
    const bar = document.getElementById('toast-bar');
    if (!bar) return;
    bar.textContent = msg;
    bar.className   = type ? `show toast-${type}` : 'show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { bar.className=''; }, dur);
  };

  /* ── Chrome ─────────────────────────────────────────────── */
  const hideChrome = () => {
    if (_isDesktop()) return;
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
  };
  const showChrome = () => {
    if (_isDesktop()) return;
    document.getElementById('app-header').style.display = '';
    document.getElementById('bottom-nav').style.display = '';
  };

  /* ── Hash ───────────────────────────────────────────────── */
  const setHash = (h) => { _suppressHash=true; window.location.hash=h; };
  const goTo    = (h) => { _suppressHash=false; window.location.hash=h; };

  /* ── Header ─────────────────────────────────────────────── */
  const setTitle = (title, showBack=false) => {
    if (_isDesktop()) return;
    const logo = document.getElementById('hdr-logo');
    const ttl  = document.getElementById('hdr-title');
    const back = document.getElementById('btn-back');
    if (!logo||!ttl||!back) return;
    if (title) { logo.classList.add('hidden'); ttl.textContent=title; ttl.classList.remove('hidden'); }
    else        { logo.classList.remove('hidden'); ttl.classList.add('hidden'); }
    back.classList.toggle('hidden', !showBack);
  };
  const setHeaderActions = () => {};

  /* ── Nav ────────────────────────────────────────────────── */
  const showNav = (show) => {
    if (_isDesktop()) return; // desktop nav is in-panel pill
    document.getElementById('bottom-nav')?.classList.toggle('hidden', !show);
  };
  const setActiveNav = (page) => {
    // Map 'people' → highlight chats tab (people is a sub-tab of chats)
    const activeTab = page === 'people' ? 'chats' : page;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isActive = tab.dataset.page === activeTab;
      tab.classList.toggle('active', isActive);
      const icon = tab.querySelector('.nav-icon');
      if (icon) icon.textContent = isActive ? tab.dataset.iconOn : tab.dataset.iconOff;
    });
  };
  const showPage = (pageId) => {
    // 'people' renders inside page-chats
    const domPage = pageId === 'people' ? 'chats' : pageId;
    document.querySelectorAll('#main-content .page').forEach(p =>
      p.classList.toggle('active', p.id === `page-${domPage}`)
    );
  };

  /* ── Refresh ────────────────────────────────────────────── */
  const refresh = () => {
    const icon = document.querySelector('#hdr-refresh .material-icons-round');
    if (icon) {
      icon.style.transition='transform 0.6s ease';
      icon.style.transform='rotate(360deg)';
      setTimeout(()=>{ icon.style.transition=''; icon.style.transform=''; }, 650);
    }
    cache.dirty(_page);
    _renderPage(_page, null);
  };

  /* ── Guest mode ─────────────────────────────────────────── */
  const isGuest  = () => _guestMode;
  const setGuest = (name) => {
    const gid = 'guest_' + Math.random().toString(36).slice(2,12);
    _guestMode = true;
    Server.currentUser = { id:gid, display_name:name, email:'', is_guest:true };
    Server.currentProfile = {
      id: null,
      data: { user_id:gid, display_name:name, username:'guest', avatar_url:'', is_private:false, is_guest:true }
    };
  };
  const clearGuest = () => {
    _guestMode = false;
    Server.currentUser = null;
    Server.currentProfile = null;
  };
  const showGuestSignupPrompt = () => {
    showModal(`
      <div style="padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
        <div style="width:72px;height:72px;border-radius:22px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-md)">
          <span class="material-icons-round" style="font-size:36px;color:var(--accent)">lock_open</span>
        </div>
        <h3 style="font-size:20px;font-weight:800;color:var(--text-1)">Create an Account</h3>
        <p style="font-size:14px;color:var(--text-3);line-height:1.6;max-width:260px">
          Sign up free to send photos, files, voice messages and access all features.
        </p>
        <button class="btn-primary" style="width:100%;padding:14px;font-size:15px" id="gsp-signup">
          Create Account
        </button>
        <div style="font-size:13px;color:var(--text-3)">Already have one? <span id="gsp-login" style="color:var(--accent);font-weight:700;cursor:pointer">Sign In</span></div>
      </div>`);
    document.getElementById('gsp-signup').onclick = () => { closeModal(); goTo('#signup'); };
    document.getElementById('gsp-login').onclick  = () => { closeModal(); goTo('#login'); };
  };

  /* ── Router ─────────────────────────────────────────────── */
  const _renderPage = (page, param) => {
    if (!page) return;
    const container = document.getElementById(`page-${page==='people'?'chats':page}`);
    if (!container) return;
    switch (page) {
      case 'chats':       ChatsPage.render(container, param, 'chats');    break;
      case 'people':      ChatsPage.render(container, param, 'people');   break;
      case 'updates':     UpdatesPage.render(container);                  break;
      case 'communities': CommunitiesPage.render(container, param);       break;
      case 'profile':     ProfilePage.render(container, param);           break;
    }
  };

  const navigate = (hash) => {
    const raw   = (hash||'').replace(/^#/,'');
    const parts = raw.split('/');
    const page  = parts[0] || (_isAuth||_guestMode ? 'chats' : 'login');
    const param = parts[1] || null;

    /* Invite deep-link */
    if (page==='invite' && param) {
      if (_isAuth) { _handleInvite(param); return; }
      _showGuestLanding(param); return;
    }

    /* Destroy previous page module if switching */
    if (_page && _page!==page) {
      const prevKey = _page==='people' ? 'chats' : _page;
      const mod = MODULES[prevKey]?.();
      if (mod && typeof mod.destroy==='function' && _page!=='people' && page!=='chats' && page!=='people') {
        mod.destroy();
      }
    }

    /* Auth guards */
    if (!_isAuth && !_guestMode && !AUTH_PAGES.has(page)) { window.location.hash='#login'; return; }
    if (_isAuth  && AUTH_PAGES.has(page))                  { window.location.hash='#chats'; return; }
    if (_guestMode && AUTH_PAGES.has(page))                { window.location.hash='#chats'; return; }

    _page = page;

    if (AUTH_PAGES.has(page)) {
      showPage('login'); showNav(false); setTitle(null,false);
      LoginPage.render(document.getElementById('page-login'), page, param);
      return;
    }

    if (APP_PAGES.has(page)) {
      if (_guestMode && page!=='chats') { showGuestSignupPrompt(); return; }
      showPage(page);
      if (_guestMode) {
        document.getElementById('bottom-nav').style.display = 'none';
        document.getElementById('app-header').style.display = 'none';
      } else if (!_isDesktop()) {
        showNav(true);
        setActiveNav(page);
        setTitle(null, false);
      }
    }

    _renderPage(page, param);
  };

  /* ── Guest landing ──────────────────────────────────────── */
  const _showGuestLanding = async (token) => {
    let inviterName = 'Someone';
    try {
      const rec = await Server.resolveInviteToken(token);
      if (rec?.data?.display_name) inviterName = rec.data.display_name;
    } catch {}
    try { sessionStorage.setItem('spark_pending_invite', token); } catch {}
    showPage('login'); showNav(false);
    LoginPage.renderGuestInvite(document.getElementById('page-login'), token, inviterName);
  };

  const _handleInvite = async (token) => {
    showToast('Opening chat...');
    try {
      const chatId = await Server.acceptInvite(token);
      if (chatId) { cache.dirty('chats_threads'); window.location.hash=`#chats/${chatId}`; showToast('Chat started!','success'); }
      else         { showToast('Could not open chat from invite','error'); window.location.hash='#chats'; }
    } catch(e) { showToast(e.message||'Invalid invite link','error'); window.location.hash='#chats'; }
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
  const showModal = (html, onClose) => {
    const overlay = document.getElementById('modal-overlay');
    const sheet   = document.getElementById('modal-sheet');
    if (!overlay||!sheet) return ()=>{};
    sheet.innerHTML = html;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => sheet.classList.add('open'));
    const close = () => {
      sheet.classList.remove('open');
      overlay.classList.add('hidden');
      if (typeof onClose==='function') onClose();
    };
    overlay.onclick = e => { if (e.target===overlay) close(); };
    return close;
  };
  const closeModal = () => {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.getElementById('modal-sheet')?.classList.remove('open');
  };

  /* ── Avatar ─────────────────────────────────────────────── */
  const avatar = (url, name, cls='av-md') => {
    const initial = (String(name||'?')[0]||'?').toUpperCase();
    return `<div class="avatar ${cls}">
      ${url?`<img src="${url}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div class="avatar-placeholder ${cls==='av-sm'?'small':''}" style="${url?'display:none':''}">${initial}</div>
    </div>`;
  };

  /* ── Time ───────────────────────────────────────────────── */
  const timeAgo = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now()-new Date(iso).getTime())/1000);
    if (s<60) return 'now';
    const m=Math.floor(s/60); if (m<60) return `${m}m`;
    const h=Math.floor(m/60); if (h<24) return `${h}h`;
    const d=Math.floor(h/24); if (d<7) return `${d}d`;
    return new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  };
  const formatTime = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:true}); }
    catch { return ''; }
  };

  /* ── Resize ─────────────────────────────────────────────── */
  const _onResize = () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const nowDesktop = _isDesktop();
      if (nowDesktop !== _lastWasDesktop) {
        _lastWasDesktop = nowDesktop;
        if (_page && APP_PAGES.has(_page)) {
          const key = _page==='people' ? 'chats' : _page;
          const mod = MODULES[key]?.();
          if (mod && typeof mod.destroy==='function') mod.destroy();
          _renderPage(_page, null);
        }
      }
    }, 200);
  };

  /* ── Init ───────────────────────────────────────────────── */
  const init = async () => {
    _clearOldCaches();

    try {
      if (Server.isLoggedIn()) {
        const v = await Server.validate();
        if (v?.valid) {
          _isAuth = true;
          Server.currentUser    = v.user;
          Server.currentProfile = await Server.getProfile(v.user.id).catch(()=>null);
        }
      }
    } catch {}

    _lastWasDesktop = _isDesktop();

    document.getElementById('app-loader').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';

    /* Mobile nav tabs */
    document.querySelectorAll('.nav-tab[data-page]').forEach(tab =>
      tab.addEventListener('click', () => {
        if (_guestMode) { showGuestSignupPrompt(); return; }
        goTo('#'+tab.dataset.page);
      })
    );

    document.getElementById('btn-back')?.addEventListener('click', ()=>history.back());
    document.getElementById('hdr-refresh')?.addEventListener('click', refresh);

    window.addEventListener('hashchange', () => {
      if (_suppressHash) { _suppressHash=false; return; }
      navigate(window.location.hash);
    });
    window.addEventListener('resize', _onResize, {passive:true});

    navigate(window.location.hash || ((_isAuth||_guestMode)?'#chats':'#login'));

    document.addEventListener('contextmenu', e=>e.preventDefault(), {passive:false});
    document.addEventListener('selectstart', e=>{
      const t=e.target;
      if (t.tagName==='INPUT'||t.tagName==='TEXTAREA') return;
      e.preventDefault();
    }, {passive:false});
  };

  return {
    init, showToast, setTitle, setHeaderActions,
    showNav, setActiveNav, showModal, closeModal,
    hideChrome, showChrome,
    avatar, timeAgo, formatTime,
    cache, skel,
    isAuth:  ()  => _isAuth,
    setAuth: v   => { _isAuth=v; if(v) _guestMode=false; },
    isGuest, setGuest, clearGuest, showGuestSignupPrompt,
    goTo, setHash, refresh,
    checkPendingInvite,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);