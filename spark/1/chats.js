/**
 * chats.js — Chats Page v6
 *
 * Changes:
 *  • Public profiles shown in a "People" tab — one-tap to start a chat
 *  • Private profiles: still reachable via exact-username search bar
 *  • SyncManager handles background thread-list refresh
 *  • Smart cache: no reload on back-nav unless dirty
 */

const ChatsPage = (() => {

  const CACHE_THREADS  = 'chats_threads';
  const CACHE_PEOPLE   = 'chats_people';
  const SYNC_KEY       = 'chats_sync';

  let _container  = null;
  let _srTimer    = null;
  let _activeTab  = 'chats';   // 'chats' | 'people'

  /* ── DESTROY ──────────────────────────────────────────────── */
  const destroy = () => {
    SyncManager.unwatch(SYNC_KEY);
    if (ChatWindow.isOpen()) ChatWindow.close();
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  const render = async (container, chatId) => {
    _container = container;

    if (chatId && ChatWindow.isOpen()) return;

    if (!chatId) {
      ChatWindow.close();
      _buildShell();
      await _loadTab(_activeTab);
    } else {
      _buildShell();
      _loadTab(_activeTab, true);   // non-blocking from cache
      _openChat(chatId, false);
    }

    // Register background sync (only re-fetches when cache is stale)
    SyncManager.watch(SYNC_KEY, async () => {
      App.cache.dirty(CACHE_THREADS);
      const list = document.getElementById('ch-list');
      if (list && _activeTab === 'chats') await _loadThreads(false);
    }, 20000);
  };

  /* ── SHELL (tabs + search) ────────────────────────────────── */
  const _buildShell = () => {
    _container.innerHTML = `
      <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">

        <!-- Tab bar -->
        <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
          <button class="ch-tab active" data-tab="chats"
            style="flex:1;padding:12px 0;font-size:13px;font-weight:700;
              color:var(--accent);border-bottom:2px solid var(--accent);
              background:none;font-family:var(--font);">
            <span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px">chat_bubble_outline</span>
            Chats
          </button>
          <button class="ch-tab" data-tab="people"
            style="flex:1;padding:12px 0;font-size:13px;font-weight:700;
              color:var(--text-3);border-bottom:2px solid transparent;
              background:none;font-family:var(--font);">
            <span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px">people_outline</span>
            People
          </button>
        </div>

        <!-- Search bar (always visible) -->
        <div class="chat-search-wrap">
          <div class="chat-search-inner">
            <span class="material-icons-round">search</span>
            <input id="ch-sr" class="chat-search-input" type="text"
              placeholder="Search by username..."
              autocomplete="off" inputmode="search">
            <span class="material-icons-round" id="ch-clear"
              style="display:none;cursor:pointer;color:var(--text-3)">close</span>
          </div>
        </div>

        <!-- Search results dropdown -->
        <div id="ch-dropdown"></div>

        <!-- Content area -->
        <div id="ch-content" style="flex:1;overflow-y:auto"></div>

      </div>`;

    /* Tab switching */
    _container.querySelectorAll('.ch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _activeTab = tab.dataset.tab;
        _container.querySelectorAll('.ch-tab').forEach(t => {
          const active = t.dataset.tab === _activeTab;
          t.style.color        = active ? 'var(--accent)' : 'var(--text-3)';
          t.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
        });
        document.getElementById('ch-dropdown').innerHTML = '';
        document.getElementById('ch-sr').value = '';
        document.getElementById('ch-clear').style.display = 'none';
        _loadTab(_activeTab);
      });
    });

    /* Search */
    const inp  = document.getElementById('ch-sr');
    const clr  = document.getElementById('ch-clear');
    const drop = document.getElementById('ch-dropdown');

    clr.onclick = () => {
      inp.value = ''; clr.style.display = 'none'; drop.innerHTML = ''; inp.focus();
    };
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      clr.style.display = q ? 'block' : 'none';
      clearTimeout(_srTimer);
      if (!q) { drop.innerHTML = ''; return; }
      _srTimer = setTimeout(() => _doSearch(q, inp, clr, drop), 350);
    });
  };

  /* ── LOAD TAB ─────────────────────────────────────────────── */
  const _loadTab = async (tab, skipIfFresh = false) => {
    if (tab === 'chats') {
      await _loadThreads(skipIfFresh);
    } else {
      await _loadPeople(skipIfFresh);
    }
  };

  /* ── THREAD LIST ──────────────────────────────────────────── */
  const _loadThreads = async (skipIfFresh = false) => {
    const list = document.getElementById('ch-content'); if (!list) return;
    const me   = Server.currentUser; if (!me) return;

    if (App.cache.fresh(CACHE_THREADS) && skipIfFresh) {
      _renderThreads(list, App.cache.get(CACHE_THREADS), me.id); return;
    }

    if (!list.firstChild) list.innerHTML = App.skel.threads(6);

    const chats = await Server.getDirectChats(me.id);
    App.cache.set(CACHE_THREADS, chats);
    _renderThreads(list, chats, me.id);
  };

  const _renderThreads = (list, chats, myId) => {
    if (!chats.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">chat_bubble_outline</span>
          <h3>No chats yet</h3>
          <p>Search for a username above<br>or browse People to start a conversation</p>
        </div>`;
      return;
    }
    list.innerHTML = chats.map(r => _threadRow(r, myId)).join('');
    list.querySelectorAll('.thread-item').forEach(el =>
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        if (cid && cid !== 'undefined') _openChat(cid, false);
      })
    );
  };

  const _threadRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d       = rec.data; const pm = d.participant_meta || {};
    const otherId = (d.participants || []).find(id => id !== myId);
    if (!otherId) return '';
    const other   = pm[otherId] || { display_name: 'User', username: '?', avatar_url: '' };
    const time    = App.timeAgo(d.last_message_at || rec.created_at);
    const preview = d.last_message || 'Tap to start chatting';
    return `
      <div class="thread-item" data-cid="${rec.id}">
        ${App.avatar(other.avatar_url, other.display_name, 'av-md')}
        <div class="thread-info">
          <div class="thread-top">
            <span class="thread-name">${_esc(other.display_name)}</span>
            <span class="thread-time">${time}</span>
          </div>
          <div class="thread-preview">${_esc(preview)}</div>
        </div>
      </div>`;
  };

  /* ── PEOPLE LIST (public profiles) ───────────────────────── */
  const _loadPeople = async (skipIfFresh = false) => {
    const list = document.getElementById('ch-content'); if (!list) return;
    const me   = Server.currentUser; if (!me) return;

    if (App.cache.fresh(CACHE_PEOPLE) && skipIfFresh) {
      _renderPeople(list, App.cache.get(CACHE_PEOPLE), me.id); return;
    }

    list.innerHTML = App.skel.threads(6);

    const profiles = await Server.getPublicProfiles();
    App.cache.set(CACHE_PEOPLE, profiles);
    _renderPeople(list, profiles, me.id);
  };

  const _renderPeople = (list, profiles, myId) => {
    const others = profiles.filter(r => r.data?.user_id !== myId);

    if (!others.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">people_outline</span>
          <h3>No public profiles yet</h3>
          <p>Users with public profiles will appear here</p>
        </div>`;
      return;
    }

    list.innerHTML = others.map(r => {
      const d = r.data || {};
      return `
        <div class="thread-item people-row" data-uid="${d.user_id}" data-rid="${r.id}"
             style="position:relative">
          ${App.avatar(d.avatar_url, d.display_name, 'av-md')}
          <div class="thread-info">
            <div class="thread-top">
              <span class="thread-name">${_esc(d.display_name || 'User')}</span>
              <span style="font-size:10px;padding:2px 7px;border-radius:99px;font-weight:700;
                background:rgba(45,213,91,0.15);color:var(--success)">Public</span>
            </div>
            <div class="thread-preview" style="display:flex;align-items:center;gap:4px">
              <span class="material-icons-round" style="font-size:13px">alternate_email</span>
              ${_esc(d.username || '')}
              ${d.bio ? ` · ${_esc(d.bio.slice(0,30))}${d.bio.length>30?'...':''}` : ''}
            </div>
          </div>
          <!-- Plus button to start chat -->
          <button class="people-chat-btn" data-uid="${d.user_id}" title="Start chat"
            style="width:36px;height:36px;border-radius:50%;background:var(--accent);
              color:#fff;display:flex;align-items:center;justify-content:center;
              flex-shrink:0;border:none;cursor:pointer;transition:transform 0.15s">
            <span class="material-icons-round" style="font-size:18px">add</span>
          </button>
        </div>`;
    }).join('');

    list.querySelectorAll('.people-chat-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const uid = btn.dataset.uid;
        const rec = profiles.find(r => r.data?.user_id === uid);
        if (rec) await _startChatWith(rec);
      });
    });

    // Tapping the row also opens chat
    list.querySelectorAll('.people-row').forEach(row => {
      row.addEventListener('click', async () => {
        const uid = row.dataset.uid;
        const rec = profiles.find(r => r.data?.user_id === uid);
        if (rec) await _startChatWith(rec);
      });
    });
  };

  /* ── OPEN CHAT ────────────────────────────────────────────── */
  const _openChat = (chatId, isNew) => {
    if (!chatId || chatId === 'undefined') return;
    let slot = document.getElementById('ch-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'ch-slot';
      slot.style.cssText =
        'position:fixed;inset:0;z-index:300;background:var(--bg-0);display:none;flex-direction:column;overflow:hidden';
      document.body.appendChild(slot);
    }
    slot.style.display = 'flex';

    ChatWindow.open(chatId, slot, {
      isNew,
      onClose: () => {
        slot.style.display = 'none';
        slot.innerHTML     = '';
        App.setHash('#chats');
        App.cache.dirty(CACHE_THREADS);
        _loadThreads(false);
      }
    });
  };

  /* ── SEARCH ───────────────────────────────────────────────── */
  const _doSearch = async (q, inp, clr, drop) => {
    drop.innerHTML = `
      <div class="search-results">
        <div class="search-result-item">
          <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
          <span style="font-size:13px;color:var(--text-3)">Searching...</span>
        </div>
      </div>`;

    try {
      const found = await Server.getProfileByUsername(q);
      const me    = Server.currentUser;

      if (!found || found.data?.user_id === me?.id) {
        drop.innerHTML = `
          <div class="search-results">
            <div class="search-no-result">No user "<b>${_esc(q)}</b>" found.<br>
              <span style="font-size:11px">Username must be exact.</span>
            </div>
          </div>`;
        return;
      }

      const fd = found.data;
      drop.innerHTML = `
        <div class="search-results">
          <div class="search-result-item" id="sr-hit">
            ${App.avatar(fd.avatar_url, fd.display_name, 'av-md')}
            <div>
              <div class="search-result-name">${_esc(fd.display_name)}</div>
              <div class="search-result-uname">@${_esc(fd.username)}${fd.is_private ? ' <span class="material-icons-round" style="font-size:12px;vertical-align:middle;color:var(--warning)">lock</span>' : ''}</div>
            </div>
            <span class="material-icons-round" style="color:var(--accent);margin-left:auto">chevron_right</span>
          </div>
        </div>`;

      document.getElementById('sr-hit').addEventListener('click', async () => {
        drop.innerHTML = ''; inp.value = ''; clr.style.display = 'none';
        await _startChatWith(found);
      });
    } catch {
      drop.innerHTML = `
        <div class="search-results">
          <div class="search-no-result">Error searching. Try again.</div>
        </div>`;
    }
  };

  /* ── START CHAT WITH ──────────────────────────────────────── */
  const _startChatWith = async (otherRec) => {
    const me        = Server.currentUser;
    const myProfile = Server.currentProfile;
    if (!me || !myProfile) return;

    const list = document.getElementById('ch-content');
    if (list) list.innerHTML = App.skel.threads(3);

    let chatRec = await Server.findDirectChat(me.id, otherRec.data.user_id);
    let isNew   = false;

    if (!chatRec) {
      isNew   = true;
      chatRec = await Server.createDirectChat(
        { user_id: me.id, display_name: myProfile.data.display_name,
          username: myProfile.data.username, avatar_url: myProfile.data.avatar_url || '' },
        { user_id: otherRec.data.user_id, display_name: otherRec.data.display_name,
          username: otherRec.data.username, avatar_url: otherRec.data.avatar_url || '' }
      );
      App.cache.dirty(CACHE_THREADS);
    }

    if (!chatRec?.id) {
      App.showToast('Could not open chat — please try again.', 'error');
      _loadThreads(false); return;
    }

    await _loadThreads(true);
    _openChat(chatRec.id, isNew);
  };

  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return { render, destroy };
})();
