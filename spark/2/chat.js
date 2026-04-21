/**
 * chat.js — ChatWindow v8 (desktop-embedded fix)
 *
 * Key changes:
 *  - open() accepts opts.embedded (auto-detected from screen width if not set)
 *  - In embedded mode: skips App.hideChrome(), adds .chat-panel-host to container
 *    so CSS switches .chat-fullscreen from position:fixed to position:relative
 *  - Back button hidden on desktop via CSS, still works on mobile
 *  - Everything else (delta sync, read receipts, polls, etc.) unchanged
 */

const ChatWindow = (() => {

  const REACTIONS = [
    { icon: 'favorite',                 color: '#ed4956', key: 'heart' },
    { icon: 'sentiment_very_satisfied', color: '#f0a030', key: 'laugh' },
    { icon: 'thumb_down',               color: 'red',     key: 'dislike' },
    { icon: 'sentiment_dissatisfied',   color: '#58d1f7', key: 'sad'  },
    { icon: 'thumb_up',                 color: '#0095f6', key: 'like' },
  ];

  const COLORS    = ['#0095f6','#ed4956','#2dd55b','#f0a030','#bc1888','#8a2be2'];
  const URL_RE    = /https?:\/\/(www\.)?[-\w@:%._+~#=]{1,256}\.[a-zA-Z]{1,6}\b([-\w@:%_+.~#?&//=]*)/g;
  const SYNC_KEY  = (id) => `chat_poll_${id}`;
  const DISAPPEAR_OPTIONS = [
    { label: '10 days',  days: 10  },
    { label: '30 days',  days: 30  },
    { label: '60 days',  days: 60  },
    { label: '90 days',  days: 90  },
    { label: '365 days', days: 365 },
  ];

  let _chatId     = null; let _chatRec   = null;  let _msgs     = [];
  let _msgHash    = '';   let _container = null;  let _onClose  = null;
  let _isNew      = false; let _attachOpen = false; let _raf     = null;
  let _replyTo    = null; let _presenceTimer = null;
  let _embedded   = false;   // true when rendered inside a panel, not full-screen
  let _urlPrefix  = null;    // 'chats' | 'communities' — used for hash

  let _audioRec   = null; let _audioChunks = []; let _audioTimer = null;
  let _audioSecs  = 0;    let _isRecording = false;

  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

  /* ── PUBLIC ─────────────────────────────────────────────── */

  const open = async (chatId, overlayEl, opts = {}) => {
    if (!chatId || chatId === 'undefined') { App.showToast('Cannot open chat.', 'error'); return; }
    close();
    _chatId    = chatId;
    _container = overlayEl;
    _onClose   = opts.onClose || null;
    _isNew     = opts.isNew || false;
    // embedded = rendering inside a panel div (desktop), NOT a full-screen overlay
    _embedded  = opts.embedded !== undefined ? opts.embedded : _isDesktop();
    // urlPrefix: override the hash prefix (e.g. 'communities' for group chats)
    _urlPrefix = opts.urlPrefix || null;

    // Set hash BEFORE getChatById so it's correct immediately
    // Use passed urlPrefix if available, otherwise derive from chatId prefix pattern
    const _initialPrefix = _urlPrefix || (_embedded ? 'chats' : 'chats');
    App.setHash(`#${_initialPrefix}/${chatId}`);

    // Only hide chrome on mobile (full-screen overlay mode)
    if (!_embedded) App.hideChrome();

    // Mark container so CSS can switch from fixed to relative layout
    if (_embedded) {
      overlayEl.classList.add('chat-panel-host');
    }

    _container.innerHTML = App.skel.messages(8);

    _chatRec = await Server.getChatById(chatId);
    if (!_chatRec) {
      _container.innerHTML = _errHTML();
      document.getElementById('cw-err-back')?.addEventListener('click', _close);
      return;
    }

    _msgs    = _applyDisappearing([...(_chatRec.data.messages || [])]);
    _msgHash = JSON.stringify(_msgs);

    _buildUI();
    SyncManager.initChatDelta(chatId, _msgs);
    SyncManager.startPresence();
    _loadPresence();

    if (_isNew && !_msgs.length) setTimeout(() => _sendText('Hi'), 350);

    SyncManager.watch(SYNC_KEY(chatId), _pollFetch, { ms: 3500 });
  };

  const close = () => {
    if (_chatId) SyncManager.unwatch(SYNC_KEY(_chatId));
    SyncManager.stopReadObserver();
    SyncManager.stopPresence();
    clearInterval(_presenceTimer);
    cancelAnimationFrame(_raf);
    _stopAudioRec();
    _raf = null;

    // Remove embedded class from container
    if (_container && _embedded) {
      _container.classList.remove('chat-panel-host');
    }

    _chatId = _chatRec = null;
    _msgs = []; _msgHash = ''; _isNew = false;
    _attachOpen = false; _replyTo = null; _embedded = false; _urlPrefix = null;
  };

  const isOpen = () => !!_chatId;

  /* ── PRESENCE ────────────────────────────────────────────── */

  const _loadPresence = async () => {
    const d   = _chatRec?.data;
    const me  = Server.currentUser;
    if (!d || d.type !== 'direct') return;
    const oid = (d.participants || []).find(id => id !== me?.id);
    if (!oid) return;

    const _update = async () => {
      const p = await SyncManager.getPresence(oid);
      const sub = document.getElementById('cw-sub-line'); if (!sub) return;
      if (p.online) {
        sub.innerHTML = `<span class="presence-dot online"></span> Online`;
      } else if (p.last_seen) {
        const diff = Date.now() - new Date(p.last_seen).getTime();
        const label = diff < 60000 ? 'just now'
          : diff < 3600000 ? `${Math.floor(diff/60000)}m ago`
          : diff < 86400000 ? `${Math.floor(diff/3600000)}h ago`
          : new Date(p.last_seen).toLocaleDateString(undefined, { month:'short', day:'numeric' });
        sub.innerHTML = `<span class="presence-dot offline"></span> Last seen ${label}`;
      } else {
        sub.textContent = _chatRec.data.participant_meta?.[oid]?.username
          ? `@${_chatRec.data.participant_meta[oid].username}` : '';
      }
    };

    await _update();
    _presenceTimer = setInterval(_update, 30000);
  };

  /* ── BUILD UI ─────────────────────────────────────────────── */

  const _buildUI = () => {
    const d         = _chatRec.data;
    const isGroup   = d.type === 'group';
    const me        = Server.currentUser;
    const adminOnly = d.admin_only_messages === true;
    const isAdmin   = d.created_by === me?.id;
    const canMsg    = !adminOnly || isAdmin;
    const disappDays = d.disappearing_days ?? 90;

    let hName, hSubDefault, hAvHtml, privBadge = '';

    if (isGroup) {
      const color = d.color || '#0095f6'; const initial = (d.name || 'G')[0].toUpperCase();
      const count = d.member_count || (d.participants || []).length;
      hName       = d.name || 'Group';
      hSubDefault = `${count} member${count !== 1 ? 's' : ''}`;
      hAvHtml = `<div class="cw-group-av" id="cw-av-btn" style="background:${color}22;color:${color}">
        ${d.avatar_url ? `<img src="${_attr(d.avatar_url)}">` : initial}</div>`;
      const pub = d.is_public !== false;
      privBadge = `<span class="privacy-badge ${pub?'public':'private'}">
        <span class="material-icons-round">${pub?'public':'lock'}</span>${pub?'Public':'Private'}</span>`;
    } else {
      const pm  = d.participant_meta || {};
      const oid = (d.participants || []).find(id => id !== me?.id) || '';
      const o   = pm[oid] || { display_name: 'User', username: '?', avatar_url: '' };
      hName       = o.display_name;
      hSubDefault = `@${o.username}`;
      hAvHtml = `<div id="cw-av-btn">${App.avatar(o.avatar_url, o.display_name, 'av-md')}</div>`;
    }

    const disappBadge = disappDays
      ? `<span class="disappearing-badge"><span class="material-icons-round">timer</span>${disappDays}d</span>` : '';

    const adminBanner = (adminOnly && !isAdmin)
      ? `<div style="padding:8px 14px;background:var(--bg-3);border-bottom:1px solid var(--border);
           display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-3)">
           <span class="material-icons-round" style="font-size:16px;color:var(--warning)">admin_panel_settings</span>
           Only admins can send messages
         </div>` : '';

    _container.innerHTML = `
      <div class="chat-fullscreen">
        <div class="cw-header">
          <button class="cw-back icon-btn" id="cw-back">
            <span class="material-icons-round">arrow_back</span>
          </button>
          <div class="cw-av">${hAvHtml}</div>
          <div class="cw-info" id="cw-info-txt">
            <div class="cw-name">${_esc(hName)} ${privBadge} ${disappBadge}</div>
            <div class="cw-sub" id="cw-sub-line">${_esc(hSubDefault)}</div>
          </div>
          <div class="cw-actions">
            <button class="icon-btn" id="cw-more">
              <span class="material-icons-round">more_vert</span>
            </button>
          </div>
        </div>

        ${adminBanner}

        <div class="cw-messages" id="cw-msgs"></div>

        <div class="reply-bar" id="reply-bar">
          <div class="reply-bar-inner">
            <div class="reply-bar-icon"><span class="material-icons-round">reply</span></div>
            <div class="reply-bar-content">
              <div class="reply-bar-sender" id="reply-bar-sender"></div>
              <div class="reply-bar-preview" id="reply-bar-preview"></div>
            </div>
          </div>
          <button class="reply-bar-close" id="reply-bar-close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="cw-input-bar" id="cw-input-bar"
             style="${canMsg ? '' : 'pointer-events:none;opacity:0.4'}">
          <div class="attach-overlay" id="attach-overlay">
            <div class="attach-grid">
              <div class="attach-item" data-attach="image">
                <div class="attach-icon-wrap purple"><span class="material-icons-round">image</span></div>
                <span class="attach-label">Photo</span>
              </div>
              <div class="attach-item" data-attach="video">
                <div class="attach-icon-wrap red"><span class="material-icons-round">videocam</span></div>
                <span class="attach-label">Video</span>
              </div>
              <div class="attach-item" data-attach="file">
                <div class="attach-icon-wrap blue"><span class="material-icons-round">attach_file</span></div>
                <span class="attach-label">Document</span>
              </div>
              <div class="attach-item" data-attach="poll">
                <div class="attach-icon-wrap green"><span class="material-icons-round">poll</span></div>
                <span class="attach-label">Poll</span>
              </div>
              <div class="attach-item" data-attach="quiz">
                <div class="attach-icon-wrap orange"><span class="material-icons-round">quiz</span></div>
                <span class="attach-label">Quiz</span>
              </div>
              <div class="attach-item" data-attach="camera">
                <div class="attach-icon-wrap teal"><span class="material-icons-round">photo_camera</span></div>
                <span class="attach-label">Camera</span>
              </div>
              <div class="attach-item" data-attach="audio">
                <div class="attach-icon-wrap pink"><span class="material-icons-round">audio_file</span></div>
                <span class="attach-label">Audio File</span>
              </div>
              <div class="attach-item" data-attach="ai-image">
                <div class="attach-icon-wrap" style="background:linear-gradient(135deg,rgba(0,149,246,0.15),rgba(188,24,136,0.15));color:#bc1888"><span class="material-icons-round">auto_awesome</span></div>
                <span class="attach-label">AI Image</span>
              </div>
            </div>
          </div>

          <input type="file" id="cw-img-in"   accept="image/*"   style="display:none">
          <input type="file" id="cw-file-in"  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv" style="display:none">
          <input type="file" id="cw-video-in" accept="video/*"   style="display:none">
          <input type="file" id="cw-audio-in" accept="audio/*"   style="display:none">

          <button class="cw-insert-btn" id="cw-insert">
            <span class="material-icons-round">add_circle_outline</span>
          </button>

          <textarea id="cw-ta" class="cw-textarea"
            placeholder="${isGroup ? 'Message group...' : 'Message...'}"
            rows="1" ${canMsg ? '' : 'disabled'}></textarea>

          <button class="cw-mic-btn" id="cw-mic" title="Voice message">
            <span class="material-icons-round">mic</span>
          </button>
          <button class="cw-send-btn" id="cw-send">
            <span class="material-icons-round">send</span>
          </button>
        </div>
      </div>`;

    /* ── Bindings ── */
    document.getElementById('cw-back').onclick = _close;
    const infoH = () => isGroup ? _showGroupInfo() : _showDirectMenu();
    document.getElementById('cw-av-btn')?.addEventListener('click', infoH);
    document.getElementById('cw-info-txt')?.addEventListener('click', infoH);
    document.getElementById('cw-more').onclick = () => isGroup ? _showGroupInfo() : _showDirectMenu();

    if (canMsg) {
      const ta = document.getElementById('cw-ta');
      ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
      });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault(); _sendFromInput();
        }
      });

      document.getElementById('cw-send').onclick   = _sendFromInput;
      document.getElementById('cw-insert').onclick  = _toggleAttach;
      document.getElementById('reply-bar-close').onclick = _clearReply;
      document.getElementById('cw-mic').addEventListener('click', () =>
        _isRecording ? _stopAudioRec() : _startAudioRec()
      );

      document.querySelectorAll('.attach-item').forEach(item => {
        if (item.classList.contains('disabled')) return;
        item.addEventListener('click', () => {
          _closeAttach();
          const type = item.dataset.attach;
          if (type === 'image')  document.getElementById('cw-img-in').click();
          if (type === 'file')   document.getElementById('cw-file-in').click();
          if (type === 'video')  document.getElementById('cw-video-in').click();
          if (type === 'audio')  document.getElementById('cw-audio-in').click();
          if (type === 'poll')   _showPollSheet('poll');
          if (type === 'quiz')   _showPollSheet('quiz');
          if (type === 'ai-image') { _closeAttach(); _showAIImagePrompt(); return; }
          if (type === 'camera') CameraOverlay.open((url, mediaType) => {
            const msg = { ..._myMeta(), message: url, time: _now(),
              msg_type: mediaType === 'video' ? 'video' : 'image' };
            _optimisticSend(msg);
          });
        });
      });

      document.getElementById('cw-img-in').addEventListener('change',  async e => { const f=e.target.files[0]; if(!f)return; e.target.value=''; await _sendImageFile(f); });
      document.getElementById('cw-video-in').addEventListener('change', async e => { const f=e.target.files[0]; if(!f)return; e.target.value=''; await _sendVideoFile(f); });
      document.getElementById('cw-file-in').addEventListener('change',  async e => { const f=e.target.files[0]; if(!f)return; e.target.value=''; await _sendGenericFile(f); });
      document.getElementById('cw-audio-in').addEventListener('change', async e => { const f=e.target.files[0]; if(!f)return; e.target.value=''; await _sendAudioFile(f); });
    }

    document.getElementById('cw-msgs').addEventListener('click', _closeAttach);

    _renderMessages();
    SyncManager.startReadObserver('cw-msgs', _chatId, Server.currentUser?.id);
  };

  const _close = () => {
    // Only restore chrome if we hid it (mobile non-embedded mode)
    if (!_embedded) App.showChrome();
    close();
    if (typeof _onClose === 'function') _onClose();
  };

  /* ── DISAPPEARING ─────────────────────────────────────────── */
  const _applyDisappearing = (msgs) => Server.filterDisappearing(msgs, _chatRec?.data?.disappearing_days ?? 90);

  /* ══════════════════════════════════════════════════════════
     DELTA POLL
     ══════════════════════════════════════════════════════════ */

  const _pollFetch = async () => {
    if (!_chatId || !document.getElementById('cw-msgs')) { close(); return; }
    const fresh = await Server.getChatById(_chatId); if (!fresh) return;

    const serverMsgs  = _applyDisappearing(fresh.data.messages || []);
    const newHash     = JSON.stringify(serverMsgs);
    if (newHash === _msgHash) return;

    const { newMsgs, updatedMsgs } = SyncManager.computeDelta(_chatId, serverMsgs);
    const me = Server.currentUser;

    const srvTimes = new Set(serverMsgs.map(m => m.time));
    _msgs    = [...serverMsgs, ..._msgs.filter(m => m._optimistic && !srvTimes.has(m.time))];
    _msgHash = JSON.stringify(_msgs);
    _chatRec = fresh;

    if (newMsgs.length) {
      SyncManager.appendMessages('cw-msgs', newMsgs, _msgRowHtml, (row, msg) => {
        _bindRow(row, msg);
        SyncManager.observeRow(row);
      });
    }

    updatedMsgs.forEach(msg => {
      SyncManager.patchMessage(msg.time, (row) => {
        const reactDiv = row.querySelector('.msg-reactions');
        const newReactHtml = _reactionsHtml(msg, me?.id);
        if (reactDiv) {
          reactDiv.outerHTML = newReactHtml || '<div class="msg-reactions"></div>';
        } else if (newReactHtml) {
          row.insertAdjacentHTML('beforeend', newReactHtml);
        }
        if (row.classList.contains('sent')) {
          const readBy   = msg.read_by || [];
          const partnerRead = readBy.some(id => id !== me?.id);
          const tick     = row.querySelector('.msg-tick');
          if (tick && partnerRead && !tick.classList.contains('read')) {
            tick.classList.remove('pending', 'delivered', 'sent-tick');
            tick.classList.add('read');
            tick.textContent = 'done_all';
          }
        }
      });
    });

    SyncManager.store.set(SYNC_KEY(_chatId), _msgHash);
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */

  const _renderMessages = () => {
    const area = document.getElementById('cw-msgs'); if (!area) return;
    const wasBot = area.scrollHeight - area.scrollTop - area.clientHeight < 100;

    if (!_msgs.length) {
      area.innerHTML = `<div class="empty-state">
        <span class="material-icons-round">waving_hand</span>
        <p style="font-size:14px;color:var(--text-3)">Say hi to start the conversation</p>
      </div>`; return;
    }

    const me      = Server.currentUser;
    const isGroup = _chatRec?.data?.type === 'group';
    let html = '', prevDate = '', prevSender = '';

    _msgs.forEach(msg => {
      if (!msg?.sender_id) return;
      const dateStr = _dateLabel(msg.time);
      if (dateStr !== prevDate) {
        html += `<div class="msg-date-sep"><span>${dateStr}</span></div>`;
        prevDate = dateStr; prevSender = '';
      }
      const showName = isGroup && msg.msg_type !== 'system' && !msg.deleted &&
        msg.sender_id !== me?.id && msg.sender_id !== prevSender;
      prevSender = msg.sender_id;
      html += _msgRowHtml(msg, showName);
    });

    area.innerHTML = html;

    area.querySelectorAll('.msg-row[data-t]').forEach(row => {
      const msg = _findMsg(row.dataset.t);
      if (msg) { _bindRow(row, msg); SyncManager.observeRow(row); }
    });

    if (wasBot) _scrollBottom();
  };

  /* ── Single message row HTML ──────────────────────────────── */
  const _msgRowHtml = (msg, showName = false) => {
    const me        = Server.currentUser;
    const isGroup   = _chatRec?.data?.type === 'group';
    const isSent    = msg.sender_id === me?.id;
    const isSystem  = msg.msg_type === 'system';
    const isDeleted = msg.deleted === true || msg.msg_type === 'deleted';
    const isOpt     = !!msg._optimistic; const isFailed = !!msg._failed;
    const time      = App.formatTime(msg.time);
    const readBy    = msg.read_by || [];
    const otherRead = readBy.some(id => id !== me?.id);

    if (isSystem) return `<div class="msg-row system"><div class="bubble">${_esc(msg.message)}</div></div>`;

    const cls = isSent ? 'sent' : 'recv';
    const sn  = (isGroup || showName) && !isSent && msg.display_name
      ? `<div class="msg-sender-name">${_esc(msg.display_name)}</div>` : '';

    const replyQuote = _replyQuoteHtml(msg.reply_to);
    let bubble = '';

    if (isDeleted) {
      bubble = `<div class="bubble deleted-msg">
        <span class="material-icons-round" style="font-size:14px;vertical-align:middle">delete</span>
        This message was deleted</div>`;
    } else if (msg.msg_type === 'image') {
      bubble = `<div class="bubble" style="padding:4px">
        ${replyQuote ? `<div style="padding:6px 6px 0">${replyQuote}</div>` : ''}
        <div class="bubble-img" data-img="${_attr(msg.message)}" data-name="${_attr(msg.file_name||'image.jpg')}">
          <img src="${_attr(msg.message)}" alt="" loading="lazy" style="max-height:280px">
        </div></div>`;
    } else if (msg.msg_type === 'video') {
      bubble = `<div class="bubble" style="padding:4px">
        ${replyQuote ? `<div style="padding:6px 6px 0">${replyQuote}</div>` : ''}
        <div class="bubble-video" data-vid="${_attr(msg.message)}">
          <video src="${_attr(msg.message)}" preload="metadata" playsinline></video>
          <div class="video-play-overlay"><span class="material-icons-round">play_circle_filled</span></div>
        </div></div>`;
    } else if (msg.msg_type === 'audio') {
      bubble = `<div class="bubble" style="padding:10px 13px">
        ${replyQuote}${_audioBubbleHtml(msg.message, msg.time)}</div>`;
    } else if (msg.msg_type === 'file') {
      bubble = `<div class="bubble" style="padding:10px 13px">
        ${replyQuote}${_fileBubbleHtml(msg.message)}</div>`;
    } else if (msg.msg_type === 'poll') {
      bubble = `<div class="bubble" style="padding:11px 13px">
        ${replyQuote}${_pollBubbleHtml(msg, me?.id, 'poll')}</div>`;
    } else if (msg.msg_type === 'quiz') {
      bubble = `<div class="bubble" style="padding:11px 13px">
        ${replyQuote}${_pollBubbleHtml(msg, me?.id, 'quiz')}</div>`;
    } else {
      const rawText = msg._plainText
        || (msg.encrypted && msg.msg_type === 'text' ? Encryption.decrypt(msg.message, _chatId) : msg.message);
      const url  = _extractUrl(rawText);
      const edit = msg.edited ? `<span class="edited-mark">(edited)</span>` : '';
      bubble = `<div class="bubble${isFailed?' failed-bubble':''}" data-t="${_attr(msg.time)}">
        ${replyQuote}${_parseMarkdown(rawText)}${edit}${url ? _linkPreviewHtml(url) : ''}
      </div>`;
    }

    const tickIcon = isFailed
      ? `<span class="material-icons-round msg-tick" style="color:var(--danger)">error</span>`
      : isOpt ? `<span class="material-icons-round msg-tick pending">schedule</span>`
      : otherRead ? `<span class="material-icons-round msg-tick read">done_all</span>`
      : `<span class="material-icons-round msg-tick delivered">done_all</span>`;

    return `<div class="msg-row ${cls}${isOpt?' optimistic':''}${isFailed?' failed':''}" data-t="${_attr(msg.time)}">
      ${sn}${bubble}
      <div class="msg-meta">
        <span class="msg-time">${time}</span>
        ${isSent ? tickIcon : ''}
        ${isFailed ? `<span class="retry-btn" data-t="${_attr(msg.time)}">Retry</span>` : ''}
      </div>
      ${_reactionsHtml(msg, me?.id)}
    </div>`;
  };

  const _bindRow = (row, msg) => {
    row.querySelector('.bubble-img')?.addEventListener('click', () =>
      _showMediaFS(msg.message, 'image', msg.file_name || 'image.jpg')
    );
    row.querySelector('.bubble-video')?.addEventListener('click', () =>
      _showMediaFS(msg.message, 'video', 'video.mp4')
    );
    const ab = row.querySelector('.audio-bubble-el');
    if (ab) _bindAudioBubble(ab);

    row.querySelectorAll('.poll-opt-btn').forEach(btn =>
      btn.addEventListener('click', () => _votePoll(btn.dataset.t, btn.dataset.idx, btn.dataset.ptype || 'poll'))
    );

    row.querySelectorAll('.file-dl-btn').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const fileData = _safeJson(msg.message);
        if (fileData) {
          if (fileData.mime_type === 'application/pdf') {
            _showMediaFS(fileData.url, 'pdf', fileData.name || 'document.pdf');
          } else {
            Server.downloadFile(fileData.url, fileData.name || 'file');
          }
        }
      })
    );

    row.querySelectorAll('.reaction-pill').forEach(pill =>
      pill.addEventListener('click', e => { e.stopPropagation(); _toggleReaction(pill.dataset.t, pill.dataset.key); })
    );

    row.querySelectorAll('.retry-btn').forEach(btn =>
      btn.addEventListener('click', () => { const m = _findMsg(btn.dataset.t); if (m) _retryFailed(m); })
    );

    row.querySelectorAll('.reply-quote[data-scroll-to]').forEach(el =>
      el.addEventListener('click', () => _scrollToMessage(el.dataset.scrollTo))
    );

    row.querySelectorAll('.link-preview').forEach(a =>
      a.addEventListener('click', e => { e.stopPropagation(); window.open(a.href,'_blank','noopener'); })
    );

    const bubble = row.querySelector('.bubble');
    if (bubble && !msg.deleted && msg.msg_type !== 'system') {
      _attachLongPress(bubble, msg);
    }
  };

  const _scrollToMessage = (msgTime) => {
    const area   = document.getElementById('cw-msgs'); if (!area) return;
    const escaped = msgTime ? msgTime.replace(/["\\]/g, c => `\\${c}`) : '';
    const target = area.querySelector(`[data-t="${escaped}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const bbl = target.querySelector('.bubble') || target;
    bbl.style.transition = 'background 0s';
    bbl.style.background = 'var(--accent-dim)';
    requestAnimationFrame(() => {
      bbl.style.transition = 'background 0.9s ease';
      bbl.style.background = '';
      setTimeout(() => { bbl.style.transition = ''; }, 900);
    });
  };

  const _scrollBottom = () => {
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      const area = document.getElementById('cw-msgs');
      if (area) area.scrollTop = area.scrollHeight;
    });
  };

  /* ── REPLY BAR ────────────────────────────────────────────── */
  const _setReply = (msg) => {
    _replyTo = msg;
    const bar = document.getElementById('reply-bar'); if (!bar) return;
    document.getElementById('reply-bar-sender').textContent = msg.display_name || msg.username || 'Message';
    document.getElementById('reply-bar-preview').textContent =
      ['image','video','audio','file','poll','quiz'].includes(msg.msg_type)
        ? msg.msg_type.charAt(0).toUpperCase() + msg.msg_type.slice(1)
        : (msg.message || '').slice(0, 80);
    bar.classList.add('show');
    document.getElementById('cw-ta')?.focus();
  };

  const _clearReply = () => {
    _replyTo = null;
    document.getElementById('reply-bar')?.classList.remove('show');
  };

  /* ── ATTACH ──────────────────────────────────────────────── */
  const _toggleAttach = () => _attachOpen ? _closeAttach() : _openAttach();
  const _openAttach   = () => {
    document.getElementById('attach-overlay')?.classList.add('open');
    document.getElementById('cw-insert')?.classList.add('active');
    _attachOpen = true;
  };
  const _closeAttach  = () => {
    document.getElementById('attach-overlay')?.classList.remove('open');
    document.getElementById('cw-insert')?.classList.remove('active');
    _attachOpen = false;
  };

  /* ── AUDIO RECORDING ──────────────────────────────────────── */
  const _startAudioRec = async () => {
    if (_isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _audioChunks = []; _audioSecs = 0; _isRecording = true;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      _audioRec = new MediaRecorder(stream, { mimeType: mime });
      _audioRec.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
      _audioRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (_audioSecs < 1) { App.showToast('Recording too short', 'error'); return; }
        await _sendAudioBlob(new Blob(_audioChunks, { type: mime }), _audioSecs);
      };
      _audioRec.start(100);
      const btn = document.getElementById('cw-mic');
      if (btn) { btn.classList.add('recording'); btn.querySelector('.material-icons-round').textContent = 'stop'; }
      _audioTimer = setInterval(() => {
        _audioSecs++;
        const b = document.getElementById('cw-mic');
        if (b) b.title = `${Math.floor(_audioSecs/60)}:${String(_audioSecs%60).padStart(2,'0')} — tap to stop`;
      }, 1000);
    } catch { App.showToast('Microphone access denied', 'error'); _isRecording = false; }
  };

  const _stopAudioRec = () => {
    if (!_isRecording) return;
    clearInterval(_audioTimer); _isRecording = false; _audioRec?.stop();
    const btn = document.getElementById('cw-mic');
    if (btn) { btn.classList.remove('recording'); btn.querySelector('.material-icons-round').textContent = 'mic'; btn.title = 'Voice message'; }
  };

  /* ── SEND ─────────────────────────────────────────────────── */
  const _myMeta = () => {
    const me = Server.currentUser; const d = Server.currentProfile?.data || {};
    return { sender_id: me?.id||'', username: d.username||'', display_name: d.display_name||me?.display_name||'Me' };
  };
  const _buildReplyTo = () => {
    if (!_replyTo) return undefined;
    return { time: _replyTo.time, sender_name: _replyTo.display_name||_replyTo.username||'Message', message: _replyTo.message, msg_type: _replyTo.msg_type };
  };

  const _optimisticSend = async (msg) => {
    const tmp = { ...msg, _optimistic: true };
    _msgs.push(tmp); _msgHash = JSON.stringify(_msgs);
    const area   = document.getElementById('cw-msgs');
    if (area) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = _msgRowHtml(tmp);
      const row = wrapper.firstElementChild;
      if (row) { _bindRow(row, tmp); area.appendChild(row); }
    }
    _scrollBottom(); _clearReply();
    try {
      const serverMsgs = await Server.sendChatMessage(_chatId, msg);
      _msgs = _applyDisappearing(serverMsgs);
      _msgHash = JSON.stringify(_msgs);
      SyncManager.store.set(SYNC_KEY(_chatId), _msgHash);
      SyncManager.initChatDelta(_chatId, _msgs);
      _renderMessages();
    } catch {
      _msgs = _msgs.map(m => m === tmp ? { ...m, _optimistic: false, _failed: true } : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
    }
  };

  const _retryFailed = async (msg) => {
    _msgs = _msgs.filter(m => m !== msg && m.time !== msg.time);
    const c = { ...msg }; delete c._failed; delete c._optimistic;
    await _optimisticSend(c);
  };

  const _optimisticSendEncrypted = async (displayMsg, serverMsg) => {
    const tmp = { ...displayMsg, _optimistic: true };
    _msgs.push(tmp); _msgHash = JSON.stringify(_msgs);
    const area = document.getElementById('cw-msgs');
    if (area) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = _msgRowHtml(tmp);
      const row = wrapper.firstElementChild;
      if (row) { _bindRow(row, tmp); area.appendChild(row); }
    }
    _scrollBottom(); _clearReply();
    try {
      const serverMsgs = await Server.sendChatMessage(_chatId, serverMsg);
      _msgs = _applyDisappearing(serverMsgs).map(m => {
        if (m.encrypted && m.msg_type === 'text') {
          return { ...m, _plainText: Encryption.decrypt(m.message, _chatId) };
        }
        return m;
      });
      _msgHash = JSON.stringify(_msgs);
      SyncManager.store.set(SYNC_KEY(_chatId), _msgHash);
      SyncManager.initChatDelta(_chatId, _msgs);
      _renderMessages();
    } catch {
      _msgs = _msgs.map(m => m === tmp ? { ...m, _optimistic: false, _failed: true } : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
    }
  };

  const _sendFromInput = async () => {
    const ta = document.getElementById('cw-ta'); const text = ta?.value.trim(); if (!text) return;
    ta.value = ''; ta.style.height = 'auto'; await _sendText(text);
  };
  const _sendText = async (text) => {
    if (!_chatId || !text) return;
    const rt      = _buildReplyTo();
    const payload = Encryption.encrypt(text, _chatId);
    const msg     = { ..._myMeta(), message: payload, encrypted: true, time: _now(), msg_type: 'text' };
    if (rt) msg.reply_to = rt;
    const displayMsg = { ...msg, message: text, encrypted: false, _localPlain: true };
    await _optimisticSendEncrypted(displayMsg, msg);
  };
  const _sendImageFile = async (f) => {
    App.showToast('Compressing...');
    const url = await Server.uploadCompressedImage(f, 'spark_chat_imgs');
    if (!url) { App.showToast('Upload failed','error'); return; }
    const rt = _buildReplyTo(); const msg = { ..._myMeta(), message: url, time: _now(), msg_type:'image' };
    if (rt) msg.reply_to = rt; await _optimisticSend(msg);
  };
  const _sendVideoFile = async (f) => {
    App.showToast('Uploading video...');
    const data = await Server.uploadFile(f, 'spark_chat_videos');
    if (!data) { App.showToast('Upload failed','error'); return; }
    const rt = _buildReplyTo(); const msg = { ..._myMeta(), message: data.url, time: _now(), msg_type:'video' };
    if (rt) msg.reply_to = rt; await _optimisticSend(msg);
  };
  const _sendGenericFile = async (f) => {
    App.showToast(`Uploading ${f.name}...`);
    const data = await Server.uploadFile(f, 'spark_files');
    if (!data) { App.showToast('Upload failed','error'); return; }
    const rt = _buildReplyTo(); const msg = { ..._myMeta(), message: JSON.stringify(data), time: _now(), msg_type:'file' };
    if (rt) msg.reply_to = rt; await _optimisticSend(msg);
  };
  const _sendAudioFile = async (f) => {
    App.showToast('Uploading audio...');
    const data = await Server.uploadFile(f, 'spark_chat_audio');
    if (!data) { App.showToast('Upload failed','error'); return; }
    const payload = JSON.stringify({ url: data.url, duration: 0, name: f.name });
    const rt = _buildReplyTo(); const msg = { ..._myMeta(), message: payload, time: _now(), msg_type:'audio' };
    if (rt) msg.reply_to = rt; await _optimisticSend(msg);
  };
  const _sendAudioBlob = async (blob, secs) => {
    App.showToast('Sending voice message...');
    try {
      const f = new File([blob], 'voice.webm', { type: blob.type });
      const data = await Server.uploadFile(f, 'spark_chat_audio');
      if (!data) throw new Error();
      const payload = JSON.stringify({ url: data.url, duration: secs });
      const rt = _buildReplyTo(); const msg = { ..._myMeta(), message: payload, time: _now(), msg_type:'audio' };
      if (rt) msg.reply_to = rt; await _optimisticSend(msg);
    } catch { App.showToast('Voice send failed','error'); }
  };

  /* ── AI IMAGE PROMPT ─────────────────────────────────────── */
  const _showAIImagePrompt = () => {
    const close = App.showModal(`
      <div style="padding:20px 20px 32px;display:flex;flex-direction:column;gap:14px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1);display:flex;align-items:center;gap:8px">
          <span style="background:linear-gradient(135deg,#0095f6,#bc1888);-webkit-background-clip:text;-webkit-text-fill-color:transparent">✦</span>
          Generate AI Image
        </h3>
        <p style="font-size:13px;color:var(--text-3)">Describe the image you want to create</p>
        <textarea id="ai-img-prompt" class="input-field" rows="3" maxlength="300"
          placeholder="e.g. A sunset over mountain peaks with golden light..."
          style="resize:none"></textarea>
        <div id="ai-img-err" class="auth-error"></div>
        <button class="eg-save-btn" id="ai-img-submit" style="background:linear-gradient(135deg,#0095f6,#bc1888)">
          <span class="material-icons-round">auto_awesome</span> Generate & Send
        </button>
      </div>`);

    document.getElementById('ai-img-submit').onclick = async () => {
      const prompt = document.getElementById('ai-img-prompt')?.value.trim();
      const errEl  = document.getElementById('ai-img-err');
      if (!prompt) { errEl.textContent='Please describe the image.'; errEl.classList.add('visible'); return; }
      const btn = document.getElementById('ai-img-submit');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff"></div> Generating...`;
      try {
        let imageUrl = await AriaBot.generateImage(prompt);
        // Strip any query params - Pollinations free tier restricts URLs with params
        imageUrl = imageUrl.split('?')[0];
        close();
        const rt  = _buildReplyTo();
        const msg = { ..._myMeta(), message: imageUrl, file_name: prompt, time: _now(), msg_type: 'image' };
        if (rt) msg.reply_to = rt;
        await _optimisticSend(msg);
      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-icons-round">auto_awesome</span> Generate & Send`;
        errEl.textContent = e.message || 'Generation failed.'; errEl.classList.add('visible');
      }
    };
  };

  /* ── POLL + QUIZ SHEET ───────────────────────────────────── */
  const _showPollSheet = (pollType = 'poll') => {
    const isQuiz  = pollType === 'quiz';
    let options   = ['', '']; let correctIdx = 0;
    const renderOpts = () => {
      const list = document.getElementById('poll-opts-list'); if (!list) return;
      list.innerHTML = options.map((o,i) => `
        <div class="poll-opt-row">
          ${isQuiz ? `<button class="quiz-correct-btn" data-i="${i}"
            style="width:28px;height:28px;border-radius:50%;flex-shrink:0;cursor:pointer;
              border:2px solid ${i===correctIdx?'var(--success)':'var(--border-light)'};
              background:${i===correctIdx?'rgba(45,213,91,0.15)':'none'};
              display:flex;align-items:center;justify-content:center;transition:all 0.15s">
            <span class="material-icons-round" style="font-size:14px;color:${i===correctIdx?'var(--success)':'var(--text-3)'}">
              ${i===correctIdx?'check_circle':'radio_button_unchecked'}
            </span></button>` : ''}
          <input type="text" class="poll-opt-inp" data-i="${i}"
            placeholder="Option ${i+1}" value="${_attr(o)}" maxlength="60">
          ${options.length > 2 ? `<div class="poll-opt-del" data-i="${i}">
            <span class="material-icons-round" style="font-size:18px">close</span>
          </div>` : ''}
        </div>`).join('');
      list.querySelectorAll('.poll-opt-inp').forEach(inp =>
        inp.addEventListener('input', e => { options[+e.target.dataset.i] = e.target.value; })
      );
      list.querySelectorAll('.poll-opt-del').forEach(btn =>
        btn.addEventListener('click', () => { options.splice(+btn.dataset.i,1); if(correctIdx>=options.length)correctIdx=0; renderOpts(); })
      );
      if (isQuiz) {
        list.querySelectorAll('.quiz-correct-btn').forEach(btn =>
          btn.addEventListener('click', () => { correctIdx = +btn.dataset.i; renderOpts(); })
        );
      }
    };

    const close = App.showModal(`
      <div class="poll-sheet">
        <h3>
          <span class="material-icons-round" style="color:var(--accent)">${isQuiz?'quiz':'poll'}</span>
          Create ${isQuiz ? 'Quiz' : 'Poll'}
        </h3>
        ${isQuiz ? `<p style="font-size:12px;color:var(--text-3);text-align:center;margin-top:-6px">
          Tap the circle button to mark the correct answer</p>` : ''}
        <div>
          <label class="auth-label" style="display:block;margin-bottom:6px">Question *</label>
          <input id="poll-q" class="input-field" type="text"
            placeholder="${isQuiz?'Ask a quiz question...':'Ask a question...'}" maxlength="200">
        </div>
        ${isQuiz ? `<div>
          <label class="auth-label" style="display:block;margin-bottom:6px">Explanation (shown after answering)</label>
          <input id="poll-explain" class="input-field" type="text" placeholder="Optional..." maxlength="200">
        </div>` : ''}
        <div>
          <label class="auth-label" style="display:block;margin-bottom:8px">Options</label>
          <div class="poll-options-list" id="poll-opts-list"></div>
          <div class="poll-add-opt" id="poll-add-opt">
            <span class="material-icons-round" style="font-size:18px">add_circle_outline</span>
            Add option
          </div>
        </div>
        <div id="poll-err" class="auth-error"></div>
        <button class="poll-submit" id="poll-submit">
          <span class="material-icons-round" style="font-size:18px">${isQuiz?'quiz':'poll'}</span>
          Create ${isQuiz?'Quiz':'Poll'}
        </button>
      </div>`);

    renderOpts();
    document.getElementById('poll-add-opt').onclick = () => { if(options.length>=8)return; options.push(''); renderOpts(); };
    document.getElementById('poll-submit').onclick = async () => {
      const question  = document.getElementById('poll-q').value.trim();
      const explain   = isQuiz ? (document.getElementById('poll-explain')?.value.trim()||'') : '';
      const validOpts = options.map(o=>o.trim()).filter(Boolean);
      const errEl     = document.getElementById('poll-err'); errEl.classList.remove('visible');
      if (!question)            { errEl.textContent='Enter a question.'; errEl.classList.add('visible'); return; }
      if (validOpts.length < 2) { errEl.textContent='Add at least 2 options.'; errEl.classList.add('visible'); return; }
      const data = { question, explanation: explain,
        options: validOpts.map((text,i) => ({ text, votes:[], is_correct: isQuiz ? i===correctIdx : undefined })),
        created_at: _now(), poll_type: pollType };
      close();
      const rt = _buildReplyTo();
      const msg = { ..._myMeta(), message: JSON.stringify(data), time: _now(), msg_type: pollType };
      if (rt) msg.reply_to = rt; await _optimisticSend(msg);
    };
  };

  const _votePoll = async (msgTime, optIdx, pollType='poll') => {
    const me  = Server.currentUser; if (!me?.id) return;
    const msg = _findMsg(msgTime); if (!msg) return;
    const pd  = _safeJson(msg.encrypted ? Encryption.decrypt(msg.message, _chatId) : msg.message);
    if (!pd) return;
    if (pd.options.some(o => (o.votes||[]).includes(me.id))) return;
    const opts = pd.options.map((opt, i) => ({
      ...opt, votes: i === +optIdx ? [...(opt.votes||[]), me.id] : (opt.votes||[])
    }));
    const updated   = { ...pd, options: opts };
    const newPayload = JSON.stringify(updated);
    const stored    = msg.encrypted ? Encryption.encrypt(newPayload, _chatId) : newPayload;
    _msgs = _msgs.map(m => m.time === msgTime ? { ...m, message: stored } : m);
    _msgHash = JSON.stringify(_msgs);
    SyncManager.patchMessage(msgTime, row => {
      const card = row.querySelector('.poll-card, .quiz-card');
      if (!card) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = _pollBubbleHtml({ ...msg, message: newPayload }, me.id, pollType);
      const newCard = tmp.firstElementChild;
      if (newCard) {
        card.replaceWith(newCard);
        row.querySelectorAll('.poll-opt-btn').forEach(btn =>
          btn.addEventListener('click', () =>
            _votePoll(btn.dataset.t, btn.dataset.idx, btn.dataset.ptype || 'poll')
          )
        );
      }
    });
    Server.editMessage(_chatId, msgTime, stored).catch(() => {});
  };

  /* ── POLL BUBBLE HTML ─────────────────────────────────────── */
  const _pollBubbleHtml = (msg, myId, pollType='poll') => {
    const pd = _safeJson(msg.message); if (!pd) return _esc(msg.message);
    const isQuiz  = pollType === 'quiz';
    const { question, options, explanation } = pd;
    const totalVotes = options.reduce((s,o) => s+(o.votes||[]).length, 0);
    const hasVoted   = options.some(o => (o.votes||[]).includes(myId));
    const myOptIdx   = options.findIndex(o => (o.votes||[]).includes(myId));

    if (isQuiz) {
      const explainHtml = hasVoted && explanation
        ? `<div class="quiz-explain-text">
            <span class="material-icons-round">info</span>${_esc(explanation)}
          </div>` : '';
      const optHtml = options.map((opt,i) => {
        const votes = (opt.votes||[]).length;
        const pct   = totalVotes ? Math.round(votes/totalVotes*100) : 0;
        const mine  = i === myOptIdx;
        const isCorrect = opt.is_correct === true;
        let stateCls='', iconName='', iconCls='neutral';
        if (hasVoted) {
          if (mine && isCorrect)  { stateCls='correct-ans'; iconName='check_circle'; iconCls='correct'; }
          else if (mine)          { stateCls='wrong-ans';   iconName='cancel';       iconCls='wrong';   }
          else if (isCorrect)     { stateCls='correct-ans'; iconName='check_circle'; iconCls='correct'; }
          else                    { stateCls='neutral-bar'; iconName='radio_button_unchecked'; iconCls='neutral'; }
        }
        return `<div class="quiz-option ${stateCls} ${hasVoted?'answered':'poll-opt-btn'}"
          data-t="${_attr(msg.time)}" data-idx="${i}" data-ptype="quiz">
          <div class="quiz-option-bar" style="width:${hasVoted?pct:0}%"></div>
          <div class="quiz-option-content">
            <span class="quiz-opt-text">${_esc(opt.text)}</span>
            <div style="display:flex;align-items:center;gap:4px">
              ${hasVoted && pct>0 ? `<span class="quiz-pct">${pct}%</span>` : ''}
              <span class="quiz-opt-icon ${iconCls}">
                <span class="material-icons-round">${iconName||'radio_button_unchecked'}</span>
              </span>
            </div>
          </div>
        </div>`;
      }).join('');
      return `<div class="quiz-card">
        <div class="quiz-card-header">
          <span class="quiz-tag"><span class="material-icons-round" style="font-size:11px;vertical-align:middle">quiz</span> Quiz</span>
          ${hasVoted ? `<span class="quiz-answered-badge"><span class="material-icons-round">check_circle</span> Answered</span>` : ''}
        </div>
        <div class="quiz-question">${_esc(question)}</div>
        ${explainHtml}${optHtml}
        <div class="quiz-footer"><span class="material-icons-round">people</span>${totalVotes} answer${totalVotes!==1?'s':''}</div>
      </div>`;
    }

    const optHtml = options.map((opt,i) => {
      const votes = (opt.votes||[]).length;
      const pct   = totalVotes ? Math.round(votes/totalVotes*100) : 0;
      const mine  = i === myOptIdx;
      return `<div class="poll-option ${hasVoted?'voted':''} ${mine?'my-vote':''} ${!hasVoted?'poll-opt-btn':''}"
        data-t="${_attr(msg.time)}" data-idx="${i}" data-ptype="poll">
        <div class="poll-option-bar" style="width:${hasVoted?pct:0}%"></div>
        <div class="poll-option-content">
          <span class="poll-opt-text">${_esc(opt.text)}</span>
          <div class="poll-opt-right">
            ${hasVoted ? `<span class="poll-pct">${pct}%</span>` : ''}
            <span class="material-icons-round" style="font-size:16px">${mine?'check_circle':'radio_button_unchecked'}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="poll-card">
      <div class="poll-card-header"><span class="material-icons-round">poll</span><span class="poll-card-tag">Poll</span></div>
      <div class="poll-question">${_esc(question)}</div>
      ${optHtml}
      <div class="poll-footer"><span class="material-icons-round">people</span>${totalVotes} vote${totalVotes!==1?'s':''}</div>
    </div>`;
  };

  /* ── REACTIONS ────────────────────────────────────────────── */
  const _toggleReaction = async (msgTime, key) => {
    if (!msgTime || !key || !_chatId) return;
    const me = Server.currentUser;
    _msgs = _msgs.map(m => {
      if (m.time !== msgTime) return m;
      const r = {...(m.reactions||{})}; const u = r[key]||[];
      r[key] = u.includes(me.id) ? u.filter(id=>id!==me.id) : [...u,me.id];
      if (!r[key].length) delete r[key]; return {...m, reactions: r};
    });
    _msgHash = JSON.stringify(_msgs);
    const msg = _findMsg(msgTime);
    if (msg) {
      SyncManager.patchMessage(msgTime, row => {
        const old = row.querySelector('.msg-reactions');
        const newHtml = _reactionsHtml(msg, me.id);
        if (old) old.outerHTML = newHtml || '';
        else if (newHtml) row.insertAdjacentHTML('beforeend', newHtml);
      });
    }
    Server.addReaction(_chatId, msgTime, key, me.id).catch(() => {});
  };

  const _reactionsHtml = (msg, myId) => {
    const r = msg.reactions || {};
    const keys = Object.keys(r).filter(k => (r[k]||[]).length > 0); if (!keys.length) return '';
    return `<div class="msg-reactions">${keys.map(key => {
      const cnt = (r[key]||[]).length; const mine = (r[key]||[]).includes(myId);
      const rxn = REACTIONS.find(x => x.key === key) || { icon:'favorite', color:'#ed4956' };
      return `<button class="reaction-pill ${mine?'mine':''}" data-t="${_attr(msg.time)}" data-key="${key}">
        <span class="material-icons-round" style="font-size:13px;color:${rxn.color}">${rxn.icon}</span>
        <span class="r-count">${cnt}</span></button>`;
    }).join('')}</div>`;
  };

  /* ── CONTEXT MENU ─────────────────────────────────────────── */
  const _attachLongPress = (el, msg) => {
    let t = null;
    const start  = () => { t = setTimeout(() => { navigator.vibrate?.(30); _showCtxMenu(msg); }, 580); };
    const cancel = () => clearTimeout(t);
    el.addEventListener('touchstart',  start,  { passive: true });
    el.addEventListener('touchend',    cancel);
    el.addEventListener('touchmove',   cancel);
    el.addEventListener('mousedown',   start);
    el.addEventListener('mouseup',     cancel);
    el.addEventListener('mouseleave',  cancel);
    el.addEventListener('contextmenu', e => { e.preventDefault(); cancel(); _showCtxMenu(msg); });
  };

  const _showCtxMenu = (msg) => {
    const me = Server.currentUser; const isOwn = msg.sender_id === me?.id;
    const r  = msg.reactions || {};
    const reactionRow = REACTIONS.map(rxn => {
      const mine = (r[rxn.key]||[]).includes(me?.id);
      return `<button class="ctx-emoji-btn ${mine?'reacted':''}" data-key="${rxn.key}">
        <span class="material-icons-round" style="font-size:24px;color:${rxn.color}">${rxn.icon}</span>
      </button>`;
    }).join('');

    const close = App.showModal(`
      <div class="ctx-menu-wrap">
        <div class="ctx-emoji-row">${reactionRow}</div>
        <div class="ctx-action" id="ctx-reply"><span class="material-icons-round">reply</span> Reply</div>
        ${msg.msg_type==='text'?`<div class="ctx-action" id="ctx-copy"><span class="material-icons-round">content_copy</span> Copy</div>`:''}
        ${isOwn&&msg.msg_type==='text'?`<div class="ctx-action" id="ctx-edit"><span class="material-icons-round">edit</span> Edit Message</div>`:''}
        ${msg.msg_type==='image'?`<div class="ctx-action" id="ctx-save"><span class="material-icons-round">download</span> Save Image</div>`:''}
        ${isOwn?`<div class="ctx-action danger" id="ctx-del"><span class="material-icons-round">delete</span> Delete</div>`:''}
      </div>`);

    document.querySelectorAll('.ctx-emoji-btn').forEach(btn =>
      btn.addEventListener('click', () => { close(); _toggleReaction(msg.time, btn.dataset.key); })
    );
    document.getElementById('ctx-reply').onclick = () => { close(); _setReply(msg); };
    document.getElementById('ctx-copy')?.addEventListener('click', () => {
      close(); navigator.clipboard?.writeText(msg.message).catch(() => {}); App.showToast('Copied');
    });
    document.getElementById('ctx-edit')?.addEventListener('click', () => { close(); _startEdit(msg); });
    document.getElementById('ctx-save')?.addEventListener('click', () => { close(); Server.downloadFile(msg.message, 'image.jpg'); });
    document.getElementById('ctx-del')?.addEventListener('click', () => { close(); _confirmDelete(msg); });
  };

  const _startEdit = (msg) => {
    const close = App.showModal(`
      <div style="padding:20px 16px 30px;display:flex;flex-direction:column;gap:14px">
        <h3 style="font-size:16px;font-weight:800;color:var(--text-1)">Edit Message</h3>
        <textarea id="edit-ta" class="cw-textarea"
          style="width:100%;min-height:80px;border-radius:12px;padding:10px">${_escAttr(msg.message)}</textarea>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="edit-cancel" style="flex:1">Cancel</button>
          <button class="btn-primary" id="edit-save" style="flex:1">Save</button>
        </div>
      </div>`);
    document.getElementById('edit-cancel')?.addEventListener('click', close);
    document.getElementById('edit-save')?.addEventListener('click', async () => {
      const t = document.getElementById('edit-ta')?.value.trim(); if (!t||t===msg.message) { close(); return; }
      close(); _msgs = _msgs.map(m => m.time===msg.time ? {...m, message:t, edited:true} : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
      Server.editMessage(_chatId, msg.time, t).catch(() => {});
    });
  };

  const _confirmDelete = (msg) => {
    const close = App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--danger)">delete</span>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Delete Message?</h3>
        <p style="font-size:13px;color:var(--text-3)">This will be removed for everyone.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="del-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="del-confirm" style="flex:1">Delete</button>
        </div>
      </div>`);
    document.getElementById('del-cancel')?.addEventListener('click', close);
    document.getElementById('del-confirm')?.addEventListener('click', async () => {
      close(); _msgs = _msgs.map(m => m.time===msg.time ? {...m,deleted:true,msg_type:'deleted',message:''} : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
      Server.deleteMessage(_chatId, msg.time).catch(() => {});
    });
  };

  const _confirmClearChat = () => {
    const close = App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--danger)">cleaning_services</span>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Clear Chat?</h3>
        <p style="font-size:13px;color:var(--text-3)">All messages will be permanently deleted.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="cc-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="cc-confirm" style="flex:1">Clear</button>
        </div>
      </div>`);
    document.getElementById('cc-cancel').onclick = close;
    document.getElementById('cc-confirm').onclick = async () => {
      close(); App.showToast('Clearing...');
      try {
        await Server.clearChat(_chatId); _msgs = []; _msgHash = '{}';
        SyncManager.invalidate(SYNC_KEY(_chatId)); _renderMessages();
        App.showToast('Chat cleared','success');
      } catch { App.showToast('Failed to clear','error'); }
    };
  };

  const _showDisappearingSheet = () => {
    const current = _chatRec?.data?.disappearing_days ?? 90;
    const close = App.showModal(`
      <div style="padding:20px 0 30px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1);text-align:center;padding:0 20px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;gap:8px">
          <span class="material-icons-round" style="color:var(--warning)">timer</span>
          Disappearing Messages
        </h3>
        ${DISAPPEAR_OPTIONS.map(opt => `
          <div class="ctx-action disappear-opt" data-days="${opt.days??'null'}" style="justify-content:space-between">
            <span>${opt.label}</span>
            ${(opt.days===current)||(opt.days===null&&!current)
              ? `<span class="material-icons-round" style="color:var(--accent)">check</span>` : ''}
          </div>`).join('')}
      </div>`);
    document.querySelectorAll('.disappear-opt').forEach(el => {
      el.addEventListener('click', async () => {
        const days = el.dataset.days==='null' ? null : +el.dataset.days;
        await Server.setDisappearing(_chatId, days);
        if (_chatRec?.data) _chatRec.data.disappearing_days = days;
        close(); App.showToast(`Disappearing: ${days?`${days} days`:'Off'}`, 'success');
        _buildUI(); _renderMessages();
      });
    });
  };

  /* ── MEDIA FULLSCREEN ─────────────────────────────────────── */
  const _showMediaFS = (url, type, fileName) => {
    if (!url) return;
    const el = document.createElement('div');
    el.className = 'media-fs';
    let contentHtml = '';
    if (type === 'image') {
      contentHtml = `<img id="mfs-img" class="media-fs-img" src="${_attr(url)}" alt="">`;
    } else if (type === 'video') {
      contentHtml = `<video class="media-fs-video" src="${_attr(url)}" controls autoplay playsinline></video>`;
    } else if (type === 'pdf') {
      contentHtml = `<iframe class="media-fs-pdf" src="${_attr(url)}" title="${_attr(fileName)}"></iframe>`;
    }
    el.innerHTML = `
      <div class="media-fs-toolbar">
        <button class="media-fs-back" id="mfs-close"><span class="material-icons-round">arrow_back</span></button>
        <div class="media-fs-title">
          <div class="media-fs-title-main">${_esc(fileName || 'Media')}</div>
          <div class="media-fs-title-sub">${_esc(type.toUpperCase())}</div>
        </div>
        <div class="media-fs-zoom-badge" id="mfs-zoom-badge">1×</div>
        ${type !== 'video' ? `<button class="media-fs-action" id="mfs-share" title="Share"><span class="material-icons-round">share</span></button>` : ''}
        <button class="media-fs-action" id="mfs-download" title="Download"><span class="material-icons-round">download</span></button>
      </div>
      <div class="media-fs-content" id="mfs-content">${contentHtml}</div>
      <div class="media-fs-bottom"><div class="media-fs-caption">${_esc(fileName || '')}</div></div>`;
    document.body.appendChild(el);
    document.getElementById('mfs-close').onclick = () => el.remove();
    el.addEventListener('click', e => { if (e.target === el || e.target === document.getElementById('mfs-content')) el.remove(); });
    document.getElementById('mfs-download').onclick = () => Server.downloadFile(url, fileName || 'file');
    document.getElementById('mfs-share')?.addEventListener('click', () => {
      if (navigator.share) { navigator.share({ title: fileName || 'Shared file', url }).catch(() => {}); }
      else { navigator.clipboard?.writeText(url).then(() => App.showToast('Link copied!')).catch(() => {}); }
    });
    if (type === 'image') {
      const img = document.getElementById('mfs-img');
      let scale = 1; let initDist = 0; let initScale = 1;
      el.addEventListener('touchstart', e => { if (e.touches.length === 2) { initDist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); initScale = scale; } }, { passive: true });
      el.addEventListener('touchmove', e => { if (e.touches.length !== 2) return; const dist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); scale = Math.min(Math.max(initScale*(dist/initDist),1),4); img.style.transform=`scale(${scale})`; const badge=document.getElementById('mfs-zoom-badge'); if(badge){badge.textContent=`${scale.toFixed(1)}×`;badge.classList.add('show');} }, { passive: true });
      el.addEventListener('touchend', () => { setTimeout(() => { document.getElementById('mfs-zoom-badge')?.classList.remove('show'); }, 1500); });
      let lastTap = 0;
      img.addEventListener('click', () => { const now=Date.now(); if(now-lastTap<300){scale=1;img.style.transform='scale(1)';} lastTap=now; });
    }
  };

  /* ── DIRECT / GROUP MENUS ─────────────────────────────────── */
  const _showDirectMenu = () => {
    const d   = _chatRec.data; const me = Server.currentUser;
    const pm  = d.participant_meta||{}; const oid = (d.participants||[]).find(id=>id!==me?.id)||'';
    const o   = pm[oid] || {};
    App.showModal(`
      <div style="padding:0 0 20px">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          ${App.avatar(o.avatar_url, o.display_name, 'av-md')}
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--text-1)">${_esc(o.display_name||'User')}</div>
            <div style="font-size:12px;color:var(--text-3)">@${_esc(o.username||'')}</div>
          </div>
        </div>
        <div class="ctx-action" id="dm-disappear"><span class="material-icons-round" style="color:var(--warning)">timer</span> Disappearing Messages</div>
        <div class="ctx-action" id="dm-conv"><span class="material-icons-round" style="color:var(--accent)">group_add</span> Convert to Group Chat</div>
        <div class="ctx-action danger" id="dm-clear"><span class="material-icons-round">cleaning_services</span> Clear Chat</div>
      </div>`);
    document.getElementById('dm-disappear').onclick = () => { App.closeModal(); _showDisappearingSheet(); };
    document.getElementById('dm-conv').onclick  = () => { App.closeModal(); _showConvertToGroup(); };
    document.getElementById('dm-clear').onclick = () => { App.closeModal(); _confirmClearChat(); };
  };

  const _showGroupInfo = () => {
    const d = _chatRec.data; const me = Server.currentUser; const pm = d.participant_meta||{};
    const color = d.color||'#0095f6'; const initial = (d.name||'G')[0].toUpperCase();
    const count = d.member_count||(d.participants||[]).length;
    const isCreator = d.created_by===me?.id; const isPublic = d.is_public!==false;
    const adminOnly = d.admin_only_messages===true;

    const memberRows = (d.participants||[]).map(uid => {
      const m=pm[uid]||{display_name:'User',username:'?',avatar_url:''}; const isMe=uid===me?.id; const isAdm=uid===d.created_by;
      return `<div class="gi-member">${App.avatar(m.avatar_url,m.display_name,'av-sm')}
        <div class="gi-member-info">
          <div class="gi-member-name">${_esc(m.display_name||'User')}</div>
          <div class="gi-member-user">@${_esc(m.username||'?')}</div>
        </div>
        ${isAdm?`<div class="gi-tag admin">Admin</div>`:''}${isMe&&!isAdm?`<div class="gi-tag you">You</div>`:''}
        ${isCreator&&!isMe?`<div class="gi-remove" data-uid="${uid}"><span class="material-icons-round">person_remove</span></div>`:''}</div>`;
    }).join('');

    App.showModal(`
      <div class="gi-sheet">
        <div class="gi-header-block">
          <div class="gi-av" style="background:${color}22;color:${color}">${d.avatar_url?`<img src="${_attr(d.avatar_url)}">`:initial}</div>
          <div class="gi-name">${_esc(d.name||'Group')}</div>
          ${d.description?`<div class="gi-desc">${_esc(d.description)}</div>`:''}
          <div class="gi-count"><span class="material-icons-round">group</span>${count} members &nbsp;<span class="material-icons-round" style="font-size:13px">${isPublic?'public':'lock'}</span>${isPublic?'Public':'Private'}${adminOnly?`<span style="margin-left:6px;font-size:11px;padding:2px 7px;border-radius:99px;background:rgba(240,160,48,0.15);color:var(--warning);font-weight:700">Admin only</span>`:''}</div>
          ${isCreator?`<div class="gi-actions"><button class="btn-ghost" id="gi-edit" style="padding:8px 16px;font-size:13px;display:flex;align-items:center;gap:6px"><span class="material-icons-round" style="font-size:16px">edit</span>Edit Group</button></div>`:''}
        </div>
        ${isCreator?`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0 10px;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-1);display:flex;align-items:center;gap:6px"><span class="material-icons-round" style="font-size:18px;color:var(--warning)">admin_panel_settings</span>Admin-only messages</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px">Only admin can send</div>
          </div>
          <label class="toggle-switch"><input type="checkbox" id="admin-only-toggle" ${adminOnly?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="ctx-action" id="gi-disappear" style="padding:12px 0"><span class="material-icons-round" style="color:var(--warning)">timer</span> Disappearing Messages<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${(d.disappearing_days??90)||'Off'} ${d.disappearing_days?'days':''}</span></div>` : ''}
        <div class="gi-sec-label">Members</div>${memberRows}
        <div class="gi-add-row" id="gi-add"><span class="material-icons-round">person_add</span>Add Member</div>
        <div class="gi-leave" id="gi-leave"><span class="material-icons-round">exit_to_app</span>Leave Group</div>
      </div>`);

    document.getElementById('gi-edit')?.addEventListener('click', () => { App.closeModal(); _showEditGroup(); });
    document.getElementById('gi-add').addEventListener('click', () => { App.closeModal(); _showAddMember(); });
    document.getElementById('gi-disappear')?.addEventListener('click', () => { App.closeModal(); _showDisappearingSheet(); });
    document.getElementById('admin-only-toggle')?.addEventListener('change', async e => {
      const val = e.target.checked;
      await Server.updateCommunity(_chatId, { admin_only_messages: val });
      if (_chatRec?.data) _chatRec.data.admin_only_messages = val;
      App.showToast(val ? 'Admin-only on' : 'Everyone can send', 'success');
      await Server.sendChatMessage(_chatId, { sender_id:'system', username:'', display_name:'',
        message: val ? 'Admin-only messages enabled.' : 'Everyone can now send messages.',
        time: _now(), msg_type:'system' }).catch(() => {});
      App.closeModal(); _buildUI(); _renderMessages();
    });
    document.querySelectorAll('.gi-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid=btn.dataset.uid; const meta=pm[uid]||{}; if(!confirm(`Remove ${meta.display_name||'this member'}?`)) return;
        try {
          await Server.removeMember(_chatId,uid);
          await Server.sendChatMessage(_chatId,{sender_id:'system',username:'',display_name:'',message:`${meta.display_name||'A member'} was removed.`,time:_now(),msg_type:'system'});
          App.closeModal(); App.showToast('Removed');
          _chatRec=await Server.getChatById(_chatId);
          if(_chatRec){_msgs=_applyDisappearing(_chatRec.data.messages||[]);_msgHash=JSON.stringify(_msgs);_renderMessages();}
        } catch { App.showToast('Failed','error'); }
      });
    });
    document.getElementById('gi-leave').addEventListener('click', async () => {
      App.closeModal(); await Server.leaveCommunity(_chatId,me.id).catch(()=>{});
      await Server.sendChatMessage(_chatId,{sender_id:'system',username:'',display_name:'',message:`${Server.currentProfile?.data.display_name||'Someone'} left.`,time:_now(),msg_type:'system'}).catch(()=>{});
      App.showToast('You left the group'); _close();
    });
  };

  const _showEditGroup = () => {
    const d=_chatRec.data; let selColor=d.color||COLORS[0]; let selPublic=d.is_public!==false; let avFile=null;
    const dots=COLORS.map(c=>`<div class="color-dot ${c===selColor?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join('');
    const close=App.showModal(`<div class="edit-group-sheet"><h3>Edit Group</h3>
      <div class="eg-av-pick"><label class="eg-av-btn" id="eg-av-lbl">
        ${d.avatar_url?`<img src="${_attr(d.avatar_url)}" style="border-radius:16px">`:`<span class="material-icons-round">add_a_photo</span><span style="font-size:10px">Photo</span>`}
        <input type="file" accept="image/*" id="eg-av-in" style="display:none"></label></div>
      <div><label class="auth-label" style="display:block;margin-bottom:6px">Name *</label><input id="eg-name" class="input-field" type="text" value="${_attr(d.name||'')}" maxlength="60"></div>
      <div><label class="auth-label" style="display:block;margin-bottom:6px">Description</label><textarea id="eg-desc" class="input-field" rows="2" style="resize:none">${_attr(d.description||'')}</textarea></div>
      <div><label class="auth-label" style="display:block;margin-bottom:8px">Color</label><div class="color-row" id="eg-colors">${dots}</div></div>
      <div><label class="auth-label" style="display:block;margin-bottom:8px">Privacy</label>
        <div class="privacy-toggle">
          <button class="privacy-opt ${selPublic?'active':''}" data-v="true"><span class="material-icons-round">public</span>Public</button>
          <button class="privacy-opt ${!selPublic?'active':''}" data-v="false"><span class="material-icons-round">lock</span>Private</button>
        </div></div>
      <div id="eg-err" class="auth-error"></div>
      <button class="eg-save-btn" id="eg-save"><span class="material-icons-round">check</span>Save Changes</button>
    </div>`);
    document.getElementById('eg-av-in').addEventListener('change',e=>{avFile=e.target.files[0];if(!avFile)return;const rd=new FileReader();rd.onload=ev=>{const lbl=document.getElementById('eg-av-lbl');if(lbl)lbl.innerHTML=`<img src="${ev.target.result}" style="border-radius:16px;position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;};rd.readAsDataURL(avFile);});
    document.querySelectorAll('#eg-colors .color-dot').forEach(dot=>{dot.onclick=()=>{selColor=dot.dataset.c;document.querySelectorAll('#eg-colors .color-dot').forEach(d=>d.classList.remove('sel'));dot.classList.add('sel');};});
    document.querySelectorAll('.privacy-opt').forEach(opt=>{opt.onclick=()=>{selPublic=opt.dataset.v==='true';document.querySelectorAll('.privacy-opt').forEach(o=>o.classList.remove('active'));opt.classList.add('active');};});
    document.getElementById('eg-save').onclick=async()=>{
      const name=document.getElementById('eg-name').value.trim();const desc=document.getElementById('eg-desc').value.trim();
      const errEl=document.getElementById('eg-err');errEl.classList.remove('visible');
      if(!name){errEl.textContent='Name required.';errEl.classList.add('visible');return;}
      const btn=document.getElementById('eg-save');btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try{let avUrl=d.avatar_url||'';if(avFile){const url=await Server.uploadCompressedImage(avFile,'spark_comm_avatars');if(url)avUrl=url;}
        await Server.updateCommunity(_chatId,{name,description:desc,color:selColor,avatar_url:avUrl,is_public:selPublic});
        await Server.sendChatMessage(_chatId,{sender_id:'system',username:'',display_name:'',message:`Group updated: "${name}"`,time:_now(),msg_type:'system'});
        _chatRec=await Server.getChatById(_chatId);close();App.showToast('Group updated!','success');
        if(_chatRec){_msgs=_applyDisappearing(_chatRec.data.messages||[]);_msgHash=JSON.stringify(_msgs);_buildUI();_renderMessages();}
      }catch(e){btn.disabled=false;btn.innerHTML=`<span class="material-icons-round">check</span>Save Changes`;errEl.textContent=e.message||'Save failed.';errEl.classList.add('visible');}
    };
  };

  const _showConvertToGroup = () => {
    const added=[]; let srT=null;
    const close=App.showModal(`<div class="edit-group-sheet"><h3>Create Group Chat</h3>
      <div><label class="auth-label" style="display:block;margin-bottom:6px">Group Name *</label><input id="ctg-name" class="input-field" type="text" placeholder="Team Spark..." maxlength="60"></div>
      <div><label class="auth-label" style="display:block;margin-bottom:8px">Add Members</label>
        <div style="position:relative"><div class="chat-search-inner" style="border-radius:var(--radius-md)"><span class="material-icons-round">search</span><input id="ctg-sr" class="chat-search-input" type="text" placeholder="Search username..." autocomplete="off"></div>
        <div class="inline-search-result" id="ctg-res" style="display:none"></div></div>
        <div class="chips-row" id="ctg-chips" style="margin-top:10px"></div></div>
      <div id="ctg-err" class="auth-error"></div>
      <button class="eg-save-btn" id="ctg-ok"><span class="material-icons-round" style="font-size:18px">group_add</span>Create Group</button>
    </div>`);
    const renderChips=()=>{const c=document.getElementById('ctg-chips');if(!c)return;c.innerHTML=added.map((m,i)=>`<div class="member-chip">${_esc(m.display_name)}<span class="material-icons-round chip-x" data-i="${i}">close</span></div>`).join('');c.querySelectorAll('.chip-x').forEach(x=>x.addEventListener('click',()=>{added.splice(+x.dataset.i,1);renderChips();}));};
    document.getElementById('ctg-sr').addEventListener('input',e=>{clearTimeout(srT);const q=e.target.value.trim();const res=document.getElementById('ctg-res');if(!q){res.style.display='none';return;}res.style.display='block';res.innerHTML=`<div style="padding:10px;font-size:13px;color:var(--text-3)">Searching...</div>`;srT=setTimeout(async()=>{const found=await Server.getProfileByUsername(q);const me=Server.currentUser;const ex=_chatRec.data.participants||[];if(!found||found.data.user_id===me?.id||ex.includes(found.data.user_id)||added.some(m=>m.user_id===found.data.user_id)){res.innerHTML=`<div style="padding:10px;font-size:13px;color:var(--text-3)">${!found?'No user found.':'Already in chat.'}</div>`;return;}const fd=found.data;res.innerHTML=`<div class="inline-result-item" id="ctg-hit">${App.avatar(fd.avatar_url,fd.display_name,'av-sm')}<div><div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(fd.display_name)}</div><div style="font-size:12px;color:var(--text-3)">@${_esc(fd.username)}</div></div></div>`;document.getElementById('ctg-hit').onclick=()=>{added.push({user_id:fd.user_id,display_name:fd.display_name,username:fd.username,avatar_url:fd.avatar_url||''});renderChips();e.target.value='';res.style.display='none';};},350);});
    document.getElementById('ctg-ok').onclick=async()=>{const name=document.getElementById('ctg-name').value.trim();const errEl=document.getElementById('ctg-err');errEl.classList.remove('visible');if(!name){errEl.textContent='Name required.';errEl.classList.add('visible');return;}const btn=document.getElementById('ctg-ok');btn.disabled=true;btn.innerHTML=`<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;try{const updated=await Server.convertToGroup(_chatId,name,added);_chatRec=updated;await Server.sendChatMessage(_chatId,{sender_id:'system',username:'',display_name:'',message:`Chat converted to group: "${name}"`,time:_now(),msg_type:'system'});close();App.showToast('Group created!','success');await open(_chatId,_container,{onClose:_onClose,embedded:_embedded});}catch(e){btn.disabled=false;btn.innerHTML=`<span class="material-icons-round" style="font-size:18px">group_add</span>Create Group`;errEl.textContent=e.message||'Failed.';errEl.classList.add('visible');}};
  };

  const _showAddMember = () => {
    let t=null;
    App.showModal(`<div style="padding:20px 20px 32px;display:flex;flex-direction:column;gap:14px">
      <h3 style="font-size:18px;font-weight:800;color:var(--text-1);text-align:center">Add Member</h3>
      <div style="position:relative"><div class="chat-search-inner" style="border-radius:var(--radius-md)"><span class="material-icons-round">search</span><input id="am-sr" class="chat-search-input" type="text" placeholder="Search username..." autocomplete="off"></div>
      <div class="inline-search-result" id="am-res" style="display:none"></div></div>
      <div id="am-st" style="font-size:13px;color:var(--text-3);text-align:center"></div>
    </div>`);
    document.getElementById('am-sr').addEventListener('input',e=>{clearTimeout(t);const q=e.target.value.trim();const res=document.getElementById('am-res');if(!q){res.style.display='none';return;}res.style.display='block';res.innerHTML=`<div style="padding:10px;font-size:13px;color:var(--text-3)">Searching...</div>`;t=setTimeout(async()=>{const found=await Server.getProfileByUsername(q);const parts=_chatRec?.data?.participants||[];if(!found||parts.includes(found.data.user_id)){res.innerHTML=`<div style="padding:10px;font-size:13px;color:var(--text-3)">${!found?'Not found.':'Already a member.'}</div>`;return;}const fd=found.data;res.innerHTML=`<div class="inline-result-item" id="am-hit">${App.avatar(fd.avatar_url,fd.display_name,'av-sm')}<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(fd.display_name)}</div><div style="font-size:12px;color:var(--text-3)">@${_esc(fd.username)}</div></div><button class="btn-primary" style="padding:7px 14px;font-size:13px;flex-shrink:0">Add</button></div>`;document.getElementById('am-hit').querySelector('button').addEventListener('click',async()=>{const st=document.getElementById('am-st');if(st)st.textContent='Adding...';try{await Server.addMember(_chatId,fd.user_id,{display_name:fd.display_name,username:fd.username,avatar_url:fd.avatar_url||''});await Server.sendChatMessage(_chatId,{sender_id:'system',username:'',display_name:'',message:`${fd.display_name} was added.`,time:_now(),msg_type:'system'});_chatRec=await Server.getChatById(_chatId);if(_chatRec){_msgs=_applyDisappearing(_chatRec.data.messages||[]);_msgHash=JSON.stringify(_msgs);_renderMessages();}App.closeModal();App.showToast(`${fd.display_name} added!`,'success');}catch{if(st){st.textContent='Failed.';st.style.color='var(--danger)';}}});},350);});
  };

  /* ── AUDIO BUBBLE ─────────────────────────────────────────── */
  const _audioBubbleHtml = (messageStr, msgTime) => {
    const data=_safeJson(messageStr); const url=data?.url||messageStr; const dur=data?.duration||0;
    const m=Math.floor(dur/60),s=String(dur%60).padStart(2,'0');
    const bars=Array.from({length:26},(_,i)=>`<div class="audio-bar" style="height:${6+Math.abs(Math.sin(i*0.65+1)*9)+(i%4)*1.5}px"></div>`).join('');
    return `<div class="audio-bubble audio-bubble-el" data-url="${_attr(url)}" data-dur="${dur}" data-t="${_attr(msgTime)}">
      <button class="audio-play-btn" data-playing="0"><span class="material-icons-round">play_arrow</span></button>
      <div class="audio-waveform">${bars}</div>
      <span class="audio-dur">${m}:${s}</span></div>`;
  };

  const _bindAudioBubble = (el) => {
    const url=el.dataset.url; if(!url) return;
    const playBtn=el.querySelector('.audio-play-btn'); const bars=el.querySelectorAll('.audio-bar'); const durEl=el.querySelector('.audio-dur');
    if(!playBtn) return;
    const audio=new Audio(url);
    audio.ontimeupdate=()=>{if(!audio.duration)return;const p=audio.currentTime/audio.duration;const pl=Math.floor(p*bars.length);bars.forEach((b,i)=>b.classList.toggle('played',i<pl));const rem=Math.ceil(audio.duration-audio.currentTime);if(durEl)durEl.textContent=`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;};
    audio.onended=()=>{playBtn.dataset.playing='0';playBtn.querySelector('.material-icons-round').textContent='play_arrow';bars.forEach(b=>b.classList.remove('played'));};
    playBtn.onclick=()=>{if(audio.paused){document.querySelectorAll('.audio-bubble-el').forEach(o=>{if(o!==el){const b=o.querySelector('.audio-play-btn');if(b?.dataset.playing==='1')b.click();}});audio.play();playBtn.dataset.playing='1';playBtn.querySelector('.material-icons-round').textContent='pause';}else{audio.pause();playBtn.dataset.playing='0';playBtn.querySelector('.material-icons-round').textContent='play_arrow';}};
    el.querySelector('.audio-waveform')?.addEventListener('click',e=>{const rect=e.currentTarget.getBoundingClientRect();if(audio.duration)audio.currentTime=((e.clientX-rect.left)/rect.width)*audio.duration;});
  };

  /* ── FILE BUBBLE ──────────────────────────────────────────── */
  const _fileBubbleHtml = (messageStr) => {
    const data=_safeJson(messageStr); if(!data) return _esc(messageStr);
    const ext=(data.name||'').split('.').pop().toLowerCase();
    const cls=ext==='pdf'?'pdf':['doc','docx'].includes(ext)?'doc':['xls','xlsx','csv'].includes(ext)?'sheet':'generic';
    const icon=cls==='pdf'?'picture_as_pdf':cls==='doc'?'description':cls==='sheet'?'table_chart':'insert_drive_file';
    return `<div class="file-bubble ${cls}">
      <div class="file-icon-wrap"><span class="material-icons-round">${icon}</span></div>
      <div class="file-meta">
        <div class="file-name">${_esc(data.name||'File')}</div>
        <div class="file-size">${_bytes(data.size||0)}</div>
      </div>
      <div class="file-dl-btn"><span class="material-icons-round">${cls==='pdf'?'open_in_new':'download'}</span></div>
    </div>`;
  };

  /* ── HELPERS ──────────────────────────────────────────────── */
  const _replyQuoteHtml = (rq) => {
    if (!rq) return '';
    const icon = rq.msg_type==='image'?'image':rq.msg_type==='video'?'videocam':rq.msg_type==='audio'?'mic':rq.msg_type==='file'?'attach_file':rq.msg_type==='poll'?'poll':rq.msg_type==='quiz'?'quiz':'reply';
    const preview = ['image','video','audio','file','poll','quiz'].includes(rq.msg_type)
      ? rq.msg_type.charAt(0).toUpperCase() + rq.msg_type.slice(1)
      : (rq.message||'').slice(0, 60);
    return `<div class="reply-quote" data-scroll-to="${_attr(rq.time)}">
      <div class="reply-quote-icon"><span class="material-icons-round">${icon}</span></div>
      <div class="reply-quote-body">
        <div class="reply-quote-sender">${_esc(rq.sender_name||'Message')}</div>
        <div class="reply-quote-text">${_esc(preview)}</div>
      </div>
    </div>`;
  };

  const _parseMarkdown = (raw) => {
    let t = String(raw||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t = t.replace(/```([\s\S]*?)```/g, (_,c) => `<code class="md-codeblock">${c.trim()}</code>`);
    t = t.replace(/`([^`\n]+)`/g, (_,c) => `<span class="md-code">${c}</span>`);
    t = t.replace(/^### (.+)$/gm, (_,x) => `<span class="md-h3">${x}</span>`);
    t = t.replace(/^## (.+)$/gm,  (_,x) => `<span class="md-h2">${x}</span>`);
    t = t.replace(/^# (.+)$/gm,   (_,x) => `<span class="md-h1">${x}</span>`);
    t = t.replace(/^&gt; (.+)$/gm, (_,x) => `<blockquote class="md-blockquote">${x}</blockquote>`);
    t = t.replace(/\*\*(.+?)\*\*/g, (_,x) => `<strong class="md-bold">${x}</strong>`);
    t = t.replace(/__(.+?)__/g,    (_,x) => `<strong class="md-bold">${x}</strong>`);
    t = t.replace(/\*([^*\n]+)\*/g, (_,x) => `<em class="md-italic">${x}</em>`);
    t = t.replace(/_([^_\n]+)_/g,  (_,x) => `<em class="md-italic">${x}</em>`);
    t = t.replace(/~~(.+?)~~/g,     (_,x) => `<span class="md-strike">${x}</span>`);
    t = t.replace(/((?:^[-*] .+\n?)+)/gm, block => `<ul class="md-ul">${block.trim().split('\n').map(l=>`<li>${l.replace(/^[-*] /,'')}</li>`).join('')}</ul>`);
    t = t.replace(/((?:^\d+\. .+\n?)+)/gm, block => `<ol class="md-ol">${block.trim().split('\n').map(l=>`<li>${l.replace(/^\d+\. /,'')}</li>`).join('')}</ol>`);
    t = t.replace(/\n/g, '<br>');
    return t;
  };

  const _extractUrl = (t) => { if(!t||typeof t!=='string') return null; const m=t.match(URL_RE); return m?m[0]:null; };
  const _linkPreviewHtml = (url) => {
    let domain=''; try{domain=new URL(url).hostname.replace(/^www\./,'');}catch{return '';}
    return `<a class="link-preview" href="${_attr(url)}" target="_blank" rel="noopener noreferrer">
      <img class="lp-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32" loading="lazy" alt="" onerror="this.style.display='none'">
      <div class="lp-info"><div class="lp-domain">${_esc(domain)}</div><div class="lp-url">${_esc(url.length>44?url.slice(0,44)+'...':url)}</div></div>
      <span class="material-icons-round lp-open">open_in_new</span></a>`;
  };

  const _hashPrefix = () => _urlPrefix || (_chatRec?.data?.type==='group' ? 'communities' : 'chats');
  const _findMsg    = (time) => _msgs.find(m => m.time === time) || null;
  const _now        = () => new Date().toISOString();
  const _dateLabel  = (iso) => {
    if(!iso) return '';
    try{const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000);if(d===0)return 'Today';if(d===1)return 'Yesterday';return new Date(iso).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}catch{return '';}
  };
  const _bytes = (n) => {if(!n)return '0 B';const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(n)/Math.log(k));return(n/Math.pow(k,i)).toFixed(1)+' '+s[i];};
  const _safeJson = (str) => {try{return JSON.parse(str);}catch{return null;}};
  const _esc      = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _attr     = (s) => String(s||'').replace(/"/g,'&quot;');
  const _escAttr  = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _errHTML  = () => `<div class="chat-fullscreen" style="padding:40px 24px;gap:16px;align-items:center;justify-content:center">
    <span class="material-icons-round" style="font-size:56px;color:var(--text-3)">error_outline</span>
    <h3 style="color:var(--text-2)">Chat not found</h3>
    <button class="btn-ghost" id="cw-err-back">Go Back</button></div>`;

  return { open, close, isOpen };
})();
