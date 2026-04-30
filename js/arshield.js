/* ============================================================
   ARSHIELD.JS v4.0 — Final
   Flow: SVG CAPTCHA → Checking Browser → Slider CAPTCHA → Reveal
   Server: Parqra SDK (ParqraDB) — 9 JSON columns
   HTML: SDK script tag BEFORE this script, both in <head>
   ============================================================ */

(function (w, d, n) {
  'use strict';

  /* ============================================================
     SECTION 1 — CONFIG & THEME
     ============================================================ */

  var TABLE  = 'arshield_visitors';
  var LS_KEY = '__ars_v4';

  /* Monochrome palette — base #050505 */
  var C = {
    bg:     '#050505',
    card:   '#0c0c0c',
    cardB:  '#111111',
    border: '#1a1a1a',
    borderLt:'#242424',
    accent: '#ffffff',
    aLt:    '#a0a0a0',
    glow:   'rgba(255,255,255,0.06)',
    ok:     '#22c55e',
    err:    '#ef4444',
    warn:   '#f59e0b',
    tx:     '#f0f0f0',
    muted:  '#555555',
    mutedLt:'#888888'
  };

  /* Site brand — read from page metadata */
  var BRAND = {
    title:   '',
    favicon: '',
    loaded:  false,
    read: function () {
      if (BRAND.loaded) return;
      BRAND.loaded = true;
      /* Title */
      var t = d.querySelector('title');
      if (t) BRAND.title = t.textContent.trim().slice(0, 60);
      /* Favicon — try several common selectors */
      var fav = d.querySelector('link[rel="icon"]') ||
                d.querySelector('link[rel="shortcut icon"]') ||
                d.querySelector('link[rel="apple-touch-icon"]');
      if (fav) BRAND.favicon = fav.href;
      else BRAND.favicon = w.location.origin + '/favicon.ico';
    }
  };

  /* ============================================================
     SECTION 2 — SESSION STORE
     Wipes legacy keys on boot; persists only accumulation data.
     ============================================================ */

  var SESSION = {
    load: function () {
      try {
        ['__ars_session','__ars_v2','__ars_v3'].forEach(function (k) { localStorage.removeItem(k); });
        var r = localStorage.getItem(LS_KEY);
        return r ? JSON.parse(r) : null;
      } catch (e) { return null; }
    },
    save: function (obj) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {}
    },
    newId: function () {
      var a = new Uint8Array(16);
      try { w.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 16; i++) a[i] = Math.random() * 256 | 0; }
      return 'v' + Array.from(a).map(function (b) { return b.toString(16).padStart(2,'0'); }).join('');
    }
  };

  /* ============================================================
     SECTION 3 — RUNTIME STATE
     All server data collapses into 9 JSON columns.
     ============================================================ */

  var PREV = SESSION.load() || {};
  var NOW  = Date.now();
  var pa   = PREV.acc || {};               /* previous accumulated counters */

  var S = {
    /* identity */
    id:         PREV.id || SESSION.newId(),
    visits:     (PREV.visits || 0) + 1,
    first_seen: PREV.first_seen || new Date().toISOString(),
    row_id:     PREV.row_id || null,

    /* cumulative behaviour (loaded from prev + incremented this visit) */
    acc: {
      time_ms:    pa.time_ms    || 0,
      mouse:      pa.mouse      || 0,
      touch:      pa.touch      || 0,
      keys:       pa.keys       || 0,
      scroll:     pa.scroll     || 0,
      clicks:     pa.clicks     || 0,
      cap_tries:  pa.cap_tries  || 0,
      cap_passes: pa.cap_passes || 0,
      bot_flags:  pa.bot_flags  || 0,
      human_sigs: pa.human_sigs || 0,
      devtools:   pa.devtools   || 0,
      ctx_menus:  pa.ctx_menus  || 0,
      tab_hides:  pa.tab_hides  || 0
    },

    /* visit timer */
    _t0: NOW,

    /* security scores */
    score:        100,
    is_bot:       false,
    is_headless:  false,
    automated:    false,
    honeypot:     false,
    cap_solved:   false,
    cap_ms:       0,
    devtools_now: 0,
    timing_bad:   0,
    mouse_pct:    0,
    webdriver:    n.webdriver ? 1 : 0,

    /* fingerprints */
    fp: { canvas: null, audio: null, webgl: null, hash: null, fonts: 0 },

    /* device — populated by FP.env() */
    device: {},

    /* performance timings */
    perf: { dns:0, tcp:0, ttfb:0, dom_i:0, dom:0, load:0 }
  };

  /* ============================================================
     SECTION 4 — UTILITIES
     ============================================================ */

  var U = {
    el: function (tag, a, s) {
      var e = d.createElement(tag);
      if (a) Object.keys(a).forEach(function (k) {
        if (k === 'html') e.innerHTML = a[k];
        else if (k === 'text') e.textContent = a[k];
        else e.setAttribute(k, a[k]);
      });
      if (s) U.css(e, s);
      return e;
    },
    css: function (el, s) { Object.keys(s).forEach(function (k) { el.style[k] = s[k]; }); },
    $:   function (id) { return d.getElementById(id); },
    rand: function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
    sha: function (str) {
      var h = 5381, i;
      for (i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
      return (h >>> 0).toString(16).padStart(8, '0');
    },
    throttle: function (fn, ms) {
      var last = 0;
      return function () { var t = Date.now(); if (t - last >= ms) { last = t; fn.apply(this, arguments); } };
    },
    flag: function (p) {
      p = p || 10;
      S.score = Math.max(0, S.score - p);
      S.acc.bot_flags++;
      if (S.score < 30) S.is_bot = true;
    },
    ok: function (b) {
      S.score = Math.min(100, S.score + (b || 5));
      S.acc.human_sigs++;
    },
    /* UA parsers */
    browser: function (ua) {
      if (/Edg\//.test(ua))       return 'Edge';
      if (/OPR\/|Opera/.test(ua)) return 'Opera';
      if (/Firefox\//.test(ua))   return 'Firefox';
      if (/Chrome\//.test(ua))    return 'Chrome';
      if (/Safari\//.test(ua))    return 'Safari';
      return 'Other';
    },
    browserVer: function (ua, name) {
      var patterns = { Edge: /Edg\/([\d.]+)/, Opera: /OPR\/([\d.]+)/, Firefox: /Firefox\/([\d.]+)/, Chrome: /Chrome\/([\d.]+)/, Safari: /Version\/([\d.]+)/ };
      var m = patterns[name] && ua.match(patterns[name]);
      return m ? m[1] : '';
    },
    os: function (ua) {
      if (/Windows NT 10/.test(ua))   return 'Windows 10/11';
      if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
      if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
      if (/Mac OS X ([\d_]+)/.test(ua)) return 'macOS ' + ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g,'.');
      if (/Android ([\d.]+)/.test(ua))  return 'Android ' + ua.match(/Android ([\d.]+)/)[1];
      if (/iPhone OS ([\d_]+)/.test(ua))return 'iOS ' + ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g,'.');
      if (/iPad.*OS ([\d_]+)/.test(ua)) return 'iPadOS ' + ua.match(/iPad.*OS ([\d_]+)/)[1].replace(/_/g,'.');
      if (/CrOS/.test(ua)) return 'ChromeOS';
      if (/Linux/.test(ua)) return 'Linux';
      return 'Unknown';
    },
    deviceType: function (ua) {
      if (/iPad|Tablet/i.test(ua) || (n.maxTouchPoints > 1 && w.innerWidth >= 768 && w.innerWidth <= 1366)) return 'Tablet';
      if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'Mobile';
      return 'Desktop';
    },
    /* Extract Android device model from UA */
    androidModel: function (ua) {
      var m = ua.match(/;\s*([A-Z][A-Z0-9\-_\s]+)\s*(?:Build|MIUI|HarmonyOS)/i);
      return m ? m[1].trim() : '';
    },
    /* Extract iOS device */
    iosModel: function (ua) {
      if (/iPad/.test(ua)) return 'iPad';
      if (/iPhone/.test(ua)) return 'iPhone';
      if (/iPod/.test(ua)) return 'iPod touch';
      return '';
    }
  };

  /* ============================================================
     SECTION 5 — PERFORMANCE OPTIMISER
     Runs immediately before any paint happens.
     ============================================================ */

  var PERF = {
    init: function () {
      var head = d.head || d.documentElement;
      /* Preconnect + dns-prefetch to own origin */
      ['preconnect', 'dns-prefetch'].forEach(function (rel) {
        head.insertBefore(U.el('link', { rel: rel, href: w.location.origin }), head.firstChild);
      });
      /* Base paint styles — injected before first render */
      var s = U.el('style');
      s.textContent = '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
        'img,video{content-visibility:auto}' +
        'input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}' +
        'input[type=number]{-moz-appearance:textfield}';
      head.appendChild(s);
      /* Measure after full load */
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
     SECTION 6 — FINGERPRINTING & DEVICE COLLECTION
     All collected into S.fp and S.device.
     ============================================================ */

  var FP = {
    run: function () {
      FP.canvas(); FP.audio(); FP.webgl(); FP.fonts(); FP.env();
      S.fp.hash = U.sha((S.fp.canvas||'') + (S.fp.audio||'') + (S.fp.webgl||'') + n.userAgent + screen.width + screen.height + (S.device.tz||''));
    },

    canvas: function () {
      try {
        var cv = d.createElement('canvas'); cv.width = 180; cv.height = 40;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, 180, 40);
        ctx.font = '12px Arial'; ctx.fillStyle = '#cccccc';
        ctx.fillText('ArShield \u03C0\u221A\u2202\u2211', 4, 16);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(155, 20, 13, 0, Math.PI * 2); ctx.stroke();
        S.fp.canvas = U.sha(cv.toDataURL().slice(-60));
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
        S.device._gpu = (renderer || 'unknown').slice(0, 120);
        S.device._glVendor = (vendor || '').slice(0, 80);
      } catch (e) { S.fp.webgl = 'err'; }
    },

    fonts: function () {
      try {
        var list = ['Arial','Verdana','Georgia','Times New Roman','Courier New','Helvetica','Impact','Comic Sans MS','Trebuchet MS','Century Gothic','Calibri','Cambria','Tahoma'];
        var cv = d.createElement('canvas'), ctx = cv.getContext('2d');
        ctx.font = '16px monospace';
        var base = ctx.measureText('mmmmm').width, n2 = 0;
        list.forEach(function (f) {
          ctx.font = '16px "' + f + '",monospace';
          if (ctx.measureText('mmmmm').width !== base) n2++;
        });
        S.fp.fonts = n2;
      } catch (e) {}
    },

    env: function () {
      var ua  = n.userAgent || '';
      var con = n.connection || n.mozConnection || n.webkitConnection || {};
      var tz  = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
      var locale = ''; try { locale = Intl.NumberFormat().resolvedOptions().locale; } catch (e) {}
      var bname  = U.browser(ua);
      var dtype  = U.deviceType(ua);
      var osName = U.os(ua);
      var model  = '';
      if (dtype === 'Mobile' || dtype === 'Tablet') {
        model = /Android/.test(ua) ? U.androidModel(ua) : U.iosModel(ua);
      }

      /* Battery API (async — best-effort) */
      try {
        if (n.getBattery) n.getBattery().then(function (bat) {
          S.device.battery_pct  = Math.round(bat.level * 100);
          S.device.battery_charging = bat.charging ? 1 : 0;
        });
      } catch (e) {}

      /* Screen orientation */
      var orient = '';
      try { orient = (screen.orientation && screen.orientation.type) || (w.orientation === 0 || w.orientation === 180 ? 'portrait' : 'landscape'); } catch (e) {}

      /* Media capabilities */
      var hdr = false;
      try { hdr = w.matchMedia('(dynamic-range: high)').matches; } catch (e) {}
      var prefDark = false;
      try { prefDark = w.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
      var prefReduceMotion = false;
      try { prefReduceMotion = w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

      /* Storage quotas */
      var storageOk = false;
      try { storageOk = !!w.localStorage && !!w.sessionStorage; } catch (e) {}
      var indexeddbOk = false;
      try { indexeddbOk = !!w.indexedDB; } catch (e) {}

      /* Codec support */
      var vid = d.createElement('video');
      var codecs = {
        h264:  vid.canPlayType ? vid.canPlayType('video/mp4; codecs="avc1.42E01E"') : '',
        vp9:   vid.canPlayType ? vid.canPlayType('video/webm; codecs="vp9"') : '',
        av1:   vid.canPlayType ? vid.canPlayType('video/mp4; codecs="av01.0.05M.08"') : ''
      };

      S.device = {
        /* Identity */
        type:      dtype,
        model:     model,
        os:        osName,
        browser:   bname,
        browser_v: U.browserVer(ua, bname),
        ua:        ua.slice(0, 200),
        platform:  n.platform || '',

        /* Display */
        screen:    screen.width + 'x' + screen.height,
        viewport:  w.innerWidth + 'x' + w.innerHeight,
        dpr:       w.devicePixelRatio || 1,
        color_depth: screen.colorDepth || 0,
        orientation: orient,
        hdr:       hdr ? 1 : 0,

        /* Hardware */
        cpu_cores: n.hardwareConcurrency || 0,
        ram_gb:    n.deviceMemory || 0,
        touch_pts: n.maxTouchPoints || 0,
        gpu:       S.device._gpu || 'unknown',
        gpu_vendor: S.device._glVendor || '',

        /* Network */
        net_type:  con.effectiveType || '',
        net_mbps:  con.downlink || 0,
        net_rtt:   con.rtt || 0,
        save_data: con.saveData ? 1 : 0,

        /* Locale */
        lang:      n.language || '',
        langs:     (n.languages || []).join(','),
        tz:        tz,
        locale:    locale,

        /* Privacy signals */
        cookies:   n.cookieEnabled ? 1 : 0,
        dnt:       n.doNotTrack || '',

        /* Capabilities */
        storage:   storageOk ? 1 : 0,
        idb:       indexeddbOk ? 1 : 0,
        pref_dark: prefDark ? 1 : 0,
        pref_rm:   prefReduceMotion ? 1 : 0,
        codecs:    JSON.stringify(codecs),
        plugins:   n.plugins ? n.plugins.length : 0
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
      ['headless','phantomjs','selenium','webdriver','htmlunit','python-requests',
       'curl','wget','scrapy','java/','go-http','okhttp','libwww'].forEach(function (s) {
        if (ua.indexOf(s) > -1) U.flag(20);
      });
      if (!n.languages || !n.languages.length) U.flag(15);
    },
    headless: function () {
      if (n.webdriver) { U.flag(40); S.is_headless = true; }
      if ((w.outerWidth === 0 && w.outerHeight === 0)) { U.flag(15); S.is_headless = true; }
      if (/chrome/i.test(n.userAgent) && !w.chrome) { U.flag(20); S.is_headless = true; }
    },
    automation: function () {
      ['__webdriver_evaluate','__selenium_evaluate','__webdriver_script_fn',
       '_phantom','__phantom','callPhantom','_selenium','__nightmare',
       'domAutomation','domAutomationController'].forEach(function (p) {
        try { if (w[p] !== undefined) { U.flag(25); S.automated = true; } } catch (e) {}
      });
    },
    timing: function () {
      var t = performance.now(), s = 0;
      for (var i = 0; i < 3e5; i++) s += i;
      if (performance.now() - t < 1) { U.flag(10); S.timing_bad++; }
      try {
        if (Math.abs((performance.timeOrigin || Date.now()) - Date.now()) > 60000) { U.flag(10); S.timing_bad++; }
      } catch (e) {}
    },
    consistency: function () {
      if (/chrome/i.test(n.userAgent) && n.plugins.length === 0) U.flag(15);
      if (S.fp.fonts < 3) U.flag(10);
    },
    devToolsLoop: function () {
      setInterval(function () {
        if (w.outerWidth - w.innerWidth > 160 || w.outerHeight - w.innerHeight > 160) {
          if (!S.is_headless) { /* only flag if not already flagged */
            S.devtools_now++; S.acc.devtools++; U.flag(3);
            console.clear();
            console.log('%c\u26A0 ArShield Active', 'color:#fff;font-size:15px;font-weight:900');
            console.log('%cThis session is tracked and logged.', 'color:#ef4444;font-size:12px');
          }
        }
      }, 1500);
    },
    honeypot: function () {
      if (!d.body) return;
      var hp = U.el('input', {
        type: 'text', name: 'website_url', autocomplete: 'off', tabindex: '-1', 'aria-hidden': 'true'
      }, { position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
      hp.addEventListener('input', function () { if (hp.value) { S.honeypot = true; U.flag(50); } });
      d.body.appendChild(hp);
    },
    behavior: function () {
      var path = [], straight = 0, total = 0;

      d.addEventListener('mousemove', U.throttle(function (e) {
        S.acc.mouse++;
        path.push({ x: e.clientX, y: e.clientY });
        if (path.length > 3) {
          total++;
          var l = path.length, a = path[l-3], b = path[l-2], c = path[l-1];
          var da = Math.atan2(b.y-a.y, b.x-a.x), db = Math.atan2(c.y-b.y, c.x-b.x);
          if (Math.abs(da - db) < 0.015) straight++;
          S.mouse_pct = total ? Math.round(straight / total * 100) : 0;
          if (total === 30) { S.mouse_pct > 85 ? U.flag(20) : U.ok(6); }
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
        if (S.acc.scroll === 3) U.ok(3);
      }, 120), { passive: true });

      d.addEventListener('click', function () { S.acc.clicks++; }, { passive: true });

      d.addEventListener('visibilitychange', function () { if (d.hidden) S.acc.tab_hides++; });

      /* Content protection */
      d.addEventListener('contextmenu', function (e) { e.preventDefault(); S.acc.ctx_menus++; });
      d.addEventListener('dragstart',   function (e) { e.preventDefault(); });
      d.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase(), cm = e.ctrlKey || e.metaKey;
        if (cm && (k === 's' || k === 'u')) e.preventDefault();
        if ((cm && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || e.key === 'F12') {
          e.preventDefault(); U.flag(5);
        }
      });
    }
  };

  /* ============================================================
     SECTION 8 — CONTENT HIDER
     ============================================================ */

  var CONTENT = {
    init: function () {
      var s = U.el('style');
      s.textContent = 'html,body{margin:0;padding:0;background:#050505}' +
        '#__ars_gate{position:fixed;inset:0;z-index:2147483647;background:#050505}' +
        '#__ars_wrap{display:none}';
      (d.head || d.documentElement).appendChild(s);
    },
    stash: function () {
      var wrap = U.el('div', { id: '__ars_wrap' });
      Array.from(d.body.children).forEach(function (c) {
        if (c.id !== '__ars_gate') wrap.appendChild(c);
      });
      d.body.appendChild(wrap);
    },
    reveal: function () {
      var wrap = U.$('__ars_wrap');
      if (!wrap) return;
      /* Lazy-load all images only after verification */
      d.querySelectorAll('img:not([loading])').forEach(function (img) { img.setAttribute('loading', 'lazy'); });
      U.css(wrap, { display: 'block', opacity: '0', transition: 'opacity .45s ease' });
      requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.style.opacity = '1'; }); });
    }
  };

  /* ============================================================
     SECTION 9 — SVG MATH CAPTCHA
     ============================================================ */

  var MATH = {
    ans: null, tries: 0, max: 5, t0: 0,

    challenge: function () {
      var ops = [
        function () { var a = U.rand(12,99), b = U.rand(12,99); return { q: a + ' + ' + b, a: a + b }; },
        function () { var a = U.rand(25,99), b = U.rand(3, a-1); return { q: a + ' \u2212 ' + b, a: a - b }; },
        function () { var a = U.rand(3, 13), b = U.rand(3, 13);  return { q: a + ' \u00D7 ' + b, a: a * b }; }
      ];
      return ops[U.rand(0, 2)]();
    },

    svg: function (text) {
      var W = 300, H = 78, out = '';
      /* Background */
      out += '<rect width="' + W + '" height="' + H + '" fill="' + C.card + '" rx="8"/>';
      /* Subtle grid */
      for (var gx = 0; gx < W; gx += 18) out += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>';
      for (var gy = 0; gy < H; gy += 18) out += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>';
      /* Noise dots */
      for (var di = 0; di < 18; di++) out += '<circle cx="' + U.rand(0,W) + '" cy="' + U.rand(0,H) + '" r="' + (Math.random() * 1.8 + 0.3).toFixed(1) + '" fill="rgba(255,255,255,' + (Math.random() * 0.12 + 0.04).toFixed(2) + ')"/>';
      /* Wave lines */
      for (var wi = 0; wi < 3; wi++) {
        var p = 'M' + U.rand(0,20) + ',' + U.rand(8, H - 8);
        for (var nx = 20; nx <= W; nx += 16) p += ' Q' + nx + ',' + U.rand(4, H-4) + ' ' + (nx+16) + ',' + U.rand(8, H-8);
        out += '<path d="' + p + '" stroke="rgba(255,255,255,0.06)" fill="none" stroke-width="1"/>';
      }
      /* Distorted characters — white palette */
      var cx = 20;
      text.split('').forEach(function (ch) {
        var rot = U.rand(-15, 15), cy = U.rand(38, 52), sz = U.rand(19, 28);
        var grey = U.rand(160, 255);
        out += '<text x="' + (cx+1) + '" y="' + (cy+2) + '" transform="rotate(' + rot + ',' + (cx+1) + ',' + (cy+2) + ')" font-size="' + sz + '" font-family="monospace" font-weight="900" fill="rgba(0,0,0,.6)">' + ch + '</text>';
        out += '<text x="' + cx + '" y="' + cy + '" transform="rotate(' + rot + ',' + cx + ',' + cy + ')" font-size="' + sz + '" font-family="monospace" font-weight="900" fill="rgb(' + grey + ',' + grey + ',' + grey + ')">' + ch + '</text>';
        cx += U.rand(22, 32);
      });
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="Captcha equation">' + out + '</svg>';
    },

    build: function () {
      var ch = MATH.challenge();
      MATH.ans = ch.a; MATH.t0 = Date.now();
      var w2 = U.el('div', {}, { width: '100%' });
      w2.innerHTML = [
        '<div id="__ars_msvg" style="display:block;border-radius:8px;overflow:hidden;border:1px solid ' + C.border + ';margin-bottom:12px;">' + MATH.svg(ch.q + '  =  ?') + '</div>',
        '<input id="__ars_min" type="number" inputmode="numeric" placeholder="Enter answer" autocomplete="off" aria-label="Captcha answer"',
        '  style="width:100%;padding:11px 14px;border-radius:8px;border:1px solid ' + C.border + ';background:' + C.cardB + ';color:' + C.tx + ';font-size:15px;outline:none;box-sizing:border-box;text-align:center;font-family:monospace;letter-spacing:.1em;transition:border-color .2s;">',
        '<div id="__ars_merr" role="alert" aria-live="polite" style="color:' + C.err + ';font-size:11px;min-height:14px;margin-top:6px;letter-spacing:.02em;"></div>'
      ].join('');
      /* Focus ring */
      w2.querySelector('#__ars_min').addEventListener('focus', function () { this.style.borderColor = C.accent; });
      w2.querySelector('#__ars_min').addEventListener('blur',  function () { this.style.borderColor = C.border; });
      return w2;
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
        if (ms < 600) U.flag(25);
        else { S.cap_solved = true; S.acc.cap_passes++; U.ok(15); }
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
      var target = U.rand(60, 78); /* randomised zone */
      var done   = false;
      var wrap   = U.el('div', {}, { width: '100%' });

      wrap.innerHTML = [
        '<p style="font-size:11px;color:' + C.muted + ';letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px;text-align:center;">Slide into the marked zone</p>',
        '<div id="__ars_trk" role="slider" aria-label="Drag to verify" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"',
        '  style="position:relative;height:48px;background:' + C.cardB + ';border-radius:24px;border:1px solid ' + C.border + ';overflow:hidden;touch-action:none;user-select:none;cursor:ew-resize;">',
          /* Fill */
          '<div id="__ars_fill" style="position:absolute;inset:0;right:auto;width:0%;background:' + C.accent + '1a;pointer-events:none;transition:none;"></div>',
          /* Target zone */
          '<div style="position:absolute;top:0;bottom:0;left:' + (target - 8) + '%;width:16%;background:rgba(255,255,255,0.04);border-left:1px dashed ' + C.borderLt + ';border-right:1px dashed ' + C.borderLt + ';pointer-events:none;" aria-hidden="true"></div>',
          /* Thumb */
          '<div id="__ars_thumb" style="position:absolute;top:4px;bottom:4px;left:3px;width:40px;background:' + C.accent + ';border-radius:20px;cursor:grab;display:flex;align-items:center;justify-content:center;transition:background .2s,box-shadow .2s;" aria-hidden="true">',
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4 3l4 4-4 4" stroke="#050505" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 3l-4 4 4 4" stroke="#050505" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/></svg>',
          '</div>',
          /* Label */
          '<div id="__ars_slbl" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:' + C.muted + ';pointer-events:none;font-weight:500;padding-left:50px;letter-spacing:.03em;">\u2192 Slide to the dashed zone</div>',
        '</div>',
        '<div id="__ars_smsg" role="alert" aria-live="polite" style="font-size:11px;min-height:16px;margin-top:8px;text-align:center;letter-spacing:.02em;"></div>'
      ].join('');

      var setup = function () {
        var trk   = U.$('__ars_trk'), thumb = U.$('__ars_thumb');
        var fill  = U.$('__ars_fill'), lbl   = U.$('__ars_slbl'), msg = U.$('__ars_smsg');
        if (!trk || !thumb) return;

        var dragging = false, sx = 0, sl = 0;
        var cx  = function (e) { return e.touches ? e.touches[0].clientX : e.clientX; };
        var pct = function () {
          var max = trk.offsetWidth - thumb.offsetWidth - 3;
          return max > 0 ? (thumb.offsetLeft - 3) / max * 100 : 0;
        };
        var reset = function () {
          setTimeout(function () {
            thumb.style.transition = 'left .28s ease';
            fill.style.transition  = 'width .28s ease';
            thumb.style.left = '3px'; fill.style.width = '0%';
            lbl.style.opacity = '1';
            trk.setAttribute('aria-valuenow', '0');
            setTimeout(function () { thumb.style.transition = ''; fill.style.transition = ''; }, 300);
          }, 480);
        };

        var onStart = function (e) {
          if (done) return;
          dragging = true; sx = cx(e); sl = thumb.offsetLeft;
          thumb.style.cursor = 'grabbing';
          thumb.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.12)';
          U.ok(3); e.preventDefault();
        };
        var onMove = function (e) {
          if (!dragging || done) return;
          var max = trk.offsetWidth - thumb.offsetWidth - 3;
          var nl  = Math.max(3, Math.min(sl + cx(e) - sx, max));
          thumb.style.left = nl + 'px';
          fill.style.width = ((nl - 3) / Math.max(1, max - 3) * 100) + '%';
          trk.setAttribute('aria-valuenow', Math.round(pct()));
          lbl.style.opacity = pct() > 15 ? '0' : '1';
          msg.textContent = '';
          e.preventDefault();
        };
        var onEnd = function () {
          if (!dragging || done) return;
          dragging = false; thumb.style.cursor = 'grab';
          thumb.style.boxShadow = '';
          var p = pct();
          trk.setAttribute('aria-valuenow', Math.round(p));

          if (p >= target - 8 && p <= target + 8) {
            done = true;
            thumb.style.background = C.ok;
            thumb.style.boxShadow  = '0 0 14px rgba(34,197,94,.4)';
            thumb.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4.5L13 4" stroke="#050505" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            fill.style.background = 'rgba(34,197,94,.15)';
            lbl.textContent = '\u2713 Verified'; lbl.style.color = C.ok; lbl.style.opacity = '1'; lbl.style.paddingLeft = '0';
            U.ok(15);
            setTimeout(onPass, 560);
          } else {
            msg.textContent = 'Aim for the dashed zone and release'; msg.style.color = C.warn;
            reset();
          }
        };

        thumb.addEventListener('mousedown',  onStart, { passive: false });
        thumb.addEventListener('touchstart', onStart, { passive: false });
        d.addEventListener('mousemove',  onMove,  { passive: false });
        d.addEventListener('touchmove',  onMove,  { passive: false });
        d.addEventListener('mouseup',  onEnd);
        d.addEventListener('touchend', onEnd);

        /* Keyboard accessibility */
        trk.addEventListener('keydown', function (e) {
          if (done) return;
          var max = trk.offsetWidth - thumb.offsetWidth - 3;
          var cur = thumb.offsetLeft, step = max / 18;
          if (e.key === 'ArrowRight') { thumb.style.left = Math.min(cur + step, max) + 'px'; fill.style.width = ((thumb.offsetLeft - 3) / Math.max(1,max-3)*100)+'%'; }
          if (e.key === 'ArrowLeft')  { thumb.style.left = Math.max(cur - step, 3)  + 'px'; fill.style.width = ((thumb.offsetLeft - 3) / Math.max(1,max-3)*100)+'%'; }
          if (e.key === 'Enter' || e.key === ' ') onEnd();
          trk.setAttribute('aria-valuenow', Math.round(pct()));
        });
      };

      setTimeout(setup, 50);
      return wrap;
    }
  };

  /* ============================================================
     SECTION 11 — FULLSCREEN GATE (3-step)
     Step 1: SVG Math CAPTCHA
     Step 2: "Checking Your Browser" animated screen
     Step 3: Slider CAPTCHA → Success → Reveal
     ============================================================ */

  var GATE = {
    el: null, step: 0,

    /* Shared SVG components */
    shieldSVG: function (sz) {
      return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
        '<path d="M16 2L4 7V16C4 22.627 9.373 28 16 30C22.627 28 28 22.627 28 16V7L16 2Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/>' +
        '<path d="M11 16l3.5 3.5L21 12" stroke="' + C.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    },

    logoHTML: function () {
      /* Favicon + site title from page metadata */
      var favicon = BRAND.favicon;
      var title   = BRAND.title;
      var img = favicon ? '<img src="' + favicon + '" width="18" height="18" alt="" style="border-radius:3px;object-fit:contain;" onerror="this.style.display=\'none\'">' : '';
      var txt = title ? '<span style="font-size:13px;font-weight:700;color:' + C.tx + ';letter-spacing:-.01em;">' + title + '</span>' : '';
      if (!img && !txt) return GATE.shieldSVG(22) + '<span style="font-size:13px;font-weight:700;color:' + C.tx + ';">ArShield</span>';
      return img + txt;
    },

    progressBar: function (pct) {
      return '<div style="margin-top:18px;background:' + C.border + ';border-radius:2px;height:2px;overflow:hidden;" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
        '<div style="height:2px;width:' + pct + '%;background:' + C.accent + ';border-radius:2px;"></div>' +
      '</div>';
    },

    stepHeader: function (step, of, label) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
        '<div style="font-size:18px;font-weight:800;letter-spacing:-.02em;color:' + C.tx + ';">' + label + '</div>' +
        '<div style="font-size:10px;color:' + C.muted + ';letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border:1px solid ' + C.border + ';border-radius:20px;">' + step + ' / ' + of + '</div>' +
      '</div>' +
      '<div style="height:1px;background:' + C.border + ';margin-bottom:20px;"></div>';
    },

    /* ── Build the gate shell ── */
    build: function () {
      BRAND.read(); /* grab favicon + title now that DOM is ready */

      /* Animations */
      if (!U.$('__ars_kf')) {
        d.head.appendChild(U.el('style', { id: '__ars_kf', html:
          '@keyframes _spin{to{transform:rotate(360deg)}}' +
          '@keyframes _pulse{0%,100%{opacity:.15;transform:scale(.65)}50%{opacity:1;transform:scale(1)}}' +
          '@keyframes _in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}' +
          '@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}'
        }));
      }

      var gate = U.el('div', {
        id: '__ars_gate',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Security verification required'
      });
      U.css(gate, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
        color: C.tx, padding: '16px', boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'
      });

      gate.innerHTML = [
        /* Top hairline */
        '<div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:1px;background:' + C.borderLt + ';"></div>',

        /* Top bar */
        '<nav style="position:absolute;top:0;left:0;right:0;height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid ' + C.border + ';" aria-label="Security gate navigation">',
          '<div style="display:flex;align-items:center;gap:8px;">' + GATE.logoHTML() + '</div>',
          '<div style="display:flex;align-items:center;gap:8px;">',
            '<div style="width:6px;height:6px;border-radius:50%;background:' + C.ok + ';box-shadow:0 0 6px ' + C.ok + '55;" aria-hidden="true"></div>',
            '<span style="font-size:11px;color:' + C.muted + ';">' + w.location.hostname + '</span>',
          '</div>',
        '</nav>',

        /* Card */
        '<main id="__ars_card" style="width:100%;max-width:440px;background:' + C.card + ';border:1px solid ' + C.border + ';border-radius:16px;padding:28px;box-shadow:0 0 0 1px rgba(255,255,255,0.03),0 24px 60px rgba(0,0,0,.8);overflow-y:auto;max-height:calc(100dvh - 110px);">',
          '<div id="__ars_inner"></div>',
        '</main>',

        /* Return visit chip */
        (PREV.visits > 0
          ? '<div style="margin-top:12px;font-size:11px;color:' + C.muted + ';text-align:center;" aria-label="Visit count">Visit #' + S.visits + ' \u00B7 ' + Math.round(((PREV.acc && PREV.acc.time_ms) || 0) / 60000) + ' min total</div>'
          : ''),

        /* Footer */
        '<footer style="position:absolute;bottom:12px;font-size:10px;color:' + C.muted + ';text-align:center;letter-spacing:.03em;">',
          'ArShield \u00B7 Standalone security \u00B7 No external services',
        '</footer>'
      ].join('');

      d.body.appendChild(gate);
      GATE.el = gate;
      GATE.showMath(); /* START with SVG captcha */
    },

    inner: function () { return U.$('__ars_inner'); },
    set:   function (html) { var el = GATE.inner(); if (el) el.innerHTML = html; },

    /* ── STEP 1: SVG Math CAPTCHA ── */
    showMath: function () {
      GATE.step = 1;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.stepHeader(1, 3, 'Verify you\'re human'));

      /* Instruction text */
      el.insertAdjacentHTML('beforeend', '<p style="font-size:12px;color:' + C.muted + ';margin:0 0 14px;letter-spacing:.02em;">Solve the equation shown in the image below.</p>');

      var widget = MATH.build();
      el.appendChild(widget);

      var btn = U.el('button', {
        html: 'Continue \u2192',
        'aria-label': 'Submit captcha answer',
        type: 'button'
      }, {
        width: '100%', padding: '12px', marginTop: '12px',
        borderRadius: '8px', border: '1px solid ' + C.borderLt,
        background: C.accent, color: C.bg,
        fontSize: '14px', fontWeight: '700', cursor: 'pointer',
        letterSpacing: '.02em', transition: 'opacity .15s',
        fontFamily: 'inherit'
      });
      btn.addEventListener('mouseenter', function () { btn.style.opacity = '.88'; });
      btn.addEventListener('mouseleave', function () { btn.style.opacity = '1'; });

      btn.addEventListener('click', function () {
        var inp = U.$('__ars_min'), err = U.$('__ars_merr');
        var val = inp ? inp.value.trim() : '';
        if (!val) { if (err) err.textContent = 'Please enter your answer.'; return; }
        if (MATH.check(val)) {
          btn.textContent = '\u2713 Correct'; btn.style.background = C.ok; btn.disabled = true;
          setTimeout(GATE.showChecking, 600);
        } else {
          if (err) err.textContent = 'Incorrect' + (MATH.tries > 1 ? ' \u2014 ' + MATH.tries + ' tries' : '') + '. Try again.';
          MATH.refresh();
          if (MATH.tries >= MATH.max) { U.flag(40); GATE.showBlocked(); }
        }
      });

      var kh = function (e) { if (e.key === 'Enter' && GATE.step === 1) { btn.click(); d.removeEventListener('keydown', kh); } };
      d.addEventListener('keydown', kh);

      el.appendChild(btn);
      el.insertAdjacentHTML('beforeend', GATE.progressBar(33));

      var inp = U.$('__ars_min');
      if (inp) setTimeout(function () { inp.focus(); }, 50);
    },

    /* ── STEP 2: Checking Your Browser ── */
    showChecking: function () {
      GATE.step = 2;
      GATE.set([
        '<div style="text-align:center;padding:4px 0 8px;">',
          /* Spinner */
          '<div style="position:relative;width:72px;height:72px;margin:0 auto 20px;" aria-busy="true" role="status" aria-label="Checking browser">',
            '<div aria-hidden="true" style="position:absolute;inset:0;border-radius:50%;border:2px solid ' + C.border + ';border-top-color:' + C.accent + ';animation:_spin .9s linear infinite;"></div>',
            '<div aria-hidden="true" style="position:absolute;inset:4px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:' + C.mutedLt + '22;animation:_spin 1.5s linear reverse infinite;"></div>',
            '<div style="position:absolute;inset:16px;display:flex;align-items:center;justify-content:center;">' + GATE.shieldSVG(34) + '</div>',
          '</div>',
          '<h1 style="font-size:20px;font-weight:800;letter-spacing:-.03em;margin:0 0 8px;color:' + C.tx + ';">Checking your browser</h1>',
          '<p style="font-size:13px;color:' + C.muted + ';margin:0;line-height:1.6;">',
            (PREV.visits > 0 ? 'Welcome back \u2014 reverifying your session.' : 'Verifying your browser security profile.'),
          '</p>',
          /* Pulsing dots */
          '<div aria-hidden="true" style="display:flex;justify-content:center;gap:5px;margin-top:18px;">',
            [0,1,2].map(function (i) {
              return '<div style="width:6px;height:6px;border-radius:50%;background:' + C.accent + ';animation:_pulse 1.4s ease ' + (i * 0.17) + 's infinite;"></div>';
            }).join(''),
          '</div>',
          /* Checklist */
          '<ul id="__ars_cl" aria-label="Security checks in progress" style="list-style:none;margin:20px auto 0;padding:0;max-width:255px;display:flex;flex-direction:column;gap:7px;text-align:left;"></ul>',
        '</div>',
        GATE.progressBar(66)
      ].join(''));

      var checks = [
        'Analysing browser fingerprint',
        'Running bot detection suite',
        'Verifying WebGL \u00B7 Canvas APIs',
        'Evaluating timing entropy',
        'Checking network signals'
      ];
      var list = U.$('__ars_cl'), idx = 0;
      var tick = function () {
        if (!list || idx >= checks.length) return;
        var li = U.el('li', {}, {
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '12px', color: C.mutedLt, animation: '_in .28s ease both',
          letterSpacing: '.01em'
        });
        li.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
            '<circle cx="7" cy="7" r="6" stroke="' + C.accent + '" stroke-width="1" opacity=".4"/>' +
            '<path d="M4 7l2.5 2.5L10 5" stroke="' + C.accent + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg><span>' + checks[idx] + '</span>';
        list.appendChild(li);
        idx++;
        if (idx < checks.length) setTimeout(tick, U.rand(230, 400));
        else setTimeout(GATE.showSlider, 480);
      };
      setTimeout(tick, 280);
    },

    /* ── STEP 3: Slider CAPTCHA ── */
    showSlider: function () {
      GATE.step = 3;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = '';
      el.insertAdjacentHTML('beforeend', GATE.stepHeader(3, 3, 'One last check'));
      el.insertAdjacentHTML('beforeend', '<p style="font-size:12px;color:' + C.muted + ';margin:0 0 16px;letter-spacing:.02em;">Drag the slider into the marked zone to confirm you\'re human.</p>');
      el.appendChild(SLIDER.build(GATE.showSuccess));
      el.insertAdjacentHTML('beforeend', GATE.progressBar(100));
    },

    /* ── Success ── */
    showSuccess: function () {
      GATE.step = 4; S.cap_solved = true;
      var el = GATE.inner(); if (!el) return;
      el.innerHTML = [
        '<div style="text-align:center;padding:8px 0 4px;">',
          '<div style="width:64px;height:64px;margin:0 auto 18px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;" role="img" aria-label="Verification successful">',
            '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 14l6.5 7L23 7" stroke="' + C.ok + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          '</div>',
          '<h2 style="font-size:20px;font-weight:800;color:' + C.ok + ';letter-spacing:-.02em;margin:0 0 6px;">Verified</h2>',
          '<p style="font-size:13px;color:' + C.muted + ';margin:0;line-height:1.6;">All checks passed. Loading your page\u2026</p>',
          '<div style="margin-top:18px;background:' + C.border + ';border-radius:2px;height:2px;overflow:hidden;" role="progressbar" aria-label="Loading" aria-valuenow="0" aria-valuemax="100">',
            '<div id="__ars_prog" style="height:2px;width:0%;background:' + C.ok + ';border-radius:2px;transition:width 1.35s cubic-bezier(.4,0,.2,1);"></div>',
          '</div>',
        '</div>'
      ].join('');

      setTimeout(function () { var b = U.$('__ars_prog'); if (b) b.style.width = '100%'; }, 40);
      setTimeout(function () { SERVER.send(function () { CONTENT.reveal(); GATE.dismiss(); }); }, 1400);
    },

    /* ── Blocked ── */
    showBlocked: function () {
      S.is_bot = true;
      GATE.set([
        '<div style="text-align:center;padding:8px 0 4px;">',
          '<div style="width:64px;height:64px;margin:0 auto 18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;" role="img" aria-label="Access denied">',
            '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 7v10M14 21v2" stroke="' + C.err + '" stroke-width="3" stroke-linecap="round"/></svg>',
          '</div>',
          '<h2 style="font-size:20px;font-weight:800;color:' + C.err + ';letter-spacing:-.02em;margin:0 0 6px;">Access Denied</h2>',
          '<p style="font-size:13px;color:' + C.muted + ';margin:0 auto;line-height:1.6;max-width:260px;">Automated activity detected. Please try again later.</p>',
          '<code style="display:block;margin-top:14px;font-size:10px;color:' + C.muted + ';letter-spacing:.04em;">' + S.id.slice(0, 22) + '\u2026</code>',
        '</div>'
      ].join(''));
      SERVER.send(function () {});
    },

    dismiss: function () {
      if (!GATE.el) return;
      U.css(GATE.el, { transition: 'opacity .38s ease', opacity: '0', pointerEvents: 'none' });
      setTimeout(function () { if (GATE.el) { GATE.el.remove(); GATE.el = null; } }, 400);
    }
  };

  /* ============================================================
     SECTION 12 — SERVER SYNC (ParqraDB — 9 JSON columns)
     ============================================================ */

  var SERVER = {
    db: function () {
      if (!w.ParqraDB) { console.error('[ArShield] ParqraDB not found \u2014 load SDK before arshield.js'); return null; }
      return new w.ParqraDB(TABLE);
    },

    payload: function () {
      /* Finalise this-visit time before sending */
      S.acc.time_ms += Date.now() - S._t0;
      S._t0 = Date.now();

      return {

        /* 1. Visitor identity */
        visitor: {
          id:           S.id,
          visits:       S.visits,
          first_seen:   S.first_seen,
          last_seen:    new Date().toISOString(),
          row_id:       S.row_id
        },

        /* 2. Device — type, model, OS, browser */
        device: {
          type:        S.device.type,
          model:       S.device.model,
          os:          S.device.os,
          browser:     S.device.browser,
          browser_v:   S.device.browser_v,
          platform:    S.device.platform,
          ua:          S.device.ua
        },

        /* 3. Display & graphics */
        display: {
          screen:      S.device.screen,
          viewport:    S.device.viewport,
          dpr:         S.device.dpr,
          color_depth: S.device.color_depth,
          orientation: S.device.orientation,
          hdr:         S.device.hdr,
          gpu:         S.device.gpu,
          gpu_vendor:  S.device.gpu_vendor
        },

        /* 4. Hardware specs */
        hardware: {
          cpu_cores:  S.device.cpu_cores,
          ram_gb:     S.device.ram_gb,
          touch_pts:  S.device.touch_pts,
          plugins:    S.device.plugins,
          fonts:      S.fp.fonts,
          battery_pct:      S.device.battery_pct || null,
          battery_charging: S.device.battery_charging != null ? S.device.battery_charging : null
        },

        /* 5. Network & locale */
        network: {
          type:      S.device.net_type,
          mbps:      S.device.net_mbps,
          rtt:       S.device.net_rtt,
          save_data: S.device.save_data,
          lang:      S.device.lang,
          langs:     S.device.langs,
          tz:        S.device.tz,
          locale:    S.device.locale,
          cookies:   S.device.cookies,
          dnt:       S.device.dnt
        },

        /* 6. Capabilities & preferences */
        capabilities: {
          storage:     S.device.storage,
          idb:         S.device.idb,
          pref_dark:   S.device.pref_dark,
          pref_rm:     S.device.pref_rm,
          codecs:      S.device.codecs
        },

        /* 7. Fingerprints */
        fingerprint: {
          canvas:   S.fp.canvas,
          audio:    S.fp.audio,
          webgl:    S.fp.webgl,
          hash:     S.fp.hash
        },

        /* 8. Security assessment */
        security: {
          score:        S.score,
          is_bot:       S.is_bot ? 1 : 0,
          is_headless:  S.is_headless ? 1 : 0,
          automated:    S.automated ? 1 : 0,
          honeypot:     S.honeypot ? 1 : 0,
          webdriver:    S.webdriver,
          cap_solved:   S.cap_solved ? 1 : 0,
          cap_ms:       S.cap_ms,
          timing_bad:   S.timing_bad,
          mouse_pct:    S.mouse_pct,
          devtools_now: S.devtools_now
        },

        /* 9. Analytics — cumulative + page context */
        analytics: {
          /* Cumulative behaviour */
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
          tab_hides:  S.acc.tab_hides,
          /* Page performance */
          perf_dns:   S.perf.dns,
          perf_tcp:   S.perf.tcp,
          perf_ttfb:  S.perf.ttfb,
          perf_dom_i: S.perf.dom_i,
          perf_dom:   S.perf.dom,
          perf_load:  S.perf.load,
          /* Page context */
          url:        w.location.href.slice(0, 380),
          hostname:   w.location.hostname,
          referrer:   d.referrer.slice(0, 180),
          title:      BRAND.title
        }
      };
    },

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
        if (res && res.error) console.warn('[ArShield]', res.error);
        if (done) done();
      };

      if (S.row_id) {
        db.patch(S.row_id, data).then(fin).catch(function () { if (done) done(); });
      } else {
        db.create(data).then(function (res) {
          if (res && res.data && res.data.id) { S.row_id = res.data.id; SERVER.persist(); }
          fin(res);
        }).catch(function () { if (done) done(); });
      }
    }
  };

  /* ============================================================
     SECTION 13 — BEFOREUNLOAD
     ============================================================ */

  w.addEventListener('beforeunload', function () {
    S.acc.time_ms += Date.now() - S._t0;
    SERVER.persist();
  });

  /* ============================================================
     SECTION 14 — BOOT
     ============================================================ */

  (function () {
    if (!w.ParqraDB) console.error('[ArShield] SDK not found. Load SDK script BEFORE arshield.js.');

    PERF.init();    /* 1. resource hints + base CSS — instant */
    CONTENT.init(); /* 2. hide body content                  */
    FP.run();       /* 3. fingerprint + device collection    */
    BOT.run();      /* 4. bot checks + behaviour listeners   */

    var go = function () { CONTENT.stash(); GATE.build(); };
    if (d.body) go();
    else d.addEventListener('DOMContentLoaded', go);
  })();

})(window, document, navigator);
