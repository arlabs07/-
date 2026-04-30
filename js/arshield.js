/* ============================================================
   ARSHIELD.JS v2.1 — Cloudflare-Style Security Gate
   Fullscreen verification -> lazy-load page content
   Server sync via Parqra SDK v3 (ParqraDB)
   Usage:
     1. <script src="https://...sdk.js?pid=ee91e5af-..."></script>
     2. <script src="arshield.js"></script>
   ============================================================ */

(function (w, d, n) {
  'use strict';

  /* ============================================================
     SECTION 1 — CONFIG & CONSTANTS
     SDK is loaded by the <script> tag in HTML — ParqraDB is
     already available on window by the time ArShield runs.
     ============================================================ */

  var TABLE  = 'arshield_visitors';
  var LS_KEY = '__ars_session';

  var C = {
    bg:         '#060608',
    surface:    '#0e0e16',
    surfaceB:   '#13131f',
    border:     '#1c1c2e',
    accent:     '#7c3aed',
    accentLt:   '#9d6ef7',
    accentGlow: 'rgba(124,58,237,0.4)',
    success:    '#10b981',
    danger:     '#ef4444',
    warn:       '#f59e0b',
    text:       '#e2e8f0',
    muted:      '#64748b',
    mutedLt:    '#94a3b8'
  };

  /* ============================================================
     SECTION 2 — PERSISTENT SESSION MANAGER
     ============================================================ */

  var SESSION = {
    load: function () {
      try { var r = localStorage.getItem(LS_KEY); if (r) return JSON.parse(r); } catch (e) {}
      return null;
    },
    save: function (data) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
    },
    newId: function () {
      var arr = new Uint8Array(18);
      try { w.crypto.getRandomValues(arr); } catch (e) { for (var i = 0; i < 18; i++) arr[i] = (Math.random() * 256) | 0; }
      return 'ars_' + Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
  };

  /* ============================================================
     SECTION 3 — RUNTIME STATE (blended with persisted data)
     ============================================================ */

  var NOW  = Date.now();
  var PREV = SESSION.load() || {};

  var S = {
    /* Identity — stable across visits */
    session_id:               PREV.session_id || SESSION.newId(),
    visit_count:              (PREV.visit_count || 0) + 1,
    first_seen:               PREV.first_seen  || new Date().toISOString(),
    last_seen:                new Date().toISOString(),

    /* Cumulative counters (added each visit) */
    total_time_ms:            PREV.total_time_ms            || 0,
    total_mouse_events:       PREV.total_mouse_events        || 0,
    total_touch_events:       PREV.total_touch_events        || 0,
    total_key_events:         PREV.total_key_events          || 0,
    total_scroll_events:      PREV.total_scroll_events       || 0,
    total_clicks:             PREV.total_clicks              || 0,
    total_captcha_attempts:   PREV.total_captcha_attempts    || 0,
    total_captcha_passes:     PREV.total_captcha_passes      || 0,
    total_bot_flags:          PREV.total_bot_flags           || 0,
    total_human_signals:      PREV.total_human_signals       || 0,
    total_devtools_opens:     PREV.total_devtools_opens      || 0,
    total_context_menus:      PREV.total_context_menus       || 0,
    total_page_hides:         PREV.total_page_hides          || 0,

    /* This-visit live counters (not persisted raw) */
    visit_start:              NOW,
    visit_mouse_events:       0,
    visit_touch_events:       0,
    visit_key_events:         0,
    visit_scroll_events:      0,
    visit_clicks:             0,

    /* Bot / human assessment */
    bot_score:                100,
    is_bot:                   false,
    is_headless:              false,
    automation_detected:      false,
    honeypot_triggered:       false,
    captcha_solved:           false,
    captcha_time_ms:          0,
    devtools_open_count:      0,
    timing_anomalies:         0,
    straight_mouse_ratio:     0,
    webdriver_prop:           n.webdriver ? 1 : 0,

    /* Fingerprints */
    canvas_fp:                null,
    audio_fp:                 null,
    webgl_fp:                 null,
    font_count:               0,
    combined_fp:              null,

    /* Device & environment */
    user_agent:               (n.userAgent || '').slice(0, 250),
    platform:                 n.platform  || '',
    language:                 n.language  || '',
    languages:                (n.languages || []).join(','),
    timezone:                 '',
    screen_w:                 screen.width  || 0,
    screen_h:                 screen.height || 0,
    screen_depth:             screen.colorDepth || 0,
    viewport_w:               w.innerWidth  || 0,
    viewport_h:               w.innerHeight || 0,
    device_pixel_ratio:       w.devicePixelRatio || 1,
    hardware_concurrency:     n.hardwareConcurrency || 0,
    device_memory_gb:         n.deviceMemory || 0,
    max_touch_points:         n.maxTouchPoints || 0,
    connection_type:          '',
    connection_downlink:      0,
    plugins_count:            n.plugins ? n.plugins.length : 0,
    cookie_enabled:           n.cookieEnabled ? 1 : 0,
    do_not_track:             n.doNotTrack || '',

    /* Page speed (filled post-load) */
    perf_dns_ms:              0,
    perf_tcp_ms:              0,
    perf_ttfb_ms:             0,
    perf_dom_interactive_ms:  0,
    perf_dom_load_ms:         0,
    perf_full_load_ms:        0,

    /* Server record ID — used for PATCH on return visits */
    server_record_id:         PREV.server_record_id || null
  };

  /* Collect extra env info */
  try {
    var conn = n.connection || n.mozConnection || n.webkitConnection;
    if (conn) { S.connection_type = conn.effectiveType || ''; S.connection_downlink = conn.downlink || 0; }
    S.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {}

  /* ============================================================
     SECTION 4 — UTILITIES
     ============================================================ */

  var U = {
    el: function (tag, props, styles) {
      var e = d.createElement(tag);
      if (props) Object.keys(props).forEach(function (k) {
        if (k === 'html') e.innerHTML = props[k];
        else if (k === 'text') e.textContent = props[k];
        else e.setAttribute(k, props[k]);
      });
      if (styles) U.css(e, styles);
      return e;
    },
    css: function (el, s) { Object.keys(s).forEach(function (k) { el.style[k] = s[k]; }); },
    rand: function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
    sha: function (str) {
      var h = 5381;
      for (var i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
      return (h >>> 0).toString(16).padStart(8, '0');
    },
    throttle: function (fn, ms) {
      var last = 0;
      return function () { var t = Date.now(); if (t - last >= ms) { last = t; fn.apply(this, arguments); } };
    },
    flag: function (penalty) {
      S.bot_score = Math.max(0, S.bot_score - (penalty || 10));
      S.total_bot_flags++;
      if (S.bot_score < 30) S.is_bot = true;
    },
    signal: function (boost) {
      S.bot_score = Math.min(100, S.bot_score + (boost || 5));
      S.total_human_signals++;
    },
    qs: function (sel, ctx) { return (ctx || d).querySelector(sel); }
  };

  /* ============================================================
     SECTION 5 — PERFORMANCE OPTIMISER
     ============================================================ */

  var PERF = {
    init: function () {
      var head = d.head || d.documentElement;
      /* Resource hints */
      ['dns-prefetch', 'preconnect'].forEach(function (rel) {
        var l = U.el('link', { rel: rel, href: w.location.origin });
        head.insertBefore(l, head.firstChild);
      });
      /* Global paint optimisation */
      var s = U.el('style');
      s.textContent = 'img{content-visibility:auto}*{box-sizing:border-box}';
      head.appendChild(s);
      /* Measure perf after full load */
      w.addEventListener('load', function () {
        try {
          var t = performance.timing;
          S.perf_dns_ms             = t.domainLookupEnd - t.domainLookupStart;
          S.perf_tcp_ms             = t.connectEnd - t.connectStart;
          S.perf_ttfb_ms            = t.responseStart - t.navigationStart;
          S.perf_dom_interactive_ms = t.domInteractive - t.navigationStart;
          S.perf_dom_load_ms        = t.domContentLoadedEventEnd - t.navigationStart;
          S.perf_full_load_ms       = t.loadEventEnd - t.navigationStart;
        } catch (e) {}
      });
    }
  };

  /* ============================================================
     SECTION 6 — FINGERPRINTING ENGINE
     ============================================================ */

  var FP = {
    run: function () {
      FP.canvas(); FP.audio(); FP.webgl(); FP.fonts();
      S.combined_fp = U.sha((S.canvas_fp || '') + (S.audio_fp || '') + (S.webgl_fp || '') + S.user_agent + S.screen_w + S.screen_h + S.timezone);
    },
    canvas: function () {
      try {
        var cv = d.createElement('canvas'); cv.width = 240; cv.height = 60;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#1a0533'; ctx.fillRect(0, 0, 240, 60);
        ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#a78bfa';
        ctx.fillText('ArShield\u2122 \u03C0 \u221A\u2202', 4, 22);
        ctx.fillStyle = 'rgba(16,185,129,0.6)'; ctx.fillRect(110, 2, 60, 20);
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(200, 30, 18, 0, Math.PI * 2); ctx.stroke();
        S.canvas_fp = U.sha(cv.toDataURL().slice(-100));
      } catch (e) { S.canvas_fp = 'err'; }
    },
    audio: function () {
      try {
        var AC = w.AudioContext || w.webkitAudioContext;
        if (!AC) { S.audio_fp = 'na'; return; }
        var ac = new AC(), osc = ac.createOscillator(), an = ac.createAnalyser(), g = ac.createGain();
        g.gain.value = 0; osc.connect(an); an.connect(g); g.connect(ac.destination); osc.start(0);
        var buf = new Float32Array(an.frequencyBinCount);
        an.getFloatFrequencyData(buf);
        S.audio_fp = U.sha(buf.slice(0, 12).join(','));
        osc.stop(); ac.close();
      } catch (e) { S.audio_fp = 'err'; }
    },
    webgl: function () {
      try {
        var cv = d.createElement('canvas');
        var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
        if (!gl) { S.webgl_fp = 'na'; return; }
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        var v = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR);
        S.webgl_fp = U.sha(r + v);
      } catch (e) { S.webgl_fp = 'err'; }
    },
    fonts: function () {
      try {
        var list = ['Arial','Verdana','Georgia','Times New Roman','Courier New','Tahoma','Impact','Comic Sans MS','Trebuchet MS','Palatino Linotype','Century Gothic','Lucida Console'];
        var cv = d.createElement('canvas'), ctx = cv.getContext('2d');
        ctx.font = '16px monospace';
        var base = ctx.measureText('mmmmmmmm').width, count = 0;
        list.forEach(function (f) { ctx.font = '16px "' + f + '",monospace'; if (ctx.measureText('mmmmmmmm').width !== base) count++; });
        S.font_count = count;
      } catch (e) {}
    }
  };

  /* ============================================================
     SECTION 7 — BOT DETECTION ALGORITHMS
     ============================================================ */

  var BOT = {
    run: function () {
      BOT.ua(); BOT.headless(); BOT.automation();
      BOT.timing(); BOT.pluginConsistency();
      BOT.devToolsLoop(); BOT.honeypot(); BOT.listenBehavior();
    },
    ua: function () {
      var ua = S.user_agent.toLowerCase();
      ['headless','phantomjs','selenium','webdriver','htmlunit','python','curl','wget','scrapy','java/','go-http','okhttp'].forEach(function (s) {
        if (ua.indexOf(s) !== -1) U.flag(20);
      });
      if (!n.languages || !n.languages.length) U.flag(15);
    },
    headless: function () {
      if (n.webdriver) { U.flag(40); S.is_headless = true; }
      if (w.outerWidth === 0 || w.outerHeight === 0) { U.flag(15); S.is_headless = true; }
      if (S.user_agent.toLowerCase().indexOf('chrome') !== -1 && !w.chrome) { U.flag(20); S.is_headless = true; }
    },
    automation: function () {
      ['__webdriver_evaluate','__selenium_evaluate','__webdriver_script_fn','__fxdriver_evaluate',
       '__driver_unwrapped','_phantom','__phantom','callPhantom','_selenium','__nightmare',
       'domAutomation','domAutomationController'].forEach(function (p) {
        try { if (w[p] !== undefined) { U.flag(25); S.automation_detected = true; } } catch (e) {}
      });
    },
    timing: function () {
      var t1 = performance.now(), sum = 0;
      for (var i = 0; i < 5e5; i++) sum += i;
      if (performance.now() - t1 < 1) { U.flag(10); S.timing_anomalies++; }
      try { if (Math.abs((performance.timeOrigin || Date.now()) - Date.now()) > 60000) { U.flag(10); S.timing_anomalies++; } } catch (e) {}
    },
    pluginConsistency: function () {
      if (S.user_agent.toLowerCase().indexOf('chrome') !== -1 && n.plugins.length === 0) U.flag(15);
      if (S.font_count < 3) U.flag(10);
    },
    devToolsLoop: function () {
      setInterval(function () {
        if (w.outerWidth - w.innerWidth > 160 || w.outerHeight - w.innerHeight > 160) {
          S.devtools_open_count++; S.total_devtools_opens++; U.flag(3);
          console.clear();
          console.log('%c\u26A0 Protected by ArShield', 'color:#7c3aed;font-size:18px;font-weight:900;');
          console.log('%cThis session is tracked and logged.', 'color:#ef4444;font-size:12px;');
        }
      }, 1500);
    },
    honeypot: function () {
      var hp = U.el('input', { type: 'text', name: 'website_url', autocomplete: 'off', tabindex: '-1', 'aria-hidden': 'true' }, {
        position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none'
      });
      hp.addEventListener('input', function () { if (hp.value.length > 0) { S.honeypot_triggered = true; U.flag(50); } });
      if (d.body) d.body.appendChild(hp);
    },
    listenBehavior: function () {
      /* Mouse path linearity */
      var path = [], straight = 0, total = 0;
      d.addEventListener('mousemove', U.throttle(function (e) {
        S.total_mouse_events++; S.visit_mouse_events++;
        path.push({ x: e.clientX, y: e.clientY });
        if (path.length > 3) {
          total++;
          var l = path.length, p1 = path[l-3], p2 = path[l-2], p3 = path[l-1];
          if (Math.abs(Math.atan2(p2.y-p1.y, p2.x-p1.x) - Math.atan2(p3.y-p2.y, p3.x-p2.x)) < 0.015) straight++;
          S.straight_mouse_ratio = total > 0 ? Math.round((straight / total) * 100) : 0;
          if (total === 30) { if (S.straight_mouse_ratio > 85) U.flag(20); else U.signal(6); }
        }
      }, 40), { passive: true });

      d.addEventListener('touchstart', function () {
        S.total_touch_events++; S.visit_touch_events++;
        if (S.visit_touch_events === 1) U.signal(8);
      }, { passive: true });

      var lastKey = 0;
      d.addEventListener('keydown', function () {
        S.total_key_events++; S.visit_key_events++;
        var now = Date.now(), delta = now - lastKey;
        if (lastKey && delta < 10) S.timing_anomalies++;
        else if (lastKey && delta > 10 && delta < 600) U.signal(2);
        lastKey = now;
      }, { passive: true });

      d.addEventListener('scroll', U.throttle(function () {
        S.total_scroll_events++; S.visit_scroll_events++;
        if (S.visit_scroll_events === 3) U.signal(4);
      }, 150), { passive: true });

      d.addEventListener('click', function () { S.total_clicks++; S.visit_clicks++; }, { passive: true });
      d.addEventListener('visibilitychange', function () { if (d.hidden) S.total_page_hides++; });

      /* Content protection */
      d.addEventListener('contextmenu', function (e) { e.preventDefault(); S.total_context_menus++; });
      d.addEventListener('dragstart',   function (e) { e.preventDefault(); });
      d.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase(), cm = e.ctrlKey || e.metaKey;
        if (cm && (k === 's' || k === 'u')) e.preventDefault();
        if (cm && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); U.flag(5); }
        if (e.key === 'F12') { e.preventDefault(); U.flag(5); }
      });
    }
  };

  /* ============================================================
     SECTION 8 — CONTENT HIDER & LAZY LOADER
     ============================================================ */

  var CONTENT = {
    init: function () {
      /* Inject gate base CSS before anything renders */
      var s = U.el('style');
      s.textContent = [
        'html,body{margin:0;padding:0;background:' + C.bg + ';}',
        '#__ars_gate{position:fixed;inset:0;z-index:2147483647;background:' + C.bg + ';}',
        '#__ars_content_wrap{display:none;}'
      ].join('');
      (d.head || d.documentElement).appendChild(s);
    },
    stash: function () {
      /* Move all original body children into a hidden wrapper */
      var wrap = U.el('div', { id: '__ars_content_wrap' });
      Array.from(d.body.children).forEach(function (c) {
        if (c.id !== '__ars_gate') wrap.appendChild(c);
      });
      d.body.appendChild(wrap);
    },
    reveal: function () {
      var wrap = d.getElementById('__ars_content_wrap');
      if (!wrap) return;
      U.css(wrap, { display: 'block', opacity: '0', transition: 'opacity .55s ease' });
      /* Lazy-load all images now that the user is verified */
      Array.from(d.querySelectorAll('img:not([loading])')).forEach(function (img) { img.setAttribute('loading', 'lazy'); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.style.opacity = '1'; }); });
    }
  };

  /* ============================================================
     SECTION 9 — SVG MATH CAPTCHA
     ============================================================ */

  var MATH_CAP = {
    answer:    null,
    attempts:  0,
    startTime: 0,
    maxAttempts: 5,

    newChallenge: function () {
      var ops = [
        function () { var a = U.rand(10,99), b = U.rand(10,99); return { q: a + ' + ' + b, a: a+b }; },
        function () { var a = U.rand(20,99), b = U.rand(1,a-1); return { q: a + ' \u2212 ' + b, a: a-b }; },
        function () { var a = U.rand(2,12),  b = U.rand(2,12);  return { q: a + ' \u00D7 ' + b, a: a*b }; }
      ];
      return ops[U.rand(0, 2)]();
    },

    buildSVG: function (text) {
      var W = 320, H = 88, svg = '';
      svg += '<rect width="' + W + '" height="' + H + '" fill="' + C.surface + '" rx="10"/>';
      for (var gx = 0; gx < W; gx += 24)
        svg += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>';
      for (var gy = 0; gy < H; gy += 24)
        svg += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>';
      for (var di = 0; di < 28; di++)
        svg += '<circle cx="' + U.rand(0,W) + '" cy="' + U.rand(0,H) + '" r="' + (Math.random()*2+0.5).toFixed(1) + '" fill="rgba(' + [U.rand(80,200),U.rand(80,200),U.rand(80,200)].join(',') + ',0.4)"/>';
      for (var nl = 0; nl < 5; nl++) {
        var p = 'M' + U.rand(0,40) + ',' + U.rand(10,H-10);
        for (var nx = 40; nx <= W; nx += 20) p += ' Q' + nx + ',' + U.rand(5,H-5) + ' ' + (nx+20) + ',' + U.rand(10,H-10);
        svg += '<path d="' + p + '" stroke="rgba(' + [U.rand(80,180),U.rand(80,180),U.rand(180,255)].join(',') + ',0.18)" fill="none" stroke-width="1.2"/>';
      }
      var chars = text.split(''), cx = 28;
      chars.forEach(function (ch) {
        var rot = U.rand(-18, 18), cy = U.rand(42, 58), sz = U.rand(22, 32);
        var r = U.rand(140,255), g = U.rand(140,255), b = U.rand(140,255);
        svg += '<text x="' + (cx+2) + '" y="' + (cy+2) + '" transform="rotate(' + rot + ',' + (cx+2) + ',' + (cy+2) + ')" font-size="' + sz + '" font-family="monospace" font-weight="900" fill="rgba(0,0,0,0.5)">' + ch + '</text>';
        svg += '<text x="' + cx + '" y="' + cy + '" transform="rotate(' + rot + ',' + cx + ',' + cy + ')" font-size="' + sz + '" font-family="monospace" font-weight="900" fill="rgb(' + r + ',' + g + ',' + b + ')">' + ch + '</text>';
        cx += U.rand(26, 36);
      });
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' + svg + '</svg>';
    },

    build: function () {
      var ch = MATH_CAP.newChallenge();
      MATH_CAP.answer = ch.a;
      MATH_CAP.startTime = Date.now();
      var wrap = U.el('div', {}, { textAlign: 'center' });
      wrap.innerHTML = [
        '<div style="font-size:12px;color:' + C.muted + ';margin-bottom:10px;letter-spacing:.06em;text-transform:uppercase;">Solve to verify</div>',
        '<div id="__ars_mc_svg" style="border-radius:10px;overflow:hidden;border:1px solid ' + C.border + ';margin-bottom:14px;display:inline-block;">' + MATH_CAP.buildSVG(ch.q + '  =  ?') + '</div>',
        '<input id="__ars_mc_in" type="number" placeholder="Enter answer" autocomplete="off" style="width:100%;padding:13px 16px;border-radius:10px;border:1px solid ' + C.border + ';background:' + C.surfaceB + ';color:' + C.text + ';font-size:17px;outline:none;box-sizing:border-box;text-align:center;letter-spacing:.1em;">',
        '<div id="__ars_mc_err" style="color:' + C.danger + ';font-size:13px;min-height:18px;margin-top:8px;"></div>'
      ].join('');
      return wrap;
    },

    refresh: function (wrap) {
      var ch = MATH_CAP.newChallenge();
      MATH_CAP.answer = ch.a;
      MATH_CAP.startTime = Date.now();
      var svgBox = d.getElementById('__ars_mc_svg');
      if (svgBox) svgBox.innerHTML = MATH_CAP.buildSVG(ch.q + '  =  ?');
      var inp = d.getElementById('__ars_mc_in');
      if (inp) inp.value = '';
    },

    check: function (val) {
      S.total_captcha_attempts++;
      var t = Date.now() - MATH_CAP.startTime;
      if (parseInt(val, 10) === MATH_CAP.answer) {
        S.captcha_time_ms = t;
        if (t < 600) U.flag(25); else { S.captcha_solved = true; S.total_captcha_passes++; U.signal(15); }
        return true;
      }
      MATH_CAP.attempts++;
      return false;
    }
  };

  /* ============================================================
     SECTION 10 — GESTURE / SLIDER CAPTCHA
     ============================================================ */

  var GESTURE_CAP = {
    build: function (onPass) {
      var wrap = U.el('div', {}, { textAlign: 'center' });
      var target = U.rand(65, 80); /* target zone % */

      wrap.innerHTML = [
        '<div style="font-size:12px;color:' + C.muted + ';margin-bottom:14px;letter-spacing:.06em;text-transform:uppercase;">Drag the slider into the zone</div>',
        '<div style="position:relative;height:54px;background:' + C.surfaceB + ';border-radius:27px;border:1px solid ' + C.border + ';overflow:hidden;touch-action:none;user-select:none;" id="__ars_sl_track">',
          '<div id="__ars_sl_fill" style="position:absolute;inset:0;right:auto;width:0%;background:linear-gradient(90deg,' + C.accent + '88,' + C.accent + ');pointer-events:none;"></div>',
          /* Target zone highlight */
          '<div id="__ars_sl_zone" style="position:absolute;top:0;bottom:0;left:' + (target-8) + '%;width:16%;background:rgba(124,58,237,0.13);border-left:1.5px dashed ' + C.accent + '55;border-right:1.5px dashed ' + C.accent + '55;pointer-events:none;"></div>',
          '<div id="__ars_sl_thumb" style="position:absolute;top:5px;bottom:5px;left:4px;width:44px;background:' + C.accent + ';border-radius:22px;box-shadow:0 0 20px ' + C.accentGlow + ';cursor:grab;display:flex;align-items:center;justify-content:center;touch-action:none;">',
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 4l5 5-5 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4l-5 5 5 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/></svg>',
          '</div>',
          '<div id="__ars_sl_lbl" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:' + C.muted + ';pointer-events:none;font-weight:600;padding-left:56px;">\u2192 Slide into the purple zone</div>',
        '</div>',
        '<div id="__ars_sl_msg" style="font-size:13px;min-height:20px;margin-top:10px;color:' + C.muted + ';"></div>'
      ].join('');

      var done = false;
      var setup = function () {
        var track = d.getElementById('__ars_sl_track');
        var thumb = d.getElementById('__ars_sl_thumb');
        var fill  = d.getElementById('__ars_sl_fill');
        var lbl   = d.getElementById('__ars_sl_lbl');
        var msg   = d.getElementById('__ars_sl_msg');
        if (!track || !thumb) return;

        var dragging = false, startX = 0, startLeft = 0;

        var getClientX = function (e) { return e.touches ? e.touches[0].clientX : e.clientX; };
        var getPct = function () {
          var maxL = track.offsetWidth - thumb.offsetWidth - 4;
          return maxL > 0 ? ((thumb.offsetLeft - 4) / maxL) * 100 : 0;
        };

        var onStart = function (e) {
          if (done) return;
          dragging = true; startX = getClientX(e); startLeft = thumb.offsetLeft;
          thumb.style.cursor = 'grabbing'; U.signal(3);
          e.preventDefault();
        };
        var onMove = function (e) {
          if (!dragging || done) return;
          var dx = getClientX(e) - startX;
          var maxL = track.offsetWidth - thumb.offsetWidth - 4;
          var newL = Math.max(4, Math.min(startLeft + dx, maxL));
          thumb.style.left = newL + 'px';
          fill.style.width  = ((newL - 4) / Math.max(1, maxL - 4) * 100) + '%';
          if (getPct() > 20) lbl.style.opacity = '0';
          msg.textContent = '';
          e.preventDefault();
        };
        var onEnd = function () {
          if (!dragging || done) return;
          dragging = false;
          thumb.style.cursor = 'grab';
          var pct = getPct();
          if (pct >= target - 8 && pct <= target + 8) {
            done = true;
            fill.style.background   = C.success;
            thumb.style.background  = C.success;
            thumb.style.boxShadow   = '0 0 20px rgba(16,185,129,0.5)';
            thumb.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4.5 4.5L16 6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            lbl.textContent = '\u2713 Verified!'; lbl.style.color = C.success; lbl.style.opacity = '1'; lbl.style.paddingLeft = '0';
            U.signal(15);
            setTimeout(function () { onPass(); }, 650);
          } else {
            msg.textContent = 'Not quite — aim for the dashed zone';
            msg.style.color = C.warn;
            setTimeout(function () {
              thumb.style.transition = 'left .3s ease';
              fill.style.transition  = 'width .3s ease';
              thumb.style.left = '4px'; fill.style.width = '0%';
              lbl.style.opacity = '1';
              setTimeout(function () { thumb.style.transition = ''; fill.style.transition = ''; }, 320);
            }, 500);
          }
        };

        thumb.addEventListener('mousedown',  onStart, { passive: false });
        thumb.addEventListener('touchstart', onStart, { passive: false });
        d.addEventListener('mousemove',  onMove, { passive: false });
        d.addEventListener('touchmove',  onMove, { passive: false });
        d.addEventListener('mouseup',  onEnd);
        d.addEventListener('touchend', onEnd);
      };

      setTimeout(setup, 80);
      return wrap;
    }
  };

  /* ============================================================
     SECTION 11 — FULLSCREEN GATE UI (Cloudflare-style)
     ============================================================ */

  var GATE = {
    el:   null,
    step: 0,

    shieldSVG: function (sz) {
      return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2L4 7V16C4 22.627 9.373 28 16 30C22.627 28 28 22.627 28 16V7L16 2Z" fill="' + C.accent + '" opacity="0.2" stroke="' + C.accent + '" stroke-width="1.5"/><path d="M11 16l3.5 3.5L21 12" stroke="' + C.accentLt + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    },

    build: function () {
      /* Keyframe animations */
      if (!d.getElementById('__ars_kf')) {
        var kf = U.el('style', { id: '__ars_kf', html: [
          '@keyframes __ars_spin{to{transform:rotate(360deg)}}',
          '@keyframes __ars_pulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}',
          '@keyframes __ars_fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
          '@keyframes __ars_shimmer{0%{background-position:-200% center}100%{background-position:200% center}}'
        ].join('') });
        d.head.appendChild(kf);
      }

      var gate = U.el('div', { id: '__ars_gate' });
      U.css(gate, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        background: C.bg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color: C.text, padding: '20px', boxSizing: 'border-box'
      });

      gate.innerHTML = [
        /* Top accent stripe */
        '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,' + C.accent + ' 0%,' + C.accentLt + ' 50%,transparent 100%);"></div>',

        /* Top-left branding */
        '<div style="position:absolute;top:20px;left:24px;display:flex;align-items:center;gap:10px;">',
          GATE.shieldSVG(28),
          '<span style="font-size:15px;font-weight:800;letter-spacing:-.01em;">ArShield</span>',
          '<span style="font-size:11px;color:' + C.muted + ';padding:2px 8px;border:1px solid ' + C.border + ';border-radius:20px;">Security Check</span>',
        '</div>',

        /* Top-right domain pill */
        '<div style="position:absolute;top:22px;right:24px;font-size:12px;color:' + C.muted + ';background:' + C.surface + ';border:1px solid ' + C.border + ';padding:4px 14px;border-radius:20px;">' + w.location.hostname + '</div>',

        /* Main card */
        '<div id="__ars_card" style="width:100%;max-width:480px;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:24px;padding:36px 36px 32px;box-shadow:0 0 100px rgba(124,58,237,0.12),0 2px 40px rgba(0,0,0,0.6);">',
          '<div id="__ars_card_inner"></div>',
        '</div>',

        /* Visit counter (if returning user) */
        (PREV.visit_count > 0 ? '<div style="margin-top:18px;font-size:12px;color:' + C.muted + ';">Visit #' + S.visit_count + ' &nbsp;&middot;&nbsp; ' + Math.round((PREV.total_time_ms || 0)/60000) + ' min total on site</div>' : ''),

        /* Footer */
        '<div style="position:absolute;bottom:18px;font-size:11px;color:' + C.muted + ';text-align:center;">',
          'Protected by <strong style="color:' + C.accentLt + ';">ArShield</strong> &nbsp;&middot;&nbsp; Standalone &middot; No external services &middot; v2.0',
        '</div>'
      ].join('');

      d.body.appendChild(gate);
      GATE.el = gate;
      GATE.showChecking();
    },

    inner: function () { return d.getElementById('__ars_card_inner'); },

    setInner: function (html) {
      var el = GATE.inner();
      if (el) el.innerHTML = html;
    },

    /* ---- Step 0: Animated checking ---- */
    showChecking: function () {
      GATE.step = 0;
      var isReturn = PREV.visit_count > 0;
      GATE.setInner([
        '<div style="text-align:center;padding:8px 0 20px;">',
          '<div style="position:relative;width:88px;height:88px;margin:0 auto 24px;">',
            '<div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid ' + C.border + ';border-top-color:' + C.accent + ';animation:__ars_spin 1s linear infinite;"></div>',
            '<div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid transparent;border-bottom-color:' + C.accentLt + '55;animation:__ars_spin 1.6s linear reverse infinite;"></div>',
            '<div style="position:absolute;inset:16px;display:flex;align-items:center;justify-content:center;">' + GATE.shieldSVG(44) + '</div>',
          '</div>',
          '<div style="font-size:24px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px;">Checking your browser</div>',
          '<div style="font-size:14px;color:' + C.muted + ';line-height:1.7;max-width:340px;margin:0 auto;">',
            isReturn
              ? 'Welcome back! Reverifying your session &mdash; this takes just a moment.'
              : 'This page is protected by ArShield. Running security checks&hellip;',
          '</div>',
          '<div style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:22px;">',
            [0,1,2].map(function(i){ return '<div style="width:8px;height:8px;border-radius:50%;background:' + C.accent + ';animation:__ars_pulse 1.4s ease ' + (i*0.18) + 's infinite;"></div>'; }).join(''),
          '</div>',
          '<div id="__ars_checklist" style="margin-top:28px;text-align:left;display:flex;flex-direction:column;gap:9px;max-width:290px;margin-left:auto;margin-right:auto;"></div>',
        '</div>'
      ].join(''));

      var items = [
        'Analysing browser fingerprint',
        'Running bot detection suite',
        'Verifying network integrity',
        'Checking WebGL & Canvas APIs',
        'Evaluating behavioural entropy'
      ];
      var list = d.getElementById('__ars_checklist'), i = 0;

      var tick = function () {
        if (!list || i >= items.length) return;
        var row = U.el('div', {}, {
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px', color: C.mutedLt,
          animation: '__ars_fadein .35s ease both'
        });
        row.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="' + C.accent + '" stroke-width="1.2"/><path d="M5 8l2.5 2.5L11 6" stroke="' + C.accent + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + items[i] + '</span>';
        list.appendChild(row);
        i++;
        if (i < items.length) setTimeout(tick, U.rand(260, 440));
        else setTimeout(GATE.showMathCaptcha, 550);
      };
      setTimeout(tick, 350);
    },

    progressBar: function (pct) {
      return '<div style="margin-top:22px;background:' + C.border + ';border-radius:4px;height:4px;overflow:hidden;"><div style="height:4px;width:' + pct + '%;border-radius:4px;background:linear-gradient(90deg,' + C.accent + ',' + C.accentLt + ');"></div></div>';
    },

    captchaHeader: function (step, label) {
      return [
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">',
          GATE.shieldSVG(28),
          '<div>',
            '<div style="font-size:21px;font-weight:800;letter-spacing:-.02em;">Verify you\'re human</div>',
            '<div style="font-size:13px;color:' + C.muted + ';margin-top:3px;">Step ' + step + ' of 2 &mdash; ' + label + '</div>',
          '</div>',
        '</div>',
        '<div style="height:1px;background:' + C.border + ';margin:18px 0 20px;"></div>'
      ].join('');
    },

    /* ---- Step 1: Math CAPTCHA ---- */
    showMathCaptcha: function () {
      GATE.step = 1;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.captchaHeader(1, 'Solve the equation'));

      var widget = MATH_CAP.build();
      el.appendChild(widget);

      var btn = U.el('button', { html: 'Verify &rarr;' }, {
        width: '100%', padding: '14px', marginTop: '16px',
        borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg,' + C.accent + ',' + C.accentLt + ')',
        color: '#fff', fontSize: '15px', fontWeight: '700',
        cursor: 'pointer', letterSpacing: '.02em',
        boxShadow: '0 4px 24px ' + C.accentGlow, transition: 'opacity .2s'
      });

      btn.addEventListener('click', function () {
        var inp = d.getElementById('__ars_mc_in');
        var err = d.getElementById('__ars_mc_err');
        if (!inp) return;
        var val = inp.value.trim();
        if (!val) { if (err) err.textContent = 'Please enter a number.'; return; }

        if (MATH_CAP.check(val)) {
          btn.innerHTML = '\u2713 Correct!'; btn.style.background = C.success; btn.disabled = true;
          setTimeout(GATE.showGestureCaptcha, 700);
        } else {
          if (err) err.textContent = 'Wrong answer. Try again.' + (MATH_CAP.attempts > 1 ? ' (' + MATH_CAP.attempts + ' attempts)' : '');
          MATH_CAP.refresh(widget);
          if (MATH_CAP.attempts >= MATH_CAP.maxAttempts) { U.flag(40); GATE.showBlocked(); }
        }
      });

      /* Enter key support */
      var kh = function (e) { if (e.key === 'Enter' && GATE.step === 1) { btn.click(); d.removeEventListener('keydown', kh); } };
      d.addEventListener('keydown', kh);

      el.appendChild(btn);
      el.insertAdjacentHTML('beforeend', GATE.progressBar(50));

      var inp = d.getElementById('__ars_mc_in');
      if (inp) setTimeout(function () { inp.focus(); }, 80);
    },

    /* ---- Step 2: Gesture CAPTCHA ---- */
    showGestureCaptcha: function () {
      GATE.step = 2;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.captchaHeader(2, 'Interactive gesture check'));
      el.appendChild(GESTURE_CAP.build(function () { GATE.showSuccess(); }));
      el.insertAdjacentHTML('beforeend', GATE.progressBar(100));
    },

    /* ---- Step 3: Success ---- */
    showSuccess: function () {
      GATE.step = 3;
      S.captcha_solved = true;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = [
        '<div style="text-align:center;padding:12px 0 6px;">',
          '<div style="width:76px;height:76px;margin:0 auto 22px;background:rgba(16,185,129,0.1);border:2px solid ' + C.success + ';border-radius:50%;display:flex;align-items:center;justify-content:center;">',
            '<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M6 18l8 8L30 8" stroke="' + C.success + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          '</div>',
          '<div style="font-size:24px;font-weight:800;color:' + C.success + ';letter-spacing:-.02em;margin-bottom:8px;">Verified!</div>',
          '<div style="font-size:14px;color:' + C.muted + ';line-height:1.7;">Your browser passed all security checks.<br>Loading your page now&hellip;</div>',
          '<div style="margin-top:22px;background:' + C.border + ';border-radius:4px;height:4px;overflow:hidden;">',
            '<div id="__ars_prog" style="height:4px;width:0%;border-radius:4px;background:linear-gradient(90deg,' + C.accent + ',' + C.success + ');transition:width 1.3s cubic-bezier(.4,0,.2,1);"></div>',
          '</div>',
        '</div>'
      ].join('');

      setTimeout(function () { var b = d.getElementById('__ars_prog'); if (b) b.style.width = '100%'; }, 60);

      /* Send to server then reveal */
      setTimeout(function () {
        SERVER.send(function () { CONTENT.reveal(); GATE.dismiss(); });
      }, 1450);
    },

    /* ---- Blocked ---- */
    showBlocked: function () {
      S.is_bot = true;
      GATE.setInner([
        '<div style="text-align:center;padding:12px 0 6px;">',
          '<div style="width:76px;height:76px;margin:0 auto 22px;background:rgba(239,68,68,0.1);border:2px solid ' + C.danger + ';border-radius:50%;display:flex;align-items:center;justify-content:center;">',
            '<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 8v12M18 24v4" stroke="' + C.danger + '" stroke-width="3.5" stroke-linecap="round"/></svg>',
          '</div>',
          '<div style="font-size:24px;font-weight:800;color:' + C.danger + ';letter-spacing:-.02em;margin-bottom:8px;">Access Denied</div>',
          '<div style="font-size:14px;color:' + C.muted + ';line-height:1.7;max-width:300px;margin:0 auto;">Automated activity was detected in this session.<br>Please try again later.</div>',
          '<div style="margin-top:18px;padding:10px 16px;background:' + C.surfaceB + ';border:1px solid ' + C.border + ';border-radius:10px;font-size:11px;color:' + C.muted + ';font-family:monospace;">Session: ' + S.session_id.slice(0, 24) + '&hellip;</div>',
        '</div>'
      ].join(''));
      SERVER.send(function () {});
    },

    dismiss: function () {
      if (!GATE.el) return;
      U.css(GATE.el, { transition: 'opacity .45s ease', opacity: '0', pointerEvents: 'none' });
      setTimeout(function () { if (GATE.el) { GATE.el.remove(); GATE.el = null; } }, 480);
    }
  };

  /* ============================================================
     SECTION 12 — SERVER SYNC via Parqra SDK (ParqraDB)
     ParqraDB is injected globally by the SDK <script> tag.
     Uses .create() on first visit, .patch() on return visits.
     All 55+ columns are sent; cumulative counters accumulate.
     ============================================================ */

  var SERVER = {

    /* Lazy singleton — waits for SDK to be ready */
    db: function () {
      if (!w.ParqraDB) {
        console.warn('[ArShield] ParqraDB not found. Did you load the SDK script tag before arshield.js?');
        return null;
      }
      return new w.ParqraDB(TABLE);
    },

    /* Build the full column payload from current state */
    payload: function () {
      /* Finalise visit duration for this session */
      var visitMs = Date.now() - S.visit_start;
      S.total_time_ms += visitMs;

      return {
        /* ── Identity ─────────────────────────────── */
        session_id:               S.session_id,
        visit_count:              S.visit_count,
        first_seen:               S.first_seen,
        last_seen:                new Date().toISOString(),

        /* ── Cumulative cross-visit counters ──────── */
        total_time_ms:            S.total_time_ms,
        total_mouse_events:       S.total_mouse_events,
        total_touch_events:       S.total_touch_events,
        total_key_events:         S.total_key_events,
        total_scroll_events:      S.total_scroll_events,
        total_clicks:             S.total_clicks,
        total_captcha_attempts:   S.total_captcha_attempts,
        total_captcha_passes:     S.total_captcha_passes,
        total_bot_flags:          S.total_bot_flags,
        total_human_signals:      S.total_human_signals,
        total_devtools_opens:     S.total_devtools_opens,
        total_context_menus:      S.total_context_menus,
        total_page_hides:         S.total_page_hides,

        /* ── Bot/human assessment (counts only) ───── */
        bot_score:                S.bot_score,
        is_bot:                   S.is_bot ? 1 : 0,
        is_headless:              S.is_headless ? 1 : 0,
        automation_detected:      S.automation_detected ? 1 : 0,
        honeypot_triggered:       S.honeypot_triggered ? 1 : 0,
        captcha_solved:           S.captcha_solved ? 1 : 0,
        captcha_time_ms:          S.captcha_time_ms,
        devtools_open_count:      S.devtools_open_count,
        timing_anomalies:         S.timing_anomalies,
        straight_mouse_ratio:     S.straight_mouse_ratio,
        webdriver_prop:           S.webdriver_prop,

        /* ── Fingerprints ─────────────────────────── */
        canvas_fp:                S.canvas_fp   || '',
        audio_fp:                 S.audio_fp    || '',
        webgl_fp:                 S.webgl_fp    || '',
        combined_fp:              S.combined_fp || '',
        font_count:               S.font_count,

        /* ── Device & environment ─────────────────── */
        user_agent:               S.user_agent,
        platform:                 S.platform,
        language:                 S.language,
        languages:                S.languages,
        timezone:                 S.timezone,
        screen_w:                 S.screen_w,
        screen_h:                 S.screen_h,
        screen_depth:             S.screen_depth,
        viewport_w:               S.viewport_w,
        viewport_h:               S.viewport_h,
        device_pixel_ratio:       S.device_pixel_ratio,
        hardware_concurrency:     S.hardware_concurrency,
        device_memory_gb:         S.device_memory_gb,
        max_touch_points:         S.max_touch_points,
        connection_type:          S.connection_type,
        connection_downlink:      S.connection_downlink,
        plugins_count:            S.plugins_count,
        cookie_enabled:           S.cookie_enabled,
        do_not_track:             S.do_not_track,

        /* ── Page speed ───────────────────────────── */
        perf_dns_ms:              S.perf_dns_ms,
        perf_tcp_ms:              S.perf_tcp_ms,
        perf_ttfb_ms:             S.perf_ttfb_ms,
        perf_dom_interactive_ms:  S.perf_dom_interactive_ms,
        perf_dom_load_ms:         S.perf_dom_load_ms,
        perf_full_load_ms:        S.perf_full_load_ms,

        /* ── Page context ─────────────────────────── */
        page_url:                 w.location.href.slice(0, 500),
        page_hostname:            w.location.hostname,
        referrer:                 d.referrer.slice(0, 300)
      };
    },

    /* Save critical fields to localStorage so next visit can accumulate */
    persist: function () {
      SESSION.save({
        session_id:             S.session_id,
        visit_count:            S.visit_count,
        first_seen:             S.first_seen,
        last_seen:              S.last_seen,
        total_time_ms:          S.total_time_ms,
        total_mouse_events:     S.total_mouse_events,
        total_touch_events:     S.total_touch_events,
        total_key_events:       S.total_key_events,
        total_scroll_events:    S.total_scroll_events,
        total_clicks:           S.total_clicks,
        total_captcha_attempts: S.total_captcha_attempts,
        total_captcha_passes:   S.total_captcha_passes,
        total_bot_flags:        S.total_bot_flags,
        total_human_signals:    S.total_human_signals,
        total_devtools_opens:   S.total_devtools_opens,
        total_context_menus:    S.total_context_menus,
        total_page_hides:       S.total_page_hides,
        server_record_id:       S.server_record_id  /* Parqra row ID for PATCH */
      });
    },

    /* Send to Parqra — create on first visit, patch on return */
    send: function (done) {
      var data = SERVER.payload();
      SERVER.persist(); /* Always save locally first */

      var db = SERVER.db();
      if (!db) {
        /* SDK not loaded — fail silently, never block the user */
        if (done) done();
        return;
      }

      var isReturn = !!S.server_record_id;

      if (isReturn) {
        /* PATCH — update existing row, accumulating all counters */
        db.patch(S.server_record_id, data)
          .then(function (res) {
            if (res && res.error) console.warn('[ArShield] patch error:', res.error);
            if (done) done();
          })
          .catch(function () { if (done) done(); });

      } else {
        /* CREATE — insert a brand-new row, get back the row ID */
        db.create(data)
          .then(function (res) {
            /* ParqraDB.create returns { data: { id: '...', ...fields } } */
            if (res && res.data && res.data.id) {
              S.server_record_id = res.data.id;
              SERVER.persist(); /* Re-save with the new row ID */
            } else if (res && res.error) {
              console.warn('[ArShield] create error:', res.error);
            }
            if (done) done();
          })
          .catch(function () { if (done) done(); });
      }
    }
  };

  /* ============================================================
     SECTION 13 — BEFOREUNLOAD — save live counters on exit
     ============================================================ */

  w.addEventListener('beforeunload', function () {
    /* Accumulate this visit's time before tab closes */
    S.total_time_ms += Date.now() - S.visit_start;
    S.visit_start = Date.now();
    SERVER.persist();
  });

  /* ============================================================
     SECTION 14 — BOOT SEQUENCE
     Required HTML order (both in <head>):
       1. <script src="...sdk.js?pid=ee91e5af-..."></script>
       2. <script src="arshield.js"></script>
     ArShield runs immediately; SDK is already parsed above it.
     ============================================================ */

  var BOOT = function () {
    /* Guard: warn loudly if SDK was not loaded before us */
    if (!w.ParqraDB) {
      console.error('[ArShield] WARNING: ParqraDB SDK not found. Load the Parqra SDK script tag BEFORE arshield.js in <head>. Visitor data will NOT be saved to the server.');
    }

    PERF.init();      /* 1. Inject resource hints immediately              */
    CONTENT.init();   /* 2. Inject CSS to hide body & style the gate       */
    FP.run();         /* 3. Run all fingerprinting (sync, fast)            */
    BOT.run();        /* 4. Start all bot detection + behaviour listeners  */

    /* 5. Stash body content and show the gate */
    var launch = function () {
      CONTENT.stash();
      GATE.build();
    };

    if (d.body) launch();
    else d.addEventListener('DOMContentLoaded', launch);
  };

  BOOT();

})(window, document, navigator);
