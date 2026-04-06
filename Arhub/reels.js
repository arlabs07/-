/**
 * reels.js  —  Reel Page grid + Full-Screen Reel Player
 * Changes from reference screenshots:
 *  - Back arrow (←) instead of X
 *  - Username + Follow ABOVE caption at bottom
 *  - No audio bar
 *  - Comment icon → opens BottomSheet
 *  - Three-dot → opens BottomSheet menu
 *  - Swipe UP = next reel, swipe DOWN = prev reel
 */

/* ─── Build reel data — reads from InstagramData.reels (data.js) ──────────── */
function _buildReelData() {
  // All reel data comes from data.js — no hardcoded data here
  return InstagramData.reels.map(reel => ({
    ...reel,
    // Ensure comments have user objects resolvable
    comments: (reel.comments || []).map(c => ({ ...c })),
  }));
}

/* ══════════════════════════════════════════════════════════════════
   REELS PAGE  (grid view)
══════════════════════════════════════════════════════════════════ */

var ReelsPage = {
  render() {
    // Render endless reel player INSIDE #page-reels (no separate modal)
    const page = document.getElementById('page-reels');
    if (!page) return;
    const allReels = _buildReelData();
    if (!allReels.length) return;
    // Mark page as active reel player
    document.body.classList.add('reel-player-active');
    // Use embedded player directly
    ReelPlayer.openEmbedded(allReels[0].id, page, true);
  }
};

/* ══════════════════════════════════════════════════════════════════
   REEL PLAYER
══════════════════════════════════════════════════════════════════ */

