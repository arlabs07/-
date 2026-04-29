/* ============================================================
   ARSHIELD.JS — Universal Web Security & Bot Detection Suite
   Standalone, no external dependencies, dark-mode overlay UI
   ============================================================ */

(function(w, d, n) {
  'use strict';

  /* ============================================================
     SECTION 1 — CORE CONFIG & STATE
     ============================================================ */
  var CFG = {
    version: '1.0.0',
    captchaTimeout: 30000,
    maxFailedChecks: 3,
    challengeDelay: 800,
    svgNonce: Math.random().toString(36).slice(2),
    sessionKey: '__ars_' + Date.now(),
    colors: {
      bg: '#0a0a0f',
      surface: '#12121a',
      border: '#1e1e2e',
      accent: '#7c3aed',
      accentGlow: 'rgba(124,58,237,0.35)',
      success: '#10b981',
      danger: '#ef4444',
      warn: '#f59e0b',
      text: '#e2e8f0',
      muted: '#64748b'
    }
  };

  var STATE = {
    startTime: Date.now(),
    checks: {},
    score: 100,
    botFlags: [],
    humanSignals: [],
    mouseEvents: 0,
    touchEvents: 0,
    keyEvents: 0,
    scrollEvents: 0,
    mousePath: [],
    mouseStraight: 0,
    focusBlurCount: 0,
    invisibleFieldFilled: false,
    captchaSolved: false,
    captchaPassed: false,
    devToolsOpen: false,
    devToolsChecks: 0,
    clipboardBlocked: false,
    contextMenuBlocked: false,
    dragDropBlocked: false,
    pageHidden: false,
    pageHiddenCount: 0,
    timingAnomalies: 0,
    canvasFingerprint: null,
    audioFingerprint: null,
    webglFingerprint: null,
    timezone: null,
    language: null,
    platform: null,
    hardwareConcurrency: null,
    deviceMemory: null,
    screenDepth: null,
    plugins: 0,
    touchPoints: 0,
    permissionsQueried: false,
    headlessBrowser: false,
    automationDetected: false,
    fontsCount: 0,
    pageSpeed: {},
    overlayOpen: false,
    challengePassed: false,
    blocked: false,
    events: []
  };

  /* ============================================================
     SECTION 2 — UTILITIES
     ============================================================ */
  var U = {
    log: function(label, value, type) {
      STATE.events.push({ t: Date.now(), label: label, value: value, type: type || 'info' });
    },
    flag: function(reason, penalty) {
      penalty = penalty || 10;
      STATE.botFlags.push({ reason: reason, time: Date.now(), penalty: penalty });
      STATE.score = Math.max(0, STATE.score - penalty);
      U.log('BOT FLAG', reason, 'warn');
    },
    signal: function(reason, boost) {
      boost = boost || 5;
      STATE.humanSignals.push({ reason: reason, time: Date.now(), boost: boost });
      STATE.score = Math.min(100, STATE.score + boost);
      U.log('HUMAN SIGNAL', reason, 'success');
    },
    qs: function(sel, ctx) { return (ctx || d).querySelector(sel); },
    qsa: function(sel, ctx) { return (ctx || d).querySelectorAll(sel); },
    el: function(tag, attrs, styles) {
      var e = d.createElement(tag);
      if (attrs) Object.keys(attrs).forEach(function(k) { if (k === 'html') e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); });
      if (styles) Object.keys(styles).forEach(function(k) { e.style[k] = styles[k]; });
      return e;
    },
    css: function(el, styles) { Object.keys(styles).forEach(function(k) { el.style[k] = styles[k]; }); },
    rand: function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    sha256Lite: function(str) {
      var hash = 0, i, chr;
      for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    },
    lerp: function(a, b, t) { return a + (b - a) * t; },
    throttle: function(fn, ms) {
      var last = 0;
      return function() {
        var now = Date.now();
        if (now - last >= ms) { last = now; fn.apply(this, arguments); }
      };
    },
    formatMs: function(ms) {
      if (ms < 1000) return ms + 'ms';
      return (ms / 1000).toFixed(2) + 's';
    },
    scoreLabel: function(s) {
      if (s >= 80) return { label: 'Human', color: CFG.colors.success };
      if (s >= 50) return { label: 'Suspicious', color: CFG.colors.warn };
      return { label: 'Bot', color: CFG.colors.danger };
    }
  };

  /* ============================================================
     SECTION 3 — PERFORMANCE OPTIMISATION INJECTOR
     ============================================================ */
  var PERF = {
    init: function() {
      PERF.injectMeta();
      PERF.lazyLoadImages();
      PERF.deferNonCritical();
      PERF.prefetch();
      PERF.measureTiming();
    },
    injectMeta: function() {
      var head = d.head;
      var metas = [
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1,viewport-fit=cover' }
      ];
      metas.forEach(function(m) {
        if (!d.querySelector('meta[name="' + (m.name || '') + '"]') && !d.querySelector('meta[http-equiv="' + (m['http-equiv'] || '') + '"]')) {
          var tag = U.el('meta', m);
          head.insertBefore(tag, head.firstChild);
        }
      });
      // Inject resource hints
      var hints = [
        { rel: 'dns-prefetch', href: w.location.origin },
        { rel: 'preconnect', href: w.location.origin }
      ];
      hints.forEach(function(h) {
        if (!d.querySelector('link[rel="' + h.rel + '"]')) {
          head.appendChild(U.el('link', h));
        }
      });
    },
    lazyLoadImages: function() {
      if ('IntersectionObserver' in w) {
        var imgs = U.qsa('img:not([loading])');
        var obs = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) {
            if (e.isIntersecting) {
              var img = e.target;
              if (img.dataset.src) img.src = img.dataset.src;
              img.setAttribute('loading', 'lazy');
              obs.unobserve(img);
            }
          });
        }, { rootMargin: '200px' });
        imgs.forEach(function(img) {
          img.setAttribute('loading', 'lazy');
          obs.observe(img);
        });
      } else {
        U.qsa('img').forEach(function(img) { img.setAttribute('loading', 'lazy'); });
      }
    },
    deferNonCritical: function() {
      U.qsa('script:not([async]):not([defer]):not([type="module"])').forEach(function(s) {
        if (!s.src.includes(w.location.hostname) || s.dataset.critical) return;
        s.setAttribute('defer', '');
      });
    },
    prefetch: function() {
      U.qsa('a[href]').forEach(function(a) {
        if (!a.href || a.href.startsWith('javascript') || a.href.startsWith('#')) return;
        if (!d.querySelector('link[rel="prefetch"][href="' + a.href + '"]')) {
          var link = U.el('link', { rel: 'prefetch', href: a.href });
          d.head.appendChild(link);
        }
      });
    },
    measureTiming: function() {
      w.addEventListener('load', function() {
        try {
          var t = performance.timing;
          STATE.pageSpeed = {
            dns: t.domainLookupEnd - t.domainLookupStart,
            tcp: t.connectEnd - t.connectStart,
            ttfb: t.responseStart - t.navigationStart,
            domLoad: t.domContentLoadedEventEnd - t.navigationStart,
            fullLoad: t.loadEventEnd - t.navigationStart,
            domInteractive: t.domInteractive - t.navigationStart
          };
          U.log('PageSpeed measured', STATE.pageSpeed, 'info');
        } catch(e) {}
      });
    }
  };

  /* ============================================================
     SECTION 4 — FINGERPRINTING ENGINE
     ============================================================ */
  var FP = {
    init: function() {
      FP.canvas();
      FP.audio();
      FP.webgl();
      FP.collectEnv();
      FP.fonts();
    },
    canvas: function() {
      try {
        var cv = d.createElement('canvas');
        cv.width = 220; cv.height = 60;
        var ctx = cv.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial"';
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(0, 0, 220, 60);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ArShield\u2122 \u03C0\u221A\u2202 ' + CFG.svgNonce, 2, 5);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillRect(100, 1, 82, 26);
        STATE.canvasFingerprint = U.sha256Lite(cv.toDataURL().slice(-80));
        U.log('Canvas FP', STATE.canvasFingerprint, 'info');
      } catch(e) { STATE.canvasFingerprint = 'unavailable'; }
    },
    audio: function() {
      try {
        var AC = w.AudioContext || w.webkitAudioContext;
        if (!AC) { STATE.audioFingerprint = 'unavailable'; return; }
        var ac = new AC();
        var osc = ac.createOscillator();
        var analyser = ac.createAnalyser();
        var gain = ac.createGain();
        gain.gain.value = 0;
        osc.connect(analyser);
        analyser.connect(gain);
        gain.connect(ac.destination);
        osc.start(0);
        var buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        STATE.audioFingerprint = U.sha256Lite(buf.slice(0, 10).join(','));
        osc.stop();
        ac.close();
        U.log('Audio FP', STATE.audioFingerprint, 'info');
      } catch(e) { STATE.audioFingerprint = 'unavailable'; }
    },
    webgl: function() {
      try {
        var cv = d.createElement('canvas');
        var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
        if (!gl) { STATE.webglFingerprint = 'unavailable'; return; }
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        var vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        STATE.webglFingerprint = U.sha256Lite(renderer + vendor);
        U.log('WebGL FP', STATE.webglFingerprint, 'info');
      } catch(e) { STATE.webglFingerprint = 'unavailable'; }
    },
    collectEnv: function() {
      STATE.timezone = Intl ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown';
      STATE.language = n.language || n.userLanguage || 'unknown';
      STATE.platform = n.platform || 'unknown';
      STATE.hardwareConcurrency = n.hardwareConcurrency || 0;
      STATE.deviceMemory = n.deviceMemory || 0;
      STATE.screenDepth = screen.colorDepth || 0;
      STATE.plugins = n.plugins ? n.plugins.length : 0;
      STATE.touchPoints = n.maxTouchPoints || 0;
      U.log('Env collected', {
        tz: STATE.timezone, lang: STATE.language,
        cpu: STATE.hardwareConcurrency, mem: STATE.deviceMemory
      }, 'info');
    },
    fonts: function() {
      var testFonts = ['Arial','Verdana','Times New Roman','Courier New','Georgia','Trebuchet MS','Comic Sans MS','Impact','Lucida Console','Palatino Linotype','Tahoma','Century Gothic'];
      var cv = d.createElement('canvas'), ctx = cv.getContext('2d');
      var baseWidth = {};
      ctx.font = '16px monospace';
      baseWidth.monospace = ctx.measureText('mmmmmmmmmmm').width;
      var count = 0;
      testFonts.forEach(function(f) {
        ctx.font = '16px "' + f + '", monospace';
        if (ctx.measureText('mmmmmmmmmmm').width !== baseWidth.monospace) count++;
      });
      STATE.fontsCount = count;
      U.log('Fonts detected', count, 'info');
    }
  };

  /* ============================================================
     SECTION 5 — BOT DETECTION ALGORITHMS
     ============================================================ */
  var BOT = {
    init: function() {
      BOT.checkNavigator();
      BOT.checkHeadless();
      BOT.checkAutomation();
      BOT.checkTimingAnomalies();
      BOT.checkWebDriver();
      BOT.listenBehavior();
      BOT.checkDocumentProps();
      BOT.checkPluginConsistency();
      BOT.devToolsLoop();
    },

    checkNavigator: function() {
      // Bot UA signals
      var ua = n.userAgent.toLowerCase();
      var botStrings = ['headless','phantomjs','selenium','webdriver','htmlunit','python-requests','curl','wget','scrapy','mechanize','httpie','java','ruby','perl','libwww','go-http','okhttp'];
      botStrings.forEach(function(s) {
        if (ua.indexOf(s) !== -1) U.flag('UA contains "' + s + '"', 20);
      });
      if (!ua) U.flag('Empty user agent', 30);
      // No languages
      if (!n.languages || n.languages.length === 0) U.flag('No navigator.languages', 15);
    },

    checkHeadless: function() {
      var flags = [
        !w.chrome && ua && ua.indexOf('chrome') !== -1,
        !w.Notification,
        n.webdriver === true,
        !w.devicePixelRatio,
        w.outerWidth === 0 && w.outerHeight === 0,
        !d.createElement('div').style.webkitAppearance === undefined
      ];
      var ua = n.userAgent;
      var headlessScore = 0;
      if (n.webdriver) { U.flag('navigator.webdriver = true', 40); headlessScore += 40; }
      if (w.outerWidth === 0 || w.outerHeight === 0) { U.flag('Zero outer dimensions', 15); headlessScore += 15; }
      if (!w.chrome && ua.toLowerCase().indexOf('chrome') !== -1) { U.flag('Chrome UA without window.chrome', 20); headlessScore += 20; }
      STATE.headlessBrowser = headlessScore > 30;
    },

    checkAutomation: function() {
      var props = ['__webdriver_evaluate','__selenium_evaluate','__webdriver_script_function','__webdriver_script_func','__webdriver_script_fn','__fxdriver_evaluate','__driver_unwrapped','__webdriver_unwrapped','__driver_evaluate','__selenium_unwrapped','__fxdriver_unwrapped','_phantom','__phantom','callPhantom','_selenium','calledSelenium','_Selenium_IDE_Recorder','__nightmare','domAutomation','domAutomationController','_AutomationChrome'];
      props.forEach(function(p) {
        try { if (w[p] !== undefined) U.flag('Automation prop: ' + p, 25); } catch(e) {}
      });
      // Permission automation check
      try {
        if (n.permissions && n.permissions.query) {
          n.permissions.query({ name: 'notifications' }).then(function(r) {
            if (r.state === 'denied' && n.webdriver) U.flag('Headless notification state', 20);
          }).catch(function() {});
        }
      } catch(e) {}
    },

    checkWebDriver: function() {
      try {
        var wd = Object.getOwnPropertyDescriptor(n.__proto__, 'webdriver');
        if (!wd) {
          // Property was deleted/patched — suspicious
          if (n.webdriver === false) {
            // Check if it was injected
            var native = n.webdriver.toString();
            if (native.indexOf('native code') === -1) U.flag('webdriver getter patched', 30);
          }
        }
      } catch(e) {}
    },

    checkTimingAnomalies: function() {
      // Bots often have suspiciously fast or synthetic timing
      var t1 = performance.now();
      var sum = 0;
      for (var i = 0; i < 1e6; i++) sum += i;
      var elapsed = performance.now() - t1;
      if (elapsed < 1) { U.flag('Suspiciously fast CPU loop', 10); STATE.timingAnomalies++; }
      // Date mismatch
      var perfBase = performance.timeOrigin || Date.now();
      var dateNow = Date.now();
      if (Math.abs(perfBase - dateNow) > 60000) { U.flag('performance.timeOrigin mismatch', 10); STATE.timingAnomalies++; }
    },

    checkDocumentProps: function() {
      if (!d.hasFocus && typeof d.hasFocus !== 'function') U.flag('document.hasFocus missing', 10);
      if (d.documentElement.getAttribute('webdriver')) U.flag('webdriver HTML attribute', 30);
      // Check prototype chain integrity
      try {
        var desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
        if (!desc) U.flag('HTMLElement.offsetHeight descriptor missing', 15);
      } catch(e) {}
    },

    checkPluginConsistency: function() {
      var ua = n.userAgent.toLowerCase();
      var isChrome = ua.indexOf('chrome') !== -1;
      // Real Chrome always has plugins; headless doesn't
      if (isChrome && n.plugins.length === 0) U.flag('Chrome with 0 plugins', 15);
      if (STATE.fontsCount < 3) U.flag('Very few fonts detected (' + STATE.fontsCount + ')', 10);
    },

    listenBehavior: function() {
      // Mouse movement analysis
      d.addEventListener('mousemove', U.throttle(function(e) {
        STATE.mouseEvents++;
        STATE.mousePath.push({ x: e.clientX, y: e.clientY, t: Date.now() });
        if (STATE.mousePath.length > 3) {
          var len = STATE.mousePath.length;
          var p1 = STATE.mousePath[len - 3], p2 = STATE.mousePath[len - 2], p3 = STATE.mousePath[len - 1];
          var angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          var angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
          if (Math.abs(angle1 - angle2) < 0.01) STATE.mouseStraight++;
        }
        if (STATE.mouseEvents === 20) {
          var straightRatio = STATE.mouseStraight / STATE.mouseEvents;
          if (straightRatio > 0.85) U.flag('Perfectly straight mouse movement', 20);
          else U.signal('Natural mouse movement', 5);
        }
      }, 50), { passive: true });

      // Touch events
      d.addEventListener('touchstart', function() {
        STATE.touchEvents++;
        if (STATE.touchEvents === 1) U.signal('Real touch detected', 8);
      }, { passive: true });

      // Keyboard natural typing
      var lastKey = 0;
      d.addEventListener('keydown', function() {
        STATE.keyEvents++;
        var now = Date.now();
        var delta = now - lastKey;
        if (lastKey && (delta < 10 || delta > 3000)) {
          // Either too fast (bot) or too slow (unusual)
          if (delta < 10) STATE.timingAnomalies++;
        } else if (lastKey && delta > 10 && delta < 500) {
          U.signal('Natural typing rhythm', 2);
        }
        lastKey = now;
      }, { passive: true });

      // Scroll behavior
      d.addEventListener('scroll', U.throttle(function() {
        STATE.scrollEvents++;
        if (STATE.scrollEvents === 3) U.signal('Human scroll detected', 4);
      }, 200), { passive: true });

      // Focus/blur tracking
      w.addEventListener('focus', function() { STATE.focusBlurCount++; });
      w.addEventListener('blur', function() {
        STATE.pageHiddenCount++;
        STATE.pageHidden = true;
      });

      // Page visibility
      d.addEventListener('visibilitychange', function() {
        if (d.hidden) { STATE.pageHiddenCount++; U.log('Page hidden', STATE.pageHiddenCount, 'warn'); }
      });
    },

    devToolsLoop: function() {
      // DevTools detection via timing + element expansion
      var THRESHOLD = 160;
      var check = function() {
        var w1 = w.outerWidth - w.innerWidth;
        var h1 = w.outerHeight - w.innerHeight;
        if (w1 > THRESHOLD || h1 > THRESHOLD) {
          if (!STATE.devToolsOpen) {
            STATE.devToolsOpen = true;
            STATE.devToolsChecks++;
            U.flag('DevTools opened', 5);
            U.log('DevTools', 'detected', 'warn');
          }
        } else {
          STATE.devToolsOpen = false;
        }
      };
      setInterval(check, 1000);

      // Console profiling trick
      var profilerActive = false;
      var profiler = /./;
      profiler.toString = function() {
        if (!profilerActive) { profilerActive = true; U.flag('Console profiler active', 10); }
        return '';
      };
      try { console.log('%c', profiler); } catch(e) {}
    }
  };

  /* ============================================================
     SECTION 6 — CONTENT PROTECTION
     ============================================================ */
  var PROTECT = {
    init: function() {
      PROTECT.blockContextMenu();
      PROTECT.blockDragDrop();
      PROTECT.blockPrintShortcut();
      PROTECT.injectHoneypot();
      PROTECT.injectCSS();
      PROTECT.blockTextSelection();
      PROTECT.blockSaveShortcuts();
      PROTECT.blockViewSource();
    },
    blockContextMenu: function() {
      d.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        STATE.contextMenuBlocked = true;
        U.log('Context menu blocked', 1, 'warn');
        return false;
      });
    },
    blockDragDrop: function() {
      d.addEventListener('dragstart', function(e) { e.preventDefault(); STATE.dragDropBlocked = true; return false; });
      d.addEventListener('drop', function(e) { e.preventDefault(); return false; });
    },
    blockPrintShortcut: function() {
      w.addEventListener('beforeprint', function(e) { e.preventDefault(); U.log('Print blocked', 1, 'warn'); });
    },
    blockSaveShortcuts: function() {
      d.addEventListener('keydown', function(e) {
        var key = e.key ? e.key.toLowerCase() : '';
        var ctrl = e.ctrlKey || e.metaKey;
        // Block Ctrl+S, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, F12
        if (ctrl && (key === 's' || key === 'u')) { e.preventDefault(); U.log('Save/Source shortcut blocked', key, 'warn'); }
        if (ctrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) { e.preventDefault(); U.flag('DevTools shortcut attempted', 5); }
        if (e.key === 'F12') { e.preventDefault(); U.flag('F12 pressed', 5); }
      });
    },
    blockViewSource: function() {
      // Inject a debug trap in console
      var warned = false;
      var trap = setInterval(function() {
        if (STATE.devToolsOpen && !warned) {
          warned = true;
          console.clear();
          console.log('%c⚠ Protected by ArShield', 'color:#7c3aed;font-size:20px;font-weight:bold;');
          console.log('%cThis site is monitored. Unauthorized scraping is tracked and logged.', 'color:#ef4444;font-size:13px;');
        }
      }, 2000);
    },
    injectHoneypot: function() {
      // Hidden field — bots fill it, humans don't see it
      var style = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;tab-index:-1;';
      var hp = U.el('input', {
        type: 'text',
        name: 'website',
        id: '__ars_hp_' + CFG.svgNonce,
        autocomplete: 'off',
        'aria-hidden': 'true',
        tabindex: '-1'
      });
      hp.setAttribute('style', style);
      hp.addEventListener('input', function() {
        if (hp.value.length > 0) {
          STATE.invisibleFieldFilled = true;
          U.flag('Honeypot field filled', 50);
        }
      });
      if (d.body) d.body.appendChild(hp);
    },
    blockTextSelection: function() {
      var style = d.createElement('style');
      style.textContent = [
        '* { -webkit-user-select:none!important; user-select:none!important; }',
        'input,textarea,select,[contenteditable] { -webkit-user-select:text!important; user-select:text!important; }'
      ].join('');
      d.head.appendChild(style);
    },
    injectCSS: function() {
      var style = d.createElement('style');
      style.textContent = [
        '#__ars_badge { position:fixed!important; bottom:20px!important; left:20px!important; z-index:2147483647!important; }',
        '#__ars_overlay { position:fixed!important; inset:0!important; z-index:2147483646!important; }',
        '#__ars_captcha { position:fixed!important; inset:0!important; z-index:2147483648!important; display:flex!important; align-items:center!important; justify-content:center!important; background:rgba(0,0,0,0.85)!important; backdrop-filter:blur(12px)!important; }'
      ].join('');
      d.head.appendChild(style);
    }
  };

  /* ============================================================
     SECTION 7 — SVG CAPTCHA ENGINE
     ============================================================ */
  var CAPTCHA = {
    answer: null,
    attempts: 0,
    maxAttempts: 3,

    generate: function() {
      var ops = [
        function() { var a = U.rand(10,99), b = U.rand(10,99); return { q: a + ' + ' + b, a: a + b }; },
        function() { var a = U.rand(20,99), b = U.rand(1,a); return { q: a + ' - ' + b, a: a - b }; },
        function() { var a = U.rand(2,12), b = U.rand(2,12); return { q: a + ' × ' + b, a: a * b }; }
      ];
      return ops[U.rand(0, ops.length - 1)]();
    },

    buildSVG: function(text) {
      var w = 340, h = 90;
      var noise = '';
      // Random noise lines
      for (var i = 0; i < 8; i++) {
        noise += '<line x1="' + U.rand(0,w) + '" y1="' + U.rand(0,h) + '" x2="' + U.rand(0,w) + '" y2="' + U.rand(0,h) + '" stroke="rgba(' + [U.rand(80,200),U.rand(80,200),U.rand(80,200),0.4].join(',') + ')" stroke-width="' + (U.rand(1,2)) + '"/>';
      }
      // Dots
      for (var j = 0; j < 20; j++) {
        noise += '<circle cx="' + U.rand(0,w) + '" cy="' + U.rand(0,h) + '" r="' + U.rand(1,3) + '" fill="rgba(255,255,255,0.15)"/>';
      }
      // Wave path
      var path = 'M0,' + U.rand(40,60);
      for (var x = 0; x <= w; x += 20) {
        path += ' Q' + (x+10) + ',' + U.rand(20,70) + ' ' + (x+20) + ',' + U.rand(30,60);
      }
      noise += '<path d="' + path + '" stroke="rgba(124,58,237,0.3)" fill="none" stroke-width="1.5"/>';

      // Render text with per-char rotation
      var chars = text.split('');
      var charSVG = '';
      var cx = 40;
      chars.forEach(function(ch, i) {
        var rot = U.rand(-15, 15);
        var cy = U.rand(38, 58);
        var size = U.rand(22, 30);
        var r = U.rand(100,255), g = U.rand(100,255), b = U.rand(100,255);
        charSVG += '<text x="' + cx + '" y="' + cy + '" transform="rotate(' + rot + ',' + cx + ',' + cy + ')" font-size="' + size + '" font-family="monospace" font-weight="bold" fill="rgb(' + r + ',' + g + ',' + b + ')">' + ch + '</text>';
        cx += U.rand(28, 38);
      });

      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" style="background:' + CFG.colors.surface + ';border-radius:8px;">' + noise + charSVG + '</svg>';
    },

    show: function(onPass, onFail) {
      var challenge = CAPTCHA.generate();
      CAPTCHA.answer = challenge.a;

      var overlay = U.el('div', { id: '__ars_captcha' });
      var card = U.el('div');
      U.css(card, {
        background: CFG.colors.surface,
        border: '1px solid ' + CFG.colors.border,
        borderRadius: '16px',
        padding: '32px',
        width: '380px',
        maxWidth: '94vw',
        boxShadow: '0 0 60px rgba(124,58,237,0.25)',
        fontFamily: 'system-ui,sans-serif',
        color: CFG.colors.text
      });

      var svgStr = CAPTCHA.buildSVG(challenge.q + ' = ?');
      card.innerHTML = [
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">',
          CAPTCHA.shieldIcon(),
          '<div>',
            '<div style="font-size:17px;font-weight:700;color:' + CFG.colors.text + ';">Security Verification</div>',
            '<div style="font-size:12px;color:' + CFG.colors.muted + ';">Prove you\'re human</div>',
          '</div>',
        '</div>',
        '<div style="margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid ' + CFG.colors.border + ';">' + svgStr + '</div>',
        '<div style="font-size:13px;color:' + CFG.colors.muted + ';margin-bottom:10px;">Solve the equation above</div>',
        '<input id="__ars_ca_in" type="number" placeholder="Enter answer…" style="width:100%;box-sizing:border-box;padding:12px 16px;border-radius:10px;border:1px solid ' + CFG.colors.border + ';background:#0d0d1a;color:' + CFG.colors.text + ';font-size:16px;outline:none;margin-bottom:12px;">',
        '<div id="__ars_ca_err" style="color:' + CFG.colors.danger + ';font-size:13px;min-height:20px;margin-bottom:10px;"></div>',
        '<button id="__ars_ca_btn" style="width:100%;padding:13px;border-radius:10px;border:none;background:' + CFG.colors.accent + ';color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s;">Verify →</button>',
        '<div style="text-align:center;margin-top:14px;font-size:11px;color:' + CFG.colors.muted + ';">Protected by ArShield — No external services</div>'
      ].join('');

      overlay.appendChild(card);
      d.body.appendChild(overlay);

      var input = U.qs('#__ars_ca_in', overlay);
      var btn = U.qs('#__ars_ca_btn', overlay);
      var errEl = U.qs('#__ars_ca_err', overlay);

      // Measure time to answer
      var challengeStart = Date.now();

      btn.addEventListener('click', function() {
        var val = parseInt(input.value, 10);
        var timeTaken = Date.now() - challengeStart;

        if (isNaN(val)) { errEl.textContent = 'Please enter a number.'; return; }
        if (timeTaken < 800) { U.flag('Captcha solved too fast (<800ms)', 30); }

        if (val === CAPTCHA.answer) {
          STATE.captchaSolved = true;
          STATE.captchaPassed = timeTaken > 600;
          U.signal('Captcha solved correctly', 15);
          card.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:48px;">✓</div><div style="color:' + CFG.colors.success + ';font-size:18px;font-weight:700;margin-top:10px;">Verified!</div></div>';
          setTimeout(function() {
            overlay.remove();
            if (onPass) onPass();
          }, 900);
        } else {
          CAPTCHA.attempts++;
          if (CAPTCHA.attempts >= CAPTCHA.maxAttempts) {
            U.flag('Captcha failed ' + CAPTCHA.maxAttempts + ' times', 40);
            if (onFail) onFail();
            overlay.remove();
          } else {
            errEl.textContent = 'Wrong answer. ' + (CAPTCHA.maxAttempts - CAPTCHA.attempts) + ' attempt(s) left.';
            input.value = '';
            // Regenerate
            var newChallenge = CAPTCHA.generate();
            CAPTCHA.answer = newChallenge.a;
            var svgContainer = card.querySelector('div:nth-child(2)');
            if (svgContainer) svgContainer.innerHTML = CAPTCHA.buildSVG(newChallenge.q + ' = ?');
          }
        }
      });

      input.addEventListener('keydown', function(e) { if (e.key === 'Enter') btn.click(); });
      setTimeout(function() { input.focus(); }, 100);
    },

    shieldIcon: function() {
      return '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2L4 7V16C4 22.627 9.373 28 16 30C22.627 28 28 22.627 28 16V7L16 2Z" fill="' + CFG.colors.accent + '" opacity="0.2" stroke="' + CFG.colors.accent + '" stroke-width="1.5"/><path d="M11 16l3.5 3.5L21 12" stroke="' + CFG.colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
  };

  /* ============================================================
     SECTION 8 — BADGE & ANALYTICS OVERLAY UI
     ============================================================ */
  var BADGE = {
    el: null,
    init: function() {
      // Wait for page load to show
      var show = function() {
        setTimeout(BADGE.render, 1200);
      };
      if (d.readyState === 'complete') show();
      else w.addEventListener('load', show);
    },

    shieldSVG: function(score) {
      var info = U.scoreLabel(score);
      var ring = score / 100;
      var circ = 2 * Math.PI * 18;
      var dash = circ * ring;
      return [
        '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">',
          '<circle cx="26" cy="26" r="24" fill="' + CFG.colors.surface + '" stroke="' + CFG.colors.border + '" stroke-width="1.5"/>',
          '<circle cx="26" cy="26" r="18" fill="none" stroke="' + CFG.colors.border + '" stroke-width="3"/>',
          '<circle cx="26" cy="26" r="18" fill="none" stroke="' + info.color + '" stroke-width="3" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * 0.25).toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 26 26)"/>',
          '<path d="M26 10L14 15V24C14 30.627 19.373 36 26 38C32.627 36 38 30.627 38 24V15L26 10Z" fill="' + CFG.colors.accent + '" opacity="0.15" stroke="' + CFG.colors.accent + '" stroke-width="1.2"/>',
          '<text x="26" y="30" text-anchor="middle" font-size="10" font-weight="800" fill="' + info.color + '" font-family="monospace">' + score + '</text>',
        '</svg>'
      ].join('');
    },

    render: function() {
      if (BADGE.el) return;
      var badge = U.el('div', { id: '__ars_badge' });
      U.css(badge, {
        width: '52px', height: '52px',
        cursor: 'pointer',
        filter: 'drop-shadow(0 4px 16px rgba(124,58,237,0.5))',
        transition: 'transform .2s, filter .2s',
        userSelect: 'none'
      });
      badge.innerHTML = BADGE.shieldSVG(STATE.score);
      badge.addEventListener('mouseover', function() {
        U.css(badge, { transform: 'scale(1.12)', filter: 'drop-shadow(0 6px 24px rgba(124,58,237,0.7))' });
      });
      badge.addEventListener('mouseout', function() {
        U.css(badge, { transform: 'scale(1)', filter: 'drop-shadow(0 4px 16px rgba(124,58,237,0.5))' });
      });
      badge.addEventListener('click', function() {
        badge.innerHTML = BADGE.shieldSVG(STATE.score); // refresh score
        OVERLAY.toggle();
      });
      d.body.appendChild(badge);
      BADGE.el = badge;

      // Animate in
      U.css(badge, { opacity: '0', transform: 'scale(0.5) translateY(20px)' });
      requestAnimationFrame(function() {
        badge.style.transition = 'opacity .4s, transform .4s';
        badge.style.opacity = '1';
        badge.style.transform = 'scale(1) translateY(0)';
      });
    },

    update: function() {
      if (BADGE.el) BADGE.el.innerHTML = BADGE.shieldSVG(STATE.score);
    }
  };

  /* ============================================================
     SECTION 9 — ANALYTICS OVERLAY
     ============================================================ */
  var OVERLAY = {
    el: null,
    visible: false,

    toggle: function() {
      if (OVERLAY.visible) OVERLAY.hide();
      else OVERLAY.show();
    },

    show: function() {
      if (OVERLAY.el) OVERLAY.el.remove();
      var info = U.scoreLabel(STATE.score);
      var elapsed = U.formatMs(Date.now() - STATE.startTime);

      var ov = U.el('div', { id: '__ars_overlay' });
      U.css(ov, {
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        padding: '0 0 90px 20px',
        fontFamily: 'system-ui,-apple-system,sans-serif'
      });

      var panel = U.el('div');
      U.css(panel, {
        background: CFG.colors.bg,
        border: '1px solid ' + CFG.colors.border,
        borderRadius: '20px',
        width: '360px',
        maxWidth: '95vw',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 0 80px rgba(124,58,237,0.3)',
        color: CFG.colors.text,
        fontSize: '13px'
      });

      // Score gauge section
      var scoreGauge = OVERLAY.buildGauge();

      // Build rows
      var rows = [
        ['Score', STATE.score + '/100', info.color],
        ['Status', info.label, info.color],
        ['Session Duration', elapsed, CFG.colors.text],
        ['Mouse Events', STATE.mouseEvents, CFG.colors.muted],
        ['Touch Events', STATE.touchEvents, CFG.colors.muted],
        ['Key Events', STATE.keyEvents, CFG.colors.muted],
        ['Scroll Events', STATE.scrollEvents, CFG.colors.muted],
        ['Captcha', STATE.captchaSolved ? (STATE.captchaPassed ? '✓ Passed' : '⚠ Fast') : '— Not shown', STATE.captchaSolved ? CFG.colors.success : CFG.colors.muted],
        ['DevTools Opens', STATE.devToolsChecks, STATE.devToolsChecks > 0 ? CFG.colors.warn : CFG.colors.muted],
        ['Headless Browser', STATE.headlessBrowser ? 'YES' : 'No', STATE.headlessBrowser ? CFG.colors.danger : CFG.colors.success],
        ['Automation Detected', STATE.automationDetected ? 'YES' : 'No', STATE.automationDetected ? CFG.colors.danger : CFG.colors.success],
        ['Honeypot Filled', STATE.invisibleFieldFilled ? 'YES' : 'No', STATE.invisibleFieldFilled ? CFG.colors.danger : CFG.colors.success],
        ['Timing Anomalies', STATE.timingAnomalies, STATE.timingAnomalies > 0 ? CFG.colors.warn : CFG.colors.muted],
        ['Bot Flags', STATE.botFlags.length, STATE.botFlags.length > 0 ? CFG.colors.danger : CFG.colors.success],
        ['Human Signals', STATE.humanSignals.length, STATE.humanSignals.length > 0 ? CFG.colors.success : CFG.colors.muted],
        ['Canvas FP', (STATE.canvasFingerprint || '—').slice(0, 10), CFG.colors.muted],
        ['Audio FP', (STATE.audioFingerprint || '—').slice(0, 10), CFG.colors.muted],
        ['WebGL FP', (STATE.webglFingerprint || '—').slice(0, 10), CFG.colors.muted],
        ['Fonts Detected', STATE.fontsCount, CFG.colors.muted],
        ['CPU Threads', STATE.hardwareConcurrency || '?', CFG.colors.muted],
        ['Device Memory', (STATE.deviceMemory || '?') + ' GB', CFG.colors.muted],
        ['Timezone', STATE.timezone || '?', CFG.colors.muted],
        ['Language', STATE.language || '?', CFG.colors.muted],
        ['Platform', (STATE.platform || '?').slice(0, 20), CFG.colors.muted],
        ['Touch Points', STATE.touchPoints, CFG.colors.muted],
        ['Color Depth', STATE.screenDepth + 'bit', CFG.colors.muted]
      ];

      // Page speed rows
      if (STATE.pageSpeed && STATE.pageSpeed.ttfb) {
        rows.push(['— Page Speed —', '', CFG.colors.accent]);
        rows.push(['TTFB', U.formatMs(STATE.pageSpeed.ttfb), CFG.colors.muted]);
        rows.push(['DOM Interactive', U.formatMs(STATE.pageSpeed.domInteractive), CFG.colors.muted]);
        rows.push(['DOM Load', U.formatMs(STATE.pageSpeed.domLoad), CFG.colors.muted]);
        rows.push(['Full Load', U.formatMs(STATE.pageSpeed.fullLoad), CFG.colors.muted]);
      }

      var rowsHTML = rows.map(function(r) {
        if (!r[0].startsWith('—')) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 18px;border-bottom:1px solid ' + CFG.colors.border + ';">' +
            '<span style="color:' + CFG.colors.muted + ';">' + r[0] + '</span>' +
            '<span style="color:' + r[2] + ';font-weight:600;font-family:monospace;">' + r[1] + '</span>' +
            '</div>';
        } else {
          return '<div style="padding:8px 18px;border-bottom:1px solid ' + CFG.colors.border + ';font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + CFG.colors.accent + ';">' + r[0].replace(/—/g,'').trim() + '</div>';
        }
      }).join('');

      // Bot flags list
      var flagsHTML = '';
      if (STATE.botFlags.length > 0) {
        flagsHTML = '<div style="padding:10px 18px 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:' + CFG.colors.danger + ';">Bot Flags</div>';
        STATE.botFlags.forEach(function(f) {
          flagsHTML += '<div style="padding:5px 18px;font-size:12px;color:' + CFG.colors.danger + ';opacity:0.8;border-bottom:1px solid ' + CFG.colors.border + ';">• ' + f.reason + ' (−' + f.penalty + ')</div>';
        });
      }

      // Recent events log
      var eventsHTML = '<div style="padding:10px 18px 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:' + CFG.colors.accent + ';">Event Log</div>';
      var recent = STATE.events.slice(-12).reverse();
      recent.forEach(function(ev) {
        var col = ev.type === 'warn' ? CFG.colors.warn : ev.type === 'success' ? CFG.colors.success : ev.type === 'error' ? CFG.colors.danger : CFG.colors.muted;
        eventsHTML += '<div style="padding:4px 18px;font-size:11px;color:' + col + ';border-bottom:1px solid ' + CFG.colors.border + ';opacity:0.85;font-family:monospace;">' + ev.label + ': ' + (typeof ev.value === 'object' ? JSON.stringify(ev.value).slice(0,40) : String(ev.value).slice(0,40)) + '</div>';
      });

      panel.innerHTML = [
        // Header
        '<div style="padding:18px 18px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ' + CFG.colors.border + ';">',
          '<div style="display:flex;align-items:center;gap:10px;">',
            CAPTCHA.shieldIcon(),
            '<div><div style="font-size:15px;font-weight:800;letter-spacing:-.01em;">ArShield</div><div style="font-size:11px;color:' + CFG.colors.muted + ';">Security Analytics</div></div>',
          '</div>',
          '<button id="__ars_ov_close" style="background:' + CFG.colors.border + ';border:none;color:' + CFG.colors.muted + ';width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>',
        '</div>',
        // Gauge
        scoreGauge,
        // Data rows
        rowsHTML,
        // Flags
        flagsHTML,
        // Events
        eventsHTML,
        // Footer
        '<div style="padding:12px 18px;font-size:11px;color:' + CFG.colors.muted + ';text-align:center;">ArShield v' + CFG.version + ' · No external services · Standalone</div>'
      ].join('');

      ov.appendChild(panel);
      d.body.appendChild(ov);
      OVERLAY.el = ov;
      OVERLAY.visible = true;

      // Close on backdrop click
      ov.addEventListener('click', function(e) { if (e.target === ov) OVERLAY.hide(); });
      var closeBtn = U.qs('#__ars_ov_close', ov);
      if (closeBtn) closeBtn.addEventListener('click', OVERLAY.hide);

      // Animate panel in
      U.css(panel, { opacity: '0', transform: 'translateY(20px) scale(0.97)' });
      requestAnimationFrame(function() {
        panel.style.transition = 'opacity .3s, transform .3s';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0) scale(1)';
      });
    },

    buildGauge: function() {
      var score = STATE.score;
      var info = U.scoreLabel(score);
      var circ = 2 * Math.PI * 40;
      var dash = circ * (score / 100);
      return [
        '<div style="padding:20px;text-align:center;border-bottom:1px solid ' + CFG.colors.border + ';">',
          '<svg width="100" height="100" viewBox="0 0 100 100">',
            '<circle cx="50" cy="50" r="40" fill="none" stroke="' + CFG.colors.border + '" stroke-width="6"/>',
            '<circle cx="50" cy="50" r="40" fill="none" stroke="' + info.color + '" stroke-width="6" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * 0.25).toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition:stroke-dasharray .8s ease"/>',
            '<text x="50" y="46" text-anchor="middle" font-size="22" font-weight="800" fill="' + info.color + '" font-family="monospace">' + score + '</text>',
            '<text x="50" y="62" text-anchor="middle" font-size="10" fill="' + CFG.colors.muted + '" font-family="monospace">/ 100</text>',
          '</svg>',
          '<div style="font-size:16px;font-weight:700;color:' + info.color + ';margin-top:4px;">' + info.label + '</div>',
          '<div style="font-size:12px;color:' + CFG.colors.muted + ';margin-top:2px;">' + STATE.botFlags.length + ' flag(s) · ' + STATE.humanSignals.length + ' signal(s)</div>',
        '</div>'
      ].join('');
    },

    hide: function() {
      if (!OVERLAY.el) return;
      var panel = OVERLAY.el.querySelector('div');
      if (panel) {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(20px) scale(0.97)';
      }
      setTimeout(function() {
        if (OVERLAY.el) { OVERLAY.el.remove(); OVERLAY.el = null; }
        OVERLAY.visible = false;
      }, 280);
    }
  };

  /* ============================================================
     SECTION 10 — SCORE UPDATER & PERIODIC REFRESH
     ============================================================ */
  var REFRESH = {
    init: function() {
      setInterval(function() {
        BADGE.update();
        if (OVERLAY.visible) {
          OVERLAY.hide();
          setTimeout(OVERLAY.show, 50);
        }
      }, 5000);
    }
  };

  /* ============================================================
     SECTION 11 — MAIN BOOT SEQUENCE
     ============================================================ */
  var BOOT = {
    run: function() {
      // Run fingerprinting & detection immediately
      FP.init();
      BOT.init();
      PERF.init();
      PROTECT.init();

      // Show CAPTCHA challenge after short delay
      setTimeout(function() {
        var score = STATE.score;
        // Show captcha if score is suspicious or always on first visit
        CAPTCHA.show(
          function onPass() {
            U.signal('Captcha passed', 10);
            BADGE.init();
            REFRESH.init();
          },
          function onFail() {
            U.flag('Captcha failed', 40);
            BADGE.init();
            REFRESH.init();
          }
        );
      }, CFG.challengeDelay);

      U.log('ArShield booted', CFG.version, 'info');
    }
  };

  // Entry point — run on DOM ready
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', BOOT.run);
  } else {
    BOOT.run();
  }

})(window, document, navigator);
