/*** ARhub Citation Engine v3.1* Markdown · Code blocks · Tables · Full Audio Player · Full Video Player* Confirmation overlay · Auto media detection · Notifications · Lazy libs** PUBLIC API:*   AR_Citation.init(db)                — initialise with citation map*   AR_Citation.showConfirmation(url)   — open security overlay for a URL*   AR_Citation.showMediaPlayer(url,t)  — open audio/video player ("audio"|"video")
 *   AR_Citation.buildCodeBlock(s,l,t)   — build a highlighted code-block element*   AR_Citation.buildTableWrap(el,t)    — wrap a <table> element*   AR_Citation.showNotif(msg,type,dur) — show a toast ("success"|"error"|"info")*/
const AR_Citation = (function() {
  'use strict';
  const MARKED_CDN =
    'https://cdn.jsdelivr.net/npm/marked@9/marked.min.js';
  const HLJS_CDN =
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
  const HLJS_CSS =
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
  const PAPA_CDN =
    'https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js';
  const H2C_CDN =
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const ACC = '#00c8ff',
    ACC2 = '#7b61ff';
  let _db = {},
    _urls = [],
    _overlayOpen = false;
  const _media = { images: [],
    videos: [], iframes: [],
    audio: [] };
  let _sourceContainers = [],
    _arId = 0,
    _notifWrap = null;
  let _libLoading = { marked: false,
    hljs: false, papa: false,
    h2c: false };
  let _libQueues = { marked: [],
    hljs: [] };
  const qs = (s, el = document) =>
    el.querySelector(s);
  const qsa = (s, el = document) =>
    Array.from(el.querySelectorAll(
      s));
  const ce = (t, cls,
    html) => { const e = document
        .createElement(t); if (cls)
        e.className = cls; if (
        html !== undefined) e
        .innerHTML =
      html; return e; };
  const attr = (el, obj) => { Object
      .entries(obj).forEach(([k,
        v]) => el.setAttribute(
        k, v)); return el; };
  const getDomain =
  u => { try { return new URL(u)
        .hostname.replace(
          /^www\./, ''
          ); } catch { return u
        .slice(0, 40); } };
  const isHttps =
  u => { try { return new URL(u)
        .protocol ===
        'https:'; } catch { return false; } };
  const trunc = (s, n = 40) => s &&
    s.length > n ? s.slice(0, n) +
    '…' : s || '';
  const sanitize = s => String(s)
    .replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }
      [c]));
  const fmt = s => isNaN(s) || !
    isFinite(s) ? '0:00' :
    `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const mediaExt = u => { const e =
      u.split('?')[0].split('.')
      .pop()
    .toLowerCase(); return { isVid: [
        'mp4', 'webm', 'ogg',
        'mov', 'mkv'
      ].includes(e), isAud: [
        'mp3', 'wav', 'ogg',
        'aac', 'flac', 'm4a'
      ].includes(e), isImg: [
        'jpg', 'jpeg', 'png',
        'gif', 'webp', 'svg',
        'avif'
      ].includes(e) }; };
  const collectUrl = u => { if (!
      u || u.startsWith(
      'data:') || u.startsWith(
        'blob:'))
  return null; try { return new URL(
        u, location.href)
      .href; } catch { return null; } };
  const loadScript = (src, cb) => {
    if (document.querySelector(
        `script[src="${src}"]`
        )) { const poll =
    () => { if ((src.includes(
              'marked') &&
            window.marked) || (
            src.includes(
              'highlight') &&
            window.hljs) || (src
            .includes(
              'papaparse') &&
            window.Papa) || (src
            .includes(
              'html2canvas') &&
            window.html2canvas))
          cb();
        else setTimeout(poll,
          40); };
      poll(); return; }
    const s = document
      .createElement('script');
    s.src = src;
    s.async = true;
    s.onload = cb;
    s.onerror = () => console
      .warn('[AR] lib failed:',
        src);
    document.head.appendChild(s);
  };
  const loadCSS = href => {
    if (!document.querySelector(
        `link[href="${href}"]`
        )) { const l = document
        .createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(
      l); }
  };
  const ensureMarked = cb => { if (
      window.marked) { cb
    (); return; } _libQueues
      .marked.push(cb); if (
      _libLoading.marked) return;
    _libLoading.marked = true;
    loadScript(MARKED_CDN,
    () => { if (window
          .marked) { marked
        .use({ breaks: true,
            gfm: true }); } _libQueues
          .marked.forEach(f =>
            f());
        _libQueues
      .marked = []; }); };
  const ensureHljs = cb => {
    if (window.hljs) { cb
    (); return; } _libQueues.hljs
      .push(cb);
    if (_libLoading.hljs) return;
    _libLoading.hljs = true;
    loadCSS(HLJS_CSS);
    loadScript(HLJS_CDN,
  () => { _libQueues.hljs
        .forEach(f => f());
      _libQueues.hljs = []; });
  };
  const ensurePapa = cb => { if (
      window.Papa) { cb
  (); return; } if (_libLoading
      .papa) { const p = () =>
        window.Papa ? cb() :
        setTimeout(p, 40);
      p(); return; } _libLoading
      .papa = true;
    loadScript(PAPA_CDN, cb); };
  const ensureH2C = cb => {
    if (window.html2canvas) { cb
    (); return; }
    if (_libLoading.h2c) { const
        p = () => window
        .html2canvas ? cb() :
        setTimeout(p, 40);
      p(); return; } _libLoading
      .h2c = true;
    loadScript(H2C_CDN, cb);
  };
  const FAVI = [d =>
    `https://www.google.com/s2/favicons?domain=${d}&sz=64`,
    d =>
    `https://icon.horse/icon/${d}`,
    d =>
    `https://logo.clearbit.com/${d}`
  ];
  const letterSVG = d => {
    const c = d[0].toUpperCase();
    const h = Math.abs([...d]
        .reduce((a, b) => a + b
          .charCodeAt(0), 0)) %
      360;
    return 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="hsl(${h},45%,18%)"/>` +
        `<text x="50%" y="55%" fill="hsl(${h},65%,72%)" font-family="sans-serif" font-size="16" font-weight="600" text-anchor="middle" dy=".3em">${c}</text></svg>`
        );
  };
  const setFavicon = (img, url) => {
    const d = getDomain(url);
    img.alt = '';
    attr(
    img, { 'aria-hidden': 'true' }
      );
    let i = 0;
    const next = () => { img.src =
        i < FAVI.length ? FAVI[
          i++](d) : (img
          .onerror = null,
          letterSVG(d)); };
    img.onerror = next;
    next();
  };
  const I = {
    book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ACC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    chev: `<svg class="ar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`,
    x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    arr: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    lock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    lockO: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    shield: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    globe: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    dots: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    dl: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    warn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    ok: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    skipB: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    skipF: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    loop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    vol: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volLow: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volX: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    music: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    vid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="15" height="10" rx="2"/><polygon points="22 12 17 7.5 17 16.5"/></svg>`,
    img: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    csv: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
    ext: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    fs: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
    fsExit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`,
    speed: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  };
  const showNotif = (msg, type =
    'success', dur = 2800) => {
    if (!_notifWrap) { _notifWrap
        = ce('div',
          'ar-notif-wrap');
      document.body.appendChild(
        _notifWrap); }
    const n = ce('div',
      'ar-notif ar-notif-' +
      type,
      `<span class="ar-ni">${type==='success'?I.ok:type==='error'?I.warn:I.globe}</span><span>${sanitize(msg)}</span>`
      );
    _notifWrap.appendChild(n);
    requestAnimationFrame(() =>
      requestAnimationFrame(
      () => n.classList.add(
          'show')));
    setTimeout(() => { n.classList
        .remove('show');
      n.addEventListener(
        'transitionend',
      () => n
      .remove(), { once: true }
        ); }, dur);
  };
  const injectCSS = () => {
    if (document.getElementById(
        'ar-v31-css')) return;
    const s = ce('style');
    s.id = 'ar-v31-css';
    s.textContent =
      `.ar-chip,.ar-sh-close,.ar-src-hd,.ar-src-col,.ar-proceed,.ar-cancel,.ar-sh-row,.ar-tab-btn,.ar-dots,.ar-oa,.ar-med-col,.ar-copy,.ar-ov-act,.ar-ap-play,.ar-ap-vol-btn,.ar-ap-skip,.ar-ap-loop,.ar-ap-speed-btn,.ar-vp-btn,.ar-ext-btn{-webkit-tap-highlight-color:transparent;outline:none;-webkit-touch-callout:none;}.ar-chip:focus-visible,.ar-sh-close:focus-visible,.ar-proceed:focus-visible,
.ar-src-col:focus-visible,.ar-tab-btn:focus-visible,.ar-ov-act:focus-visible,.ar-vp-btn:focus-visible{outline:2px solid ${ACC};outline-offset:2px;}
.ar-chip{display:inline-flex;align-items:center;vertical-align:middle;background:#1a1a1c;border-radius:40px;padding:3px 11px 3px 5px;margin:0 3px;cursor:pointer;user-select:none;transition:background .15s,border-color .15s,transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.06);font-size:.82em;color:#fff;text-decoration:none;position:relative;top:-1px;will-change:transform;}
.ar-chip:hover{background:#242427;border-color:rgba(0,200,255,.35);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,200,255,.12);}.ar-chip:active{transform:scale(.97)}.ar-chip-stack{display:flex;align-items:center;margin-right:7px}.ar-chip-ico{width:18px;height:18px;border-radius:50%;background:#111;object-fit:cover;border:1.5px solid #1a1a1c;flex-shrink:0;}.ar-chip-ico.s{margin-right:-9px}.ar-chip-ico.s:last-child{margin-right:0}
.ar-chip-lbl{font-weight:500;white-space:nowrap;font-size:.82em;line-height:1}.ar-sources-area{margin:40px 0;background:#000;border:1px solid rgba(255,255,255,.09);border-radius:16px;overflow:hidden;width:100%;}.ar-src-hd{padding:14px 20px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;transition:background .15s;}.ar-src-hd:hover{background:#080808}
.ar-src-title{font-weight:600;display:flex;align-items:center;gap:10px;font-size:.88rem;color:#fff;}.ar-src-badge{background:rgba(0,200,255,.12);color:${ACC};border-radius:100px;padding:2px 8px;font-size:.7rem;font-family:monospace;}.ar-chevron{transition:transform .3s cubic-bezier(.4,0,.2,1);flex-shrink:0;}.ar-sources-area.open .ar-chevron{transform:rotate(180deg)}.ar-src-content{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1);}
.ar-sources-area.open .ar-src-content{max-height:260px}.ar-tabs{display:flex;border-top:1px solid rgba(255,255,255,.07);overflow-x:auto;scrollbar-width:none;}.ar-tabs::-webkit-scrollbar{display:none}.ar-tab-btn{flex-shrink:0;padding:9px 16px;font-size:.76rem;font-weight:500;color:#555;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s;}
.ar-tab-btn:hover{color:#aaa}.ar-tab-btn.active{color:${ACC};border-bottom-color:${ACC}}.ar-tab-panel{display:none;overflow-x:auto;scrollbar-width:none;}.ar-tab-panel::-webkit-scrollbar{display:none}.ar-tab-panel.active{display:flex}
.ar-src-col{flex:0 0 196px;padding:12px 16px;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;justify-content:center;min-width:0;cursor:pointer;transition:background .15s;background:transparent;border-left:none;border-top:none;text-align:left;}.ar-src-col:hover{background:#080808}.ar-src-col:active{background:#111}.ar-src-top{display:flex;align-items:center;gap:8px;margin-bottom:3px;overflow:hidden}
.ar-src-top img{width:16px;height:16px;border-radius:50%;flex-shrink:0}.ar-src-name{font-size:.82rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ar-src-url{font-size:.7rem;color:#3a3a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;font-family:monospace;}.ar-src-sec{display:inline-flex;align-items:center;gap:3px;margin-top:4px;font-size:.62rem;font-family:monospace;padding:2px 5px;border-radius:4px;}
.ar-src-sec.s{background:rgba(0,200,100,.09);color:#00c864}.ar-src-sec.h{background:rgba(255,80,50,.09);color:#ff5032}.ar-med-col{flex:0 0 148px;padding:10px;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;gap:6px;min-width:0;cursor:pointer;transition:background .15s;background:transparent;border-left:none;border-top:none;text-align:left;}.ar-med-col:hover{background:#080808}
.ar-med-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#111;display:block;}.ar-med-icon{width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:#111;border-radius:8px;color:#444;}.ar-med-lbl{font-size:.68rem;color:#555;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ar-bd{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:9990;opacity:0;visibility:hidden;transition:opacity .26s,visibility .26s;}.ar-bd.active{opacity:1;visibility:visible}
.ar-sh{position:fixed;bottom:0;left:0;width:100%;background:#000;z-index:9991;transform:translateY(105%);transition:transform .36s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column;max-height:88vh;max-height:88dvh;border-top:1px solid rgba(255,255,255,.12);will-change:transform;border-radius:20px 20px 0 0;}
@media(min-width:640px){.ar-sh{left:50%;transform:translate(-50%,105%);width:min(560px,calc(100vw - 32px));bottom:24px;border-radius:24px;border:1px solid rgba(255,255,255,.1);box-shadow:0 -8px 80px rgba(0,0,0,.8);}.ar-sh.active{transform:translate(-50%,0)}}.ar-sh.active{transform:translateY(0)}.ar-sh-handle{position:absolute;top:8px;left:50%;transform:translateX(-50%);width:36px;height:4px;background:#2a2a2a;border-radius:10px;}
.ar-sh-hdr{padding:18px 20px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;position:relative;}.ar-sh-title{font-weight:700;color:#fff;font-size:.98rem;display:flex;align-items:center;gap:8px;max-width:calc(100% - 50px);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.ar-sh-close{background:#1a1a1c;border:1px solid rgba(255,255,255,.08);color:#777;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0;padding:0;}.ar-sh-close:hover{background:#2a2a2a;color:#fff}.ar-sh-body{padding-bottom:env(safe-area-inset-bottom,16px);overflow-y:auto;flex:1;overscroll-behavior:contain;}
.ar-sh-row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #0d0d0d;color:#fff;min-width:0;cursor:pointer;transition:background .13s;background:transparent;width:100%;border-left:none;border-right:none;border-top:none;text-align:left;}.ar-sh-row:last-child{border-bottom:none}.ar-sh-row:hover{background:#070707}.ar-sh-row:active{background:#111}
.ar-row-img{width:36px;height:36px;border-radius:10px;background:#111;object-fit:cover;flex-shrink:0;border:1px solid #181818}.ar-row-txt{flex:1;min-width:0}.ar-row-name{font-weight:600;display:block;margin-bottom:1px;font-size:.86rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ar-row-url{display:block;color:#3e3e3e;font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:monospace}
.ar-row-arr{flex-shrink:0;color:#2a2a2a}.ar-ov-act{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #0d0d0d;color:#ccc;cursor:pointer;transition:background .13s;background:transparent;width:100%;border-left:none;border-right:none;border-top:none;text-align:left;font-size:.88rem;font-weight:500;}.ar-ov-act:last-child{border-bottom:none}.ar-ov-act:hover{background:#080808;color:#fff}.ar-ov-act:active{background:#111}
.ar-oa-ico{width:36px;height:36px;border-radius:10px;background:#111;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #1a1a1a;}.ar-oa-sub{display:block;font-size:.72rem;color:#444;margin-top:1px;font-family:monospace;}.ar-ext-pick{padding:10px 20px 20px;}.ar-ext-lbl{font-size:.74rem;color:#444;font-family:monospace;margin-bottom:10px;display:block;text-transform:uppercase;letter-spacing:.04em;}
.ar-ext-btns{display:flex;gap:10px;flex-wrap:wrap;}.ar-ext-btn{padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0f0f0f;color:#aaa;font-size:.83rem;font-weight:500;cursor:pointer;transition:background .13s,color .13s,border-color .13s;}.ar-ext-btn:hover{background:#1a1a1a;color:#fff;border-color:rgba(0,200,255,.3)}.ar-ext-btn:active{transform:scale(.97)}.ar-conf{padding:18px 20px}
.ar-conf-block{background:#080808;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:12px;}.ar-conf-favi{width:38px;height:38px;border-radius:10px;background:#111;object-fit:cover;flex-shrink:0;}.ar-conf-info{flex:1;min-width:0}.ar-conf-domain{font-weight:700;font-size:.9rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ar-conf-url{font-size:.68rem;color:#3a3a3a;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}.ar-sec-badges{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}.ar-sbadge{display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:5px 9px;font-size:.71rem;font-weight:500;}
.ar-sbadge.ok{background:rgba(0,200,100,.08);color:#00c864;border:1px solid rgba(0,200,100,.18)}.ar-sbadge.bad{background:rgba(255,60,60,.08);color:#ff3c3c;border:1px solid rgba(255,60,60,.18)}.ar-sbadge.n{background:rgba(255,255,255,.05);color:#666;border:1px solid rgba(255,255,255,.08)}.ar-meta{background:#060606;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;margin-bottom:18px;}
.ar-meta-row{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.78rem;}.ar-meta-row:last-child{border-bottom:none}.ar-meta-k{color:#444;font-family:monospace}.ar-meta-v{color:#999;font-weight:500;text-align:right;max-width:65%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:monospace}.ar-meta-v.g{color:#00c864}.ar-meta-v.r{color:#ff3c3c}.ar-meta-v.b{color:${ACC}}
.ar-conf-acts{display:flex;gap:10px;}.ar-proceed{flex:1;padding:12px;border-radius:12px;font-size:.88rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,${ACC} 0%,${ACC2} 100%);color:#fff;transition:opacity .15s,transform .13s;}.ar-proceed:hover{opacity:.88}.ar-proceed:active{transform:scale(.97);opacity:.82}
.ar-cancel{padding:12px 16px;border-radius:12px;font-size:.88rem;font-weight:500;cursor:pointer;background:#141414;border:1px solid rgba(255,255,255,.07);color:#777;transition:background .15s,color .15s;}.ar-cancel:hover{background:#1e1e1e;color:#fff}
.ar-conf-warn{background:rgba(255,160,0,.07);border:1px solid rgba(255,160,0,.18);border-radius:10px;padding:9px 12px;margin-bottom:14px;font-size:.76rem;color:#ffa000;display:flex;align-items:flex-start;gap:8px;line-height:1.5;}@media(max-width:639px){.ar-conf-acts{flex-direction:column}}.ar-md{color:#c0c0c0;line-height:1.85;font-size:1rem;}.ar-md h1,.ar-md h2,.ar-md h3,.ar-md h4{color:#f0f0f0;font-weight:700;margin:1.4em 0 .5em;line-height:1.2;letter-spacing:-.02em;}
.ar-md h1{font-size:1.9em;background:linear-gradient(135deg,#fff 30%,rgba(255,255,255,.45));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}.ar-md h2{font-size:1.4em;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:.3em;}.ar-md h3{font-size:1.15em}.ar-md p{margin:.6em 0;color:#999}.ar-md a{color:${ACC};text-decoration:none;border-bottom:1px solid rgba(0,200,255,.25);}.ar-md a:hover{border-bottom-color:${ACC}}
.ar-md strong{color:#ddd;font-weight:600}.ar-md em{color:#bbb;font-style:italic}.ar-md blockquote{border-left:3px solid ${ACC};margin:.8em 0;padding:.6em 1em;background:rgba(0,200,255,.04);border-radius:0 8px 8px 0;color:#777;}.ar-md ul,.ar-md ol{padding-left:1.4em;margin:.5em 0;color:#999}.ar-md li{margin:.25em 0}.ar-md hr{border:none;border-top:1px solid rgba(255,255,255,.08);margin:1.2em 0;}.ar-md img{max-width:100%;border-radius:10px;margin:.5em 0;display:block;}
.ar-md code{background:#0e0e10;border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:1px 5px;font-family:monospace;font-size:.82em;color:#e0e0e0;}.ar-md pre{margin:0!important;background:transparent!important;}.ar-md pre code{background:transparent!important;border:none!important;padding:0!important;}.ar-tbl-wrap{margin:28px 0;}.ar-tbl-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;}
.ar-tbl-title{font-weight:600;font-size:.88rem;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}.ar-dots{background:transparent;border:none;color:#444;cursor:pointer;padding:5px 7px;border-radius:8px;display:flex;align-items:center;transition:background .13s,color .13s;flex-shrink:0;}.ar-dots:hover{background:#1a1a1c;color:#aaa}
.ar-tbl-scroll{overflow-x:auto;scrollbar-width:thin;scrollbar-color:#1e1e1e transparent;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:#080808;}.ar-tbl-scroll::-webkit-scrollbar{height:5px}.ar-tbl-scroll::-webkit-scrollbar-track{background:transparent}.ar-tbl-scroll::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:3px}.ar-tbl-scroll table{width:100%;border-collapse:collapse;min-width:380px;}
.ar-tbl-scroll th{padding:11px 24px;text-align:left;font-size:.78rem;font-weight:600;color:#666;font-family:monospace;letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap;border-left:none;border-right:none;border-top:none;}.ar-tbl-scroll td{padding:13px 24px;font-size:.86rem;color:#bbb;border-bottom:1px solid rgba(255,255,255,.045);vertical-align:top;border-left:none;border-right:none;border-top:none;}
.ar-tbl-scroll tr:last-child td{border-bottom:none}.ar-tbl-scroll tr:hover td{background:rgba(255,255,255,.012);}.ar-tbl-scroll col,.ar-tbl-scroll colgroup{display:none;}.ar-cb{margin:28px 0;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#0d1117;}.ar-cb-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.07);}
.ar-cb-meta{display:flex;align-items:center;gap:10px;min-width:0;flex:1;overflow:hidden;}.ar-cb-lang{font-size:.7rem;font-family:monospace;color:${ACC};background:rgba(0,200,255,.1);border-radius:5px;padding:2px 7px;white-space:nowrap;flex-shrink:0;}.ar-cb-ttl{font-size:.78rem;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:monospace;}.ar-cb-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.ar-copy{background:transparent;border:1px solid rgba(255,255,255,.1);color:#555;border-radius:7px;padding:5px 10px;font-size:.71rem;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .13s,color .13s,border-color .13s;font-family:monospace;}.ar-copy:hover{background:#1a1a1c;color:#aaa;border-color:rgba(255,255,255,.2)}.ar-copy.done{color:#00c864;border-color:rgba(0,200,100,.3)}
.ar-cb-body{position:relative;overflow:auto;max-height:480px;scrollbar-width:thin;scrollbar-color:#1e1e1e transparent;}.ar-cb-body::-webkit-scrollbar{width:6px;height:6px}.ar-cb-body::-webkit-scrollbar-track{background:transparent}.ar-cb-body::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:3px}.ar-cb-inner{display:flex;min-width:0;}.ar-ln{padding:16px 0;background:#090e15;border-right:1px solid rgba(255,255,255,.06);user-select:none;flex-shrink:0;text-align:right;}
.ar-ln span{display:block;padding:0 12px;font-size:.78rem;line-height:1.6;color:#2d3748;font-family:monospace;}.ar-code-c{flex:1;padding:16px;overflow-x:auto;min-width:0;scrollbar-width:none;}.ar-code-c::-webkit-scrollbar{display:none}.ar-code-c pre{margin:0!important;background:transparent!important;white-space:pre-wrap;word-wrap:break-word;}
.ar-code-c code{font-family:monospace!important;font-size:.82rem!important;line-height:1.6!important;background:transparent!important;border:none!important;padding:0!important;}.hljs{background:transparent!important;padding:0!important;}.ar-ap{background:linear-gradient(160deg,#0f0f12,#181820);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px 20px 18px;margin:6px 0;}.ar-ap-art-wrap{position:relative;width:64px;height:64px;flex-shrink:0;}
.ar-ap-art{width:64px;height:64px;border-radius:12px;background:linear-gradient(135deg,#0d1117,#1a1a2e);display:flex;align-items:center;justify-content:center;color:${ACC};overflow:hidden;}.ar-ap-art img{width:100%;height:100%;object-fit:cover;border-radius:12px;}.ar-ap-disc{animation:ar-spin 8s linear infinite;animation-play-state:paused;}.ar-ap-disc.playing{animation-play-state:running;}@keyframes ar-spin{to{transform:rotate(360deg)}}
.ar-ap-top{display:flex;align-items:center;gap:16px;margin-bottom:20px;}.ar-ap-info{flex:1;min-width:0}.ar-ap-track{font-weight:600;font-size:.92rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ar-ap-src{font-size:.72rem;color:#444;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;}.ar-ap-prog-wrap{margin-bottom:6px;}
.ar-ap-prog{width:100%;height:4px;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;border-radius:2px;position:relative;display:block;}.ar-ap-prog::-webkit-slider-runnable-track{height:4px;background:linear-gradient(to right,${ACC} var(--p,0%),#2a2a2a var(--p,0%));border-radius:2px;}.ar-ap-prog::-moz-range-track{height:4px;background:#2a2a2a;border-radius:2px;}.ar-ap-prog::-moz-range-progress{background:${ACC};height:4px;border-radius:2px;}
.ar-ap-prog::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:#fff;border-radius:50%;cursor:pointer;transition:transform .1s;margin-top:-5px;}.ar-ap-prog:hover::-webkit-slider-thumb{transform:scale(1.3);}.ar-ap-prog::-moz-range-thumb{width:14px;height:14px;background:#fff;border-radius:50%;border:none;cursor:pointer;}
.ar-ap-times{display:flex;justify-content:space-between;font-size:.67rem;color:#444;font-family:monospace;margin-top:5px;margin-bottom:16px;}.ar-ap-ctrl{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:16px;}.ar-ap-skip{background:transparent;border:none;color:#555;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;transition:color .13s,background .13s;}.ar-ap-skip:hover{color:#aaa;background:#1a1a1c}
.ar-ap-play{width:48px;height:48px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#000;transition:transform .13s,background .13s;flex-shrink:0;box-shadow:0 4px 20px rgba(255,255,255,.12);}.ar-ap-play:hover{transform:scale(1.07);background:#e8e8e8}.ar-ap-play:active{transform:scale(.95)}
.ar-ap-loop{background:transparent;border:none;color:#555;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;transition:color .13s,background .13s;}.ar-ap-loop:hover{color:#aaa;background:#1a1a1c}.ar-ap-loop.on{color:${ACC};}.ar-ap-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;}.ar-ap-vol{display:flex;align-items:center;gap:8px;color:#555;flex:1;}
.ar-ap-vs{flex:1;max-width:90px;height:4px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,#666 var(--v,100%),#2a2a2a var(--v,100%));border-radius:2px;cursor:pointer;outline:none;}.ar-ap-vs::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;background:#aaa;border-radius:50%;cursor:pointer;}.ar-ap-vs::-moz-range-thumb{width:12px;height:12px;background:#aaa;border-radius:50%;border:none;cursor:pointer;}
.ar-ap-vol-btn{background:transparent;border:none;cursor:pointer;color:#555;padding:4px;transition:color .13s;display:flex;align-items:center;}.ar-ap-vol-btn:hover{color:#aaa}.ar-ap-speed-btn{background:#111;border:1px solid rgba(255,255,255,.1);color:#666;border-radius:7px;padding:4px 9px;font-size:.72rem;font-family:monospace;cursor:pointer;transition:background .13s,color .13s,border-color .13s;white-space:nowrap;}
.ar-ap-speed-btn:hover{background:#1a1a1c;color:#aaa;border-color:rgba(255,255,255,.2)}.ar-ap-speed-btn.active{color:${ACC};border-color:rgba(0,200,255,.35);}.ar-vp-wrap{position:relative;background:#000;border-radius:12px;overflow:hidden;margin:6px 0;user-select:none;}.ar-vp-wrap video{width:100%;display:block;max-height:320px;background:#000;}
.ar-vp-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;opacity:0;transition:opacity .25s;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 45%);}.ar-vp-wrap:hover .ar-vp-overlay,.ar-vp-wrap.paused .ar-vp-overlay,.ar-vp-wrap.ui-show .ar-vp-overlay{opacity:1;}.ar-vp-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
.ar-vp-big-play{width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;color:#fff;backdrop-filter:blur(6px);transition:opacity .2s,transform .2s;pointer-events:auto;cursor:pointer;}.ar-vp-big-play:hover{transform:scale(1.1);background:rgba(0,0,0,.8);}.ar-vp-big-play.hidden{opacity:0;pointer-events:none;}
.ar-vp-controls{padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px;}.ar-vp-prog-wrap{position:relative;height:4px;background:#ffffff26;border-radius:2px;cursor:pointer;}.ar-vp-prog-bar{height:100%;background:${ACC};border-radius:2px;pointer-events:none;transition:height .1s;}.ar-vp-prog-wrap:hover .ar-vp-prog-bar{height:6px;margin-top:-1px;}.ar-vp-prog-wrap:hover{height:6px;margin-top:-1px;}
.ar-vp-prog-thumb{position:absolute;top:50%;right:0;transform:translate(50%,-50%);width:13px;height:13px;background:#fff;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .15s;}.ar-vp-prog-wrap:hover .ar-vp-prog-thumb{opacity:1;}.ar-vp-row{display:flex;align-items:center;gap:8px;}.ar-vp-btn{background:transparent;border:none;color:#ddd;cursor:pointer;padding:5px;border-radius:7px;display:flex;align-items:center;transition:color .13s,background .13s;}
.ar-vp-btn:hover{color:#fff;background:rgba(255,255,255,.1)}.ar-vp-time{font-size:.72rem;font-family:monospace;color:#ccc;white-space:nowrap;margin-right:auto;}.ar-vp-vol-wrap{display:flex;align-items:center;gap:6px;}.ar-vp-vs{width:60px;height:3px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,#ddd var(--v,100%),#444 var(--v,100%));border-radius:2px;cursor:pointer;outline:none;display:none;}.ar-vp-vol-wrap:hover .ar-vp-vs{display:block;}
.ar-vp-vs::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;background:#fff;border-radius:50%;cursor:pointer;}.ar-vp-vs::-moz-range-thumb{width:10px;height:10px;background:#fff;border-radius:50%;border:none;cursor:pointer;}.ar-vp-speed{background:transparent;border:1px solid rgba(255,255,255,.2);color:#ccc;border-radius:5px;padding:3px 7px;font-size:.68rem;font-family:monospace;cursor:pointer;transition:background .13s,color .13s;}
.ar-vp-speed:hover{background:rgba(255,255,255,.1);color:#fff}.ar-vp-info{padding:8px 14px;font-size:.71rem;color:#333;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ar-notif-wrap{position:fixed;bottom:24px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;pointer-events:none;}@media(max-width:639px){.ar-notif-wrap{right:12px;left:12px;bottom:20px;}}
.ar-notif{display:flex;align-items:center;gap:10px;background:#111;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 16px;font-size:.83rem;color:#ccc;pointer-events:auto;opacity:0;transform:translateY(10px) scale(.97);transition:opacity .2s,transform .2s;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.6);}@media(max-width:639px){.ar-notif{max-width:100%;}}.ar-notif.show{opacity:1;transform:translateY(0) scale(1)}.ar-ni{flex-shrink:0;display:flex}
.ar-notif-success .ar-ni{color:#00c864}.ar-notif-error .ar-ni{color:#ff3c3c}.ar-notif-info .ar-ni{color:${ACC}}body.ar-lock{overflow:hidden!important;touch-action:none;}/* ── TOC Bar ── */.ar-toc-bar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9980;display:flex;align-items:center;gap:10px;background:rgba(10,10,14,.88);border:1px solid rgba(255,255,255,.12);border-radius:50px;padding:7px 12px 7px 8px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 4px 32px rgba(0,0,0,.5);min-width:220px;max-width:min(480px,90vw);user-select:none;font-family:system-ui,sans-serif;}.ar-toc-dot{width:24px;height:24px;border-radius:50%;background:#00e676;border:2px solid rgba(0,230,118,.4);box-shadow:0 0 10px rgba(0,230,118,.5);cursor:pointer;flex-shrink:0;transition:transform .15s,box-shadow .15s;padding:0;}.ar-toc-dot:hover{transform:scale(1.15);box-shadow:0 0 18px rgba(0,230,118,.7);}.ar-toc-dot.active{background:#00c853;box-shadow:0 0 14px rgba(0,200,83,.8);}.ar-toc-title{flex:1;font-size:.8rem;font-weight:600;color:#e8e8ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;text-align:center;letter-spacing:-.01em;}.ar-toc-chev{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#aaa;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .14s,color .14s,transform .2s;padding:0;}.ar-toc-chev:hover{background:rgba(255,255,255,.16);color:#fff;}.ar-toc-chev.open svg{transform:rotate(180deg);}.ar-toc-chev svg{transition:transform .22s cubic-bezier(.4,0,.2,1);}.ar-toc-drop{position:absolute;top:calc(100% + 8px);left:0;right:0;background:rgba(10,10,14,.96);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:8px 0;box-shadow:0 8px 40px rgba(0,0,0,.6);max-height:60vh;overflow-y:auto;opacity:0;pointer-events:none;transform:translateY(-6px) scale(.97);transition:opacity .18s,transform .18s;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent;}.ar-toc-drop.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);}.ar-toc-drop::-webkit-scrollbar{width:4px}.ar-toc-drop::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}.ar-toc-item{display:block;width:100%;background:transparent;border:none;text-align:left;padding:8px 16px;font-size:.8rem;color:#999;cursor:pointer;transition:background .12s,color .12s;font-family:inherit;border-radius:0;}.ar-toc-item:hover{background:rgba(255,255,255,.06);color:#fff;}.ar-toc-item.current{color:#00e5ff;font-weight:600;}.ar-toc-item[data-level="1"]{font-size:.84rem;font-weight:600;color:#e8e8ee;}.ar-toc-item[data-level="2"]{color:#ccc;}.ar-toc-item[data-level="3"]{color:#888;font-size:.77rem;}.ar-toc-item[data-level="4"]{color:#666;font-size:.74rem;}.ar-toc-empty{padding:12px 16px;font-size:.78rem;color:#444;font-family:inherit;}/* ── Web Bar ── */.ar-web-bar{position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:9979;display:flex;align-items:center;gap:4px;background:rgba(10,10,14,.92);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:7px 10px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 4px 24px rgba(0,0,0,.5);max-width:min(520px,92vw);flex-wrap:nowrap;overflow-x:auto;opacity:0;pointer-events:none;transform:translateX(-50%) translateY(-8px);transition:opacity .2s,transform .2s;scrollbar-width:none;font-family:system-ui,sans-serif;}.ar-web-bar::-webkit-scrollbar{display:none}.ar-web-bar.open{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0);}.ar-wb-btn{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:10px;background:transparent;border:none;color:#888;cursor:pointer;font-size:.74rem;font-weight:500;white-space:nowrap;transition:background .12s,color .12s;font-family:inherit;}.ar-wb-btn:hover{background:rgba(255,255,255,.09);color:#fff;}.ar-wb-btn.active{color:#00e5ff;background:rgba(0,229,255,.1);}.ar-wb-btn.ar-wb-info{cursor:default;color:#555;font-size:.72rem;}.ar-wb-btn.ar-wb-info:hover{background:transparent;color:#555;}.ar-wb-ico{display:flex;align-items:center;flex-shrink:0;}.ar-wb-lbl{font-size:.73rem;}.ar-web-bar::before{content:'';position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid rgba(255,255,255,.1);}/* ── Find bar ── */.ar-find-bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9985;display:flex;align-items:center;gap:8px;background:rgba(14,14,18,.96);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:8px 12px;backdrop-filter:blur(16px);box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:280px;max-width:min(400px,90vw);}.ar-find-input{flex:1;background:transparent;border:none;color:#fff;font-size:.85rem;outline:none;font-family:inherit;}.ar-find-input::placeholder{color:#444}.ar-find-count{font-size:.72rem;color:#555;white-space:nowrap;font-family:monospace;}.ar-find-close{background:transparent;border:none;color:#555;cursor:pointer;font-size:.8rem;padding:2px 4px;transition:color .12s;}.ar-find-close:hover{color:#fff}.ar-find-mark{background:rgba(0,229,255,.25);color:#00e5ff;border-radius:2px;padding:0 1px;}`;
    document.head.appendChild(s);
  };
  let _bd = null,
    _sh = null;
  const ensureOverlay = () => {
    if (_sh) return;
    _bd = ce('div', 'ar-bd');
    attr(
  _bd, { role: 'presentation', 'aria-hidden': 'true' }
      );
    _sh = ce('div', 'ar-sh');
    attr(
_sh, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ar-sh-title' }
      );
    _sh.innerHTML =
      `<div class="ar-sh-handle" aria-hidden="true"></div>` +
      `<div class="ar-sh-hdr">` +
      `<div class="ar-sh-title" id="ar-sh-title"></div>` +
      `<button class="ar-sh-close" aria-label="Close">${I.x}</button>` +
      `</div>` +
      `<div class="ar-sh-body" id="ar-sh-bd"></div>`;
    document.body.appendChild(
    _bd);
    document.body.appendChild(
    _sh);
    _bd.addEventListener('click',
      closeOverlay);
    qs('.ar-sh-close', _sh)
      .addEventListener('click',
        closeOverlay);
    document.addEventListener(
      'keydown', e => { if (e
          .key === 'Escape' &&
          _overlayOpen)
          closeOverlay(); });
    let sy = 0;
    _sh.addEventListener(
      'touchstart', e => { sy =
          e.touches[0]
          .clientY; }, { passive: true }
      );
    _sh.addEventListener(
      'touchend', e => { if (e
          .changedTouches[0]
          .clientY - sy > 90)
          closeOverlay(); }, { passive: true }
      );
  };
  const openOverlay = (title,
    fillFn) => {
    ensureOverlay();
    _overlayOpen = true;
    qs('#ar-sh-title', _sh)
      .innerHTML = title;
    const body = qs('#ar-sh-bd',
      _sh);
    body.innerHTML = '';
    fillFn(body);
    document.body.classList.add(
      'ar-lock');
    requestAnimationFrame(() =>
      requestAnimationFrame(
      () => { _bd.classList.add(
            'active');
          _sh.classList.add(
            'active'); }));
    setTimeout(() => { const f =
          _sh.querySelector(
            'button,a,[tabindex="0"]'
            ); if (f) f
      .focus({ preventScroll: true }); },
      400);
  };
  const closeOverlay = () => { if (!
      _sh) return;
    _overlayOpen = false;
    _bd.classList.remove(
    'active');
    _sh.classList.remove(
    'active');
    document.body.classList
      .remove('ar-lock'); };
  const showConfirmation = url => {
    let p;
    try { p = new URL(
      url); } catch { p = null; }
    const dom = getDomain(url);
    const https = isHttps(url);
    const port = p ? (p.port || (
        https ? '443' : '80')) :
      '?';
    const path = p ? p.pathname :
      '/';
    const tld = dom.split('.')
      .pop().toUpperCase();
    const trusted = ['google',
      'wikipedia', 'github',
      'mozilla', 'apple',
      'microsoft', 'amazon',
      'youtube', 'twitter',
      'x.com', 'linkedin',
      'stackoverflow',
      'cloudflare'
    ].some(s => dom.includes(s));
    openOverlay(
      `${I.shield} Confirmation`,
      body => {
        const inner = ce('div',
          'ar-conf');
        const favi = ce('img',
          'ar-conf-favi');
        setFavicon(favi, url);
        const blk = ce('div',
          'ar-conf-block');
        blk.appendChild(favi);
        blk.innerHTML +=
          `<div class="ar-conf-info">` +
          `<div class="ar-conf-domain" title="${sanitize(dom)}">${sanitize(trunc(dom,38))}</div>` +
          `<span class="ar-conf-url" title="${sanitize(url)}">${sanitize(trunc(url,55))}</span></div>`;
        inner.appendChild(blk);
        const badges = ce('div',
          'ar-sec-badges');
        badges.innerHTML = (
            https ?
            `<span class="ar-sbadge ok">${I.lock} HTTPS</span>` :
            `<span class="ar-sbadge bad">${I.lockO} HTTP Only</span>`
            ) + (trusted ?
            `<span class="ar-sbadge ok">${I.shield} Trusted</span>` :
            `<span class="ar-sbadge n">${I.globe} External</span>`
            ) +
          `<span class="ar-sbadge n">:${sanitize(port)}</span>` +
          (tld ?
            `<span class="ar-sbadge n">.${sanitize(tld.toLowerCase())}</span>` :
            '');
        inner.appendChild(
          badges);
        if (!https) { const w =
            ce('div',
              'ar-conf-warn');
          w.innerHTML =
            `${I.warn}<span>HTTP only — connection may not be encrypted.</span>`;
          inner.appendChild(
          w); }
        const meta = ce('div',
          'ar-meta');
        [
          ['Origin', p ? p
            .origin : url, 'b'
          ],
          ['Host', dom, ''],
          ['Protocol', p ? p
            .protocol : '?', ''
          ],
          ['Path', trunc(path,
            32), ''],
          ['HTTPS', https ?
            'Yes' : 'No',
            https ? 'g' : 'r'
          ],
          ['Trusted', trusted ?
            'Yes' : 'Unknown',
            trusted ? 'g' : ''
          ]
        ].forEach(([k, v,
        c]) => {
          const r = ce(
            'div',
            'ar-meta-row');
          r.innerHTML =
            `<span class="ar-meta-k">${k}</span><span class="ar-meta-v${c?' '+c:''}">${sanitize(String(v))}</span>`;
          meta.appendChild(
            r);
        });
        inner.appendChild(meta);
        const acts = ce('div',
          'ar-conf-acts');
        const go = ce('button',
          'ar-proceed');
        go.innerHTML =
          `Open ${sanitize(trunc(dom,22))} ${I.ext}`;
        go.setAttribute(
          'aria-label',
          `Open ${sanitize(dom)} in new tab`
          );
        const ca = ce('button',
          'ar-cancel');
        ca.textContent =
          'Cancel';
        go.addEventListener(
          'click',
        () => { closeOverlay
          ();
            setTimeout(() =>
              window.open(
                url,
                '_blank',
                'noopener,noreferrer'
                ), 120); });
        ca.addEventListener(
          'click',
          closeOverlay);
        acts.appendChild(go);
        acts.appendChild(ca);
        inner.appendChild(acts);
        body.appendChild(inner);
      });
  };
  const showRefs = urls => {
    openOverlay(
      `${I.book} References`,
      body => {
        urls.forEach(url => {
          const btn = ce(
            'button',
            'ar-sh-row');
          btn.type =
            'button';
          btn.setAttribute(
            'aria-label',
            `View: ${getDomain(url)}`
            );
          const img = ce(
            'img',
            'ar-row-img');
          setFavicon(img,
            url);
          const txt = ce(
            'div',
            'ar-row-txt');
          txt.innerHTML =
            `<span class="ar-row-name">${sanitize(trunc(getDomain(url),30))}</span>` +
            `<span class="ar-row-url" title="${sanitize(url)}">${sanitize(trunc(url,50))}</span>`;
          const arr = ce(
            'span',
            'ar-row-arr');
          arr.innerHTML = I
            .arr;
          btn.appendChild(
            img);
          btn.appendChild(
            txt);
          btn.appendChild(
            arr);
          btn
            .addEventListener(
              'click',
            () => { closeOverlay
                  ();
                setTimeout(
                  () =>
                  showConfirmation(
                    url),
                  180); });
          body.appendChild(
            btn);
        });
      });
  };
  const showTableMenu = (tblEl,
    title) => {
    openOverlay(
      `${I.dots} ${sanitize(trunc(title||'Table',30))}`,
      body => {
        const copyBtn = ce(
          'button',
          'ar-ov-act');
        copyBtn.type = 'button';
        copyBtn.innerHTML =
          `<span class="ar-oa-ico">${I.copy}</span><span><span>Copy as Text</span><span class="ar-oa-sub">Tab-separated values</span></span>`;
        copyBtn
          .addEventListener(
            'click', () => {
              const txt = qsa(
                  'tr', tblEl)
                .map(r => qsa(
                    'th,td', r)
                  .map(c => c
                    .textContent
                    .trim())
                  .join('\t'))
                .join('\n');
              navigator
                .clipboard
                .writeText(txt)
                .then(
              () => { closeOverlay
                    ();
                  showNotif(
                    'Table copied'
                    ); }).catch(
                  () =>
                  showNotif(
                    'Copy failed',
                    'error'));
            });
        const dlBtn = ce(
          'button',
          'ar-ov-act');
        dlBtn.type = 'button';
        dlBtn.innerHTML =
          `<span class="ar-oa-ico">${I.dl}</span><span><span>Download Table</span><span class="ar-oa-sub">Choose format below</span></span>`;
        const pick = ce('div',
          'ar-ext-pick');
        pick.style.display =
          'none';
        pick.innerHTML =
          `<span class="ar-ext-lbl">Select format</span><div class="ar-ext-btns">` +
          `<button class="ar-ext-btn" data-fmt="csv">${I.csv} CSV</button>` +
          `<button class="ar-ext-btn" data-fmt="png">${I.img} PNG</button></div>`;
        dlBtn.addEventListener(
          'click',
        () => { pick.style
              .display = pick
              .style
              .display ===
              'none' ?
              'block' :
              'none'; });
        qsa('.ar-ext-btn', pick)
          .forEach(btn => {
            btn
              .addEventListener(
                'click',
              () => {
                  if (btn
                    .dataset
                    .fmt ===
                    'csv'
                    ) { const
                      csv =
                      qsa(
                        'tr',
                        tblEl)
                      .map(
                        r =>
                        qsa(
                          'th,td',
                          r)
                        .map(
                          c =>
                          `"${c.textContent.trim().replace(/"/g,'""')}"`
                          )
                        .join(
                          ',')
                        )
                      .join(
                        '\n'
                        ); const
                      a = ce(
                        'a');
                    a.href =
                      URL
                      .createObjectURL(
                        new Blob(
                          [
                            csv], { type: 'text/csv' }
                          ));
                    a.download =
                      (title ||
                        'table'
                        ) +
                      '.csv';
                    a.click();
                    URL
                      .revokeObjectURL(
                        a.href
                        );
                    closeOverlay
                      ();
                    showNotif(
                      'CSV downloaded'
                      ); } else {
                    closeOverlay
                      ();
                    showNotif(
                      'Generating PNG…',
                      'info',
                      3000);
                    ensureH2C(
                      () => {
                        const
                          el =
                          tblEl
                          .closest(
                            '.ar-tbl-scroll'
                            ) ||
                          tblEl;
                        html2canvas
                          (el, { backgroundColor: '#080808',
                            scale: 2,
                            useCORS: true,
                            logging: false })
                          .then(
                            c => { const
                                a =
                                ce(
                                  'a'
                                  );
                              a.download =
                                (title ||
                                  'table'
                                  ) +
                                '.png';
                              a.href =
                                c
                                .toDataURL(
                                  'image/png'
                                  );
                              a
                            .click();
                              showNotif
                                (
                                  'PNG downloaded'); }
                            )
                          .catch(
                            () =>
                            showNotif(
                              'PNG failed',
                              'error'
                              )
                            );
                      });
                  }
                });
          });
        body.appendChild(
          copyBtn);
        body.appendChild(dlBtn);
        body.appendChild(pick);
      });
  };
  const showCodeMenu = (code, title,
    lang) => {
    openOverlay(
      `${I.dots} ${sanitize(trunc(title||'Code',30))}`,
      body => {
        const copyBtn = ce(
          'button',
          'ar-ov-act');
        copyBtn.type = 'button';
        copyBtn.innerHTML =
          `<span class="ar-oa-ico">${I.copy}</span><span><span>Copy Code</span><span class="ar-oa-sub">${sanitize(lang||'text')}</span></span>`;
        copyBtn
          .addEventListener(
            'click',
          () => { navigator
                .clipboard
                .writeText(code)
                .then(
              () => { closeOverlay
                    ();
                  showNotif(
                    'Code copied'
                    ); }).catch(
                  () =>
                  showNotif(
                    'Copy failed',
                    'error')); }
            );
        const
        extMap = { javascript: 'js',
          typescript: 'ts',
          python: 'py',
          css: 'css',
          html: 'html',
          bash: 'sh',
          shell: 'sh',
          json: 'json',
          sql: 'sql',
          rust: 'rs',
          go: 'go',
          java: 'java',
          cpp: 'cpp', c: 'c' };
        const ext = extMap[
          lang] || 'txt';
        const dlBtn = ce(
          'button',
          'ar-ov-act');
        dlBtn.type = 'button';
        dlBtn.innerHTML =
          `<span class="ar-oa-ico">${I.dl}</span><span><span>Download .${ext}</span><span class="ar-oa-sub">${sanitize(lang||'text')} source</span></span>`;
        dlBtn.addEventListener(
          'click', () => {
            const a = ce('a');
            a.href = URL
              .createObjectURL(
                new Blob([
                  code], { type: 'text/plain' })
                );
            a.download = (
                title ||
                'code') +
              '.' + ext;
            a.click();
            URL
              .revokeObjectURL(
                a.href);
            closeOverlay();
            showNotif(
              'File downloaded'
              );
          });
        body.appendChild(
          copyBtn);
        body.appendChild(dlBtn);
      });
  };
  const buildAudioPlayer = (url,
    wrap) => {
    const dom = getDomain(url);
    const filename = trunc(url
      .split('/').pop().split(
        '?')[0] || dom, 36);
    const SPEEDS = [0.5, 0.75, 1,
      1.25, 1.5, 2
    ];
    let speedIdx = 2,
      loopOn = false;
    const ap = ce('div', 'ar-ap');
    ap.innerHTML =
      `<div class="ar-ap-top">` +
      `<div class="ar-ap-art-wrap"><div class="ar-ap-art ar-ap-disc">${I.music}</div></div>` +
      `<div class="ar-ap-info">` +
      `<div class="ar-ap-track" title="${sanitize(filename)}">${sanitize(filename)}</div>` +
      `<div class="ar-ap-src">${sanitize(dom)}</div>` +
      `</div>` + `</div>` +
      `<div class="ar-ap-prog-wrap">` +
      `<input type="range" class="ar-ap-prog" min="0" max="100" value="0" step="0.1" aria-label="Seek" style="--p:0%">` +
      `</div>` +
      `<div class="ar-ap-times"><span class="ar-ap-cur">0:00</span><span class="ar-ap-dur">0:00</span></div>` +
      `<div class="ar-ap-ctrl">` +
      `<button class="ar-ap-loop" aria-label="Loop" title="Loop">${I.loop}</button>` +
      `<button class="ar-ap-skip" data-sec="-10" aria-label="Back 10s" title="-10s">${I.skipB}</button>` +
      `<button class="ar-ap-play" aria-label="Play">${I.play}</button>` +
      `<button class="ar-ap-skip" data-sec="10" aria-label="Forward 10s" title="+10s">${I.skipF}</button>` +
      `<button class="ar-ap-speed-btn" aria-label="Playback speed">1×</button>` +
      `</div>` +
      `<div class="ar-ap-bottom">` +
      `<div class="ar-ap-vol">` +
      `<button class="ar-ap-vol-btn" aria-label="Mute">${I.vol}</button>` +
      `<input type="range" class="ar-ap-vs" min="0" max="1" step="0.01" value="1" aria-label="Volume" style="--v:100%">` +
      `</div>` + `</div>`;
    const audio = document
      .createElement('audio');
    audio.src = url;
    audio.preload = 'metadata';
    const disc = qs('.ar-ap-disc',
      ap);
    const prog = qs('.ar-ap-prog',
      ap);
    const play = qs('.ar-ap-play',
      ap);
    const cur = qs('.ar-ap-cur',
      ap);
    const dur = qs('.ar-ap-dur',
      ap);
    const vs = qs('.ar-ap-vs',
    ap);
    const vb = qs(
      '.ar-ap-vol-btn', ap);
    const loopBtn = qs(
      '.ar-ap-loop', ap);
    const speedBtn = qs(
      '.ar-ap-speed-btn', ap);
    const updateProg =
  () => { const p = audio
        .duration ? audio
        .currentTime / audio
        .duration * 100 : 0;
      prog.value = p;
      prog.style.setProperty(
        '--p', p + '%');
      cur.textContent = fmt(
        audio.currentTime); };
    const volIcon = () => {
      const v = audio.muted ?
        0 : audio.volume;
      return v === 0 ? I.volX :
        v < 0.5 ? I.volLow : I
        .vol;
    };
    audio.addEventListener(
      'loadedmetadata', () =>
      dur.textContent = fmt(
        audio.duration));
    audio.addEventListener(
      'timeupdate', updateProg);
    audio.addEventListener(
      'ended', () => { play
          .innerHTML = I.play;
        disc.classList.remove(
          'playing'); });
    audio.addEventListener('play',
      () => { play.innerHTML = I
          .pause;
        disc.classList.add(
          'playing'); });
    audio.addEventListener(
      'pause', () => { play
          .innerHTML = I.play;
        disc.classList.remove(
          'playing'); });
    prog.addEventListener('input',
      () => { if (audio
          .duration) audio
          .currentTime = prog
          .value / 100 * audio
          .duration; });
    play.addEventListener('click',
      () => { audio.paused ?
          audio.play().catch(
          () => {}) : audio
          .pause(); });
    qsa('.ar-ap-skip', ap)
      .forEach(btn => {
        btn.addEventListener(
          'click', () => {
            const sec =
              parseInt(btn
                .dataset.sec,
                10);
            audio
              .currentTime =
              Math.max(0, Math
                .min(audio
                  .duration ||
                  0, audio
                  .currentTime +
                  sec));
          });
      });
    loopBtn.addEventListener(
      'click', () => { loopOn
          = !loopOn;
        audio.loop = loopOn;
        loopBtn.classList
          .toggle('on',
          loopOn); });
    speedBtn.addEventListener(
      'click', () => { speedIdx
          = (speedIdx + 1) %
          SPEEDS.length;
        audio.playbackRate =
          SPEEDS[speedIdx];
        speedBtn.textContent =
          SPEEDS[speedIdx] +
          '×';
        speedBtn.classList
          .toggle('active',
            SPEEDS[speedIdx] !==
            1); });
    vs.addEventListener('input',
    () => {
      audio.volume = vs.value;
      audio.muted = false;
      vs.style.setProperty(
        '--v', Math.round(vs
          .value * 100) +
        '%');
      vb.innerHTML =
    volIcon();
    });
    vb.addEventListener('click',
    () => { audio.muted = !
        audio.muted;
      vb.innerHTML =
    volIcon();
      vs.style.setProperty(
        '--v', audio.muted ?
        '0%' : Math.round(
          audio.volume * 100
          ) + '%'); });
    ap.setAttribute('tabindex',
      '-1');
    ap.addEventListener('keydown',
      e => {
        if (e.target.tagName ===
          'INPUT') return;
        if (e.key === ' ' || e
          .key === 'k') { e
            .preventDefault();
          audio.paused ? audio
            .play().catch(
          () => {}) : audio
            .pause(); }
        if (e.key ===
          'ArrowRight') { e
            .preventDefault();
          audio.currentTime =
            Math.min(audio
              .duration || 0,
              audio
              .currentTime + 5
              ); }
        if (e.key ===
          'ArrowLeft') { e
            .preventDefault();
          audio.currentTime =
            Math.max(0, audio
              .currentTime - 5
              ); }
        if (e.key ===
          'm') { audio.muted = !
            audio.muted;
          vb.innerHTML =
            volIcon(); }
      });
    wrap.appendChild(ap);
    return () => audio.pause();
  };
  const buildVideoPlayer = (url,
    wrap) => {
    const dom = getDomain(url);
    const SPEEDS = [0.5, 0.75, 1,
      1.25, 1.5, 2
    ];
    let speedIdx = 2,
      uiTimer = null;
    const container = ce('div',
      'ar-vp-wrap paused');
    const vid = document
      .createElement('video');
    vid.src = url;
    vid.preload = 'metadata';
    vid.setAttribute(
      'playsinline', '');
    vid.setAttribute(
      'webkit-playsinline', '');
    const center = ce('div',
      'ar-vp-center');
    const bigPlay = ce('button',
      'ar-vp-big-play');
    bigPlay.innerHTML = I.play;
    bigPlay.setAttribute(
      'aria-label', 'Play');
    const overlay = ce('div',
      'ar-vp-overlay');
    const ctrlArea = ce('div',
      'ar-vp-controls');
    const progWrap = ce('div',
      'ar-vp-prog-wrap');
    const progBar = ce('div',
      'ar-vp-prog-bar');
    progBar.style.width = '0%';
    const progThumb = ce('div',
      'ar-vp-prog-thumb');
    progWrap.appendChild(progBar);
    progWrap.appendChild(
      progThumb);
    const row = ce('div',
      'ar-vp-row');
    const mkBtn = (ico,
    lbl) => { const b = ce(
        'button', 'ar-vp-btn');
      b.innerHTML = ico;
      b.setAttribute(
        'aria-label', lbl);
      b.type =
      'button'; return b; };
    const playBtn = mkBtn(I.play,
      'Play');
    const skipBBtn = mkBtn(I
      .skipB, 'Back 10s');
    const skipFBtn = mkBtn(I
      .skipF, 'Forward 10s');
    const timeEl = ce('span',
      'ar-vp-time');
    timeEl.textContent =
      '0:00 / 0:00';
    const volWrap = ce('div',
      'ar-vp-vol-wrap');
    const volBtn = mkBtn(I.vol,
      'Mute');
    const volS = ce('input');
    volS.type = 'range';
    volS.className = 'ar-vp-vs';
    volS.min = '0';
    volS.max = '1';
    volS.step = '0.01';
    volS.value = '1';
    volS.style.setProperty('--v',
      '100%');
    volS.setAttribute(
      'aria-label', 'Volume');
    volWrap.appendChild(volBtn);
    volWrap.appendChild(volS);
    const speedBtn = ce('button',
      'ar-vp-speed');
    speedBtn.type = 'button';
    speedBtn.textContent = '1×';
    speedBtn.setAttribute(
      'aria-label', 'Speed');
    const fsBtn = mkBtn(I.fs,
      'Fullscreen');
    row.appendChild(playBtn);
    row.appendChild(skipBBtn);
    row.appendChild(skipFBtn);
    row.appendChild(timeEl);
    row.appendChild(volWrap);
    row.appendChild(speedBtn);
    row.appendChild(fsBtn);
    ctrlArea.appendChild(
    progWrap);
    ctrlArea.appendChild(row);
    overlay.appendChild(ctrlArea);
    const infoEl = ce('div',
      'ar-vp-info');
    infoEl.textContent = trunc(
      url, 70);
    center.appendChild(bigPlay);
    container.appendChild(vid);
    container.appendChild(center);
    container.appendChild(
    overlay);
    const showUI =
  () => { container.classList
        .add('ui-show');
      clearTimeout(
      uiTimer); if (!vid.paused)
        uiTimer = setTimeout(
        () => container
          .classList.remove(
            'ui-show'), 3000); };
    container.addEventListener(
      'mousemove', showUI);
    container.addEventListener(
      'touchstart',
      showUI, { passive: true });
    const syncPlay = () => {
      const paused = vid.paused;
      playBtn.innerHTML =
        paused ? I.play : I
        .pause;
      bigPlay.innerHTML =
        paused ? I.play : I
        .pause;
      bigPlay.classList.toggle(
        'hidden', !paused);
      container.classList
        .toggle('paused',
          paused);
      if (!paused) { uiTimer =
          setTimeout(() =>
            container.classList
            .remove('ui-show'),
            3000); }
    };
    vid.addEventListener('play',
      syncPlay);
    vid.addEventListener('pause',
      syncPlay);
    vid.addEventListener('ended',
      () => { container
          .classList.add(
            'paused');
        container.classList
          .remove('ui-show'); });
    const togglePlay = () => { vid
        .paused ? vid.play()
        .catch(() => {}) : vid
        .pause(); };
    playBtn.addEventListener(
      'click', togglePlay);
    bigPlay.addEventListener(
      'click', togglePlay);
    vid.addEventListener('click',
      togglePlay);
    vid.addEventListener(
      'loadedmetadata', () =>
      timeEl.textContent =
      `0:00 / ${fmt(vid.duration)}`
      );
    vid.addEventListener(
      'timeupdate', () => {
        const p = vid.duration ?
          vid.currentTime / vid
          .duration * 100 : 0;
        progBar.style.width =
          p + '%';
        progThumb.style.right =
          (100 - p) + '%';
        timeEl.textContent =
          `${fmt(vid.currentTime)} / ${fmt(vid.duration)}`;
      });
    let seeking = false;
    const seek = e => { const r =
        progWrap
        .getBoundingClientRect(); const
        x = Math.max(0, Math
          .min(1, (e.clientX - r
            .left) / r.width)
          ); if (vid.duration)
        vid.currentTime = x *
        vid.duration; };
    progWrap.addEventListener(
      'mousedown',
      e => { seeking = true;
        seek(e); });
    document.addEventListener(
      'mousemove', e => { if (
          seeking) seek(e); });
    document.addEventListener(
      'mouseup', () => { seeking
          = false; });
    progWrap.addEventListener(
      'touchstart', e => { seek(
          e.touches[0]
          ); }, { passive: true });
    progWrap.addEventListener(
      'touchmove', e => { seek(e
          .touches[0]);
        e
      .preventDefault(); }, { passive: false }
      );
    skipBBtn.addEventListener(
      'click', () => { vid
          .currentTime = Math
          .max(0, vid
            .currentTime - 10
            ); });
    skipFBtn.addEventListener(
      'click', () => { vid
          .currentTime = Math
          .min(vid.duration ||
            0, vid.currentTime +
            10); });
    const volIcon2 = () => vid
      .muted || vid.volume === 0 ?
      I.volX : vid.volume < 0.5 ?
      I.volLow : I.vol;
    volS.addEventListener('input',
      () => { vid.volume = volS
          .value;
        vid.muted = false;
        volS.style.setProperty(
          '--v', Math.round(
            volS.value * 100
            ) + '%');
        volBtn.innerHTML =
          volIcon2(); });
    volBtn.addEventListener(
      'click', () => { vid
          .muted = !vid.muted;
        volBtn.innerHTML =
          volIcon2();
        volS.style.setProperty(
          '--v', vid.muted ?
          '0%' : Math.round(
            vid.volume * 100
            ) + '%'); });
    speedBtn.addEventListener(
      'click', () => {
        speedIdx = (speedIdx +
          1) % SPEEDS.length;
        vid.playbackRate =
          SPEEDS[speedIdx];
        speedBtn.textContent =
          SPEEDS[speedIdx] +
          '×';
      });
    const fsAPI = { req: el => el
        .requestFullscreen ? el
        .requestFullscreen() :
        el
        .webkitRequestFullscreen ?
        el
        .webkitRequestFullscreen() :
        null, exit: () =>
        document
        .exitFullscreen ?
        document
        .exitFullscreen() :
        document
        .webkitExitFullscreen ?
        document
        .webkitExitFullscreen() :
        null,
  get el() { return document
          .fullscreenElement ||
          document
          .webkitFullscreenElement; } };
    fsBtn.addEventListener(
      'click', () => { if (fsAPI
          .el) fsAPI.exit();
        else fsAPI.req(
          container); });
    const fsChange = () => { const
        inFS = !!fsAPI.el;
      fsBtn.innerHTML = inFS ? I
        .fsExit : I.fs;
      fsBtn.setAttribute(
        'aria-label', inFS ?
        'Exit fullscreen' :
        'Fullscreen'); if (inFS)
        vid.style.maxHeight =
        '100vh';
      else vid.style.maxHeight =
        '320px'; };
    document.addEventListener(
      'fullscreenchange',
      fsChange);
    document.addEventListener(
      'webkitfullscreenchange',
      fsChange);
    container.setAttribute(
      'tabindex', '0');
    container.addEventListener(
      'keydown', e => {
        if (e.key === ' ' || e
          .key === 'k') { e
            .preventDefault();
          togglePlay(); }
        if (e.key ===
          'ArrowRight') { e
            .preventDefault();
          vid.currentTime = Math
            .min(vid.duration ||
              0, vid
              .currentTime + 5
              ); }
        if (e.key ===
          'ArrowLeft') { e
            .preventDefault();
          vid.currentTime = Math
            .max(0, vid
              .currentTime - 5
              ); }
        if (e.key ===
          'ArrowUp') { e
            .preventDefault();
          vid.volume = Math.min(
            1, vid.volume + .1
            );
          volS.value = vid
            .volume;
          volS.style
            .setProperty('--v',
              Math.round(vid
                .volume * 100) +
              '%');
          volBtn.innerHTML =
            volIcon2(); }
        if (e.key ===
          'ArrowDown') { e
            .preventDefault();
          vid.volume = Math.max(
            0, vid.volume - .1
            );
          volS.value = vid
            .volume;
          volS.style
            .setProperty('--v',
              Math.round(vid
                .volume * 100) +
              '%');
          volBtn.innerHTML =
            volIcon2(); }
        if (e.key === 'm') { vid
            .muted = !vid.muted;
          volBtn.innerHTML =
            volIcon2(); }
        if (e.key ===
          'f') { if (fsAPI.el)
            fsAPI.exit();
          else fsAPI.req(
            container); }
      });
    wrap.appendChild(container);
    wrap.appendChild(infoEl);
    return () => {
      vid.pause();
      document
        .removeEventListener(
          'fullscreenchange',
          fsChange);
      document
        .removeEventListener(
          'webkitfullscreenchange',
          fsChange);
      if (fsAPI.el) fsAPI
    .exit();
    };
  };
  const showMediaPlayer = (url,
    type) => {
    if (type ===
      'audio') { openOverlay(
        `${I.music} Audio Player`,
        body => { const wrap =
            ce('div');
          wrap.style.cssText =
            'padding:16px 20px 24px'; const
            cleanup =
            buildAudioPlayer(
              url, wrap);
          body.appendChild(
          wrap);
          _sh.addEventListener(
            'transitionend',
            () => { if (!
                _overlayOpen)
                cleanup(); }, { once: true,
              passive: true }
            ); }); } else if (
      type === 'video') {
      openOverlay(
        `${I.vid} Video Player`,
        body => { const wrap =
            ce('div');
          wrap.style.cssText =
            'padding:12px 16px 16px'; const
            cleanup =
            buildVideoPlayer(
              url, wrap);
          body.appendChild(
          wrap);
          _sh.addEventListener(
            'transitionend',
            () => { if (!
                _overlayOpen)
                cleanup(); }, { once: true,
              passive: true }
            ); });
    }
  };
  const createChip = urls => {
    const chip = ce('span',
      'ar-chip');
    attr(chip, { role: 'button',
      tabindex: '0', 'aria-label': urls
        .length > 1 ?
        `${urls.length} refs` :
        getDomain(urls[0]) });
    const stack = ce('div',
      'ar-chip-stack');
    urls.slice(0, 3).forEach(
      u => { const img = ce(
          'img',
          'ar-chip-ico' + (
            urls.length > 1 ?
            ' s' : ''));
        setFavicon(img, u);
        stack.appendChild(
        img); });
    const lbl = ce('span',
      'ar-chip-lbl');
    lbl.textContent = urls
      .length > 1 ?
      `${urls.length} sources` :
      trunc(getDomain(urls[0]),
        22);
    chip.appendChild(stack);
    chip.appendChild(lbl);
    const act = e => { e
          .preventDefault();
        e.stopPropagation();
        urls.length === 1 ?
          showConfirmation(urls[
            0]) : showRefs(
          urls); };
    chip.addEventListener('click',
      act);
    chip.addEventListener(
      'keydown', e => { if (e
          .key === 'Enter' || e
          .key === ' ') { e
            .preventDefault();
          act(e); } });
    return chip;
  };
  const scanMedia = () => {
    qsa('img[src]').forEach(
      el => { const u =
          collectUrl(el
            .getAttribute('src')
            ); if (u && !_media
          .images.includes(u))
          _media.images.push(
          u); });
    qsa(
        'video[src],video source[src],source[src]')
      .forEach(el => { const u =
            collectUrl(el
              .getAttribute('src')
              ); if (u && !_media
            .videos.includes(u)
            ) { const { isVid } =
            mediaExt(u); if (
              isVid || el.tagName
              .toLowerCase() ===
              'video') _media
              .videos.push(
              u); } });
    qsa('iframe[src]').forEach(
      el => { const u =
          collectUrl(el
            .getAttribute('src')
            ); if (u && !_media
          .iframes.includes(u))
          _media.iframes.push(
          u); });
    qsa(
        'audio[src],audio source[src]')
      .forEach(el => { const u =
            collectUrl(el
              .getAttribute('src')
              ); if (u && !_media
            .audio.includes(u))
            _media.audio.push(
            u); });
    qsa('a[href]').forEach(
    el => { const u =
        collectUrl(el
          .getAttribute(
            'href')); if (!u)
        return; const { isVid,
        isAud } = mediaExt(
      u); if (isVid && !_media
        .videos.includes(u))
        _media.videos.push(
        u); if (isAud && !
        _media.audio.includes(
          u)) _media.audio
        .push(u); });
  };
  const watchMutations = () => {
    const ob =
      new MutationObserver(
      muts => {
        let ch = false;
        muts.forEach(m => m
          .addedNodes.forEach(
            n => {
              if (n
                .nodeType !==
                1) return;
              [n, ...qsa(
                'img,video,iframe,audio,source,a',
                n)].forEach(
                el => {
                  if (!el
                    .getAttribute
                    )
                return;
                  const
                    src = el
                    .getAttribute(
                      'src'
                      ) ||
                    el
                    .getAttribute(
                      'href'
                      );
                  const u =
                    src ?
                    collectUrl(
                      src) :
                    null;
                  if (!u)
                    return;
                  const
                    tag = el
                    .tagName
                    .toLowerCase();
                  const { isVid,
                    isAud,
                    isImg } =
                  mediaExt(
                    u);
                  if ((
                      tag ===
                      'img' ||
                      isImg
                      ) && !
                    _media
                    .images
                    .includes(
                      u)
                    ) { _media
                      .images
                      .push(
                        u);
                    ch =
                      true; }
                  else if ((
                      tag ===
                      'video' ||
                      isVid
                      ) && !
                    _media
                    .videos
                    .includes(
                      u)
                    ) { _media
                      .videos
                      .push(
                        u);
                    ch =
                      true; } else if (
                    (tag ===
                      'audio' ||
                      isAud
                      ) && !
                    _media
                    .audio
                    .includes(
                      u)
                    ) { _media
                      .audio
                      .push(
                        u);
                    ch =
                      true; } else if (
                    tag ===
                    'iframe' &&
                    !_media
                    .iframes
                    .includes(
                      u)
                    ) { _media
                      .iframes
                      .push(
                        u);
                    ch =
                      true; }
                });
            }));
        if (ch)
          rebuildSourceAreas();
      });
    ob.observe(document
    .body, { childList: true,
      subtree: true });
  };
  const buildSrcCol = url => {
    const { isVid, isAud } =
    mediaExt(url);
    const col = ce('button',
      'ar-src-col');
    col.type = 'button';
    attr(
    col, { 'aria-label': `Source: ${getDomain(url)}` }
      );
    const top = ce('div',
      'ar-src-top');
    const img = document
      .createElement('img');
    setFavicon(img, url);
    const name = ce('span',
      'ar-src-name');
    name.textContent = trunc(
      getDomain(url), 24);
    name.title = getDomain(url);
    top.appendChild(img);
    top.appendChild(name);
    const urlEl = ce('span',
      'ar-src-url');
    urlEl.textContent = trunc(url,
      38);
    urlEl.title = url;
    const sec = ce('span',
      'ar-src-sec ' + (isHttps(
        url) ? 's' : 'h'));
    sec.innerHTML = (isHttps(
        url) ? I.lock : I.lockO) +
      (isHttps(url) ? ' HTTPS' :
        ' HTTP');
    col.appendChild(top);
    col.appendChild(urlEl);
    col.appendChild(sec);
    col.addEventListener('click',
      e => { e
      .stopPropagation();
        isVid ? showMediaPlayer(
            url, 'video') :
          isAud ?
          showMediaPlayer(url,
            'audio') :
          showConfirmation(
          url); });
    return col;
  };
  const buildMedCol = (url,
  type) => {
    const col = ce('button',
      'ar-med-col');
    col.type = 'button';
    attr(
    col, { 'aria-label': `${type}: ${getDomain(url)}` }
      );
    if (type === 'image') { const
        t = ce('img',
          'ar-med-thumb');
      t.src = url;
      t.alt = '';
      t.loading = 'lazy';
      t.onerror = () => { t
          .replaceWith(Object
            .assign(ce('div',
              'ar-med-icon'
              ), { innerHTML: I
                .img })); };
      col.appendChild(
      t); } else { const ic = ce(
        'div', 'ar-med-icon');
      ic.innerHTML = type ===
        'audio' ? I.music :
        type === 'video' ? I.vid :
        I.globe; if (type ===
        'audio') ic.style.color =
        `${ACC}`;
      col.appendChild(ic); }
    const lbl = ce('div',
      'ar-med-lbl');
    lbl.textContent = trunc(
      getDomain(url), 20);
    col.appendChild(lbl);
    col.addEventListener('click',
      e => { e
      .stopPropagation();
        type === 'audio' ?
          showMediaPlayer(url,
            'audio') : type ===
          'video' ?
          showMediaPlayer(url,
            'video') :
          showConfirmation(
          url); });
    return col;
  };
  const rebuildSourceAreas = () => {
    _sourceContainers.forEach(
  ({ container, id }) => {
      const content = qs(
        '.ar-src-content',
        container);
      if (!content) return;
      const tabs = qs(
        '.ar-tabs',
        container);
      const dedup = a => [...
        new Set(a)
      ];
      const links = dedup(
        _urls);
      const imgs = dedup(
        _media.images);
      const vids = dedup([...
        _media.videos, ...
        _media.iframes
      ]);
      const auds = dedup(
        _media.audio);
      const total = links
        .length + imgs
        .length + vids
        .length + auds.length;
      const badge = qs(
        '.ar-src-badge',
        container);
      if (badge) badge
        .textContent = total;
      const map = { Links: { items: links,
          type: 'link' },
        Audio: { items: auds,
          type: 'audio' },
        Videos: { items: vids,
          type: 'video' },
        Images: { items: imgs,
          type: 'image' } };
      if (tabs) qsa(
          '.ar-tab-btn', tabs)
        .forEach(b => { const
            e = map[b
              .dataset.panel
              ];
          b.style.display =
            (e && e.items
              .length) ?
            '' : 'none'; });
      if (tabs) { const ab =
          qs(
            '.ar-tab-btn.active',
            tabs); const an =
          ab ? ab.dataset
          .panel : null; if (!
          an || !map[an] || !
          map[an].items.length
          ) { qsa(
            '.ar-tab-btn',
            tabs).forEach(
            b => b.classList
            .remove(
              'active')
            ); const first =
            Object.entries(
              map).find(([,
                v]) => v.items
              .length); if (
            first) { const
              fb = qs(
                `[data-panel="${first[0]}"]`,
                tabs); if (fb)
              fb.classList
              .add(
              'active'); } } }
      qsa('.ar-tab-panel',
        content).forEach(
        p => p.remove());
      const cur = (qs(
          '.ar-tab-btn.active',
          tabs) || {}).dataset
        ?.panel || 'Links';
      Object.entries(map)
        .forEach(([name,
        { items,
          type }]) => { const
            panel = ce(
              'div',
              'ar-tab-panel' +
              (name ===
                cur ?
                ' active' :
                ''));
          panel.id =
            `ar-tp-${id}-${name.toLowerCase()}`;
          panel
            .setAttribute(
              'role',
              'tabpanel');
          items.forEach(
            url => panel
            .appendChild(
              type ===
              'link' ?
              buildSrcCol(
                url) :
              buildMedCol(
                url, type)
              ));
          content
            .appendChild(
              panel); });
    });
  };
  const buildWidget = container => {
    _arId++;
    const id = _arId;
    container.innerHTML = '';
    const hdr = ce('div',
      'ar-src-hd');
    attr(hdr, { role: 'button',
      tabindex: '0', 'aria-expanded': 'false', 'aria-controls': `ar-sc-${id}` });
    hdr.innerHTML =
      `<div class="ar-src-title">${I.book} References & Sources <span class="ar-src-badge">0</span></div>${I.chev}`;
    const wrap = ce('div',
      'ar-src-content');
    wrap.id = `ar-sc-${id}`;
    const tabs = ce('div',
      'ar-tabs');
    tabs.setAttribute('role',
      'tablist');
    ['Links', 'Audio', 'Videos',
      'Images'
    ].forEach((n, i) => {
      const btn = ce('button',
        'ar-tab-btn' + (
          i === 0 ?
          ' active' : ''));
      btn.type = 'button';
      btn.textContent = n;
      btn.style.display =
        'none';
      attr(btn, { 'data-panel': n,
        role: 'tab', 'aria-selected': i ===
          0 ? 'true' :
          'false' });
      btn.addEventListener(
        'click', e => {
          e
        .stopPropagation();
          qsa('.ar-tab-btn',
            tabs).forEach(
            b => { b
                .classList
                .remove(
                  'active'
                  );
              b.setAttribute(
                'aria-selected',
                'false'
                ); });
          btn.classList.add(
            'active');
          btn.setAttribute(
            'aria-selected',
            'true');
          qsa('.ar-tab-panel',
            wrap).forEach(
            p => p
            .classList
            .remove(
              'active'));
          const p = qs(
            `#ar-tp-${id}-${n.toLowerCase()}`,
            wrap);
          if (p) p.classList
            .add('active');
        });
      tabs.appendChild(btn);
    });
    wrap.appendChild(tabs);
    container.appendChild(hdr);
    container.appendChild(wrap);
    const toggle = () => { const
        o = container.classList
        .toggle('open');
      hdr.setAttribute(
        'aria-expanded',
        String(o)); };
    hdr.addEventListener('click',
      toggle);
    hdr.addEventListener(
      'keydown', e => { if (e
          .key === 'Enter' || e
          .key === ' ') { e
            .preventDefault();
          toggle(); } });
    _sourceContainers
  .push({ container, id });
  };
  const buildTableWrap = (tblEl,
    title) => {
    const wrap = ce('div',
      'ar-tbl-wrap');
    const hdr = ce('div',
      'ar-tbl-hdr');
    const ttl = ce('span',
      'ar-tbl-title');
    ttl.textContent = title ||
      'Table';
    ttl.title = title || '';
    const dots = ce('button',
      'ar-dots');
    dots.type = 'button';
    dots.innerHTML = I.dots;
    attr(
    dots, { 'aria-label': 'Table options' }
      );
    dots.addEventListener('click',
      e => { e
      .stopPropagation();
        showTableMenu(tblEl,
          title); });
    hdr.appendChild(ttl);
    hdr.appendChild(dots);
    const scroll = ce('div',
      'ar-tbl-scroll');
    qsa('colgroup', tblEl)
      .forEach(c => c.remove());
    tblEl.style.cssText = '';
    scroll.appendChild(tblEl);
    wrap.appendChild(hdr);
    wrap.appendChild(scroll);
    return wrap;
  };
  const buildCodeBlock = (codeStr,
    lang, title) => {
    const wrap = ce('div',
      'ar-cb');
    const hdr = ce('div',
      'ar-cb-hdr');
    const meta = ce('div',
      'ar-cb-meta');
    const langBadge = ce('span',
      'ar-cb-lang');
    langBadge.textContent =
      lang || 'code';
    meta.appendChild(langBadge);
    if (title) { const ttl = ce(
        'span', 'ar-cb-ttl');
      ttl.textContent = trunc(
        title, 36);
      ttl.title = title;
      meta.appendChild(ttl); }
    const acts = ce('div',
      'ar-cb-acts');
    const copyBtn = ce('button',
      'ar-copy');
    copyBtn.type = 'button';
    copyBtn.innerHTML =
      `${I.copy} Copy`;
    attr(
    copyBtn, { 'aria-label': 'Copy code' }
      );
    copyBtn.addEventListener(
      'click', () => { navigator
          .clipboard.writeText(
            codeStr).then(
        () => { copyBtn
              .classList.add(
                'done');
            copyBtn
              .innerHTML =
              `${I.ok} Copied`;
            showNotif(
              'Code copied');
            setTimeout(
            () => { copyBtn
                  .classList
                  .remove(
                    'done');
                copyBtn
                  .innerHTML =
                  `${I.copy} Copy`; },
              2000); }).catch(
          () => showNotif(
              'Copy failed',
              'error')); });
    const dots = ce('button',
      'ar-dots');
    dots.type = 'button';
    dots.innerHTML = I.dots;
    attr(
    dots, { 'aria-label': 'Code options' }
      );
    dots.addEventListener('click',
      e => { e
      .stopPropagation();
        showCodeMenu(codeStr,
          title || lang, lang
          ); });
    acts.appendChild(copyBtn);
    acts.appendChild(dots);
    hdr.appendChild(meta);
    hdr.appendChild(acts);
    const body = ce('div',
      'ar-cb-body');
    const inner = ce('div',
      'ar-cb-inner');
    const lines = codeStr.split(
      '\n');
    const ln = ce('div', 'ar-ln');
    ln.setAttribute('aria-hidden',
      'true');
    lines.forEach((_,
    i) => { const span =
        document
        .createElement(
        'span');
      span.textContent = i +
      1;
      ln.appendChild(span); });
    const cc = ce('div',
      'ar-code-c');
    const pre = document
      .createElement('pre');
    const code = document
      .createElement('code');
    if (lang) code.className =
      `language-${lang}`;
    code.textContent = codeStr;
    pre.appendChild(code);
    cc.appendChild(pre);
    inner.appendChild(ln);
    inner.appendChild(cc);
    body.appendChild(inner);
    wrap.appendChild(hdr);
    wrap.appendChild(body);
    if (window
      .IntersectionObserver) {
      const io =
        new IntersectionObserver(
          entries => { entries
              .forEach(e => { if (
                  e
                  .isIntersecting
                  ) { ensureHljs
                    (() => { if (
                        window
                        .hljs)
                        hljs
                        .highlightElement(
                          code
                          ); });
                  io.unobserve(
                    wrap
                    ); } }); }, { threshold: .1 }
          );
      io.observe(wrap);
    } else ensureHljs(() => { if (
        window.hljs) hljs
        .highlightElement(
          code); });
    return wrap;
  };
  const scanCitations = () => {
    const walker = document
      .createTreeWalker(document
        .body, NodeFilter
        .SHOW_TEXT, {
          acceptNode: n => {
            if (!n
              .parentElement)
              return NodeFilter
                .FILTER_REJECT;
            const tag = n
              .parentElement
              .tagName;
            if (['SCRIPT',
                'STYLE',
                'TEXTAREA',
                'INPUT',
                'NOSCRIPT',
                'CODE', 'PRE'
              ].includes(tag))
              return NodeFilter
                .FILTER_REJECT;
            return /\[(\d+)\]/
              .test(n
              .nodeValue) ?
              NodeFilter
              .FILTER_ACCEPT :
              NodeFilter
              .FILTER_SKIP;
          }
        });
    const nodes = [];
    while (walker.nextNode())
      nodes.push(walker
        .currentNode);
    nodes.forEach(node => {
      const frag = document
        .createDocumentFragment();
      let last = 0;
      const re = /\[(\d+)\]/g;
      let m;
      while ((m = re.exec(node
          .nodeValue)) !==
        null) {
        if (m.index > last)
          frag.appendChild(
            document
            .createTextNode(
              node.nodeValue
              .slice(last, m
                .index)));
        const urls = _db[m[
        1]];
        if (urls && urls
          .length) { urls
            .forEach(
            u => { if (!
                _urls
                .includes(u)
                ) _urls
                .push(u); });
          frag.appendChild(
            createChip(urls)
            ); } else frag
          .appendChild(
            document
            .createTextNode(m[
              0]));
        last = re.lastIndex;
      }
      if (last < node
        .nodeValue.length)
        frag.appendChild(
          document
          .createTextNode(node
            .nodeValue.slice(
              last)));
      node.parentNode
        .replaceChild(frag,
          node);
    });
  };
  const processMarkdown = () => {
    const els = qsa('.ar-md');
    if (!els.length) return;
    ensureMarked(() => {
      els.forEach(el => {
        if (el.dataset
          .arDone) return;
        el.dataset
          .arDone = '1';
        const raw = el
          .hasAttribute(
            'data-md') ?
          el.getAttribute(
            'data-md') :
          el.textContent;
        el.innerHTML =
          marked.parse(
            raw);
        qsa('a[href]', el)
          .forEach(a => {
            a.setAttribute(
              'target',
              '_blank'
              );
            a.setAttribute(
              'rel',
              'noopener noreferrer'
              );
            a.addEventListener(
              'click',
              e => {
                e
              .preventDefault();
                const
                  h =
                  a
                  .getAttribute(
                    'href'
                    );
                if (
                  h &&
                  !h
                  .startsWith(
                    '#'
                    ))
                  showConfirmation(
                    h
                    );
              });
          });
        qsa('pre code',
          el).forEach(
          block => { const
              lang = (
                block
                .className
                .match(
                  /language-(\w+)/
                  ) ||
                [])[
              1] ||
              ''; const
              code =
              block
              .textContent;
            block
              .closest(
                'pre')
              .replaceWith(
                buildCodeBlock(
                  code,
                  lang,
                  '')
                ); });
        qsa('table', el)
          .forEach((t,
            i) => { t
                .replaceWith(
                  buildTableWrap(
                    t,
                    'Table ' +
                    (i +
                      1))
                  ); });
      });
    });
  };
  const processTables = () => {
    qsa('.ar-table').forEach(
    c => {
      if (c.dataset.arDone)
        return;
      c.dataset.arDone = '1';
      const title = c.dataset
        .title || 'Table';
      const t = qs('table',
        c) || c;
      if (t.tagName !==
        'TABLE') return;
      const w =
        buildTableWrap(t,
          title);
      if (t === c) c
        .replaceWith(w);
      else { c.innerHTML = '';
        c.appendChild(w); }
    });
  };
  const processCodeBlocks = () => {
    qsa('.ar-code').forEach(
    el => { if (el.dataset
        .arDone) return;
      el.dataset.arDone =
      '1'; const lang = el
        .dataset.lang ||
        ''; const title = el
        .dataset.title ||
        ''; const code = el
        .textContent.trim();
      el.replaceWith(
        buildCodeBlock(code,
          lang, title)); });
    qsa(
        'pre>code:not([data-ar-done])')
      .forEach(code => {
        if (code.closest(
            '.ar-cb')) return;
        code.setAttribute(
          'data-ar-done', '1');
        const lang = (code
          .className.match(
            /language-(\w+)/
            ) || [])[1] || '';
        code.closest('pre')
          .replaceWith(
            buildCodeBlock(code
              .textContent
              .trim(), lang, '')
            );
      });
  };
  const init = cfg => { _db = cfg ||
    {};
    injectCSS();
    ensureOverlay();
    qsa('.ar-sources-area')
      .forEach(buildWidget);
    requestAnimationFrame(
  () => { scanCitations();
      processTables();
      processCodeBlocks();
      processMarkdown();
      scanMedia();
      rebuildSourceAreas();
      watchMutations(); }); };
  
  /* ─── TOC BAR ─── */
  /* 
   * buildTOCBar() — call after DOM ready. Auto-detects all h1-h4 in the page,
   * builds a floating bar: green dot (left) · page title (center) · ▾ (right)
   * Clicking ▾ opens dropdown with all headings indented by level.
   * Clicking any heading item smoothly scrolls to it.
   * Clicking the green dot opens the WebBar (if initWebBar was called).
   * The bar auto-updates its title to the heading currently in viewport.
   */
  const buildTOCBar = () => {
    const bar = ce('div',
      'ar-toc-bar');
    const dot = ce('button',
      'ar-toc-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label',
      'Page tools');
    dot.setAttribute('title',
      'Open web bar');
    const titleEl = ce('span',
      'ar-toc-title');
    const chevBtn = ce('button',
      'ar-toc-chev');
    chevBtn.type = 'button';
    chevBtn.setAttribute(
      'aria-label',
      'Table of contents');
    chevBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
    const dropdown = ce('div',
      'ar-toc-drop');
    dropdown.setAttribute('role',
      'menu');
    bar.appendChild(dot);
    bar.appendChild(titleEl);
    bar.appendChild(chevBtn);
    bar.appendChild(dropdown);
    document.body.appendChild(
    bar);
    
    /* Collect headings */
    const getHeadings = () =>
      Array.from(document
        .querySelectorAll(
          'h1,h2,h3,h4')).filter(
        h => h.offsetParent !==
        null && !h.closest(
          '.ar-toc-bar') && !h
        .closest('.ar-web-bar'));
    
    /* Build dropdown */
    const buildDrop = () => {
      dropdown.innerHTML = '';
      const heads =
      getHeadings();
      if (!heads.length) { const
          empty = ce('div',
            'ar-toc-empty');
        empty.textContent =
          'No headings found';
        dropdown.appendChild(
          empty); return; }
      heads.forEach(h => {
        const level =
          parseInt(h
            .tagName[1]);
        const item = ce(
          'button',
          'ar-toc-item');
        item.type =
        'button';
        item.setAttribute(
          'role',
          'menuitem');
        item.style
          .paddingLeft = (
            8 + (level -
            1) * 14) + 'px';
        item.dataset.level =
          level;
        item.textContent = h
          .textContent
          .trim().slice(0,
            60);
        item
          .addEventListener(
            'click', () => {
              closeDrop();
              const y = h
                .getBoundingClientRect()
                .top +
                window
                .scrollY -
                72;
              window
                .scrollTo({ top: Math
                    .max(
                      0, y
                      ),
                  behavior: 'smooth' });
            });
        dropdown
          .appendChild(
          item);
      });
    };
    
    let dropOpen = false;
    const openDrop =
  () => { buildDrop();
      dropdown.classList.add(
        'open');
      chevBtn.classList.add(
        'open');
      dropOpen = true; };
    const closeDrop =
  () => { dropdown.classList
        .remove('open');
      chevBtn.classList.remove(
        'open');
      dropOpen = false; };
    chevBtn.addEventListener(
      'click', e => { e
          .stopPropagation();
        dropOpen ? closeDrop() :
          openDrop(); });
    document.addEventListener(
      'click', e => { if (!bar
          .contains(e.target))
          closeDrop(); });
    document.addEventListener(
      'keydown', e => { if (e
          .key === 'Escape')
          closeDrop(); });
    
    /* Active heading tracker */
    const updateTitle = () => {
      const heads =
      getHeadings();
      let active = heads[0];
      for (const h of
        heads) { if (h
          .getBoundingClientRect()
          .top <= 80) active =
        h; }
      const title = active ?
        active.textContent
        .trim().slice(0, 50) : (
          document.title ||
          'Contents');
      titleEl.textContent =
        title;
      /* highlight matching item */
      dropdown.querySelectorAll(
          '.ar-toc-item')
        .forEach(btn => {
          btn.classList
            .toggle('current',
              btn.textContent
              .trim() ===
              title.trim()
              .slice(0, 60));
        });
    };
    updateTitle();
    let _ticking = false;
    window.addEventListener(
      'scroll', () => { if (!
          _ticking
          ) { requestAnimationFrame
            (() => { updateTitle
                ();
              _ticking =
              false; });
          _ticking =
          true; } }, { passive: true }
      );
    new MutationObserver(
      updateTitle).observe(
      document
      .body, { childList: true,
        subtree: true });
    
    /* Expose dot for webbar hook */
    bar._dot = dot;
    return bar;
  };
  
  /* ─── WEB BAR ─── */
  /*
   * buildWebBar(tocBarEl) — call after buildTOCBar().
   * Attaches to the green dot of the TOC bar: clicking dot toggles the web bar
   * which slides in just below the TOC bar.
   * Features: Share · Copy link · Print · TTS (text-to-speech) · Font size ± 
   * · Reading time · Scroll to top · Find in page · Dark/light hint
   */
  const buildWebBar = (
  tocBarEl) => {
    const wb = ce('div',
      'ar-web-bar');
    wb.setAttribute('aria-label',
      'Web tools');
    const tools = [
      { id: 'share',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
        label: 'Share',
      fn: () => { if (navigator
              .share) navigator
              .share({ title: document
                  .title,
                url: location
                  .href })
              .catch(() => {});
            else { navigator
                .clipboard
                .writeText(
                  location.href)
                .then(() =>
                  showNotif(
                    'Link copied'
                    )); } } },
      { id: 'copylink',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        label: 'Copy link',
        fn: () => { navigator
              .clipboard
              .writeText(
                location.href)
              .then(() =>
                showNotif(
                  'Link copied')
                ).catch(() =>
                showNotif(
                  'Copy failed',
                  'error')
                ); } },
      { id: 'print',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
        label: 'Print',
      fn: () => window
        .print() },
      { id: 'tts',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
        label: 'Read aloud',
        fn: () => toggleTTS(
            wbEl) },
      { id: 'fontup',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
        label: 'Larger text',
        fn: () => adjustFont(
        1) },
      { id: 'fontdn',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        label: 'Smaller text',
        fn: () => adjustFont(-
        1) },
      { id: 'readtime',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        label: '', fn: null,
        isInfo: true },
      { id: 'top',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
        label: 'Top', fn: () =>
          window.scrollTo({ top: 0,
            behavior: 'smooth' }) },
      { id: 'find',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        label: 'Find', fn: () =>
          showFindBar() },
    ];
    
    let _fontStep = 0,
      _ttsActive = false,
      _utterance = null;
    
    const adjustFont = (dir) => {
      _fontStep = Math.max(-3,
        Math.min(4,
          _fontStep + dir));
      document.documentElement
        .style.fontSize = (16 +
          _fontStep * 1.5) +
        'px';
      showNotif('Font ' + (dir >
        0 ? 'increased' :
        'decreased'));
    };
    
    const toggleTTS = (bar) => {
      if (!window
        .speechSynthesis
        ) { showNotif(
          'Speech not supported',
          'error'); return; }
      const ttsBtn = bar
        .querySelector(
          '[data-id="tts"]');
      if (
        _ttsActive) { speechSynthesis
          .cancel();
        _ttsActive = false; if (
          ttsBtn) ttsBtn
          .classList.remove(
            'active');
        showNotif(
          'Reading stopped'
          ); return; }
      const text = document.body
        .innerText.slice(0,
          8000);
      _utterance =
        new SpeechSynthesisUtterance(
          text);
      _utterance.rate = 0.95;
      _utterance.pitch = 1;
      _utterance.onend =
    () => { _ttsActive =
        false; if (ttsBtn)
          ttsBtn.classList
          .remove('active'); };
      speechSynthesis.speak(
        _utterance);
      _ttsActive = true;
      if (ttsBtn) ttsBtn
        .classList.add(
        'active');
      showNotif(
        'Reading page aloud…',
        'info', 3000);
    };
    
    let _findBar = null;
    const showFindBar = () => {
      if (_findBar) { _findBar
          .remove();
        _findBar =
      null; return; }
      _findBar = ce('div',
        'ar-find-bar');
      _findBar.innerHTML =
        '<input type="text" class="ar-find-input" placeholder="Find in page…" aria-label="Find in page"><span class="ar-find-count"></span><button class="ar-find-close" type="button" aria-label="Close">✕</button>';
      document.body.appendChild(
        _findBar);
      const inp = _findBar
        .querySelector(
          '.ar-find-input');
      const count = _findBar
        .querySelector(
          '.ar-find-count');
      const close = _findBar
        .querySelector(
          '.ar-find-close');
      inp.focus();
      let _marks = [];
      const clearMarks =
    () => { _marks.forEach(
          m => { const p = m
              .parentNode; if (
              p) { p
                .replaceChild(
                  document
                  .createTextNode(
                    m
                    .textContent
                    ), m
                  ); } });
        _marks = [];
        document.normalize();
        count.textContent =
        ''; };
      inp.addEventListener(
        'input', () => {
          clearMarks();
          const q = inp.value
            .trim();
          if (q.length < 2)
            return;
          const walker =
            document
            .createTreeWalker(
              document.body,
              NodeFilter
              .SHOW_TEXT, { acceptNode: n => { if (
                    ['SCRIPT',
                      'STYLE',
                      'INPUT',
                      'TEXTAREA'
                    ]
                    .includes(
                      n
                      .parentElement
                      ?.tagName
                      ))
                    return NodeFilter
                      .FILTER_REJECT; if (
                    n
                    .parentElement
                    ?.closest(
                      '.ar-toc-bar,.ar-web-bar,.ar-find-bar'
                      ))
                    return NodeFilter
                      .FILTER_REJECT; return n
                    .nodeValue
                    .toLowerCase()
                    .includes(
                      q
                      .toLowerCase()
                      ) ?
                    NodeFilter
                    .FILTER_ACCEPT :
                    NodeFilter
                    .FILTER_SKIP; } }
              );
          const nodes = [];
          while (walker
            .nextNode()) nodes
            .push(walker
              .currentNode);
          nodes.forEach(
            node => {
              const re =
                new RegExp(q
                  .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'),
                  'gi');
              let m;
              const frag =
                document
                .createDocumentFragment();
              let last = 0;
              while ((m = re
                  .exec(node
                    .nodeValue
                    )) !==
                null) { frag
                  .appendChild(
                    document
                    .createTextNode(
                      node
                      .nodeValue
                      .slice(
                        last,
                        m
                        .index
                        ))
                    ); const
                  mark =
                  document
                  .createElement(
                    'mark');
                mark
                  .className =
                  'ar-find-mark';
                mark
                  .textContent =
                  m[0];
                frag
                  .appendChild(
                    mark);
                _marks.push(
                  mark);
                last = re
                  .lastIndex; }
              frag
                .appendChild(
                  document
                  .createTextNode(
                    node
                    .nodeValue
                    .slice(
                      last))
                  );
              node
                .parentNode
                .replaceChild(
                  frag, node
                  );
            });
          count.textContent =
            _marks.length ?
            `${_marks.length} found` :
            'No results';
          if (_marks.length)
            _marks[0]
            .scrollIntoView({ behavior: 'smooth',
              block: 'center' });
        });
      close.addEventListener(
        'click',
      () => { clearMarks();
          _findBar.remove();
          _findBar = null; });
      _findBar.addEventListener(
        'keydown', e => { if (
            e.key === 'Escape'
            ) { clearMarks();
            _findBar.remove();
            _findBar =
            null; } });
    };
    
    /* Reading time */
    const getReadTime = () => {
      const words = document
        .body.innerText.trim()
        .split(/\s+/).length;
      const mins = Math.ceil(
        words / 200);
      return mins < 1 ?
        '<1 min' : mins +
        ' min read';
    };
    
    /* Build tool buttons */
    const wbEl = wb;
    tools.forEach(t => {
      const btn = ce('button',
        'ar-wb-btn');
      btn.type = 'button';
      btn.setAttribute(
        'data-id', t.id);
      btn.setAttribute(
        'aria-label', t
        .label || t.id);
      btn.setAttribute(
        'title', t.label ||
        t.id);
      btn.innerHTML =
        '<span class="ar-wb-ico">' +
        t.icon + '</span>' + (
          t.label ?
          '<span class="ar-wb-lbl">' +
          t.label +
          '</span>' : '');
      if (t.isInfo) { btn
          .classList.add(
            'ar-wb-info');
        btn.style.cursor =
          'default';
        btn.innerHTML =
          '<span class="ar-wb-ico">' +
          t.icon +
          '</span><span class="ar-wb-lbl" id="ar-read-time">…</span>';
        btn.removeAttribute(
          'aria-label'); }
      else if (t.fn) btn
        .addEventListener(
          'click', t.fn);
      wb.appendChild(btn);
    });
    
    document.body.appendChild(wb);
    
    /* Hook green dot */
    let wbOpen = false;
    const dot = tocBarEl?._dot;
    const toggleWB = () => {
      wbOpen = !wbOpen;
      wb.classList.toggle(
        'open', wbOpen);
      if (dot) dot.classList
        .toggle('active',
          wbOpen);
      if (wbOpen) {
        const rt = wb
          .querySelector(
            '#ar-read-time');
        if (rt) rt.textContent =
          getReadTime();
      }
    };
    if (dot) dot.addEventListener(
      'click', toggleWB);
    
    /* Close on outside click */
    document.addEventListener(
      'click', e => {
        if (wbOpen && !wb
          .contains(e.target) &&
          !(tocBarEl && tocBarEl
            .contains(e.target))
          ) {
          wbOpen = false;
          wb.classList.remove(
            'open');
          if (dot) dot.classList
            .remove('active');
        }
      });
    
    return wb;
  };
  
  const initTOCBar = () => {
    const bar = buildTOCBar();
    buildWebBar(bar);
    return bar;
  };
  const initWebBar = initTOCBar;
  
  return { init, showConfirmation,
    showMediaPlayer, buildCodeBlock,
    buildTableWrap, showNotif,
    buildAudioPlayer,
    buildVideoPlayer, initTOCBar,
    initWebBar };
})();
