/**
 * chat.js — ChatWindow v5
 * New: audio messages, video messages (MediaRecorder),
 *      working polls, camera integration (CameraOverlay),
 *      skeleton loading, smart poll voting via optimistic updates.
 */

const ChatWindow = (() => {

  const EMOJIS  = ['❤️','😂','😮','😢','👍'];
  const COLORS  = ['#0095f6','#ed4956','#2dd55b','#f0a030','#bc1888','#8a2be2'];
  const URL_RE  = /https?:\/\/(www\.)?[-\w@:%._+~#=]{1,256}\.[a-zA-Z]{1,6}\b([-\w@:%_+.~#?&//=]*)/g;
  const POLL_MS = 4000;

  let _chatId    = null; let _chatRec  = null; let _msgs     = [];
  let _msgHash   = '';   let _container= null; let _pollTimer= null;
  let _onClose   = null; let _isNew    = false; let _attachOpen= false; let _raf = null;
  // Audio recording state
  let _audioRec  = null; let _audioChunks = []; let _audioTimer = null; let _audioSecs = 0;
  let _isRecording = false;

  /* ── Public ─────────────────────────────────────────────────── */
  const open = async (chatId, overlayEl, opts = {}) => {
    if (!chatId || chatId === 'undefined') { App.showToast('Cannot open chat — invalid ID.', 'error'); return; }
    close();
    _chatId = chatId; _container = overlayEl; _onClose = opts.onClose || null; _isNew = opts.isNew || false;
    App.setHash(`#${_hashPrefix()}/${chatId}`);
    App.hideChrome();
    _container.innerHTML = App.skel.messages(8);
    _container.style.display = 'flex';
    _chatRec = await Server.getChatById(chatId);
    if (!_chatRec) { _container.innerHTML = _errHTML(); document.getElementById('cw-err-back')?.addEventListener('click', _close); return; }
    _msgs = [...(_chatRec.data.messages || [])];
    _msgHash = JSON.stringify(_msgs);
    _buildUI();
    if (_isNew && !_msgs.length) setTimeout(() => _sendText('Hi 👋'), 350);
    _pollTimer = setInterval(_poll, POLL_MS);
  };

  const close = () => {
    clearInterval(_pollTimer); cancelAnimationFrame(_raf);
    _stopAudioRec();
    _pollTimer = _raf = null; _chatId = _chatRec = null;
    _msgs = []; _msgHash = ''; _isNew = false; _attachOpen = false;
  };

  const isOpen = () => !!_chatId;

  /* ── Build UI ───────────────────────────────────────────────── */
  const _buildUI = () => {
    const d = _chatRec.data; const isGroup = d.type === 'group'; const me = Server.currentUser;
    let hName, hSub, hAvHtml, privBadge = '';
    if (isGroup) {
      const color = d.color || '#0095f6'; const initial = (d.name || 'G')[0].toUpperCase();
      const count = d.member_count || (d.participants || []).length;
      hName = d.name || 'Group'; hSub = `${count} member${count !== 1 ? 's' : ''}`;
      hAvHtml = `<div class="cw-group-av" id="cw-av-btn" style="background:${color}22;color:${color}">
        ${d.avatar_url ? `<img src="${_attr(d.avatar_url)}">` : initial}</div>`;
      const pub = d.is_public !== false;
      privBadge = `<span class="privacy-badge ${pub ? 'public' : 'private'}">
        <span class="material-icons-round">${pub ? 'public' : 'lock'}</span>${pub ? 'Public' : 'Private'}</span>`;
    } else {
      const pm = d.participant_meta || {}; const oid = (d.participants || []).find(id => id !== me?.id) || '';
      const o = pm[oid] || { display_name: 'User', username: '?', avatar_url: '' };
      hName = o.display_name; hSub = `@${o.username}`;
      hAvHtml = `<div id="cw-av-btn">${App.avatar(o.avatar_url, o.display_name, 'av-md')}</div>`;
    }

    _container.innerHTML = `
      <div class="chat-fullscreen">
        <div class="cw-header">
          <button class="cw-back icon-btn" id="cw-back"><span class="material-icons-round">arrow_back</span></button>
          <div class="cw-av">${hAvHtml}</div>
          <div class="cw-info" id="cw-info-txt">
            <div class="cw-name">${_esc(hName)} ${privBadge}</div>
            <div class="cw-sub">${_esc(hSub)}</div>
          </div>
          <div class="cw-actions">
            <button class="icon-btn" id="cw-more"><span class="material-icons-round">more_vert</span></button>
          </div>
        </div>
        <div class="cw-messages" id="cw-msgs"></div>
        <div class="cw-input-bar" id="cw-input-bar">
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
              <div class="attach-item" data-attach="camera">
                <div class="attach-icon-wrap orange"><span class="material-icons-round">photo_camera</span></div>
                <span class="attach-label">Camera</span>
              </div>
              <div class="attach-item" data-attach="audio">
                <div class="attach-icon-wrap teal"><span class="material-icons-round">mic</span></div>
                <span class="attach-label">Audio</span>
              </div>
            </div>
          </div>
          <input type="file" id="cw-img-in"   accept="image/*"   style="display:none">
          <input type="file" id="cw-file-in"  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv" style="display:none">
          <input type="file" id="cw-video-in" accept="video/*"   style="display:none">
          <button class="cw-insert-btn" id="cw-insert"><span class="material-icons-round">add_circle_outline</span></button>
          <textarea id="cw-ta" class="cw-textarea" placeholder="${isGroup ? 'Message group…' : 'Message…'}" rows="1"></textarea>
          <button class="cw-mic-btn" id="cw-mic" title="Hold to record audio">
            <span class="material-icons-round">mic</span>
          </button>
          <button class="cw-send-btn" id="cw-send"><span class="material-icons-round">send</span></button>
        </div>
      </div>`;

    document.getElementById('cw-back').onclick = _close;
    const infoH = () => isGroup ? _showGroupInfo() : _showDirectMenu();
    document.getElementById('cw-av-btn')?.addEventListener('click', infoH);
    document.getElementById('cw-info-txt')?.addEventListener('click', infoH);
    document.getElementById('cw-more').onclick = () => isGroup ? _showGroupInfo() : _showDirectMenu();

    const ta = document.getElementById('cw-ta');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendFromInput(); } });
    document.getElementById('cw-send').onclick = _sendFromInput;
    document.getElementById('cw-insert').onclick = _toggleAttach;
    document.getElementById('cw-msgs').addEventListener('click', _closeAttach);

    // Mic button — click to toggle audio recording
    document.getElementById('cw-mic').addEventListener('click', () => {
      _isRecording ? _stopAudioRec() : _startAudioRec();
    });

    document.querySelectorAll('.attach-item').forEach(item => {
      if (item.classList.contains('disabled')) return;
      item.addEventListener('click', () => {
        _closeAttach();
        const type = item.dataset.attach;
        if (type === 'image')  document.getElementById('cw-img-in').click();
        if (type === 'file')   document.getElementById('cw-file-in').click();
        if (type === 'video')  document.getElementById('cw-video-in').click();
        if (type === 'poll')   _showPollSheet();
        if (type === 'camera') CameraOverlay.open((url, mediaType) => {
          const msg = { ..._myMeta(), message: url, time: _now(), msg_type: mediaType === 'video' ? 'video' : 'image' };
          _optimisticSend(msg);
        });
        if (type === 'audio')  _startAudioRec();
      });
    });

    document.getElementById('cw-img-in').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return; e.target.value = ''; await _sendImageFile(f);
    });
    document.getElementById('cw-video-in').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return; e.target.value = ''; await _sendVideoFile(f);
    });
    document.getElementById('cw-file-in').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return; e.target.value = ''; await _sendGenericFile(f);
    });

    _renderMessages();
  };

  /* ── Close ──────────────────────────────────────────────────── */
  const _close = () => {
    App.showChrome(); close();
    if (typeof _onClose === 'function') _onClose();
  };

  /* ── Polling ─────────────────────────────────────────────────── */
  const _poll = async () => {
    if (!_chatId) return;
    if (!document.getElementById('cw-msgs')) { close(); return; }
    const fresh = await Server.getChatById(_chatId);
    if (!fresh) return;
    const serverMsgs = fresh.data.messages || [];
    const newHash = JSON.stringify(serverMsgs);
    if (newHash === _msgHash) return;
    const area = document.getElementById('cw-msgs');
    const wasBot = area ? area.scrollHeight - area.scrollTop - area.clientHeight < 100 : true;
    _msgs = _mergeMessages(_msgs, serverMsgs);
    _msgHash = JSON.stringify(_msgs); _chatRec = fresh;
    _renderMessages();
    if (wasBot) _scrollBottom();
  };

  const _mergeMessages = (local, server) => {
    const serverTimes = new Set(server.map(m => m.time));
    const optimistic  = local.filter(m => m._optimistic && !serverTimes.has(m.time));
    return [...server, ...optimistic];
  };

  /* ── Render ──────────────────────────────────────────────────── */
  const _renderMessages = () => {
    const area = document.getElementById('cw-msgs'); if (!area) return;
    const me = Server.currentUser; const isGroup = _chatRec?.data?.type === 'group';
    const wasBot = area.scrollHeight - area.scrollTop - area.clientHeight < 100;

    if (!_msgs.length) {
      area.innerHTML = `<div class="empty-state"><span class="material-icons-round">waving_hand</span>
        <p style="font-size:14px;color:var(--text-3)">Say hi to start the conversation 👋</p></div>`;
      return;
    }

    let html = '', prevDate = '', prevSender = '';
    _msgs.forEach(msg => {
      if (!msg?.sender_id) return;
      const isSent = msg.sender_id === me?.id;
      const isSystem = msg.msg_type === 'system';
      const isDeleted = msg.deleted === true || msg.msg_type === 'deleted';
      const isOpt = !!msg._optimistic; const isFailed = !!msg._failed;
      const time = App.formatTime(msg.time); const dateStr = _dateLabel(msg.time);

      if (dateStr !== prevDate) {
        html += `<div class="msg-date-sep"><span>${dateStr}</span></div>`;
        prevDate = dateStr; prevSender = '';
      }

      if (isSystem) {
        html += `<div class="msg-row system"><div class="bubble">${_esc(msg.message)}</div></div>`;
        prevSender = 'system'; return;
      }

      const cls = isSent ? 'sent' : 'recv';
      const showName = isGroup && !isSent && msg.sender_id !== prevSender;
      prevSender = msg.sender_id;
      const reactHtml = _reactionsHtml(msg, me?.id);

      let bubbleContent = '';
      if (isDeleted) {
        bubbleContent = `<div class="bubble deleted-msg">
          <span class="material-icons-round" style="font-size:14px;vertical-align:middle">delete</span>
          This message was deleted</div>`;
      } else if (msg.msg_type === 'image') {
        bubbleContent = `<div class="bubble bubble-img" data-img="${_attr(msg.message)}">
          <img src="${_attr(msg.message)}" alt="Image" loading="lazy" onerror="this.src='data:image/svg+xml,<svg/>'"></div>`;
      } else if (msg.msg_type === 'video') {
        bubbleContent = `<div class="bubble" style="padding:4px">
          <div class="bubble-video" data-vid="${_attr(msg.message)}">
            <video src="${_attr(msg.message)}" preload="metadata" playsinline></video>
            <div class="video-play-overlay"><span class="material-icons-round">play_circle_filled</span></div>
          </div></div>`;
      } else if (msg.msg_type === 'audio') {
        bubbleContent = `<div class="bubble" style="padding:10px 12px">
          ${_audioBubbleHtml(msg.message, msg.time)}</div>`;
      } else if (msg.msg_type === 'file') {
        bubbleContent = `<div class="bubble" style="padding:10px 12px">${_fileBubbleHtml(msg.message, isSent)}</div>`;
      } else if (msg.msg_type === 'poll') {
        bubbleContent = `<div class="bubble" style="padding:10px 12px">
          ${_pollBubbleHtml(msg, me?.id)}</div>`;
      } else {
        const url = _extractUrl(msg.message);
        const editMark = msg.edited ? `<span class="edited-mark">(edited)</span>` : '';
        const failBubbleCls = isFailed ? ' failed-bubble' : '';
        bubbleContent = `<div class="bubble${failBubbleCls}" data-t="${_attr(msg.time)}">
          ${_escNl(msg.message)}${editMark}${url ? _linkPreviewHtml(url, isSent) : ''}</div>`;
      }

      const tickIcon = isFailed
        ? '<span class="material-icons-round msg-tick" style="color:var(--danger)">error</span>'
        : isOpt ? '<span class="material-icons-round msg-tick pending">schedule</span>'
        : '<span class="material-icons-round msg-tick">done_all</span>';

      html += `<div class="msg-row ${cls}${isOpt?' optimistic':''}${isFailed?' failed':''}" data-t="${_attr(msg.time)}">
        ${showName ? `<div class="msg-sender-name">${_esc(msg.display_name || 'User')}</div>` : ''}
        ${bubbleContent}
        <div class="msg-meta">
          <span class="msg-time">${time}</span>
          ${isSent ? tickIcon : ''}
          ${isFailed ? `<span class="retry-btn" data-t="${_attr(msg.time)}">Retry</span>` : ''}
        </div>
        ${reactHtml}
      </div>`;
    });

    area.innerHTML = html;

    // Wire up image clicks
    area.querySelectorAll('.bubble-img').forEach(el =>
      el.addEventListener('click', () => _showImgFS(el.dataset.img))
    );
    // Wire up video clicks
    area.querySelectorAll('.bubble-video').forEach(el =>
      el.addEventListener('click', () => _showVideoFS(el.dataset.vid))
    );
    // Wire up audio players
    area.querySelectorAll('.audio-bubble-el').forEach(el => _bindAudioBubble(el));
    // Long-press on bubbles
    area.querySelectorAll('[data-t]').forEach(el => {
      const t = el.dataset.t; if (!t) return;
      const msg = _findMsg(t);
      if (!msg || msg.msg_type === 'system' || msg.deleted) return;
      const bubble = el.closest('.bubble') || el;
      _attachLongPress(bubble, msg);
    });
    // Reaction pills
    area.querySelectorAll('.reaction-pill').forEach(pill =>
      pill.addEventListener('click', e => { e.stopPropagation(); _toggleReaction(pill.dataset.t, pill.dataset.e); })
    );
    // Retry
    area.querySelectorAll('.retry-btn').forEach(btn =>
      btn.addEventListener('click', () => { const msg = _findMsg(btn.dataset.t); if (msg) _retryFailed(msg); })
    );
    // Link preview
    area.querySelectorAll('.link-preview').forEach(a =>
      a.addEventListener('click', e => { e.stopPropagation(); window.open(a.href, '_blank', 'noopener'); })
    );
    // Poll options
    area.querySelectorAll('.poll-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => _votePoll(btn.dataset.t, btn.dataset.idx));
    });
    // External links
    area.querySelectorAll('.link-preview').forEach(a =>
      a.addEventListener('click', e => { e.stopPropagation(); window.open(a.href, '_blank', 'noopener'); })
    );

    if (wasBot) _scrollBottom();
  };

  const _scrollBottom = () => {
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      const area = document.getElementById('cw-msgs');
      if (area) area.scrollTop = area.scrollHeight;
    });
  };

  /* ── Attach overlay ─────────────────────────────────────────── */
  const _toggleAttach = () => _attachOpen ? _closeAttach() : _openAttach();
  const _openAttach  = () => { document.getElementById('attach-overlay')?.classList.add('open'); document.getElementById('cw-insert')?.classList.add('active'); _attachOpen = true; };
  const _closeAttach = () => { document.getElementById('attach-overlay')?.classList.remove('open'); document.getElementById('cw-insert')?.classList.remove('active'); _attachOpen = false; };

  /* ── Audio recording ─────────────────────────────────────────── */
  const _startAudioRec = async () => {
    if (_isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _audioChunks = []; _audioSecs = 0; _isRecording = true;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      _audioRec = new MediaRecorder(stream, { mimeType });
      _audioRec.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
      _audioRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (_audioSecs < 1) { App.showToast('Recording too short', 'error'); return; }
        const blob = new Blob(_audioChunks, { type: mimeType });
        await _sendAudioBlob(blob, _audioSecs);
      };
      _audioRec.start(100);

      // Update mic button
      const micBtn = document.getElementById('cw-mic');
      if (micBtn) { micBtn.classList.add('recording'); micBtn.querySelector('.material-icons-round').textContent = 'stop'; }

      _audioTimer = setInterval(() => {
        _audioSecs++;
        const m = Math.floor(_audioSecs / 60), s = String(_audioSecs % 60).padStart(2,'0');
        const micBtn = document.getElementById('cw-mic');
        if (micBtn) micBtn.title = `${m}:${s} — tap to stop`;
      }, 1000);
    } catch {
      App.showToast('Microphone access denied', 'error'); _isRecording = false;
    }
  };

  const _stopAudioRec = () => {
    if (!_isRecording) return;
    clearInterval(_audioTimer); _isRecording = false;
    _audioRec?.stop();
    const micBtn = document.getElementById('cw-mic');
    if (micBtn) { micBtn.classList.remove('recording'); micBtn.querySelector('.material-icons-round').textContent = 'mic'; micBtn.title = 'Record audio'; }
  };

  /* ── Send helpers ────────────────────────────────────────────── */
  const _myMeta = () => {
    const me = Server.currentUser; const mpD = Server.currentProfile?.data || {};
    return { sender_id: me?.id || '', username: mpD.username || '', display_name: mpD.display_name || me?.display_name || 'Me' };
  };

  const _optimisticSend = async (msg) => {
    const tempMsg = { ...msg, _optimistic: true };
    _msgs.push(tempMsg); _msgHash = JSON.stringify(_msgs); _renderMessages(); _scrollBottom();
    try {
      const serverMsgs = await Server.sendChatMessage(_chatId, msg);
      _msgs = serverMsgs; _msgHash = JSON.stringify(_msgs); _renderMessages();
    } catch {
      _msgs = _msgs.map(m => m === tempMsg ? { ...m, _optimistic: false, _failed: true } : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
    }
  };

  const _retryFailed = async (msg) => {
    _msgs = _msgs.filter(m => m !== msg && m.time !== msg.time);
    const cleanMsg = { ...msg }; delete cleanMsg._failed; delete cleanMsg._optimistic;
    await _optimisticSend(cleanMsg);
  };

  const _sendFromInput = async () => {
    const ta = document.getElementById('cw-ta'); const text = ta?.value.trim();
    if (!text) return; ta.value = ''; ta.style.height = 'auto'; await _sendText(text);
  };
  const _sendText = async (text) => {
    if (!_chatId || !text) return;
    await _optimisticSend({ ..._myMeta(), message: text, time: _now(), msg_type: 'text' });
  };
  const _sendImageFile = async (file) => {
    App.showToast('Compressing…');
    const url = await Server.uploadCompressedImage(file, 'spark_chat_imgs');
    if (!url) { App.showToast('Image upload failed', 'error'); return; }
    await _optimisticSend({ ..._myMeta(), message: url, time: _now(), msg_type: 'image' });
  };
  const _sendVideoFile = async (file) => {
    App.showToast(`Uploading video…`);
    const data = await Server.uploadFile(file, 'spark_chat_videos');
    if (!data) { App.showToast('Video upload failed', 'error'); return; }
    await _optimisticSend({ ..._myMeta(), message: data.url, time: _now(), msg_type: 'video' });
  };
  const _sendGenericFile = async (file) => {
    App.showToast(`Uploading ${file.name}…`);
    const data = await Server.uploadFile(file, 'spark_files');
    if (!data) { App.showToast('File upload failed', 'error'); return; }
    await _optimisticSend({ ..._myMeta(), message: JSON.stringify(data), time: _now(), msg_type: 'file' });
  };
  const _sendAudioBlob = async (blob, durationSecs) => {
    App.showToast('Sending audio…');
    try {
      const file = new File([blob], 'audio.webm', { type: blob.type });
      const data = await Server.uploadFile(file, 'spark_chat_audio');
      if (!data) throw new Error();
      const payload = JSON.stringify({ url: data.url, duration: durationSecs });
      await _optimisticSend({ ..._myMeta(), message: payload, time: _now(), msg_type: 'audio' });
    } catch { App.showToast('Audio send failed', 'error'); }
  };

  /* ── Poll ────────────────────────────────────────────────────── */
  const _showPollSheet = () => {
    let options = ['', ''];

    const renderOpts = () => {
      const list = document.getElementById('poll-opts-list'); if (!list) return;
      list.innerHTML = options.map((o, i) => `
        <div class="poll-opt-row">
          <input type="text" class="poll-opt-inp" data-i="${i}" placeholder="Option ${i+1}" value="${_attr(o)}" maxlength="60">
          ${options.length > 2 ? `<div class="poll-opt-del" data-i="${i}"><span class="material-icons-round" style="font-size:18px">close</span></div>` : ''}
        </div>`).join('');
      list.querySelectorAll('.poll-opt-inp').forEach(inp => {
        inp.addEventListener('input', e => { options[+e.target.dataset.i] = e.target.value; });
      });
      list.querySelectorAll('.poll-opt-del').forEach(btn => {
        btn.addEventListener('click', () => { options.splice(+btn.dataset.i, 1); renderOpts(); });
      });
    };

    const close = App.showModal(`
      <div class="poll-sheet">
        <h3>Create Poll</h3>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:6px">Question *</label>
          <input id="poll-q" class="input-field" type="text" placeholder="Ask a question…" maxlength="120">
        </div>
        <div>
          <label class="auth-label" style="display:block;margin-bottom:8px">Options</label>
          <div class="poll-options-list" id="poll-opts-list"></div>
          <div class="poll-add-opt" id="poll-add-opt">
            <span class="material-icons-round" style="font-size:18px">add_circle_outline</span> Add option
          </div>
        </div>
        <div id="poll-err" class="auth-error"></div>
        <button class="poll-submit" id="poll-submit">
          <span class="material-icons-round" style="font-size:18px">poll</span> Create Poll
        </button>
      </div>`);

    renderOpts();

    document.getElementById('poll-add-opt').onclick = () => {
      if (options.length >= 8) return;
      options.push(''); renderOpts();
    };

    document.getElementById('poll-submit').onclick = async () => {
      const question = document.getElementById('poll-q').value.trim();
      const validOpts = options.map(o => o.trim()).filter(Boolean);
      const errEl = document.getElementById('poll-err'); errEl.classList.remove('visible');
      if (!question) { errEl.textContent = 'Enter a question.'; errEl.classList.add('visible'); return; }
      if (validOpts.length < 2) { errEl.textContent = 'Add at least 2 options.'; errEl.classList.add('visible'); return; }
      const pollData = { question, options: validOpts.map(text => ({ text, votes: [] })), created_at: _now(), expires_at: null };
      close();
      await _optimisticSend({ ..._myMeta(), message: JSON.stringify(pollData), time: _now(), msg_type: 'poll' });
    };
  };

  const _votePoll = async (msgTime, optIdx) => {
    const me = Server.currentUser;
    const msg = _findMsg(msgTime); if (!msg) return;
    const pollData = _safeJson(msg.message); if (!pollData) return;

    // Toggle vote — remove from all others, add to this
    const opts = pollData.options.map((opt, i) => ({
      ...opt,
      votes: i === +optIdx
        ? opt.votes.includes(me.id) ? opt.votes.filter(id => id !== me.id) : [...opt.votes, me.id]
        : opt.votes.filter(id => id !== me.id)
    }));

    const updated = { ...pollData, options: opts };
    _msgs = _msgs.map(m => m.time === msgTime ? { ...m, message: JSON.stringify(updated) } : m);
    _msgHash = JSON.stringify(_msgs); _renderMessages();

    // Persist
    Server.editMessage(_chatId, msgTime, JSON.stringify(updated)).catch(() => {});
  };

  /* ── Poll bubble HTML ────────────────────────────────────────── */
  const _pollBubbleHtml = (msg, myId) => {
    const pollData = _safeJson(msg.message); if (!pollData) return _esc(msg.message);
    const { question, options } = pollData;
    const totalVotes = options.reduce((s, o) => s + (o.votes || []).length, 0);
    const hasVoted = options.some(o => (o.votes || []).includes(myId));

    const optHtml = options.map((opt, i) => {
      const votes = (opt.votes || []).length;
      const pct   = totalVotes ? Math.round(votes / totalVotes * 100) : 0;
      const mine  = (opt.votes || []).includes(myId);
      return `<div class="poll-option ${hasVoted ? 'voted' : ''} ${mine ? 'my-vote' : ''} poll-opt-btn"
          data-t="${_attr(msg.time)}" data-idx="${i}">
        <div class="poll-option-bar" style="width:${hasVoted ? pct : 0}%"></div>
        <div class="poll-option-content">
          <span>${_esc(opt.text)}</span>
          <div style="display:flex;align-items:center;gap:4px">
            ${hasVoted ? `<span class="poll-pct">${pct}%</span>` : ''}
            <span class="material-icons-round check" style="font-size:16px;color:inherit">check_circle</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="poll-bubble">
      <div class="poll-question">${_esc(question)}</div>
      ${optHtml}
      <div class="poll-footer">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
    </div>`;
  };

  /* ── Audio bubble HTML ───────────────────────────────────────── */
  const _audioBubbleHtml = (messageStr, msgTime) => {
    const data = _safeJson(messageStr);
    const url  = data?.url || messageStr;
    const dur  = data?.duration || 0;
    const m = Math.floor(dur / 60), s = String(dur % 60).padStart(2,'0');
    const BARS = 24;
    const bars = Array.from({length: BARS}, (_, i) => {
      const h = 6 + Math.sin(i * 0.7 + 1) * 8 + Math.random() * 6;
      return `<div class="audio-bar" style="height:${h}px"></div>`;
    }).join('');

    return `<div class="audio-bubble audio-bubble-el" data-url="${_attr(url)}" data-dur="${dur}" data-t="${_attr(msgTime)}">
      <button class="audio-play-btn" data-playing="0">
        <span class="material-icons-round">play_arrow</span>
      </button>
      <div class="audio-waveform">${bars}</div>
      <span class="audio-dur">${m}:${s}</span>
    </div>`;
  };

  /* ── Bind audio player ───────────────────────────────────────── */
  const _bindAudioBubble = (el) => {
    const url = el.dataset.url; if (!url) return;
    const playBtn = el.querySelector('.audio-play-btn');
    const bars    = el.querySelectorAll('.audio-bar');
    const durEl   = el.querySelector('.audio-dur');
    if (!playBtn) return;

    const audio = new Audio(url);
    let prog = 0;

    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      prog = audio.currentTime / audio.duration;
      const played = Math.floor(prog * bars.length);
      bars.forEach((b, i) => b.classList.toggle('played', i < played));
      const rem = Math.ceil(audio.duration - audio.currentTime);
      const m = Math.floor(rem / 60), s = String(rem % 60).padStart(2,'0');
      if (durEl) durEl.textContent = `${m}:${s}`;
    };
    audio.onended = () => {
      playBtn.dataset.playing = '0';
      playBtn.querySelector('.material-icons-round').textContent = 'play_arrow';
      bars.forEach(b => b.classList.remove('played'));
    };

    playBtn.onclick = () => {
      if (audio.paused) {
        // Pause all other audio
        document.querySelectorAll('.audio-bubble-el').forEach(other => {
          if (other !== el) {
            const btn = other.querySelector('.audio-play-btn');
            if (btn?.dataset.playing === '1') btn.click();
          }
        });
        audio.play();
        playBtn.dataset.playing = '1';
        playBtn.querySelector('.material-icons-round').textContent = 'pause';
      } else {
        audio.pause();
        playBtn.dataset.playing = '0';
        playBtn.querySelector('.material-icons-round').textContent = 'play_arrow';
      }
    };

    // Tap on waveform to seek
    el.querySelector('.audio-waveform')?.addEventListener('click', e => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      if (audio.duration) audio.currentTime = pct * audio.duration;
    });
  };

  /* ── Reactions ───────────────────────────────────────────────── */
  const _toggleReaction = async (msgTime, emoji) => {
    if (!msgTime || !emoji || !_chatId) return;
    const me = Server.currentUser;
    _msgs = _msgs.map(m => {
      if (m.time !== msgTime) return m;
      const r = { ...(m.reactions || {}) };
      const u = r[emoji] || [];
      r[emoji] = u.includes(me.id) ? u.filter(id => id !== me.id) : [...u, me.id];
      if (!r[emoji].length) delete r[emoji];
      return { ...m, reactions: r };
    });
    _msgHash = JSON.stringify(_msgs); _renderMessages();
    Server.addReaction(_chatId, msgTime, emoji, me.id).catch(() => {});
  };

  const _reactionsHtml = (msg, myId) => {
    const r = msg.reactions || {}; const keys = Object.keys(r).filter(e => (r[e] || []).length > 0);
    if (!keys.length) return '';
    return `<div class="msg-reactions">${keys.map(e => {
      const cnt = (r[e] || []).length; const mine = (r[e] || []).includes(myId);
      return `<button class="reaction-pill ${mine ? 'mine' : ''}" data-t="${_attr(msg.time)}" data-e="${e}">
        ${e} <span class="r-count">${cnt}</span></button>`;
    }).join('')}</div>`;
  };

  /* ── Context menu ────────────────────────────────────────────── */
  const _attachLongPress = (el, msg) => {
    let t = null;
    const start  = () => { t = setTimeout(() => { navigator.vibrate?.(30); _showCtxMenu(msg); }, 580); };
    const cancel = () => clearTimeout(t);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('contextmenu', e => { e.preventDefault(); cancel(); _showCtxMenu(msg); });
  };

  const _showCtxMenu = (msg) => {
    const me = Server.currentUser; const isOwn = msg.sender_id === me?.id; const r = msg.reactions || {};
    const emojiRow = EMOJIS.map(e => {
      const mine = (r[e] || []).includes(me?.id);
      return `<button class="ctx-emoji-btn ${mine ? 'reacted' : ''}" data-e="${e}">${e}</button>`;
    }).join('');

    const close = App.showModal(`
      <div class="ctx-menu-wrap">
        <div class="ctx-emoji-row">${emojiRow}</div>
        ${msg.msg_type === 'text' ? `<div class="ctx-action" id="ctx-copy"><span class="material-icons-round">content_copy</span> Copy</div>` : ''}
        ${isOwn && msg.msg_type === 'text' ? `<div class="ctx-action" id="ctx-edit"><span class="material-icons-round">edit</span> Edit Message</div>` : ''}
        ${msg.msg_type === 'image' ? `<div class="ctx-action" id="ctx-save"><span class="material-icons-round">download</span> Save Image</div>` : ''}
        ${isOwn ? `<div class="ctx-action danger" id="ctx-del"><span class="material-icons-round">delete</span> Delete</div>` : ''}
      </div>`);

    document.querySelectorAll('.ctx-emoji-btn').forEach(btn =>
      btn.addEventListener('click', () => { close(); _toggleReaction(msg.time, btn.dataset.e); })
    );
    document.getElementById('ctx-copy')?.addEventListener('click', () => {
      close(); navigator.clipboard?.writeText(msg.message).catch(() => {}); App.showToast('Copied');
    });
    document.getElementById('ctx-edit')?.addEventListener('click', () => { close(); _startEdit(msg); });
    document.getElementById('ctx-save')?.addEventListener('click', () => {
      close(); const a = document.createElement('a'); a.href = msg.message; a.download = 'image.jpg'; a.click();
    });
    document.getElementById('ctx-del')?.addEventListener('click', () => { close(); _confirmDelete(msg); });
  };

  const _startEdit = (msg) => {
    const close = App.showModal(`
      <div style="padding:20px 16px 30px;display:flex;flex-direction:column;gap:14px">
        <h3 style="font-size:16px;font-weight:800;color:var(--text-1)">Edit Message</h3>
        <textarea id="edit-ta" class="cw-textarea" style="width:100%;min-height:80px;border-radius:12px;padding:10px">${_escAttr(msg.message)}</textarea>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="edit-cancel" style="flex:1">Cancel</button>
          <button class="btn-primary" id="edit-save" style="flex:1">Save</button>
        </div>
      </div>`);
    document.getElementById('edit-cancel')?.addEventListener('click', close);
    document.getElementById('edit-save')?.addEventListener('click', async () => {
      const t = document.getElementById('edit-ta')?.value.trim();
      if (!t || t === msg.message) { close(); return; }
      close();
      _msgs = _msgs.map(m => m.time === msg.time ? { ...m, message: t, edited: true } : m);
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
      close();
      _msgs = _msgs.map(m => m.time === msg.time ? { ...m, deleted: true, msg_type: 'deleted', message: '' } : m);
      _msgHash = JSON.stringify(_msgs); _renderMessages();
      Server.deleteMessage(_chatId, msg.time).catch(() => {});
    });
  };

  /* ── File + Link HTML ────────────────────────────────────────── */
  const _fileBubbleHtml = (messageStr, isSent) => {
    const data = _safeJson(messageStr); if (!data) return _esc(messageStr);
    const ext = (data.name || '').split('.').pop().toLowerCase();
    const cls = ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : ['xls','xlsx','csv'].includes(ext) ? 'sheet' : 'generic';
    const icon = cls === 'pdf' ? 'picture_as_pdf' : cls === 'doc' ? 'description' : cls === 'sheet' ? 'table_chart' : 'insert_drive_file';
    return `<div class="file-bubble ${cls}">
      <div class="file-icon-wrap"><span class="material-icons-round">${icon}</span></div>
      <div class="file-meta">
        <div class="file-name">${_esc(data.name || 'File')}</div>
        <div class="file-size">${_bytes(data.size || 0)}</div>
      </div>
      <a href="${_attr(data.url)}" download="${_attr(data.name)}" class="file-dl" onclick="event.stopPropagation()">
        <span class="material-icons-round">download</span>
      </a>
    </div>`;
  };

  const _extractUrl = (text) => { if (!text || typeof text !== 'string') return null; const m = text.match(URL_RE); return m ? m[0] : null; };
  const _linkPreviewHtml = (url) => {
    let domain = ''; try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    const display = url.length > 48 ? url.slice(0, 48) + '…' : url;
    return `<a class="link-preview" href="${_attr(url)}" target="_blank" rel="noopener noreferrer">
      <img class="lp-icon" src="${favicon}" loading="lazy" alt="" onerror="this.style.display='none'">
      <div class="lp-info"><div class="lp-domain">${_esc(domain)}</div><div class="lp-url">${_esc(display)}</div></div>
      <span class="material-icons-round lp-arrow">open_in_new</span>
    </a>`;
  };

  /* ── Direct / Group menus (unchanged from v4) ────────────────── */
  const _showDirectMenu = () => {
    const d = _chatRec.data; const me = Server.currentUser;
    const pm = d.participant_meta || {}; const oid = (d.participants || []).find(id => id !== me?.id) || '';
    const o = pm[oid] || {};
    App.showModal(`
      <div style="padding:0 0 20px">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          ${App.avatar(o.avatar_url, o.display_name, 'av-md')}
          <div><div style="font-size:16px;font-weight:700;color:var(--text-1)">${_esc(o.display_name || 'User')}</div>
          <div style="font-size:12px;color:var(--text-3)">@${_esc(o.username || '')}</div></div>
        </div>
        <div class="ctx-action" id="dm-conv"><span class="material-icons-round" style="color:var(--accent)">group_add</span>Convert to Group Chat</div>
        <div class="ctx-action danger" id="dm-clear"><span class="material-icons-round">cleaning_services</span>Clear Chat</div>
      </div>`);
    document.getElementById('dm-conv').onclick = () => { App.closeModal(); _showConvertToGroup(); };
    document.getElementById('dm-clear').onclick = () => { App.closeModal(); App.showToast('Clear chat coming soon!'); };
  };

  const _showConvertToGroup = () => {
    const added = []; let srT = null;
    const close = App.showModal(`
      <div class="edit-group-sheet">
        <h3>Create Group Chat</h3>
        <div><label class="auth-label" style="display:block;margin-bottom:6px">Group Name *</label>
          <input id="ctg-name" class="input-field" type="text" placeholder="Team Spark…" maxlength="60"></div>
        <div><label class="auth-label" style="display:block;margin-bottom:8px">Add Members</label>
          <div style="position:relative">
            <div class="chat-search-inner" style="border-radius:var(--radius-md)">
              <span class="material-icons-round">search</span>
              <input id="ctg-sr" class="chat-search-input" type="text" placeholder="Search username…" autocomplete="off">
            </div>
            <div class="inline-search-result" id="ctg-res" style="display:none"></div>
          </div>
          <div class="chips-row" id="ctg-chips" style="margin-top:10px"></div>
        </div>
        <div id="ctg-err" class="auth-error"></div>
        <button class="eg-save-btn" id="ctg-ok"><span class="material-icons-round" style="font-size:18px">group_add</span>Create Group</button>
      </div>`);
    const renderChips = () => {
      const c = document.getElementById('ctg-chips'); if (!c) return;
      c.innerHTML = added.map((m, i) => `<div class="member-chip">${_esc(m.display_name)}<span class="material-icons-round chip-x" data-i="${i}">close</span></div>`).join('');
      c.querySelectorAll('.chip-x').forEach(x => x.addEventListener('click', () => { added.splice(+x.dataset.i, 1); renderChips(); }));
    };
    document.getElementById('ctg-sr').addEventListener('input', e => {
      clearTimeout(srT); const q = e.target.value.trim(); const res = document.getElementById('ctg-res');
      if (!q) { res.style.display = 'none'; return; }
      res.style.display = 'block'; res.innerHTML = `<div style="padding:10px;font-size:13px;color:var(--text-3)">Searching…</div>`;
      srT = setTimeout(async () => {
        const found = await Server.getProfileByUsername(q);
        const me = Server.currentUser; const ex = _chatRec.data.participants || [];
        if (!found || found.data.user_id === me?.id || ex.includes(found.data.user_id) || added.some(m => m.user_id === found.data.user_id)) {
          res.innerHTML = `<div style="padding:10px;font-size:13px;color:var(--text-3)">${!found ? 'No user found.' : 'Already in chat.'}</div>`; return;
        }
        const fd = found.data;
        res.innerHTML = `<div class="inline-result-item" id="ctg-hit">${App.avatar(fd.avatar_url, fd.display_name, 'av-sm')}
          <div><div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(fd.display_name)}</div>
          <div style="font-size:12px;color:var(--text-3)">@${_esc(fd.username)}</div></div></div>`;
        document.getElementById('ctg-hit').onclick = () => {
          added.push({ user_id: fd.user_id, display_name: fd.display_name, username: fd.username, avatar_url: fd.avatar_url || '' });
          renderChips(); e.target.value = ''; res.style.display = 'none';
        };
      }, 350);
    });
    document.getElementById('ctg-ok').onclick = async () => {
      const name = document.getElementById('ctg-name').value.trim(); const errEl = document.getElementById('ctg-err'); errEl.classList.remove('visible');
      if (!name) { errEl.textContent = 'Name required.'; errEl.classList.add('visible'); return; }
      const btn = document.getElementById('ctg-ok'); btn.disabled = true; btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try {
        const updated = await Server.convertToGroup(_chatId, name, added);
        _chatRec = updated;
        await Server.sendChatMessage(_chatId, { sender_id: 'system', username: '', display_name: '', message: `Chat converted to group: "${name}"`, time: _now(), msg_type: 'system' });
        close(); App.showToast('Group created! 🎉', 'success');
        await open(_chatId, _container, { onClose: _onClose });
      } catch (e) {
        btn.disabled = false; btn.innerHTML = `<span class="material-icons-round" style="font-size:18px">group_add</span>Create Group`;
        errEl.textContent = e.message || 'Failed.'; errEl.classList.add('visible');
      }
    };
  };

  const _showGroupInfo = () => {
    const d = _chatRec.data; const me = Server.currentUser; const pm = d.participant_meta || {};
    const color = d.color || '#0095f6'; const initial = (d.name || 'G')[0].toUpperCase();
    const count = d.member_count || (d.participants || []).length;
    const isCreator = d.created_by === me?.id; const isPublic = d.is_public !== false;
    const memberRows = (d.participants || []).map(uid => {
      const m = pm[uid] || { display_name: 'User', username: '?', avatar_url: '' };
      const isMe = uid === me?.id; const isAdm = uid === d.created_by;
      return `<div class="gi-member">${App.avatar(m.avatar_url, m.display_name, 'av-sm')}
        <div class="gi-member-info"><div class="gi-member-name">${_esc(m.display_name || 'User')}</div>
        <div class="gi-member-user">@${_esc(m.username || '?')}</div></div>
        ${isAdm ? `<div class="gi-tag admin">Admin</div>` : ''}
        ${isMe && !isAdm ? `<div class="gi-tag you">You</div>` : ''}
        ${isCreator && !isMe ? `<div class="gi-remove" data-uid="${uid}"><span class="material-icons-round">person_remove</span></div>` : ''}
      </div>`;
    }).join('');
    App.showModal(`
      <div class="gi-sheet">
        <div class="gi-header-block">
          <div class="gi-av" style="background:${color}22;color:${color}">
            ${d.avatar_url ? `<img src="${_attr(d.avatar_url)}">` : initial}</div>
          <div class="gi-name">${_esc(d.name || 'Group')}</div>
          ${d.description ? `<div class="gi-desc">${_esc(d.description)}</div>` : ''}
          <div class="gi-count"><span class="material-icons-round">group</span>${count} members ·
            <span class="material-icons-round" style="font-size:13px">${isPublic ? 'public' : 'lock'}</span>
            ${isPublic ? 'Public' : 'Private'}</div>
          ${isCreator ? `<div class="gi-actions"><button class="btn-ghost" id="gi-edit" style="padding:8px 16px;font-size:13px;display:flex;align-items:center;gap:6px">
            <span class="material-icons-round" style="font-size:16px">edit</span>Edit Group</button></div>` : ''}
        </div>
        <div class="gi-sec-label">Members</div>
        ${memberRows}
        <div class="gi-add-row" id="gi-add"><span class="material-icons-round">person_add</span>Add Member</div>
        <div class="gi-leave" id="gi-leave"><span class="material-icons-round">exit_to_app</span>Leave Group</div>
      </div>`);
    document.getElementById('gi-edit')?.addEventListener('click', () => { App.closeModal(); _showEditGroup(); });
    document.getElementById('gi-add').addEventListener('click', () => { App.closeModal(); _showAddMember(); });
    document.querySelectorAll('.gi-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid; const meta = pm[uid] || {};
        if (!confirm(`Remove ${meta.display_name || 'this member'}?`)) return;
        try {
          await Server.removeMember(_chatId, uid);
          await Server.sendChatMessage(_chatId, { sender_id: 'system', username: '', display_name: '', message: `${meta.display_name || 'A member'} was removed.`, time: _now(), msg_type: 'system' });
          App.closeModal(); App.showToast('Removed');
          _chatRec = await Server.getChatById(_chatId);
          if (_chatRec) { _msgs = _chatRec.data.messages || []; _msgHash = JSON.stringify(_msgs); _renderMessages(); }
        } catch { App.showToast('Failed', 'error'); }
      });
    });
    document.getElementById('gi-leave').addEventListener('click', async () => {
      App.closeModal();
      await Server.leaveCommunity(_chatId, me.id).catch(() => {});
      await Server.sendChatMessage(_chatId, { sender_id: 'system', username: '', display_name: '', message: `${Server.currentProfile?.data.display_name || 'Someone'} left.`, time: _now(), msg_type: 'system' }).catch(() => {});
      App.showToast('You left the group'); _close();
    });
  };

  const _showEditGroup = () => {
    const d = _chatRec.data; let selColor = d.color || COLORS[0]; let selPublic = d.is_public !== false; let avFile = null;
    const dots = COLORS.map(c => `<div class="color-dot ${c === selColor ? 'sel' : ''}" data-c="${c}" style="background:${c}"></div>`).join('');
    const close = App.showModal(`
      <div class="edit-group-sheet">
        <h3>Edit Group</h3>
        <div class="eg-av-pick"><label class="eg-av-btn" id="eg-av-lbl">
          ${d.avatar_url ? `<img src="${_attr(d.avatar_url)}" style="border-radius:14px">` : `<span class="material-icons-round">add_a_photo</span><span>Photo</span>`}
          <input type="file" accept="image/*" id="eg-av-in" style="display:none"></label></div>
        <div><label class="auth-label" style="display:block;margin-bottom:6px">Name *</label>
          <input id="eg-name" class="input-field" type="text" value="${_attr(d.name || '')}" maxlength="60"></div>
        <div><label class="auth-label" style="display:block;margin-bottom:6px">Description</label>
          <textarea id="eg-desc" class="input-field" rows="2" style="resize:none" placeholder="What's this group about?">${_attr(d.description || '')}</textarea></div>
        <div><label class="auth-label" style="display:block;margin-bottom:8px">Color</label>
          <div class="color-row" id="eg-colors">${dots}</div></div>
        <div><label class="auth-label" style="display:block;margin-bottom:8px">Privacy</label>
          <div class="privacy-toggle">
            <button class="privacy-opt ${selPublic ? 'active' : ''}" data-v="true"><span class="material-icons-round">public</span>Public</button>
            <button class="privacy-opt ${!selPublic ? 'active' : ''}" data-v="false"><span class="material-icons-round">lock</span>Private</button>
          </div></div>
        <div id="eg-err" class="auth-error"></div>
        <button class="eg-save-btn" id="eg-save"><span class="material-icons-round">check</span>Save Changes</button>
      </div>`);
    document.getElementById('eg-av-in').addEventListener('change', e => {
      avFile = e.target.files[0]; if (!avFile) return;
      const rd = new FileReader(); rd.onload = ev => { const lbl = document.getElementById('eg-av-lbl'); if (lbl) lbl.innerHTML = `<img src="${ev.target.result}" style="border-radius:14px;position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`; }; rd.readAsDataURL(avFile);
    });
    document.querySelectorAll('#eg-colors .color-dot').forEach(dot => {
      dot.onclick = () => { selColor = dot.dataset.c; document.querySelectorAll('#eg-colors .color-dot').forEach(d => d.classList.remove('sel')); dot.classList.add('sel'); };
    });
    document.querySelectorAll('.privacy-opt').forEach(opt => {
      opt.onclick = () => { selPublic = opt.dataset.v === 'true'; document.querySelectorAll('.privacy-opt').forEach(o => o.classList.remove('active')); opt.classList.add('active'); };
    });
    document.getElementById('eg-save').onclick = async () => {
      const name = document.getElementById('eg-name').value.trim(); const desc = document.getElementById('eg-desc').value.trim();
      const errEl = document.getElementById('eg-err'); errEl.classList.remove('visible');
      if (!name) { errEl.textContent = 'Name required.'; errEl.classList.add('visible'); return; }
      const btn = document.getElementById('eg-save'); btn.disabled = true; btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try {
        let avUrl = d.avatar_url || '';
        if (avFile) { const url = await Server.uploadCompressedImage(avFile, 'spark_comm_avatars'); if (url) avUrl = url; }
        await Server.updateCommunity(_chatId, { name, description: desc, color: selColor, avatar_url: avUrl, is_public: selPublic });
        await Server.sendChatMessage(_chatId, { sender_id: 'system', username: '', display_name: '', message: `Group updated: "${name}"`, time: _now(), msg_type: 'system' });
        _chatRec = await Server.getChatById(_chatId);
        close(); App.showToast('Group updated!', 'success');
        if (_chatRec) { _msgs = _chatRec.data.messages || []; _msgHash = JSON.stringify(_msgs); _buildUI(); _renderMessages(); }
      } catch (e) {
        btn.disabled = false; btn.innerHTML = `<span class="material-icons-round">check</span>Save Changes`;
        errEl.textContent = e.message || 'Save failed.'; errEl.classList.add('visible');
      }
    };
  };

  const _showAddMember = () => {
    let t = null;
    App.showModal(`
      <div style="padding:20px 20px 32px;display:flex;flex-direction:column;gap:14px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1);text-align:center">Add Member</h3>
        <div style="position:relative">
          <div class="chat-search-inner" style="border-radius:var(--radius-md)">
            <span class="material-icons-round">search</span>
            <input id="am-sr" class="chat-search-input" type="text" placeholder="Search username…" autocomplete="off">
          </div>
          <div class="inline-search-result" id="am-res" style="display:none"></div>
        </div>
        <div id="am-st" style="font-size:13px;color:var(--text-3);text-align:center"></div>
      </div>`);
    document.getElementById('am-sr').addEventListener('input', e => {
      clearTimeout(t); const q = e.target.value.trim(); const res = document.getElementById('am-res');
      if (!q) { res.style.display = 'none'; return; }
      res.style.display = 'block'; res.innerHTML = `<div style="padding:10px;font-size:13px;color:var(--text-3)">Searching…</div>`;
      t = setTimeout(async () => {
        const found = await Server.getProfileByUsername(q); const parts = _chatRec?.data?.participants || [];
        if (!found || parts.includes(found.data.user_id)) {
          res.innerHTML = `<div style="padding:10px;font-size:13px;color:var(--text-3)">${!found ? 'Not found.' : 'Already a member.'}</div>`; return;
        }
        const fd = found.data;
        res.innerHTML = `<div class="inline-result-item" id="am-hit">${App.avatar(fd.avatar_url, fd.display_name, 'av-sm')}
          <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:var(--text-1)">${_esc(fd.display_name)}</div>
          <div style="font-size:12px;color:var(--text-3)">@${_esc(fd.username)}</div></div>
          <button class="btn-primary" style="padding:7px 14px;font-size:13px;flex-shrink:0">Add</button>
        </div>`;
        document.getElementById('am-hit').querySelector('button').addEventListener('click', async () => {
          const st = document.getElementById('am-st'); if (st) st.textContent = 'Adding…';
          try {
            await Server.addMember(_chatId, fd.user_id, { display_name: fd.display_name, username: fd.username, avatar_url: fd.avatar_url || '' });
            await Server.sendChatMessage(_chatId, { sender_id: 'system', username: '', display_name: '', message: `${fd.display_name} was added.`, time: _now(), msg_type: 'system' });
            _chatRec = await Server.getChatById(_chatId);
            if (_chatRec) { _msgs = _chatRec.data.messages || []; _msgHash = JSON.stringify(_msgs); _renderMessages(); }
            App.closeModal(); App.showToast(`${fd.display_name} added!`, 'success');
          } catch { if (st) { st.textContent = 'Failed.'; st.style.color = 'var(--danger)'; } }
        });
      }, 350);
    });
  };

  /* ── Video / Image fullscreen ────────────────────────────────── */
  const _showImgFS = (url) => {
    if (!url) return;
    const el = document.createElement('div'); el.className = 'img-fs';
    el.innerHTML = `<div class="img-fs-close" id="ifs-x"><span class="material-icons-round">close</span></div><img src="${_attr(url)}" alt="Image">`;
    document.body.appendChild(el);
    document.getElementById('ifs-x').onclick = () => el.remove();
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  };

  const _showVideoFS = (url) => {
    if (!url) return;
    const el = document.createElement('div'); el.className = 'img-fs';
    el.style.flexDirection = 'column';
    el.innerHTML = `<div class="img-fs-close" id="ifs-x"><span class="material-icons-round">close</span></div>
      <video src="${_attr(url)}" controls autoplay playsinline style="max-width:100%;max-height:calc(100vh - 80px);border-radius:8px"></video>`;
    document.body.appendChild(el);
    document.getElementById('ifs-x').onclick = () => el.remove();
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  };

  /* ── Utils ──────────────────────────────────────────────────── */
  const _hashPrefix = () => _chatRec?.data?.type === 'group' ? 'communities' : 'chats';
  const _findMsg    = (time) => _msgs.find(m => m.time === time) || null;
  const _now        = ()     => new Date().toISOString();

  const _dateLabel = (iso) => {
    if (!iso) return '';
    try {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
      if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
      return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return ''; }
  };
  const _bytes  = (n) => { if (!n) return '0 B'; const k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(n)/Math.log(k)); return (n/Math.pow(k,i)).toFixed(1)+' '+s[i]; };
  const _safeJson = (str) => { try { return JSON.parse(str); } catch { return null; } };
  const _esc     = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _escNl   = (s) => _esc(s).replace(/\n/g,'<br>');
  const _attr    = (s) => String(s||'').replace(/"/g,'&quot;');
  const _escAttr = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const _errHTML = () => `
    <div class="chat-fullscreen" style="padding:40px 24px;gap:16px;align-items:center;justify-content:center">
      <span class="material-icons-round" style="font-size:56px;color:var(--text-3)">error_outline</span>
      <h3 style="color:var(--text-2)">Chat not found</h3>
      <button class="btn-ghost" id="cw-err-back">Go Back</button>
    </div>`;

  return { open, close, isOpen };
})();
