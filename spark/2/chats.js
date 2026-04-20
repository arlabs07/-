/**
 * chats.js — Chats Page v7
 *
 * Changes:
 *  • Desktop dual-panel: chat opens in .chat-window-panel (right side) instead
 *    of a fixed full-screen overlay. On mobile, keeps the existing overlay.
 *  • Active thread is highlighted in the list.
 *  • Empty state shown in right panel when no chat is selected (desktop).
 *  • People tab, search, thread list — unchanged and improved.
 */

const ChatsPage = (() => {

  const CACHE_THREADS  = 'chats_threads';
  const CACHE_PEOPLE   = 'chats_people';
  const SYNC_KEY       = 'chats_sync';

  let _container  = null;
  let _srTimer    = null;
  let _activeTab  = 'chats';
  let _activeChatId = null;   // tracks which thread is highlighted

  /* ── Helpers ──────────────────────────────────────────────── */
  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
  const _esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── DESTROY ──────────────────────────────────────────────── */
  const destroy = () => {
    SyncManager.unwatch(SYNC_KEY);
    if (ChatWindow.isOpen()) ChatWindow.close();
    _activeChatId = null;
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  const render = async (container, chatId) => {
    _container = container;

    if (chatId && ChatWindow.isOpen() && chatId === _activeChatId) return;

    if (!chatId) {
      if (!_isDesktop()) ChatWindow.close();
      _buildShell();
      await _loadTab(_activeTab);
      if (_isDesktop()) _showPanelEmpty();
    } else {
      _buildShell();
      _loadTab(_activeTab, true);
      _openChat(chatId, false);
    }

    SyncManager.watch(SYNC_KEY, async () => {
      App.cache.dirty(CACHE_THREADS);
      const list = document.getElementById('ch-content');
      if (list && _activeTab === 'chats') await _loadThreads(false);
    }, { ms: 20000 });
  };

  /* ── SHELL ────────────────────────────────────────────────── */
  const _buildShell = () => {
    _container.innerHTML = `
      <div class="chat-list-panel">
        <!-- Tab bar -->
        <div class="ch-tab-bar">
          <button class="ch-tab ${_activeTab==='chats'?'active':''}" data-tab="chats">
            <span class="material-icons-round">chat_bubble_outline</span> Chats
          </button>
          <button class="ch-tab ${_activeTab==='people'?'active':''}" data-tab="people">
            <span class="material-icons-round">people_outline</span> People
          </button>
        </div>

        <!-- Search bar -->
        <div class="chat-search-wrap">
          <div class="chat-search-inner">
            <span class="material-icons-round">search</span>
            <input id="ch-sr" class="chat-search-input" type="text"
              placeholder="Search by username..." autocomplete="off" inputmode="search">
            <span class="material-icons-round" id="ch-clear"
              style="display:none;cursor:pointer;color:var(--text-3)">close</span>
          </div>
        </div>

        <!-- Search results dropdown -->
        <div id="ch-dropdown"></div>

        <!-- Content area -->
        <div id="ch-content" style="flex:1;overflow-y:auto;position:relative"></div>
      </div>

      <!-- Right panel: chat window or empty state -->
      <div class="chat-window-panel" id="ch-window-panel">
        <!-- Filled by _openChat on desktop, or ChatWindow on mobile -->
      </div>`;

    /* Tab switching */
    _container.querySelectorAll('.ch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _activeTab = tab.dataset.tab;
        _container.querySelectorAll('.ch-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === _activeTab);
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

    clr.onclick = () => { inp.value = ''; clr.style.display = 'none'; drop.innerHTML = ''; inp.focus(); };
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      clr.style.display = q ? 'block' : 'none';
      clearTimeout(_srTimer);
      if (!q) { drop.innerHTML = ''; return; }
      _srTimer = setTimeout(() => _doSearch(q, inp, clr, drop), 350);
    });
  };

  /* ── DESKTOP: empty panel ─────────────────────────────────── */
  const _showPanelEmpty = () => {
    const panel = document.getElementById('ch-window-panel');
    if (!panel || !_isDesktop()) return;
    panel.innerHTML = `
      <div class="panel-empty-state">
        <span class="material-icons-round">chat_bubble_outline</span>
        <h3>Your Messages</h3>
        <p>Select a conversation from the list or search for someone to start chatting</p>
      </div>`;
  };

  /* ── LOAD TAB ─────────────────────────────────────────────── */
  const _loadTab = async (tab, skipIfFresh = false) => {
    if (tab === 'chats') await _loadThreads(skipIfFresh);
    else await _loadPeople(skipIfFresh);
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
    // Always show Aria at the top
    const ariaHtml = _ariaThreadRow();
    if (!chats.length) {
      list.innerHTML = ariaHtml + `
        <div class="empty-state" style="flex:1">
          <span class="material-icons-round">chat_bubble_outline</span>
          <h3>No chats yet</h3>
          <p>Search for a username above<br>or browse People to start a conversation</p>
        </div>`;
      document.getElementById('aria-thread-row')?.addEventListener('click', _openAria);
      return;
    }
    list.innerHTML = ariaHtml + chats.map(r => _threadRow(r, myId)).join('');
    document.getElementById('aria-thread-row')?.addEventListener('click', _openAria);
    list.querySelectorAll('.thread-item[data-cid]:not(#aria-thread-row)').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        if (cid && cid !== 'undefined') _openChat(cid, false);
      });
    });
    // Highlight active
    if (_activeChatId) _highlightThread(_activeChatId);
  };

  const _highlightThread = (chatId) => {
    document.querySelectorAll('#ch-content .thread-item').forEach(el => {
      el.classList.toggle('active-thread', el.dataset.cid === chatId);
    });
  };

  const _threadRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d       = rec.data; const pm = d.participant_meta || {};
    const otherId = (d.participants || []).find(id => id !== myId);
    if (!otherId) return '';
    const other   = pm[otherId] || { display_name: 'User', username: '?', avatar_url: '' };
    const time    = App.timeAgo(d.last_message_at || rec.created_at);
    const preview = d.last_message || 'Tap to start chatting';
    const isActive = rec.id === _activeChatId;
    return `
      <div class="thread-item ${isActive ? 'active-thread' : ''}" data-cid="${rec.id}">
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

  /* ── PEOPLE LIST ──────────────────────────────────────────── */
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
        <div class="thread-item people-row" data-uid="${d.user_id}">
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
          <button class="people-chat-btn" data-uid="${d.user_id}"
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
        const rec = profiles.find(r => r.data?.user_id === btn.dataset.uid);
        if (rec) await _startChatWith(rec);
      });
    });
    list.querySelectorAll('.people-row').forEach(row => {
      row.addEventListener('click', async () => {
        const rec = profiles.find(r => r.data?.user_id === row.dataset.uid);
        if (rec) await _startChatWith(rec);
      });
    });
  };

  /* ── OPEN CHAT ────────────────────────────────────────────── */
  const _openChat = (chatId, isNew) => {
    if (!chatId || chatId === 'undefined') return;
    _activeChatId = chatId;
    _highlightThread(chatId);

    if (_isDesktop()) {
      // Desktop: open in the right panel div
      const panel = document.getElementById('ch-window-panel');
      if (!panel) return;
      panel.innerHTML = '';
      _container.classList.add('chat-open');
      App.setHash(`#chats/${chatId}`);

      ChatWindow.open(chatId, panel, {
        isNew,
        onClose: () => {
          _activeChatId = null;
          _container.classList.remove('chat-open');
          _highlightThread(null);
          App.setHash('#chats');
          App.cache.dirty(CACHE_THREADS);
          _loadThreads(false);
          _showPanelEmpty();
        }
      });
    } else {
      // Mobile: fixed overlay (existing behaviour)
      let slot = document.getElementById('ch-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'ch-slot';
        slot.style.cssText =
          'position:fixed;inset:0;z-index:300;background:var(--bg-0);display:none;flex-direction:column;overflow:hidden';
        document.body.appendChild(slot);
      }
      slot.style.display = 'flex';
      _container.classList.add('chat-open');
      App.setHash(`#chats/${chatId}`);
      App.hideChrome();

      ChatWindow.open(chatId, slot, {
        isNew,
        onClose: () => {
          slot.style.display = 'none';
          slot.innerHTML     = '';
          _activeChatId = null;
          _container.classList.remove('chat-open');
          App.showChrome();
          App.setHash('#chats');
          App.cache.dirty(CACHE_THREADS);
          _loadThreads(false);
        }
      });
    }
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
              <div class="search-result-uname">@${_esc(fd.username)}${fd.is_private
                ? ' <span class="material-icons-round" style="font-size:12px;vertical-align:middle;color:var(--warning)">lock</span>' : ''}</div>
            </div>
            <span class="material-icons-round" style="color:var(--accent);margin-left:auto">chevron_right</span>
          </div>
        </div>`;
      document.getElementById('sr-hit').addEventListener('click', async () => {
        drop.innerHTML = ''; inp.value = ''; clr.style.display = 'none';
        await _startChatWith(found);
      });
    } catch {
      drop.innerHTML = `<div class="search-results"><div class="search-no-result">Error searching. Try again.</div></div>`;
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

  /* ── ARIA BOT THREAD ─────────────────────────────────────── */
  const _ariaThreadRow = () => {
    try { AriaBot._loadHistory(); } catch {}
    const hist = (typeof AriaBot !== 'undefined' && AriaBot.history) ? AriaBot.history : [];
    const last  = hist.length ? hist[hist.length-1] : null;
    const preview = last
      ? (last.role === 'user' ? 'You: ' + last.text : last.text).replace(/\*\*|\*/g,'').slice(0,55)
      : 'Your AI assistant — ask anything!';
    const isActive = _activeChatId === '__aria_ai__';
    return `
      <div class="thread-item ${isActive ? 'active-thread' : ''}" id="aria-thread-row" data-cid="__aria_ai__">
        <div style="width:46px;height:46px;border-radius:50%;flex-shrink:0;
          background:linear-gradient(135deg,#0095f6,#bc1888);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;color:#fff">✦</div>
        <div class="thread-info">
          <div class="thread-top">
            <span class="thread-name">Aria <span style="font-size:10px;padding:1px 6px;border-radius:99px;font-weight:700;background:var(--accent-dim);color:var(--accent)">AI</span></span>
            <span class="thread-time">Always on</span>
          </div>
          <div class="thread-preview">${_esc(preview)}</div>
        </div>
      </div>`;
  };

  const _openAria = () => {
    _activeChatId = '__aria_ai__';
    _highlightThread('__aria_ai__');
    if (_isDesktop()) {
      const panel = document.getElementById('ch-window-panel');
      if (!panel) return;
      panel.innerHTML = '';
      _container.classList.add('chat-open');
      App.setHash('#chats/__aria_ai__');
      if (typeof AriaBot !== 'undefined') {
        AriaBot.open(panel, {
          embedded: true,
          onClose: () => {
            _activeChatId = null; _container.classList.remove('chat-open');
            _highlightThread(null); App.setHash('#chats');
            _showPanelEmpty(); _loadThreads(false);
          }
        });
      }
    } else {
      let slot = document.getElementById('ch-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'ch-slot';
        slot.style.cssText = 'position:fixed;inset:0;z-index:300;background:var(--bg-0);display:none;flex-direction:column;overflow:hidden';
        document.body.appendChild(slot);
      }
      slot.style.display = 'flex';
      _container.classList.add('chat-open');
      App.setHash('#chats/__aria_ai__');
      App.hideChrome();
      if (typeof AriaBot !== 'undefined') {
        AriaBot.open(slot, {
          embedded: false,
          onClose: () => {
            slot.style.display = 'none'; slot.innerHTML = '';
            _activeChatId = null; _container.classList.remove('chat-open');
            App.showChrome(); App.setHash('#chats');
            _loadThreads(false);
          }
        });
      }
    }
  };

  return { render, destroy };
})();
