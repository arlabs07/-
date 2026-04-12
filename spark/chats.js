/**
 * chats.js — Chats Page v5
 * + Skeleton loading (App.skel.threads)
 * + Smart cache: no reload on back-nav unless dirty
 * + Profile discovery (public profiles shown on search)
 */

const ChatsPage = (() => {

  const CACHE_KEY = 'chats_threads';
  let _container  = null;
  let _srTimer    = null;

  /* ─── DESTROY ─────────────────────────────────────────────── */
  const destroy = () => {
    if (ChatWindow.isOpen()) ChatWindow.close();
  };

  /* ─── RENDER ──────────────────────────────────────────────── */
  const render = async (container, chatId) => {
    _container = container;

    if (chatId && ChatWindow.isOpen()) return;

    if (!chatId) {
      ChatWindow.close();
      _buildList();
      await _loadList();
    } else {
      _buildList();
      // Load list silently in background if cache fresh, else show skeletons
      if (App.cache.stale(CACHE_KEY)) {
        await _loadList(false);
      } else {
        _loadList(true);  // non-blocking from cache
      }
      _openChat(chatId, false);
    }
  };

  /* ─── BUILD LIST VIEW ─────────────────────────────────────── */
  const _buildList = () => {
    _container.innerHTML = `
      <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
        <div class="chat-search-wrap">
          <div class="chat-search-inner">
            <span class="material-icons-round">search</span>
            <input id="ch-sr" class="chat-search-input" type="text"
              placeholder="Search username to start a chat…"
              autocomplete="off" inputmode="search">
            <span class="material-icons-round" id="ch-clear"
              style="display:none;cursor:pointer;color:var(--text-3)">close</span>
          </div>
        </div>
        <div id="ch-dropdown"></div>
        <div class="thread-list" id="ch-list" style="flex:1;overflow-y:auto"></div>
      </div>`;

    const inp  = document.getElementById('ch-sr');
    const clr  = document.getElementById('ch-clear');
    const drop = document.getElementById('ch-dropdown');

    clr.onclick = () => { inp.value = ''; clr.style.display = 'none'; drop.innerHTML = ''; inp.focus(); };
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      clr.style.display = q ? 'block' : 'none';
      clearTimeout(_srTimer);
      if (!q) { drop.innerHTML = ''; return; }
      _srTimer = setTimeout(() => _doSearch(q, inp, clr, drop), 350);
    });
  };

  /* ─── LOAD LIST ───────────────────────────────────────────── */
  const _loadList = async (skipIfFresh = false) => {
    const list = document.getElementById('ch-list'); if (!list) return;
    const me = Server.currentUser; if (!me) return;

    // If cache is fresh and caller wants to skip → render from cache immediately
    if (App.cache.fresh(CACHE_KEY) && skipIfFresh) {
      _renderList(list, App.cache.get(CACHE_KEY), me.id);
      return;
    }

    // Show skeleton only if list is currently empty (first load)
    if (!list.children.length || list.innerHTML.trim() === '') {
      list.innerHTML = App.skel.threads(6);
    }

    const chats = await Server.getDirectChats(me.id);
    App.cache.set(CACHE_KEY, chats);
    _renderList(list, chats, me.id);
  };

  const _renderList = (list, chats, myId) => {
    if (!chats.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">chat_bubble_outline</span>
          <h3>No chats yet</h3>
          <p>Search for a username above<br>to start a conversation</p>
        </div>`;
      return;
    }
    list.innerHTML = chats.map(r => _threadRow(r, myId)).join('');
    list.querySelectorAll('.thread-item').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        if (cid && cid !== 'undefined') _openChat(cid, false);
      });
    });
  };

  const _threadRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d       = rec.data;
    const pm      = d.participant_meta || {};
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

  /* ─── OPEN CHAT ───────────────────────────────────────────── */
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
        App.cache.dirty(CACHE_KEY);  // mark dirty so next open refreshes
        _loadList(false);            // refresh list
      }
    });
  };

  /* ─── SEARCH ──────────────────────────────────────────────── */
  const _doSearch = async (q, inp, clr, drop) => {
    drop.innerHTML = `
      <div class="search-results">
        <div class="search-result-item">
          <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
          <span style="font-size:13px;color:var(--text-3)">Searching…</span>
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

      // Check if profile is private
      if (fd.is_private) {
        // Only show basic info, user still can message
      }

      drop.innerHTML = `
        <div class="search-results">
          <div class="search-result-item" id="sr-hit">
            ${App.avatar(fd.avatar_url, fd.display_name, 'av-md')}
            <div>
              <div class="search-result-name">${_esc(fd.display_name)}</div>
              <div class="search-result-uname">@${_esc(fd.username)}${fd.is_private ? ' 🔒' : ''}</div>
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

  /* ─── START CHAT WITH ─────────────────────────────────────── */
  const _startChatWith = async (otherRec) => {
    const me        = Server.currentUser;
    const myProfile = Server.currentProfile;
    if (!me || !myProfile) return;

    const list = document.getElementById('ch-list');
    if (list) list.innerHTML = App.skel.threads(3);

    let chatRec = await Server.findDirectChat(me.id, otherRec.data.user_id);
    let isNew   = false;

    if (!chatRec) {
      isNew   = true;
      chatRec = await Server.createDirectChat(
        { user_id: me.id, display_name: myProfile.data.display_name, username: myProfile.data.username, avatar_url: myProfile.data.avatar_url || '' },
        { user_id: otherRec.data.user_id, display_name: otherRec.data.display_name, username: otherRec.data.username, avatar_url: otherRec.data.avatar_url || '' }
      );
      App.cache.dirty(CACHE_KEY);
    }

    if (!chatRec?.id) {
      App.showToast('Could not open chat — please try again.', 'error');
      _loadList(false);
      return;
    }

    await _loadList(true);
    _openChat(chatRec.id, isNew);
  };

  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return { render, destroy };
})();
