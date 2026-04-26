/**
 * chats.js — Chats Page v9
 * Desktop: NO sidebar. Nav tabs float at bottom of left panel.
 * Layout matches sketch: list+floatingNav | chat window
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

    // If a specific initial tab is requested (e.g. 'people' from mobile nav)
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
        <!-- Header row with logo + actions -->
        <div class="ch-list-header">
          <div class="ch-list-logo">
            <span class="material-icons-round" style="font-size:20px;color:var(--ios-blue)">bolt</span>
            <span style="font-family:var(--font-logo);font-size:18px;color:var(--text-1)">Spark</span>
          </div>
          <div style="display:flex;gap:4px">
            <button class="icon-btn" id="ch-hdr-edit" title="New chat">
              <span class="material-icons-round">edit_square</span>
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="chat-search-wrap">
          <div class="chat-search-inner">
            <span class="material-icons-round">search</span>
            <input id="ch-sr" class="chat-search-input" type="text"
              placeholder="Search…" autocomplete="off" inputmode="search">
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

    /* New chat button */
    document.getElementById('ch-hdr-edit')?.addEventListener('click', () => {
      document.getElementById('ch-sr')?.focus();
    });

    /* Search */
    const inp  = document.getElementById('ch-sr');
    const clr  = document.getElementById('ch-clear');
    const drop = document.getElementById('ch-dropdown');

    clr.onclick = () => { inp.value=''; clr.style.display='none'; drop.innerHTML=''; inp.focus(); };
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      clr.style.display = q ? 'block' : 'none';
      clearTimeout(_srTimer);
      if (!q) { drop.innerHTML=''; return; }
      _srTimer = setTimeout(() => _doSearch(q, inp, clr, drop), 350);
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
        <p>Select a conversation from the left<br>or search for someone to start chatting</p>
      </div>`;
  };

  /* ── LOAD TAB ─────────────────────────────────────────── */
  const _loadTab = async (tab, skipIfFresh=false) => {
    if (tab==='chats') await _loadThreads(skipIfFresh);
    else await _loadPeople(skipIfFresh);  // 'people' tab
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
          <p>Search for someone above to start chatting</p>
        </div>`;
      return;
    }
    list.innerHTML = chats.map(r => _threadRow(r, myId)).join('');
    list.querySelectorAll('.thread-item[data-cid]').forEach(el => {
      el.addEventListener('click', () => { if (el.dataset.cid) _openChat(el.dataset.cid, false); });
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

  /* ── SEARCH ───────────────────────────────────────────── */
  const _doSearch = async (q, inp, clr, drop) => {
    drop.innerHTML=`<div class="search-results"><div class="search-result-item"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div><span style="font-size:13px;color:var(--text-3)">Searching…</span></div></div>`;
    try {
      const found=await Server.getProfileByUsername(q);
      const me=Server.currentUser;
      if (!found||found.data?.user_id===me?.id){
        drop.innerHTML=`<div class="search-results"><div class="search-no-result">No user "<b>${_esc(q)}</b>" found.</div></div>`;
        return;
      }
      const fd=found.data;
      drop.innerHTML=`<div class="search-results"><div class="search-result-item" id="sr-hit">${App.avatar(fd.avatar_url,fd.display_name,'av-md')}<div><div class="search-result-name">${_esc(fd.display_name)}</div><div class="search-result-uname">@${_esc(fd.username)}</div></div><span class="material-icons-round" style="color:var(--accent);margin-left:auto">chevron_right</span></div></div>`;
      document.getElementById('sr-hit').addEventListener('click', async ()=>{
        if (App.isGuest()){App.showGuestSignupPrompt();return;}
        drop.innerHTML=''; inp.value=''; clr.style.display='none';
        await _startChatWith(found);
      });
    } catch {
      drop.innerHTML=`<div class="search-results"><div class="search-no-result">Error searching. Try again.</div></div>`;
    }
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