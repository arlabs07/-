/**
 * messenger.js — Full Messaging: DMs, Groups, File upload, Mobile full-screen
 * - No Requests tab (handled by Notifications)
 * - No voice input button
 * - Group joining is direct (no request)
 * - All var declarations for SPCK WebView compatibility
 */

var MessengerManager = (() => {

  var activeThreadId = null;
  var searchQuery    = '';
  var newMsgSelected = [];

  /* ── Data helpers ──────────────────────────────────────────── */
  function _threads() { return InstagramData.messages || []; }
  function _getThread(id) { return _threads().find(function(t){ return t.id === id; }) || null; }
  function _getOrCreate(userId) {
    var t = _threads().find(function(th){ return !th.isGroup && th.participantId === userId; });
    if (!t) {
      t = { id: 'thread_' + Date.now(), isGroup: false, participantId: userId, messages: [], unread: 0 };
      InstagramData.messages.unshift(t);
    }
    return t;
  }
  function _e(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER PAGE
  ══════════════════════════════════════════════════════════════ */
  function render() {
    var page = document.getElementById('page-messages');
    if (!page) return;
    var cu = InstagramData.currentUser;

    var html = '<div class="messenger-root" id="messenger-root">';

    // Thread list panel
    html += '<div class="msg-panel-threads" id="msg-threads-panel">';
    html += '<div class="msg-topbar">';
    html += '<span class="msg-topbar-title">' + _e(cu.username) + '</span>';
    html += '<div class="msg-topbar-actions">';
    html += '<div class="msg-icon-btn" onclick="MessengerManager.openNewMessage()" title="New message">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>';
    html += '</div></div></div>';

    // Search
    html += '<div class="msg-search"><div class="msg-search-inner">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    html += '<input type="text" placeholder="Search" id="msg-search-input" oninput="MessengerManager.onSearch(this.value)">';
    html += '</div></div>';

    // Thread list — NO tabs, just chats
    html += '<div class="msg-thread-list" id="msg-thread-list">' + _buildThreadList() + '</div>';
    html += '</div>'; // end threads panel

    // Chat panel (empty state)
    html += '<div class="msg-panel-chat" id="msg-chat-panel">';
    html += _emptyChat();
    html += '</div>';
    html += '</div>'; // end messenger-root
    page.innerHTML = html;
  }

  function _emptyChat() {
    return (
      '<div class="msg-chat-empty">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<h3>Your Messages</h3>' +
        '<p>Send private photos and messages to a friend or group.</p>' +
        '<button class="btn btn-primary" onclick="MessengerManager.openNewMessage()">Send message</button>' +
      '</div>'
    );
  }

  /* ── Thread list ───────────────────────────────────────────── */
  function _buildThreadList() {
    var threads = _threads();
    if (searchQuery) {
      threads = threads.filter(function(t) {
        if (t.isGroup) return (t.groupName || '').toLowerCase().includes(searchQuery.toLowerCase());
        var u = InstagramData.getUserById(t.participantId);
        return u ? u.username.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      });
    }
    if (!threads.length) {
      return '<div style="padding:40px 20px;text-align:center;color:var(--text-muted);font-size:14px">No conversations yet.</div>';
    }
    return threads.map(_buildThreadRow).join('');
  }

  function _buildThreadRow(thread) {
    var lastMsg  = thread.messages[thread.messages.length - 1];
    var isOwn    = lastMsg && lastMsg.from === 'user_0';
    var isActive = thread.id === activeThreadId;

    var preview = 'Start a conversation';
    if (lastMsg) {
      if (lastMsg.type === 'image') preview = isOwn ? 'You sent a photo \uD83D\uDCF7' : 'Sent a photo \uD83D\uDCF7';
      else if (lastMsg.type === 'file') preview = isOwn ? 'You sent a file \uD83D\uDCCE' : 'Sent a file \uD83D\uDCCE';
      else preview = (isOwn ? 'You: ' : '') + _e(lastMsg.text || '');
    }
    var timeStr = lastMsg ? InstagramData.timeAgo(lastMsg.timestamp || Date.now()) : '';

    var avatarHtml = '', nameHtml = '';
    if (thread.isGroup) {
      var members = (thread.memberIds || []).slice(0, 2).map(function(id){ return InstagramData.getUserById(id); }).filter(Boolean);
      if (members.length >= 2) {
        avatarHtml = '<div class="msg-thread-avatar-group">' +
          '<div class="ga1"><img src="' + members[0].avatar + '" alt="" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'"></div>' +
          '<div class="ga2"><img src="' + members[1].avatar + '" alt="" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=3\'"></div>' +
          '</div>';
      } else {
        avatarHtml = '<div class="msg-thread-avatar-wrap"><img class="msg-thread-avatar" src="https://i.pravatar.cc/150?img=5" alt=""></div>';
      }
      nameHtml = _e(thread.groupName || 'Group');
    } else {
      var user = InstagramData.getUserById(thread.participantId);
      if (!user) return '';
      avatarHtml = '<div class="msg-thread-avatar-wrap">' +
        '<img class="msg-thread-avatar" src="' + user.avatar + '" alt="' + _e(user.username) + '" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'">' +
        '</div>';
      nameHtml = _e(user.username) + (user.isVerified ? ' <span style="display:inline-flex;width:13px;height:13px">' + Icons.verified + '</span>' : '');
    }

    var html = '<div class="msg-thread-item ' + (isActive ? 'active' : '') + '" onclick="MessengerManager.openThread(\'' + thread.id + '\')">';
    html += avatarHtml;
    html += '<div class="msg-thread-info">';
    html += '<div class="msg-thread-name">' + nameHtml + '</div>';
    html += '<div class="msg-thread-preview ' + (thread.unread > 0 ? 'unread' : '') + '">' + preview + '</div>';
    html += '</div>';
    html += '<div class="msg-thread-right">';
    html += '<div class="msg-thread-time">' + timeStr + '</div>';
    if (thread.unread > 0) html += '<div class="msg-unread-badge">' + thread.unread + '</div>';
    html += '</div></div>';
    return html;
  }

  /* ══════════════════════════════════════════════════════════════
     OPEN THREAD
  ══════════════════════════════════════════════════════════════ */
  function openThread(threadId) {
    activeThreadId = threadId;
    var thread = _getThread(threadId);
    if (!thread) return;
    thread.unread = 0;
    App.updateBadges();

    document.querySelectorAll('.msg-thread-item').forEach(function(el){ el.classList.remove('active'); });

    var chatPanel = document.getElementById('msg-chat-panel');
    var root      = document.getElementById('messenger-root');
    if (chatPanel) chatPanel.classList.add('open');
    if (root && window.innerWidth < 769) {
      root.classList.add('chat-open');
      document.body.classList.add('reel-player-active');
    }

    _renderChat(thread);
    _refreshList();

    // Hash URL: #messages#thread_1
    if (typeof _setHash === 'function') _setHash('#messages#' + threadId); else window.location.hash = '#messages#' + threadId;
  }

  function closeChat() {
    activeThreadId = null;
    var chatPanel = document.getElementById('msg-chat-panel');
    var root      = document.getElementById('messenger-root');
    if (chatPanel) { chatPanel.classList.remove('open'); chatPanel.innerHTML = _emptyChat(); }
    if (root) root.classList.remove('chat-open');
    document.body.classList.remove('reel-player-active');
    if (typeof _setHash === 'function') _setHash('#messages'); else window.location.hash = '#messages';
  }

  /* ── Render chat panel ─────────────────────────────────────── */
  function _renderChat(thread) {
    var chatPanel = document.getElementById('msg-chat-panel');
    if (!chatPanel) return;

    var isGroup  = thread.isGroup;
    var cu       = InstagramData.currentUser;
    var chatUser = isGroup ? null : InstagramData.getUserById(thread.participantId);

    // Header
    var headerHtml = '<div class="msg-chat-header">';
    // Back button (mobile)
    headerHtml += '<div class="msg-chat-back" onclick="MessengerManager.closeChat()">';
    headerHtml += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    headerHtml += '</div>';

    // Avatar
    if (isGroup) {
      headerHtml += '<div class="msg-chat-avatar"><div style="width:38px;height:38px;border-radius:50%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;color:var(--text-secondary)">';
      headerHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      headerHtml += '</div></div>';
    } else if (chatUser) {
      headerHtml += '<div class="msg-chat-avatar" onclick="App.navigateTo(\'profile\',\'' + chatUser.id + '\')">';
      headerHtml += '<img src="' + chatUser.avatar + '" alt="' + _e(chatUser.username) + '" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'">';
      headerHtml += '</div>';
    }

    // Info
    headerHtml += '<div class="msg-chat-info"' + (!isGroup && chatUser ? ' onclick="App.navigateTo(\'profile\',\'' + chatUser.id + '\')"' : '') + '>';
    if (isGroup) {
      headerHtml += '<div class="msg-chat-name">' + _e(thread.groupName || 'Group') + '</div>';
      headerHtml += '<div class="msg-chat-status">' + ((thread.memberIds || []).length + 1) + ' members</div>';
    } else if (chatUser) {
      headerHtml += '<div class="msg-chat-name">' + _e(chatUser.username) + (chatUser.isVerified ? ' <span style="display:inline-flex;width:13px;height:13px">' + Icons.verified + '</span>' : '') + '</div>';
      headerHtml += '<div class="msg-chat-status online">Active now</div>';
    }
    headerHtml += '</div>';

    // Action buttons (call icons, more)
    headerHtml += '<div class="msg-chat-header-actions">';
    if (!isGroup) {
      headerHtml += '<div class="msg-icon-btn" onclick="showToast(\'Voice call coming soon\')">';
      headerHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.14 6.14l1.81-1.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
      headerHtml += '</div>';
      headerHtml += '<div class="msg-icon-btn" onclick="showToast(\'Video call coming soon\')">';
      headerHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
      headerHtml += '</div>';
    }
    headerHtml += '<div class="msg-icon-btn" onclick="MessengerManager.openChatInfo(\'' + thread.id + '\')">';
    headerHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
    headerHtml += '</div></div></div>'; // end actions + header

    var msgAreaId = 'msg-messages-' + thread.id;
    var inputId   = 'msg-input-' + thread.id;
    var sendId    = 'msg-send-' + thread.id;

    // Input bar — NO voice/mic button
    var inputHtml = '<div class="msg-input-bar">';
    inputHtml += '<div class="msg-input-wrap">';
    inputHtml += '<textarea class="msg-input-field" id="' + inputId + '" placeholder="Message\u2026" rows="1"';
    inputHtml += ' oninput="MessengerManager.onInput(this,\'' + thread.id + '\')"';
    inputHtml += ' onkeydown="MessengerManager.onKeyDown(event,\'' + thread.id + '\')"></textarea>';
    inputHtml += '<div class="msg-input-actions">';
    // Emoji
    inputHtml += '<div class="msg-input-btn" onclick="MessengerManager.addEmoji(\'' + thread.id + '\')" title="Emoji">';
    inputHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
    inputHtml += '</div>';
    // File attach
    inputHtml += '<label class="msg-input-btn" title="Attach file"><input type="file" style="display:none" multiple onchange="MessengerManager.handleFileUpload(event,\'' + thread.id + '\')">';
    inputHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
    inputHtml += '</label>';
    // Image
    inputHtml += '<label class="msg-input-btn" title="Add photo"><input type="file" accept="image/*" style="display:none" onchange="MessengerManager.handleImageUpload(event,\'' + thread.id + '\')">';
    inputHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    inputHtml += '</label>';
    inputHtml += '</div></div>'; // end input-wrap
    // Send button only (NO mic)
    inputHtml += '<div class="msg-send-btn visible" id="' + sendId + '" onclick="MessengerManager.sendMessage(\'' + thread.id + '\')">';
    inputHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    inputHtml += '</div>';
    inputHtml += '</div>'; // end input-bar

    chatPanel.innerHTML = headerHtml +
      '<div class="msg-messages-area" id="' + msgAreaId + '">' + _buildMessagesHtml(thread) + '</div>' +
      inputHtml;

    var area = document.getElementById(msgAreaId);
    if (area) area.scrollTop = area.scrollHeight;
  }

  function _buildMessagesHtml(thread) {
    if (!thread.messages.length) {
      return '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:14px">Say hello! \uD83D\uDC4B</div>';
    }
    var html     = '';
    var lastDate = '';

    thread.messages.forEach(function(msg) {
      var isMe   = msg.from === 'user_0';
      var sender = isMe
        ? InstagramData.currentUser
        : (thread.isGroup ? InstagramData.getUserById(msg.from) : InstagramData.getUserById(thread.participantId)) || InstagramData.users[0];

      var d = new Date(msg.timestamp || Date.now());
      var msgDate = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
      if (msgDate !== lastDate) {
        html += '<div class="msg-date-divider">' + msgDate + '</div>';
        lastDate = msgDate;
      }

      var bubbleContent = '';
      if (msg.type === 'image') {
        bubbleContent = '<div class="msg-bubble-img"><img src="' + (msg.src || '') + '" alt="Image" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>';
      } else if (msg.type === 'file') {
        var sizeStr = msg.size ? Math.round(msg.size / 1024) + ' KB' : '';
        bubbleContent = '<div class="msg-bubble-file"><div class="msg-bubble-file-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="msg-bubble-file-info"><div class="msg-bubble-file-name">' + _e(msg.name || 'File') + '</div><div class="msg-bubble-file-size">' + sizeStr + '</div></div></div>';
      } else {
        bubbleContent = '<div class="msg-bubble">' + _e(msg.text || '') + '</div>';
      }

      html += '<div class="msg-bubble-row ' + (isMe ? 'me' : 'them') + '">';
      if (!isMe && sender) {
        html += '<div class="msg-bubble-avatar"><img src="' + (sender.avatar || '') + '" alt="" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'"></div>';
      }
      html += '<div class="msg-bubble-content">';
      if (thread.isGroup && !isMe && sender) {
        html += '<div class="msg-sender-name">' + _e(sender.username || '') + '</div>';
      }
      html += bubbleContent;
      html += '<div class="msg-bubble-time">' + InstagramData.timeAgo(msg.timestamp || Date.now()) + '</div>';
      html += '</div></div>';
    });
    return html;
  }

  /* ── Send message ──────────────────────────────────────────── */
  function sendMessage(threadId) {
    var input = document.getElementById('msg-input-' + threadId);
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var thread = _getThread(threadId);
    if (!thread) return;

    var msg = { from: 'user_0', text: text, type: 'text', timestamp: Date.now() };
    thread.messages.push(msg);
    input.value = '';
    _resizeTA(input);
    _appendBubble(threadId, msg, thread);
    _refreshList();
    _simulateReply(threadId, thread);
  }

  function _simulateReply(threadId, thread) {
    if (thread.isGroup) return;
    var replies = ['Got it! \uD83D\uDC4D','That\'s awesome!','Haha \uD83D\uDE02','Same \uD83D\uDE4C','Love it! \u2764\uFE0F','Let\'s do it!','Sure thing!','\uD83D\uDD25\uD83D\uDD25'];
    setTimeout(function() {
      var reply = { from: thread.participantId, text: replies[Math.floor(Math.random() * replies.length)], type: 'text', timestamp: Date.now() };
      thread.messages.push(reply);
      _appendBubble(threadId, reply, thread);
      _refreshList();
    }, 1500 + Math.random() * 1500);
  }

  function _appendBubble(threadId, msg, thread) {
    var area = document.getElementById('msg-messages-' + threadId);
    if (!area) return;
    var isMe   = msg.from === 'user_0';
    var sender = isMe ? InstagramData.currentUser : InstagramData.getUserById(thread.participantId) || InstagramData.users[0];

    var bubbleContent = '';
    if (msg.type === 'image') {
      bubbleContent = '<div class="msg-bubble-img"><img src="' + (msg.src || '') + '" alt="" loading="lazy"></div>';
    } else if (msg.type === 'file') {
      bubbleContent = '<div class="msg-bubble-file"><div class="msg-bubble-file-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="msg-bubble-file-info"><div class="msg-bubble-file-name">' + _e(msg.name || 'File') + '</div></div></div>';
    } else {
      bubbleContent = '<div class="msg-bubble">' + _e(msg.text || '') + '</div>';
    }

    var div = document.createElement('div');
    div.className = 'msg-bubble-row ' + (isMe ? 'me' : 'them') + ' fade-in';
    var inner = '';
    if (!isMe && sender) inner += '<div class="msg-bubble-avatar"><img src="' + (sender.avatar || '') + '" alt="" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'"></div>';
    inner += '<div class="msg-bubble-content">' + bubbleContent + '<div class="msg-bubble-time">now</div></div>';
    div.innerHTML = inner;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function _refreshList() {
    var list = document.getElementById('msg-thread-list');
    if (list) list.innerHTML = _buildThreadList();
  }

  /* ── Input ─────────────────────────────────────────────────── */
  function onInput(textarea, threadId) {
    _resizeTA(textarea);
  }

  function onKeyDown(event, threadId) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(threadId);
    }
  }

  function _resizeTA(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  /* ── File / image upload ───────────────────────────────────── */
  function handleImageUpload(event, threadId) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var thread = _getThread(threadId);
      if (!thread) return;
      var msg = { from: 'user_0', type: 'image', src: e.target.result, timestamp: Date.now() };
      thread.messages.push(msg);
      _appendBubble(threadId, msg, thread);
      _refreshList();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleFileUpload(event, threadId) {
    var files  = Array.from(event.target.files);
    var thread = _getThread(threadId);
    if (!thread) return;
    files.forEach(function(file) {
      var msg = { from: 'user_0', type: 'file', name: file.name, size: file.size, timestamp: Date.now() };
      thread.messages.push(msg);
      _appendBubble(threadId, msg, thread);
    });
    _refreshList();
    showToast(files.length + ' file' + (files.length > 1 ? 's' : '') + ' sent');
    event.target.value = '';
  }

  /* ── Emoji ─────────────────────────────────────────────────── */
  function addEmoji(threadId) {
    var input = document.getElementById('msg-input-' + threadId);
    if (!input) return;
    var emojis = ['\u2764\uFE0F','\uD83D\uDD25','\uD83D\uDE02','\uD83D\uDE0D','\uD83D\uDE4C','\uD83D\uDCAF','\u2728','\uD83C\uDF89','\uD83E\uDD29','\uD83D\uDE2D'];
    input.value += emojis[Math.floor(Math.random() * emojis.length)];
    input.focus();
  }

  /* ── New message / group — direct join, no request ─────────── */
  function openNewMessage() {
    newMsgSelected = [];
    var overlay = document.getElementById('post-modal-overlay');
    if (!overlay) return;

    var html = '<div class="msg-new-modal">';
    html += '<div class="msg-new-modal-header">';
    html += '<span class="msg-new-modal-title">New message</span>';
    html += '<div class="msg-new-modal-close" onclick="PostCard.closeModal()">' + Icons.close + '</div>';
    html += '</div>';
    html += '<div class="msg-new-search"><input type="text" id="msg-new-q" placeholder="Search people\u2026" oninput="MessengerManager.filterNewUsers(this.value)"></div>';
    html += '<div class="msg-new-selected" id="msg-new-chips"></div>';
    html += '<div class="msg-new-list" id="msg-new-list">' + _buildUserPickerList(InstagramData.users) + '</div>';
    html += '<div class="msg-new-create-btn"><button id="msg-new-create" disabled onclick="MessengerManager.createConversation()">Start chat</button></div>';
    html += '</div>';

    overlay.querySelector('.modal-content').innerHTML = html;
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function _buildUserPickerList(users) {
    if (!users.length) return '<div style="padding:30px;text-align:center;color:var(--text-muted)">No results</div>';
    return users.map(function(user) {
      var sel = newMsgSelected.includes(user.id);
      var row = '<div class="msg-new-user-row ' + (sel ? 'selected' : '') + '" id="msg-new-row-' + user.id + '" onclick="MessengerManager.toggleNewUser(\'' + user.id + '\')">';
      row += '<div class="msg-new-user-avatar"><img src="' + user.avatar + '" alt="' + _e(user.username) + '" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'"></div>';
      row += '<div class="msg-new-user-info"><div class="msg-new-user-name">' + _e(user.username) + (user.isVerified ? ' <span style="display:inline-flex;width:12px;height:12px">' + Icons.verified + '</span>' : '') + '</div><div class="msg-new-user-full">' + _e(user.fullName) + '</div></div>';
      row += '<div class="msg-new-user-check"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
      row += '</div>';
      return row;
    }).join('');
  }

  function toggleNewUser(userId) {
    var idx = newMsgSelected.indexOf(userId);
    if (idx > -1) newMsgSelected.splice(idx, 1);
    else newMsgSelected.push(userId);

    var row = document.getElementById('msg-new-row-' + userId);
    if (row) row.classList.toggle('selected', newMsgSelected.includes(userId));

    var chips = document.getElementById('msg-new-chips');
    if (chips) {
      chips.innerHTML = newMsgSelected.map(function(id) {
        var u = InstagramData.getUserById(id);
        if (!u) return '';
        return '<div class="msg-new-chip"><img src="' + u.avatar + '" alt="" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'">' + _e(u.username) + '<div class="msg-new-chip-remove" onclick="event.stopPropagation();MessengerManager.toggleNewUser(\'' + id + '\')">&#x2715;</div></div>';
      }).join('');
    }

    var btn = document.getElementById('msg-new-create');
    if (btn) {
      btn.disabled = newMsgSelected.length === 0;
      btn.textContent = newMsgSelected.length > 1 ? 'Create group' : 'Start chat';
    }
  }

  function filterNewUsers(query) {
    var list = document.getElementById('msg-new-list');
    if (!list) return;
    var filtered = InstagramData.users.filter(function(u) {
      return u.username.toLowerCase().includes(query.toLowerCase()) || u.fullName.toLowerCase().includes(query.toLowerCase());
    });
    list.innerHTML = _buildUserPickerList(filtered);
  }

  function createConversation() {
    if (!newMsgSelected.length) return;
    PostCard.closeModal();

    if (newMsgSelected.length === 1) {
      // Direct DM — open immediately, no request needed
      var thread = _getOrCreate(newMsgSelected[0]);
      if (thread) { render(); openThread(thread.id); }
    } else {
      // Group — direct join, no request
      var members = newMsgSelected.map(function(id){ return InstagramData.getUserById(id); }).filter(Boolean);
      var name    = members.map(function(m){ return m.username; }).join(', ');
      var newThread = {
        id:        'group_' + Date.now(),
        isGroup:   true,
        groupName: name.substring(0, 40),
        memberIds: newMsgSelected,
        messages:  [],
        unread:    0,
      };
      InstagramData.messages.unshift(newThread);
      render();
      openThread(newThread.id);
    }
  }

  /* ── Chat info menu ────────────────────────────────────────── */
  function openChatInfo(threadId) {
    var thread = _getThread(threadId);
    if (!thread) return;

    var items = thread.isGroup ? [
      { icon: Icons.profile,        label: 'View members',        fn: 'showToast("Members: ' + ((thread.memberIds || []).length + 1) + ' people");BottomSheet.close()' },
      { icon: Icons.moreHorizontal, label: 'Add members',         fn: 'MessengerManager.openNewMember(\'' + threadId + '\');BottomSheet.close()' },
      { divider: true },
      { icon: Icons.mute,           label: 'Mute notifications',  fn: 'showToast("Muted");BottomSheet.close()' },
      { icon: Icons.close,          label: 'Leave group',         fn: 'showToast("You left the group");MessengerManager.closeChat();BottomSheet.close()', danger: true },
      { divider: true },
      { icon: Icons.close,          label: 'Cancel',              fn: 'BottomSheet.close()' },
    ] : [
      { icon: Icons.profile,        label: 'View profile',        fn: 'App.navigateTo("profile","' + thread.participantId + '");BottomSheet.close()' },
      { icon: Icons.mute,           label: 'Mute messages',       fn: 'showToast("Muted");BottomSheet.close()' },
      { divider: true },
      { icon: Icons.close,          label: 'Delete conversation', fn: 'showToast("Conversation deleted");MessengerManager.closeChat();BottomSheet.close()', danger: true },
      { divider: true },
      { icon: Icons.close,          label: 'Cancel',              fn: 'BottomSheet.close()' },
    ];

    var menuHtml = '<div class="sheet-menu-list">';
    items.forEach(function(item) {
      if (item.divider) { menuHtml += '<div class="sheet-menu-divider"></div>'; return; }
      menuHtml += '<div class="sheet-menu-item ' + (item.danger ? 'danger' : '') + '" onclick="' + item.fn + '">';
      menuHtml += '<span class="sheet-menu-icon">' + item.icon + '</span>';
      menuHtml += '<span class="sheet-menu-label">' + item.label + '</span>';
      menuHtml += '</div>';
    });
    menuHtml += '</div>';
    BottomSheet.open('', menuHtml, { noHeader: true });
  }

  function openNewMember(threadId) {
    // Add members to existing group — direct, no request
    showToast('Add member: select from contacts');
  }

  /* ── Search ────────────────────────────────────────────────── */
  function onSearch(val) {
    searchQuery = val;
    var list = document.getElementById('msg-thread-list');
    if (list) list.innerHTML = _buildThreadList();
  }

  /* ── Public ────────────────────────────────────────────────── */
  return {
    render, openThread, closeChat,
    sendMessage, onInput, onKeyDown,
    handleImageUpload, handleFileUpload, addEmoji,
    openNewMessage, toggleNewUser, filterNewUsers, createConversation,
    onSearch, openChatInfo, openNewMember,
    _getThread,
  };

})();
