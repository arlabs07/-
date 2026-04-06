/**
 * explore.js — Explore page: clean tab separation, heart-only hover, post modal integration
 */

var ExploreManager = (() => {
  let activeTab = 'all';
  let searchQuery = '';
  let searchTimer = null;

  function render() {
    const page = document.getElementById('page-explore');
    if (!page) return;

    page.innerHTML = `
      <div class="explore-root">
        <div class="explore-topbar">
          <div class="explore-search-row">
            <div class="explore-search-wrap">
              <span class="explore-search-icon">${Icons.search}</span>
              <input class="explore-search-input" id="exp-input" type="text"
                     placeholder="Search posts, reels, people…" autocomplete="off"
                     oninput="ExploreManager.onInput(this.value)"
                     onfocus="ExploreManager.onFocus()">
              <span class="explore-search-clear" id="exp-clear" onclick="ExploreManager.clearSearch()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
            </div>
          </div>
          <div class="explore-tabs">
            <div class="explore-tab active" id="etab-all" onclick="ExploreManager.switchTab('all')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              All
            </div>
            <div class="explore-tab" id="etab-posts" onclick="ExploreManager.switchTab('posts')">
              ${Icons.image} Posts
            </div>
            <div class="explore-tab" id="etab-reels" onclick="ExploreManager.switchTab('reels')">
              ${Icons.reels} Reels
            </div>
            <div class="explore-tab" id="etab-people" onclick="ExploreManager.switchTab('people')">
              ${Icons.profile} People
            </div>
          </div>
        </div>
        <div class="explore-content">
          <div class="explore-results" id="exp-results"></div>
          <div class="explore-grid-panel" id="exp-grid">${buildGrid('all')}</div>
        </div>
      </div>`;
  }

  /* ── Tab switch ───────────────────────────────────────────────────────── */
  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.explore-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`etab-${tab}`)?.classList.add('active');
    if (searchQuery.trim()) {
      renderResults(searchQuery);
    } else {
      const grid = document.getElementById('exp-grid');
      if (grid) grid.innerHTML = buildGrid(tab);
    }
  }

  /* ── Grid builder ─────────────────────────────────────────────────────── */
  function buildGrid(tab) {
    if (tab === 'people') return buildPeople();

    const all = InstagramData.explorePosts;

    // Tab: posts = non-reel items only; reels = reel items only; all = mix
    let items;
    if (tab === 'posts') {
      items = all.filter((_, i) => i % 7 !== 0 && i % 5 !== 0);
    } else if (tab === 'reels') {
      items = all.filter((_, i) => i % 7 === 0 || i % 5 === 0);
    } else {
      items = all;
    }

    let html = '<div class="explore-masonry">';
    items.forEach((post, i) => {
      const isTall   = (tab === 'all') && i % 7 === 0 && i !== 0;
      const isReel   = post.isVideo || (tab === 'all' && i % 7 === 0) || tab === 'reels';
      const isCarou  = post.isCarousel && !isReel;
      // Map back to real post for modal — use first real post if explore post matches
      const realPost = InstagramData.posts[i % InstagramData.posts.length];

      html += `
        <div class="explore-item ${isTall ? 'tall' : ''} ${isReel ? 'reel' : ''}"
             onclick="ExploreManager.handleClick('${realPost.id}', '${post.id}', ${isReel})">
          <img src="${post.image}" alt="" loading="lazy"
               onerror="this.src='https://picsum.photos/300/300?random=${Math.floor(Math.random()*90)+10}'">
          ${isReel ? `<span class="explore-item-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>` : ''}
          ${isCarou ? `<span class="explore-item-carousel">${Icons.carousel}</span>` : ''}
          <div class="explore-item-overlay">
            <div class="explore-item-heart">
              ${Icons.heartFilled}
              ${InstagramData.formatCount(post.likes)}
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function buildPeople() {
    let html = '<div class="explore-people-grid">';
    InstagramData.users.forEach(user => {
      const isF = InstagramData.isFollowing(user.id);
      html += `
        <div class="explore-person-card" onclick="App.navigateTo('profile','${user.id}')">
          <div class="explore-person-avatar-wrap">
            <div class="explore-person-avatar">
              <img src="${user.avatar}" alt="${user.username}" loading="lazy"
                   onerror="this.src='https://i.pravatar.cc/150?img=2'">
            </div>
          </div>
          <div class="explore-person-name">
            ${user.username}
            ${user.isVerified ? `<span style="display:inline-flex;width:12px;height:12px">${Icons.verified}</span>` : ''}
          </div>
          <div class="explore-person-followers">${InstagramData.formatCount(user.followers)} followers</div>
          <div class="explore-person-follow-btn ${isF ? 'following' : ''}"
               id="ep-follow-${user.id}"
               onclick="event.stopPropagation();ExploreManager.handlePersonFollow('${user.id}')">
            ${isF ? 'Following' : 'Follow'}
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  /* ── Click handler ────────────────────────────────────────────────────── */
  function handleClick(realPostId, explorePostId, isReel) {
    if (isReel) {
      // Open reel player in single-reel mode (no swipe up/down)
      ReelPlayer.open(explorePostId, { allowSwipe: false });
      return;
    }
    // Open post — try real post first, else show toast
    const post = InstagramData.getPostById(realPostId);
    if (post) {
      PostCard.openModal(realPostId);
    } else {
      showToast('Opening post…');
    }
  }

  function handlePersonFollow(userId) {
    InstagramData.toggleFollow(userId);
    const isF = InstagramData.isFollowing(userId);
    const btn = document.getElementById(`ep-follow-${userId}`);
    if (btn) { btn.textContent = isF ? 'Following' : 'Follow'; btn.classList.toggle('following', isF); }
    const user = InstagramData.getUserById(userId);
    showToast(isF ? `Following ${user?.username}!` : 'Unfollowed');
  }

  /* ── Search ───────────────────────────────────────────────────────────── */
  function onInput(val) {
    searchQuery = val;
    document.getElementById('exp-clear')?.classList.toggle('visible', val.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (val.trim()) renderResults(val.trim());
      else hideResults();
    }, 280);
  }

  function onFocus() { if (searchQuery.trim()) renderResults(searchQuery); }

  function clearSearch() {
    searchQuery = '';
    const inp = document.getElementById('exp-input');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('exp-clear')?.classList.remove('visible');
    hideResults();
  }

  function renderResults(query) {
    const q = query.toLowerCase();
    const showPosts  = activeTab === 'all' || activeTab === 'posts';
    const showReels  = activeTab === 'all' || activeTab === 'reels';
    const showPeople = activeTab === 'all' || activeTab === 'people';

    const matchedUsers  = showPeople  ? InstagramData.users.filter(u => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)) : [];
    const matchedPosts  = showPosts   ? InstagramData.posts.filter(p => p.caption.toLowerCase().includes(q) || (p.location && p.location.toLowerCase().includes(q))) : [];
    const reelItems     = showReels   ? InstagramData.explorePosts.filter((_,i) => i%7===0 || i%5===0).slice(0, 6) : [];

    let html = '';

    if (!matchedUsers.length && !matchedPosts.length && !reelItems.length) {
      html = `<div class="explore-no-results">${Icons.search}<h4>No results for "${query}"</h4><p>Try a different search term.</p></div>`;
    } else {
      if (matchedUsers.length) {
        html += `<div class="explore-result-section">People</div>`;
        matchedUsers.slice(0, 5).forEach(user => {
          const isF = InstagramData.isFollowing(user.id);
          html += `<div class="explore-user-row" onclick="App.navigateTo('profile','${user.id}')">
            <div class="explore-user-avatar"><img src="${user.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div>
            <div class="explore-user-info">
              <div class="explore-user-name">${user.username}${user.isVerified?Icons.verified:''}</div>
              <div class="explore-user-meta">${user.fullName} · ${InstagramData.formatCount(user.followers)} followers</div>
            </div>
            <span class="explore-user-follow ${isF?'following':''}" id="erf-${user.id}"
                  onclick="event.stopPropagation();ExploreManager.handleSearchFollow('${user.id}')">
              ${isF?'Following':'Follow'}
            </span>
          </div>`;
        });
      }

      if (matchedPosts.length) {
        html += `<div class="explore-result-section">Posts</div><div class="explore-masonry" style="padding:0 3px">`;
        matchedPosts.slice(0, 9).forEach(post => {
          html += `<div class="explore-item" onclick="PostCard.openModal('${post.id}')">
            <img src="${post.images[0]}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/300/300?random=55'">
            ${post.images.length>1?`<span class="explore-item-carousel">${Icons.carousel}</span>`:''}
            <div class="explore-item-overlay"><div class="explore-item-heart">${Icons.heartFilled}${InstagramData.formatCount(post.likes)}</div></div>
          </div>`;
        });
        html += '</div>';
      }

      if (reelItems.length) {
        html += `<div class="explore-result-section">Reels</div><div class="explore-masonry" style="padding:0 3px">`;
        reelItems.forEach(post => {
          html += `<div class="explore-item" onclick="ReelPlayer.open('${post.id}')">
            <img src="${post.image}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/300/300?random=66'">
            <span class="explore-item-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
            <div class="explore-item-overlay"><div class="explore-item-heart">${Icons.heartFilled}${InstagramData.formatCount(post.likes)}</div></div>
          </div>`;
        });
        html += '</div>';
      }
    }

    const resultsEl = document.getElementById('exp-results');
    const gridEl = document.getElementById('exp-grid');
    if (resultsEl) { resultsEl.innerHTML = html; resultsEl.classList.add('visible'); }
    if (gridEl) gridEl.classList.add('hidden');
  }

  function hideResults() {
    const resultsEl = document.getElementById('exp-results');
    const gridEl = document.getElementById('exp-grid');
    if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.classList.remove('visible'); }
    if (gridEl) { gridEl.classList.remove('hidden'); gridEl.innerHTML = buildGrid(activeTab); }
  }

  function handleSearchFollow(userId) {
    InstagramData.toggleFollow(userId);
    const isF = InstagramData.isFollowing(userId);
    const btn = document.getElementById(`erf-${userId}`);
    if (btn) { btn.textContent = isF ? 'Following' : 'Follow'; btn.classList.toggle('following', isF); }
    const user = InstagramData.getUserById(userId);
    showToast(isF ? `Following ${user?.username}!` : 'Unfollowed');
  }

  return {
    render, switchTab, onInput, onFocus, clearSearch,
    handleClick, handlePersonFollow, handleSearchFollow,
  };
})();
