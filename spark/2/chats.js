/**
 * chats.js — Chats Page v9 (Fixed)
 * FIXES:
 *  - Bug 2: Long-press / swipe-to-delete on thread items, also in thread options menu
 *  - Bug 3: Header now shows "Chats" title (not Spark logo/bolt), replace icons with
 *    a single "+" button that opens a contact-picker overlay. The search bar is now
 *    global — searches users AND chats simultaneously.
 */

const ChatsPage = (() => {

  const CACHE_THREADS = 'chats_threads';
  const CACHE_PEOPLE  = 'chats_people';
  const SYNC_KEY      = 'chats_sync';

  let _container    = null;
  let _srTimer      = null;
  let _activeTab    = 'chats';
  let _activeChatId = null;

  const _isDesktop = () => window.matchMedia('(min-width:768px)').matches;
  const _esc = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── DESTROY ──────────────────────────────────────────── */
  const destroy = () => {
    SyncManager.unwatch(SYNC_KEY);
    if (ChatWindow.isOpen()) ChatWindow.close();
    _activeChatId = null;
  };

  /* ── RENDER ───────────────────────────────────────────── */
  const render = async (container, chatId, initialTab) => {
    _container = container;

    if (initialTab && initialTab !== _activeTab && !chatId) {
      _activeTab = initialTab;
    }

    // GUEST MODE
    if (App.isGuest()) {
      if (chatId) { _renderGuestChat(container, chatId); return; }
      const pending = sessionStorage.getItem('spark_pending_invite');
      if (pending) {
        const rec = await Server.resolveInviteToken(pending).catch(() => null);
        if (rec) {
          try {
            const me = Server.currentUser;
            let cr = await Server.findDirectChat(me.id, rec.data.user_id).catch(() => null);
            if (!cr) cr = await Server.createDirectChat(
              {user_id:me.id,display_name:me.display_name,username:'guest',avatar_url:''},
              {user_id:rec.data.user_id,display_name:rec.data.display_name,username:rec.data.username||'',avatar_url:rec.data.avatar_url||''}
            ).catch(() => null);
            if (cr?.id) {
              sessionStorage.removeItem('spark_pending_invite');
              App.setHash(`#chats/${cr.id}`);
              _renderGuestChat(container, cr.id);
              return;
            }
          } catch {}
        }
      }
      container.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:16px;padding:40px;text-align:center;background:var(--bg-primary)">
          <span class="material-icons-round" style="font-size:52px;color:var(--text-4)">chat_bubble_outline</span>
          <h3 style="font-size:20px;font-weight:700;color:var(--text-2)">No chat found</h3>
          <p style="font-size:14px;color:var(--text-3)">Your invite link may have expired.</p>
          <button onclick="App.goTo('#signup')" style="background:var(--accent);color:#fff;border:none;border-radius:var(--r-pill);padding:13px 28px;font-size:15px;font-weight:700;font-family:var(--font);cursor:pointer;box-shadow:0 4px 14px rgba(0,122,255,0.35)">Create Account</button>
        </div>`;
      return;
    }

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
      if (document.getElementById('ch-content') && _activeTab==='chats') await _loadThreads(false);
    }, {ms:20000});
  };

  /* ── GUEST CHAT ───────────────────────────────────────── */
  const _renderGuestChat = (container, chatId) => {
    container.style.cssText = 'position:fixed;inset:0;z-index:50;background:var(--bg-primary);display:flex;flex-direction:column;';
    container.innerHTML = '';
    ChatWindow.open(chatId, container, {
      isNew:false, embedded:false, guestMode:true,
      onClose: () => {
        container.style.cssText = '';
        container.innerHTML = `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
            gap:18px;padding:40px;text-align:center;background:var(--bg-primary)">
            <div style="width:80px;height:80px;border-radius:24px;background:var(--glass-mid);
              backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;
              box-shadow:var(--shadow-md)">
              <span class="material-icons-round" style="font-size:40px;color:var(--ios-blue)">bolt</span>
            </div>
            <h3 style="font-size:22px;font-weight:800;color:var(--text-1)">Enjoying Spark?</h3>
            <p style="font-size:15px;color:var(--text-3);line-height:1.6;max-width:280px">
              Create an account to keep your chats and unlock photos, files, voice messages and more.
            </p>
            <button onclick="App.goTo('#signup')" style="background:var(--accent);color:#fff;border:none;border-radius:var(--r-pill);padding:14px 32px;font-size:16px;font-weight:700;font-family:var(--font);cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,0.35)">Create Free Account</button>
            <div onclick="App.goTo('#login')" style="font-size:14px;color:var(--text-3);cursor:pointer">
              Already have an account? <span style="color:var(--accent);font-weight:700">Sign In</span>
            </div>
          </div>`;
      }
    });
  };

  /* ── SHELL ────────────────────────────────────────────── */
  const _buildShell = () => {
    _container.innerHTML = `
      <div class="chat-list-panel" id="ch-list-panel">
        <!-- Bug 3 Fix: Header now shows "Chats" title + single "+" button -->
        <div class="ch-list-header">
          <div class="ch-list-logo">
            <span style="font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-0.5px">Chats</span>
          </div>
          <div style="display:flex;gap:4px">
            <button class="icon-btn" id="ch-hdr-new" title="New chat" style="color:var(--accent)">
              <span class="material-icons-round">add</span>
            </button>
          </div>
        </div>

        <!-- Bug 3 Fix: Search bar is now global search -->
        <div class="chat-search-wrap">
          <div class="chat-search-inner">
            <span class="material-icons-round">search</span>
            <input id="ch-sr" class="chat-search-input" type="text"
              placeholder="Search chats, people…" autocomplete="off" inputmode="search">
            <span class="material-icons-round" id="ch-clear"
              style="display:none;cursor:pointer;color:var(--text-3);font-size:18px">close</span>
          </div>
        </div>

        <!-- Search results dropdown -->
        <div id="ch-dropdown"></div>

        <!-- Scrollable content area -->
        <div id="ch-content" class="ch-list-content"></div>

        <!-- Floating tab bar INSIDE the left panel (desktop only) -->
        <div class="ch-tab-pill" id="ch-tab-pill">
          <button class="ch-tab-btn ${_activeTab==='chats'?'active':''}" data-tab="chats">
            <span class="material-icons-round">${_activeTab==='chats'?'chat_bubble':'chat_bubble_outline'}</span>
            <span>Chats</span>
          </button>
          <button class="ch-tab-btn ${_activeTab==='people'?'active':''}" data-tab="people">
            <span class="material-icons-round">${_activeTab==='people'?'people':'people_outline'}</span>
            <span>People</span>
          </button>
          <button class="ch-tab-btn" id="ch-tab-updates" data-page="updates">
            <span class="material-icons-round">radio_button_unchecked</span>
            <span>Updates</span>
          </button>
          <button class="ch-tab-btn" id="ch-tab-communities" data-page="communities">
            <span class="material-icons-round">groups</span>
            <span>Groups</span>
          </button>
          <button class="ch-tab-btn" id="ch-tab-profile" data-page="profile">
            <span class="material-icons-round">person_outline</span>
            <span>Profile</span>
          </button>
        </div>
      </div>

      <div class="chat-window-panel" id="ch-window-panel"></div>`;

    /* ── Tab pill bindings ── */
    document.querySelectorAll('.ch-tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = btn.dataset.tab;
        document.querySelectorAll('.ch-tab-btn[data-tab]').forEach(b => {
          const isActive = b.dataset.tab === _activeTab;
          b.classList.toggle('active', isActive);
          const icon = b.querySelector('.material-icons-round');
          if (!icon) return;
          if (b.dataset.tab==='chats')  icon.textContent = isActive ? 'chat_bubble' : 'chat_bubble_outline';
          if (b.dataset.tab==='people') icon.textContent = isActive ? 'people' : 'people_outline';
        });
        document.getElementById('ch-dropdown').innerHTML = '';
        document.getElementById('ch-sr').value = '';
        document.getElementById('ch-clear').style.display = 'none';
        _loadTab(_activeTab);
      });
    });

    /* Nav tabs that go to other pages */
    document.getElementById('ch-tab-updates')?.addEventListener('click', () => App.goTo('#updates'));
    document.getElementById('ch-tab-communities')?.addEventListener('click', () => App.goTo('#communities'));
    document.getElementById('ch-tab-profile')?.addEventListener('click', () => App.goTo('#profile'));

    /* Bug 3 Fix: "+" button opens new-chat contact-picker overlay */
    document.getElementById('ch-hdr-new')?.addEventListener('click', _showNewChatOverlay);

    /* Bug 3 Fix: Global search — searches people + existing chats */
    const inp  = document.getElementById('ch-sr');
    const clr  = document.getElementById('ch-clear');
    const drop = document.getElementById('ch-dropdown');

    clr.onclick = () => { inp.value=''; clr.style.display='none'; drop.innerHTML=''; inp.focus(); };
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      clr.style.display = q ? 'block' : 'none';
      clearTimeout(_srTimer);
      if (!q) { drop.innerHTML=''; return; }
      _srTimer = setTimeout(() => _doGlobalSearch(q, inp, clr, drop), 350);
    });
  };

  /* ── PANEL EMPTY ──────────────────────────────────────── */
  const _showPanelEmpty = () => {
    const panel = document.getElementById('ch-window-panel');
    if (!panel || !_isDesktop()) return;
    panel.innerHTML = `
      <div class="panel-empty-state">
        <div style="width:90px;height:90px;border-radius:28px;background:var(--glass-mid);
          backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;
          box-shadow:var(--shadow-md),0 1px 0 rgba(255,255,255,0.80) inset">
          <span class="material-icons-round" style="font-size:44px;color:var(--ios-blue)">chat_bubble_outline</span>
        </div>
        <h3>Your Messages</h3>
        <p>Select a conversation from the left<br>or tap + to start a new chat</p>
      </div>`;
  };

  /* ── LOAD TAB ─────────────────────────────────────────── */
  const _loadTab = async (tab, skipIfFresh=false) => {
    if (tab==='chats') await _loadThreads(skipIfFresh);
    else await _loadPeople(skipIfFresh);
  };

  /* ── THREADS ──────────────────────────────────────────── */
  const _loadThreads = async (skipIfFresh=false) => {
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
          <p>Tap + above to start a new conversation</p>
        </div>`;
      return;
    }
    list.innerHTML = chats.map(r => _threadRow(r, myId)).join('');
    list.querySelectorAll('.thread-item[data-cid]').forEach(el => {
      el.addEventListener('click', () => { if (el.dataset.cid) _openChat(el.dataset.cid, false); });
      // Bug 2 Fix: long-press to show options (including delete)
      _bindThreadLongPress(el);
    });
    if (_activeChatId) _highlightThread(_activeChatId);
  };

  const _highlightThread = chatId => {
    document.querySelectorAll('#ch-content .thread-item').forEach(el => {
      el.classList.toggle('active-thread', el.dataset.cid===chatId);
    });
  };

  const _threadRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d=rec.data, pm=d.participant_meta||{};
    const oid=(d.participants||[]).find(id=>id!==myId);
    if (!oid) return '';
    const o=pm[oid]||{display_name:'User',username:'?',avatar_url:''};
    const isActive=rec.id===_activeChatId;
    return `
      <div class="thread-item ${isActive?'active-thread':''}" data-cid="${rec.id}">
        ${App.avatar(o.avatar_url,o.display_name,'av-md')}
        <div class="thread-info">
          <div class="thread-top">
            <span class="thread-name">${_esc(o.display_name)}</span>
            <span class="thread-time">${App.timeAgo(d.last_message_at||rec.created_at)}</span>
          </div>
          <div class="thread-preview">${_esc(d.last_message||'Tap to start chatting')}</div>
        </div>
      </div>`;
  };

  /* ── Bug 2: Long-press thread for options (delete chat) ── */
  const _bindThreadLongPress = (el) => {
    let t = null;
    const start = () => { t = setTimeout(() => { navigator.vibrate?.(30); _showThreadOptions(el.dataset.cid); }, 580); };
    const cancel = () => clearTimeout(t);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('contextmenu', e => { e.preventDefault(); cancel(); _showThreadOptions(el.dataset.cid); });
  };

  const _showThreadOptions = async (chatId) => {
    if (!chatId) return;
    const close = App.showModal(`
      <div style="padding:8px 0 20px">
        <div class="ctx-action" id="topt-open">
          <span class="material-icons-round">open_in_new</span>Open Chat
        </div>
        <div class="ctx-action danger" id="topt-delete">
          <span class="material-icons-round">delete_sweep</span>Delete Chat
        </div>
      </div>`);

    document.getElementById('topt-open').onclick = () => { close(); _openChat(chatId, false); };
    document.getElementById('topt-delete').onclick = () => {
      close();
      _confirmDeleteChat(chatId);
    };
  };

  const _confirmDeleteChat = (chatId) => {
    const close = App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--danger)">delete_sweep</span>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Delete Chat?</h3>
        <p style="font-size:13px;color:var(--text-3)">All messages will be permanently deleted for you.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="dc-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="dc-confirm" style="flex:1">Delete</button>
        </div>
      </div>`);
    document.getElementById('dc-cancel').onclick = close;
    document.getElementById('dc-confirm').onclick = async () => {
      close();
      App.showToast('Deleting…');
      try {
        await Server.clearChat(chatId);
        // If this is the active chat, close it
        if (_activeChatId === chatId) {
          ChatWindow.close();
          _activeChatId = null;
          _container.classList.remove('chat-open');
          if (_isDesktop()) _showPanelEmpty();
        }
        App.cache.dirty(CACHE_THREADS);
        await _loadThreads(false);
        App.showToast('Chat deleted', 'success');
      } catch (e) {
        App.showToast('Failed to delete', 'error');
      }
    };
  };

  /* ── PEOPLE ───────────────────────────────────────────── */
  const _loadPeople = async (skipIfFresh=false) => {
    const list=document.getElementById('ch-content'); if (!list) return;
    const me=Server.currentUser; if (!me) return;
    if (App.cache.fresh(CACHE_PEOPLE) && skipIfFresh) {
      _renderPeople(list, App.cache.get(CACHE_PEOPLE), me.id); return;
    }
    list.innerHTML = App.skel.threads(6);
    const profiles = await Server.getPublicProfiles();
    App.cache.set(CACHE_PEOPLE, profiles);
    _renderPeople(list, profiles, me.id);
  };

  const _renderPeople = (list, profiles, myId) => {
    const others=profiles.filter(r=>r.data?.user_id!==myId);
    if (!others.length) {
      list.innerHTML=`<div class="empty-state"><span class="material-icons-round">people_outline</span><h3>No public profiles</h3><p>Users with public profiles appear here</p></div>`;
      return;
    }
    list.innerHTML=others.map(r=>{
      const d=r.data||{};
      return `
        <div class="thread-item people-row" data-uid="${d.user_id}" style="cursor:pointer">
          ${App.avatar(d.avatar_url,d.display_name,'av-md')}
          <div class="thread-info">
            <div class="thread-top">
              <span class="thread-name">${_esc(d.display_name||'User')}</span>
              <span style="font-size:10px;padding:2px 7px;border-radius:99px;font-weight:700;
                background:var(--success-dim);color:var(--success)">Public</span>
            </div>
            <div class="thread-preview">@${_esc(d.username||'')}${d.bio?` · ${_esc(d.bio.slice(0,28))}`:''}</div>
          </div>
          <button class="people-chat-btn icon-btn" data-uid="${d.user_id}" title="Start chat">
            <span class="material-icons-round" style="font-size:18px;color:var(--accent)">add_comment</span>
          </button>
        </div>`;
    }).join('');
    list.querySelectorAll('.people-chat-btn').forEach(btn=>{
      btn.addEventListener('click', async e=>{
        e.stopPropagation();
        if (App.isGuest()){App.showGuestSignupPrompt();return;}
        const rec=profiles.find(r=>r.data?.user_id===btn.dataset.uid);
        if (rec) await _startChatWith(rec);
      });
    });
    list.querySelectorAll('.people-row').forEach(row=>{
      row.addEventListener('click', async ()=>{
        if (App.isGuest()){App.showGuestSignupPrompt();return;}
        const rec=profiles.find(r=>r.data?.user_id===row.dataset.uid);
        if (rec) await _startChatWith(rec);
      });
    });
  };

  /* ── OPEN CHAT ────────────────────────────────────────── */
  const _openChat = (chatId, isNew) => {
    if (!chatId||chatId==='undefined') return;
    _activeChatId=chatId;
    _highlightThread(chatId);

    if (_isDesktop()) {
      const panel=document.getElementById('ch-window-panel');
      if (!panel) return;
      panel.innerHTML='';
      _container.classList.add('chat-open');
      App.setHash(`#chats/${chatId}`);
      ChatWindow.open(chatId, panel, {
        isNew, embedded:true,
        onClose:()=>{
          _activeChatId=null;
          _container.classList.remove('chat-open');
          _highlightThread(null);
          App.setHash('#chats');
          App.cache.dirty(CACHE_THREADS);
          _loadThreads(false);
          _showPanelEmpty();
        }
      });
    } else {
      let slot=document.getElementById('ch-slot');
      if (!slot){
        slot=document.createElement('div');
        slot.id='ch-slot';
        slot.style.cssText='position:fixed;inset:0;z-index:300;background:var(--bg-primary);display:none;flex-direction:column;overflow:hidden;';
        document.body.appendChild(slot);
      }
      slot.style.display='flex';
      _container.classList.add('chat-open');
      App.setHash(`#chats/${chatId}`);
      App.hideChrome();
      ChatWindow.open(chatId, slot, {
        isNew, embedded:false,
        onClose:()=>{
          slot.style.display='none'; slot.innerHTML='';
          _activeChatId=null;
          _container.classList.remove('chat-open');
          App.showChrome();
          App.setHash('#chats');
          App.cache.dirty(CACHE_THREADS);
          _loadThreads(false);
        }
      });
    }
  };

  /* ── Bug 3: Global Search ─────────────────────────────── */
  /**
   * Searches both:
   *  1. Existing chats (by participant display name / username)
   *  2. All users by username (for starting new chats)
   */
  const _doGlobalSearch = async (q, inp, clr, drop) => {
    drop.innerHTML = `<div class="search-results"><div class="search-result-item">
      <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
      <span style="font-size:13px;color:var(--text-3)">Searching…</span>
    </div></div>`;

    try {
      const me = Server.currentUser;
      const ql = q.toLowerCase();
      let results = [];

      // Search 1: existing thread participants
      const threads = App.cache.get(CACHE_THREADS) || await Server.getDirectChats(me?.id);
      const matchedChats = threads.filter(r => {
        const pm = r.data?.participant_meta || {};
        return Object.values(pm).some(p =>
          (p.display_name || '').toLowerCase().includes(ql) ||
          (p.username || '').toLowerCase().includes(ql)
        );
      });

      // Search 2: lookup user by exact username for new chats
      const foundUser = await Server.getProfileByUsername(q).catch(() => null);

      if (!matchedChats.length && (!foundUser || foundUser.data?.user_id === me?.id)) {
        drop.innerHTML = `<div class="search-results"><div class="search-no-result">No results for "<b>${_esc(q)}</b>"</div></div>`;
        return;
      }

      let html = '<div class="search-results">';

      // Existing chats section
      if (matchedChats.length) {
        html += `<div style="padding:6px 16px 4px;font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px">Chats</div>`;
        matchedChats.forEach(r => {
          const pm = r.data?.participant_meta || {};
          const oid = (r.data?.participants || []).find(id => id !== me?.id) || '';
          const o = pm[oid] || { display_name: 'User', username: '?', avatar_url: '' };
          html += `<div class="search-result-item" data-cid="${r.id}">
            ${App.avatar(o.avatar_url, o.display_name, 'av-sm')}
            <div><div class="search-result-name">${_esc(o.display_name)}</div>
            <div class="search-result-uname">@${_esc(o.username)}</div></div>
            <span class="material-icons-round" style="color:var(--accent);margin-left:auto">chevron_right</span>
          </div>`;
        });
      }

      // New user section
      if (foundUser && foundUser.data?.user_id !== me?.id) {
        const fd = foundUser.data;
        const alreadyChatted = matchedChats.some(r => {
          const pm = r.data?.participant_meta || {};
          return Object.keys(pm).includes(fd.user_id);
        });
        if (!alreadyChatted) {
          html += `<div style="padding:6px 16px 4px;font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px">People</div>`;
          html += `<div class="search-result-item" data-uid="${fd.user_id}">
            ${App.avatar(fd.avatar_url, fd.display_name, 'av-sm')}
            <div><div class="search-result-name">${_esc(fd.display_name)}</div>
            <div class="search-result-uname">@${_esc(fd.username)}</div></div>
            <span style="background:var(--accent);color:#fff;border-radius:99px;padding:4px 10px;font-size:11px;font-weight:700;margin-left:auto">Chat</span>
          </div>`;
        }
      }

      html += '</div>';
      drop.innerHTML = html;

      // Bind clicks on existing chats
      drop.querySelectorAll('[data-cid]').forEach(el => {
        el.addEventListener('click', () => {
          drop.innerHTML = ''; inp.value = ''; clr.style.display = 'none';
          _openChat(el.dataset.cid, false);
        });
      });

      // Bind clicks on new user
      drop.querySelectorAll('[data-uid]').forEach(el => {
        el.addEventListener('click', async () => {
          if (App.isGuest()) { App.showGuestSignupPrompt(); return; }
          drop.innerHTML = ''; inp.value = ''; clr.style.display = 'none';
          await _startChatWith(foundUser);
        });
      });

    } catch {
      drop.innerHTML = `<div class="search-results"><div class="search-no-result">Error searching. Try again.</div></div>`;
    }
  };

  /* ── Bug 3: New Chat Overlay (+ button) ───────────────── */
  /**
   * Opens a full-panel overlay where the user types a name/username
   * and sees matching contacts (public AND private profiles they know).
   */
  const _showNewChatOverlay = () => {
    let _timer = null;

    const close = App.showModal(`
      <div style="padding:20px 20px 32px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">New Chat</h3>
        </div>
        <p style="font-size:13px;color:var(--text-3);margin-top:-6px">Search for someone to start a conversation</p>

        <div class="chat-search-inner" style="border-radius:var(--r-md)">
          <span class="material-icons-round">search</span>
          <input id="nc-sr" class="chat-search-input" type="text"
            placeholder="Name or username…" autocomplete="off" autofocus>
        </div>

        <div id="nc-results" style="display:flex;flex-direction:column;gap:4px;min-height:60px">
          <div style="text-align:center;padding:24px;color:var(--text-4);font-size:13px">
            <span class="material-icons-round" style="font-size:36px;display:block;margin-bottom:8px">person_search</span>
            Type a name or @username to search
          </div>
        </div>
      </div>`);

    const inp = document.getElementById('nc-sr');
    const res = document.getElementById('nc-results');

    inp?.focus();

    inp?.addEventListener('input', async e => {
      const q = e.target.value.trim();
      if (!q) {
        res.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-4);font-size:13px">
          <span class="material-icons-round" style="font-size:36px;display:block;margin-bottom:8px">person_search</span>
          Type a name or @username to search
        </div>`;
        return;
      }
      clearTimeout(_timer);
      res.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 4px">
        <div class="spinner" style="width:18px;height:18px;border-width:2px;flex-shrink:0"></div>
        <span style="font-size:13px;color:var(--text-3)">Searching…</span>
      </div>`;

      _timer = setTimeout(async () => {
        try {
          const me = Server.currentUser;
          const ql = q.toLowerCase();

          // Search existing threads for contacts we already know
          const threads = App.cache.get(CACHE_THREADS) || await Server.getDirectChats(me?.id);
          const knownMatches = [];
          threads.forEach(r => {
            const pm = r.data?.participant_meta || {};
            const oid = (r.data?.participants || []).find(id => id !== me?.id) || '';
            const o = pm[oid];
            if (!o) return;
            if ((o.display_name||'').toLowerCase().includes(ql) || (o.username||'').toLowerCase().includes(ql)) {
              knownMatches.push({ rec: r, profile: o, uid: oid });
            }
          });

          // Also search public profiles by username
          const found = await Server.getProfileByUsername(q).catch(() => null);

          if (!knownMatches.length && (!found || found.data?.user_id === me?.id)) {
            res.innerHTML = `<div style="padding:16px 4px;text-align:center;font-size:13px;color:var(--text-3)">No users found for "${_esc(q)}"</div>`;
            return;
          }

          let html = '';

          knownMatches.forEach(({ rec, profile, uid }) => {
            html += `<div class="inline-result-item" data-cid="${rec.id}" style="border-radius:var(--r-md);margin-bottom:2px">
              ${App.avatar(profile.avatar_url, profile.display_name, 'av-md')}
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(profile.display_name||'User')}</div>
                <div style="font-size:12px;color:var(--text-3)">@${_esc(profile.username||'')} · existing chat</div>
              </div>
              <span class="material-icons-round" style="color:var(--accent)">chevron_right</span>
            </div>`;
          });

          if (found && found.data?.user_id !== me?.id) {
            const fd = found.data;
            const alreadyListed = knownMatches.some(m => m.uid === fd.user_id);
            if (!alreadyListed) {
              html += `<div class="inline-result-item" data-uid="${fd.user_id}" style="border-radius:var(--r-md);margin-bottom:2px">
                ${App.avatar(fd.avatar_url, fd.display_name, 'av-md')}
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(fd.display_name||'User')}</div>
                  <div style="font-size:12px;color:var(--text-3)">@${_esc(fd.username||'')}</div>
                </div>
                <button class="btn-primary" style="padding:7px 14px;font-size:13px;flex-shrink:0">Chat</button>
              </div>`;
            }
          }

          res.innerHTML = html || `<div style="padding:16px 4px;text-align:center;font-size:13px;color:var(--text-3)">No users found</div>`;

          res.querySelectorAll('[data-cid]').forEach(el => {
            el.addEventListener('click', () => {
              close(); _openChat(el.dataset.cid, false);
            });
          });

          res.querySelectorAll('[data-uid]').forEach(el => {
            el.addEventListener('click', async () => {
              close();
              await _startChatWith(found);
            });
          });

        } catch {
          res.innerHTML = `<div style="padding:16px 4px;text-align:center;font-size:13px;color:var(--danger)">Search failed. Try again.</div>`;
        }
      }, 350);
    });
  };

  /* ── START CHAT WITH ──────────────────────────────────── */
  const _startChatWith = async otherRec => {
    const me=Server.currentUser, myProfile=Server.currentProfile;
    if (!me||!myProfile) return;
    const list=document.getElementById('ch-content');
    if (list) list.innerHTML=App.skel.threads(3);
    let chatRec=await Server.findDirectChat(me.id, otherRec.data.user_id);
    let isNew=false;
    if (!chatRec){
      isNew=true;
      chatRec=await Server.createDirectChat(
        {user_id:me.id,display_name:myProfile.data.display_name,username:myProfile.data.username,avatar_url:myProfile.data.avatar_url||''},
        {user_id:otherRec.data.user_id,display_name:otherRec.data.display_name,username:otherRec.data.username,avatar_url:otherRec.data.avatar_url||''}
      );
      App.cache.dirty(CACHE_THREADS);
    }
    if (!chatRec?.id){App.showToast('Could not open chat.','error');_loadThreads(false);return;}
    await _loadThreads(true);
    _openChat(chatRec.id, isNew);
  };

  return { render, destroy };
})();