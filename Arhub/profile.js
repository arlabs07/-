/**
 * profile.js — Own Profile + Other User Profile Pages
 * Handles: profile rendering, story ring click, followers/following modal
 * Note: followers/following lists are read-only (cannot navigate into sub-profiles)
 */

var ProfileManager = (() => {

  /* ══════════════════════════════════════════════════════════════════
     MAIN RENDER ENTRY POINT
  ══════════════════════════════════════════════════════════════════ */

  function render(userId) {
    const page = document.getElementById('page-profile');
    if (!page) return;

    const uid     = userId || 'user_0';
    const isOwn   = uid === 'user_0' || uid === InstagramData.currentUser.id;
    const user    = isOwn ? InstagramData.currentUser : InstagramData.getUserById(uid);
    if (!user) { page.innerHTML = '<div class="empty-state"><h4>User not found</h4></div>'; return; }

    const userPosts    = InstagramData.posts.filter(p => p.userId === uid);
    const displayPosts = isOwn ? InstagramData.posts.slice(0, 12) : userPosts;
    const postsCount   = isOwn ? InstagramData.currentUser.postsCount : userPosts.length;

    // Story ring state
    const userStories = InstagramData.stories.filter(s => s.userId === uid);
    const hasStory    = userStories.length > 0;
    const allViewed   = hasStory && userStories.every(s => s.viewed);

    let ringClass = 'no-story';
    let ringOnClick = '';
    if (hasStory) {
      ringClass = allViewed ? 'story-viewed' : '';
      const storyUserIdx = InstagramData.getUsersWithStories().findIndex(i => i.user?.id === uid);
      ringOnClick = `StoryManager.open(${storyUserIdx})`;
    }

    const isFollowing  = !isOwn && InstagramData.isFollowing(uid);
    const isMutualFollow = !isOwn && isFollowing && InstagramData.isFollowing(uid);

    page.innerHTML = `
      <div class="profile-page-wrap fade-in">

        <!-- Mobile topbar (back + username) -->
        <div class="profile-mobile-topbar">
          <div class="profile-topbar-back" onclick="history.back()">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </div>
          <span class="profile-topbar-username">${user.username}</span>
          <div class="profile-topbar-more" onclick="ProfileManager.openProfileMenu('${uid}', ${isOwn})">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </div>
        </div>

        <!-- Header -->
        <div class="profile-header-section">
          <!-- Avatar with story ring -->
          <div class="profile-avatar-wrap">
            <div class="profile-avatar-ring ${ringClass}"
                 ${ringOnClick ? `onclick="${ringOnClick}"` : ''}
                 title="${hasStory ? 'View story' : ''}">
              <div class="profile-avatar-inner">
                <img src="${user.avatar}" alt="${user.username}"
                     onerror="this.src='https://i.pravatar.cc/150?img=1'" loading="lazy">
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="profile-info-section">
            <div class="profile-username-row">
              <span class="profile-username-display">
                ${user.username}
                ${user.isVerified
                  ? `<span style="display:inline-flex;width:18px;height:18px">${Icons.verified}</span>`
                  : ''}
              </span>
              <div class="profile-action-btns">
                ${_renderActionBtns(uid, isOwn, isFollowing)}
              </div>
            </div>

            <!-- Stats (desktop) -->
            <div class="profile-stats-row">
              ${_renderStats(uid, postsCount, user, isOwn)}
            </div>

            <!-- Bio -->
            <div class="profile-bio-section">
              <div class="profile-fullname">${user.fullName}</div>
              ${user.bio ? `<div class="profile-bio-text">${user.bio}</div>` : ''}
              ${user.website ? `
                <a class="profile-website" href="#" onclick="showToast('Opening ${user.website}');return false">
                  ${Icons.link} ${user.website}
                </a>` : ''}
            </div>
          </div>
        </div>

        <!-- Stats (mobile — shown below header) -->
        <div class="profile-stats-mobile">
          ${_renderStats(uid, postsCount, user, isOwn)}
        </div>

        <!-- Tabs -->
        <div class="profile-tabs" id="profile-tabs-${uid}">
          <div class="profile-tab active" id="ptab-posts-${uid}"
               onclick="ProfileManager.switchTab('posts','${uid}',this)">
            ${Icons.grid}
            <span class="profile-tab-label">Posts</span>
          </div>
          <div class="profile-tab" id="ptab-reels-${uid}"
               onclick="ProfileManager.switchTab('reels','${uid}',this)">
            ${Icons.reels}
            <span class="profile-tab-label">Reels</span>
          </div>
          ${isOwn ? `
          <div class="profile-tab" id="ptab-saved-${uid}"
               onclick="ProfileManager.switchTab('saved','${uid}',this)">
            ${Icons.bookmark}
            <span class="profile-tab-label">Saved</span>
          </div>` : ''}
          <div class="profile-tab" id="ptab-tagged-${uid}"
               onclick="ProfileManager.switchTab('tagged','${uid}',this)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="profile-tab-label">Tagged</span>
          </div>
        </div>

        <!-- Grid -->
        <div class="profile-grid" id="profile-grid-${uid}">
          ${_buildGrid(displayPosts)}
        </div>

      </div>`;
  }

  /* ── Action buttons ────────────────────────────────────────────── */
  function _renderActionBtns(uid, isOwn, isFollowing) {
    if (isOwn) {
      return `
        <button class="btn btn-secondary" style="font-size:13px;padding:7px 16px"
                onclick="showToast('Edit profile coming soon')">Edit profile</button>
        <button class="btn btn-secondary" style="font-size:13px;padding:7px 16px"
                onclick="showToast('Share profile coming soon')">Share profile</button>`;
    }
    return `
      <button class="btn btn-${isFollowing ? 'secondary' : 'primary'}"
              style="font-size:13px;padding:7px 22px"
              id="profile-follow-btn-${uid}"
              onclick="ProfileManager.toggleFollow('${uid}')">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
      <button class="btn btn-secondary" style="font-size:13px;padding:7px 16px"
              onclick="showToast('Messenger coming soon')">Message</button>
      <button class="btn btn-secondary" style="font-size:13px;padding:7px;width:36px"
              onclick="ProfileManager.openProfileMenu('${uid}', false)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>`;
  }

  /* ── Stats row ─────────────────────────────────────────────────── */
  function _renderStats(uid, postsCount, user, isOwn) {
    return `
      <div class="profile-stat">
        <span class="profile-stat-number">${InstagramData.formatCount(postsCount)}</span>
        <span class="profile-stat-label">posts</span>
      </div>
      <div class="profile-stat" onclick="ProfileManager.openFollowersModal('${uid}','followers')">
        <span class="profile-stat-number">${InstagramData.formatCount(user.followers)}</span>
        <span class="profile-stat-label">followers</span>
      </div>
      <div class="profile-stat" onclick="ProfileManager.openFollowersModal('${uid}','following')">
        <span class="profile-stat-number">${InstagramData.formatCount(user.following)}</span>
        <span class="profile-stat-label">following</span>
      </div>`;
  }

  /* ── Grid builder ──────────────────────────────────────────────── */
  function _buildGrid(posts) {
    if (!posts.length) {
      return `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
        ${Icons.camera}
        <h4>No Posts Yet</h4>
        <p>When you share photos, they'll appear here.</p>
      </div>`;
    }
    return posts.map(p => `
      <div class="profile-grid-item" onclick="PostCard.openModal('${p.id}')">
        <img src="${p.images?.[0] || ''}" alt="" loading="lazy"
             onerror="this.src='https://picsum.photos/300/300?random=77'">
        ${p.images?.length > 1 ? `<div class="explore-item-badge">${Icons.carousel}</div>` : ''}
        <div class="profile-grid-overlay">
          <div class="profile-grid-stat">
            ${Icons.heartFilled}
            ${InstagramData.formatCount(p.likes)}
          </div>
          <div class="profile-grid-stat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${p.comments.length}
          </div>
        </div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════════════════════════════════
     TAB SWITCHING
  ══════════════════════════════════════════════════════════════════ */

  function switchTab(tab, uid, el) {
    // Deactivate all tabs for this profile
    document.querySelectorAll(`[id^="ptab-"][id$="-${uid}"]`).forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    const grid = document.getElementById(`profile-grid-${uid}`);
    if (!grid) return;

    if (tab === 'saved') {
      const saved = InstagramData.posts.filter(p => p.saved);
      grid.innerHTML = saved.length
        ? _buildGrid(saved)
        : `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
            ${Icons.bookmark}<h4>Save</h4><p>Save photos and videos to see again.</p>
           </div>`;

    } else if (tab === 'reels') {
      // Show reels from explore data as grid
      const reelPosts = InstagramData.explorePosts.filter((_, i) => i % 3 === 0).slice(0, 9);
      grid.innerHTML = reelPosts.map((post, i) => `
        <div class="profile-grid-item" onclick="ReelPlayer.open('${post.id}', {allowSwipe:false})">
          <img src="${post.image}" alt="" loading="lazy"
               onerror="this.src='https://picsum.photos/300/300?random=${i+70}'">
          <div style="position:absolute;top:8px;right:8px;color:white;filter:drop-shadow(0 1px 4px rgba(0,0,0,.5))">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div class="profile-grid-overlay">
            <div class="profile-grid-stat">
              ${Icons.heartFilled}
              ${InstagramData.formatCount(post.likes)}
            </div>
          </div>
        </div>`).join('');

    } else if (tab === 'tagged') {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:.35">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <h4>No Tagged Posts</h4>
        <p>When people tag you in photos, they'll appear here.</p>
      </div>`;

    } else {
      // Posts — reload
      const userPosts = uid === 'user_0' || uid === InstagramData.currentUser.id
        ? InstagramData.posts.slice(0, 12)
        : InstagramData.posts.filter(p => p.userId === uid);
      grid.innerHTML = _buildGrid(userPosts);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     FOLLOW / UNFOLLOW
  ══════════════════════════════════════════════════════════════════ */

  function toggleFollow(uid) {
    InstagramData.toggleFollow(uid);
    const isF = InstagramData.isFollowing(uid);
    const btn = document.getElementById(`profile-follow-btn-${uid}`);
    if (btn) {
      btn.textContent  = isF ? 'Following' : 'Follow';
      btn.className    = `btn btn-${isF ? 'secondary' : 'primary'}`;
      btn.style.cssText = 'font-size:13px;padding:7px 22px';
    }
    showToast(isF ? 'Following!' : 'Unfollowed');
  }

  /* ══════════════════════════════════════════════════════════════════
     FOLLOWERS / FOLLOWING MODAL
     Note: list is READ-ONLY — cannot navigate into other profiles from here
  ══════════════════════════════════════════════════════════════════ */

  function openFollowersModal(uid, type) {
    const overlay = document.getElementById('post-modal-overlay');
    if (!overlay) return;

    const isOwn = uid === 'user_0' || uid === InstagramData.currentUser.id;
    const title = type === 'followers' ? 'Followers' : 'Following';

    // Build list of users to show
    // For own profile: show all users (simulated)
    // For other profiles: show a subset
    const allUsers = InstagramData.users;
    const listUsers = isOwn ? allUsers : allUsers.slice(0, Math.min(allUsers.length, 6));

    const listHtml = listUsers.map(user => {
      const isFollowing = InstagramData.isFollowing(user.id);
      const actionLabel = isOwn && type === 'followers' ? 'Remove' : (isFollowing ? 'Following' : 'Follow');
      const actionClass = isOwn && type === 'followers' ? 'remove' : (isFollowing ? 'following' : 'follow');

      return `
        <div class="followers-list-item">
          <div class="followers-list-avatar">
            <img src="${user.avatar}" alt="${user.username}" loading="lazy"
                 onerror="this.src='https://i.pravatar.cc/150?img=2'">
          </div>
          <div class="followers-list-info">
            <div class="followers-list-username">
              ${user.username}
              ${user.isVerified ? `<span style="width:13px;height:13px;display:inline-flex">${Icons.verified}</span>` : ''}
            </div>
            <div class="followers-list-name">${user.fullName}</div>
          </div>
          ${isOwn || !isOwn ? `
            <div class="followers-list-action ${actionClass}"
                 id="fl-btn-${user.id}-${type}"
                 onclick="ProfileManager._followListAction('${user.id}','${type}',this)">
              ${actionLabel}
            </div>` : ''}
        </div>`;
    }).join('');

    overlay.querySelector('.modal-content').innerHTML = `
      <div class="followers-modal-content">
        <div class="followers-modal-header">
          <span class="followers-modal-title">${title}</span>
          <div class="followers-modal-close" onclick="PostCard.closeModal()">
            ${Icons.close}
          </div>
        </div>
        <div class="followers-modal-list">
          ${listHtml || `<div class="empty-state" style="padding:40px 20px">
            <h4>No ${title}</h4><p>Nothing to show here yet.</p></div>`}
        </div>
      </div>`;

    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function _followListAction(userId, type, el) {
    if (type === 'followers') {
      // Remove follower (simulated)
      showToast('Removed from followers');
      el.closest('.followers-list-item')?.remove();
    } else {
      InstagramData.toggleFollow(userId);
      const isF = InstagramData.isFollowing(userId);
      el.textContent = isF ? 'Following' : 'Follow';
      el.className = `followers-list-action ${isF ? 'following' : 'follow'}`;
      showToast(isF ? 'Following!' : 'Unfollowed');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     PROFILE MENU (three-dot)
  ══════════════════════════════════════════════════════════════════ */

  function openProfileMenu(uid, isOwn) {
    const ownItems = [
      { icon: Icons.settings,  label: 'Settings',         fn: `showToast('Settings coming soon');BottomSheet.close()` },
      { icon: Icons.bookmark,  label: 'Saved',             fn: `App.navigateTo('profile','user_0');BottomSheet.close()` },
      { icon: Icons.reels,     label: 'Your activity',     fn: `showToast('Activity coming soon');BottomSheet.close()` },
      { divider: true },
      { icon: Icons.logout,    label: 'Log out',           fn: `showToast('Logged out!');BottomSheet.close()` },
      { divider: true },
      { icon: Icons.close,     label: 'Cancel',            fn: `BottomSheet.close()` },
    ];

    const user = InstagramData.getUserById(uid);
    const isF  = !isOwn && InstagramData.isFollowing(uid);

    const otherItems = [
      { icon: Icons.moreHorizontal, label: 'About this account',  fn: `showToast('Account info coming soon');BottomSheet.close()` },
      { icon: Icons.send,           label: 'Share profile',        fn: `showToast('Profile link copied!');BottomSheet.close()` },
      { divider: true },
      { icon: Icons.profile,        label: isF ? 'Unfollow' : 'Follow', fn: `ProfileManager.toggleFollow('${uid}');BottomSheet.close()` },
      { icon: Icons.moreHorizontal, label: 'Restrict',             fn: `showToast('Restricted');BottomSheet.close()` },
      { icon: Icons.close,          label: 'Block',                fn: `showToast('Blocked');BottomSheet.close()`, danger: true },
      { divider: true },
      { icon: Icons.moreHorizontal, label: 'Report',               fn: `showToast('Reported. Thanks.');BottomSheet.close()`, danger: true },
      { divider: true },
      { icon: Icons.close,          label: 'Cancel',               fn: `BottomSheet.close()` },
    ];

    const items = isOwn ? ownItems : otherItems;
    const html = `<div class="sheet-menu-list">${items.map(item => {
      if (item.divider) return '<div class="sheet-menu-divider"></div>';
      return `<div class="sheet-menu-item ${item.danger ? 'danger' : ''}" onclick="${item.fn}">
        <span class="sheet-menu-icon">${item.icon}</span>
        <span class="sheet-menu-label">${item.label}</span>
      </div>`;
    }).join('')}</div>`;

    BottomSheet.open('', html, { noHeader: true });
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  return {
    render,
    switchTab,
    toggleFollow,
    openFollowersModal,
    _followListAction,
    openProfileMenu,
  };

})();
