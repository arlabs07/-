/**
 * updates.js — Status / Updates v8
 *
 * Architecture:
 *  • Left: stories rail + contacts feed (who has updates)
 *  • Right panel (desktop: always visible / mobile: slide-up overlay):
 *    - My Status Manager: thumbnail grid + "Add Status" CTA
 *    - Status Detail: preview + tabs (Views / Hearts / Comments)
 *    - Status Composer: type tabs (Text / Photo / Video), bg picker, share
 *  • Status Viewer: full-screen overlay with progress bars, swipe, like, comments
 */

const UpdatesPage = (() => {

  const CACHE_KEY  = 'updates_statuses';
  const CACHE_CONN = 'updates_connections';
  const SYNC_KEY   = 'updates_sync';

  const STATUS_BG = [
    '#0095f6','#ed4956','#2dd55b','#f0a030','#bc1888','#1a1a2e','#8a2be2','#e6683c',
  ];
  const STATUS_GRADS = [
    'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
    'linear-gradient(135deg,#0095f6,#00b4d8)',
    'linear-gradient(135deg,#2dd55b,#0095f6)',
    'linear-gradient(135deg,#f0a030,#ed4956)',
    'linear-gradient(135deg,#8a2be2,#ed4956)',
    'linear-gradient(135deg,#1a1a2e,#0095f6)',
  ];

  const COMMENT_REACTIONS = [
    { icon: 'favorite',  color: '#ed4956', key: 'heart' },
    { icon: 'thumb_up',  color: '#0095f6', key: 'like'  },
    { icon: 'sentiment_very_satisfied', color: '#f0a030', key: 'laugh' },
  ];

  let _container   = null;
  let _myStatuses  = [];
  let _allStatuses = [];
  let _panelMode   = 'manager';   // 'manager' | 'detail' | 'composer'
  let _detailStatus = null;
  let _autoTimer   = null;
  let _pauseAuto   = false;
  let _composerType = 'text';
  let _selBg       = STATUS_BG[0];
  let _selGrad     = null;
  let _imgFile     = null;
  let _vidFile     = null;

  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── RENDER ──────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;
    App.setTitle(null); App.setHeaderActions('');

    container.innerHTML = `
      <div class="updates-shell">
        <div class="updates-body">
          <!-- Feed -->
          <div class="updates-feed" id="up-feed">
            <div class="updates-top">
              <div class="stories-rail" id="stories-rail">
                ${[...Array(5)].map(() => `
                  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;width:66px">
                    <div class="skel skel-circle" style="width:58px;height:58px"></div>
                    <div class="skel" style="width:46px;height:10px"></div>
                  </div>`).join('')}
              </div>
            </div>
            <div id="up-list">${App.skel.statuses(5)}</div>
          </div>

          <!-- Right panel -->
          <div class="updates-panel" id="up-panel">
            <!-- Panel content rendered by _renderPanel() -->
          </div>
        </div>
      </div>`;

    await _load();

    SyncManager.watch(SYNC_KEY, async () => {
      SyncManager.invalidate(CACHE_KEY); SyncManager.invalidate(CACHE_CONN);
      await _load();
    }, { ms: 30000 });
  };

  /* ── LOAD ────────────────────────────────────────────────── */
  const _load = async () => {
    const me = Server.currentUser; if (!me) return;

    let statuses = SyncManager.store.get(CACHE_KEY);
    if (!statuses) {
      statuses = await Server.getStatuses();
      SyncManager.store.set(CACHE_KEY, statuses);
    }
    _allStatuses = statuses;

    let connections = SyncManager.store.get(CACHE_CONN);
    if (!connections) {
      connections = await _loadConnections(me.id);
      SyncManager.store.set(CACHE_CONN, connections);
    }

    _myStatuses = statuses.filter(s => s.data.user_id === me.id);
    const others = statuses.filter(s =>
      s.data.user_id !== me.id && connections.has(s.data.user_id)
    );

    const byUser = {};
    others.forEach(s => {
      const uid = s.data.user_id;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(s);
    });
    const uniqueUsers = Object.keys(byUser);

    const myProfile = Server.currentProfile?.data || {};
    const hasUnseen = (uid) => byUser[uid]?.some(s => !(s.data.views || []).includes(me.id));

    /* ── Stories rail ── */
    const myRingCls = _myStatuses.length ? 'story-ring' : 'story-ring my-ring';
    const myImg = myProfile.avatar_url ? `<img src="${myProfile.avatar_url}" alt="">` : `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`;
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
          ${first.avatar_url?`<img src="${first.avatar_url}" alt="">`:
            `<span>${(first.display_name||'?')[0].toUpperCase()}</span>`}
        </div></div>
        <span class="story-name ${viewed?'':'unseen'}">${_esc((first.display_name||'').split(' ')[0])}</span>
      </div>`;
    });

    const rail = document.getElementById('stories-rail');
    if (rail) rail.innerHTML = railHtml;

    /* ── Feed list ── */
    let listHtml = '';

    if (_myStatuses.length) {
      const totalViews = [...new Set(_myStatuses.flatMap(s => s.data.views||[]))].length;
      const totalLikes = [...new Set(_myStatuses.flatMap(s => s.data.likes||[]))].length;
      listHtml += `<div class="my-status-card" id="view-my-status">
        <div class="my-status-ring has-status"><div class="my-status-av">
          ${myProfile.avatar_url?`<img src="${myProfile.avatar_url}" alt="">`:
            `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
        </div></div>
        <div class="my-status-info">
          <div class="my-status-title">My Status <span style="font-size:11px;font-weight:400;color:var(--text-3)">(${_myStatuses.length})</span></div>
          <div class="my-status-sub">
            <span style="display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">visibility</span>${totalViews}</span>
            <span style="display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">favorite</span>${totalLikes}</span>
            · ${App.timeAgo(_myStatuses[0]?.created_at||_myStatuses[0]?.data?.created_at||'')}
          </div>
        </div>
        <button class="icon-btn" id="add-status-btn" title="Add status">
          <span class="material-icons-round">add</span>
        </button>
        <button class="icon-btn" id="manage-my-status" title="Manage">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div>`;
    } else {
      listHtml += `<div class="my-status-card" id="add-my-status">
        <div class="my-status-ring no-status"><div class="my-status-av">
          ${myProfile.avatar_url?`<img src="${myProfile.avatar_url}" alt="">`:
            `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
        </div></div>
        <div class="my-status-info">
          <div class="my-status-title">Add Status</div>
          <div class="my-status-sub">Share a photo, video, or thought</div>
        </div>
        <span class="material-icons-round" style="color:var(--accent);font-size:28px">add_circle</span>
      </div>`;
    }

    if (uniqueUsers.length) {
      listHtml += `<div class="status-list-header">Recent Updates</div>`;
      uniqueUsers.forEach(uid => {
        const statuses = byUser[uid]; const first = statuses[0].data;
        const viewed = !hasUnseen(uid); const count = statuses.length;
        listHtml += `<div class="status-list-item" data-uid="${uid}">
          <div class="sl-ring ${viewed?'viewed':''}"><div class="sl-av">
            ${first.avatar_url?`<img src="${first.avatar_url}" alt="">`:
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
    } else if (!_myStatuses.length) {
      listHtml += `<div class="empty-state">
        <span class="material-icons-round">radio_button_unchecked</span>
        <h3>No updates yet</h3>
        <p>People you chat with will appear here when they post a status</p>
      </div>`;
    }

    const upList = document.getElementById('up-list');
    if (upList) upList.innerHTML = listHtml;

    /* ── Bind feed events ── */
    document.getElementById('my-story-bubble')?.addEventListener('click', () => {
      if (_myStatuses.length) _viewStatuses(_myStatuses, true);
      else _openComposer();
    });
    document.getElementById('view-my-status')?.addEventListener('click', () => _openPanel('manager'));
    document.getElementById('add-my-status')?.addEventListener('click', () => _openComposer());
    document.getElementById('add-status-btn')?.addEventListener('click', e => { e.stopPropagation(); _openComposer(); });
    document.getElementById('manage-my-status')?.addEventListener('click', e => { e.stopPropagation(); _showMyStatusMenu(); });

    document.querySelectorAll('.story-bubble[data-uid]').forEach(el =>
      el.addEventListener('click', () => _viewStatuses(byUser[el.dataset.uid]||[], false))
    );
    document.querySelectorAll('.status-list-item[data-uid]').forEach(el =>
      el.addEventListener('click', () => _viewStatuses(byUser[el.dataset.uid]||[], false))
    );

    /* ── Render the right panel ── */
    _renderPanel();
  };

  const _loadConnections = async (myId) => {
    const set = new Set();
    try { const chats = await Server.getChats(myId); chats.forEach(c => (c.data.participants||[]).forEach(uid => { if(uid!==myId) set.add(uid); })); } catch {}
    return set;
  };

  /* ══════════════════════════════════════════════════════════
     RIGHT PANEL
     ══════════════════════════════════════════════════════════ */

  const _openPanel = (mode) => {
    _panelMode = mode;
    _renderPanel();

    // On mobile, show as slide-up overlay
    if (!_isDesktop()) {
      const panel = document.getElementById('up-panel');
      if (panel) panel.classList.add('mobile-open');
    }
  };

  const _closePanel = () => {
    const panel = document.getElementById('up-panel');
    if (panel) panel.classList.remove('mobile-open');
  };

  const _renderPanel = () => {
    const panel = document.getElementById('up-panel'); if (!panel) return;

    switch (_panelMode) {
      case 'manager':  _renderManager(panel); break;
      case 'detail':   _renderDetail(panel); break;
      case 'composer': _renderComposer(panel); break;
      default:         _renderManager(panel);
    }
  };

  /* ── MANAGER: my status grid ──────────────────────────────── */
  const _renderManager = (panel) => {
    const me = Server.currentUser;

    const thumbsHtml = _myStatuses.map(s => {
      const d = s.data;
      const views = (d.views||[]).length;
      const likes = (d.likes||[]).length;
      let innerHtml = '';

      if (d.type === 'image') {
        innerHtml = `<img class="status-thumb-img" src="${d.content}" alt="">`;
      } else if (d.type === 'video') {
        innerHtml = `<video class="status-thumb-img" src="${d.content}" muted></video>`;
      } else {
        const bg = d.bg_gradient || d.bg_color || STATUS_BG[0];
        innerHtml = `<div class="status-thumb-text" style="background:${bg}">${_esc(d.content||'')}</div>`;
      }

      return `<div class="status-thumb" data-sid="${s.id}">
        ${innerHtml}
        <div class="status-thumb-overlay">
          <span class="status-thumb-stat"><span class="material-icons-round">visibility</span>${views}</span>
          <span class="status-thumb-stat"><span class="material-icons-round">favorite</span>${likes}</span>
        </div>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-title">My Status</div>
        <div class="panel-header-btn" id="panel-close-btn">
          <span class="material-icons-round">${_isDesktop() ? '' : 'close'}</span>
        </div>
        <div class="panel-header-btn" id="panel-add-btn" title="Add new status">
          <span class="material-icons-round">add</span>
        </div>
      </div>
      <div class="my-panel">
        ${_myStatuses.length === 0 ? `
          <div class="add-status-cta" id="add-cta">
            <span class="material-icons-round">add_a_photo</span>
            <div class="add-status-cta-label">Share a Status</div>
            <div class="add-status-cta-sub">Photo, video, or text — 24h expiry</div>
          </div>` : `
          <div style="padding:12px 16px 4px;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px">
            ${_myStatuses.length} status${_myStatuses.length!==1?'es':''} · tap to view details
          </div>
          <div class="status-grid">${thumbsHtml}</div>`}
      </div>`;

    document.getElementById('panel-close-btn')?.addEventListener('click', _closePanel);
    document.getElementById('panel-add-btn')?.addEventListener('click', _openComposer);
    document.getElementById('add-cta')?.addEventListener('click', _openComposer);

    panel.querySelectorAll('.status-thumb[data-sid]').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const s = _myStatuses.find(x => x.id === thumb.dataset.sid);
        if (s) { _detailStatus = s; _openPanel('detail'); }
      });
    });
  };

  /* ── DETAIL: one status preview + tabs ───────────────────── */
  const _renderDetail = async (panel) => {
    const s = _detailStatus; if (!s) { _renderManager(panel); return; }
    const d = s.data;
    const me = Server.currentUser;
    const views = (d.views||[]);
    const likes = (d.likes||[]);

    // Fetch comments for count
    const comments = await Server.getStatusComments(s.id).catch(() => []);

    let previewHtml = '';
    if (d.type === 'image') {
      previewHtml = `<img src="${d.content}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md)">`;
    } else if (d.type === 'video') {
      previewHtml = `<video src="${d.content}" controls style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md)"></video>`;
    } else {
      const bg = d.bg_gradient || d.bg_color || STATUS_BG[0];
      previewHtml = `<div class="status-preview-text" style="background:${bg}">${_esc(d.content||'')}</div>`;
    }

    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-btn" id="detail-back-btn">
          <span class="material-icons-round">arrow_back</span>
        </div>
        <div class="panel-header-title">Status Detail</div>
        <div class="panel-header-btn" id="detail-delete-btn" title="Delete this status">
          <span class="material-icons-round" style="color:var(--danger)">delete</span>
        </div>
      </div>
      <div class="status-detail">
        <div class="status-preview-box">${previewHtml}</div>

        <div class="status-detail-meta">
          <div class="status-detail-time">
            <span class="material-icons-round" style="font-size:14px">schedule</span>
            ${App.timeAgo(d.created_at||s.created_at)} · expires in
            ${Math.max(0, Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / 3600000))}h
          </div>
          <button class="panel-header-btn" style="width:auto;padding:4px 10px;border-radius:99px;background:var(--accent-dim);color:var(--accent);font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" id="view-story-btn">
            <span class="material-icons-round" style="font-size:14px">play_circle</span> View
          </button>
        </div>

        <div class="detail-tabs">
          <button class="detail-tab active" data-dtab="views">
            <span class="material-icons-round">visibility</span>
            Views (${views.length})
          </button>
          <button class="detail-tab" data-dtab="hearts">
            <span class="material-icons-round">favorite</span>
            Hearts (${likes.length})
          </button>
          <button class="detail-tab" data-dtab="comments">
            <span class="material-icons-round">chat_bubble_outline</span>
            Comments (${comments.length})
          </button>
        </div>

        <div class="detail-content" id="detail-content"></div>

        ${d.type !== 'text' ? '' : ''}
        <button class="detail-delete-btn" id="detail-del-full-btn">
          <span class="material-icons-round">delete</span> Delete This Status
        </button>
      </div>`;

    // Bind
    document.getElementById('detail-back-btn')?.addEventListener('click', () => _openPanel('manager'));
    document.getElementById('detail-delete-btn')?.addEventListener('click', () => _deleteStatus(s));
    document.getElementById('detail-del-full-btn')?.addEventListener('click', () => _deleteStatus(s));
    document.getElementById('view-story-btn')?.addEventListener('click', () => _viewStatuses([s], true));

    // Load first tab
    _loadDetailTab('views', s, me, comments);

    panel.querySelectorAll('.detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _loadDetailTab(tab.dataset.dtab, s, me, comments);
      });
    });

    // Comments input
    const myProfile = Server.currentProfile?.data || {};
    _renderDetailCommentInput(s, me, myProfile, comments);
  };

  const _loadDetailTab = async (tab, status, me, cachedComments) => {
    const content = document.getElementById('detail-content'); if (!content) return;
    const d = status.data;

    if (tab === 'views') {
      const viewerIds = d.views || [];
      if (!viewerIds.length) {
        content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px"><span class="material-icons-round" style="display:block;font-size:36px;opacity:0.3;margin-bottom:8px">visibility_off</span>No views yet</div>`;
        return;
      }
      const allProf = await Server.getPublicProfiles().catch(() => []);
      content.innerHTML = viewerIds.map(uid => {
        const p = allProf.find(x => x.data?.user_id === uid)?.data;
        const name = p?.display_name || uid.slice(0,8)+'…';
        return `<div class="detail-user-row">
          ${App.avatar(p?.avatar_url||'', name, 'av-sm')}
          <div><div class="detail-user-name">${_esc(name)}</div>${p?.username?`<div style="font-size:11px;color:var(--text-3)">@${_esc(p.username)}</div>`:''}</div>
        </div>`;
      }).join('');

    } else if (tab === 'hearts') {
      const likerIds = d.likes || [];
      if (!likerIds.length) {
        content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px"><span class="material-icons-round" style="display:block;font-size:36px;opacity:0.3;margin-bottom:8px">favorite_border</span>No hearts yet</div>`;
        return;
      }
      const allProf = await Server.getPublicProfiles().catch(() => []);
      content.innerHTML = likerIds.map(uid => {
        const p = allProf.find(x => x.data?.user_id === uid)?.data;
        const name = p?.display_name || uid.slice(0,8)+'…';
        return `<div class="detail-user-row">
          ${App.avatar(p?.avatar_url||'', name, 'av-sm')}
          <div><div class="detail-user-name">${_esc(name)}</div>${p?.username?`<div style="font-size:11px;color:var(--text-3)">@${_esc(p.username)}</div>`:''}</div>
          <span class="material-icons-round" style="font-size:18px;color:var(--danger)">favorite</span>
        </div>`;
      }).join('');

    } else if (tab === 'comments') {
      const comments = cachedComments || await Server.getStatusComments(status.id).catch(() => []);
      _renderCommentsList(content, comments, me, status);
    }
  };

  const _renderCommentsList = (container, comments, me, status) => {
    if (!comments.length) {
      container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px"><span class="material-icons-round" style="display:block;font-size:36px;opacity:0.3;margin-bottom:8px">chat_bubble_outline</span>No comments yet</div>`;
      return;
    }
    container.innerHTML = comments.map(c => {
      const cd = c.data || {};
      const isOwn = cd.user_id === me?.id;
      return `<div class="detail-comment">
        ${App.avatar(cd.avatar_url||'', cd.display_name||'User', 'av-sm')}
        <div class="detail-comment-body">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="detail-comment-author">${_esc(cd.display_name||'User')}</div>
            <div class="detail-comment-time">${App.timeAgo(cd.created_at)}</div>
            ${isOwn ? `<div class="detail-comment-del" data-cid="${c.id}" style="margin-left:auto">
              <span class="material-icons-round" style="font-size:16px">delete</span>
            </div>` : ''}
          </div>
          <div class="detail-comment-text">${_esc(cd.comment||'')}</div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.detail-comment-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Server.deleteStatusComment(btn.dataset.cid).catch(() => {});
        const fresh = await Server.getStatusComments(status.id).catch(() => []);
        _renderCommentsList(container, fresh, me, status);
      });
    });
  };

  const _renderDetailCommentInput = (status, me, myProfile, existingComments) => {
    const detail = document.querySelector('.status-detail'); if (!detail) return;

    // Remove any existing input bar
    detail.querySelector('.detail-comment-input-bar')?.remove();

    const bar = document.createElement('div');
    bar.className = 'detail-comment-input-bar';
    bar.innerHTML = `
      ${App.avatar(myProfile.avatar_url||'', myProfile.display_name||'Me', 'av-sm')}
      <textarea id="detail-comment-ta" class="detail-comment-input" rows="1"
        placeholder="Add a comment..."></textarea>
      <button class="detail-send-btn" id="detail-send-btn">
        <span class="material-icons-round">send</span>
      </button>`;
    detail.appendChild(bar);

    const ta = document.getElementById('detail-comment-ta');
    ta?.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    });

    const doSend = async () => {
      const text = ta?.value.trim(); if (!text) return;
      ta.value = ''; ta.style.height = 'auto';
      await Server.addStatusComment(status.id, {
        user_id:      me.id,
        display_name: myProfile.display_name || me.display_name || 'Me',
        username:     myProfile.username || '',
        avatar_url:   myProfile.avatar_url || '',
      }, text);
      SyncManager.invalidate(CACHE_KEY);
      const fresh = await Server.getStatusComments(status.id).catch(() => []);
      // Refresh comments tab if active
      const activeTab = document.querySelector('.detail-tab.active');
      if (activeTab?.dataset.dtab === 'comments') {
        _loadDetailTab('comments', status, me, fresh);
      }
      // Update comment count
      const commTab = document.querySelector('[data-dtab="comments"]');
      if (commTab) commTab.innerHTML = `<span class="material-icons-round">chat_bubble_outline</span> Comments (${fresh.length})`;
    };

    document.getElementById('detail-send-btn')?.addEventListener('click', doSend);
    ta?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  };

  /* ── DELETE STATUS ────────────────────────────────────────── */
  const _deleteStatus = (s) => {
    const close = App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--danger)">delete</span>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Delete Status?</h3>
        <p style="font-size:13px;color:var(--text-3)">This status will be permanently removed.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="del-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="del-confirm" style="flex:1">Delete</button>
        </div>
      </div>`);
    document.getElementById('del-cancel').onclick = close;
    document.getElementById('del-confirm').onclick = async () => {
      await Server.deleteStatus(s.id).catch(() => {});
      close();
      SyncManager.invalidate(CACHE_KEY);
      _myStatuses = _myStatuses.filter(x => x.id !== s.id);
      _openPanel('manager');
      await _load();
    };
  };

  /* ── COMPOSER ─────────────────────────────────────────────── */
  const _openComposer = () => {
    _composerType = 'text';
    _selBg    = STATUS_BG[0];
    _selGrad  = null;
    _imgFile  = null;
    _vidFile  = null;
    _openPanel('composer');
  };

  const _renderComposer = (panel) => {
    const bgDots = STATUS_BG.map((c,i) =>
      `<div class="composer-bg-dot ${c===_selBg&&!_selGrad?'sel':''}" data-bg="${c}" style="background:${c}"></div>`
    ).join('');

    const gradDots = STATUS_GRADS.map((g,i) =>
      `<div class="composer-grad-dot ${_selGrad===g?'sel':''}" data-grad="${g}" style="background:${g}"></div>`
    ).join('');

    const typeTabs = ['text','image','video'].map(t => `
      <button class="composer-type-tab ${_composerType===t?'active':''}" data-type="${t}">
        <span class="material-icons-round">${t==='text'?'text_fields':t==='image'?'image':'videocam'}</span>
        ${t.charAt(0).toUpperCase()+t.slice(1)}
      </button>`).join('');

    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-btn" id="comp-back-btn">
          <span class="material-icons-round">arrow_back</span>
        </div>
        <div class="panel-header-title">New Status</div>
        <div class="panel-header-btn" id="comp-close-btn">
          <span class="material-icons-round">${_isDesktop()?'':'close'}</span>
        </div>
      </div>
      <div class="status-composer">
        <div class="composer-type-tabs">${typeTabs}</div>

        <div class="composer-body" id="composer-body">
          <!-- Dynamic content per type -->
        </div>

        <button class="composer-share-btn" id="composer-share-btn">
          <span class="material-icons-round">send</span> Share Status
        </button>
      </div>`;

    document.getElementById('comp-back-btn')?.addEventListener('click', () => _openPanel('manager'));
    document.getElementById('comp-close-btn')?.addEventListener('click', _closePanel);

    // Type tab switching
    panel.querySelectorAll('.composer-type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _composerType = tab.dataset.type;
        panel.querySelectorAll('.composer-type-tab').forEach(t => t.classList.toggle('active', t.dataset.type===_composerType));
        _renderComposerBody();
      });
    });

    document.getElementById('composer-share-btn')?.addEventListener('click', _shareStatus);

    _renderComposerBody();
  };

  const _renderComposerBody = () => {
    const body = document.getElementById('composer-body'); if (!body) return;

    if (_composerType === 'text') {
      const curBg = _selGrad || _selBg;
      const bgDots = STATUS_BG.map(c =>
        `<div class="composer-bg-dot ${c===_selBg&&!_selGrad?'sel':''}" data-bg="${c}" style="background:${c}"></div>`
      ).join('');
      const gradDots = STATUS_GRADS.map(g =>
        `<div class="composer-grad-dot ${_selGrad===g?'sel':''}" data-grad="${g}" style="background:${g}"></div>`
      ).join('');

      body.innerHTML = `
        <div class="composer-text-preview" id="comp-preview" style="background:${curBg}">
          <textarea id="comp-text" class="composer-text-input"
            placeholder="What's on your mind?" maxlength="280"
            style="background:transparent">${''}</textarea>
        </div>

        <div class="composer-bg-section">
          <div class="composer-section-label">Solid Color</div>
          <div class="composer-bg-row">${bgDots}</div>
        </div>
        <div class="composer-bg-section">
          <div class="composer-section-label">Gradient</div>
          <div class="composer-grad-row">${gradDots}</div>
        </div>`;

      body.querySelectorAll('.composer-bg-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          _selBg = dot.dataset.bg; _selGrad = null;
          document.getElementById('comp-preview')?.style.setProperty('background', _selBg);
          body.querySelectorAll('.composer-bg-dot').forEach(d => d.classList.toggle('sel', d.dataset.bg===_selBg));
          body.querySelectorAll('.composer-grad-dot').forEach(d => d.classList.remove('sel'));
        });
      });

      body.querySelectorAll('.composer-grad-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          _selGrad = dot.dataset.grad;
          document.getElementById('comp-preview')?.style.setProperty('background', _selGrad);
          body.querySelectorAll('.composer-grad-dot').forEach(d => d.classList.toggle('sel', d.dataset.grad===_selGrad));
          body.querySelectorAll('.composer-bg-dot').forEach(d => d.classList.remove('sel'));
        });
      });

    } else if (_composerType === 'image') {
      body.innerHTML = `
        <label class="composer-media-drop ${_imgFile?'has-media':''}" id="img-drop-label">
          ${_imgFile
            ? `<img id="comp-img-preview" class="composer-media-preview show" src="${URL.createObjectURL(_imgFile)}">`
            : `<span class="material-icons-round">add_photo_alternate</span>
               <div style="font-size:14px;font-weight:700;color:var(--text-2)">Tap to choose a photo</div>
               <div style="font-size:12px;color:var(--text-3)">JPEG, PNG, WebP</div>`}
          <input type="file" accept="image/*" id="comp-img-input" style="display:none">
        </label>
        <textarea id="comp-caption" class="composer-caption-input" rows="2"
          placeholder="Add a caption (optional)..." maxlength="200"></textarea>`;

      document.getElementById('comp-img-input')?.addEventListener('change', e => {
        _imgFile = e.target.files[0]; if (!_imgFile) return;
        _renderComposerBody();
      });

    } else {
      body.innerHTML = `
        <label class="composer-media-drop ${_vidFile?'has-media':''}" id="vid-drop-label">
          ${_vidFile
            ? `<video id="comp-vid-preview" class="composer-media-preview show" src="${URL.createObjectURL(_vidFile)}" controls></video>`
            : `<span class="material-icons-round">video_call</span>
               <div style="font-size:14px;font-weight:700;color:var(--text-2)">Tap to choose a video</div>
               <div style="font-size:12px;color:var(--text-3)">MP4, MOV, WebM</div>`}
          <input type="file" accept="video/*" id="comp-vid-input" style="display:none">
        </label>`;

      document.getElementById('comp-vid-input')?.addEventListener('change', e => {
        _vidFile = e.target.files[0]; if (!_vidFile) return;
        _renderComposerBody();
      });
    }
  };

  const _shareStatus = async () => {
    const me = Server.currentUser;
    const myProfile = Server.currentProfile?.data || {};
    const btn = document.getElementById('composer-share-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff"></div>`; }

    const base = {
      user_id: me.id, display_name: myProfile.display_name||me.display_name||'Me',
      username: myProfile.username||'', avatar_url: myProfile.avatar_url||'',
      views: [], view_count: 0, likes: [], like_count: 0,
      expires_at: new Date(Date.now()+24*60*60*1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      if (_composerType === 'text') {
        const text = document.getElementById('comp-text')?.value.trim();
        if (!text) { App.showToast('Please write something!', 'error'); return; }
        await Server.createStatus({ ...base, type:'text', content:text, bg_gradient: _selGrad||null, bg_color: _selBg });

      } else if (_composerType === 'image') {
        if (!_imgFile) { App.showToast('Please choose a photo', 'error'); return; }
        const url = await Server.uploadCompressedImage(_imgFile, 'spark_statuses_media');
        if (!url) throw new Error('Upload failed');
        const caption = document.getElementById('comp-caption')?.value.trim();
        await Server.createStatus({ ...base, type:'image', content:url, caption });

      } else {
        if (!_vidFile) { App.showToast('Please choose a video', 'error'); return; }
        const data = await Server.uploadFile(_vidFile, 'spark_statuses_media');
        if (!data?.url) throw new Error('Upload failed');
        await Server.createStatus({ ...base, type:'video', content:data.url });
      }

      SyncManager.invalidate(CACHE_KEY);
      App.showToast('Status shared! 🎉', 'success');
      _openPanel('manager');
      await _load();

    } catch (e) {
      App.showToast(e.message || 'Failed to share', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = `<span class="material-icons-round">send</span> Share Status`; }
    }
  };

  /* ══════════════════════════════════════════════════════════
     STATUS VIEWER (full-screen overlay)
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

      const bg      = d.bg_gradient || d.bg_color || '#000';
      const liked   = (d.likes||[]).includes(me?.id);
      const isVideo = d.type === 'video';

      let contentHtml = '';
      if (d.type === 'text') {
        contentHtml = `<div class="sv-text-card" style="background:${bg}">
          <div class="sv-text-inner">${_esc(d.content)}</div>
        </div>`;
      } else if (d.type === 'image') {
        contentHtml = `<img src="${d.content}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">`;
      } else {
        contentHtml = `<video id="sv-video" src="${d.content}" autoplay playsinline
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
          ${isMine ? `<button class="sv-action-btn" id="sv-del-this"><span class="material-icons-round">delete</span></button>` : ''}
          <button class="sv-action-btn" id="sv-close"><span class="material-icons-round">close</span></button>
        </div>

        <div class="sv-content" style="background:${d.type==='text'?bg:'#000'}">
          ${contentHtml}
          <div class="sv-tap-prev" id="sv-prev"></div>
          <div class="sv-tap-next" id="sv-next"></div>
        </div>

        ${isMine ? `<div class="sv-stats-bar" id="sv-stats">
          <div class="sv-stat" data-tab="views"><span class="material-icons-round">visibility</span>${(d.views||[]).length}</div>
          <div class="sv-stat" data-tab="hearts"><span class="material-icons-round">favorite</span>${(d.likes||[]).length}</div>
          <div class="sv-stat" id="sv-comment-count" data-tab="comments"><span class="material-icons-round">chat_bubble_outline</span>…</div>
        </div>` : ''}

        <div class="sv-bottom">
          <button class="sv-action-btn" id="sv-comment-btn" title="Comments">
            <span class="material-icons-round">chat_bubble_outline</span>
          </button>
          ${!isMine ? `<input class="sv-reply-input" placeholder="Reply…" id="sv-reply-in">` : ''}
          <button class="sv-action-btn ${liked?'liked':''}" id="sv-like">
            <span class="material-icons-round">${liked?'favorite':'favorite_border'}</span>
          </button>
        </div>`;

      document.body.appendChild(el);

      // Comment count for mine
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

      // Stats tabs
      document.getElementById('sv-stats')?.querySelectorAll('.sv-stat').forEach(tab => {
        tab.style.cursor = 'pointer';
        tab.addEventListener('click', () => {
          closeViewer();
          _detailStatus = rec;
          _openPanel('detail');
          // Switch to right tab
          setTimeout(() => {
            const dtab = document.querySelector(`[data-dtab="${tab.dataset.tab}"]`);
            dtab?.click();
          }, 100);
        });
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

      // Comment button — shows overlay sheet
      document.getElementById('sv-comment-btn').onclick = () => _showCommentSheet(rec, isMine);

      // Reply send (non-mine)
      const replyIn = document.getElementById('sv-reply-in');
      if (replyIn) {
        const sendReply = async () => {
          const text = replyIn.value.trim(); if (!text) return;
          replyIn.value = '';
          const myP = Server.currentProfile?.data || {};
          await Server.addStatusComment(rec.id, {
            user_id: me.id, display_name: myP.display_name||'Me',
            username: myP.username||'', avatar_url: myP.avatar_url||'',
          }, text);
          SyncManager.invalidate(CACHE_KEY);
          App.showToast('Reply sent!', 'success');
        };
        replyIn.addEventListener('keydown', e => { if (e.key === 'Enter') sendReply(); });
      }

      // Swipe
      let tx = 0;
      el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (!_pauseAuto && Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
      });

      // Auto-advance
      if (isVideo) {
        const vid = document.getElementById('sv-video');
        vid?.addEventListener('ended', () => { if (!_pauseAuto) next(); });
        vid?.addEventListener('error', () => { _autoTimer = setTimeout(() => { if (!_pauseAuto) next(); }, 3000); });
      } else {
        _autoTimer = setTimeout(() => { if (!_pauseAuto) next(); }, 5000);
      }
    };

    renderItem();
  };

  /* ── COMMENT SHEET (full sheet overlay on viewer) ─────────── */
  const _showCommentSheet = async (rec, isMine) => {
    _pauseAuto = true;
    const me = Server.currentUser;
    const myProfile = Server.currentProfile?.data || {};

    const overlay = document.createElement('div');
    overlay.id = 'sv-comments-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:900;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);';

    overlay.innerHTML = `
      <div id="sc-sheet" style="background:var(--bg-1);border-radius:20px 20px 0 0;max-height:75dvh;display:flex;flex-direction:column;animation:slideUpSheet 0.25s cubic-bezier(0.32,0.72,0,1);">
        <div style="padding:12px 16px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
          <div style="width:40px;height:4px;background:var(--bg-5);border-radius:2px;margin:0 auto 12px"></div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h3 style="font-size:16px;font-weight:800;color:var(--text-1);display:flex;align-items:center;gap:8px">
              <span class="material-icons-round" style="font-size:18px;color:var(--accent)">chat_bubble_outline</span>
              Comments
            </h3>
            <button class="icon-btn" id="sc-close"><span class="material-icons-round">close</span></button>
          </div>
        </div>
        <div id="sc-list" style="flex:1;overflow-y:auto;padding:8px 16px;">${App.skel.threads(3)}</div>
        <div style="display:flex;align-items:flex-end;gap:8px;padding:10px 16px;padding-bottom:max(10px,env(safe-area-inset-bottom,10px));border-top:1px solid var(--border);flex-shrink:0;background:var(--bg-1)">
          ${App.avatar(myProfile.avatar_url, myProfile.display_name, 'av-sm')}
          <textarea id="sc-input" class="detail-comment-input" rows="1" placeholder="Add a comment..."></textarea>
          <button class="detail-send-btn" id="sc-send"><span class="material-icons-round">send</span></button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const _closeSheet = () => { overlay.remove(); _pauseAuto = false; };
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeSheet(); });
    document.getElementById('sc-close').onclick = _closeSheet;

    const comments = await Server.getStatusComments(rec.id).catch(() => []);
    _renderSheetComments(comments, me, isMine, rec.id);

    const inp = document.getElementById('sc-input');
    inp?.addEventListener('input', () => { inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,100)+'px'; });

    const doSend = async () => {
      const text = inp?.value.trim(); if (!text) return;
      inp.value = ''; inp.style.height = 'auto';
      await Server.addStatusComment(rec.id, {
        user_id: me.id, display_name: myProfile.display_name||'Me',
        username: myProfile.username||'', avatar_url: myProfile.avatar_url||'',
      }, text);
      const fresh = await Server.getStatusComments(rec.id).catch(() => []);
      _renderSheetComments(fresh, me, isMine, rec.id);
      SyncManager.invalidate(CACHE_KEY);
    };

    document.getElementById('sc-send').onclick = doSend;
    inp?.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  };

  const _renderSheetComments = (comments, me, isMine, statusId) => {
    const list = document.getElementById('sc-list'); if (!list) return;
    if (!comments.length) {
      list.innerHTML = `<div class="empty-state" style="padding:32px 0"><span class="material-icons-round">chat_bubble_outline</span><p style="color:var(--text-3);font-size:13px">Be the first to comment</p></div>`;
      return;
    }
    list.innerHTML = comments.map(c => {
      const cd = c.data || {};
      const isOwn = cd.user_id === me?.id;
      return `<div style="display:flex;gap:10px;margin-bottom:14px">
        ${App.avatar(cd.avatar_url||'', cd.display_name||'User', 'av-sm')}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:13px;font-weight:700;color:var(--text-1)">${_esc(cd.display_name||'User')}</span>
            <span style="font-size:11px;color:var(--text-3)">${App.timeAgo(cd.created_at)}</span>
            ${isOwn||isMine ? `<span class="sc-del-btn" data-cid="${c.id}" style="margin-left:auto;cursor:pointer;color:var(--text-3)"><span class="material-icons-round" style="font-size:16px">delete</span></span>` : ''}
          </div>
          <div style="font-size:14px;color:var(--text-1);line-height:1.45;word-break:break-word">${_esc(cd.comment||'')}</div>
        </div>
      </div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;

    list.querySelectorAll('.sc-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Server.deleteStatusComment(btn.dataset.cid).catch(() => {});
        const fresh = await Server.getStatusComments(statusId).catch(() => []);
        _renderSheetComments(fresh, me, isMine, statusId);
      });
    });
  };

  /* ── MY STATUS MENU ───────────────────────────────────────── */
  const _showMyStatusMenu = () => {
    App.showModal(`<div style="padding:8px 0 20px">
      <div class="ctx-action" id="smm-view"><span class="material-icons-round">visibility</span> View my statuses</div>
      <div class="ctx-action" id="smm-manage"><span class="material-icons-round">manage_accounts</span> Manage my statuses</div>
      <div class="ctx-action" id="smm-add"><span class="material-icons-round">add_circle_outline</span> Add new status</div>
      <div class="ctx-action danger" id="smm-delall"><span class="material-icons-round">delete_sweep</span> Delete all my statuses</div>
    </div>`);
    document.getElementById('smm-view').onclick   = () => { App.closeModal(); _viewStatuses(_myStatuses, true); };
    document.getElementById('smm-manage').onclick  = () => { App.closeModal(); _openPanel('manager'); };
    document.getElementById('smm-add').onclick    = () => { App.closeModal(); _openComposer(); };
    document.getElementById('smm-delall').onclick = async () => {
      App.closeModal();
      const close2 = App.showModal(`
        <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
          <span class="material-icons-round" style="font-size:48px;color:var(--danger)">delete_sweep</span>
          <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Delete all statuses?</h3>
          <div style="display:flex;gap:10px;width:100%">
            <button class="btn-ghost" id="das-cancel" style="flex:1">Cancel</button>
            <button class="btn-danger" id="das-confirm" style="flex:1">Delete All</button>
          </div>
        </div>`);
      document.getElementById('das-cancel').onclick = close2;
      document.getElementById('das-confirm').onclick = async () => {
        close2();
        for (const s of _myStatuses) await Server.deleteStatus(s.id).catch(() => {});
        App.showToast('All statuses deleted');
        SyncManager.invalidate(CACHE_KEY);
        _myStatuses = []; await _load();
      };
    };
  };

  return { render };
})();