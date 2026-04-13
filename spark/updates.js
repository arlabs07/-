/**
 * updates.js — Status / Updates v7
 *
 * - Status comments stored in spark_status_comments table
 * - Comment icon alongside heart opens bottom overlay with all comments
 * - Auto-pauses status auto-advance when comment overlay is open
 * - Combined stats overlay: 3 tabs — Viewers | Hearts | Comments
 * - Reactions use Material Icons (same mechanism as messages)
 * - No restriction system
 */

const UpdatesPage = (() => {

  const CACHE_KEY  = 'updates_statuses';
  const CACHE_CONN = 'updates_connections';
  const SYNC_KEY   = 'updates_sync';

  const STATUS_BG = ['#0095f6','#ed4956','#2dd55b','#f0a030','#bc1888','#1a1a2e','#8a2be2','#e6683c'];

  const COMMENT_REACTIONS = [
    { icon: 'favorite',  color: '#ed4956', key: 'heart' },
    { icon: 'thumb_up',  color: '#0095f6', key: 'like'  },
    { icon: 'sentiment_very_satisfied', color: '#f0a030', key: 'laugh' },
  ];

  let _container  = null;
  let _myStatuses = [];
  let _autoTimer  = null;
  let _pauseAuto  = false;   // paused while comment overlay is open

  /* ── Render ─────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;
    App.setTitle(null); App.setHeaderActions('');

    container.innerHTML = `
      <div class="updates-scroll" id="up-scroll">
        <div style="padding:14px 14px 12px;display:flex;gap:12px;overflow-x:auto">
          ${[...Array(5)].map(() => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;width:68px">
              <div class="skel skel-circle" style="width:60px;height:60px"></div>
              <div class="skel" style="width:48px;height:10px"></div>
            </div>`).join('')}
        </div>
        ${App.skel.statuses(5)}
      </div>`;

    await _load();

    SyncManager.watch(SYNC_KEY, async () => {
      SyncManager.invalidate(CACHE_KEY); SyncManager.invalidate(CACHE_CONN);
      await _load();
    }, 30000);
  };

  /* ── Load ───────────────────────────────────────────────── */
  const _load = async () => {
    const scroll = document.getElementById('up-scroll'); if (!scroll) return;
    const me     = Server.currentUser; if (!me) return;

    let allStatuses = SyncManager.store.get(CACHE_KEY);
    if (!allStatuses) {
      allStatuses = await Server.getStatuses();
      SyncManager.store.set(CACHE_KEY, allStatuses);
    }

    let connections = SyncManager.store.get(CACHE_CONN);
    if (!connections) {
      connections = await _loadConnections(me.id);
      SyncManager.store.set(CACHE_CONN, connections);
    }

    _myStatuses = allStatuses.filter(s => s.data.user_id === me.id);
    const others = allStatuses.filter(s =>
      s.data.user_id !== me.id && connections.has(s.data.user_id)
    );

    const byUser   = {};
    others.forEach(s => { const uid = s.data.user_id; if (!byUser[uid]) byUser[uid] = []; byUser[uid].push(s); });
    const uniqueUsers = Object.keys(byUser);
    const myProfile   = Server.currentProfile?.data || {};
    const hasUnseen   = (uid) => byUser[uid]?.some(s => !(s.data.views || []).includes(me.id));

    // Rail
    const myRingCls = _myStatuses.length ? 'story-ring' : 'story-ring my-ring';
    const myImg = myProfile.avatar_url ? `<img src="${_esc(myProfile.avatar_url)}" alt="">` : `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`;
    let railHtml = `
      <div class="story-bubble" id="my-story-bubble">
        <div class="${myRingCls}"><div class="story-av">${myImg}</div>
          ${!_myStatuses.length ? `<div class="story-add-icon"><span class="material-icons-round">add</span></div>` : ''}
        </div>
        <span class="story-name ${_myStatuses.length?'unseen':''}">My Status</span>
      </div>`;

    uniqueUsers.forEach(uid => {
      const first = byUser[uid][0].data; const viewed = !hasUnseen(uid);
      railHtml += `<div class="story-bubble" data-uid="${uid}">
        <div class="story-ring ${viewed?'viewed':''}"><div class="story-av">
          ${first.avatar_url?`<img src="${_esc(first.avatar_url)}" alt="">`:
            `<span>${(first.display_name||'?')[0].toUpperCase()}</span>`}
        </div></div>
        <span class="story-name ${viewed?'':'unseen'}">${_esc((first.display_name||'').split(' ')[0])}</span>
      </div>`;
    });

    // List
    let listHtml = '';
    if (!uniqueUsers.length && !_myStatuses.length) {
      listHtml = `<div class="empty-state">
        <span class="material-icons-round">radio_button_unchecked</span>
        <h3>No updates yet</h3>
        <p>People you chat with will appear here.</p>
      </div>`;
    } else {
      if (_myStatuses.length) {
        const totalViews = [...new Set(_myStatuses.flatMap(s => s.data.views||[]))].length;
        const totalLikes = [...new Set(_myStatuses.flatMap(s => s.data.likes||[]))].length;
        listHtml += `<div class="my-status-row" id="view-my-status">
          <div class="story-ring" style="width:50px;height:50px"><div class="story-av">
            ${myProfile.avatar_url?`<img src="${_esc(myProfile.avatar_url)}" alt="">`:
              `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
          </div></div>
          <div class="my-status-info">
            <div class="my-status-title">My Status <span style="font-size:11px;color:var(--text-3)">(${_myStatuses.length})</span></div>
            <div class="my-status-sub" style="display:flex;align-items:center;gap:8px">
              <span style="display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">visibility</span>${totalViews}</span>
              <span style="display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">favorite</span>${totalLikes}</span>
              · ${App.timeAgo(_myStatuses[0].created_at||_myStatuses[0].data.created_at)}
            </div>
          </div>
          <div class="my-status-btns">
            <button class="icon-btn" id="add-status-btn"><span class="material-icons-round">add</span></button>
            <button class="icon-btn" id="manage-my-status"><span class="material-icons-round">more_vert</span></button>
          </div>
        </div>`;
      } else {
        listHtml += `<div class="my-status-row" id="add-my-status">
          <div class="story-ring my-ring" style="width:50px;height:50px"><div class="story-av">
            ${myProfile.avatar_url?`<img src="${_esc(myProfile.avatar_url)}" alt="">`:
              `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
          </div></div>
          <div class="my-status-info">
            <div class="my-status-title">Add Status</div>
            <div class="my-status-sub">Share a photo, video, or text</div>
          </div>
          <span class="material-icons-round" style="color:var(--accent);font-size:24px">add_circle</span>
        </div>`;
      }

      if (uniqueUsers.length) {
        listHtml += `<div class="status-list-header">Recent Updates</div>`;
        uniqueUsers.forEach(uid => {
          const statuses = byUser[uid]; const first = statuses[0].data;
          const viewed = !hasUnseen(uid); const count = statuses.length;
          listHtml += `<div class="status-list-item" data-uid="${uid}">
            <div class="sl-ring ${viewed?'viewed':''}"><div class="sl-av">
              ${first.avatar_url?`<img src="${_esc(first.avatar_url)}" alt="">`:
                `<span>${(first.display_name||'?')[0].toUpperCase()}</span>`}
            </div></div>
            <div class="sl-info">
              <div class="sl-name">${_esc(first.display_name||'User')}</div>
              <div class="sl-meta">
                ${App.timeAgo(statuses[0].created_at||statuses[0].data.created_at)}
                ${count>1?`<span class="sl-count-chip"><span class="material-icons-round">photo_library</span>${count}</span>`:''}
                ${!viewed?`<span class="sl-new-dot"></span>`:''}
              </div>
            </div>
          </div>`;
        });
      }
    }

    scroll.innerHTML = `
      <div class="stories-rail" id="stories-rail">${railHtml}</div>
      <div class="status-list-section">${listHtml}</div>`;

    document.getElementById('my-story-bubble')?.addEventListener('click', () =>
      _myStatuses.length ? _viewStatuses(_myStatuses, true) : _showSheet()
    );
    document.getElementById('add-my-status')?.addEventListener('click', _showSheet);
    document.getElementById('view-my-status')?.addEventListener('click', () => _viewStatuses(_myStatuses, true));
    document.getElementById('add-status-btn')?.addEventListener('click', e => { e.stopPropagation(); _showSheet(); });
    document.getElementById('manage-my-status')?.addEventListener('click', e => { e.stopPropagation(); _showMyStatusMenu(); });

    document.querySelectorAll('.story-bubble[data-uid]').forEach(el =>
      el.addEventListener('click', () => _viewStatuses(byUser[el.dataset.uid]||[], false))
    );
    document.querySelectorAll('.status-list-item[data-uid]').forEach(el =>
      el.addEventListener('click', () => _viewStatuses(byUser[el.dataset.uid]||[], false))
    );
  };

  const _loadConnections = async (myId) => {
    const set = new Set();
    try { const chats = await Server.getChats(myId); chats.forEach(c => (c.data.participants||[]).forEach(uid => { if(uid!==myId) set.add(uid); })); } catch {}
    return set;
  };

  /* ══════════════════════════════════════════════════════════
     STATUS VIEWER
     ══════════════════════════════════════════════════════════ */

  const _viewStatuses = (list, isMine) => {
    if (!list.length) return;
    let idx = 0; _pauseAuto = false;
    clearTimeout(_autoTimer);

    const renderItem = () => {
      clearTimeout(_autoTimer);
      document.getElementById('sv-overlay')?.remove();

      const me  = Server.currentUser;
      const rec = list[idx];
      const d   = rec.data;

      Server.viewStatus(rec.id, me?.id).catch(() => {});
      SyncManager.invalidate(CACHE_KEY);

      const el = document.createElement('div');
      el.id = 'sv-overlay'; el.className = 'sv-root';

      const bars = list.map((_,i) => `<div class="sv-progress-bar">
        <div class="sv-progress-fill ${i<idx?'done':i===idx?'active':''}"></div>
      </div>`).join('');

      const bg      = d.type === 'text' ? (d.bg_color || STATUS_BG[0]) : '#000';
      const views   = (d.views||[]).length;
      const likes   = (d.likes||[]).length;
      const liked   = (d.likes||[]).includes(me?.id);
      const isVideo = d.type === 'video';

      let contentHtml = '';
      if (d.type === 'text') {
        contentHtml = `<div class="sv-text-card" style="background:${bg}">
          <div class="sv-text-inner">${_esc(d.content)}</div>
        </div>`;
      } else if (d.type === 'image') {
        contentHtml = `<img src="${_esc(d.content)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">`;
      } else {
        contentHtml = `<video id="sv-video" src="${_esc(d.content)}" autoplay playsinline
          style="max-width:100%;max-height:100%;object-fit:contain"></video>`;
      }

      el.innerHTML = `
        <div class="sv-progress-strip">${bars}</div>
        <div class="sv-header">
          ${App.avatar(d.avatar_url, d.display_name, 'av-sm')}
          <div class="sv-info">
            <div class="sv-name">${_esc(d.display_name||'User')}</div>
            <div class="sv-time">${App.timeAgo(d.created_at||rec.created_at)}</div>
          </div>
          ${isMine?`<button class="sv-action-btn" id="sv-del-this"><span class="material-icons-round">delete</span></button>`:''}
          <button class="sv-action-btn" id="sv-close"><span class="material-icons-round">close</span></button>
        </div>

        <div class="sv-content" style="background:${d.type==='text'?bg:'#000'}">
          ${contentHtml}
          <div class="sv-tap-prev" id="sv-prev"></div>
          <div class="sv-tap-next" id="sv-next"></div>
        </div>

        ${isMine?`<div class="sv-stats-bar" id="sv-stats">
          <div class="sv-stat" data-tab="views"><span class="material-icons-round">visibility</span>${views}</div>
          <div class="sv-stat" data-tab="hearts"><span class="material-icons-round">favorite</span>${likes}</div>
          <div class="sv-stat" id="sv-comment-count" data-tab="comments"><span class="material-icons-round">chat_bubble_outline</span>...</div>
        </div>`:''}

        <div class="sv-bottom">
          <button class="sv-action-btn" id="sv-comment-btn" title="Comments">
            <span class="material-icons-round">chat_bubble_outline</span>
          </button>
          <button class="sv-action-btn ${liked?'liked':''}" id="sv-like">
            <span class="material-icons-round">${liked?'favorite':'favorite_border'}</span>
          </button>
        </div>`;

      document.body.appendChild(el);

      // Load comment count for stats bar
      if (isMine) {
        Server.getStatusComments(rec.id).then(comments => {
          const cnt = document.getElementById('sv-comment-count');
          if (cnt) cnt.innerHTML = `<span class="material-icons-round">chat_bubble_outline</span>${comments.length}`;
        }).catch(() => {});
      }

      const closeViewer = () => { clearTimeout(_autoTimer); _pauseAuto = false; el.remove(); _load(); };
      const next  = () => { if (_pauseAuto) return; if (idx < list.length-1) { idx++; renderItem(); } else closeViewer(); };
      const prev  = () => { if (_pauseAuto) return; if (idx > 0) { idx--; renderItem(); } };

      document.getElementById('sv-close').onclick = closeViewer;
      document.getElementById('sv-next').onclick  = next;
      document.getElementById('sv-prev').onclick  = prev;

      document.getElementById('sv-del-this')?.addEventListener('click', async () => {
        await Server.deleteStatus(rec.id);
        SyncManager.invalidate(CACHE_KEY);
        list.splice(idx, 1);
        if (!list.length) { closeViewer(); return; }
        if (idx >= list.length) idx = list.length - 1;
        renderItem();
      });

      // Stats bar tabs
      document.getElementById('sv-stats')?.querySelectorAll('.sv-stat').forEach(tab => {
        tab.style.cursor = 'pointer';
        tab.addEventListener('click', () => _showStatsPanel(rec, tab.dataset.tab));
      });

      // Like
      document.getElementById('sv-like').onclick = async () => {
        const res = await Server.likeStatus(rec.id, me?.id); if (!res) return;
        const btn  = document.getElementById('sv-like');
        const icon = btn?.querySelector('.material-icons-round');
        if (icon) icon.textContent = res.liked ? 'favorite' : 'favorite_border';
        btn?.classList.toggle('liked', res.liked);
        SyncManager.invalidate(CACHE_KEY);
      };

      // Comments button
      document.getElementById('sv-comment-btn').onclick = () => _showCommentsOverlay(rec, isMine);

      // Swipe
      let tx = 0;
      el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (!_pauseAuto && Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
      });

      // Auto-advance
      const _scheduleAuto = () => {
        if (isVideo) {
          const vid = document.getElementById('sv-video');
          vid?.addEventListener('ended', () => { if (!_pauseAuto) next(); });
          vid?.addEventListener('error', () => { _autoTimer = setTimeout(() => { if (!_pauseAuto) next(); }, 3000); });
        } else {
          _autoTimer = setTimeout(() => { if (!_pauseAuto) next(); }, 5000);
        }
      };
      _scheduleAuto();
    };

    renderItem();
  };

  /* ══════════════════════════════════════════════════════════
     COMMENTS OVERLAY
     ══════════════════════════════════════════════════════════ */

  const _showCommentsOverlay = async (rec, isMine) => {
    _pauseAuto = true;   // pause auto-advance while commenting
    const me        = Server.currentUser;
    const myProfile = Server.currentProfile?.data || {};

    // Bottom sheet overlay
    const overlay = document.createElement('div');
    overlay.id    = 'sv-comments-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:900;
      display:flex;flex-direction:column;justify-content:flex-end;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);`;

    overlay.innerHTML = `
      <div id="sc-sheet" style="
        background:var(--bg-1);border-radius:20px 20px 0 0;
        max-height:75dvh;display:flex;flex-direction:column;
        animation:slideUpSheet 0.25s cubic-bezier(0.32,0.72,0,1);">

        <!-- Handle + header -->
        <div style="padding:12px 16px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
          <div style="width:40px;height:4px;background:var(--bg-5);border-radius:2px;margin:0 auto 12px"></div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h3 style="font-size:16px;font-weight:800;color:var(--text-1)">
              <span class="material-icons-round" style="font-size:18px;vertical-align:middle;color:var(--accent)">chat_bubble_outline</span>
              Comments
            </h3>
            <button class="icon-btn" id="sc-close"><span class="material-icons-round">close</span></button>
          </div>
        </div>

        <!-- Comments list -->
        <div id="sc-list" style="flex:1;overflow-y:auto;padding:8px 16px;">
          ${App.skel.threads(3)}
        </div>

        <!-- Input bar -->
        <div style="display:flex;align-items:flex-end;gap:8px;padding:10px 16px;
          padding-bottom:max(10px,env(safe-area-inset-bottom,10px));
          border-top:1px solid var(--border);flex-shrink:0;background:var(--bg-1)">
          ${App.avatar(myProfile.avatar_url, myProfile.display_name, 'av-sm')}
          <textarea id="sc-input" class="cw-textarea" rows="1"
            placeholder="Add a comment..." style="min-height:36px"></textarea>
          <button class="cw-send-btn" id="sc-send">
            <span class="material-icons-round">send</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Close on backdrop tap
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeCommentsOverlay(); });
    document.getElementById('sc-close').onclick = _closeCommentsOverlay;

    // Load comments
    const comments = await Server.getStatusComments(rec.id);
    _renderComments(comments, me, isMine, rec.id);

    // Textarea auto-resize
    const inp = document.getElementById('sc-input');
    inp?.addEventListener('input', () => {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
    });

    // Send comment
    const doSend = async () => {
      const text = inp?.value.trim(); if (!text) return;
      inp.value = ''; inp.style.height = 'auto';
      await Server.addStatusComment(rec.id, {
        user_id:      me.id,
        display_name: myProfile.display_name || me.display_name || 'Me',
        username:     myProfile.username || '',
        avatar_url:   myProfile.avatar_url || '',
      }, text);
      const fresh = await Server.getStatusComments(rec.id);
      _renderComments(fresh, me, isMine, rec.id);
      SyncManager.invalidate(CACHE_KEY);
    };

    document.getElementById('sc-send').onclick = doSend;
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  };

  const _closeCommentsOverlay = () => {
    document.getElementById('sv-comments-overlay')?.remove();
    _pauseAuto = false;   // resume auto-advance
  };

  const _renderComments = (comments, me, isMine, statusId) => {
    const list = document.getElementById('sc-list'); if (!list) return;
    if (!comments.length) {
      list.innerHTML = `<div class="empty-state" style="padding:32px 0">
        <span class="material-icons-round">chat_bubble_outline</span>
        <p style="color:var(--text-3);font-size:13px">Be the first to comment</p>
      </div>`; return;
    }

    list.innerHTML = comments.map(c => {
      const cd = c.data || {};
      const isOwn = cd.user_id === me?.id;
      const r     = cd.reactions || {};
      const reactionPills = Object.keys(r).filter(k => (r[k]||[]).length > 0).map(key => {
        const rxn  = COMMENT_REACTIONS.find(x => x.key === key) || { icon: 'favorite', color: '#ed4956' };
        const mine = (r[key]||[]).includes(me?.id);
        return `<button class="reaction-pill ${mine?'mine':''} comment-react-pill"
          data-cid="${c.id}" data-key="${key}" style="padding:2px 7px;font-size:12px">
          <span class="material-icons-round" style="font-size:12px;color:${rxn.color}">${rxn.icon}</span>
          <span class="r-count">${(r[key]||[]).length}</span>
        </button>`;
      }).join('');

      return `<div class="sc-comment" data-cid="${c.id}" style="display:flex;gap:10px;margin-bottom:14px">
        ${App.avatar(cd.avatar_url, cd.display_name, 'av-sm')}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px">
            <span style="font-size:13px;font-weight:700;color:var(--text-1)">${_esc(cd.display_name||'User')}</span>
            <span style="font-size:11px;color:var(--text-3)">${App.timeAgo(cd.created_at)}</span>
          </div>
          <div style="font-size:14px;color:var(--text-1);line-height:1.45;word-break:break-word">${_esc(cd.comment||'')}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
            ${reactionPills}
            <!-- React button -->
            <div class="sc-react-btn" data-cid="${c.id}"
              style="display:flex;align-items:center;gap:2px;cursor:pointer;color:var(--text-3);font-size:11px;font-weight:600">
              <span class="material-icons-round" style="font-size:14px">add_reaction</span>
            </div>
            ${isOwn || isMine ? `<div class="sc-del-btn" data-cid="${c.id}"
              style="display:flex;align-items:center;gap:2px;cursor:pointer;color:var(--danger);font-size:11px;font-weight:600;margin-left:auto">
              <span class="material-icons-round" style="font-size:14px">delete</span>
            </div>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    // Scroll to bottom
    list.scrollTop = list.scrollHeight;

    // Reaction pills
    list.querySelectorAll('.comment-react-pill').forEach(btn => {
      btn.addEventListener('click', async () => {
        const r = await Server.reactStatusComment(btn.dataset.cid, btn.dataset.key, me?.id);
        if (r) { const fresh = await Server.getStatusComments(statusId); _renderComments(fresh, me, isMine, statusId); }
      });
    });

    // Add reaction button
    list.querySelectorAll('.sc-react-btn').forEach(btn => {
      btn.addEventListener('click', () => _showCommentReactPicker(btn.dataset.cid, me?.id, statusId, isMine));
    });

    // Delete button
    list.querySelectorAll('.sc-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Server.deleteStatusComment(btn.dataset.cid);
        const fresh = await Server.getStatusComments(statusId);
        _renderComments(fresh, me, isMine, statusId);
      });
    });
  };

  const _showCommentReactPicker = (commentId, myId, statusId, isMine) => {
    const picker = document.createElement('div');
    picker.style.cssText = `
      position:fixed;bottom:140px;left:50%;transform:translateX(-50%);
      background:var(--bg-2);border:1px solid var(--border-light);border-radius:var(--radius-pill);
      padding:8px 16px;display:flex;gap:14px;align-items:center;z-index:950;
      box-shadow:var(--shadow-md);animation:msgIn 0.14s ease;`;
    picker.innerHTML = COMMENT_REACTIONS.map(rxn =>
      `<button data-key="${rxn.key}" style="font-size:0;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:none;transition:background 0.12s">
        <span class="material-icons-round" style="font-size:24px;color:${rxn.color}">${rxn.icon}</span>
      </button>`
    ).join('');
    document.body.appendChild(picker);

    const removePicker = () => picker.remove();
    setTimeout(() => document.addEventListener('click', removePicker, { once: true }), 50);

    picker.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        removePicker();
        await Server.reactStatusComment(commentId, btn.dataset.key, myId);
        const fresh = await Server.getStatusComments(statusId);
        const list  = document.getElementById('sc-list');
        if (list) { const me = Server.currentUser; _renderComments(fresh, me, isMine, statusId); }
      });
    });
  };

  /* ══════════════════════════════════════════════════════════
     STATS PANEL  (Viewers / Hearts / Comments tabs)
     ══════════════════════════════════════════════════════════ */

  const _showStatsPanel = async (rec, startTab = 'views') => {
    const d         = rec.data;
    const viewerIds = d.views || [];
    const likerIds  = d.likes || [];
    const me        = Server.currentUser;

    App.showModal(`
      <div style="padding:16px 0 32px">
        <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:0">
          ${[{key:'views',icon:'visibility',label:'Viewers'},
             {key:'hearts',icon:'favorite',label:'Hearts'},
             {key:'comments',icon:'chat_bubble_outline',label:'Comments'}].map(t => `
            <button class="stats-tab ${t.key===startTab?'active':''}" data-tab="${t.key}"
              style="flex:1;padding:11px 0;display:flex;flex-direction:column;align-items:center;gap:3px;
                font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;
                color:${t.key===startTab?'var(--accent)':'var(--text-3)'};
                border-bottom:2px solid ${t.key===startTab?'var(--accent)':'transparent'};
                background:none;transition:all 0.15s;font-family:var(--font)">
              <span class="material-icons-round" style="font-size:18px">${t.icon}</span>
              ${t.label}
            </button>`).join('')}
        </div>
        <div id="stats-content" style="min-height:120px;max-height:50dvh;overflow-y:auto;padding:0 16px">
          ${App.skel.threads(3)}
        </div>
      </div>`);

    const renderTab = async (tab) => {
      const content = document.getElementById('stats-content'); if (!content) return;
      content.innerHTML = App.skel.threads(3);

      const allProfiles = await Server.getPublicProfiles().catch(() => []);
      const _profile = (uid) => allProfiles.find(p => p.data?.user_id === uid)?.data;
      const _row = (uid) => {
        const p = _profile(uid);
        const name  = p?.display_name || uid.slice(0,8)+'...';
        const uname = p?.username ? `@${p.username}` : '';
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          ${App.avatar(p?.avatar_url||'', name, 'av-sm')}
          <div><div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(name)}</div>
          ${uname?`<div style="font-size:12px;color:var(--text-3)">${_esc(uname)}</div>`:''}</div>
        </div>`;
      };

      if (tab === 'views') {
        content.innerHTML = viewerIds.length
          ? viewerIds.map(_row).join('')
          : `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">No views yet</div>`;

      } else if (tab === 'hearts') {
        content.innerHTML = likerIds.length
          ? likerIds.map(_row).join('')
          : `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">No hearts yet</div>`;

      } else if (tab === 'comments') {
        const comments = await Server.getStatusComments(rec.id);
        if (!comments.length) {
          content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">No comments yet</div>`;
        } else {
          content.innerHTML = comments.map(c => {
            const cd = c.data || {};
            return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
              ${App.avatar(cd.avatar_url||'', cd.display_name||'User', 'av-sm')}
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:baseline;gap:6px">
                  <span style="font-size:13px;font-weight:700;color:var(--text-1)">${_esc(cd.display_name||'User')}</span>
                  <span style="font-size:11px;color:var(--text-3)">${App.timeAgo(cd.created_at)}</span>
                </div>
                <div style="font-size:13px;color:var(--text-2);margin-top:2px">${_esc(cd.comment||'')}</div>
              </div>
            </div>`;
          }).join('');
        }
      }
    };

    renderTab(startTab);

    document.querySelectorAll('.stats-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stats-tab').forEach(t => {
          const active = t.dataset.tab === tab.dataset.tab;
          t.style.color        = active ? 'var(--accent)' : 'var(--text-3)';
          t.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
        });
        renderTab(tab.dataset.tab);
      });
    });
  };

  /* ══════════════════════════════════════════════════════════
     MY STATUS MENU
     ══════════════════════════════════════════════════════════ */

  const _showMyStatusMenu = () => {
    App.showModal(`<div style="padding:8px 0 20px">
      <div class="ctx-action" id="smm-view"><span class="material-icons-round">visibility</span> View my statuses</div>
      <div class="ctx-action" id="smm-add"><span class="material-icons-round">add_circle_outline</span> Add new status</div>
      <div class="ctx-action danger" id="smm-delall"><span class="material-icons-round">delete_sweep</span> Delete all my statuses</div>
    </div>`);
    document.getElementById('smm-view').onclick   = () => { App.closeModal(); _viewStatuses(_myStatuses, true); };
    document.getElementById('smm-add').onclick    = () => { App.closeModal(); _showSheet(); };
    document.getElementById('smm-delall').onclick = async () => {
      App.closeModal();
      if (!confirm('Delete all your statuses?')) return;
      for (const s of _myStatuses) await Server.deleteStatus(s.id).catch(() => {});
      App.showToast('All statuses deleted');
      SyncManager.invalidate(CACHE_KEY);
      _myStatuses = []; await _load();
    };
  };

  /* ══════════════════════════════════════════════════════════
     CREATE STATUS SHEET
     ══════════════════════════════════════════════════════════ */

  const _showSheet = () => {
    let selType  = 'text';
    let selColor = STATUS_BG[0];
    let imgFile  = null;
    let vidFile  = null;
    const myProfile = Server.currentProfile?.data || {};

    const colorDots = STATUS_BG.map(c =>
      `<div class="status-bg-dot ${c===selColor?'sel':''}" data-color="${c}" style="background:${c}"></div>`
    ).join('');

    const close = App.showModal(`
      <div class="create-status-sheet">
        <h3>New Status</h3>
        <div class="status-type-tabs">
          <div class="status-type-tab active" data-type="text"><span class="material-icons-round">text_fields</span> Text</div>
          <div class="status-type-tab" data-type="image"><span class="material-icons-round">image</span> Photo</div>
          <div class="status-type-tab" data-type="video"><span class="material-icons-round">videocam</span> Video</div>
        </div>
        <div id="cs-text-area">
          <textarea class="status-text-input" id="cs-text" placeholder="What's on your mind?..." maxlength="280"></textarea>
          <div class="status-bg-row" id="cs-colors">${colorDots}</div>
        </div>
        <div id="cs-img-area" style="display:none">
          <img id="cs-img-preview" class="status-media-preview">
          <label class="btn-ghost" style="display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer">
            <span class="material-icons-round">photo_library</span> Choose Photo
            <input type="file" accept="image/*" id="cs-img-input" style="display:none">
          </label>
        </div>
        <div id="cs-vid-area" style="display:none">
          <video id="cs-vid-preview" class="status-media-preview" controls></video>
          <label class="btn-ghost" style="display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer">
            <span class="material-icons-round">video_library</span> Choose Video
            <input type="file" accept="video/*" id="cs-vid-input" style="display:none">
          </label>
        </div>
        <div id="cs-err" class="auth-error"></div>
        <button class="status-submit-btn" id="cs-submit">
          <span class="material-icons-round">send</span> Share Status
        </button>
      </div>`);

    document.querySelectorAll('.status-type-tab').forEach(tab => {
      tab.onclick = () => {
        selType = tab.dataset.type;
        document.querySelectorAll('.status-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('cs-text-area').style.display = selType==='text'?'block':'none';
        document.getElementById('cs-img-area').style.display  = selType==='image'?'block':'none';
        document.getElementById('cs-vid-area').style.display  = selType==='video'?'block':'none';
      };
    });

    document.querySelectorAll('#cs-colors .status-bg-dot').forEach(dot => {
      dot.onclick = () => { selColor = dot.dataset.color; document.querySelectorAll('#cs-colors .status-bg-dot').forEach(d => d.classList.remove('sel')); dot.classList.add('sel'); };
    });

    document.getElementById('cs-img-input')?.addEventListener('change', e => {
      imgFile = e.target.files[0]; if (!imgFile) return;
      const rd = new FileReader(); rd.onload = ev => { const p = document.getElementById('cs-img-preview'); p.src = ev.target.result; p.style.display = 'block'; }; rd.readAsDataURL(imgFile);
    });
    document.getElementById('cs-vid-input')?.addEventListener('change', e => {
      vidFile = e.target.files[0]; if (!vidFile) return;
      const p = document.getElementById('cs-vid-preview'); p.src = URL.createObjectURL(vidFile); p.style.display = 'block';
    });

    document.getElementById('cs-submit').onclick = async () => {
      const me = Server.currentUser;
      const errEl = document.getElementById('cs-err'); errEl.classList.remove('visible');
      const btn   = document.getElementById('cs-submit'); btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff"></div>`;
      const reset = () => { btn.disabled=false; btn.innerHTML='<span class="material-icons-round">send</span> Share Status'; };

      const base = {
        user_id: me.id, display_name: myProfile.display_name||me.display_name||'Me',
        username: myProfile.username||'', avatar_url: myProfile.avatar_url||'',
        views: [], view_count: 0, likes: [], like_count: 0,
        expires_at: new Date(Date.now()+24*60*60*1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      try {
        if (selType === 'text') {
          const text = document.getElementById('cs-text').value.trim();
          if (!text) { errEl.textContent='Enter some text.'; errEl.classList.add('visible'); reset(); return; }
          await Server.createStatus({ ...base, type:'text', content:text, bg_color:selColor });
        } else if (selType === 'image') {
          if (!imgFile) { errEl.textContent='Choose a photo.'; errEl.classList.add('visible'); reset(); return; }
          const url = await Server.uploadCompressedImage(imgFile, 'spark_statuses_media');
          if (!url) throw new Error('Upload failed');
          await Server.createStatus({ ...base, type:'image', content:url });
        } else {
          if (!vidFile) { errEl.textContent='Choose a video.'; errEl.classList.add('visible'); reset(); return; }
          const data = await Server.uploadFile(vidFile, 'spark_statuses_media');
          if (!data?.url) throw new Error('Upload failed');
          await Server.createStatus({ ...base, type:'video', content:data.url });
        }
        SyncManager.invalidate(CACHE_KEY);
        close(); App.showToast('Status shared!','success'); await _load();
      } catch (e) { reset(); errEl.textContent=e.message||'Failed.'; errEl.classList.add('visible'); }
    };
  };

  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return { render };
})();
