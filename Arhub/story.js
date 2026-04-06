/**
 * story.js — Story strip + full-screen story viewer
 * All data sourced from InstagramData (data.js)
 */

var StoryManager = (() => {

  let currentUserIndex = 0;
  let currentStoryIndex = 0;
  let progressTimer = null;
  let progressStart = null;
  let progressDuration = 5000;
  let isPaused = false;
  let isMuted = false;
  let usersWithStories = [];
  let viewerEl = null;
  let _keyHandler = null;

  /* ── Strip render ──────────────────────────────────────────────────────── */
  function renderStrip() {
    usersWithStories = InstagramData.getUsersWithStories();
    const cu = InstagramData.currentUser;

    let html = `<div class="stories-strip"><div class="stories-scroll">
      <div class="story-item own" onclick="StoryManager.openAddStory()">
        <div class="story-ring add-story">
          <div class="story-ring-inner" style="width:54px;height:54px">
            <img src="${cu.avatar}" alt="${cu.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=1'">
          </div>
          <div class="story-add-icon">${Icons.plus}</div>
        </div>
        <span class="story-username">Your story</span>
      </div>`;

    usersWithStories.forEach((item, idx) => {
      const { user, allViewed } = item;
      if (!user) return;
      html += `
        <div class="story-item" onclick="StoryManager.open(${idx})">
          <div class="story-ring ${allViewed ? 'viewed' : ''}">
            <div class="story-ring-inner" style="width:54px;height:54px">
              <img src="${user.avatar}" alt="${user.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
            </div>
          </div>
          <span class="story-username">${user.username}</span>
        </div>`;
    });

    html += `</div></div>`;
    return html;
  }

  /* ── Open / Close ──────────────────────────────────────────────────────── */
  function open(userIdx) {
    usersWithStories = InstagramData.getUsersWithStories();
    currentUserIndex = userIdx;
    currentStoryIndex = 0;
    isPaused = false;

    viewerEl = document.getElementById('story-viewer');
    if (!viewerEl) return;

    renderViewer();
    viewerEl.classList.add('open');
    document.body.classList.add('no-scroll');
    startProgress();

    // Update URL
    const item = usersWithStories[userIdx];
    if (item && item.user) {
      if (typeof _setHash === 'function') _setHash('#story#' + item.user.username); else window.location.hash = '#story#' + item.user.username;
    }
  }

  function close() {
    if (!viewerEl) return;
    stopProgress();
    viewerEl.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (window.location.hash.startsWith('#story#')) { if (typeof _setHash === 'function') _setHash('#home'); else window.location.hash = '#home'; }
    var strip = document.getElementById('stories-strip-container');
    if (strip) strip.innerHTML = renderStrip();
  }

  function openAddStory() { showToast('Add story feature coming soon!'); }

  /* ── Render viewer ──────────────────────────────────────────────────────── */
  function renderViewer() {
    if (!viewerEl) return;
    const item = usersWithStories[currentUserIndex];
    if (!item) { close(); return; }

    const { user, stories } = item;
    const story = stories[currentStoryIndex];
    if (!story || !user) { close(); return; }

    InstagramData.markStoryViewed(story.id);

    const totalStories = stories.length;
    const timeAgo = InstagramData.timeAgo(story.timestamp);

    let progressBarsHtml = '';
    for (let i = 0; i < totalStories; i++) {
      const cls = i < currentStoryIndex ? 'done' : i === currentStoryIndex ? 'active' : '';
      progressBarsHtml += `<div class="story-progress-segment ${cls}"><div class="story-progress-fill" id="story-progress-fill-${i}"></div></div>`;
    }

    viewerEl.innerHTML = `
      <div class="story-viewer-close" onclick="StoryManager.close()">${Icons.close}</div>

      <div class="story-card" id="story-card">
        <div class="story-loading" id="story-loading"><div class="story-spinner"></div></div>

        <img class="story-media" id="story-media-img" src="${story.media}" alt=""
             onload="StoryManager.onMediaLoad()" onerror="StoryManager.onMediaLoad()">

        <div class="story-gradient-top"></div>
        <div class="story-gradient-bottom"></div>

        <div class="story-progress-bars" id="story-progress-bars">${progressBarsHtml}</div>

        <div class="story-header">
          <div class="story-header-left">
            <div class="story-header-avatar" style="cursor:pointer" onclick="StoryManager.goToProfile('${user.id}')">
              <img src="${user.avatar}" alt="${user.username}" onerror="this.src='https://i.pravatar.cc/150?img=2'">
            </div>
            <div class="story-header-info" style="cursor:pointer" onclick="StoryManager.goToProfile('${user.id}')">
              <span class="story-header-username">${user.username}</span>
              <span class="story-header-time">${timeAgo}</span>
            </div>
          </div>
          <div class="story-header-right">
            <div class="story-mute-btn" id="story-mute-btn" onclick="StoryManager.toggleMute()">${isMuted ? Icons.mute : Icons.unmute}</div>
            <div class="story-pause-btn" id="story-pause-btn" onclick="StoryManager.togglePause()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="story-prev-btn" onclick="StoryManager.prev()">${Icons.back}</div>
        <div class="story-next-btn" onclick="StoryManager.next()">${Icons.forward}</div>

        <div class="double-tap-heart" id="double-tap-heart">${Icons.heartFilled}</div>

        <div class="story-footer">
          <div class="story-reply-wrap">
            <input class="story-reply-input" id="story-reply-input" type="text"
                   placeholder="Reply to ${user.username}…"
                   onfocus="StoryManager.pause()"
                   onkeydown="if(event.key==='Enter'){StoryManager.sendReply('${user.username}');event.preventDefault()}"
                   oninput="StoryManager.onReplyInput(this)">
            <div class="story-send-btn" id="story-send-btn" onclick="StoryManager.sendReply('${user.username}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </div>
          </div>
          <div class="story-footer-actions">
            <div class="story-footer-btn" id="story-like-btn-el" onclick="StoryManager.likeStory('${story.id}')">${Icons.heart}</div>
            <div class="story-footer-btn" onclick="StoryManager.shareStory()">${Icons.send}</div>
          </div>
        </div>
      </div>`;

    setupStoryEvents();
  }

  /* ── Media loaded ──────────────────────────────────────────────────────── */
  function onMediaLoad() {
    const el = document.getElementById('story-loading');
    if (el) el.style.display = 'none';
  }

  /* ── Progress ──────────────────────────────────────────────────────────── */
  function startProgress() {
    stopProgress();
    const item = usersWithStories[currentUserIndex];
    if (!item) return;
    progressDuration = item.stories[currentStoryIndex]?.duration || 5000;
    progressStart = performance.now();
    animateProgress();
  }

  function animateProgress() {
    if (isPaused) return;
    const fill = document.getElementById(`story-progress-fill-${currentStoryIndex}`);
    if (!fill) return;
    const pct = Math.min(((performance.now() - progressStart) / progressDuration) * 100, 100);
    fill.style.width = pct + '%';
    if (pct < 100) progressTimer = requestAnimationFrame(animateProgress);
    else next();
  }

  function stopProgress() {
    if (progressTimer) { cancelAnimationFrame(progressTimer); progressTimer = null; }
  }

  function pause() {
    isPaused = true;
    stopProgress();
  }

  function resume() {
    if (!isPaused) return;
    const fill = document.getElementById(`story-progress-fill-${currentStoryIndex}`);
    if (fill) {
      progressStart = performance.now() - ((parseFloat(fill.style.width) || 0) / 100) * progressDuration;
    }
    isPaused = false;
    animateProgress();
  }

  /* ── Pause/Play toggle ──────────────────────────────────────────────────── */
  function togglePause() {
    const btn = document.getElementById('story-pause-btn');
    if (isPaused) {
      resume();
      if (btn) btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    } else {
      pause();
      if (btn) btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
  }

  /* ── Reply input helpers ─────────────────────────────────────────────────── */
  function sendReply(username) {
    const input = document.getElementById('story-reply-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { resume(); return; }
    input.value = '';
    const sendBtn = document.getElementById('story-send-btn');
    if (sendBtn) sendBtn.style.opacity = '0';
    showToast(`Reply sent to ${username} ✓`);
    resume();
  }

  function onReplyInput(input) {
    const btn = document.getElementById('story-send-btn');
    if (btn) btn.style.opacity = input.value.trim() ? '1' : '0';
  }

  /* ── Navigation ──────────────────────────────────────────────────────────── */
  function next() {
    stopProgress();
    const item = usersWithStories[currentUserIndex];
    if (!item) { close(); return; }
    if (currentStoryIndex < item.stories.length - 1) {
      currentStoryIndex++;
    } else if (currentUserIndex < usersWithStories.length - 1) {
      currentUserIndex++;
      currentStoryIndex = 0;
    } else { close(); return; }
    renderViewer();
    startProgress();
  }

  function prev() {
    stopProgress();
    if (currentStoryIndex > 0) {
      currentStoryIndex--;
    } else if (currentUserIndex > 0) {
      currentUserIndex--;
      currentStoryIndex = 0;
    }
    renderViewer();
    startProgress();
  }

  function nextUser() {
    stopProgress();
    if (currentUserIndex < usersWithStories.length - 1) {
      currentUserIndex++;
      currentStoryIndex = 0;
      renderViewer();
      startProgress();
    } else close();
  }

  function prevUser() {
    stopProgress();
    if (currentUserIndex > 0) {
      currentUserIndex--;
      currentStoryIndex = 0;
      renderViewer();
      startProgress();
    }
  }

  /* ── Mute ──────────────────────────────────────────────────────────────── */
  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('story-mute-btn');
    if (btn) btn.innerHTML = isMuted ? Icons.mute : Icons.unmute;
  }

  /* ── Like (targets specific button by id, not querySelector) ────────────── */
  function likeStory(storyId) {
    const likeBtn = document.getElementById('story-like-btn-el');
    if (likeBtn) {
      likeBtn.innerHTML = Icons.heartFilled;
      likeBtn.style.color = 'var(--danger)';
    }
    showToast('❤️ You liked this story');
  }

  /* ── Double tap (only shows burst, does NOT touch footer buttons) ─────────── */
  function doubleTapLike(x, y) {
    const heart = document.getElementById('double-tap-heart');
    if (!heart) return;
    heart.style.top  = y + 'px';
    heart.style.left = x + 'px';
    heart.style.transform = 'translate(-50%, -50%) scale(0)';
    heart.classList.remove('animate');
    void heart.offsetWidth;
    heart.classList.add('animate');
    heart.addEventListener('animationend', () => heart.classList.remove('animate'), { once: true });
    showToast('❤️ You liked this story');
  }

  function shareStory() { showToast('Shared!'); }
  function showMoreOptions() { showToast('More options coming soon'); }

  /* ── Events ──────────────────────────────────────────────────────────────── */
  function setupStoryEvents() {
    const card = document.getElementById('story-card');
    if (!card) return;

    if (_keyHandler) document.removeEventListener('keydown', _keyHandler);
    _keyHandler = (e) => {
      if (!viewerEl?.classList.contains('open')) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
      else if (e.key === ' ') togglePause();
    };
    document.addEventListener('keydown', _keyHandler);

    let touchStartX = 0, touchStartY = 0, touchStartTime = 0, lastTap = 0;

    card.addEventListener('touchstart', (e) => {
      if (e.target.closest('.story-footer, .story-header, .story-prev-btn, .story-next-btn')) return;
      touchStartX    = e.touches[0].clientX;
      touchStartY    = e.touches[0].clientY;
      touchStartTime = Date.now();

      const now = Date.now();
      if (now - lastTap < 300) doubleTapLike(touchStartX, touchStartY);
      lastTap = now;

      pause();
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      if (e.target.closest('.story-footer, .story-header, .story-prev-btn, .story-next-btn')) {
        resume(); return;
      }
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      if (Math.abs(dx) > 70 && Math.abs(dy) < 50) {
        if (dx < 0) nextUser(); else prevUser();
      } else if (dt < 250 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        const x = e.changedTouches[0].clientX;
        const w = card.offsetWidth;
        if (x < w * 0.35) prev();
        else if (x > w * 0.65) next();
        else togglePause();
      } else {
        resume();
      }
    }, { passive: true });

    card.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.story-footer, .story-header, .story-prev-btn, .story-next-btn')) pause();
    });
    card.addEventListener('mouseup', () => resume());
    card.addEventListener('mouseleave', () => { if (isPaused) resume(); });
  }

  /* ── Go to profile ──────────────────────────────────────────────────────── */
  function goToProfile(userId) {
    close();
    setTimeout(() => App.navigateTo('profile', userId), 200);
  }

  /* ── Story comments ──────────────────────────────────────────────────────── */
  function openStoryComments(storyId, userId) {
    pause();
    const user = InstagramData.getUserById(userId);
    if (!user) return;

    // Use story comments from data if available
    const storyData = InstagramData.stories.find(s => s.id === storyId);
    const comments = storyData?.replies || [
      { username: 'sofia.chen', text: '❤️ so good!',     time: '2h' },
      { username: 'marcus.j',   text: 'Amazing story 🔥', time: '1h' },
    ];

    const listHtml = comments.map(c => `
      <div class="sheet-comment-item">
        <div class="sheet-comment-content">
          <div class="sheet-comment-bubble">
            <div class="sheet-comment-username">${c.username}</div>
            <div class="sheet-comment-text">${c.text}</div>
          </div>
          <div class="sheet-comment-meta"><span class="sheet-comment-time">${c.time}</span></div>
        </div>
      </div>`).join('');

    BottomSheet.open('Comments', `<div class="sheet-comments-list">${listHtml || '<div class="sheet-comments-empty"><p>No replies yet</p></div>'}</div>`);

    const sheet = document.getElementById('bottom-sheet');
    if (sheet) {
      const row = document.createElement('div');
      row.className = 'sheet-comment-input-row';
      row.innerHTML = `
        <div class="sheet-comment-my-avatar">
          <img src="${InstagramData.currentUser.avatar}" alt="" loading="lazy">
        </div>
        <input class="sheet-comment-field" type="text" placeholder="Reply to ${user.username}…"
               onkeydown="if(event.key==='Enter'){showToast('Reply sent!');BottomSheet.close();event.preventDefault()}">
        <button class="sheet-comment-send-btn active" onclick="showToast('Reply sent!');BottomSheet.close()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>`;
      sheet.appendChild(row);
      document.getElementById('bs-backdrop')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
      document.querySelector('.bottom-sheet-close')?.addEventListener('click', () => setTimeout(resume, 100), { once: true });
    }
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */
  return {
    renderStrip, open, close, openAddStory,
    next, prev, nextUser, prevUser,
    toggleMute, togglePause,
    likeStory, doubleTapLike, shareStory, showMoreOptions,
    pause, resume, onMediaLoad,
    goToProfile, openStoryComments,
    sendReply, onReplyInput,
  };

})();
