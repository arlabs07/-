/**
 * main.js — SPA Router, Sidebar, Navigation, Modals, Global Utilities
 * Depends on: data.js, icons.js, story.js, postcard.js, home.js
 */

/* ═══════════════════════════════════════════════════════════════
   GLOBAL TOAST
═══════════════════════════════════════════════════════════════ */

function showToast(message, duration = 2500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ═══════════════════════════════════════════════════════════════
   APP — Main SPA Controller
═══════════════════════════════════════════════════════════════ */

// Flag to prevent hashchange re-processing when app sets hash internally
var _skipNextHashChange = false;
function _setHash(hash) {
  _skipNextHashChange = true;
  window.location.hash = hash;
}

var App = (() => {

  /* ── State ─────────────────────────────────────────────────── */
  let currentPage = 'home';
  let previousPage = null;
  let sidebarCollapsed = false;

  /* ── Pages config ──────────────────────────────────────────── */
  const pages = {
    home:          { id: 'page-home',          nav: 'nav-home',          label: 'Home',          render: () => HomePage.render() },
    explore:       { id: 'page-explore',       nav: 'nav-explore',       label: 'Explore',       render: () => HomePage.renderExplorePage() },
    reels:         { id: 'page-reels',         nav: 'nav-reels',         label: 'Reels',         render: () => HomePage.renderReelsPage() },
    notifications: { id: 'page-notifications', nav: 'nav-notifications', label: 'Notifications', render: () => NotificationManager.render() },
    messages:      { id: 'page-messages',      nav: 'nav-messages',      label: 'Messages',      render: () => MessengerManager.render() },
    profile:       { id: 'page-profile',       nav: 'nav-profile',       label: 'Profile',       render: (userId) => HomePage.renderProfilePage(userId) },
    upload:        { id: 'page-upload',        nav: 'nav-upload',        label: 'Upload',        render: () => UploadManager.render() },
  };

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    buildSidebar();
    buildMobileHeader();
    buildBottomNav();
    buildStoryViewer();
    buildPostModal();
    buildCreateModal();
    handleResize();
    setupGlobalListeners();
    navigateTo('home');
    updateBadges();
  }

  /* ═══════════════════════════════════════════════════════════
     SIDEBAR BUILD
  ═══════════════════════════════════════════════════════════ */

  function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const cu = InstagramData.currentUser;
    const unreadNotifs = InstagramData.unreadNotificationsCount();
    const unreadMsgs   = InstagramData.unreadMessagesCount();

    sidebar.innerHTML = `
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">${Icons.logoGradient}</div>
        <span class="logo-text">Instagram</span>
      </div>

      <!-- Primary Nav -->
      <nav class="sidebar-nav" id="sidebar-nav">

        <div class="nav-item" id="nav-home" data-page="home" data-tooltip="Home"
             onclick="App.navigateTo('home')">
          <div class="nav-icon" id="nav-icon-home">${Icons.homeOutline}</div>
          <span class="nav-label">Home</span>
        </div>

        <div class="nav-item" id="nav-explore" data-page="explore" data-tooltip="Explore"
             onclick="App.navigateTo('explore')">
          <div class="nav-icon" id="nav-icon-explore">${Icons.explore}</div>
          <span class="nav-label">Explore</span>
        </div>

        <div class="nav-item" id="nav-reels" data-page="reels" data-tooltip="Reels"
             onclick="App.navigateTo('reels')">
          <div class="nav-icon" id="nav-icon-reels">${Icons.reels}</div>
          <span class="nav-label">Reels</span>
        </div>

        <div class="nav-item" id="nav-messages" data-page="messages" data-tooltip="Messages"
             onclick="App.navigateTo('messages')">
          <div class="nav-icon" id="nav-icon-messages">${Icons.messenger}</div>
          <span class="nav-label">Messages</span>
          ${unreadMsgs > 0 ? `<span class="nav-badge" id="nav-badge-messages">${unreadMsgs}</span>` : ''}
        </div>

        <div class="nav-item" id="nav-notifications" data-page="notifications" data-tooltip="Notifications"
             onclick="App.navigateTo('notifications')">
          <div class="nav-icon" id="nav-icon-notifications">${Icons.notification}</div>
          <span class="nav-label">Notifications</span>
          ${unreadNotifs > 0 ? `<span class="nav-badge" id="nav-badge-notifs">${unreadNotifs}</span>` : ''}
        </div>

        <div class="nav-item" data-tooltip="Create" onclick="App.navigateTo('upload')">
          <div class="nav-icon">${Icons.plusSquare}</div>
          <span class="nav-label">Create</span>
        </div>

        <div class="nav-item" id="nav-profile" data-page="profile" data-tooltip="Profile"
             onclick="App.navigateTo('profile', 'user_0')">
          <div class="nav-avatar">
            <img src="${cu.avatar}" alt="${cu.username}"
                 onerror="this.src='https://i.pravatar.cc/150?img=1'" loading="lazy">
          </div>
          <span class="nav-label">Profile</span>
        </div>

      </nav>

      <!-- Divider -->
      <div class="sidebar-divider"></div>

      <!-- More -->
      <div class="sidebar-more">
        <div class="nav-item" data-tooltip="More" onclick="App.toggleMoreMenu()">
          <div class="nav-icon">${Icons.menuHamburger}</div>
          <span class="nav-label">More</span>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     MOBILE HEADER BUILD
  ═══════════════════════════════════════════════════════════ */

  function buildMobileHeader() {
    const header = document.getElementById('mobile-header');
    if (!header) return;

    const unreadNotifs = InstagramData.unreadNotificationsCount();
    const unreadMsgs   = InstagramData.unreadMessagesCount();

    header.innerHTML = `
      <div class="mobile-header-logo" onclick="App.navigateTo('home')">Instagram</div>
      <div class="mobile-header-actions">
        <div class="mobile-header-btn" onclick="App.navigateTo('upload')">
          ${Icons.plusSquare}
        </div>
        <div class="mobile-header-btn" onclick="App.navigateTo('notifications')">
          ${Icons.notification}
          ${unreadNotifs > 0 ? `<span class="badge" id="mobile-badge-notifs">${unreadNotifs}</span>` : ''}
        </div>
        <div class="mobile-header-btn" onclick="App.navigateTo('messages')">
          ${Icons.messenger}
          ${unreadMsgs > 0 ? `<span class="badge" id="mobile-badge-msgs">${unreadMsgs}</span>` : ''}
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     BOTTOM NAV BUILD (Mobile)
  ═══════════════════════════════════════════════════════════ */

  function buildBottomNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;

    const cu = InstagramData.currentUser;

    nav.innerHTML = `
      <div class="bottom-nav-inner">
        <div class="bottom-nav-item active" id="bn-home" onclick="App.navigateTo('home')">
          ${Icons.homeOutline}
        </div>
        <div class="bottom-nav-item" id="bn-explore" onclick="App.navigateTo('explore')">
          ${Icons.search}
        </div>
        <div class="bottom-nav-item create-btn" onclick="App.navigateTo('upload')">
          <div class="create-icon">${Icons.plus}</div>
        </div>
        <div class="bottom-nav-item" id="bn-reels" onclick="App.navigateTo('reels')">
          ${Icons.reels}
        </div>
        <div class="bottom-nav-item" id="bn-profile" onclick="App.navigateTo('profile', 'user_0')">
          <div class="bn-avatar">
            <img src="${cu.avatar}" alt="${cu.username}"
                 onerror="this.src='https://i.pravatar.cc/150?img=1'" loading="lazy">
          </div>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION (SPA Router)
  ═══════════════════════════════════════════════════════════ */

  function navigateTo(pageName, ...args) {
    const pageConfig = pages[pageName];
    if (!pageConfig) return;

    previousPage = currentPage;
    currentPage  = pageName;

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById(pageConfig.id);
    if (pageEl) {
      pageEl.classList.add('active');
      // Scroll to top on navigation
      pageEl.scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    }

    // Update sidebar active states
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      const icon = item.querySelector('.nav-icon');
      if (!icon) return;
      const itemPage = item.getAttribute('data-page');
      if (itemPage === pageName) {
        item.classList.add('active');
        updateNavIcon(itemPage, true);
      } else if (itemPage) {
        updateNavIcon(itemPage, false);
      }
    });

    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const bnMap = { home: 'bn-home', explore: 'bn-explore', reels: 'bn-reels', profile: 'bn-profile' };
    if (bnMap[pageName]) {
      const el = document.getElementById(bnMap[pageName]);
      if (el) el.classList.add('active');
    }

    // Render the page
    pageConfig.render(...args);

    // Manage body classes for page-specific headers
    const pagesWithOwnHeader = ['profile', 'upload', 'notifications', 'messages'];
    document.body.classList.toggle('page-has-own-header', pagesWithOwnHeader.includes(pageName));

    // Reel player class (managed by ReelPlayer separately)
    if (pageName !== 'reels') {
      document.body.classList.remove('reel-player-active');
    }

    // Hash-based routing: #page or #page#uniqueId
    var hashBase = '#' + pageName;
    if (pageName === 'profile' && args[0]) {
      var profileUser = InstagramData.getUserById(args[0]);
      hashBase = '#profile#' + (profileUser ? profileUser.username : args[0]);
    }
    if (window.location.hash !== hashBase) {
      _setHash(hashBase);
    }
  }

  /* ── Active icon switcher ──────────────────────────────────── */
  function updateNavIcon(page, isActive) {
    const iconEl = document.getElementById(`nav-icon-${page}`);
    if (!iconEl) return;
    const map = {
      home:          [Icons.homeOutline, Icons.home],
      explore:       [Icons.explore,     Icons.exploreFilled],
      reels:         [Icons.reels,       Icons.reelsFilled],
      notifications: [Icons.notification,Icons.notificationFilled],
      messages:      [Icons.messenger,   Icons.messengerFilled],
    };
    if (map[page]) {
      iconEl.innerHTML = isActive ? map[page][1] : map[page][0];
    }
  }

  /* ═══════════════════════════════════════════════════════════
     STORY VIEWER SCAFFOLD
  ═══════════════════════════════════════════════════════════ */

  function buildStoryViewer() {
    const viewer = document.createElement('div');
    viewer.id = 'story-viewer';
    document.body.appendChild(viewer);

    // Close on backdrop click
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) StoryManager.close();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     POST MODAL
  ═══════════════════════════════════════════════════════════ */

  function buildPostModal() {
    const overlay = document.createElement('div');
    overlay.id = 'post-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-close-area" onclick="PostCard.closeModal()"></div>
      <div class="modal-content"></div>`;
    document.body.appendChild(overlay);
  }

  /* ═══════════════════════════════════════════════════════════
     CREATE POST MODAL
  ═══════════════════════════════════════════════════════════ */

  function buildCreateModal() {
    const overlay = document.createElement('div');
    overlay.id = 'create-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-close-area" onclick="App.closeCreateModal()"></div>
      <div class="modal-content"></div>`;
    document.body.appendChild(overlay);
  }

  function openCreateModal() {
    HomePage.renderCreateModal();
  }

  function closeCreateModal() {
    const overlay = document.getElementById('create-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  /* ═══════════════════════════════════════════════════════════
     MORE MENU (sidebar bottom)
  ═══════════════════════════════════════════════════════════ */

  let moreMenuOpen = false;

  function toggleMoreMenu() {
    if (moreMenuOpen) {
      closeMoreMenu();
      return;
    }
    moreMenuOpen = true;

    let menu = document.getElementById('more-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'more-menu';
      menu.className = 'dropdown-menu';
      menu.style.cssText = 'position:fixed;bottom:80px;left:12px;min-width:220px;z-index:500';
      menu.innerHTML = `
        <div class="dropdown-item" onclick="showToast('Settings coming soon');App.closeMoreMenu()">
          <span style="width:18px;height:18px;display:inline-flex">${Icons.settings}</span>
          Settings
        </div>
        <div class="dropdown-item" onclick="showToast('Activity coming soon');App.closeMoreMenu()">
          <span style="width:18px;height:18px;display:inline-flex">${Icons.notification}</span>
          Your activity
        </div>
        <div class="dropdown-item" onclick="showToast('Saved posts');App.navigateTo('profile','user_0');App.closeMoreMenu()">
          <span style="width:18px;height:18px;display:inline-flex">${Icons.bookmark}</span>
          Saved
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item danger" onclick="showToast('Logged out!');App.closeMoreMenu()">
          <span style="width:18px;height:18px;display:inline-flex">${Icons.logout}</span>
          Log out
        </div>`;
      document.body.appendChild(menu);
    }

    setTimeout(() => menu.classList.add('open'), 10);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!menu.contains(e.target)) {
          closeMoreMenu();
        }
        document.removeEventListener('click', handler);
      });
    }, 50);
  }

  function closeMoreMenu() {
    const menu = document.getElementById('more-menu');
    if (menu) menu.classList.remove('open');
    moreMenuOpen = false;
  }

  /* ═══════════════════════════════════════════════════════════
     BADGE UPDATES
  ═══════════════════════════════════════════════════════════ */

  function updateBadges() {
    const unreadNotifs = InstagramData.unreadNotificationsCount();
    const unreadMsgs   = InstagramData.unreadMessagesCount();

    // Sidebar
    const notifBadge = document.getElementById('nav-badge-notifs');
    if (notifBadge) {
      if (unreadNotifs > 0) notifBadge.textContent = unreadNotifs;
      else notifBadge?.remove();
    }

    const msgBadge = document.getElementById('nav-badge-messages');
    if (msgBadge) {
      if (unreadMsgs > 0) msgBadge.textContent = unreadMsgs;
      else msgBadge?.remove();
    }

    // Mobile header
    const mobileNotifBadge = document.getElementById('mobile-badge-notifs');
    if (mobileNotifBadge) {
      if (unreadNotifs > 0) mobileNotifBadge.textContent = unreadNotifs;
      else mobileNotifBadge?.remove();
    }

    const mobileMsgBadge = document.getElementById('mobile-badge-msgs');
    if (mobileMsgBadge) {
      if (unreadMsgs > 0) mobileMsgBadge.textContent = unreadMsgs;
      else mobileMsgBadge?.remove();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     GLOBAL EVENT LISTENERS
  ═══════════════════════════════════════════════════════════ */

  function setupGlobalListeners() {
    // Browser back button
    window.addEventListener('popstate', (e) => {
      if (e.state?.page) {
        navigateTo(e.state.page, ...(e.state.args || []));
      }
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        PostCard.closeModal();
        closeCreateModal();
        StoryManager.close();
        closeMoreMenu();
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      // Auto-close post option menus
      if (!e.target.closest('.post-more-btn') && !e.target.closest('.post-options-menu')) {
        document.querySelectorAll('.post-options-menu.open').forEach(menu => {
          menu.classList.remove('open');
        });
      }
    });

    // Touch swipe to go back (mobile)
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx > 100 && touchStartX < 30 && previousPage) {
        navigateTo(previousPage);
      }
    }, { passive: true });

    window.addEventListener('resize', debounce(handleResize, 150));
  }

  function handleResize() {
    const w = window.innerWidth;
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.getElementById('main-wrapper');
    if (!sidebar || !wrapper) return;
    if (w > 1200) {
      sidebar.classList.remove('icon-only');
      wrapper.classList.remove('icon-only');
    } else {
      sidebar.classList.add('icon-only');
      wrapper.classList.add('icon-only');
    }
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════════════════════════ */

  return {
    init,
    navigateTo,
    openCreateModal,
    closeCreateModal,
    toggleMoreMenu,
    closeMoreMenu,
    updateBadges,
  };

})();

/* ═══════════════════════════════════════════════════════════════
   BOOT — Wait for DOM
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // ── Hash-based deep linking ────────────────────────────────────
  // Format: #page  or  #page#uniqueId
  function _routeFromHash() {
    var rawHash = window.location.hash;
    if (!rawHash || rawHash === '#' || rawHash === '#home') {
      App.navigateTo('home');
      return;
    }

    // Parse #page  or  #page#id
    var clean = rawHash.replace(/^#/, '');
    var sepIdx = clean.indexOf('#');
    var page   = sepIdx === -1 ? clean : clean.substring(0, sepIdx);
    var id     = sepIdx === -1 ? '' : clean.substring(sepIdx + 1);

    // Simple page navigations (no sub-state)
    if (page === 'home')          { App.navigateTo('home'); return; }
    if (page === 'explore')       { App.navigateTo('explore'); return; }
    if (page === 'notifications') { App.navigateTo('notifications'); if (id) setTimeout(function(){ NotificationManager.scrollToNotif(id); }, 500); return; }
    if (page === 'upload')        { App.navigateTo('upload'); return; }

    if (page === 'reels') {
      // Navigate to reels page (embedded endless player)
      App.navigateTo('reels');
      // If specific reel id, open as overlay on top (from explore/profile)
      if (id) {
        setTimeout(function() {
          var reel = InstagramData.getReelById(id);
          if (reel) ReelPlayer.open(id, { allowSwipe: false });
        }, 400);
      }
      return;
    }

    if (page === 'messages') {
      App.navigateTo('messages');
      // Open specific thread AFTER render completes
      if (id) setTimeout(function() { MessengerManager.openThread(id); }, 350);
      return;
    }

    if (page === 'profile') {
      if (id) {
        var pUser = InstagramData.getUserByUsername(id) || InstagramData.getUserById(id);
        if (pUser) App.navigateTo('profile', pUser.id);
        else App.navigateTo('home');
      }
      return;
    }

    if (page === 'post') {
      var post = id ? (InstagramData.getPostBySlug(id) || InstagramData.getPostById(id)) : null;
      App.navigateTo('home');
      if (post) setTimeout(function() { PostCard.openModal(post.id); }, 600);
      return;
    }

    if (page === 'story') {
      var sUser = id ? InstagramData.getUserByUsername(id) : null;
      App.navigateTo('home');
      if (sUser) {
        var idx = InstagramData.getUsersWithStories().findIndex(function(i){ return i.user && i.user.id === sUser.id; });
        if (idx >= 0) setTimeout(function() { StoryManager.open(idx); }, 400);
      }
      return;
    }

    // Fallback
    App.navigateTo('home');
  }

  _routeFromHash();

  // Listen for hash changes (back/forward navigation)
  window.addEventListener('hashchange', function() {
    if (_skipNextHashChange) {
      _skipNextHashChange = false;
      return; // App set this hash internally, don't re-process
    }
    _routeFromHash();
  });
});
