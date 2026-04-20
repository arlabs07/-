/**
 * ai.js — Aria AI Bot v1
 *
 * Uses Pollinations.ai (no auth, no key required):
 *   Text  → GET https://text.pollinations.ai/{encoded-prompt}
 *   Image → https://image.pollinations.ai/prompt/{encoded-prompt}
 *
 * Features:
 *  • Full chat window UI (reuses Spark design tokens)
 *  • Persistent conversation history (localStorage, last 60 messages)
 *  • Context window sent to API: last 12 exchanges (to stay fast)
 *  • "/img [description]" or "generate image of..." triggers image mode
 *  • onGenerateImage(prompt) hook — called when user generates an image
 *    inside a regular chat (also used by chat.js attach option)
 *  • Rate limiting: max 1 request per 2 seconds
 */

const AriaBot = (() => {

  const BOT_ID      = '__aria_ai__';
  const STORE_KEY   = 'aria_conversation_v1';
  const MAX_HISTORY = 60;   // Messages stored locally
  const CTX_WINDOW  = 12;   // Exchanges sent to API (6 user + 6 bot)
  const TEXT_API    = 'https://text.pollinations.ai/';
  const IMG_API     = 'https://image.pollinations.ai/prompt/';
  const RATE_MS     = 2000;  // Min ms between requests

  let _lastRequest  = 0;
  let _container    = null;
  let _onClose      = null;
  let _history      = [];    // { role: 'user'|'aria', text, time, type: 'text'|'image', imageUrl? }
  let _isTyping     = false;
  let _embedded     = false;

  /* ── Profile ─────────────────────────────────────────────── */
  const BOT_PROFILE = {
    id:          BOT_ID,
    display_name:'Aria',
    username:    'aria_ai',
    avatar_url:  '',   // gradient rendered by CSS
    is_bot:      true,
  };

  /* ── HISTORY ─────────────────────────────────────────────── */
  const _loadHistory = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      _history  = raw ? JSON.parse(raw) : [];
    } catch { _history = []; }
  };

  const _saveHistory = () => {
    try {
      // Keep only last MAX_HISTORY entries
      if (_history.length > MAX_HISTORY) {
        _history = _history.slice(-MAX_HISTORY);
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(_history));
    } catch {}
  };

  const clearHistory = () => {
    _history = [];
    try { localStorage.removeItem(STORE_KEY); } catch {}
  };

  /* ── CONTEXT BUILDER ─────────────────────────────────────── */
  const _buildPrompt = (userMessage) => {
    const systemPrompt =
      `You are Aria, a smart and friendly AI assistant built into Spark, a messaging app. ` +
      `You are helpful, concise, and conversational. ` +
      `Keep responses focused and clear — under 200 words unless the user asks for detail. ` +
      `Current date: ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.`;

    // Take last CTX_WINDOW messages from history (excluding current)
    const recentHistory = _history.slice(-CTX_WINDOW);

    const contextLines = recentHistory
      .filter(m => m.type === 'text')
      .map(m => `${m.role === 'user' ? 'User' : 'Aria'}: ${m.text}`)
      .join('\n');

    const full = contextLines
      ? `${systemPrompt}\n\nConversation so far:\n${contextLines}\n\nUser: ${userMessage}\nAria:`
      : `${systemPrompt}\n\nUser: ${userMessage}\nAria:`;

    return full;
  };

  /* ── IMAGE GENERATION ────────────────────────────────────── */
  const _isImageRequest = (text) => {
    const lower = text.toLowerCase();
    return (
      lower.startsWith('/img ') ||
      lower.startsWith('/image ') ||
      /\b(generate|create|draw|make|show me)\s+(an?\s+)?(image|picture|photo|illustration|art|painting)\b/.test(lower) ||
      /\b(imagine|visualize|picture)\b/.test(lower)
    );
  };

  const _extractImagePrompt = (text) => {
    let p = text
      .replace(/^\/img\s+/i, '')
      .replace(/^\/image\s+/i, '')
      .replace(/^(generate|create|draw|make|show me)\s+(an?\s+)?(image|picture|photo|illustration|art|painting)\s+(of\s+)?/i, '')
      .replace(/^(imagine|visualize|picture)\s+/i, '')
      .trim();
    return p || text;
  };

  /**
   * Generate an image using Pollinations.
   * Returns the image URL (stable — same prompt always gives same image at this URL).
   */
  const generateImage = async (prompt) => {
    const encoded = encodeURIComponent(prompt.trim().slice(0, 250));
    // Add a seed for variety
    const seed = Math.floor(Math.random() * 999999);
    return `${IMG_API}${encoded}?width=768&height=768&seed=${seed}&nologo=true`;
  };

  /* ── TEXT API ────────────────────────────────────────────── */
  const _fetchText = async (prompt) => {
    // Rate limiting
    const now = Date.now();
    if (now - _lastRequest < RATE_MS) {
      await new Promise(r => setTimeout(r, RATE_MS - (now - _lastRequest)));
    }
    _lastRequest = Date.now();

    const encoded = encodeURIComponent(prompt);
    const url     = TEXT_API + encoded;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),  // 30s timeout
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const text = await response.text();
    return text.trim();
  };

  /* ── OPEN ─────────────────────────────────────────────────── */
  const open = (containerEl, opts = {}) => {
    _container = containerEl;
    _onClose   = opts.onClose || null;
    _embedded  = opts.embedded !== undefined ? opts.embedded : window.matchMedia('(min-width: 768px)').matches;

    _loadHistory();

    if (!_embedded) App.hideChrome();
    if (_embedded)  containerEl.classList.add('chat-panel-host');

    App.setHash('#chats/' + BOT_ID);
    _buildUI();
  };

  const close = () => {
    if (_container && _embedded) {
      _container.classList.remove('chat-panel-host');
    }
    if (!_embedded) App.showChrome();
    _container = null;
    if (typeof _onClose === 'function') _onClose();
  };

  const isOpen = () => !!_container;

  /* ── UI ───────────────────────────────────────────────────── */
  const _buildUI = () => {
    _container.innerHTML = `
      <div class="chat-fullscreen">
        <!-- Header -->
        <div class="cw-header">
          <button class="cw-back icon-btn" id="aria-back">
            <span class="material-icons-round">arrow_back</span>
          </button>
          <!-- Aria avatar (gradient circle) -->
          <div style="width:40px;height:40px;border-radius:50%;
            background:linear-gradient(135deg,#0095f6,#bc1888);
            display:flex;align-items:center;justify-content:center;
            font-size:18px;font-weight:800;color:#fff;flex-shrink:0">
            ✦
          </div>
          <div class="cw-info">
            <div class="cw-name">Aria
              <span style="font-size:10px;padding:1px 7px;border-radius:99px;
                background:linear-gradient(135deg,rgba(0,149,246,0.2),rgba(188,24,136,0.2));
                color:var(--accent);font-weight:700;letter-spacing:0.3px">AI</span>
            </div>
            <div class="cw-sub" id="aria-status">Powered by Pollinations · ready</div>
          </div>
          <div class="cw-actions">
            <button class="icon-btn" id="aria-clear" title="Clear conversation">
              <span class="material-icons-round">delete_sweep</span>
            </button>
            <button class="icon-btn" id="aria-more">
              <span class="material-icons-round">more_vert</span>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div class="cw-messages" id="aria-msgs"></div>

        <!-- Input -->
        <div class="cw-input-bar">
          <button class="cw-insert-btn" id="aria-img-btn" title="Generate an image">
            <span class="material-icons-round">auto_awesome</span>
          </button>
          <textarea id="aria-ta" class="cw-textarea"
            placeholder="Ask Aria anything… or /img [description]"
            rows="1"></textarea>
          <button class="cw-send-btn" id="aria-send">
            <span class="material-icons-round">send</span>
          </button>
        </div>
      </div>`;

    /* Bindings */
    document.getElementById('aria-back').onclick = close;

    document.getElementById('aria-clear').onclick = () => {
      const modal = App.showModal(`
        <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
          <span class="material-icons-round" style="font-size:48px;color:var(--warning)">delete_sweep</span>
          <h3 style="font-size:18px;font-weight:800;color:var(--text-1)">Clear conversation?</h3>
          <p style="font-size:13px;color:var(--text-3)">Aria will forget everything you've discussed.</p>
          <div style="display:flex;gap:10px;width:100%">
            <button class="btn-ghost" id="ac-cancel" style="flex:1">Cancel</button>
            <button class="btn-danger" id="ac-confirm" style="flex:1">Clear</button>
          </div>
        </div>`);
      document.getElementById('ac-cancel').onclick = modal;
      document.getElementById('ac-confirm').onclick = () => {
        modal(); clearHistory(); _renderMessages();
      };
    };

    document.getElementById('aria-more').onclick = () => {
      App.showModal(`
        <div style="padding:8px 0 20px">
          <div class="ctx-action" id="am-about">
            <span class="material-icons-round" style="color:var(--accent)">info</span> About Aria
          </div>
          <div class="ctx-action" id="am-img">
            <span class="material-icons-round" style="color:#bc1888">auto_awesome</span> Generate Image
          </div>
          <div class="ctx-action" id="am-clear2">
            <span class="material-icons-round" style="color:var(--warning)">delete_sweep</span> Clear History
          </div>
        </div>`);
      document.getElementById('am-about')?.addEventListener('click', () => {
        App.closeModal();
        _addBotMessage(
          `**Hi! I'm Aria** ✦\n\nI'm your AI assistant powered by Pollinations, built right into Spark.\n\n` +
          `**What I can do:**\n- Answer questions & have conversations\n- Help you write, brainstorm, or think through ideas\n- Generate images — just say "generate image of..." or type /img [description]\n\n` +
          `I remember our conversation during this session. Use the clear button to start fresh.`
        );
      });
      document.getElementById('am-img')?.addEventListener('click', () => {
        App.closeModal();
        document.getElementById('aria-ta')?.focus();
        const ta = document.getElementById('aria-ta');
        if (ta) ta.value = '/img ';
      });
      document.getElementById('am-clear2')?.addEventListener('click', () => {
        App.closeModal();
        document.getElementById('aria-clear')?.click();
      });
    };

    /* Image gen button */
    document.getElementById('aria-img-btn').onclick = () => {
      const ta = document.getElementById('aria-ta');
      if (!ta) return;
      if (!ta.value.trim()) {
        ta.value = '/img ';
      } else {
        ta.value = '/img ' + ta.value.trim();
      }
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    };

    /* Textarea */
    const ta = document.getElementById('aria-ta');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _sendMessage();
      }
    });

    document.getElementById('aria-send').onclick = _sendMessage;

    /* Render existing history */
    _renderMessages();

    /* Welcome message if no history */
    if (_history.length === 0) {
      _addBotMessage(
        `Hi! I'm **Aria** ✦, your AI assistant.\n\n` +
        `Ask me anything, or type \`/img [description]\` to generate an image!\n\n` +
        `*What can I help you with today?*`
      );
    }
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  const _renderMessages = () => {
    const area = document.getElementById('aria-msgs'); if (!area) return;

    if (_history.length === 0) {
      area.innerHTML = ''; return;
    }

    area.innerHTML = _history.map(msg => _msgHtml(msg)).join('');
    _scrollBottom();
  };

  const _msgHtml = (msg) => {
    const isSent = msg.role === 'user';
    const time   = msg.time ? new Date(msg.time).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', hour12:true }) : '';

    let bubble = '';

    if (msg.type === 'image' && msg.imageUrl) {
      bubble = `
        <div class="bubble" style="padding:4px">
          ${isSent ? '' : `<div style="font-size:11px;color:rgba(255,255,255,0.5);padding:6px 8px 2px;font-style:italic">✦ ${_esc(msg.text)}</div>`}
          <div class="bubble-img" data-img="${_attr(msg.imageUrl)}">
            <img src="${_attr(msg.imageUrl)}" alt="${_attr(msg.text)}"
              loading="lazy"
              style="max-height:300px;border-radius:14px"
              onerror="this.parentElement.innerHTML='<div style=padding:16px;color:var(--text-3);font-size:13px>Image failed to load</div>'">
          </div>
          ${isSent ? `<div style="font-size:12px;padding:6px 8px 2px;opacity:0.7">${_esc(msg.text)}</div>` : ''}
        </div>`;
    } else if (msg.type === 'typing') {
      bubble = `
        <div class="bubble" style="padding:12px 16px">
          <div style="display:flex;gap:4px;align-items:center">
            ${[0,1,2].map(i =>
              `<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.5);
                animation:ariaDot 1.2s ${i*0.2}s infinite"></div>`
            ).join('')}
          </div>
        </div>`;
    } else {
      bubble = `<div class="bubble">${_parseMarkdown(msg.text || '')}</div>`;
    }

    return `
      <div class="msg-row ${isSent ? 'sent' : 'recv'}" data-aria-t="${_attr(msg.time||'')}">
        ${!isSent && msg.type !== 'typing' ? `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:20px;height:20px;border-radius:50%;
              background:linear-gradient(135deg,#0095f6,#bc1888);
              display:flex;align-items:center;justify-content:center;
              font-size:10px;color:#fff;font-weight:800">✦</div>
            <span style="font-size:11px;font-weight:700;color:var(--accent)">Aria</span>
          </div>` : ''}
        ${bubble}
        ${msg.type !== 'typing' ? `
          <div class="msg-meta">
            <span class="msg-time">${time}</span>
          </div>` : ''}
      </div>`;
  };

  /* ── SEND ─────────────────────────────────────────────────── */
  const _sendMessage = async () => {
    const ta   = document.getElementById('aria-ta');
    const text = ta?.value.trim();
    if (!text || _isTyping) return;

    ta.value = ''; ta.style.height = 'auto';

    /* Add user message to history */
    const userMsg = { role: 'user', text, time: new Date().toISOString(), type: 'text' };
    _history.push(userMsg);
    _saveHistory();

    /* Append user message to DOM */
    _appendMessage(userMsg);

    /* Decide: image or text */
    if (_isImageRequest(text)) {
      await _handleImageRequest(text);
    } else {
      await _handleTextRequest(text);
    }
  };

  const _handleTextRequest = async (userText) => {
    _isTyping = true;
    _setStatus('Aria is thinking…');

    /* Show typing indicator */
    const typingMsg = { role: 'aria', text: '', time: new Date().toISOString(), type: 'typing', _temp: true };
    _history.push(typingMsg);
    _appendMessage(typingMsg);

    try {
      const prompt   = _buildPrompt(userText);
      const response = await _fetchText(prompt);

      /* Remove typing indicator */
      _history = _history.filter(m => !m._temp);
      const typingEl = document.querySelector('[data-aria-t=""][class*="recv"]');
      typingEl?.remove();

      /* Add response */
      const botMsg = { role: 'aria', text: response, time: new Date().toISOString(), type: 'text' };
      _history.push(botMsg);
      _saveHistory();
      _appendMessage(botMsg);

    } catch (err) {
      _history = _history.filter(m => !m._temp);
      document.querySelector('.msg-row.recv:last-child')?.remove();

      const errMsg = {
        role: 'aria',
        text: `Sorry, I couldn't connect right now. ${err.name === 'TimeoutError' ? 'The request timed out.' : 'Please try again.'} 🔄`,
        time: new Date().toISOString(),
        type: 'text'
      };
      _history.push(errMsg);
      _saveHistory();
      _appendMessage(errMsg);
    } finally {
      _isTyping = false;
      _setStatus('Powered by Pollinations · ready');
    }
  };

  const _handleImageRequest = async (userText) => {
    _isTyping = true;
    _setStatus('Generating image…');

    /* Show user message as image request */
    const imagePrompt = _extractImagePrompt(userText);

    /* Show typing-style indicator */
    const typingMsg = { role: 'aria', text: '', time: new Date().toISOString(), type: 'typing', _temp: true };
    _history.push(typingMsg);
    _appendMessage(typingMsg);

    try {
      const imageUrl = await generateImage(imagePrompt);

      /* Remove typing indicator */
      _history = _history.filter(m => !m._temp);
      document.querySelectorAll('.msg-row.recv').forEach(el => {
        if (el.querySelector('[style*="ariaDot"]')) el.remove();
      });

      /* Add image message */
      const imgMsg = {
        role: 'aria', text: imagePrompt,
        time: new Date().toISOString(),
        type: 'image', imageUrl
      };
      _history.push(imgMsg);
      _saveHistory();
      _appendMessage(imgMsg);

      /* Follow-up text */
      const followMsg = {
        role: 'aria',
        text: `Here's your image! 🎨 The image was generated based on: *"${imagePrompt}"*\n\nLet me know if you'd like a variation or a different style!`,
        time: new Date().toISOString(),
        type: 'text'
      };
      _history.push(followMsg);
      _saveHistory();
      _appendMessage(followMsg);

    } catch (err) {
      _history = _history.filter(m => !m._temp);
      document.querySelectorAll('.msg-row.recv').forEach(el => {
        if (el.querySelector('[style*="ariaDot"]')) el.remove();
      });

      const errMsg = {
        role: 'aria', text: `Couldn't generate the image. Please try again! 🔄`,
        time: new Date().toISOString(), type: 'text'
      };
      _history.push(errMsg);
      _saveHistory();
      _appendMessage(errMsg);
    } finally {
      _isTyping = false;
      _setStatus('Powered by Pollinations · ready');
    }
  };

  const _appendMessage = (msg) => {
    const area = document.getElementById('aria-msgs'); if (!area) return;
    const wasBot = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = _msgHtml(msg);
    const el = wrapper.firstElementChild;
    if (el) {
      area.appendChild(el);
      /* Bind image click */
      el.querySelector('.bubble-img')?.addEventListener('click', () => {
        if (msg.imageUrl) _openImageFS(msg.imageUrl, msg.text);
      });
    }
    if (wasBot) _scrollBottom();
  };

  const _addBotMessage = (text) => {
    const msg = { role: 'aria', text, time: new Date().toISOString(), type: 'text' };
    _history.push(msg);
    _saveHistory();
    _appendMessage(msg);
  };

  /* ── HELPERS ──────────────────────────────────────────────── */
  const _scrollBottom = () => {
    requestAnimationFrame(() => {
      const area = document.getElementById('aria-msgs');
      if (area) area.scrollTop = area.scrollHeight;
    });
  };

  const _setStatus = (text) => {
    const el = document.getElementById('aria-status');
    if (el) el.textContent = text;
  };

  const _openImageFS = (url, caption) => {
    const el = document.createElement('div');
    el.className = 'media-fs';
    el.innerHTML = `
      <div class="media-fs-toolbar">
        <button class="media-fs-back" id="aria-fs-close"><span class="material-icons-round">arrow_back</span></button>
        <div class="media-fs-title">
          <div class="media-fs-title-main">Generated Image</div>
          <div class="media-fs-title-sub">${_esc(caption||'')}</div>
        </div>
        <button class="media-fs-action" id="aria-fs-dl"><span class="material-icons-round">download</span></button>
      </div>
      <div class="media-fs-content">
        <img class="media-fs-img" src="${_attr(url)}" alt="${_attr(caption||'')}">
      </div>
      <div class="media-fs-bottom"><div class="media-fs-caption">${_esc(caption||'AI Generated Image')}</div></div>`;
    document.body.appendChild(el);
    document.getElementById('aria-fs-close').onclick = () => el.remove();
    document.getElementById('aria-fs-dl').onclick = () => {
      const a = document.createElement('a');
      a.href = url; a.download = 'aria-image.jpg'; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
    };
  };

  const _parseMarkdown = (raw) => {
    let t = String(raw||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t = t.replace(/```([\s\S]*?)```/g, (_,c) => `<code class="md-codeblock">${c.trim()}</code>`);
    t = t.replace(/`([^`\n]+)`/g, (_,c) => `<span class="md-code">${c}</span>`);
    t = t.replace(/\*\*(.+?)\*\*/g, (_,x) => `<strong class="md-bold">${x}</strong>`);
    t = t.replace(/\*([^*\n]+)\*/g, (_,x) => `<em class="md-italic">${x}</em>`);
    t = t.replace(/\n/g, '<br>');
    return t;
  };

  const _esc  = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _attr = (s) => String(s||'').replace(/"/g,'&quot;');

  /* ── CSS INJECTION ────────────────────────────────────────── */
  /* Inject keyframe for typing indicator if not already present */
  if (!document.getElementById('aria-styles')) {
    const style = document.createElement('style');
    style.id = 'aria-styles';
    style.textContent = `
      @keyframes ariaDot {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40%            { transform: scale(1);   opacity: 1;   }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── PUBLIC ───────────────────────────────────────────────── */
  return {
    BOT_ID,
    BOT_PROFILE,
    open,
    close,
    isOpen,
    clearHistory,
    generateImage,    // exported so chat.js can call it
    _loadHistory,     // exported for chats.js thread list peek
    get history() { return _history; },
  };
})();