var ReelPlayer = (() => {
  let reels        = [];
  let currentIndex = 0;
  let progTimer    = null;
  let progStart    = null;
  let isPaused     = false;
  let isMuted      = false;
  const DURATION   = 12000; // 12 seconds per reel

  // Touch state for swipe up/down
  let touchStartY = 0;
  let touchStartX = 0;
  let touchEndY   = 0;

  /* ─── Build overlay once ────────────────────────────────────────────── */
  function _ensureOverlay() {
    if (document.getElementById('reel-player-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'reel-player-overlay';
    overlay.innerHTML = '<div class="reel-player-layout" id="reel-layout"></div>';
    document.body.appendChild(overlay);

    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape')                       close();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next();
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  prev();
      if (e.key === ' ')  isPaused ? resume() : pause();
      if (e.key === 'm')  toggleMute();
    });
  }

  /* ─── Open ──────────────────────────────────────────────────────────── */
  let _swipeEnabled = true;

  function open(reelId, opts={}) {
    _ensureOverlay();
    reels = _buildReelData();
    const idx = reels.findIndex(r => r.id === reelId);
    currentIndex = idx >= 0 ? idx : 0;
    isPaused = false;
    // allowSwipe: true → full scroll feed; false → single reel, no up/down nav
    _swipeEnabled = opts.allowSwipe !== false;

    const overlay = document.getElementById('reel-player-overlay');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    document.body.classList.add('reel-player-active');  /* hide mobile header + bottom nav */
    if (typeof _setHash === 'function') _setHash('#reels#' + reelId); else window.location.hash = '#reels#' + reelId;
    _render();
  }

  function close() {
    _stopProgress();
    document.getElementById('reel-player-overlay')?.classList.remove('open');
    document.body.classList.remove('no-scroll');
    document.body.classList.remove('reel-player-active');
    reels = [];
    // Go back to previous page instead of forcing a new hash
    const currentHash = window.location.hash;
    if (currentHash.startsWith('#reels')) {
      history.back();
    }
  }

  /* ─── Render ────────────────────────────────────────────────────────── */
  function _render() {
    const reel = reels[currentIndex];
    if (!reel) { close(); return; }

    const user = InstagramData.getUserById(reel.userId) || InstagramData.users[0];
    const isFollowing = InstagramData.isFollowing(reel.userId);
    const cu = InstagramData.currentUser;
    const layout = document.getElementById('reel-layout');
    if (!layout) return;

    const sidebarComments = reel.comments.map(c => {
      const cu2 = InstagramData.getUserById(c.userId) || InstagramData.users[0];
      return `
        <div class="reel-comment-item">
          <div class="reel-comment-avatar"><img src="${cu2.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div>
          <div class="reel-comment-content">
            <div class="reel-comment-bubble">
              <div class="reel-comment-name">${cu2.username}</div>
              <div class="reel-comment-text">${c.text}</div>
            </div>
            <div class="reel-comment-meta">
              <span class="reel-comment-time">${InstagramData.timeAgo(c.timestamp)}</span>
              
            </div>
          </div>
        </div>`;
    }).join('');

    layout.innerHTML = `
      <!-- ── Reel panel ── -->
      <div class="reel-player-feed" id="reel-feed">
        <div class="reel-card" id="reel-card">

          <img class="reel-media" id="reel-media"
               src="${reel.image}" alt=""
               onerror="this.src='https://picsum.photos/420/900?random=${currentIndex + 100}'">

          <div class="reel-gradient-top"></div>
          <div class="reel-gradient-bottom"></div>

          <!-- Progress -->
          <div class="reel-progress-bar">
            <div class="reel-progress-fill" id="reel-progress"></div>
          </div>

          <!-- ← Back button (top-left) -->
          <div class="reel-back-btn" onclick="ReelPlayer.close(); history.back()">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </div>

          <!-- Mute + Pause (top-right) -->
          <div class="reel-controls">
            <div class="reel-ctrl-btn" id="reel-mute-btn" onclick="ReelPlayer.toggleMute()">
              ${_muteIcon()}
            </div>
            <div class="reel-ctrl-btn" id="reel-pause-btn" onclick="ReelPlayer.togglePause()">
              ${_pauseIcon()}
            </div>
          </div>

          <!-- Bottom: user info + caption + actions -->
          <div class="reel-bottom">
            <!-- Left: user + caption -->
            <div class="reel-bottom-left">
              <!-- User row: avatar + username + follow -->
              <div class="reel-user-row">
                <div class="reel-user-avatar"
                     onclick="App.navigateTo('profile','${user.id}');ReelPlayer.close()">
                  <img src="${user.avatar}" alt="${user.username}"
                       onerror="this.src='https://i.pravatar.cc/150?img=2'">
                </div>
                <div class="reel-username">
                  ${user.username}
                  ${user.isVerified ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0095f6" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` : ''}
                </div>
                <div class="reel-follow-btn ${isFollowing ? 'following' : ''}"
                     id="reel-follow-btn"
                     onclick="ReelPlayer.toggleFollow('${reel.userId}')">
                  ${isFollowing ? 'Following' : 'Follow'}
                </div>
              </div>
              <!-- Caption -->
              <div class="reel-caption" id="reel-caption"
                   onclick="this.classList.toggle('expanded')">
                ${reel.caption}
              </div>
            </div>

            <!-- Right: action buttons -->
            <div class="reel-actions-right">
              <!-- Like -->
              <div class="reel-action-btn" onclick="ReelPlayer.toggleLike()">
                <div class="reel-action-icon" id="reel-like-icon">
                  ${_likeIcon(reel.liked)}
                </div>
                <div class="reel-action-label" id="reel-likes-count">
                  ${InstagramData.formatCount(reel.likes)}
                </div>
              </div>
              <!-- Comment — opens bottom sheet -->
              <div class="reel-action-btn" onclick="ReelPlayer.openComments()">
                <div class="reel-action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div class="reel-action-label" id="reel-comment-count">${reel.comments.length}</div>
              </div>
              <!-- Share -->
              <div class="reel-action-btn" onclick="showToast('Shared!')">
                <div class="reel-action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
                <div class="reel-action-label">Share</div>
              </div>
              <!-- Three-dot → bottom sheet menu -->
              <div class="reel-action-btn" onclick="ReelPlayer.openMenu()">
                <div class="reel-action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Like burst -->
          <div class="reel-like-burst" id="reel-like-burst">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" stroke="#ed4956" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>

          <!-- Desktop nav arrows (up/down) -->
          <div class="reel-nav-up"   onclick="ReelPlayer.prev()">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="18 15 12 9 6 15"/></svg>
          </div>
          <div class="reel-nav-down" onclick="ReelPlayer.next()">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

        </div><!-- /reel-card -->
      </div><!-- /reel-player-feed -->

      <!-- ── Desktop sidebar ── -->
      <div class="reel-sidebar">
        <div class="reel-sidebar-header">
          <div class="reel-sidebar-avatar"
               onclick="App.navigateTo('profile','${user.id}');ReelPlayer.close()">
            <img src="${user.avatar}" alt="${user.username}" onerror="this.src='https://i.pravatar.cc/150?img=2'">
          </div>
          <div class="reel-sidebar-username"
               onclick="App.navigateTo('profile','${user.id}');ReelPlayer.close()">
            ${user.username}
            ${user.isVerified ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0095f6" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` : ''}
          </div>
          <div class="reel-sidebar-follow ${isFollowing ? 'following' : ''}"
               id="reel-sb-follow"
               onclick="ReelPlayer.toggleFollow('${reel.userId}')">
            ${isFollowing ? 'Following' : 'Follow'}
          </div>
        </div>
        <div class="reel-sidebar-caption">${reel.caption}</div>
        <div class="reel-sidebar-stats">
          <div class="reel-stat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="${reel.liked ? '#ed4956' : 'none'}"
                 stroke="${reel.liked ? '#ed4956' : 'currentColor'}"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                 width="20" height="20">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${InstagramData.formatCount(reel.likes)}
          </div>
          <div class="reel-stat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${reel.comments.length}
          </div>
          <div class="reel-stat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ${InstagramData.formatCount(reel.views)}
          </div>
        </div>
        <div class="reel-sidebar-comments" id="reel-sb-comments">${sidebarComments}</div>
        <div class="reel-sidebar-input">
          <div class="reel-sidebar-my-avatar">
            <img src="${cu.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=1'">
          </div>
          <input class="reel-sidebar-field" type="text" placeholder="Add a comment…"
                 onkeydown="if(event.key==='Enter'){ReelPlayer.submitSidebarComment(this);event.preventDefault()}">
        </div>
      </div>`;

    _startProgress();
    _attachTouchHandlers();
    _attachDoubleTap();
  }

  /* ─── Icon helpers ──────────────────────────────────────────────────── */
  function _likeIcon(liked) {
    if (liked) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" stroke="#ed4956" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  }

  function _muteIcon() {
    if (isMuted) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  }

  function _pauseIcon() {
    if (isPaused) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  }

  /* ─── Touch handlers — SWIPE UP = next, DOWN = prev ─────────────────── */
  function _attachTouchHandlers() {
    const feed = document.getElementById('reel-feed');
    if (!feed) return;

    feed.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchEndY   = touchStartY;
    }, { passive: true });

    feed.addEventListener('touchmove', e => {
      touchEndY = e.touches[0].clientY;
    }, { passive: true });

    feed.addEventListener('touchend', () => {
      if (!_swipeEnabled) return; // single-reel mode: no swipe nav
      const dy = touchEndY - touchStartY;
      if (Math.abs(dy) > 70) {
        if (dy < 0) next();   // swipe UP → next reel
        else         prev();  // swipe DOWN → prev reel
      }
    }, { passive: true });
  }

  /* ─── Double-tap to like ─────────────────────────────────────────────── */
  function _attachDoubleTap() {
    const card = document.getElementById('reel-card');
    if (!card) return;
    let lastTap = 0;
    card.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        _showLikeBurst();
        const reel = reels[currentIndex];
        if (!reel?.liked) toggleLike();
      }
      lastTap = now;
    }, { passive: true });
  }

  /* ─── Progress ───────────────────────────────────────────────────────── */
  function _startProgress() {
    _stopProgress();
    progStart = performance.now();
    _tick();
  }

  function _tick() {
    if (isPaused) return;
    const fill = document.getElementById('reel-progress');
    if (!fill) return;
    const pct = Math.min(((performance.now() - progStart) / DURATION) * 100, 100);
    fill.style.width = pct + '%';
    if (pct < 100) progTimer = requestAnimationFrame(_tick);
    else next();
  }

  function _stopProgress() {
    if (progTimer) { cancelAnimationFrame(progTimer); progTimer = null; }
  }

  function pause()  { isPaused = true;  _stopProgress(); }
  function resume() {
    if (!isPaused) return;
    const fill = document.getElementById('reel-progress');
    const pct  = fill ? parseFloat(fill.style.width) || 0 : 0;
    progStart  = performance.now() - (pct / 100) * DURATION;
    isPaused   = false;
    _tick();
  }

  /* ─── Navigation ─────────────────────────────────────────────────────── */
  function next() {
    if (!_swipeEnabled) return; // single-reel mode
    _stopProgress();
    if (currentIndex < reels.length - 1) {
      currentIndex++;
      isPaused = false;
      _render();
    } else {
      showToast('You\'ve seen all reels!');
      close();
    }
  }

  function prev() {
    if (!_swipeEnabled) return; // single-reel mode
    _stopProgress();
    if (currentIndex > 0) {
      currentIndex--;
      isPaused = false;
      _render();
    }
  }

  /* ─── Like ───────────────────────────────────────────────────────────── */
  function toggleLike() {
    const reel = reels[currentIndex]; if (!reel) return;
    reel.liked = !reel.liked;
    reel.likes += reel.liked ? 1 : -1;

    const icon  = document.getElementById('reel-like-icon');
    const count = document.getElementById('reel-likes-count');
    if (icon)  icon.innerHTML  = _likeIcon(reel.liked);
    if (count) count.textContent = InstagramData.formatCount(reel.likes);
    if (reel.liked) _showLikeBurst();
  }

  function _showLikeBurst() {
    const burst = document.getElementById('reel-like-burst');
    if (!burst) return;
    burst.classList.remove('animate');
    void burst.offsetWidth;
    burst.classList.add('animate');
    burst.addEventListener('animationend', () => burst.classList.remove('animate'), { once: true });
  }

  /* ─── Mute / Pause ────────────────────────────────────────────────────── */
  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('reel-mute-btn');
    if (btn) btn.innerHTML = _muteIcon();
  }

  function togglePause() {
    if (isPaused) resume(); else pause();
    const btn = document.getElementById('reel-pause-btn');
    if (btn) btn.innerHTML = _pauseIcon();
  }

  /* ─── Follow ─────────────────────────────────────────────────────────── */
  function toggleFollow(userId) {
    InstagramData.toggleFollow(userId);
    const isF = InstagramData.isFollowing(userId);
    ['reel-follow-btn', 'reel-sb-follow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = isF ? 'Following' : 'Follow'; el.classList.toggle('following', isF); }
    });
    showToast(isF ? 'Following!' : 'Unfollowed');
  }

  /* ─── Comments — uses shared BottomSheet ────────────────────────────── */
  function openComments() {
    const reel = reels[currentIndex]; if (!reel) return;
    pause();

    const listHtml = reel.comments.length
      ? reel.comments.map(c => {
          const cu2 = InstagramData.getUserById(c.userId) || InstagramData.users[0];
          return `<div class="sheet-comment-item">
            <div class="sheet-comment-avatar" onclick="App.navigateTo('profile','${cu2.id}');BottomSheet.close()">
              <img src="${cu2.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
            </div>
            <div class="sheet-comment-content">
              <div class="sheet-comment-bubble">
                <div class="sheet-comment-username">${cu2.username}</div>
                <div class="sheet-comment-text">${c.text}</div>
              </div>
              <div class="sheet-comment-meta">
                <span class="sheet-comment-time">${InstagramData.timeAgo(c.timestamp)}</span>
                
              </div>
            </div>
          </div>`;
        }).join('')
      : `<div class="sheet-comments-empty"><p>No comments yet — be the first!</p></div>`;

    BottomSheet.open('Comments', `<div class="sheet-comments-list" id="reel-bsc-list">${listHtml}</div>`);

    // Sticky input row
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) {
      const row = document.createElement('div');
      row.className = 'sheet-comment-input-row';
      row.innerHTML = `
        <div class="sheet-comment-my-avatar">
          <img src="${InstagramData.currentUser.avatar}" alt="" loading="lazy">
        </div>
        <input class="sheet-comment-field" id="reel-bsc-field" type="text" placeholder="Add a comment…"
               oninput="document.getElementById('reel-bsc-send').classList.toggle('active', this.value.trim().length>0)"
               onkeydown="if(event.key==='Enter'){ReelPlayer._submitBsComment(this);event.preventDefault()}">
        <button class="sheet-comment-send-btn" id="reel-bsc-send" onclick="ReelPlayer._submitBsComment(document.getElementById('reel-bsc-field'))">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>`;
      sheet.appendChild(row);

      // Resume on close
      document.getElementById('bs-backdrop')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
      document.querySelector('.bottom-sheet-close')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
    }
  }

  function _submitBsComment(input) {
    if (!input) return;
    const text = input.value.trim(); if (!text) return;
    const reel = reels[currentIndex];
    if (reel) reel.comments.push({ userId: InstagramData.currentUser.id, text, timestamp: Date.now() });
    input.value = '';
    document.getElementById('reel-bsc-send')?.classList.remove('active');

    const list = document.getElementById('reel-bsc-list');
    if (list) {
      const cu = InstagramData.currentUser;
      const div = document.createElement('div');
      div.className = 'sheet-comment-item own fade-in';
      div.innerHTML = `
        <div class="sheet-comment-avatar"><img src="${cu.avatar}" alt="" loading="lazy"></div>
        <div class="sheet-comment-content">
          <div class="sheet-comment-bubble"><div class="sheet-comment-username">${cu.username}</div><div class="sheet-comment-text">${text}</div></div>
          <div class="sheet-comment-meta"><span class="sheet-comment-time">now</span></div>
        </div>`;
      list.querySelector('.sheet-comments-empty')?.remove();
      list.appendChild(div);
      list.parentElement.scrollTop = list.parentElement.scrollHeight;
    }

    // Sync sidebar
    const sbComments = document.getElementById('reel-sb-comments');
    if (sbComments) {
      const cu = InstagramData.currentUser;
      const div = document.createElement('div');
      div.className = 'reel-comment-item fade-in';
      div.innerHTML = `<div class="reel-comment-avatar"><img src="${cu.avatar}" alt=""></div>
        <div class="reel-comment-content"><div class="reel-comment-bubble"><div class="reel-comment-name">${cu.username}</div><div class="reel-comment-text">${text}</div></div><div class="reel-comment-meta"><span class="reel-comment-time">now</span></div></div>`;
      sbComments.appendChild(div);
      sbComments.scrollTop = sbComments.scrollHeight;
    }

    // Update comment count
    if (reel) {
      const el = document.getElementById('reel-comment-count');
      if (el) el.textContent = reel.comments.length;
    }

    showToast('Comment posted!');
  }

  /* ─── Three-dot menu ─────────────────────────────────────────────────── */
  function openMenu() {
    const reel = reels[currentIndex]; if (!reel) return;
    const isFollowing = InstagramData.isFollowing(reel.userId);
    pause();

    const items = [
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`, label: 'Save',             fn: `showToast('Saved!');BottomSheet.close()` },
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`, label: 'Share to…',       fn: `showToast('Shared!');BottomSheet.close()` },
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`, label: 'Copy link',       fn: `showToast('Link copied!');BottomSheet.close()` },
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`, label: isFollowing ? 'Unfollow' : 'Follow', fn: `ReelPlayer.toggleFollow('${reel.userId}');BottomSheet.close()` },
      { divider: true },
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`, label: 'Report',  fn: `showToast('Reported. Thanks.');BottomSheet.close()`, danger: true },
      { divider: true },
      { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`, label: 'Cancel',  fn: `BottomSheet.close()` },
    ];

    const html = `<div class="sheet-menu-list">${items.map(item => {
      if (item.divider) return '<div class="sheet-menu-divider"></div>';
      return `<div class="sheet-menu-item ${item.danger ? 'danger' : ''}" onclick="${item.fn}">
        <span class="sheet-menu-icon">${item.icon}</span>
        <span class="sheet-menu-label">${item.label}</span>
      </div>`;
    }).join('')}</div>`;

    BottomSheet.open('', html, { noHeader: true });

    // Resume on close
    document.getElementById('bs-backdrop')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
    document.querySelector('.bottom-sheet-close')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
  }

  /* ─── Sidebar comment submit ─────────────────────────────────────────── */
  function submitSidebarComment(input) {
    if (!input) return;
    const text = input.value.trim(); if (!text) return;
    const reel = reels[currentIndex];
    if (reel) reel.comments.push({ userId: InstagramData.currentUser.id, text, timestamp: Date.now() });
    input.value = '';
    const cu = InstagramData.currentUser;
    const sbComments = document.getElementById('reel-sb-comments');
    if (sbComments) {
      const div = document.createElement('div');
      div.className = 'reel-comment-item fade-in';
      div.innerHTML = `<div class="reel-comment-avatar"><img src="${cu.avatar}" alt=""></div>
        <div class="reel-comment-content"><div class="reel-comment-bubble"><div class="reel-comment-name">${cu.username}</div><div class="reel-comment-text">${text}</div></div><div class="reel-comment-meta"><span class="reel-comment-time">now</span></div></div>`;
      sbComments.appendChild(div);
      sbComments.scrollTop = sbComments.scrollHeight;
    }
    showToast('Comment posted!');
  }

  /* ─── Public ─────────────────────────────────────────────────────────── */
  return {
    open, close, next, prev,
    get swipeEnabled() { return _swipeEnabled; },
    toggleLike, toggleMute, togglePause, toggleFollow,
    pause, resume,
    openComments, _submitBsComment,
    openMenu,
    submitSidebarComment,
  };
})();

/* ── openInPage: endless embedded reel player in #page-reels ──────────── */
ReelPlayer.openInPage = function(startId) {
  const page = document.getElementById('page-reels');
  if (!page) return;
  document.body.classList.add('reel-player-active');  /* hide header + nav while watching */

  const allReels = _buildReelData();
  const idx = allReels.findIndex(r => r.id === startId);
  // Borrow the player's internal state
  const startIndex = idx >= 0 ? idx : 0;

  // We render the reel player layout directly inside #page-reels (not as modal overlay)
  page.innerHTML = `<div id="reel-page-player" style="width:100%;height:100vh;position:relative;background:#000;overflow:hidden"></div>`;

  // Open the player into the reel-player-layout
  // But we need to swap it from modal to in-page. Use the same render but inject into page.
  ReelPlayer.openEmbedded(startId, document.getElementById('reel-page-player'));
};

ReelPlayer.openEmbedded = function(reelId, container, isPageEmbed) {
  if (!container) return;
  const allReels = _buildReelData();
  const idx = allReels.findIndex(r => r.id === reelId);

  // Use a local copy of the player state
  let reels = allReels;
  let currentIndex = idx >= 0 ? idx : 0;
  let progTimer = null, progStart = null, isPaused = false, isMuted = false;
  const DURATION = 10000;
  let _swipeEnabled = true;

  function renderReel() {
    const reel = reels[currentIndex];
    if (!reel) return;
    const user = InstagramData.getUserById(reel.userId) || InstagramData.users[0];
    const isF = InstagramData.isFollowing(reel.userId);
    const cu = InstagramData.currentUser;

    const sb = reels.map((r, i) => {
      const u = InstagramData.getUserById(r.userId) || InstagramData.users[0];
      return `<div class="reel-comment-item"><div class="reel-comment-avatar"><img src="${u.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div><div class="reel-comment-content"><div class="reel-comment-bubble"><div class="reel-comment-name">${u.username}</div></div></div></div>`;
    }).slice(0,3).join('');

    const commHtml = reel.comments.map(c => {
      const cu2 = InstagramData.getUserById(c.userId) || InstagramData.users[0];
      return `<div class="reel-comment-item"><div class="reel-comment-avatar"><img src="${cu2.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div><div class="reel-comment-content"><div class="reel-comment-bubble"><div class="reel-comment-name">${cu2.username}</div><div class="reel-comment-text">${c.text}</div></div><div class="reel-comment-meta"><span class="reel-comment-time">${InstagramData.timeAgo(c.timestamp)}</span></div></div></div>`;
    }).join('');

    container.innerHTML = `
      <div class="reel-player-layout" style="height:100vh">
        <div class="reel-player-feed" id="reel-emb-feed">
          <div class="reel-card" id="reel-emb-card">
            <img class="reel-media" src="${reel.image}" alt="" onerror="this.src='https://picsum.photos/420/900?random=${currentIndex+100}'">
            <div class="reel-gradient-top"></div>
            <div class="reel-gradient-bottom"></div>
            <div class="reel-progress-bar"><div class="reel-progress-fill" id="remb-prog"></div></div>
            <!-- Back btn goes to previous page -->
            <div class="reel-back-btn" onclick="document.body.classList.remove('reel-player-active');history.back()">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="15 18 9 12 15 6"/></svg>
            </div>
            <div class="reel-controls">
              <div class="reel-ctrl-btn" id="remb-mute" onclick="window._reelEmbMute()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </div>
              <div class="reel-ctrl-btn" id="remb-pause" onclick="window._reelEmbPause()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </div>
            </div>
            <div class="reel-bottom">
              <div class="reel-bottom-left">
                <div class="reel-user-row">
                  <div class="reel-user-avatar" onclick="App.navigateTo('profile','${user.id}')">
                    <img src="${user.avatar}" alt="${user.username}" onerror="this.src='https://i.pravatar.cc/150?img=2'">
                  </div>
                  <div class="reel-username">
                    ${user.username}
                    ${user.isVerified ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0095f6" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` : ''}
                  </div>
                  <div class="reel-follow-btn ${isF?'following':''}" id="remb-follow" onclick="window._reelEmbFollow('${reel.userId}')">
                    ${isF?'Following':'Follow'}
                  </div>
                </div>
                <div class="reel-caption" onclick="this.classList.toggle('expanded')">${reel.caption}</div>
              </div>
              <div class="reel-actions-right">
                <div class="reel-action-btn" onclick="window._reelEmbLike()">
                  <div class="reel-action-icon" id="remb-like-icon">
                    ${reel.liked?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" stroke="#ed4956" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`}
                  </div>
                  <div class="reel-action-label" id="remb-likes">${InstagramData.formatCount(reel.likes)}</div>
                </div>
                <div class="reel-action-btn" onclick="window._reelEmbComments()">
                  <div class="reel-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div class="reel-action-label" id="remb-ccount">${reel.comments.length}</div>
                </div>
                <div class="reel-action-btn" onclick="showToast('Shared!')">
                  <div class="reel-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
                  <div class="reel-action-label">Share</div>
                </div>
                <div class="reel-action-btn" onclick="window._reelEmbMenu()">
                  <div class="reel-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                  </div>
                </div>
              </div>
            </div>
            <div class="reel-like-burst" id="remb-burst">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" stroke="#ed4956" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div class="reel-nav-up" onclick="window._reelEmbPrev()">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="18 15 12 9 6 15"/></svg>
            </div>
            <div class="reel-nav-down" onclick="window._reelEmbNext()">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>
        <div class="reel-sidebar">
          <div class="reel-sidebar-header">
            <div class="reel-sidebar-avatar" onclick="App.navigateTo('profile','${user.id}')">
              <img src="${user.avatar}" alt="${user.username}" onerror="this.src='https://i.pravatar.cc/150?img=2'">
            </div>
            <div class="reel-sidebar-username" onclick="App.navigateTo('profile','${user.id}')">${user.username}</div>
            <div class="reel-sidebar-follow ${isF?'following':''}" id="remb-sb-follow" onclick="window._reelEmbFollow('${reel.userId}')">${isF?'Following':'Follow'}</div>
          </div>
          <div class="reel-sidebar-caption">${reel.caption}</div>
          <div class="reel-sidebar-stats">
            <div class="reel-stat"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${reel.liked?'#ed4956':'none'}" stroke="${reel.liked?'#ed4956':'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${InstagramData.formatCount(reel.likes)}</div>
            <div class="reel-stat"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${reel.comments.length}</div>
            <div class="reel-stat"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg>${InstagramData.formatCount(reel.views)}</div>
          </div>
          <div class="reel-sidebar-comments" id="remb-sb-comments">${commHtml}</div>
          <div class="reel-sidebar-input">
            <div class="reel-sidebar-my-avatar"><img src="${cu.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=1'"></div>
            <input class="reel-sidebar-field" type="text" placeholder="Add a comment…"
                   onkeydown="if(event.key==='Enter'){showToast('Comment posted!');this.value='';event.preventDefault()}">
          </div>
        </div>
      </div>`;

    // Progress
    stopProg();
    progStart = performance.now(); isPaused = false;
    function tick() {
      if (isPaused) return;
      const fill = document.getElementById('remb-prog');
      if (!fill) return;
      const pct = Math.min(((performance.now() - progStart) / DURATION) * 100, 100);
      fill.style.width = pct + '%';
      if (pct < 100) progTimer = requestAnimationFrame(tick);
      else nextReel();
    }
    progTimer = requestAnimationFrame(tick);

    // Touch swipe up/down
    const card = document.getElementById('reel-emb-card');
    let tSY = 0;
    card?.addEventListener('touchstart', e => {
      if (e.target.closest('.reel-bottom, .reel-controls, .reel-back-btn')) return;
      tSY = e.touches[0].clientY;
      // Double tap
    }, { passive: true });
    card?.addEventListener('touchend', e => {
      if (e.target.closest('.reel-bottom, .reel-controls, .reel-back-btn')) return;
      const dy = e.changedTouches[0].clientY - tSY;
      if (Math.abs(dy) > 70) {
        if (dy < 0) nextReel();
        else prevReel();
      }
    }, { passive: true });

    function stopProg() { if (progTimer) { cancelAnimationFrame(progTimer); progTimer = null; } }
    function nextReel() { stopProg(); if (currentIndex < reels.length - 1) { currentIndex++; renderReel(); } else { currentIndex = 0; renderReel(); } }
    function prevReel() { stopProg(); if (currentIndex > 0) { currentIndex--; renderReel(); } }

    // Global handlers for onclick
    window._reelEmbNext = nextReel;
    window._reelEmbPrev = prevReel;
    window._reelEmbLike = () => {
      const r = reels[currentIndex]; if (!r) return;
      r.liked = !r.liked; r.likes += r.liked ? 1 : -1;
      const icon = document.getElementById('remb-like-icon');
      const cnt  = document.getElementById('remb-likes');
      if (icon) icon.innerHTML = r.liked ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" stroke="#ed4956" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      if (cnt) cnt.textContent = InstagramData.formatCount(r.likes);
      const burst = document.getElementById('remb-burst');
      if (burst) { burst.classList.remove('animate'); void burst.offsetWidth; burst.classList.add('animate'); burst.addEventListener('animationend',()=>burst.classList.remove('animate'),{once:true}); }
    };
    window._reelEmbMute = () => {
      isMuted = !isMuted;
      const btn = document.getElementById('remb-mute');
      if (btn) btn.innerHTML = isMuted ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    };
    window._reelEmbPause = () => {
      isPaused = !isPaused;
      const btn = document.getElementById('remb-pause');
      if (!isPaused) { progStart = performance.now() - ((parseFloat(document.getElementById('remb-prog')?.style.width)||0)/100*DURATION); progTimer = requestAnimationFrame(tick); }
      if (btn) btn.innerHTML = isPaused ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    };
    window._reelEmbFollow = (uid) => {
      InstagramData.toggleFollow(uid);
      const isF2 = InstagramData.isFollowing(uid);
      ['remb-follow','remb-sb-follow'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = isF2?'Following':'Follow'; el.classList.toggle('following',isF2); } });
      showToast(isF2?'Following!':'Unfollowed');
    };
    window._reelEmbComments = () => {
      const r = reels[currentIndex]; if (!r) return;
      const items = r.comments.map(c => {
        const cu3 = InstagramData.getUserById(c.userId)||InstagramData.users[0];
        return `<div class="sheet-comment-item"><div class="sheet-comment-avatar"><img src="${cu3.avatar}" alt="" loading="lazy"></div><div class="sheet-comment-content"><div class="sheet-comment-bubble"><div class="sheet-comment-username">${cu3.username}</div><div class="sheet-comment-text">${c.text}</div></div><div class="sheet-comment-meta"><span class="sheet-comment-time">${InstagramData.timeAgo(c.timestamp)}</span></div></div></div>`;
      }).join('') || '<div class="sheet-comments-empty"><p>No comments yet</p></div>';
      BottomSheet.open('Comments', `<div class="sheet-comments-list">${items}</div>`);
      const sheet = document.getElementById('bottom-sheet');
      if (sheet) {
        const row = document.createElement('div'); row.className = 'sheet-comment-input-row';
        row.innerHTML = `<div class="sheet-comment-my-avatar"><img src="${InstagramData.currentUser.avatar}" alt=""></div><input class="sheet-comment-field" type="text" placeholder="Add a comment…" onkeydown="if(event.key==='Enter'){showToast('Comment posted!');BottomSheet.close();event.preventDefault()}"><button class="sheet-comment-send-btn active" onclick="showToast('Comment posted!');BottomSheet.close()"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>`;
        sheet.appendChild(row);
      }
    };
    window._reelEmbMenu = () => {
      BottomSheet.open('',`<div class="sheet-menu-list"><div class="sheet-menu-item" onclick="showToast('Saved!');BottomSheet.close()"><span class="sheet-menu-icon">${Icons.bookmark}</span><span class="sheet-menu-label">Save</span></div><div class="sheet-menu-item" onclick="showToast('Shared!');BottomSheet.close()"><span class="sheet-menu-icon">${Icons.send}</span><span class="sheet-menu-label">Share</span></div><div class="sheet-menu-divider"></div><div class="sheet-menu-item danger" onclick="showToast('Reported.');BottomSheet.close()"><span class="sheet-menu-icon">${Icons.moreHorizontal}</span><span class="sheet-menu-label">Report</span></div><div class="sheet-menu-divider"></div><div class="sheet-menu-item" onclick="BottomSheet.close()"><span class="sheet-menu-icon">${Icons.close}</span><span class="sheet-menu-label">Cancel</span></div></div>`,{noHeader:true});
    };
  }

  renderReel();
};
