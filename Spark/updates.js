/**
 * updates.js — Status / Updates Page (v2)
 * Uses spark_statuses table with views[], likes[], view_count, like_count.
 * Shows statuses from ALL users (not just contacts — anyone can post).
 */

const UpdatesPage = (() => {

  let _container = null;
  let _myStatus  = null;
  let _autoTimer = null;

  const STATUS_BG = [
    '#0095f6','#ed4956','#2dd55b','#f0a030',
    '#bc1888','#1a1a2e','#8a2be2','#e6683c'
  ];

  /* ─── RENDER ─────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;
    App.setTitle(null);
    App.setHeaderActions('');

    container.innerHTML = `
      <div class="updates-scroll" id="up-scroll">
        <div class="loading-center" style="height:200px">
          <div class="spinner"></div>
        </div>
      </div>`;

    await _load();
  };

  /* ─── LOAD ────────────────────────────────────────────────── */
  const _load = async () => {
    const scroll = document.getElementById('up-scroll');
    if (!scroll) return;

    const me        = Server.currentUser;
    const myProfile = Server.currentProfile;
    if (!me) return;

    const statuses = await Server.getStatuses();

    _myStatus      = statuses.find(s => s.data.user_id === me.id) || null;
    const others   = statuses.filter(s => s.data.user_id !== me.id);

    // Group by user — keep latest per user
    const byUser = {};
    others.forEach(s => {
      const uid = s.data.user_id;
      if (!byUser[uid] || new Date(s.created_at) > new Date(byUser[uid].created_at))
        byUser[uid] = s;
    });
    const latest = Object.values(byUser);

    let html = '';

    /* ── My Status ── */
    html += `<div class="section-label">My Status</div>`;

    if (_myStatus) {
      const d       = _myStatus.data;
      const views   = (d.views || []).length;
      const likes   = (d.likes || []).length;
      html += `
        <div class="my-status-card">
          <div class="status-ring-has" id="view-my-status" style="cursor:pointer">
            <div class="status-av-img">
              ${myProfile?.data.avatar_url
                ? `<img src="${myProfile.data.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : `<span>${(myProfile?.data.display_name || '?')[0].toUpperCase()}</span>`}
            </div>
          </div>
          <div class="my-status-info">
            <div class="my-status-name">My Status</div>
            <div class="my-status-sub">
              ${App.timeAgo(d.created_at || _myStatus.created_at)} ·
              <span class="material-icons-round" style="font-size:12px;vertical-align:middle">visibility</span> ${views}
              <span class="material-icons-round" style="font-size:12px;vertical-align:middle;margin-left:6px">favorite</span> ${likes}
            </div>
          </div>
          <div class="my-status-actions">
            <button class="icon-btn" id="edit-my-status" title="Edit">
              <span class="material-icons-round">edit</span>
            </button>
            <button class="icon-btn" id="del-my-status" title="Delete"
              style="color:var(--danger)">
              <span class="material-icons-round">delete</span>
            </button>
          </div>
        </div>`;
    } else {
      html += `
        <div class="my-status-card" id="add-my-status">
          <div class="add-status-ring">
            <span class="material-icons-round">add</span>
          </div>
          <div class="my-status-info">
            <div class="my-status-name">Add Status</div>
            <div class="my-status-sub">Share what's on your mind</div>
          </div>
        </div>`;
    }

    /* ── Others ── */
    if (latest.length) {
      html += `<div class="divider"></div>
               <div class="section-label">Recent Updates</div>`;
      latest.forEach(s => {
        const d       = s.data;
        const initial = (d.display_name || '?')[0].toUpperCase();
        const views   = (d.views || []).length;
        html += `
          <div class="status-item" data-sid="${s.id}">
            <div class="status-item-ring">
              <div class="status-item-av">
                ${d.avatar_url
                  ? `<img src="${d.avatar_url}" style="width:100%;height:100%;object-fit:cover">`
                  : `<span>${initial}</span>`}
              </div>
            </div>
            <div class="status-item-info">
              <div class="status-item-name">${_esc(d.display_name || 'User')}</div>
              <div class="status-item-time">
                ${App.timeAgo(d.created_at || s.created_at)}
                · <span class="material-icons-round" style="font-size:11px;vertical-align:middle">visibility</span> ${views}
              </div>
            </div>
          </div>`;
      });
    }

    if (!latest.length && !_myStatus) {
      html += `
        <div class="empty-state">
          <span class="material-icons-round">radio_button_unchecked</span>
          <h3>No updates yet</h3>
          <p>Be the first to share a status!</p>
        </div>`;
    }

    scroll.innerHTML = html;

    /* Bind */
    document.getElementById('add-my-status')?.addEventListener('click', () => _showSheet(false));
    document.getElementById('view-my-status')?.addEventListener('click', () => _viewStatuses([_myStatus]));
    document.getElementById('edit-my-status')?.addEventListener('click', e => {
      e.stopPropagation(); _showSheet(true);
    });
    document.getElementById('del-my-status')?.addEventListener('click', e => {
      e.stopPropagation(); _deleteMyStatus();
    });

    scroll.querySelectorAll('.status-item').forEach(el => {
      el.onclick = () => {
        const sid = el.dataset.sid;
        const rec = latest.find(s => s.id === sid);
        if (rec) _viewStatuses([rec]);
      };
    });
  };

  /* ─── STATUS VIEWER ───────────────────────────────────────── */
  const _viewStatuses = (list) => {
    if (!list.length) return;
    let idx = 0;

    const open = () => {
      clearTimeout(_autoTimer);
      const rec = list[idx];
      const d   = rec.data;
      const isImg = d.type === 'image';
      const bg    = isImg ? '#000' : (d.bg_color || '#0095f6');

      document.getElementById('sv-root')?.remove();

      // Record view
      Server.viewStatus(rec.id, Server.currentUser?.id).catch(() => {});

      const el = document.createElement('div');
      el.id        = 'sv-root';
      el.className = 'status-viewer';

      const bars = list.map((_, i) => `
        <div class="status-progress-bar">
          <div class="status-progress-fill ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>
        </div>`).join('');

      const myId   = Server.currentUser?.id;
      const likes  = d.likes || [];
      const liked  = likes.includes(myId);
      const likeCount = likes.length;

      el.innerHTML = `
        <div class="status-viewer-header">
          <div style="width:100%">
            <div class="status-progress-bars">${bars}</div>
            <div style="display:flex;align-items:center;gap:10px">
              ${App.avatar(d.avatar_url, d.display_name, 'av-sm')}
              <div class="status-viewer-info">
                <div class="status-viewer-name">${_esc(d.display_name || 'User')}</div>
                <div class="status-viewer-time">
                  ${App.timeAgo(d.created_at || rec.created_at)} ·
                  <span class="material-icons-round" style="font-size:12px">visibility</span>
                  ${(d.views || []).length}
                </div>
              </div>
              <button class="status-close-btn" id="sv-close">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
        </div>

        <div class="status-content-wrap" style="background:${bg}">
          ${isImg
            ? `<img class="status-img-content" src="${d.content}" alt="Status">`
            : `<div class="status-text-content" style="background:rgba(0,0,0,0.3)">${_esc(d.content)}</div>`}
          <div class="status-nav-prev" id="sv-prev"></div>
          <div class="status-nav-next" id="sv-next"></div>
        </div>

        <div style="position:absolute;bottom:env(safe-area-inset-bottom,0px);left:0;right:0;
          padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:20px;
          background:linear-gradient(to top,rgba(0,0,0,0.5),transparent)">
          <button id="sv-like"
            style="display:flex;align-items:center;gap:6px;color:${liked ? 'var(--danger)' : '#fff'};
            font-size:14px;font-weight:700;font-family:var(--font)">
            <span class="material-icons-round" style="font-size:22px">${liked ? 'favorite' : 'favorite_border'}</span>
            <span id="sv-like-count">${likeCount}</span>
          </button>
        </div>`;

      document.body.appendChild(el);

      const close = () => { clearTimeout(_autoTimer); el.remove(); };
      const next  = () => { clearTimeout(_autoTimer); if (idx < list.length - 1) { idx++; open(); } else close(); };
      const prev  = () => { clearTimeout(_autoTimer); if (idx > 0) { idx--; open(); } };

      document.getElementById('sv-close').onclick = close;
      document.getElementById('sv-next').onclick  = next;
      document.getElementById('sv-prev').onclick  = prev;

      // Like button
      document.getElementById('sv-like').onclick = async (e) => {
        e.stopPropagation();
        const res = await Server.likeStatus(rec.id, myId);
        if (!res) return;
        const btn = document.getElementById('sv-like');
        const icon = btn?.querySelector('.material-icons-round');
        if (icon) icon.textContent = res.liked ? 'favorite' : 'favorite_border';
        btn.style.color = res.liked ? 'var(--danger)' : '#fff';
        const cnt = document.getElementById('sv-like-count');
        if (cnt) cnt.textContent = res.count;
      };

      // Swipe
      let tx = 0;
      el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
      });

      // Auto-advance 5 s
      _autoTimer = setTimeout(next, 5000);
    };

    open();
  };

  /* ─── CREATE / EDIT SHEET ─────────────────────────────────── */
  const _showSheet = (isEdit) => {
    const existing = isEdit && _myStatus ? _myStatus.data : null;
    let selType    = existing?.type || 'text';
    let selColor   = existing?.bg_color || STATUS_BG[0];
    let imgFile    = null;

    const colorDots = STATUS_BG.map(c =>
      `<div class="status-bg-dot ${c === selColor ? 'sel' : ''}"
        data-color="${c}" style="background:${c}"></div>`
    ).join('');

    const close = App.showModal(`
      <div class="create-status-wrap">
        <h3>${isEdit ? 'Edit Status' : 'New Status'}</h3>

        <div class="status-type-tabs">
          <button class="status-type-tab ${selType === 'text'  ? 'active' : ''}" data-type="text">
            <span class="material-icons-round" style="font-size:16px">text_fields</span> Text
          </button>
          <button class="status-type-tab ${selType === 'image' ? 'active' : ''}" data-type="image">
            <span class="material-icons-round" style="font-size:16px">image</span> Photo
          </button>
        </div>

        <div id="cs-text-area" style="display:${selType === 'text' ? 'block' : 'none'}">
          <textarea class="status-text-input" id="cs-text"
            placeholder="What's on your mind?…">${existing?.type === 'text' ? existing.content : ''}</textarea>
          <div class="status-bg-colors" id="cs-colors">${colorDots}</div>
        </div>

        <div id="cs-img-area" style="display:${selType === 'image' ? 'block' : 'none'}">
          <img id="cs-img-preview" class="status-img-preview"
            ${existing?.type === 'image' ? `src="${existing.content}" style="display:block"` : ''}>
          <label class="btn-ghost" style="display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer;margin-bottom:14px">
            <span class="material-icons-round">photo_library</span> Choose Photo
            <input type="file" accept="image/*" id="cs-img-input" style="display:none">
          </label>
        </div>

        <button class="status-submit-btn" id="cs-submit">
          ${isEdit ? 'Update Status' : 'Share Status'}
        </button>
      </div>
    `);

    document.querySelectorAll('.status-type-tab').forEach(tab => {
      tab.onclick = () => {
        selType = tab.dataset.type;
        document.querySelectorAll('.status-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('cs-text-area').style.display = selType === 'text'  ? 'block' : 'none';
        document.getElementById('cs-img-area').style.display  = selType === 'image' ? 'block' : 'none';
      };
    });

    document.querySelectorAll('.status-bg-dot').forEach(dot => {
      dot.onclick = () => {
        selColor = dot.dataset.color;
        document.querySelectorAll('.status-bg-dot').forEach(d => d.classList.remove('sel'));
        dot.classList.add('sel');
      };
    });

    document.getElementById('cs-img-input')?.addEventListener('change', (e) => {
      imgFile = e.target.files[0];
      if (!imgFile) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const p = document.getElementById('cs-img-preview');
        p.src = ev.target.result; p.style.display = 'block';
      };
      reader.readAsDataURL(imgFile);
    });

    document.getElementById('cs-submit').onclick = async () => {
      const me        = Server.currentUser;
      const myProfile = Server.currentProfile;
      const expires   = new Date(Date.now() + 24*60*60*1000).toISOString();
      const now       = new Date().toISOString();

      const base = {
        user_id:      me.id,
        display_name: myProfile?.data.display_name || me.display_name,
        username:     myProfile?.data.username     || '',
        avatar_url:   myProfile?.data.avatar_url   || '',
        views:        [], view_count: 0,
        likes:        [], like_count: 0,
        expires_at:   expires,
        created_at:   now
      };

      if (selType === 'text') {
        const text = document.getElementById('cs-text').value.trim();
        if (!text) { App.showToast('Enter some text first', 'error'); return; }
        try {
          if (isEdit && _myStatus) await Server.deleteStatus(_myStatus.id);
          await Server.createStatus({ ...base, type: 'text', content: text, bg_color: selColor });
          close();
          App.showToast('Status shared!', 'success');
          await _load();
        } catch { App.showToast('Failed', 'error'); }

      } else {
        const hasExistImg = isEdit && _myStatus?.data.type === 'image';
        if (!imgFile && !hasExistImg) { App.showToast('Choose a photo first', 'error'); return; }
        App.showToast('Uploading…');
        try {
          let url = hasExistImg ? _myStatus.data.content : '';
          if (imgFile) {
            const res = await Server.storage('spark_statuses_media').upload(imgFile);
            url = res?.data?.url;
            if (!url) throw new Error();
          }
          if (isEdit && _myStatus) await Server.deleteStatus(_myStatus.id);
          await Server.createStatus({ ...base, type: 'image', content: url, bg_color: '#000' });
          close();
          App.showToast('Status shared!', 'success');
          await _load();
        } catch { App.showToast('Upload failed', 'error'); }
      }
    };
  };

  /* ─── DELETE ──────────────────────────────────────────────── */
  const _deleteMyStatus = async () => {
    if (!_myStatus) return;
    try {
      await Server.deleteStatus(_myStatus.id);
      _myStatus = null;
      App.showToast('Status deleted');
      await _load();
    } catch { App.showToast('Failed to delete', 'error'); }
  };

  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return { render };
})();
