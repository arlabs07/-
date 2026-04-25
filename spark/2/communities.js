/**
 * communities.js — Communities Page v8
 * Desktop: left panel with list + floating tab pill, right panel for chat.
 */
const CommunitiesPage = (() => {

  const CACHE_KEY = 'communities_list';
  const SYNC_KEY  = 'communities_sync';
  const COLORS = ['#007AFF','#FF3B30','#34C759','#FF9500','#AF52DE','#5856D6'];

  let _container    = null;
  let _activeCommId = null;

  const _isDesktop = () => window.matchMedia('(min-width:768px)').matches;
  const _esc = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const destroy = () => {
    SyncManager.unwatch(SYNC_KEY);
    if (ChatWindow.isOpen()) ChatWindow.close();
    _activeCommId = null;
  };

  const render = async (container, commId) => {
    _container = container;
    if (commId && ChatWindow.isOpen() && commId === _activeCommId) return;
    _buildShell();
    if (!commId) {
      if (!_isDesktop()) ChatWindow.close();
      await _loadList();
      if (_isDesktop()) _showPanelEmpty();
    } else {
      _loadList(true).catch(() => {});
      await _openComm(commId);
    }
    SyncManager.watch(SYNC_KEY, async () => {
      App.cache.dirty(CACHE_KEY); await _loadList(false);
    }, {ms:25000});
  };

  const _buildShell = () => {
    _container.innerHTML = `
      <div class="comm-list-panel" id="comm-list-panel">
        <div class="comm-list-header">
          <div class="comm-list-logo">
            <span class="material-icons-round" style="font-size:20px;color:var(--ios-purple)">groups</span>
            <span style="font-family:var(--font-logo);font-size:18px;color:var(--text-1)">Communities</span>
          </div>
          <button class="icon-btn" id="cm-fab" title="New Community">
            <span class="material-icons-round" style="color:var(--accent)">add</span>
          </button>
        </div>
        <div class="communities-list" id="cm-list"></div>
        <!-- Floating tab pill inside left panel (desktop only) -->
        <div class="ch-tab-pill" id="comm-tab-pill">
          <button class="ch-tab-btn" data-page="chats">
            <span class="material-icons-round">chat_bubble_outline</span><span>Chats</span>
          </button>
          <button class="ch-tab-btn" data-page="updates">
            <span class="material-icons-round">radio_button_unchecked</span><span>Updates</span>
          </button>
          <button class="ch-tab-btn active" data-page="communities">
            <span class="material-icons-round">groups</span><span>Groups</span>
          </button>
          <button class="ch-tab-btn" data-page="profile">
            <span class="material-icons-round">person_outline</span><span>Profile</span>
          </button>
        </div>
      </div>
      <div class="comm-chat-panel" id="cm-window-panel"></div>`;

    document.getElementById('cm-fab').onclick = _showCreateSheet;
    document.querySelectorAll('#comm-tab-pill .ch-tab-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => App.goTo('#' + btn.dataset.page));
    });
  };

  const _showPanelEmpty = () => {
    const panel = document.getElementById('cm-window-panel');
    if (!panel || !_isDesktop()) return;
    panel.innerHTML = `
      <div class="panel-empty-state">
        <div style="width:90px;height:90px;border-radius:28px;background:var(--glass-mid);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-md)">
          <span class="material-icons-round" style="font-size:44px;color:var(--ios-purple)">groups</span>
        </div>
        <h3>Communities</h3>
        <p>Select a community to join the conversation, or tap + to create your own</p>
      </div>`;
  };

  const _loadList = async (skipIfFresh=false) => {
    const list = document.getElementById('cm-list'); if (!list) return;
    const me   = Server.currentUser; if (!me) return;
    if (App.cache.fresh(CACHE_KEY) && skipIfFresh) {
      _renderList(list, App.cache.get(CACHE_KEY), me.id); return;
    }
    if (!list.children.length) list.innerHTML = App.skel.communities(5);
    const recs = await Server.getCommunities();
    App.cache.set(CACHE_KEY, recs);
    const listEl = document.getElementById('cm-list');
    if (listEl) _renderList(listEl, recs, me.id);
  };

  const _renderList = (list, recs, myId) => {
    const visible = recs.filter(r => r.data?.is_public !== false || (r.data.participants||[]).includes(myId));
    if (!visible.length) {
      list.innerHTML = `<div class="empty-state"><span class="material-icons-round">groups</span><h3>No communities yet</h3><p>Tap + to create the first one</p></div>`;
      return;
    }
    list.innerHTML = visible.map(r => _commRow(r, myId)).join('');
    list.querySelectorAll('.community-item').forEach(el => {
      el.addEventListener('click', () => { if (el.dataset.cid) _openComm(el.dataset.cid); });
    });
    if (_activeCommId) _highlightComm(_activeCommId);
  };

  const _highlightComm = commId => {
    document.querySelectorAll('#cm-list .community-item').forEach(el => {
      el.classList.toggle('active-comm', el.dataset.cid === commId);
    });
  };

  const _commRow = (rec, myId) => {
    if (!rec?.id || !rec?.data) return '';
    const d = rec.data;
    const joined = (d.participants||[]).includes(myId);
    const count  = d.member_count || (d.participants||[]).length;
    const initial = (d.name||'G')[0].toUpperCase();
    const color   = d.color || COLORS[0];
    const isPublic = d.is_public !== false;
    const isActive = rec.id === _activeCommId;
    return `
      <div class="community-item ${isActive?'active-comm':''}" data-cid="${rec.id}" style="position:relative">
        <div class="community-av" style="background:${color}18;color:${color}">
          ${d.avatar_url?`<img src="${_esc(d.avatar_url)}" alt="">`:`${initial}`}
        </div>
        <div class="community-info">
          <div class="community-name">
            ${_esc(d.name)}
            <span style="font-size:10px;padding:1px 6px;border-radius:99px;font-weight:700;flex-shrink:0;
              background:${isPublic?'rgba(52,199,89,0.12)':'rgba(255,149,0,0.12)'};
              color:${isPublic?'var(--success)':'var(--warning)'}">
              ${isPublic?'Public':'Private'}
            </span>
          </div>
          <div class="community-desc">${_esc(d.last_message||d.description||'No messages yet')}</div>
          <div class="community-meta">
            <div class="comm-member-chip">
              <span class="material-icons-round">group</span>${count}
            </div>
            ${joined?`<div class="comm-joined-badge">Joined</div>`:''}
          </div>
        </div>
        <span class="material-icons-round" style="color:var(--text-4);font-size:18px;flex-shrink:0">chevron_right</span>
      </div>`;
  };

  const _openComm = async commId => {
    if (!commId || commId==='undefined') return;
    const me = Server.currentUser, myProfile = Server.currentProfile;
    const rec = await Server.getChatById(commId);
    if (!document.getElementById('cm-window-panel')) return;
    if (!rec) { App.showToast('Community not found.','error'); return; }

    const wasJoined = (rec.data.participants||[]).includes(me.id);
    if (!wasJoined) {
      try {
        await Server.joinCommunity(commId, me.id, {
          display_name: myProfile?.data.display_name||me.display_name||'User',
          username:     myProfile?.data.username||'',
          avatar_url:   myProfile?.data.avatar_url||''
        });
        await Server.sendChatMessage(commId, {
          sender_id:'system',username:'',display_name:'',
          message:`${myProfile?.data.display_name||'Someone'} joined.`,
          time:new Date().toISOString(),msg_type:'system'
        });
      } catch {}
    }

    const panel = document.getElementById('cm-window-panel');
    if (!panel) return;
    _activeCommId = commId;
    _highlightComm(commId);

    const onClose = () => {
      _activeCommId = null; _highlightComm(null);
      App.cache.dirty(CACHE_KEY);
      _loadList(false).catch(() => {});
    };

    if (_isDesktop()) {
      panel.innerHTML = '';
      _container.classList.add('comm-open');
      ChatWindow.open(commId, panel, {
        isNew:false, embedded:true, urlPrefix:'communities',
        onClose:() => {
          _container.classList.remove('comm-open');
          App.setHash('#communities');
          onClose(); _showPanelEmpty();
        }
      });
    } else {
      let slot = document.getElementById('cm-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'cm-slot';
        slot.style.cssText = 'position:fixed;inset:0;z-index:300;background:var(--bg-primary);display:none;flex-direction:column;overflow:hidden;';
        document.body.appendChild(slot);
      }
      slot.style.display = 'flex';
      _container.classList.add('comm-open');
      ChatWindow.open(commId, slot, {
        isNew:false, embedded:false, urlPrefix:'communities',
        onClose:() => {
          slot.style.display='none'; slot.innerHTML='';
          _container.classList.remove('comm-open');
          App.setHash('#communities'); onClose();
        }
      });
    }
  };

  const _showCreateSheet = () => {
    let avatarFile = null, selColor = COLORS[0], selPublic = true;
    const colorDots = COLORS.map(c =>
      `<div class="color-dot ${c===selColor?'sel':''}" data-c="${c}" style="background:${c};width:28px;height:28px;border-radius:50%;cursor:pointer;border:3px solid ${c===selColor?'#fff':'transparent'};transition:transform 0.15s;box-shadow:var(--shadow-xs)"></div>`
    ).join('');
    const close = App.showModal(`
      <div class="edit-group-sheet">
        <h3 style="text-align:center;font-size:20px;font-weight:800;color:var(--text-1);margin-bottom:4px">New Community</h3>
        <div class="eg-av-pick">
          <label class="eg-av-btn" id="cc-av-lbl" style="background:var(--glass-mid);border:1.5px dashed var(--glass-stroke);width:72px;height:72px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;position:relative;">
            <span class="material-icons-round" style="color:var(--text-3)">add_a_photo</span>
            <input type="file" accept="image/*" id="cc-av-in" style="display:none">
          </label>
        </div>
        <div><label class="auth-label" style="display:block;margin-bottom:6px">Name *</label><input id="cc-name" class="input-field" type="text" placeholder="e.g. Design Team…" maxlength="60"></div>
        <div><label class="auth-label" style="display:block;margin-bottom:6px">Description</label><textarea id="cc-desc" class="input-field" rows="2" style="resize:none"></textarea></div>
        <div><label class="auth-label" style="display:block;margin-bottom:8px">Color</label><div style="display:flex;gap:8px;flex-wrap:wrap" id="cc-colors">${colorDots}</div></div>
        <div><label class="auth-label" style="display:block;margin-bottom:8px">Privacy</label>
          <div class="privacy-toggle">
            <button class="privacy-opt active" data-v="true"><span class="material-icons-round">public</span>Public</button>
            <button class="privacy-opt" data-v="false"><span class="material-icons-round">lock</span>Private</button>
          </div></div>
        <div id="cc-err" class="auth-error"></div>
        <button class="eg-save-btn" id="cc-submit"><span class="material-icons-round">group_add</span>Create Community</button>
      </div>`);

    document.getElementById('cc-av-in').addEventListener('change', e => {
      avatarFile = e.target.files[0]; if (!avatarFile) return;
      const rd = new FileReader();
      rd.onload = ev => {
        const lbl = document.getElementById('cc-av-lbl');
        if (lbl) lbl.innerHTML = `<img src="${ev.target.result}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px">`;
      };
      rd.readAsDataURL(avatarFile);
    });
    document.querySelectorAll('#cc-colors .color-dot').forEach(dot => {
      dot.onclick = () => {
        selColor = dot.dataset.c;
        document.querySelectorAll('#cc-colors .color-dot').forEach(d => {
          d.style.borderColor = d.dataset.c===selColor?'#fff':'transparent';
          d.style.transform = d.dataset.c===selColor?'scale(1.18)':'scale(1)';
        });
      };
    });
    document.querySelectorAll('.privacy-opt').forEach(opt => {
      opt.onclick = () => {
        selPublic = opt.dataset.v==='true';
        document.querySelectorAll('.privacy-opt').forEach(o => o.classList.toggle('active', o.dataset.v===opt.dataset.v));
      };
    });
    document.getElementById('cc-submit').onclick = async () => {
      const name = document.getElementById('cc-name').value.trim();
      const desc = document.getElementById('cc-desc').value.trim();
      const errEl = document.getElementById('cc-err'); errEl.classList.remove('visible');
      if (!name) { errEl.textContent='Name required.'; errEl.classList.add('visible'); return; }
      const me = Server.currentUser, myProfile = Server.currentProfile;
      const btn = document.getElementById('cc-submit');
      btn.disabled = true; btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try {
        let avatarUrl = '';
        if (avatarFile) avatarUrl = await Server.uploadCompressedImage(avatarFile,'spark_comm_avatars') || '';
        const myMeta = {display_name:myProfile?.data.display_name||me.display_name||'User',username:myProfile?.data.username||'',avatar_url:myProfile?.data.avatar_url||''};
        const newRec = await Server.createCommunity({name,description:desc,avatar_url:avatarUrl,color:selColor,is_public:selPublic,participants:[me.id],participant_meta:{[me.id]:myMeta},created_by:me.id});
        if (newRec?.id) await Server.sendChatMessage(newRec.id,{sender_id:'system',username:'',display_name:'',message:`Welcome to "${name}"! 🎉`,time:new Date().toISOString(),msg_type:'system'}).catch(()=>{});
        App.cache.dirty(CACHE_KEY); close(); App.showToast('Community created! 🎉','success');
        await _loadList(false);
        if (newRec?.id) _openComm(newRec.id);
      } catch(e) {
        btn.disabled=false; btn.innerHTML=`<span class="material-icons-round">group_add</span>Create Community`;
        errEl.textContent=e.message||'Failed.'; errEl.classList.add('visible');
      }
    };
  };

  return { render, destroy };
})();