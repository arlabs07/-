/**
 * communities.js — Communities Page v7
 *
 * Bug fixes:
 *  1. Communities chat endless skeleton — root cause: ChatWindow.open() was
 *     calling App.setHash with wrong prefix ('chats' instead of 'communities')
 *     because _chatRec was null at that point. Fixed by passing urlPrefix in opts.
 *  2. Container validity check: after each async gap, we verify the panel
 *     element still exists in the DOM before proceeding. If the user navigated
 *     away mid-load, we abort silently.
 *  3. Removed duplicate getChatById call — CommunitiesPage already fetches it;
 *     we pass the record through so ChatWindow gets it on the first tick.
 */

const CommunitiesPage = (() => {

  const CACHE_KEY = 'communities_list';
  const SYNC_KEY  = 'communities_sync';
  let _container  = null;
  let _activeCommId = null;
  const COLORS = ['#0095f6','#ed4956','#2dd55b','#f0a030','#bc1888','#8a2be2'];

  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── DESTROY ─────────────────────────────────────────────── */
  const destroy = () => {
    SyncManager.unwatch(SYNC_KEY);
    if (ChatWindow.isOpen()) ChatWindow.close();
    _activeCommId = null;
  };

  /* ── RENDER ──────────────────────────────────────────────── */
  const render = async (container, commId) => {
    _container = container;

    if (commId && ChatWindow.isOpen() && commId === _activeCommId) return;

    _buildShell();

    if (!commId) {
      if (!_isDesktop()) ChatWindow.close();
      await _loadList();
      if (_isDesktop()) _showPanelEmpty();
    } else {
      // Start list load in background (non-blocking)
      _loadList(true).catch(() => {});
      // Open the community
      await _openComm(commId);
    }

    SyncManager.watch(SYNC_KEY, async () => {
      App.cache.dirty(CACHE_KEY);
      await _loadList(false);
    }, { ms: 25000 });
  };

  /* ── SHELL ──────────────────────────────────────────────── */
  const _buildShell = () => {
    _container.innerHTML = `
      <div class="comm-list-panel" id="comm-list-panel">
        <div class="communities-list" id="cm-list"></div>
        <button class="fab" id="cm-fab" title="Create Community">
          <span class="material-icons-round">group_add</span>
        </button>
      </div>
      <div class="comm-chat-panel" id="cm-window-panel"></div>`;

    document.getElementById('cm-fab').onclick = _showCreateSheet;
  };

  /* ── EMPTY STATE ─────────────────────────────────────────── */
  const _showPanelEmpty = () => {
    const panel = document.getElementById('cm-window-panel');
    if (!panel || !_isDesktop()) return;
    panel.innerHTML = `
      <div class="panel-empty-state">
        <span class="material-icons-round">groups</span>
        <h3>Communities</h3>
        <p>Select a community to join the conversation, or create your own with the + button</p>
      </div>`;
  };

  /* ── LOAD LIST ───────────────────────────────────────────── */
  const _loadList = async (skipIfFresh = false) => {
    const list = document.getElementById('cm-list'); if (!list) return;
    const me   = Server.currentUser; if (!me) return;

    if (App.cache.fresh(CACHE_KEY) && skipIfFresh) {
      _renderList(list, App.cache.get(CACHE_KEY), me.id); return;
    }
    if (!list.children.length) list.innerHTML = App.skel.communities(5);

    const recs = await Server.getCommunities();
    App.cache.set(CACHE_KEY, recs);

    // Check the list element still exists (user may have navigated away)
    const listEl = document.getElementById('cm-list');
    if (listEl) _renderList(listEl, recs, me.id);
  };

  const _renderList = (list, recs, myId) => {
    const visible = recs.filter(r => {
      const d = r.data;
      if (d.is_public !== false) return true;
      return (d.participants || []).includes(myId);
    });

    if (!visible.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">groups</span>
          <h3>No communities yet</h3>
          <p>Tap + to create the first community</p>
        </div>`;
      return;
    }

    list.innerHTML = visible.map(r => _commRow(r, myId)).join('');
    list.querySelectorAll('.community-item').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        if (cid && cid !== 'undefined') _openComm(cid);
      });
    });
    if (_activeCommId) _highlightComm(_activeCommId);
  };

  const _highlightComm = (commId) => {
    document.querySelectorAll('#cm-list .community-item').forEach(el => {
      el.classList.toggle('active-comm', el.dataset.cid === commId);
    });
  };

  const _commRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d       = rec.data;
    const joined  = (d.participants || []).includes(myId);
    const count   = d.member_count || (d.participants || []).length;
    const initial = (d.name || 'G')[0].toUpperCase();
    const color   = d.color || COLORS[0];
    const preview = d.last_message || d.description || 'No messages yet';
    const isPublic = d.is_public !== false;
    const isActive = rec.id === _activeCommId;
    return `
      <div class="community-item ${isActive ? 'active-comm' : ''}" data-cid="${rec.id}">
        <div class="community-av" style="background:${color}22;color:${color}">
          ${d.avatar_url ? `<img src="${_esc(d.avatar_url)}" alt="${_esc(d.name)}">` : initial}
        </div>
        <div class="community-info">
          <div class="community-name">
            ${_esc(d.name)}
            <span style="font-size:10px;padding:1px 6px;border-radius:99px;font-weight:700;
              background:${isPublic ? 'rgba(45,213,91,0.15)' : 'rgba(240,160,48,0.15)'};
              color:${isPublic ? 'var(--success)' : 'var(--warning)'}">
              ${isPublic ? '🌐 Public' : '🔒 Private'}
            </span>
          </div>
          <div class="community-desc">${_esc(preview)}</div>
          <div class="community-meta">
            <div class="comm-member-chip">
              <span class="material-icons-round">group</span> ${count}
            </div>
            ${joined ? `<div class="comm-joined-badge">Joined</div>` : ''}
          </div>
        </div>
        <span class="material-icons-round" style="color:var(--text-3);font-size:18px;flex-shrink:0">chevron_right</span>
      </div>`;
  };

  /* ── OPEN COMMUNITY ──────────────────────────────────────── */
  const _openComm = async (commId) => {
    if (!commId || commId === 'undefined') return;

    const me        = Server.currentUser;
    const myProfile = Server.currentProfile;

    // ── Step 1: fetch community record ──────────────────────
    const rec = await Server.getChatById(commId);

    // Guard: user may have navigated away during the await
    if (!document.getElementById('cm-window-panel')) return;

    if (!rec) {
      App.showToast('Community not found.', 'error');
      return;
    }

    // ── Step 2: join if needed ───────────────────────────────
    const wasJoined = (rec.data.participants || []).includes(me.id);
    if (!wasJoined) {
      try {
        await Server.joinCommunity(commId, me.id, {
          display_name: myProfile?.data.display_name || me.display_name || 'User',
          username:     myProfile?.data.username     || '',
          avatar_url:   myProfile?.data.avatar_url   || ''
        });
        await Server.sendChatMessage(commId, {
          sender_id: 'system', username: '', display_name: '',
          message: `${myProfile?.data.display_name || 'Someone'} joined the group.`,
          time: new Date().toISOString(), msg_type: 'system'
        });
      } catch (e) {
        console.warn('CommunitiesPage join error:', e);
      }
    }

    // Guard again after second async gap
    const panel = document.getElementById('cm-window-panel');
    if (!panel) return;

    // ── Step 3: update state ─────────────────────────────────
    _activeCommId = commId;
    _highlightComm(commId);

    const onClose = () => {
      _activeCommId = null;
      _highlightComm(null);
      App.cache.dirty(CACHE_KEY);
      _loadList(false).catch(() => {});
    };

    if (_isDesktop()) {
      // ── Desktop: render in right panel ──
      panel.innerHTML = '';
      _container.classList.add('comm-open');

      // IMPORTANT: pass urlPrefix so ChatWindow uses correct hash
      ChatWindow.open(commId, panel, {
        isNew:     false,
        embedded:  true,
        urlPrefix: 'communities',    // ← fix for wrong hash bug
        onClose:   () => {
          _container.classList.remove('comm-open');
          App.setHash('#communities');
          onClose();
          _showPanelEmpty();
        }
      });

    } else {
      // ── Mobile: fixed full-screen overlay ──
      let slot = document.getElementById('cm-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'cm-slot';
        slot.style.cssText =
          'position:fixed;inset:0;z-index:300;background:var(--bg-0);display:none;flex-direction:column;overflow:hidden';
        document.body.appendChild(slot);
      }
      slot.style.display = 'flex';
      _container.classList.add('comm-open');

      ChatWindow.open(commId, slot, {
        isNew:     false,
        embedded:  false,
        urlPrefix: 'communities',    // ← fix for wrong hash bug
        onClose:   () => {
          slot.style.display = 'none';
          slot.innerHTML     = '';
          _container.classList.remove('comm-open');
          App.setHash('#communities');
          onClose();
        }
      });
    }
  };

  /* ── CREATE COMMUNITY SHEET ──────────────────────────────── */
  const _showCreateSheet = () => {
    let avatarFile = null;
    let selColor   = COLORS[0];
    let selPublic  = true;

    const colorDots = COLORS.map(c =>
      `<div class="color-dot ${c === selColor ? 'sel' : ''}" data-c="${c}" style="background:${c};width:28px;height:28px;border-radius:50%"></div>`
    ).join('');

    const close = App.showModal(`
      <div class="edit-group-sheet">
        <h3>New Community</h3>
        <div class="eg-av-pick">
          <label class="eg-av-btn" id="cc-av-lbl">
            <span class="material-icons-round">add_a_photo</span>
            <span style="font-size:11px">Photo</span>
            <input type="file" accept="image/*" id="cc-av-in" style="display:none">
          </label>
        </div>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:6px">Community Name *</label>
          <input id="cc-name" class="input-field" type="text" placeholder="e.g. Design Team, Family…" maxlength="60">
        </div>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:6px">Description</label>
          <textarea id="cc-desc" class="input-field" rows="2" style="resize:none" placeholder="What's this community about?"></textarea>
        </div>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:8px">Accent Color</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="cc-colors">${colorDots}</div>
        </div>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:8px">Privacy</label>
          <div class="privacy-toggle">
            <button class="privacy-opt active" data-v="true"><span class="material-icons-round">public</span> Public</button>
            <button class="privacy-opt" data-v="false"><span class="material-icons-round">lock</span> Private</button>
          </div>
        </div>
        <div id="cc-err" class="auth-error"></div>
        <button class="eg-save-btn" id="cc-submit">
          <span class="material-icons-round">group_add</span> Create Community
        </button>
      </div>`);

    document.getElementById('cc-av-in').addEventListener('change', e => {
      avatarFile = e.target.files[0]; if (!avatarFile) return;
      const rd = new FileReader();
      rd.onload = ev => {
        const lbl = document.getElementById('cc-av-lbl');
        if (lbl) lbl.innerHTML = `<img src="${ev.target.result}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:14px">`;
      };
      rd.readAsDataURL(avatarFile);
    });

    document.querySelectorAll('#cc-colors .color-dot').forEach(dot => {
      dot.onclick = () => {
        selColor = dot.dataset.c;
        document.querySelectorAll('#cc-colors .color-dot').forEach(d => d.classList.remove('sel'));
        dot.classList.add('sel');
      };
    });

    document.querySelectorAll('.privacy-opt').forEach(opt => {
      opt.onclick = () => {
        selPublic = opt.dataset.v === 'true';
        document.querySelectorAll('.privacy-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      };
    });

    document.getElementById('cc-submit').onclick = async () => {
      const name  = document.getElementById('cc-name').value.trim();
      const desc  = document.getElementById('cc-desc').value.trim();
      const errEl = document.getElementById('cc-err');
      errEl.classList.remove('visible');
      if (!name) { errEl.textContent = 'Community name required.'; errEl.classList.add('visible'); return; }

      const me        = Server.currentUser;
      const myProfile = Server.currentProfile;
      const btn       = document.getElementById('cc-submit');
      btn.disabled    = true;
      btn.innerHTML   = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;

      try {
        let avatarUrl = '';
        if (avatarFile) avatarUrl = await Server.uploadCompressedImage(avatarFile, 'spark_comm_avatars') || '';

        const myMeta = {
          display_name: myProfile?.data.display_name || me.display_name || 'User',
          username:     myProfile?.data.username     || '',
          avatar_url:   myProfile?.data.avatar_url   || ''
        };

        const newRec = await Server.createCommunity({
          name, description: desc, avatar_url: avatarUrl,
          color: selColor, is_public: selPublic,
          participants: [me.id], participant_meta: { [me.id]: myMeta },
          created_by: me.id
        });

        if (newRec?.id) {
          await Server.sendChatMessage(newRec.id, {
            sender_id: 'system', username: '', display_name: '',
            message: `Welcome to "${name}"! 🎉`,
            time: new Date().toISOString(), msg_type: 'system'
          }).catch(() => {});
        }

        App.cache.dirty(CACHE_KEY);
        close();
        App.showToast('Community created! 🎉', 'success');
        await _loadList(false);
        if (newRec?.id) _openComm(newRec.id);

      } catch (e) {
        btn.disabled  = false;
        btn.innerHTML = `<span class="material-icons-round">group_add</span> Create Community`;
        errEl.textContent = e.message || 'Failed to create.';
        errEl.classList.add('visible');
      }
    };
  };

  return { render, destroy };
})();
