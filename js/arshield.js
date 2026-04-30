/* ============================================================
   ARSHIELD.JS v3.0
   Cloudflare-style security gate with Parqra SDK sync.

   HTML usage (order matters):
     <script src="...sdk.js?pid=ee91e5af-..."></script>
     <script src="arshield.js"></script>

   Flow: Math CAPTCHA → Data collection screen → Slider check → Page reveal
   ============================================================ */

(function (w, d, n) {
  'use strict';

  /* ============================================================
     SECTION 1 — CONFIG
     ============================================================ */

  var TABLE  = 'arshield_visitors';
  var LS_KEY = '__ars_v3';          /* bumped key — clears old v2 data */

  var C = {
    bg:      '#07070d',
    card:    '#0f0f1a',
    cardB:   '#141422',
    border:  '#1e1e30',
    accent:  '#7c3aed',
    aLt:     '#a78bfa',
    glow:    'rgba(124,58,237,0.35)',
    ok:      '#10b981',
    err:     '#ef4444',
    warn:    '#f59e0b',
    tx:      '#e2e8f0',
    muted:   '#64748b',
    mutedLt: '#94a3b8'
  };

  /* ============================================================
     SECTION 2 — SESSION STORE
     Uses a new LS key (LS_KEY) so old v2 data is ignored.
     On each boot the old key is wiped and replaced fresh.
     ============================================================ */

  var SESSION = {
    load: function () {
      try {
        /* Wipe any legacy keys from older versions */
        ['__ars_session', '__ars_v2'].forEach(function (k) { localStorage.removeItem(k); });
        var r = localStorage.getItem(LS_KEY);
        return r ? JSON.parse(r) : null;
      } catch (e) { return null; }
    },
    save: function (data) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
    },
    newId: function () {
      var a = new Uint8Array(16);
      try { w.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 16; i++) a[i] = (Math.random() * 256) | 0; }
      return 'ars_' + Array.from(a).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
  };

  /* ============================================================
     SECTION 3 — STATE
     Flat runtime object; server payload collapses into 8 JSON columns.
     ============================================================ */

  var PREV = SESSION.load() || {};
  var NOW  = Date.now();

  /* Helper — accumulate from previous visit */
  var acc = function (k, def) { return (PREV.acc && PREV.acc[k]) || def || 0; };

  var S = {
    /* ── Identity (stable) ─────────────────── */
    id:           PREV.id  || SESSION.newId(),
    visits:       (PREV.visits || 0) + 1,
    first_seen:   PREV.first_seen || new Date().toISOString(),
    row_id:       PREV.row_id || null,   /* Parqra DB row id for PATCH */

    /* ── Accumulated counters ──────────────── */
    acc: {
      time_ms:      acc('time_ms'),
      mouse:        acc('mouse'),
      touch:        acc('touch'),
      keys:         acc('keys'),
      scroll:       acc('scroll'),
      clicks:       acc('clicks'),
      cap_tries:    acc('cap_tries'),
      cap_passes:   acc('cap_passes'),
      bot_flags:    acc('bot_flags'),
      human_sigs:   acc('human_sigs'),
      devtools:     acc('devtools'),
      ctx_menus:    acc('ctx_menus'),
      tab_hides:    acc('tab_hides')
    },

    /* ── This-visit live ───────────────────── */
    _start:       NOW,

    /* ── Security assessment ───────────────── */
    score:        100,
    is_bot:       false,
    is_headless:  false,
    automated:    false,
    honeypot:     false,
    cap_solved:   false,
    cap_ms:       0,
    devtools_now: 0,
    timing_bad:   0,
    mouse_straight: 0,
    webdriver:    n.webdriver ? 1 : 0,

    /* ── Fingerprints ──────────────────────── */
    fp: { canvas: null, audio: null, webgl: null, combined: null, fonts: 0 },

    /* ── Device info (populated by FP + ENV) ─ */
    device: {},

    /* ── Performance timings ───────────────── */
    perf: { dns:0, tcp:0, ttfb:0, dom_i:0, dom:0, load:0 }
  };

  /* ============================================================
     SECTION 4 — UTILITIES
     ============================================================ */

  var U = {
    el: function (tag, attr, style) {
      var e = d.createElement(tag);
      if (attr) Object.keys(attr).forEach(function (k) {
        if (k === 'html') e.innerHTML = attr[k];
        else if (k === 'text') e.textContent = attr[k];
        else e.setAttribute(k, attr[k]);
      });
      if (style) U.css(e, style);
      return e;
    },
    css: function (el, s) { Object.keys(s).forEach(function (k) { el.style[k] = s[k]; }); },
    rand: function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
    sha: function (str) {
      var h = 5381, i;
      for (i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
      return (h >>> 0).toString(16).padStart(8, '0');
    },
    throttle: function (fn, ms) {
      var t = 0;
      return function () { var n = Date.now(); if (n - t >= ms) { t = n; fn.apply(this, arguments); } };
    },
    flag: function (p) {
      S.score = Math.max(0, S.score - (p || 10));
      S.acc.bot_flags++;
      if (S.score < 30) S.is_bot = true;
    },
    ok: function (b) {
      S.score = Math.min(100, S.score + (b || 5));
      S.acc.human_sigs++;
    },
    $ : function (id) { return d.getElementById(id); },
    /* Detect device type from UA + touch */
    deviceType: function () {
      var ua = S.device.ua || '';
      if (/iPad|tablet/i.test(ua) || (n.maxTouchPoints > 1 && w.innerWidth >= 600 && w.innerWidth <= 1400)) return 'tablet';
      if (/Mobile|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'mobile';
      return 'desktop';
    },
    /* Parse OS from UA */
    osName: function () {
      var ua = n.userAgent;
      if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
      if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
      if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
      if (/Mac OS X/.test(ua)) return 'macOS ' + (ua.match(/Mac OS X ([\d_]+)/) || ['',''])[1].replace(/_/g, '.');
      if (/Android ([\d.]+)/.test(ua)) return 'Android ' + ua.match(/Android ([\d.]+)/)[1];
      if (/iPhone OS ([\d_]+)/.test(ua)) return 'iOS ' + ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g, '.');
      if (/Linux/.test(ua)) return 'Linux';
      return 'Unknown';
    },
    /* Parse browser from UA */
    browserName: function () {
      var ua = n.userAgent;
      if (/Edg\//.test(ua)) return 'Edge';
      if (/OPR\/|Opera/.test(ua)) return 'Opera';
      if (/Firefox\//.test(ua)) return 'Firefox';
      if (/Chrome\//.test(ua)) return 'Chrome';
      if (/Safari\//.test(ua)) return 'Safari';
      return 'Other';
    }
  };

  /* ============================================================
     SECTION 5 — PERF OPTIMISER (runs immediately in <head>)
     ============================================================ */

  var PERF = {
    init: function () {
      var head = d.head || d.documentElement;
      ['dns-prefetch', 'preconnect'].forEach(function (rel) {
        head.insertBefore(U.el('link', { rel: rel, href: w.location.origin }), head.firstChild);
      });
      var s = U.el('style');
      s.textContent = '*{box-sizing:border-box}img{content-visibility:auto}';
      head.appendChild(s);
      w.addEventListener('load', function () {
        try {
          var t = performance.timing;
          S.perf = {
            dns:   t.domainLookupEnd - t.domainLookupStart,
            tcp:   t.connectEnd - t.connectStart,
            ttfb:  t.responseStart - t.navigationStart,
            dom_i: t.domInteractive - t.navigationStart,
            dom:   t.domContentLoadedEventEnd - t.navigationStart,
            load:  t.loadEventEnd - t.navigationStart
          };
        } catch (e) {}
      });
    }
  };

  /* ============================================================
     SECTION 6 — FINGERPRINTING
     ============================================================ */

  var FP = {
    run: function () {
      FP.canvas(); FP.audio(); FP.webgl(); FP.fonts(); FP.env();
      S.fp.combined = U.sha((S.fp.canvas || '') + (S.fp.audio || '') + (S.fp.webgl || '') + n.userAgent + screen.width + screen.height);
    },
    canvas: function () {
      try {
        var cv = d.createElement('canvas'); cv.width = 200; cv.height = 50;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#12003a'; ctx.fillRect(0, 0, 200, 50);
        ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#a78bfa';
        ctx.fillText('ArShield\u2122 \u03C0\u221A', 4, 20);
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(170, 25, 16, 0, Math.PI * 2); ctx.stroke();
        S.fp.canvas = U.sha(cv.toDataURL().slice(-80));
      } catch (e) { S.fp.canvas = 'err'; }
    },
    audio: function () {
      try {
        var AC = w.AudioContext || w.webkitAudioContext;
        if (!AC) { S.fp.audio = 'na'; return; }
        var ac = new AC(), osc = ac.createOscillator(), an = ac.createAnalyser(), g = ac.createGain();
        g.gain.value = 0; osc.connect(an); an.connect(g); g.connect(ac.destination); osc.start(0);
        var buf = new Float32Array(an.frequencyBinCount);
        an.getFloatFrequencyData(buf);
        S.fp.audio = U.sha(buf.slice(0, 10).join(','));
        osc.stop(); ac.close();
      } catch (e) { S.fp.audio = 'err'; }
    },
    webgl: function () {
      try {
        var cv = d.createElement('canvas');
        var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
        if (!gl) { S.fp.webgl = 'na'; return; }
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        var vendor   = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR);
        S.fp.webgl = U.sha(renderer + vendor);
        /* Store readable GPU string for device column */
        S.device.gpu = renderer || 'unknown';
      } catch (e) { S.fp.webgl = 'err'; }
    },
    fonts: function () {
      try {
        var fonts = ['Arial','Verdana','Georgia','Times New Roman','Courier New','Impact','Comic Sans MS','Trebuchet MS','Century Gothic'];
        var cv = d.createElement('canvas'), ctx = cv.getContext('2d');
        ctx.font = '16px monospace';
        var base = ctx.measureText('mmmmm').width, count = 0;
        fonts.forEach(function (f) { ctx.font = '16px "' + f + '",monospace'; if (ctx.measureText('mmmmm').width !== base) count++; });
        S.fp.fonts = count;
      } catch (e) {}
    },
    env: function () {
      /* Collect all device/env data into S.device */
      var conn = n.connection || n.mozConnection || n.webkitConnection || {};
      var tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

      S.device = {
        ua:           (n.userAgent || '').slice(0, 220),
        browser:      U.browserName(),
        os:           U.osName(),
        type:         U.deviceType(),
        gpu:          S.device.gpu || 'unknown',
        platform:     n.platform || '',
        lang:         n.language || '',
        langs:        (n.languages || []).join(','),
        tz:           tz,
        screen:       screen.width + 'x' + screen.height,
        viewport:     w.innerWidth + 'x' + w.innerHeight,
        dpr:          w.devicePixelRatio || 1,
        cpu_cores:    n.hardwareConcurrency || 0,
        ram_gb:       n.deviceMemory || 0,
        touch_pts:    n.maxTouchPoints || 0,
        net_type:     conn.effectiveType || '',
        net_mbps:     conn.downlink || 0,
        color_depth:  screen.colorDepth || 0,
        plugins:      n.plugins ? n.plugins.length : 0,
        cookies:      n.cookieEnabled ? 1 : 0,
        dnt:          n.doNotTrack || ''
      };
    }
  };

  /* ============================================================
     SECTION 7 — BOT DETECTION
     ============================================================ */

  var BOT = {
    run: function () {
      BOT.ua(); BOT.headless(); BOT.automation(); BOT.timing();
      BOT.consistency(); BOT.devToolsLoop(); BOT.honeypot(); BOT.behavior();
    },
    ua: function () {
      var ua = (n.userAgent || '').toLowerCase();
      ['headless','phantomjs','selenium','webdriver','htmlunit','python','curl','wget','scrapy','java/','go-http','okhttp'].forEach(function (s) {
        if (ua.indexOf(s) > -1) U.flag(20);
      });
      if (!n.languages || !n.languages.length) U.flag(15);
    },
    headless: function () {
      if (n.webdriver) { U.flag(40); S.is_headless = true; }
      if (w.outerWidth === 0 || w.outerHeight === 0) { U.flag(15); S.is_headless = true; }
      if (/chrome/i.test(n.userAgent) && !w.chrome) { U.flag(20); S.is_headless = true; }
    },
    automation: function () {
      ['__webdriver_evaluate','__selenium_evaluate','__webdriver_script_fn','_phantom','__phantom',
       'callPhantom','_selenium','__nightmare','domAutomation','domAutomationController'].forEach(function (p) {
        try { if (w[p] !== undefined) { U.flag(25); S.automated = true; } } catch (e) {}
      });
    },
    timing: function () {
      var t = performance.now(), sum = 0;
      for (var i = 0; i < 4e5; i++) sum += i;
      if (performance.now() - t < 1) { U.flag(10); S.timing_bad++; }
      try { if (Math.abs((performance.timeOrigin || Date.now()) - Date.now()) > 60000) { U.flag(10); S.timing_bad++; } } catch (e) {}
    },
    consistency: function () {
      if (/chrome/i.test(n.userAgent) && n.plugins.length === 0) U.flag(15);
      if (S.fp.fonts < 3) U.flag(10);
    },
    devToolsLoop: function () {
      setInterval(function () {
        if (w.outerWidth - w.innerWidth > 160 || w.outerHeight - w.innerHeight > 160) {
          S.devtools_now++; S.acc.devtools++; U.flag(3);
          console.clear();
          console.log('%c\u26A0 ArShield Active', 'color:#7c3aed;font-size:16px;font-weight:900');
          console.log('%cThis session is monitored.', 'color:#ef4444;font-size:12px');
        }
      }, 1500);
    },
    honeypot: function () {
      var hp = U.el('input', {
        type: 'text', name: 'website_url', autocomplete: 'off',
        tabindex: '-1', 'aria-hidden': 'true'
      }, { position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
      hp.addEventListener('input', function () { if (hp.value) { S.honeypot = true; U.flag(50); } });
      if (d.body) d.body.appendChild(hp);
    },
    behavior: function () {
      var path = [], straight = 0, total = 0;

      d.addEventListener('mousemove', U.throttle(function (e) {
        S.acc.mouse++;
        path.push({ x: e.clientX, y: e.clientY });
        if (path.length > 3) {
          total++;
          var l = path.length, a = path[l-3], b = path[l-2], c = path[l-1];
          if (Math.abs(Math.atan2(b.y-a.y, b.x-a.x) - Math.atan2(c.y-b.y, c.x-b.x)) < 0.015) straight++;
          S.mouse_straight = total ? Math.round(straight / total * 100) : 0;
          if (total === 30) { S.mouse_straight > 85 ? U.flag(20) : U.ok(6); }
        }
      }, 40), { passive: true });

      d.addEventListener('touchstart', function () {
        S.acc.touch++;
        if (S.acc.touch === 1) U.ok(8);
      }, { passive: true });

      var lastKey = 0;
      d.addEventListener('keydown', function () {
        S.acc.keys++;
        var now = Date.now(), dt = now - lastKey;
        if (lastKey && dt < 10) S.timing_bad++;
        else if (lastKey && dt > 10 && dt < 600) U.ok(2);
        lastKey = now;
      }, { passive: true });

      d.addEventListener('scroll', U.throttle(function () {
        S.acc.scroll++;
        if (S.acc.scroll === 3) U.ok(4);
      }, 150), { passive: true });

      d.addEventListener('click', function () { S.acc.clicks++; }, { passive: true });

      d.addEventListener('visibilitychange', function () { if (d.hidden) S.acc.tab_hides++; });

      /* Content protection */
      d.addEventListener('contextmenu', function (e) { e.preventDefault(); S.acc.ctx_menus++; });
      d.addEventListener('dragstart',   function (e) { e.preventDefault(); });
      d.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase(), cm = e.ctrlKey || e.metaKey;
        if (cm && (k === 's' || k === 'u')) { e.preventDefault(); }
        if (cm && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); U.flag(5); }
        if (e.key === 'F12') { e.preventDefault(); U.flag(5); }
      });
    }
  };

  /* ============================================================
     SECTION 8 — CONTENT HIDER & LAZY REVEAL
     ============================================================ */

  var CONTENT = {
    init: function () {
      var s = U.el('style');
      s.textContent = 'html,body{margin:0;padding:0;background:' + C.bg + ';}#__ars_gate{position:fixed;inset:0;z-index:2147483647;background:' + C.bg + ';}#__ars_wrap{display:none;}';
      (d.head || d.documentElement).appendChild(s);
    },
    stash: function () {
      var wrap = U.el('div', { id: '__ars_wrap' });
      Array.from(d.body.children).forEach(function (c) { if (c.id !== '__ars_gate') wrap.appendChild(c); });
      d.body.appendChild(wrap);
    },
    reveal: function () {
      var wrap = U.$('__ars_wrap');
      if (!wrap) return;
      U.css(wrap, { display: 'block', opacity: '0', transition: 'opacity .5s ease' });
      d.querySelectorAll('img:not([loading])').forEach(function (img) { img.setAttribute('loading', 'lazy'); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.style.opacity = '1'; }); });
    }
  };

  /* ============================================================
     SECTION 9 — MATH CAPTCHA
     ============================================================ */

  var MATH = {
    ans: null, tries: 0, max: 5, t0: 0,

    challenge: function () {
      var ops = [
        function () { var a = U.rand(10,99), b = U.rand(10,99); return { q: a+' + '+b, a: a+b }; },
        function () { var a = U.rand(20,99), b = U.rand(1,a-1); return { q: a+' \u2212 '+b, a: a-b }; },
        function () { var a = U.rand(2,12),  b = U.rand(2,12);  return { q: a+' \u00D7 '+b, a: a*b }; }
      ];
      return ops[U.rand(0, 2)]();
    },

    svg: function (text) {
      var W = 300, H = 80, out = '';
      out += '<rect width="'+W+'" height="'+H+'" fill="'+C.card+'" rx="8"/>';
      /* Grid */
      for (var gx = 0; gx < W; gx += 20) out += '<line x1="'+gx+'" y1="0" x2="'+gx+'" y2="'+H+'" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>';
      for (var gy = 0; gy < H; gy += 20) out += '<line x1="0" y1="'+gy+'" x2="'+W+'" y2="'+gy+'" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>';
      /* Noise dots */
      for (var di = 0; di < 22; di++) out += '<circle cx="'+U.rand(0,W)+'" cy="'+U.rand(0,H)+'" r="'+(Math.random()*2+0.4).toFixed(1)+'" fill="rgba('+[U.rand(80,200),U.rand(80,200),U.rand(80,200)].join(',')+',.35)"/>';
      /* Noise waves */
      for (var wi = 0; wi < 4; wi++) {
        var p = 'M'+U.rand(0,30)+','+U.rand(8,H-8);
        for (var nx = 30; nx <= W; nx += 18) p += ' Q'+nx+','+U.rand(4,H-4)+' '+(nx+18)+','+U.rand(8,H-8);
        out += '<path d="'+p+'" stroke="rgba('+[U.rand(60,160),U.rand(60,160),U.rand(160,240)].join(',')+',.15)" fill="none" stroke-width="1.1"/>';
      }
      /* Distorted chars */
      var cx = 22;
      text.split('').forEach(function (ch) {
        var rot = U.rand(-16,16), cy = U.rand(40,54), sz = U.rand(20,30);
        var r = U.rand(150,255), g = U.rand(150,255), b = U.rand(150,255);
        out += '<text x="'+(cx+1)+'" y="'+(cy+1)+'" transform="rotate('+rot+','+(cx+1)+','+(cy+1)+')" font-size="'+sz+'" font-family="monospace" font-weight="900" fill="rgba(0,0,0,.45)">'+ch+'</text>';
        out += '<text x="'+cx+'" y="'+cy+'" transform="rotate('+rot+','+cx+','+cy+')" font-size="'+sz+'" font-family="monospace" font-weight="900" fill="rgb('+r+','+g+','+b+')">'+ch+'</text>';
        cx += U.rand(24,34);
      });
      return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" role="img" aria-label="Captcha equation">'+out+'</svg>';
    },

    build: function () {
      var ch = MATH.challenge();
      MATH.ans = ch.a; MATH.t0 = Date.now();
      var wrap = U.el('div', {}, { textAlign: 'center' });
      wrap.innerHTML = [
        '<p style="font-size:11px;color:'+C.muted+';letter-spacing:.08em;text-transform:uppercase;margin:0 0 10px">Solve the equation</p>',
        '<div id="__ars_msvg" style="display:inline-block;border-radius:8px;overflow:hidden;border:1px solid '+C.border+';margin-bottom:12px;">'+MATH.svg(ch.q+'  =  ?')+'</div>',
        '<input id="__ars_min" type="number" inputmode="numeric" placeholder="Your answer" autocomplete="off" aria-label="Captcha answer"',
        '  style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid '+C.border+';background:'+C.cardB+';color:'+C.tx+';font-size:16px;outline:none;box-sizing:border-box;text-align:center;-moz-appearance:textfield;">',
        '<div id="__ars_merr" role="alert" aria-live="polite" style="color:'+C.err+';font-size:12px;min-height:16px;margin-top:7px;"></div>'
      ].join('');
      return wrap;
    },

    refresh: function () {
      var ch = MATH.challenge();
      MATH.ans = ch.a; MATH.t0 = Date.now();
      var box = U.$('__ars_msvg'), inp = U.$('__ars_min');
      if (box) box.innerHTML = MATH.svg(ch.q + '  =  ?');
      if (inp) { inp.value = ''; inp.focus(); }
    },

    check: function (val) {
      S.acc.cap_tries++;
      var ms = Date.now() - MATH.t0;
      if (parseInt(val, 10) === MATH.ans) {
        S.cap_ms = ms;
        if (ms < 600) U.flag(25); else { S.cap_solved = true; S.acc.cap_passes++; U.ok(15); }
        return true;
      }
      MATH.tries++;
      return false;
    }
  };

  /* ============================================================
     SECTION 10 — SLIDER CAPTCHA
     ============================================================ */

  var SLIDER = {
    build: function (onPass) {
      var target = U.rand(62, 78);
      var wrap = U.el('div', {}, { textAlign: 'center' });
      wrap.innerHTML = [
        '<p style="font-size:11px;color:'+C.muted+';letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px">Drag into the zone</p>',
        '<div id="__ars_trk" role="slider" aria-label="Drag slider to verify" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"',
        '  style="position:relative;height:52px;background:'+C.cardB+';border-radius:26px;border:1px solid '+C.border+';overflow:hidden;touch-action:none;user-select:none;cursor:ew-resize;">',
          '<div id="__ars_fill" style="position:absolute;inset:0;right:auto;width:0%;background:linear-gradient(90deg,'+C.accent+'88,'+C.accent+');pointer-events:none;"></div>',
          '<div id="__ars_zone" style="position:absolute;top:0;bottom:0;left:'+(target-8)+'%;width:16%;background:rgba(124,58,237,.12);border-left:1.5px dashed '+C.accent+'55;border-right:1.5px dashed '+C.accent+'55;pointer-events:none;" aria-hidden="true"></div>',
          '<div id="__ars_thumb" style="position:absolute;top:5px;bottom:5px;left:4px;width:42px;background:'+C.accent+';border-radius:21px;box-shadow:0 0 18px '+C.glow+';cursor:grab;display:flex;align-items:center;justify-content:center;transition:background .2s;" aria-hidden="true">',
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">',
              '<path d="M5 3l4 5-4 5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
              '<path d="M11 3l-4 5 4 5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>',
            '</svg>',
          '</div>',
          '<div id="__ars_slbl" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:'+C.muted+';pointer-events:none;font-weight:500;padding-left:54px;">\u2192 Slide to the dashed zone</div>',
        '</div>',
        '<div id="__ars_smsg" role="alert" aria-live="polite" style="font-size:12px;min-height:18px;margin-top:8px;color:'+C.muted+';"></div>'
      ].join('');

      var done = false;

      var setup = function () {
        var trk   = U.$('__ars_trk'),   thumb = U.$('__ars_thumb');
        var fill  = U.$('__ars_fill'),   lbl   = U.$('__ars_slbl');
        var msg   = U.$('__ars_smsg');
        if (!trk || !thumb) return;

        var dragging = false, sx = 0, sl = 0;
        var cx = function (e) { return e.touches ? e.touches[0].clientX : e.clientX; };
        var pct = function () {
          var max = trk.offsetWidth - thumb.offsetWidth - 4;
          return max > 0 ? (thumb.offsetLeft - 4) / max * 100 : 0;
        };
        var reset = function () {
          setTimeout(function () {
            thumb.style.transition = 'left .3s';
            fill.style.transition  = 'width .3s';
            thumb.style.left = '4px'; fill.style.width = '0%';
            lbl.style.opacity = '1';
            trk.setAttribute('aria-valuenow', '0');
            setTimeout(function () { thumb.style.transition = ''; fill.style.transition = ''; }, 320);
          }, 500);
        };

        var onStart = function (e) {
          if (done) return;
          dragging = true; sx = cx(e); sl = thumb.offsetLeft;
          thumb.style.cursor = 'grabbing'; U.ok(3);
          e.preventDefault();
        };
        var onMove = function (e) {
          if (!dragging || done) return;
          var max = trk.offsetWidth - thumb.offsetWidth - 4;
          var nl  = Math.max(4, Math.min(sl + cx(e) - sx, max));
          thumb.style.left = nl + 'px';
          fill.style.width = ((nl - 4) / Math.max(1, max - 4) * 100) + '%';
          trk.setAttribute('aria-valuenow', Math.round(pct()));
          if (pct() > 18) lbl.style.opacity = '0';
          msg.textContent = '';
          e.preventDefault();
        };
        var onEnd = function () {
          if (!dragging || done) return;
          dragging = false; thumb.style.cursor = 'grab';
          var p = pct();
          trk.setAttribute('aria-valuenow', Math.round(p));
          if (p >= target - 8 && p <= target + 8) {
            done = true;
            thumb.style.background = C.ok; thumb.style.boxShadow = '0 0 18px rgba(16,185,129,.5)';
            thumb.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 9l4 4.5L14 5.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            fill.style.background = C.ok;
            lbl.textContent = '\u2713 Verified'; lbl.style.color = C.ok; lbl.style.opacity = '1'; lbl.style.paddingLeft = '0';
            U.ok(15);
            setTimeout(onPass, 600);
          } else {
            msg.textContent = 'Aim for the dashed zone \u2014 try again'; msg.style.color = C.warn;
            reset();
          }
        };

        thumb.addEventListener('mousedown',  onStart, { passive: false });
        thumb.addEventListener('touchstart', onStart, { passive: false });
        d.addEventListener('mousemove',  onMove,  { passive: false });
        d.addEventListener('touchmove',  onMove,  { passive: false });
        d.addEventListener('mouseup',  onEnd);
        d.addEventListener('touchend', onEnd);

        /* Keyboard fallback for accessibility */
        trk.addEventListener('keydown', function (e) {
          if (done) return;
          var max = trk.offsetWidth - thumb.offsetWidth - 4;
          var cur = thumb.offsetLeft;
          var step = max / 20;
          if (e.key === 'ArrowRight') { thumb.style.left = Math.min(cur + step, max) + 'px'; }
          if (e.key === 'ArrowLeft')  { thumb.style.left = Math.max(cur - step, 4) + 'px'; }
          fill.style.width = ((thumb.offsetLeft - 4) / Math.max(1, max - 4) * 100) + '%';
          if (e.key === 'Enter' || e.key === ' ') onEnd();
        });
      };

      setTimeout(setup, 60);
      return wrap;
    }
  };

  /* ============================================================
     SECTION 11 — DATA COLLECTION SCREEN (between captchas)
     Shows device info being collected; auto-advances after 2s.
     ============================================================ */

  var DATA_SCREEN = {
    build: function (onDone) {
      var wrap = U.el('div', { role: 'status', 'aria-live': 'polite' }, { textAlign: 'center' });

      var items = [
        { icon: '&#128241;', label: 'Device: ' + S.device.type + ' &mdash; ' + S.device.os },
        { icon: '&#127760;', label: 'Browser: ' + S.device.browser },
        { icon: '&#128205;', label: 'Timezone: ' + (S.device.tz || 'unknown') },
        { icon: '&#128268;', label: 'Network: ' + (S.device.net_type || 'unknown') + (S.device.net_mbps ? ' &mdash; ' + S.device.net_mbps + ' Mbps' : '') },
        { icon: '&#128202;', label: 'Fingerprint: ' + (S.fp.combined || '').slice(0, 8) + '\u2026' }
      ];

      wrap.innerHTML = [
        '<div style="font-size:11px;color:'+C.muted+';letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px;">Collecting session data</div>',
        '<div id="__ars_dlist" style="display:flex;flex-direction:column;gap:10px;text-align:left;max-width:300px;margin:0 auto 20px;"></div>',
        '<div style="background:'+C.border+';border-radius:4px;height:3px;overflow:hidden;max-width:300px;margin:0 auto;">',
          '<div id="__ars_dprog" style="height:3px;width:0%;background:linear-gradient(90deg,'+C.accent+','+C.aLt+');border-radius:4px;transition:width 1.8s linear;"></div>',
        '</div>'
      ].join('');

      /* Animate items in */
      var list = U.$('__ars_dlist'), idx = 0;
      var tick = function () {
        if (!list || idx >= items.length) return;
        var it = items[idx];
        var row = U.el('div', {}, {
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px', color: C.mutedLt,
          opacity: '0', transform: 'translateY(6px)',
          transition: 'opacity .3s ease, transform .3s ease'
        });
        row.innerHTML = '<span aria-hidden="true" style="font-size:15px;width:22px;text-align:center;">'+it.icon+'</span><span>'+it.label+'</span>';
        list.appendChild(row);
        requestAnimationFrame(function () { requestAnimationFrame(function () { row.style.opacity = '1'; row.style.transform = 'none'; }); });
        idx++;
        if (idx < items.length) setTimeout(tick, 320);
      };
      setTimeout(tick, 150);

      /* Progress bar to 100% then call onDone */
      setTimeout(function () {
        var bar = U.$('__ars_dprog');
        if (bar) bar.style.width = '100%';
      }, 80);
      setTimeout(onDone, 2200);

      return wrap;
    }
  };

  /* ============================================================
     SECTION 12 — FULLSCREEN GATE UI
     ============================================================ */

  var GATE = {
    el: null, step: 0,

    /* ── Shared SVG components ── */
    shield: function (sz) {
      sz = sz || 28;
      return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2L4 7V16C4 22.627 9.373 28 16 30C22.627 28 28 22.627 28 16V7L16 2Z" fill="'+C.accent+'" opacity=".18" stroke="'+C.accent+'" stroke-width="1.5"/><path d="M11 16l3.5 3.5L21 12" stroke="'+C.aLt+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    },

    bar: function (pct) {
      return '<div style="margin-top:20px;background:'+C.border+';border-radius:4px;height:3px;overflow:hidden;" role="progressbar" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100" aria-label="Step progress"><div style="height:3px;width:'+pct+'%;background:linear-gradient(90deg,'+C.accent+','+C.aLt+');border-radius:4px;"></div></div>';
    },

    head: function (step, label) {
      return [
        '<div style="display:flex;align-items:center;gap:11px;margin-bottom:3px;">',
          GATE.shield(26),
          '<div>',
            '<div style="font-size:20px;font-weight:800;letter-spacing:-.02em;color:'+C.tx+';">Verify you\'re human</div>',
            '<div style="font-size:12px;color:'+C.muted+';margin-top:2px;">Step '+step+' of 3 \u2014 '+label+'</div>',
          '</div>',
        '</div>',
        '<div style="height:1px;background:'+C.border+';margin:16px 0 18px;" role="separator"></div>'
      ].join('');
    },

    /* ── Build gate shell ── */
    build: function () {
      /* Inject animations */
      if (!U.$('__ars_kf')) {
        var kf = U.el('style', { id: '__ars_kf', html:
          '@keyframes _spin{to{transform:rotate(360deg)}}' +
          '@keyframes _pulse{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}' +
          '@keyframes _in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
        });
        d.head.appendChild(kf);
      }

      var gate = U.el('div', {
        id: '__ars_gate',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Security verification'
      });
      U.css(gate, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        background: C.bg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
        color: C.tx, padding: '16px', boxSizing: 'border-box'
      });

      gate.innerHTML = [
        /* Top stripe */
        '<div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,'+C.accent+','+C.aLt+',transparent);"></div>',

        /* Brand — top left */
        '<div style="position:absolute;top:18px;left:20px;display:flex;align-items:center;gap:8px;" aria-label="ArShield Security">',
          GATE.shield(24),
          '<span style="font-size:14px;font-weight:800;letter-spacing:-.01em;">ArShield</span>',
        '</div>',

        /* Domain — top right */
        '<div style="position:absolute;top:20px;right:20px;font-size:11px;color:'+C.muted+';background:'+C.card+';border:1px solid '+C.border+';padding:3px 12px;border-radius:20px;" aria-label="Protected domain">'+w.location.hostname+'</div>',

        /* Card */
        '<main id="__ars_card" style="width:100%;max-width:460px;background:'+C.card+';border:1px solid '+C.border+';border-radius:20px;padding:32px;box-shadow:0 0 80px rgba(124,58,237,.1),0 2px 30px rgba(0,0,0,.5);overflow-y:auto;max-height:calc(100vh - 120px);">',
          '<div id="__ars_inner"></div>',
        '</main>',

        /* Return visit note */
        (PREV.visits > 0
          ? '<p style="margin-top:14px;font-size:11px;color:'+C.muted+';text-align:center;" aria-label="Return visit">Visit #'+S.visits+' \u00B7 '+Math.round((PREV.acc && PREV.acc.time_ms || 0)/60000)+' min on site</p>'
          : ''),

        /* Footer */
        '<footer style="position:absolute;bottom:14px;font-size:10px;color:'+C.muted+';text-align:center;" aria-label="Footer">',
          'Protected by <strong style="color:'+C.aLt+';">ArShield v3</strong> \u00B7 No external services',
        '</footer>'
      ].join('');

      d.body.appendChild(gate);
      GATE.el = gate;
      GATE.showChecking();
    },

    inner: function () { return U.$('__ars_inner'); },
    set:   function (html) { var el = GATE.inner(); if (el) el.innerHTML = html; },

    /* ── Step 0: Checking ── */
    showChecking: function () {
      GATE.step = 0;
      var returning = PREV.visits > 0;
      GATE.set([
        '<div style="text-align:center;padding:8px 0 16px;">',
          /* Dual-ring spinner */
          '<div style="position:relative;width:80px;height:80px;margin:0 auto 22px;" aria-busy="true" role="status" aria-label="Checking browser">',
            '<div aria-hidden="true" style="position:absolute;inset:0;border-radius:50%;border:2.5px solid '+C.border+';border-top-color:'+C.accent+';animation:_spin 1s linear infinite;"></div>',
            '<div aria-hidden="true" style="position:absolute;inset:0;border-radius:50%;border:2.5px solid transparent;border-bottom-color:'+C.aLt+'44;animation:_spin 1.7s linear reverse infinite;"></div>',
            '<div style="position:absolute;inset:14px;display:flex;align-items:center;justify-content:center;">'+GATE.shield(40)+'</div>',
          '</div>',
          '<h1 style="font-size:22px;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;">Checking your browser</h1>',
          '<p style="font-size:14px;color:'+C.muted+';line-height:1.65;margin:0;">',
            returning ? 'Welcome back \u2014 reverifying your session\u2026' : 'This page is protected. Running security checks\u2026',
          '</p>',
          /* Dots */
          '<div aria-hidden="true" style="display:flex;justify-content:center;gap:6px;margin-top:20px;">',
            [0,1,2].map(function(i){return '<div style="width:7px;height:7px;border-radius:50%;background:'+C.accent+';animation:_pulse 1.4s ease '+(i*.18)+'s infinite;"></div>';}).join(''),
          '</div>',
          '<ul id="__ars_cl" aria-label="Security checks" style="list-style:none;margin:22px auto 0;padding:0;max-width:270px;display:flex;flex-direction:column;gap:8px;"></ul>',
        '</div>'
      ].join(''));

      var checks = ['Analysing browser fingerprint','Running bot detection suite','Verifying WebGL & Canvas APIs','Evaluating timing entropy','Checking network integrity'];
      var list = U.$('__ars_cl'), i = 0;
      var tick = function () {
        if (!list || i >= checks.length) return;
        var li = U.el('li', {}, {
          display: 'flex', alignItems: 'center', gap: '9px',
          fontSize: '13px', color: C.mutedLt, animation: '_in .3s ease both'
        });
        li.innerHTML = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="7.5" cy="7.5" r="6.5" stroke="'+C.accent+'" stroke-width="1.1"/><path d="M4.5 7.5l2.5 2.5L10.5 5.5" stroke="'+C.accent+'" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>'+checks[i]+'</span>';
        list.appendChild(li);
        i++;
        if (i < checks.length) setTimeout(tick, U.rand(250, 420));
        else setTimeout(GATE.showMath, 500);
      };
      setTimeout(tick, 320);
    },

    /* ── Step 1: Math CAPTCHA ── */
    showMath: function () {
      GATE.step = 1;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.head(1, 'Solve the equation'));

      var widget = MATH.build();
      el.appendChild(widget);

      /* Verify button */
      var btn = U.el('button', { html: 'Verify &rarr;', 'aria-label': 'Submit captcha answer' }, {
        width: '100%', padding: '13px', marginTop: '14px',
        borderRadius: '10px', border: 'none',
        background: 'linear-gradient(135deg,'+C.accent+','+C.aLt+')',
        color: '#fff', fontSize: '15px', fontWeight: '700',
        cursor: 'pointer', letterSpacing: '.02em',
        boxShadow: '0 4px 20px '+C.glow
      });

      btn.addEventListener('click', function () {
        var inp = U.$('__ars_min'), err = U.$('__ars_merr');
        var val = inp ? inp.value.trim() : '';
        if (!val) { if (err) err.textContent = 'Please enter your answer.'; return; }
        if (MATH.check(val)) {
          btn.textContent = '\u2713 Correct!'; btn.style.background = C.ok; btn.disabled = true;
          setTimeout(GATE.showData, 650);
        } else {
          if (err) err.textContent = 'Wrong answer \u2014 try again' + (MATH.tries > 1 ? ' (' + MATH.tries + ' tries)' : '') + '.';
          MATH.refresh();
          if (MATH.tries >= MATH.max) { U.flag(40); GATE.showBlocked(); }
        }
      });

      /* Enter key */
      var kh = function (e) { if (e.key === 'Enter' && GATE.step === 1) { btn.click(); d.removeEventListener('keydown', kh); } };
      d.addEventListener('keydown', kh);

      el.appendChild(btn);
      el.insertAdjacentHTML('beforeend', GATE.bar(33));

      var inp = U.$('__ars_min');
      if (inp) setTimeout(function () { inp.focus(); }, 60);
    },

    /* ── Step 2: Data collection screen ── */
    showData: function () {
      GATE.step = 2;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.head(2, 'Collecting session data'));
      el.appendChild(DATA_SCREEN.build(GATE.showSlider));
      el.insertAdjacentHTML('beforeend', GATE.bar(66));
    },

    /* ── Step 3: Slider CAPTCHA ── */
    showSlider: function () {
      GATE.step = 3;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.head(3, 'Interactive gesture check'));
      el.appendChild(SLIDER.build(GATE.showSuccess));
      el.insertAdjacentHTML('beforeend', GATE.bar(100));
    },

    /* ── Success ── */
    showSuccess: function () {
      GATE.step = 4; S.cap_solved = true;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = [
        '<div style="text-align:center;padding:10px 0;">',
          '<div style="width:72px;height:72px;margin:0 auto 20px;background:rgba(16,185,129,.1);border:2px solid '+C.ok+';border-radius:50%;display:flex;align-items:center;justify-content:center;" role="img" aria-label="Success">',
            '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 16l7 8L26 8" stroke="'+C.ok+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          '</div>',
          '<h2 style="font-size:22px;font-weight:800;color:'+C.ok+';letter-spacing:-.02em;margin:0 0 7px;">Verified!</h2>',
          '<p style="font-size:13px;color:'+C.muted+';line-height:1.65;margin:0;">All checks passed. Loading your page\u2026</p>',
          '<div style="margin-top:20px;background:'+C.border+';border-radius:4px;height:3px;overflow:hidden;" role="progressbar" aria-label="Loading page" aria-valuenow="0" aria-valuemax="100">',
            '<div id="__ars_prog" style="height:3px;width:0%;background:linear-gradient(90deg,'+C.accent+','+C.ok+');border-radius:4px;transition:width 1.4s cubic-bezier(.4,0,.2,1);"></div>',
          '</div>',
        '</div>'
      ].join('');

      setTimeout(function () { var b = U.$('__ars_prog'); if (b) b.style.width = '100%'; }, 60);
      setTimeout(function () {
        SERVER.send(function () { CONTENT.reveal(); GATE.dismiss(); });
      }, 1500);
    },

    /* ── Blocked ── */
    showBlocked: function () {
      S.is_bot = true;
      GATE.set([
        '<div style="text-align:center;padding:10px 0;">',
          '<div style="width:72px;height:72px;margin:0 auto 20px;background:rgba(239,68,68,.1);border:2px solid '+C.err+';border-radius:50%;display:flex;align-items:center;justify-content:center;" role="img" aria-label="Access denied">',
            '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8v12M16 24v2" stroke="'+C.err+'" stroke-width="3.5" stroke-linecap="round"/></svg>',
          '</div>',
          '<h2 style="font-size:22px;font-weight:800;color:'+C.err+';letter-spacing:-.02em;margin:0 0 7px;">Access Denied</h2>',
          '<p style="font-size:13px;color:'+C.muted+';line-height:1.65;max-width:280px;margin:0 auto;">Automated activity detected. Please try again later.</p>',
          '<p style="font-size:10px;color:'+C.muted+';font-family:monospace;margin-top:14px;">'+S.id.slice(0,22)+'\u2026</p>',
        '</div>'
      ].join(''));
      SERVER.send(function () {});
    },

    dismiss: function () {
      if (!GATE.el) return;
      U.css(GATE.el, { transition: 'opacity .4s ease', opacity: '0', pointerEvents: 'none' });
      setTimeout(function () { if (GATE.el) { GATE.el.remove(); GATE.el = null; } }, 430);
    }
  };

  /* ============================================================
     SECTION 13 — SERVER SYNC (Parqra SDK — ParqraDB)
     8 JSON columns instead of 55+ flat columns.
     ============================================================ */

  var SERVER = {
    db: function () {
      if (!w.ParqraDB) {
        console.error('[ArShield] ParqraDB not found \u2014 load SDK before arshield.js');
        return null;
      }
      return new w.ParqraDB(TABLE);
    },

    /* Build the 8-column JSON payload */
    payload: function () {
      S.acc.time_ms += Date.now() - S._start;
      S._start = Date.now(); /* reset so beforeunload doesn't double-count */

      return {
        /* ── 1. Visitor identity ─────────────────── */
        visitor: {
          id:          S.id,
          visits:      S.visits,
          first_seen:  S.first_seen,
          last_seen:   new Date().toISOString()
        },

        /* ── 2. Device & browser ─────────────────── */
        device: {
          type:         S.device.type,
          os:           S.device.os,
          browser:      S.device.browser,
          ua:           S.device.ua,
          platform:     S.device.platform,
          gpu:          S.device.gpu,
          screen:       S.device.screen,
          viewport:     S.device.viewport,
          dpr:          S.device.dpr,
          color_depth:  S.device.color_depth,
          touch_pts:    S.device.touch_pts
        },

        /* ── 3. Hardware specs ───────────────────── */
        hardware: {
          cpu_cores:   S.device.cpu_cores,
          ram_gb:      S.device.ram_gb,
          plugins:     S.device.plugins,
          fonts:       S.fp.fonts
        },

        /* ── 4. Network & locale ─────────────────── */
        network: {
          type:         S.device.net_type,
          mbps:         S.device.net_mbps,
          lang:         S.device.lang,
          langs:        S.device.langs,
          tz:           S.device.tz,
          cookies:      S.device.cookies,
          dnt:          S.device.dnt
        },

        /* ── 5. Fingerprints ─────────────────────── */
        fingerprint: {
          canvas:    S.fp.canvas,
          audio:     S.fp.audio,
          webgl:     S.fp.webgl,
          combined:  S.fp.combined
        },

        /* ── 6. Security assessment ──────────────── */
        security: {
          score:          S.score,
          is_bot:         S.is_bot ? 1 : 0,
          is_headless:    S.is_headless ? 1 : 0,
          automated:      S.automated ? 1 : 0,
          honeypot:       S.honeypot ? 1 : 0,
          webdriver:      S.webdriver,
          cap_solved:     S.cap_solved ? 1 : 0,
          cap_ms:         S.cap_ms,
          timing_bad:     S.timing_bad,
          mouse_straight: S.mouse_straight,
          devtools_opens: S.devtools_now
        },

        /* ── 7. Cumulative behaviour counts ──────── */
        behaviour: {
          time_ms:    S.acc.time_ms,
          mouse:      S.acc.mouse,
          touch:      S.acc.touch,
          keys:       S.acc.keys,
          scroll:     S.acc.scroll,
          clicks:     S.acc.clicks,
          cap_tries:  S.acc.cap_tries,
          cap_passes: S.acc.cap_passes,
          bot_flags:  S.acc.bot_flags,
          human_sigs: S.acc.human_sigs,
          devtools:   S.acc.devtools,
          ctx_menus:  S.acc.ctx_menus,
          tab_hides:  S.acc.tab_hides
        },

        /* ── 8. Page speed ───────────────────────── */
        speed: {
          dns:   S.perf.dns,
          tcp:   S.perf.tcp,
          ttfb:  S.perf.ttfb,
          dom_i: S.perf.dom_i,
          dom:   S.perf.dom,
          load:  S.perf.load,
          url:   w.location.href.slice(0, 400),
          ref:   d.referrer.slice(0, 200)
        }
      };
    },

    /* Persist only the fields needed for next-visit accumulation */
    persist: function () {
      SESSION.save({
        id:         S.id,
        visits:     S.visits,
        first_seen: S.first_seen,
        row_id:     S.row_id,
        acc:        S.acc
      });
    },

    send: function (done) {
      var data = SERVER.payload();
      SERVER.persist();

      var db = SERVER.db();
      if (!db) { if (done) done(); return; }

      var fin = function (res) {
        if (res && res.error) console.warn('[ArShield] DB error:', res.error);
        if (done) done();
      };

      if (S.row_id) {
        db.patch(S.row_id, data).then(fin).catch(function () { if (done) done(); });
      } else {
        db.create(data)
          .then(function (res) {
            if (res && res.data && res.data.id) {
              S.row_id = res.data.id;
              SERVER.persist();
            }
            fin(res);
          })
          .catch(function () { if (done) done(); });
      }
    }
  };

  /* ============================================================
     SECTION 14 — BEFOREUNLOAD — persist before tab close
     ============================================================ */

  w.addEventListener('beforeunload', function () {
    S.acc.time_ms += Date.now() - S._start;
    SERVER.persist();
  });

  /* ============================================================
     SECTION 15 — BOOT
     Script must be placed after SDK tag in <head>.
     ============================================================ */

  (function boot() {
    if (!w.ParqraDB) console.error('[ArShield] SDK not found \u2014 load SDK script before arshield.js');

    PERF.init();    /* inject resource hints + perf listener */
    CONTENT.init(); /* hide page, apply base styles          */
    FP.run();       /* fingerprint + collect env data        */
    BOT.run();      /* bot checks + behaviour listeners      */

    var go = function () { CONTENT.stash(); GATE.build(); };
    if (d.body) go();
    else d.addEventListener('DOMContentLoaded', go);
  })();

})(window, document, navigator);
