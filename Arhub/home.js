/**
 * home.js — Home feed with For You / Following tabs, all inner pages
 * Depends on: data.js, icons.js, postcard.js, story.js, explore.js
 */

var HomePage = (() => {

  let activeFeedTab = 'foryou';

  function render() {
    const page = document.getElementById('page-home');
    if (!page) return;
    page.innerHTML = `
      <div class="feed-wrapper">
        <div class="feed-tabs-bar">
          <div class="feed-tab ${activeFeedTab === 'foryou' ? 'active' : ''}" id="ftab-foryou" onclick="HomePage.switchFeedTab('foryou')">For you</div>
          <div class="feed-tab ${activeFeedTab === 'following' ? 'active' : ''}" id="ftab-following" onclick="HomePage.switchFeedTab('following')">Following</div>
        </div>
        <div class="stories-outer" id="stories-strip-container">${StoryManager.renderStrip()}</div>
        <div class="posts-grid" id="posts-grid"></div>
        <div class="feed-load-more" id="feed-load-more"><div class="feed-spinner"></div></div>
      </div>`;
    renderFeed();
  }

  function renderFeed() {
    const container = document.getElementById('posts-grid');
    if (!container) return;
    const allPosts = InstagramData.posts;
    const followed = InstagramData.state.followedUsers;
    const posts = activeFeedTab === 'following'
      ? allPosts.filter(p => followed.has(p.userId))
      : allPosts;

    if (!posts.length) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:70px 20px">
        ${Icons.profile}
        <h4>Follow people to see their posts</h4>
        <p>When you follow people, their posts will show up here.</p>
        <button class="btn btn-primary" onclick="HomePage.switchFeedTab('foryou')" style="margin-top:4px">Discover people</button>
      </div>`;
      const lm = document.getElementById('feed-load-more');
      if (lm) lm.style.display = 'none';
      return;
    }

    let html = '';
    posts.forEach(p => { html += PostCard.render(p.id); });
    container.innerHTML = html;

    setTimeout(() => {
      const lm = document.getElementById('feed-load-more');
      if (lm) lm.innerHTML = '<div class="feed-end-msg">You\'re all caught up 🎉</div>';
    }, 1200);
  }

  function switchFeedTab(tab) {
    activeFeedTab = tab;
    document.querySelectorAll('.feed-tab').forEach(el => el.classList.remove('active'));
    const tabEl = document.getElementById(`ftab-${tab}`);
    if (tabEl) tabEl.classList.add('active');
    const grid = document.getElementById('posts-grid');
    if (grid) {
      grid.style.cssText = 'opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s';
      setTimeout(() => {
        renderFeed();
        grid.style.cssText = 'opacity:1;transform:translateY(0);transition:opacity .2s,transform .2s';
      }, 150);
    }
  }

  function renderExplorePage() { ExploreManager.render(); }

  function renderNotificationsPage() {
    NotificationManager.render(); return;
    const page = document.getElementById('page-notifications');
    if (!page) return;
    const now = Date.now(), oneDay = 86400000;
    const thisWeek  = InstagramData.notifications.filter(n => (now - n.timestamp) < 7 * oneDay);
    const thisMonth = InstagramData.notifications.filter(n => (now - n.timestamp) >= 7 * oneDay);

    const renderNotif = (n) => {
      const user = InstagramData.getUserById(n.userId);
      if (!user) return '';
      let iconEl = '', text = '', actionEl = '', thumbEl = '';
      if (n.type === 'like')    iconEl = `<div class="notification-type-icon like">${Icons.heart}</div>`;
      if (n.type === 'comment') iconEl = `<div class="notification-type-icon comment">${Icons.comment}</div>`;
      if (n.type === 'follow')  iconEl = `<div class="notification-type-icon follow">${Icons.profile}</div>`;
      const t = `<span style="color:var(--text-muted)">${InstagramData.timeAgo(n.timestamp)}</span>`;
      if (n.type === 'like')    text = `<span class="notif-username">${user.username}</span> liked your photo. ${t}`;
      if (n.type === 'comment') text = `<span class="notif-username">${user.username}</span> commented: ${n.text} ${t}`;
      if (n.type === 'follow')  text = `<span class="notif-username">${user.username}</span> started following you. ${t}`;
      if (n.type === 'mention') text = `<span class="notif-username">${user.username}</span> mentioned you. ${t}`;
      if (n.postId) {
        const post = InstagramData.getPostById(n.postId);
        if (post) thumbEl = `<div class="notification-post-thumb"><img src="${post.images[0]}" alt="" loading="lazy"></div>`;
      } else if (n.type === 'follow') {
        const isF = InstagramData.isFollowing(n.userId);
        actionEl = `<span class="notification-follow-btn ${isF ? 'following' : ''}" id="nf-btn-${n.id}" onclick="HomePage.handleNotifFollow('${n.userId}','${n.id}')">${isF ? 'Following' : 'Follow'}</span>`;
      }
      return `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="HomePage.markNotifRead('${n.id}',this)">
          <div class="notification-avatar">
            <img src="${user.avatar}" alt="${user.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
            ${iconEl}
          </div>
          <div class="notification-body"><div class="notification-text">${text}</div></div>
          ${actionEl || thumbEl}
          ${!n.read ? '<div class="unread-dot"></div>' : ''}
        </div>`;
    };

    page.innerHTML = `
      <div class="notifications-page-wrap fade-in">
        <div class="notifications-page-header">
          <h2>Notifications</h2>
          <span class="notifications-mark-read" onclick="HomePage.markAllRead()">Mark all as read</span>
        </div>
        ${thisWeek.length  ? `<div class="notifications-section-title">This week</div>${thisWeek.map(renderNotif).join('')}` : ''}
        ${thisMonth.length ? `<div class="notifications-section-title">This month</div>${thisMonth.map(renderNotif).join('')}` : ''}
        ${!InstagramData.notifications.length ? `<div class="empty-state" style="margin-top:60px">${Icons.notification}<h4>Activity On Your Posts</h4><p>When someone likes or comments, you'll see it here.</p></div>` : ''}
      </div>`;
  }

  function handleNotifFollow(userId, notifId) { // Delegated to NotificationManager
    NotificationManager.handleFollow(userId, notifId); return;
    // legacy below:
    InstagramData.toggleFollow(userId);
    const isF = InstagramData.isFollowing(userId);
    const btn = document.getElementById(`nf-btn-${notifId}`);
    if (btn) { btn.textContent = isF ? 'Following' : 'Follow'; btn.classList.toggle('following', isF); }
    showToast(isF ? 'Following!' : 'Unfollowed');
  }

  function markNotifRead(id, el) { // Delegated
    NotificationManager.markRead(id); return;
    // legacy:
    const notif = InstagramData.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    if (el) el.classList.remove('unread');
    el?.querySelector('.unread-dot')?.remove();
    App.updateBadges();
  }

  function markAllRead() { // Delegated
    NotificationManager.markAllRead(); return;
    // legacy:
    InstagramData.notifications.forEach(n => n.read = true);
    document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
    document.querySelectorAll('.unread-dot').forEach(d => d.remove());
    App.updateBadges();
    showToast('All notifications marked as read');
  }

  function renderProfilePage(userId) {
    ProfileManager.render(userId);
  }

  
  function handleProfileFollow(userId) {
    InstagramData.toggleFollow(userId);
    const isF = InstagramData.isFollowing(userId);
    const btn = document.getElementById('profile-follow-btn');
    if (btn) { btn.textContent = isF ? 'Following' : 'Follow'; btn.className = `btn btn-${isF ? 'secondary' : 'primary'}`; btn.style.cssText = 'font-size:13px;padding:7px 22px'; }
    showToast(isF ? 'Following!' : 'Unfollowed');
  }

  function switchProfileTab(tab, el) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const grid = document.getElementById('profile-grid');
    if (!grid) return;
    if (tab === 'saved') {
      const saved = InstagramData.posts.filter(p => p.saved);
      if (!saved.length) { grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">${Icons.bookmark}<h4>Save</h4><p>Save photos to see again.</p></div>`; return; }
      grid.innerHTML = saved.map(p => `<div class="profile-grid-item" onclick="PostCard.openModal('${p.id}')"><img src="${p.images[0]}" alt="" loading="lazy"><div class="profile-grid-overlay"><div class="profile-grid-stat">${Icons.heartFilled}${InstagramData.formatCount(p.likes)}</div></div></div>`).join('');
    } else if (tab === 'reels' || tab === 'tagged') {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">${Icons.reels}<h4>No ${tab.charAt(0).toUpperCase()+tab.slice(1)} Yet</h4><p>Nothing here yet.</p></div>`;
    } else {
      const posts = InstagramData.posts.slice(0, 12);
      grid.innerHTML = posts.map(p => `<div class="profile-grid-item" onclick="PostCard.openModal('${p.id}')"><img src="${p.images[0]}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/300/300?random=77'"><div class="profile-grid-overlay"><div class="profile-grid-stat">${Icons.heartFilled}${InstagramData.formatCount(p.likes)}</div><div class="profile-grid-stat"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${p.comments.length}</div></div></div>`).join('');
    }
  }

  function renderMessagesPage() {
    const page = document.getElementById('page-messages');
    if (!page) return;
    const threadsHtml = InstagramData.messages.map(thread => {
      const partner = InstagramData.getUserById(thread.participantId);
      if (!partner) return '';
      const lastMsg = thread.messages[thread.messages.length - 1];
      const isOwn = lastMsg.from === 'user_0';
      return `<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseenter="this.style.background='var(--bg-2)'" onmouseleave="this.style.background='transparent'" onclick="showToast('Full messenger coming soon!')">
        <img src="${partner.avatar}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
        <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:${thread.unread > 0 ? 700 : 600}">${partner.username}</div><div style="font-size:13px;color:${thread.unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isOwn ? 'You: ' : ''}${lastMsg.text}</div></div>
        ${thread.unread > 0 ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>' : ''}
      </div>`;
    }).join('');
    page.innerHTML = `<div class="messages-page-wrap fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border)">
        <h2 style="font-size:18px;font-weight:700">${InstagramData.currentUser.username}</h2>
        <button class="btn btn-ghost" style="padding:6px" onclick="showToast('New message coming soon')">${Icons.plusSquare}</button>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--border)">
        <div class="search-bar"><div class="search-icon">${Icons.search}</div><input type="text" placeholder="Search" class="input-field" style="padding-left:36px"></div>
      </div>
      ${threadsHtml || `<div class="empty-state" style="margin-top:40px">${Icons.messenger}<h4>Your Messages</h4><p>Send private messages to a friend.</p><button class="btn btn-primary" onclick="showToast('Coming soon')">Send Message</button></div>`}
    </div>`;
  }

  function renderReelsPage() {
    ReelsPage.render();
  }

  
  function renderCreateModal() {
    const overlay = document.getElementById('create-modal-overlay');
    if (!overlay) return;
    const cu = InstagramData.currentUser;
    overlay.querySelector('.modal-content').innerHTML = `
      <div class="create-post-modal">
        <div class="create-post-header">
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:14px" onclick="App.closeCreateModal()">Cancel</button>
          <h3>New post</h3>
          <button class="btn btn-link" style="padding:4px 8px" onclick="HomePage.submitPost()">Share</button>
        </div>
        <div class="create-post-body">
          <div class="create-post-user-row">
            <div class="avatar avatar-md"><img src="${cu.avatar}" alt="${cu.username}" onerror="this.src='https://i.pravatar.cc/150?img=1'"></div>
            <span style="font-size:14px;font-weight:600">${cu.username}</span>
          </div>
          <textarea class="create-post-textarea" id="create-post-text" placeholder="Write a caption…" maxlength="2200" oninput="HomePage.updateCharCount(this)"></textarea>
          <div class="create-post-preview" id="create-preview"><img id="create-preview-img" src="" alt=""><div class="remove-image" onclick="HomePage.removePostImage()"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>
        </div>
        <div class="create-post-actions">
          <div class="create-post-media-btns">
            <label class="create-media-btn"><input type="file" accept="image/*" style="display:none" onchange="HomePage.handleImageUpload(event)">${Icons.image}</label>
            <button class="create-media-btn" onclick="HomePage.addEmoji()">${Icons.emoji}</button>
            <button class="create-media-btn" onclick="showToast('Location tagging coming soon')">${Icons.location}</button>
          </div>
          <span class="char-count" id="char-count">0 / 2200</span>
        </div>
      </div>`;
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    setTimeout(() => document.getElementById('create-post-text')?.focus(), 100);
  }

  function updateCharCount(textarea) {
    const count = document.getElementById('char-count');
    if (count) { count.textContent = `${textarea.value.length} / 2200`; count.classList.toggle('warning', textarea.value.length > 2000); }
  }
  function handleImageUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { const preview = document.getElementById('create-preview'); const img = document.getElementById('create-preview-img'); if (preview && img) { img.src = e.target.result; preview.classList.add('has-image'); } };
    reader.readAsDataURL(file);
  }
  function removePostImage() { const p = document.getElementById('create-preview'); const i = document.getElementById('create-preview-img'); if (p && i) { i.src = ''; p.classList.remove('has-image'); } }
  function addEmoji() { const t = document.getElementById('create-post-text'); if (!t) return; const emojis=['❤️','🔥','✨','😍','🙌','💯']; t.value += emojis[Math.floor(Math.random()*emojis.length)]; updateCharCount(t); }
  function submitPost() { const text = document.getElementById('create-post-text')?.value?.trim(); if (!text) { showToast('Write something first!'); return; } App.closeCreateModal(); showToast('Post shared! 🎉'); }

  return {
    render, renderFeed, switchFeedTab,
    renderExplorePage, renderNotificationsPage,
    handleNotifFollow, markNotifRead, markAllRead,
    renderProfilePage, handleProfileFollow, switchProfileTab,
    renderMessagesPage, renderReelsPage, renderCreateModal,
    updateCharCount, handleImageUpload, removePostImage, addEmoji, submitPost,
  };
})();
