/**
 * updates.js — Status / Updates v5
 *
 * Redesign:
 *  • Stories rail at top (horizontal scroll avatars)
 *  • Connection-gated: only show statuses of people in shared chats/groups
 *  • Multiple status items per user (stacked with progress bars)
 *  • Text / Image / Video status types
 *  • Restriction: `hidden_from: [uid, ...]` field — block specific users
 *  • My status: edit, delete, manage restrictions
 *  • Status reply goes to DM
 *  • Like + view count
 *  • Skeleton loading
 */

const UpdatesPage = (() => {

  const CACHE_KEY = 'updates_statuses';
  const CONN_KEY  = 'updates_connections';

  let _container = null;
  let _myStatuses  = [];   // all statuses by me
  let _autoTimer = null;

  const STATUS_BG = [
    '#0095f6','#ed4956','#2dd55b','#f0a030',
    '#bc1888','#1a1a2e','#8a2be2','#e6683c'
  ];

  /* ── Render ───────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;
    App.setTitle(null); App.setHeaderActions('');

    // Show skeletons while loading
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
  };

  /* ── Load ─────────────────────────────────────────────────── */
  const _load = async () => {
    const scroll = document.getElementById('up-scroll'); if (!scroll) return;
    const me = Server.currentUser; if (!me) return;

    // Use cache unless stale
    let allStatuses, connections;

    if (App.cache.fresh(CACHE_KEY)) {
      allStatuses = App.cache.get(CACHE_KEY);
    } else {
      allStatuses = await Server.getStatuses();
      App.cache.set(CACHE_KEY, allStatuses);
    }

    if (App.cache.fresh(CONN_KEY)) {
      connections = App.cache.get(CONN_KEY);
    } else {
      connections = await _loadConnections(me.id);
      App.cache.set(CONN_KEY, connections);
    }

    // My statuses
    _myStatuses = allStatuses.filter(s => s.data.user_id === me.id);

    // Others — gated by connection + not restricted
    const others = allStatuses.filter(s => {
      const d = s.data;
      if (d.user_id === me.id) return false;
      if (!connections.has(d.user_id)) return false;   // not connected
      if ((d.hidden_from || []).includes(me.id)) return false; // restricted
      return true;
    });

    // Group by user, maintain latest-first order
    const byUser = {};
    others.forEach(s => {
      const uid = s.data.user_id;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(s);
    });

    const uniqueUsers = Object.keys(byUser);
    const myProfile = Server.currentProfile?.data || {};

    // Check if any new unseen for each user
    const hasUnseen = (uid) => byUser[uid]?.some(s => !(s.data.views || []).includes(me.id));

    // ── Build HTML ──
    // Stories rail
    const myRingCls  = _myStatuses.length ? 'story-ring' : 'story-ring my-ring';
    const myImgHtml  = myProfile.avatar_url ? `<img src="${_esc(myProfile.avatar_url)}" alt="">` : `<span>${(myProfile.display_name || '?')[0].toUpperCase()}</span>`;

    let railHtml = `
      <div class="story-bubble" id="my-story-bubble" title="My Status">
        <div class="${myRingCls}">
          <div class="story-av">${myImgHtml}</div>
          ${_myStatuses.length === 0 ? `<div class="story-add-icon"><span class="material-icons-round">add</span></div>` : ''}
        </div>
        <span class="story-name ${_myStatuses.length ? 'unseen' : ''}">My Status</span>
      </div>`;

    uniqueUsers.forEach(uid => {
      const first = byUser[uid][0].data;
      const viewed = !hasUnseen(uid);
      const initial = (first.display_name || '?')[0].toUpperCase();
      railHtml += `
        <div class="story-bubble" data-uid="${uid}" title="${_esc(first.display_name)}">
          <div class="story-ring ${viewed ? 'viewed' : ''}">
            <div class="story-av">
              ${first.avatar_url ? `<img src="${_esc(first.avatar_url)}" alt="">` : `<span>${initial}</span>`}
            </div>
          </div>
          <span class="story-name ${viewed ? '' : 'unseen'}">${_esc((first.display_name || '').split(' ')[0])}</span>
        </div>`;
    });

    // Status list (detailed rows)
    let listHtml = '';

    if (!uniqueUsers.length && !_myStatuses.length) {
      listHtml = `
        <div class="empty-state">
          <span class="material-icons-round">radio_button_unchecked</span>
          <h3>No updates yet</h3>
          <p>Connect with people to see their status updates here.</p>
        </div>`;
    } else {
      // My status row
      if (_myStatuses.length) {
        const latest = _myStatuses[0].data;
        const totalViews = [...new Set(_myStatuses.flatMap(s => s.data.views || []))].length;
        const totalLikes = [...new Set(_myStatuses.flatMap(s => s.data.likes || []))].length;
        listHtml += `
          <div class="my-status-row" id="view-my-status">
            <div class="story-ring" style="width:50px;height:50px">
              <div class="story-av">
                ${myProfile.avatar_url ? `<img src="${_esc(myProfile.avatar_url)}" alt="">` : `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
              </div>
            </div>
            <div class="my-status-info">
              <div class="my-status-title">My Status <span style="font-size:11px;color:var(--text-3);font-weight:500">(${_myStatuses.length})</span></div>
              <div class="my-status-sub">
                <span class="material-icons-round" style="font-size:12px;vertical-align:middle">visibility</span> ${totalViews} views ·
                <span class="material-icons-round" style="font-size:12px;vertical-align:middle">favorite</span> ${totalLikes}
                · ${App.timeAgo(_myStatuses[0].created_at || _myStatuses[0].data.created_at)}
              </div>
            </div>
            <div class="my-status-btns">
              <button class="icon-btn" id="add-status-btn" title="Add Status"><span class="material-icons-round">add</span></button>
              <button class="icon-btn" id="manage-my-status" title="Manage"><span class="material-icons-round">more_vert</span></button>
            </div>
          </div>`;
      } else {
        listHtml += `
          <div class="my-status-row" id="add-my-status">
            <div class="story-ring my-ring" style="width:50px;height:50px">
              <div class="story-av">
                ${myProfile.avatar_url ? `<img src="${_esc(myProfile.avatar_url)}" alt="">` : `<span>${(myProfile.display_name||'?')[0].toUpperCase()}</span>`}
                <div class="story-add-icon"><span class="material-icons-round">add</span></div>
              </div>
            </div>
            <div class="my-status-info">
              <div class="my-status-title">Add Status</div>
              <div class="my-status-sub">Share a photo, video, or text</div>
            </div>
          </div>`;
      }

      // Others
      if (uniqueUsers.length) {
        listHtml += `<div class="status-list-header">Recent Updates</div>`;
        uniqueUsers.forEach(uid => {
          const statuses = byUser[uid];
          const first    = statuses[0].data;
          const viewed   = !hasUnseen(uid);
          const initial  = (first.display_name || '?')[0].toUpperCase();
          const count    = statuses.length;
          const latest   = statuses[0];
          listHtml += `
            <div class="status-list-item" data-uid="${uid}">
              <div class="sl-ring ${viewed ? 'viewed' : ''}">
                <div class="sl-av">
                  ${first.avatar_url ? `<img src="${_esc(first.avatar_url)}" alt="">` : `<span>${initial}</span>`}
                </div>
              </div>
              <div class="sl-info">
                <div class="sl-name">${_esc(first.display_name || 'User')}</div>
                <div class="sl-meta">
                  ${App.timeAgo(latest.created_at || latest.data.created_at)}
                  ${count > 1 ? `<span class="sl-count-chip"><span class="material-icons-round">photo_library</span>${count}</span>` : ''}
                  ${!viewed ? `<span class="sl-new-dot"></span>` : ''}
                </div>
              </div>
            </div>`;
        });
      }
    }

    scroll.innerHTML = `
      <div class="stories-rail" id="stories-rail">${railHtml}</div>
      <div class="status-list-section">${listHtml}</div>`;

    // ── Bind ──
    document.getElementById('my-story-bubble')?.addEventListener('click', () => {
      _myStatuses.length ? _viewStatuses(_myStatuses, true) : _showSheet();
    });
    document.getElementById('add-my-status')?.addEventListener('click', _showSheet);
    document.getElementById('view-my-status')?.addEventListener('click', () => _viewStatuses(_myStatuses, true));
    document.getElementById('add-status-btn')?.addEventListener('click', e => { e.stopPropagation(); _showSheet(); });
    document.getElementById('manage-my-status')?.addEventListener('click', e => { e.stopPropagation(); _showMyStatusMenu(); });

    // Rail bubbles (others)
    document.querySelectorAll('.story-bubble[data-uid]').forEach(el => {
      el.addEventListener('click', () => {
        const uid = el.dataset.uid;
        _viewStatuses(byUser[uid] || [], false);
      });
    });

    // List rows
    document.querySelectorAll('.status-list-item[data-uid]').forEach(el => {
      el.addEventListener('click', () => {
        const uid = el.dataset.uid;
        _viewStatuses(byUser[uid] || [], false);
      });
    });
  };

  /* ── Load connections (users in shared chats/groups) ────────── */
  const _loadConnections = async (myId) => {
    const set = new Set();
    try {
      const chats = await Server.getChats(myId);
      chats.forEach(chat => {
        (chat.data.participants || []).forEach(uid => { if (uid !== myId) set.add(uid); });
      });
    } catch {}
    return set;
  };

  /* ── Status viewer ────────────────────────────────────────────── */
  const _viewStatuses = (list, isMine) => {
    if (!list.length) return;
    let idx = 0;
    clearTimeout(_autoTimer);

    const renderItem = () => {
      clearTimeout(_autoTimer);
      document.getElementById('sv-overlay')?.remove();

      const me  = Server.currentUser;
      const rec = list[idx];
      const d   = rec.data;
      const bg  = d.type === 'text' ? (d.bg_color || STATUS_BG[0]) : '#000';

      Server.viewStatus(rec.id, me?.id).catch(() => {});

      const el = document.createElement('div');
      el.id = 'sv-overlay'; el.className = 'sv-root';

      const bars = list.map((_,i) => `
        <div class="sv-progress-bar">
          <div class="sv-progress-fill ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>
        </div>`).join('');

      const views     = (d.views || []).length;
      const likes     = (d.likes || []).length;
      const liked     = (d.likes || []).includes(me?.id);
      const isVideoType = d.type === 'video';

      let contentHtml = '';
      if (d.type === 'text') {
        contentHtml = `<div class="sv-text-card" style="background:${bg}">
          <div class="sv-text-inner">${_esc(d.content)}</div>
        </div>`;
      } else if (d.type === 'image') {
        contentHtml = `<img src="${_esc(d.content)}" alt="Status" style="max-width:100%;max-height:100%;object-fit:contain">`;
      } else if (d.type === 'video') {
        contentHtml = `<video id="sv-video" src="${_esc(d.content)}" autoplay playsinline
          style="max-width:100%;max-height:100%;object-fit:contain"></video>`;
      }

      el.innerHTML = `
        <div class="sv-progress-strip">${bars}</div>
        <div class="sv-header">
          ${App.avatar(d.avatar_url, d.display_name, 'av-sm')}
          <div class="sv-info">
            <div class="sv-name">${_esc(d.display_name || 'User')}</div>
            <div class="sv-time">${App.timeAgo(d.created_at || rec.created_at)}</div>
          </div>
          ${isMine ? `<button class="sv-action-btn" id="sv-del-this" title="Delete this status">
            <span class="material-icons-round">delete</span></button>` : ''}
          <button class="sv-action-btn" id="sv-close"><span class="material-icons-round">close</span></button>
        </div>

        <div class="sv-content" style="background:${d.type === 'text' ? bg : '#000'}">
          ${contentHtml}
          <div class="sv-tap-prev" id="sv-prev"></div>
          <div class="sv-tap-next" id="sv-next"></div>
        </div>

        ${isMine ? `
        <div class="sv-stats-bar">
          <div class="sv-stat"><span class="material-icons-round">visibility</span>${views}</div>
          <div class="sv-stat"><span class="material-icons-round">favorite</span>${likes}</div>
        </div>` : ''}

        <div class="sv-bottom">
          ${!isMine ? `<input class="sv-reply-input" id="sv-reply" placeholder="Reply to ${_esc(d.display_name || 'User')}…">` : ''}
          <button class="sv-action-btn ${liked ? 'liked' : ''}" id="sv-like">
            <span class="material-icons-round">${liked ? 'favorite' : 'favorite_border'}</span>
          </button>
          ${!isMine ? `<button class="sv-action-btn" id="sv-restrict" title="Restrict">
            <span class="material-icons-round">block</span></button>` : ''}
        </div>`;

      document.body.appendChild(el);

      const close = () => { clearTimeout(_autoTimer); el.remove(); _load(); };
      const next  = () => { if (idx < list.length - 1) { idx++; renderItem(); } else close(); };
      const prev  = () => { if (idx > 0) { idx--; renderItem(); } };

      document.getElementById('sv-close').onclick = close;
      document.getElementById('sv-next').onclick  = next;
      document.getElementById('sv-prev').onclick  = prev;

      // Swipe gesture
      let tx = 0;
      el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
      });

      // Like
      document.getElementById('sv-like').onclick = async () => {
        const res = await Server.likeStatus(rec.id, me?.id);
        if (!res) return;
        const btn  = document.getElementById('sv-like');
        const icon = btn?.querySelector('.material-icons-round');
        if (icon) icon.textContent = res.liked ? 'favorite' : 'favorite_border';
        btn?.classList.toggle('liked', res.liked);
        App.cache.dirty(CACHE_KEY);
      };

      // Delete this status (my view)
      document.getElementById('sv-del-this')?.addEventListener('click', async () => {
        await Server.deleteStatus(rec.id);
        App.cache.dirty(CACHE_KEY);
        list.splice(idx, 1);
        if (!list.length) { close(); return; }
        if (idx >= list.length) idx = list.length - 1;
        renderItem();
      });

      // Reply → open DM
      document.getElementById('sv-reply')?.addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const text = e.target.value.trim(); if (!text) return;
        e.target.value = '';
        App.showToast('Sending reply…');
        try {
          const myProfile = Server.currentProfile;
          const chatData  = await Server.findDirectChat(me.id, d.user_id) ||
            await Server.createDirectChat(
              { user_id: me.id, display_name: myProfile?.data.display_name, username: myProfile?.data.username, avatar_url: myProfile?.data.avatar_url || '' },
              { user_id: d.user_id, display_name: d.display_name, username: d.username || '', avatar_url: d.avatar_url || '' }
            );
          if (chatData?.id) {
            await Server.sendChatMessage(chatData.id, {
              sender_id: me.id, username: myProfile?.data.username || '', display_name: myProfile?.data.display_name || 'Me',
              message: text, time: new Date().toISOString(), msg_type: 'text'
            });
            App.showToast('Reply sent!', 'success');
          }
        } catch { App.showToast('Failed to send reply', 'error'); }
      });

      // Restrict sender from seeing my statuses
      document.getElementById('sv-restrict')?.addEventListener('click', () => {
        _showRestrictMenu(d.user_id, d.display_name, () => { App.cache.dirty(CACHE_KEY); });
      });

      // Auto-advance (5s for text/image, video auto-advance on 'ended')
      if (isVideoType) {
        const vid = document.getElementById('sv-video');
        vid?.addEventListener('ended', next);
        vid?.addEventListener('error', () => { _autoTimer = setTimeout(next, 3000); });
      } else {
        _autoTimer = setTimeout(next, 5000);
      }
    };

    renderItem();
  };

  /* ── My status menu ───────────────────────────────────────────── */
  const _showMyStatusMenu = () => {
    App.showModal(`
      <div style="padding:8px 0 20px">
        <div class="ctx-action" id="smm-view">
          <span class="material-icons-round">visibility</span> View my statuses
        </div>
        <div class="ctx-action" id="smm-add">
          <span class="material-icons-round">add_circle_outline</span> Add new status
        </div>
        <div class="ctx-action" id="smm-restrict">
          <span class="material-icons-round">block</span> Manage restrictions
        </div>
        <div class="ctx-action danger" id="smm-delall">
          <span class="material-icons-round">delete_sweep</span> Delete all my statuses
        </div>
      </div>`);
    document.getElementById('smm-view').onclick = () => { App.closeModal(); _viewStatuses(_myStatuses, true); };
    document.getElementById('smm-add').onclick  = () => { App.closeModal(); _showSheet(); };
    document.getElementById('smm-restrict').onclick = () => { App.closeModal(); _showManageRestrictions(); };
    document.getElementById('smm-delall').onclick   = async () => {
      App.closeModal();
      if (!confirm('Delete all your statuses?')) return;
      for (const s of _myStatuses) { await Server.deleteStatus(s.id).catch(() => {}); }
      App.showToast('All statuses deleted');
      App.cache.dirty(CACHE_KEY);
      _myStatuses = []; await _load();
    };
  };

  /* ── Restrict a user from seeing my statuses ─────────────────── */
  const _showRestrictMenu = (targetUid, targetName, onDone) => {
    // Read restriction from my existing statuses — stored in profile field
    const myProfile = Server.currentProfile;
    const restricted = myProfile?.data?.status_restricted_from || [];
    const isRestricted = restricted.includes(targetUid);

    App.showModal(`
      <div style="padding:24px 20px 32px;display:flex;flex-direction:column;gap:16px;text-align:center;align-items:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--warning)">shield</span>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">${isRestricted ? 'Remove Restriction' : 'Restrict'} ${_esc(targetName)}</h3>
        <p style="font-size:13px;color:var(--text-3);line-height:1.5">
          ${isRestricted
            ? `${_esc(targetName)} is currently restricted from seeing your statuses. Remove this restriction?`
            : `${_esc(targetName)} will no longer be able to see your future statuses.`}
        </p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="rs-cancel" style="flex:1">Cancel</button>
          <button class="${isRestricted ? 'btn-primary' : 'btn-danger'}" id="rs-confirm" style="flex:1">
            ${isRestricted ? 'Remove restriction' : 'Restrict'}
          </button>
        </div>
      </div>`);
    document.getElementById('rs-cancel').onclick = App.closeModal;
    document.getElementById('rs-confirm').onclick = async () => {
      App.closeModal();
      const newList = isRestricted
        ? restricted.filter(id => id !== targetUid)
        : [...restricted, targetUid];
      if (myProfile?.id) {
        await Server.updateProfile(myProfile.id, { status_restricted_from: newList }).catch(() => {});
        if (Server.currentProfile?.data) Server.currentProfile.data.status_restricted_from = newList;
      }
      App.showToast(isRestricted ? 'Restriction removed' : `${targetName} restricted`, 'success');
      if (typeof onDone === 'function') onDone();
    };
  };

  /* ── Manage restrictions panel ───────────────────────────────── */
  const _showManageRestrictions = () => {
    const myProfile = Server.currentProfile;
    const restricted = myProfile?.data?.status_restricted_from || [];
    if (!restricted.length) { App.showToast('No restrictions set'); return; }
    App.showModal(`
      <div style="padding:20px 16px 32px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1);text-align:center;margin-bottom:16px">Restricted Users</h3>
        <p style="font-size:13px;color:var(--text-3);margin-bottom:14px;text-align:center">These users cannot see your statuses.</p>
        <div id="restr-list">
          ${restricted.map(uid => `
            <div class="restriction-chip" data-uid="${uid}">
              <span class="material-icons-round">person_off</span>
              <span style="flex:1">${uid}</span>
              <span class="rm-x material-icons-round">close</span>
            </div>`).join('')}
        </div>
      </div>`);
    document.querySelectorAll('#restr-list .rm-x').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.closest('.restriction-chip').dataset.uid;
        const newList = (myProfile?.data?.status_restricted_from || []).filter(id => id !== uid);
        if (myProfile?.id) {
          await Server.updateProfile(myProfile.id, { status_restricted_from: newList }).catch(() => {});
          if (Server.currentProfile?.data) Server.currentProfile.data.status_restricted_from = newList;
        }
        btn.closest('.restriction-chip').remove();
        App.showToast('Restriction removed', 'success');
        App.cache.dirty(CACHE_KEY);
      });
    });
  };

  /* ── Create status sheet ──────────────────────────────────────── */
  const _showSheet = () => {
    let selType  = 'text';
    let selColor = STATUS_BG[0];
    let imgFile  = null;
    let vidFile  = null;

    const colorDots = STATUS_BG.map(c =>
      `<div class="status-bg-dot ${c === selColor ? 'sel' : ''}" data-color="${c}" style="background:${c}"></div>`
    ).join('');

    const myProfile = Server.currentProfile?.data || {};

    const close = App.showModal(`
      <div class="create-status-sheet">
        <h3>New Status</h3>

        <div class="status-type-tabs">
          <div class="status-type-tab active" data-type="text"><span class="material-icons-round">text_fields</span>Text</div>
          <div class="status-type-tab" data-type="image"><span class="material-icons-round">image</span>Photo</div>
          <div class="status-type-tab" data-type="video"><span class="material-icons-round">videocam</span>Video</div>
        </div>

        <div id="cs-text-area">
          <textarea class="status-text-input" id="cs-text" placeholder="What's on your mind?…" maxlength="280"></textarea>
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

    // Type tabs
    document.querySelectorAll('.status-type-tab').forEach(tab => {
      tab.onclick = () => {
        selType = tab.dataset.type;
        document.querySelectorAll('.status-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('cs-text-area').style.display = selType === 'text'  ? 'block' : 'none';
        document.getElementById('cs-img-area').style.display  = selType === 'image' ? 'block' : 'none';
        document.getElementById('cs-vid-area').style.display  = selType === 'video' ? 'block' : 'none';
      };
    });

    // Color dots
    document.querySelectorAll('#cs-colors .status-bg-dot').forEach(dot => {
      dot.onclick = () => {
        selColor = dot.dataset.color;
        document.querySelectorAll('#cs-colors .status-bg-dot').forEach(d => d.classList.remove('sel'));
        dot.classList.add('sel');
      };
    });

    // Image file
    document.getElementById('cs-img-input')?.addEventListener('change', e => {
      imgFile = e.target.files[0]; if (!imgFile) return;
      const rd = new FileReader(); rd.onload = ev => {
        const p = document.getElementById('cs-img-preview'); p.src = ev.target.result; p.style.display = 'block';
      }; rd.readAsDataURL(imgFile);
    });

    // Video file
    document.getElementById('cs-vid-input')?.addEventListener('change', e => {
      vidFile = e.target.files[0]; if (!vidFile) return;
      const p = document.getElementById('cs-vid-preview');
      p.src = URL.createObjectURL(vidFile); p.style.display = 'block';
    });

    // Submit
    document.getElementById('cs-submit').onclick = async () => {
      const me = Server.currentUser;
      const errEl = document.getElementById('cs-err'); errEl.classList.remove('visible');
      const btn = document.getElementById('cs-submit'); btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff"></div>`;

      const expires = new Date(Date.now() + 24*60*60*1000).toISOString();
      const base = {
        user_id: me.id, display_name: myProfile.display_name || me.display_name || 'Me',
        username: myProfile.username || '', avatar_url: myProfile.avatar_url || '',
        views: [], view_count: 0, likes: [], like_count: 0,
        expires_at: expires, created_at: new Date().toISOString(),
        hidden_from: []
      };

      try {
        if (selType === 'text') {
          const text = document.getElementById('cs-text').value.trim();
          if (!text) { errEl.textContent = 'Enter some text.'; errEl.classList.add('visible'); btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">send</span> Share Status'; return; }
          await Server.createStatus({ ...base, type: 'text', content: text, bg_color: selColor });

        } else if (selType === 'image') {
          if (!imgFile) { errEl.textContent = 'Choose a photo.'; errEl.classList.add('visible'); btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">send</span> Share Status'; return; }
          const url = await Server.uploadCompressedImage(imgFile, 'spark_statuses_media');
          if (!url) throw new Error('Upload failed');
          await Server.createStatus({ ...base, type: 'image', content: url });

        } else if (selType === 'video') {
          if (!vidFile) { errEl.textContent = 'Choose a video.'; errEl.classList.add('visible'); btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">send</span> Share Status'; return; }
          const data = await Server.uploadFile(vidFile, 'spark_statuses_media');
          if (!data?.url) throw new Error('Upload failed');
          await Server.createStatus({ ...base, type: 'video', content: data.url });
        }

        App.cache.dirty(CACHE_KEY);
        close(); App.showToast('Status shared!', 'success');
        await _load();
      } catch (e) {
        btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">send</span> Share Status';
        errEl.textContent = e.message || 'Failed.'; errEl.classList.add('visible');
      }
    };
  };

  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return { render };
})();
