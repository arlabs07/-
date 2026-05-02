
/* ============================================================
   NOVA PLAYER — Ultra-optimised Video Player Engine
   Architecture: Module Pattern → Init → Events → UI → Controls
   ============================================================ */

const NovaPlayer = (() => {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────
  const CFG = {
    skipSec: 10,
    holdSpeed: 2.0,
    holdDelay: 500,
    uiHideDelay: 3000,
    speeds: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    defaultSpeed: 1,
    langs: ['en', 'hi', 'ja'],
    langLabels: { en: 'English', hi: 'हिंदी', ja: '日本語' },
    swipeThreshold: 30,
    doubleTapMs: 300,
  };

  // ── SAMPLE PLAYLIST ────────────────────────────────────────
  const PLAYLIST = [
    {
      id: 0,
      title: 'Cosmos: Birth of Stars',
      thumbnail: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=640&q=80',
      tracks: {
        en: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        hi: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        ja: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
    },
    {
      id: 1,
      title: 'Ocean Depths: Silent World',
      thumbnail: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=640&q=80',
      tracks: {
        en: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        hi: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        ja: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      },
    },
    {
      id: 2,
      title: 'Mountain Echoes',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&q=80',
      tracks: {
        en: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        hi: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        ja: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      },
    },
    {
      id: 3,
      title: 'Urban Pulse: City Stories',
      thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=640&q=80',
      tracks: {
        en: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        hi: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
        ja: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      },
    },
  ];

  // ── SVG ICONS ──────────────────────────────────────────────
  const ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="4" height="18" fill="currentColor" rx="1"/><rect x="15" y="3" width="4" height="18" fill="currentColor" rx="1"/></svg>`,
    replay10: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="currentColor"/><text x="8.5" y="14.5" font-size="5.5" fill="currentColor" font-family="sans-serif" font-weight="700">10</text></svg>`,
    forward10: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" fill="currentColor"/><text x="8.5" y="14.5" font-size="5.5" fill="currentColor" font-family="sans-serif" font-weight="700">10</text></svg>`,
    prev: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="2.5" height="14" fill="currentColor" rx="1"/><polygon points="20,5 8,12 20,19" fill="currentColor"/></svg>`,
    next: `<svg viewBox="0 0 24 24" fill="none"><rect x="16.5" y="5" width="2.5" height="14" fill="currentColor" rx="1"/><polygon points="4,5 16,12 4,19" fill="currentColor"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>`,
    exitFullscreen: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor"/></svg>`,
    volume: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/></svg>`,
    volumeMute: `<svg viewBox="0 0 24 24" fill="none"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96a7.01 7.01 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54a7.362 7.362 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.48.48 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.01 7.01 0 001.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>`,
    playlist: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/></svg>`,
    mic: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" fill="currentColor"/></svg>`,
    micOff: `<svg viewBox="0 0 24 24" fill="none"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" fill="currentColor"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>`,
    speed: `<svg viewBox="0 0 24 24" fill="none"><path d="M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44zm-9.79 6.84a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z" fill="currentColor"/></svg>`,
    lang: `<svg viewBox="0 0 24 24" fill="none"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" fill="currentColor"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`,
  };

  // ── STATE ───────────────────────────────────────────────────
  const S = {
    idx: 0,
    lang: 'en',
    speed: 1,
    vol: 1,
    muted: false,
    playing: false,
    seeking: false,
    holdTimer: null,
    uiTimer: null,
    uiVisible: true,
    fullscreen: false,
    playlistOpen: false,
    settingsOpen: false,
    langOpen: false,
    speedOpen: false,
    recognition: null,
    voiceActive: false,
    lastTap: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    dragSeek: false,
    seekStartPct: 0,
    raf: null,
  };

  // ── DOM REFS ────────────────────────────────────────────────
  let R = {};

  // ── INIT ────────────────────────────────────────────────────
  function init() {
    R = {
      root: document.getElementById('np-root'),
      video: document.getElementById('np-video'),
      overlay: document.getElementById('np-overlay'),
      thumb: document.getElementById('np-thumb'),
      title: document.getElementById('np-title'),
      controls: document.getElementById('np-controls'),
      topBar: document.getElementById('np-top-bar'),
      seekTrack: document.getElementById('np-seek-track'),
      seekFill: document.getElementById('np-seek-fill'),
      seekBuf: document.getElementById('np-seek-buf'),
      seekThumb: document.getElementById('np-seek-thumb'),
      seekTime: document.getElementById('np-seek-time'),
      seekHover: document.getElementById('np-seek-hover'),
      playBtn: document.getElementById('np-play'),
      prevBtn: document.getElementById('np-prev'),
      nextBtn: document.getElementById('np-next'),
      replayBtn: document.getElementById('np-replay'),
      fwdBtn: document.getElementById('np-fwd'),
      volBtn: document.getElementById('np-vol'),
      volSlider: document.getElementById('np-vol-slider'),
      volFill: document.getElementById('np-vol-fill'),
      timeEl: document.getElementById('np-time'),
      speedBtn: document.getElementById('np-speed'),
      speedMenu: document.getElementById('np-speed-menu'),
      langBtn: document.getElementById('np-lang'),
      langMenu: document.getElementById('np-lang-menu'),
      fsBtn: document.getElementById('np-fs'),
      plBtn: document.getElementById('np-pl'),
      plPanel: document.getElementById('np-pl-panel'),
      plList: document.getElementById('np-pl-list'),
      micBtn: document.getElementById('np-mic'),
      voiceStatus: document.getElementById('np-voice-status'),
      nudge: document.getElementById('np-nudge'),
      nudgeLeft: document.getElementById('np-nudge-left'),
      nudgeRight: document.getElementById('np-nudge-right'),
      spinner: document.getElementById('np-spinner'),
      speedHold: document.getElementById('np-speed-hold'),
    };

    injectIcons();
    buildPlaylist();
    buildSpeedMenu();
    buildLangMenu();
    loadTrack(0, 'en', false);
    bindEvents();
    updateVolUI();
  }

  // ── ICON INJECTION ─────────────────────────────────────────
  function injectIcons() {
    const map = {
      'np-play': 'play', 'np-prev': 'prev', 'np-next': 'next',
      'np-replay': 'replay10', 'np-fwd': 'forward10',
      'np-vol': 'volume', 'np-speed': 'speed', 'np-lang': 'lang',
      'np-fs': 'fullscreen', 'np-pl': 'playlist', 'np-mic': 'mic',
    };
    for (const [id, key] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = ICONS[key];
    }
  }

  // ── TRACK LOADING ──────────────────────────────────────────
  function loadTrack(idx, lang, autoplay) {
    const item = PLAYLIST[idx];
    if (!item) return;
    S.idx = idx;
    S.lang = lang;
    const src = item.tracks[lang] || item.tracks['en'];
    R.title.textContent = item.title;
    R.thumb.src = item.thumbnail;
    R.thumb.style.display = 'block';
    R.video.src = src;
    R.video.load();
    if (autoplay) {
      R.video.play().catch(() => {});
    }
    updatePlaylistUI();
  }

  // ── PLAYLIST ───────────────────────────────────────────────
  function buildPlaylist() {
    R.plList.innerHTML = '';
    PLAYLIST.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'np-pl-item';
      li.dataset.idx = i;
      li.innerHTML = `
        <div class="np-pl-thumb-wrap"><img src="${item.thumbnail}" class="np-pl-thumb" loading="lazy" /></div>
        <div class="np-pl-meta">
          <span class="np-pl-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="np-pl-name">${item.title}</span>
        </div>`;
      li.addEventListener('click', () => { S.playlistOpen = false; togglePanel('pl', false); loadTrack(i, S.lang, true); });
      li.addEventListener('touchend', e => { e.preventDefault(); S.playlistOpen = false; togglePanel('pl', false); loadTrack(i, S.lang, true); }, { passive: false });
      R.plList.appendChild(li);
    });
  }

  function updatePlaylistUI() {
    document.querySelectorAll('.np-pl-item').forEach((el, i) => {
      el.classList.toggle('active', i === S.idx);
    });
  }

  // ── SPEED MENU ─────────────────────────────────────────────
  function buildSpeedMenu() {
    R.speedMenu.innerHTML = '';
    CFG.speeds.forEach(sp => {
      const btn = document.createElement('button');
      btn.className = 'np-menu-item';
      btn.dataset.speed = sp;
      btn.innerHTML = `${sp}x`;
      btn.addEventListener('click', e => { e.stopPropagation(); setSpeed(sp); togglePanel('speed', false); });
      R.speedMenu.appendChild(btn);
    });
  }

  function updateSpeedMenuUI() {
    document.querySelectorAll('.np-menu-item[data-speed]').forEach(el => {
      const active = parseFloat(el.dataset.speed) === S.speed;
      el.classList.toggle('active', active);
      el.innerHTML = active ? `${ICONS.check}<span>${el.dataset.speed}x</span>` : `${el.dataset.speed}x`;
    });
    R.speedBtn.querySelector('span') && (R.speedBtn.querySelector('span').textContent = S.speed + 'x');
  }

  // ── LANG MENU ──────────────────────────────────────────────
  function buildLangMenu() {
    R.langMenu.innerHTML = '';
    CFG.langs.forEach(l => {
      const btn = document.createElement('button');
      btn.className = 'np-menu-item';
      btn.dataset.lang = l;
      btn.textContent = CFG.langLabels[l];
      btn.addEventListener('click', e => { e.stopPropagation(); setLang(l); togglePanel('lang', false); });
      R.langMenu.appendChild(btn);
    });
  }

  function updateLangMenuUI() {
    document.querySelectorAll('.np-menu-item[data-lang]').forEach(el => {
      const active = el.dataset.lang === S.lang;
      el.classList.toggle('active', active);
      const label = CFG.langLabels[el.dataset.lang];
      el.innerHTML = active ? `${ICONS.check}<span>${label}</span>` : label;
    });
  }

  // ── PLAYBACK CONTROLS ──────────────────────────────────────
  function togglePlay() {
    if (R.video.paused) { R.video.play().catch(() => {}); }
    else { R.video.pause(); }
  }

  function setSpeed(sp) {
    S.speed = sp;
    R.video.playbackRate = sp;
    updateSpeedMenuUI();
    showNudge(`${sp}x`, 'center');
  }

  function setLang(lang) {
    const t = R.video.currentTime;
    const playing = !R.video.paused;
    S.lang = lang;
    R.video.src = PLAYLIST[S.idx].tracks[lang] || PLAYLIST[S.idx].tracks['en'];
    R.video.load();
    R.video.currentTime = t;
    if (playing) R.video.play().catch(() => {});
    updateLangMenuUI();
    showNudge(CFG.langLabels[lang], 'center');
  }

  function skip(sec) {
    R.video.currentTime = Math.max(0, Math.min(R.video.duration || 0, R.video.currentTime + sec));
    showNudge(sec > 0 ? `+${sec}s` : `${sec}s`, sec > 0 ? 'right' : 'left');
  }

  function setVol(v) {
    S.vol = Math.max(0, Math.min(1, v));
    R.video.volume = S.vol;
    S.muted = S.vol === 0;
    R.video.muted = S.muted;
    updateVolUI();
  }

  function toggleMute() {
    S.muted = !S.muted;
    R.video.muted = S.muted;
    updateVolUI();
  }

  function updateVolUI() {
    const eff = S.muted ? 0 : S.vol;
    R.volFill.style.width = (eff * 100) + '%';
    R.volSlider.value = eff;
    R.volBtn.innerHTML = eff === 0 ? ICONS.volumeMute : ICONS.volume;
  }

  function nextTrack() { loadTrack((S.idx + 1) % PLAYLIST.length, S.lang, true); }
  function prevTrack() { loadTrack((S.idx - 1 + PLAYLIST.length) % PLAYLIST.length, S.lang, true); }

  // ── SEEK ───────────────────────────────────────────────────
  function seekTo(pct) {
    const d = R.video.duration;
    if (!isFinite(d)) return;
    R.video.currentTime = Math.max(0, Math.min(d, pct * d));
  }

  function pctFromEvent(e) {
    const rect = R.seekTrack.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function updateSeekUI() {
    const d = R.video.duration || 0;
    const c = R.video.currentTime || 0;
    const pct = d ? c / d : 0;
    R.seekFill.style.width = (pct * 100) + '%';
    R.seekThumb.style.left = (pct * 100) + '%';
    R.timeEl.textContent = `${fmt(c)} / ${fmt(d)}`;

    // buffer
    if (R.video.buffered.length) {
      const end = R.video.buffered.end(R.video.buffered.length - 1);
      R.seekBuf.style.width = ((end / (d || 1)) * 100) + '%';
    }
  }

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  }

  // ── UI VISIBILITY ──────────────────────────────────────────
  function showUI() {
    S.uiVisible = true;
    R.controls.classList.add('visible');
    R.topBar.classList.add('visible');
    resetHideTimer();
  }

  function hideUI() {
    if (S.playing && !S.seeking) {
      S.uiVisible = false;
      R.controls.classList.remove('visible');
      R.topBar.classList.remove('visible');
      closeAllMenus();
    }
  }

  function resetHideTimer() {
    clearTimeout(S.uiTimer);
    if (S.playing) S.uiTimer = setTimeout(hideUI, CFG.uiHideDelay);
  }

  function toggleUI() { S.uiVisible ? hideUI() : showUI(); }

  function closeAllMenus() {
    togglePanel('speed', false);
    togglePanel('lang', false);
    togglePanel('pl', false);
  }

  function togglePanel(name, force) {
    const panels = { speed: [R.speedMenu, 'speedOpen'], lang: [R.langMenu, 'langOpen'], pl: [R.plPanel, 'playlistOpen'] };
    const [el, key] = panels[name];
    const state = force !== undefined ? force : !S[key];
    if (state) {
      // close others first
      for (const [n, [e, k]] of Object.entries({ speed: panels.speed, lang: panels.lang, pl: panels.pl })) {
        if (n !== name) { e.classList.remove('open'); S[k] = false; }
      }
    }
    el.classList.toggle('open', state);
    S[key] = state;
  }

  // ── NUDGE ANIMATION ────────────────────────────────────────
  let nudgeTimer = null;
  function showNudge(text, side) {
    const el = side === 'left' ? R.nudgeLeft : side === 'right' ? R.nudgeRight : R.nudge;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => { R.nudgeLeft.classList.remove('show'); R.nudgeRight.classList.remove('show'); R.nudge.classList.remove('show'); }, 700);
  }

  // ── FULLSCREEN ─────────────────────────────────────────────
  function toggleFS() {
    if (!document.fullscreenElement) {
      R.root.requestFullscreen && R.root.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

  // ── HOLD FOR 2x SPEED ──────────────────────────────────────
  function startHold() {
    S.holdTimer = setTimeout(() => {
      R.video.playbackRate = CFG.holdSpeed;
      R.speedHold.classList.add('show');
      showNudge('2×', 'center');
    }, CFG.holdDelay);
  }

  function endHold() {
    clearTimeout(S.holdTimer);
    if (R.video.playbackRate === CFG.holdSpeed && S.speed !== CFG.holdSpeed) {
      R.video.playbackRate = S.speed;
      R.speedHold.classList.remove('show');
    }
  }

  // ── VOICE CONTROL ──────────────────────────────────────────
  function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { R.micBtn.style.display = 'none'; return; }
    S.recognition = new SR();
    S.recognition.continuous = true;
    S.recognition.interimResults = false;
    S.recognition.lang = 'en-US';
    S.recognition.addEventListener('result', e => {
      const cmd = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
      handleVoiceCmd(cmd);
    });
    S.recognition.addEventListener('end', () => { if (S.voiceActive) S.recognition.start(); });
  }

  function toggleVoice() {
    if (!S.recognition) return;
    S.voiceActive = !S.voiceActive;
    if (S.voiceActive) {
      S.recognition.start();
      R.micBtn.innerHTML = ICONS.mic;
      R.micBtn.classList.add('active');
      R.voiceStatus.textContent = 'Listening…';
      R.voiceStatus.classList.add('show');
    } else {
      S.recognition.stop();
      R.micBtn.innerHTML = ICONS.micOff;
      R.micBtn.classList.remove('active');
      R.voiceStatus.classList.remove('show');
    }
  }

  function handleVoiceCmd(cmd) {
    R.voiceStatus.textContent = `"${cmd}"`;
    if (/\b(play|resume|start)\b/.test(cmd)) { if (R.video.paused) togglePlay(); }
    else if (/\b(pause|stop)\b/.test(cmd)) { if (!R.video.paused) togglePlay(); }
    else if (/\b(next|forward video)\b/.test(cmd)) nextTrack();
    else if (/\b(previous|back|prev)\b/.test(cmd)) prevTrack();
    else if (/\bmute\b/.test(cmd)) { S.muted = true; R.video.muted = true; updateVolUI(); }
    else if (/\bunmute\b/.test(cmd)) { S.muted = false; R.video.muted = false; updateVolUI(); }
    else if (/\bfullscreen\b/.test(cmd)) toggleFS();
    else if (/\b(hindi|हिंदी)\b/.test(cmd)) setLang('hi');
    else if (/\b(english)\b/.test(cmd)) setLang('en');
    else if (/\b(japanese|japan)\b/.test(cmd)) setLang('ja');
    else if (/\bspeed\s*(up|faster|increase)\b/.test(cmd)) { const i = CFG.speeds.indexOf(S.speed); if (i < CFG.speeds.length - 1) setSpeed(CFG.speeds[i + 1]); }
    else if (/\bspeed\s*(down|slower|decrease)\b/.test(cmd)) { const i = CFG.speeds.indexOf(S.speed); if (i > 0) setSpeed(CFG.speeds[i - 1]); }
  }

  // ── KEYBOARD SHORTCUTS ─────────────────────────────────────
  function onKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const map = {
      ' ': () => togglePlay(),
      'k': () => togglePlay(),
      'ArrowLeft': () => skip(-CFG.skipSec),
      'ArrowRight': () => skip(CFG.skipSec),
      'ArrowUp': () => setVol(S.vol + 0.1),
      'ArrowDown': () => setVol(S.vol - 0.1),
      'm': () => toggleMute(),
      'f': () => toggleFS(),
      'n': () => nextTrack(),
      'p': () => prevTrack(),
      '>': () => { const i = CFG.speeds.indexOf(S.speed); if (i < CFG.speeds.length - 1) setSpeed(CFG.speeds[i + 1]); },
      '<': () => { const i = CFG.speeds.indexOf(S.speed); if (i > 0) setSpeed(CFG.speeds[i - 1]); },
      '?': () => showHelp(),
      'Escape': () => { closeAllMenus(); if (document.fullscreenElement) document.exitFullscreen(); },
    };
    const action = map[e.key] || map[e.key.toLowerCase()];
    if (action) { e.preventDefault(); action(); showUI(); }
  }

  // ── TOUCH GESTURES ─────────────────────────────────────────
  function onTouchStart(e) {
    const t = e.touches[0];
    S.touchStartX = t.clientX;
    S.touchStartY = t.clientY;
    S.touchStartTime = Date.now();
    const now = Date.now();
    if (now - S.lastTap < CFG.doubleTapMs) {
      const rect = R.overlay.getBoundingClientRect();
      const third = rect.width / 3;
      const x = t.clientX - rect.left;
      if (x < third) skip(-CFG.skipSec);
      else if (x > third * 2) skip(CFG.skipSec);
      S.lastTap = 0;
      return;
    }
    S.lastTap = now;
    startHold();
  }

  function onTouchMove(e) {
    endHold();
    const dx = e.touches[0].clientX - S.touchStartX;
    const dy = e.touches[0].clientY - S.touchStartY;
    if (Math.abs(dx) > CFG.swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      // horizontal swipe seek
      const d = R.video.duration || 0;
      const rect = R.overlay.getBoundingClientRect();
      const seekDelta = (dx / rect.width) * d * 0.3;
      R.video.currentTime = Math.max(0, Math.min(d, R.video.currentTime + seekDelta));
      S.touchStartX = e.touches[0].clientX;
      showNudge(dx > 0 ? `+${Math.abs(seekDelta.toFixed(0))}s` : `-${Math.abs(seekDelta.toFixed(0))}s`, dx > 0 ? 'right' : 'left');
    }
  }

  function onTouchEnd() {
    endHold();
    const dt = Date.now() - S.touchStartTime;
    const moved = Math.hypot(0, 0); // rely on touchmove prevention
    if (dt < 200) showUI();
  }

  // ── RAF LOOP ───────────────────────────────────────────────
  function rafLoop() {
    updateSeekUI();
    S.raf = requestAnimationFrame(rafLoop);
  }

  // ── EVENT BINDING ──────────────────────────────────────────
  function bindEvents() {
    // Video events
    R.video.addEventListener('play', () => { S.playing = true; R.playBtn.innerHTML = ICONS.pause; R.thumb.style.display = 'none'; resetHideTimer(); R.spinner.classList.remove('show'); });
    R.video.addEventListener('pause', () => { S.playing = false; R.playBtn.innerHTML = ICONS.play; showUI(); clearTimeout(S.uiTimer); R.spinner.classList.remove('show'); });
    R.video.addEventListener('ended', () => { nextTrack(); });
    R.video.addEventListener('waiting', () => R.spinner.classList.add('show'));
    R.video.addEventListener('canplay', () => R.spinner.classList.remove('show'));
    R.video.addEventListener('loadedmetadata', updateSeekUI);

    // Controls
    R.playBtn.addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
    R.prevBtn.addEventListener('click', e => { e.stopPropagation(); prevTrack(); });
    R.nextBtn.addEventListener('click', e => { e.stopPropagation(); nextTrack(); });
    R.replayBtn.addEventListener('click', e => { e.stopPropagation(); skip(-CFG.skipSec); });
    R.fwdBtn.addEventListener('click', e => { e.stopPropagation(); skip(CFG.skipSec); });
    R.volBtn.addEventListener('click', e => { e.stopPropagation(); toggleMute(); });
    R.fsBtn.addEventListener('click', e => { e.stopPropagation(); toggleFS(); });
    R.micBtn.addEventListener('click', e => { e.stopPropagation(); toggleVoice(); });

    R.speedBtn.addEventListener('click', e => { e.stopPropagation(); closeAllMenus(); togglePanel('speed', !S.speedOpen); });
    R.langBtn.addEventListener('click', e => { e.stopPropagation(); closeAllMenus(); togglePanel('lang', !S.langOpen); });
    R.plBtn.addEventListener('click', e => { e.stopPropagation(); togglePanel('pl', !S.playlistOpen); });

    // Volume slider
    R.volSlider.addEventListener('input', e => { setVol(parseFloat(e.target.value)); });

    // Seek bar mouse
    R.seekTrack.addEventListener('mousedown', e => {
      S.seeking = true; S.dragSeek = true;
      seekTo(pctFromEvent(e));
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (S.dragSeek) { seekTo(pctFromEvent(e)); updateSeekUI(); }
      if (R.controls.contains(e.target) || R.topBar.contains(e.target)) { showUI(); return; }
      showUI();
    });
    document.addEventListener('mouseup', () => { S.seeking = false; S.dragSeek = false; });

    // Seek hover preview
    R.seekTrack.addEventListener('mousemove', e => {
      const pct = pctFromEvent(e);
      const d = R.video.duration || 0;
      R.seekHover.textContent = fmt(pct * d);
      R.seekHover.style.left = (pct * 100) + '%';
      R.seekHover.style.opacity = '1';
    });
    R.seekTrack.addEventListener('mouseleave', () => { R.seekHover.style.opacity = '0'; });

    // Seek touch
    R.seekTrack.addEventListener('touchstart', e => { S.seeking = true; seekTo(pctFromEvent(e)); e.stopPropagation(); }, { passive: true });
    R.seekTrack.addEventListener('touchmove', e => { if (S.seeking) seekTo(pctFromEvent(e)); e.stopPropagation(); }, { passive: true });
    R.seekTrack.addEventListener('touchend', e => { S.seeking = false; e.stopPropagation(); }, { passive: true });

    // Overlay click/touch
    R.overlay.addEventListener('click', e => {
      if (!e.target.closest('#np-controls') && !e.target.closest('#np-top-bar')) toggleUI();
    });
    R.overlay.addEventListener('touchstart', onTouchStart, { passive: true });
    R.overlay.addEventListener('touchmove', onTouchMove, { passive: false });
    R.overlay.addEventListener('touchend', onTouchEnd, { passive: true });

    // Hold on play button for 2x
    R.playBtn.addEventListener('mousedown', startHold);
    R.playBtn.addEventListener('mouseup', endHold);
    R.playBtn.addEventListener('mouseleave', endHold);
    R.playBtn.addEventListener('touchstart', e => { e.stopPropagation(); startHold(); }, { passive: true });
    R.playBtn.addEventListener('touchend', e => { e.stopPropagation(); endHold(); togglePlay(); }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', onKey);

    // Fullscreen change
    document.addEventListener('fullscreenchange', () => {
      S.fullscreen = !!document.fullscreenElement;
      R.fsBtn.innerHTML = S.fullscreen ? ICONS.exitFullscreen : ICONS.fullscreen;
      R.root.classList.toggle('fullscreen', S.fullscreen);
    });

    // Close menus on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#np-speed') && !e.target.closest('#np-speed-menu')) togglePanel('speed', false);
      if (!e.target.closest('#np-lang') && !e.target.closest('#np-lang-menu')) togglePanel('lang', false);
    });

    // RAF loop
    rafLoop();
    initVoice();
    showUI();
  }

  function showHelp() {
    showNudge('Space:Play  ←→:Seek  ↑↓:Vol  M:Mute  F:FS  N/P:Track  <>:Speed', 'center');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', NovaPlayer.init);
