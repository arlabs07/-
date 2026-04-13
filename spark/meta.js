/**
 * MetaGrapher v1.0.0
 * ─────────────────────────────────────────────────────────────
 * A complete metadata intelligence library that:
 *   • Scans all existing metadata in a page
 *   • Detects logos from 10+ DOM strategies
 *   • Generates every social/SEO/PWA meta tag
 *   • Injects missing tags directly into <head>
 *   • Registers a dynamic Service Worker via Blob URL
 *   • Reports a full analysis with scoring + grading
 *
 * Usage:
 *   MetaGrapher.autoRun({ siteName: 'MySite', themeColor: '#0066ff' });
 *   const report = MetaGrapher.getReport();
 *
 * Data-attribute auto-run:
 *   <script src="library.js" data-auto-run data-mg-site-name="MySite"></script>
 * ─────────────────────────────────────────────────────────────
 * @license MIT
 */

;(function (global, doc) {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════
  var Utils = {

    /** Returns the page title from <title>, first <h1>, or hostname. */
    getPageTitle: function () {
      if (doc.title && doc.title.trim()) return doc.title.trim();
      var h1 = doc.querySelector('h1');
      if (h1 && h1.textContent.trim()) return h1.textContent.trim();
      return location.hostname;
    },

    /** Returns the best available page description (up to 160 chars). */
    getPageDescription: function () {
      var m = doc.querySelector('meta[name="description"]');
      if (m) return m.getAttribute('content') || '';
      var og = doc.querySelector('meta[property="og:description"]');
      if (og) return og.getAttribute('content') || '';
      var tw = doc.querySelector('meta[name="twitter:description"]');
      if (tw) return tw.getAttribute('content') || '';
      // Fall back to first substantial paragraph
      var paras = doc.querySelectorAll('p');
      for (var i = 0; i < paras.length; i++) {
        var text = paras[i].textContent.trim();
        if (text.length > 60) return text.substring(0, 160);
      }
      return '';
    },

    /** Converts a relative URL to absolute. */
    absoluteUrl: function (url) {
      if (!url || url === 'inline-svg') return url;
      if (/^https?:\/\//.test(url)) return url;
      if (/^\/\//.test(url)) return location.protocol + url;
      if (/^\//.test(url)) return location.origin + url;
      if (/^data:/.test(url)) return url;
      return location.origin + '/' + url;
    },

    /** Returns current page origin. */
    getOrigin: function () { return location.origin; },

    /** Returns canonical URL (strips query + hash if no canonical tag). */
    getCanonicalUrl: function () {
      var link = doc.querySelector('link[rel="canonical"]');
      if (link && link.href) return link.href;
      return location.href.split('?')[0].split('#')[0];
    },

    /** Returns hostname without www. */
    domainName: function () {
      return location.hostname.replace(/^www\./, '');
    },

    /** Returns the best site name from OG, Schema, or hostname. */
    getSiteName: function () {
      var og = doc.querySelector('meta[property="og:site_name"]');
      if (og) return og.getAttribute('content') || '';
      var schemas = doc.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < schemas.length; i++) {
        try {
          var d = JSON.parse(schemas[i].textContent);
          if (d.name) return d.name;
          if (d['@graph']) {
            for (var j = 0; j < d['@graph'].length; j++) {
              if (d['@graph'][j].name) return d['@graph'][j].name;
            }
          }
        } catch (e) {}
      }
      var parts = location.hostname.replace(/^www\./, '').split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    },

    /** Returns theme color from meta, CSS vars, or a deterministic fallback. */
    getThemeColor: function (config) {
      if (config && config.themeColor) return config.themeColor;
      var m = doc.querySelector('meta[name="theme-color"]');
      if (m) return m.getAttribute('content') || '';
      // Check CSS custom properties
      var vars = ['--primary', '--color-primary', '--brand-color', '--accent', '--main-color'];
      var style = getComputedStyle(doc.documentElement);
      for (var i = 0; i < vars.length; i++) {
        var val = style.getPropertyValue(vars[i]).trim();
        if (val && /^#|rgb|hsl/.test(val)) return val;
      }
      // Deterministic color from domain
      var hash = 0;
      var str = location.hostname;
      for (var k = 0; k < str.length; k++) {
        hash = str.charCodeAt(k) + ((hash << 5) - hash);
      }
      var h = Math.abs(hash) % 360;
      return Utils.hslToHex(h, 60, 40);
    },

    /** HSL to hex string. */
    hslToHex: function (h, s, l) {
      s /= 100; l /= 100;
      var a = s * Math.min(l, 1 - l);
      var f = function (n) {
        var k = (n + h / 30) % 12;
        var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return '#' + f(0) + f(8) + f(4);
    },

    /** Safely reads a meta tag content. */
    metaContent: function (selector) {
      var el = doc.querySelector(selector);
      return el ? (el.getAttribute('content') || '') : null;
    },

    /** Strips all tags and trims whitespace. */
    stripHtml: function (str) {
      return str ? str.replace(/<[^>]+>/g, '').trim() : '';
    },

    /** Truncates to a maximum character count. */
    trunc: function (str, max) {
      if (!str) return '';
      str = String(str).trim();
      return str.length > max ? str.substring(0, max - 1) + '…' : str;
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  SCANNER  –  reads every existing meta tag from the page
  // ═══════════════════════════════════════════════════════════
  var Scanner = {

    scanAll: function () {
      return {
        basic:     this.scanBasic(),
        openGraph: this.scanOpenGraph(),
        twitter:   this.scanTwitter(),
        schema:    this.scanSchema(),
        favicons:  this.scanFavicons(),
        pwa:       this.scanPWA(),
        logo:      this.scanLogo()
      };
    },

    /** Basic HTML meta tags, title, lang, canonical. */
    scanBasic: function () {
      var m = Utils.metaContent.bind(Utils);
      return {
        charset:       doc.characterSet || doc.charset || null,
        viewport:      m('meta[name="viewport"]'),
        title:         doc.title || null,
        description:   m('meta[name="description"]'),
        keywords:      m('meta[name="keywords"]'),
        author:        m('meta[name="author"]'),
        robots:        m('meta[name="robots"]'),
        googlebot:     m('meta[name="googlebot"]'),
        canonical:     doc.querySelector('link[rel="canonical"]') ? doc.querySelector('link[rel="canonical"]').href : null,
        themeColor:    m('meta[name="theme-color"]'),
        colorScheme:   m('meta[name="color-scheme"]'),
        generator:     m('meta[name="generator"]'),
        rating:        m('meta[name="rating"]'),
        referrer:      m('meta[name="referrer"]') || m('meta[name="referrerpolicy"]'),
        copyright:     m('meta[name="copyright"]'),
        lang:          doc.documentElement.lang || null,
        revisitAfter:  m('meta[name="revisit-after"]'),
        category:      m('meta[name="category"]')
      };
    },

    /** All Open Graph protocol meta tags. */
    scanOpenGraph: function () {
      var p = function (prop) {
        var el = doc.querySelector('meta[property="' + prop + '"]');
        return el ? (el.getAttribute('content') || null) : null;
      };
      return {
        title:          p('og:title'),
        description:    p('og:description'),
        image:          p('og:image'),
        imageSecure:    p('og:image:secure_url'),
        imageWidth:     p('og:image:width'),
        imageHeight:    p('og:image:height'),
        imageAlt:       p('og:image:alt'),
        imageType:      p('og:image:type'),
        url:            p('og:url'),
        type:           p('og:type'),
        siteName:       p('og:site_name'),
        locale:         p('og:locale'),
        localeAlt:      p('og:locale:alternate'),
        video:          p('og:video'),
        videoType:      p('og:video:type'),
        videoWidth:     p('og:video:width'),
        videoHeight:    p('og:video:height'),
        audio:          p('og:audio'),
        determiner:     p('og:determiner'),
        updatedTime:    p('og:updated_time'),
        // Article specific
        articlePublished:   p('article:published_time'),
        articleModified:    p('article:modified_time'),
        articleAuthor:      p('article:author'),
        articleSection:     p('article:section'),
        articleTag:         p('article:tag')
      };
    },

    /** Twitter / X Card meta tags (supports both name= and property= variants). */
    scanTwitter: function () {
      var g = function (key) {
        return (doc.querySelector('meta[name="twitter:' + key + '"]') ||
                doc.querySelector('meta[property="twitter:' + key + '"]') || {getAttribute: function(){return null;}}).getAttribute('content');
      };
      return {
        card:        g('card'),
        site:        g('site'),
        siteId:      g('site:id'),
        creator:     g('creator'),
        creatorId:   g('creator:id'),
        title:       g('title'),
        description: g('description'),
        image:       g('image'),
        imageAlt:    g('image:alt'),
        domain:      g('domain'),
        url:         g('url'),
        player:      g('player'),
        appNameiPhone:    g('app:name:iphone'),
        appNameiPad:      g('app:name:ipad'),
        appNameGooglePlay:g('app:name:googleplay'),
        appIdiPhone:      g('app:id:iphone'),
        appIdGooglePlay:  g('app:id:googleplay')
      };
    },

    /** All JSON-LD schema.org blocks parsed. */
    scanSchema: function () {
      var results = [];
      var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        try {
          var parsed = JSON.parse(scripts[i].textContent);
          results.push(parsed);
        } catch (e) { /* malformed JSON-LD */ }
      }
      return results;
    },

    /** Favicons: rel=icon, apple-touch-icon, shortcut icon, MS tiles. */
    scanFavicons: function () {
      var list = [];
      var seen = {};
      var pushLink = function (el) {
        var href = el.href || el.getAttribute('href') || '';
        var key = (el.rel || '') + '|' + href;
        if (seen[key]) return;
        seen[key] = true;
        list.push({
          rel:   el.rel || el.getAttribute('rel') || '',
          href:  href,
          sizes: (el.sizes && el.sizes.value) || el.getAttribute('sizes') || null,
          type:  el.type || el.getAttribute('type') || null
        });
      };
      doc.querySelectorAll('link[rel*="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="mask-icon"]').forEach(pushLink);
      // MS Tile
      var msTile = doc.querySelector('meta[name="msapplication-TileImage"]');
      if (msTile) {
        list.push({ rel: 'msapplication-TileImage', href: msTile.getAttribute('content') || '', sizes: null, type: null });
      }
      var msConfig = doc.querySelector('meta[name="msapplication-config"]');
      if (msConfig) {
        list.push({ rel: 'msapplication-config', href: msConfig.getAttribute('content') || '', sizes: null, type: null });
      }
      return list;
    },

    /** PWA-related tags: manifest, apple-web-app, service worker presence. */
    scanPWA: function () {
      var m = Utils.metaContent.bind(Utils);
      var manifestEl = doc.querySelector('link[rel="manifest"]');
      return {
        hasManifest:              !!manifestEl,
        manifestUrl:              manifestEl ? manifestEl.href : null,
        mobileWebAppCapable:      m('meta[name="mobile-web-app-capable"]'),
        appleWebAppCapable:       m('meta[name="apple-mobile-web-app-capable"]'),
        appleWebAppTitle:         m('meta[name="apple-mobile-web-app-title"]'),
        appleStatusBarStyle:      m('meta[name="apple-mobile-web-app-status-bar-style"]'),
        applicationName:          m('meta[name="application-name"]'),
        msTileColor:              m('meta[name="msapplication-TileColor"]'),
        msTileImage:              m('meta[name="msapplication-TileImage"]'),
        msStartUrl:               m('meta[name="msapplication-starturl"]'),
        msNavbuttonColor:         m('meta[name="msapplication-navbutton-color"]'),
        formatDetection:          m('meta[name="format-detection"]'),
        hasServiceWorker:         'serviceWorker' in navigator,
        swRegistered:             !!(navigator.serviceWorker && navigator.serviceWorker.controller)
      };
    },

    /** Quick logo scan (full detection is in LogoDetector). */
    scanLogo: function () {
      return LogoDetector.detect();
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  LOGO DETECTOR  –  10+ strategies, priority-ordered
  // ═══════════════════════════════════════════════════════════
  var LogoDetector = {

    detect: function () {
      var candidates = [];
      var self = this;
      var strategies = [
        { name: 'schema-org-logo',     fn: self.fromSchema,         priority: 10 },
        { name: 'og:logo (non-std)',   fn: self.fromOGLogo,         priority: 9  },
        { name: 'img[class*=logo]',    fn: self.fromDOMClassId,     priority: 8  },
        { name: 'img[src*=logo]',      fn: self.fromSrcKeyword,     priority: 7  },
        { name: 'header/nav img',      fn: self.fromHeaderNav,      priority: 6  },
        { name: 'SVG#logo',            fn: self.fromInlineSVG,      priority: 5  },
        { name: 'apple-touch-icon',    fn: self.fromAppleTouchIcon, priority: 4  },
        { name: 'favicon 192',         fn: self.fromFaviconLarge,   priority: 3  },
        { name: 'favicon',             fn: self.fromFavicon,        priority: 2  },
        { name: 'og:image',            fn: self.fromOGImage,        priority: 1  }
      ];
      for (var i = 0; i < strategies.length; i++) {
        var url = null;
        try { url = strategies[i].fn.call(self); } catch (e) {}
        if (url) {
          candidates.push({ source: strategies[i].name, url: url, priority: strategies[i].priority });
        }
      }
      // Sort by priority descending, deduplicate by URL
      candidates.sort(function (a, b) { return b.priority - a.priority; });
      var seen = {}, unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (!seen[candidates[j].url]) { seen[candidates[j].url] = true; unique.push(candidates[j]); }
      }
      return unique;
    },

    getBest: function () {
      var c = this.detect();
      return c.length > 0 ? c[0].url : null;
    },

    fromSchema: function () {
      var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        try {
          var d = JSON.parse(scripts[i].textContent);
          var extract = function (obj) {
            if (!obj || !obj.logo) return null;
            return Utils.absoluteUrl(typeof obj.logo === 'string' ? obj.logo : (obj.logo.url || obj.logo.contentUrl || null));
          };
          var r = extract(d);
          if (r) return r;
          if (d['@graph']) {
            for (var j = 0; j < d['@graph'].length; j++) {
              r = extract(d['@graph'][j]);
              if (r) return r;
            }
          }
        } catch (e) {}
      }
      return null;
    },

    fromOGLogo: function () {
      var el = doc.querySelector('meta[property="og:logo"]');
      return el ? Utils.absoluteUrl(el.getAttribute('content')) : null;
    },

    fromDOMClassId: function () {
      var selectors = [
        'img[class*="logo"]', 'img[id*="logo"]',
        'img[alt*="logo" i]', 'img[title*="logo" i]',
        '.logo img', '#logo img', '[class*="brand-logo"] img',
        'a[class*="logo"] img', 'a[id*="logo"] img',
        '[class*="site-logo"] img', '[class*="navbar-brand"] img',
        '[class*="header-logo"] img', '[class*="nav-logo"] img'
      ];
      for (var i = 0; i < selectors.length; i++) {
        var el = doc.querySelector(selectors[i]);
        if (el && el.src && !el.src.includes('data:image/gif')) return el.src;
        // Handle background-image logos
        if (el && el.tagName !== 'IMG') {
          var bg = getComputedStyle(el).backgroundImage;
          var match = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) return Utils.absoluteUrl(match[1]);
        }
      }
      return null;
    },

    fromSrcKeyword: function () {
      var keywords = ['logo', 'brand', 'logotype', 'wordmark', 'brandmark'];
      var imgs = doc.querySelectorAll('img[src]');
      for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].src || '';
        for (var k = 0; k < keywords.length; k++) {
          if (src.toLowerCase().includes(keywords[k])) return src;
        }
      }
      return null;
    },

    fromHeaderNav: function () {
      var containers = ['header', 'nav', '.header', '.navbar', '.nav', '#header', '#nav', '.site-header', '.page-header'];
      for (var i = 0; i < containers.length; i++) {
        var container = doc.querySelector(containers[i]);
        if (container) {
          var img = container.querySelector('img');
          if (img && img.src && !img.src.includes('data:image/gif')) return img.src;
        }
      }
      return null;
    },

    fromInlineSVG: function () {
      var svgSelectors = ['svg[class*="logo"]', 'svg[id*="logo"]', 'svg[class*="brand"]', '[class*="logo"] svg:first-of-type'];
      for (var i = 0; i < svgSelectors.length; i++) {
        var el = doc.querySelector(svgSelectors[i]);
        if (el) {
          // Serialize SVG to data URL
          var serialized = new XMLSerializer().serializeToString(el);
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);
        }
      }
      return null;
    },

    fromAppleTouchIcon: function () {
      var icons = doc.querySelectorAll('link[rel="apple-touch-icon"]');
      var best = null, bestSize = 0;
      icons.forEach(function (icon) {
        var sizeStr = (icon.getAttribute('sizes') || '0x0').split('x')[0];
        var size = parseInt(sizeStr, 10) || 0;
        if (size > bestSize) { best = icon.href; bestSize = size; }
      });
      if (!best && icons.length > 0) best = icons[0].href;
      return best;
    },

    fromFaviconLarge: function () {
      var icons = doc.querySelectorAll('link[rel="icon"]');
      var best = null, bestSize = 0;
      icons.forEach(function (icon) {
        var sizeStr = (icon.getAttribute('sizes') || '0x0').split('x')[0];
        var size = parseInt(sizeStr, 10) || 0;
        if (size >= 64 && size > bestSize) { best = icon.href; bestSize = size; }
      });
      return best;
    },

    fromFavicon: function () {
      var el = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      return el ? el.href : (location.origin + '/favicon.ico');
    },

    fromOGImage: function () {
      var el = doc.querySelector('meta[property="og:image"]');
      return el ? Utils.absoluteUrl(el.getAttribute('content')) : null;
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  ANALYZER  –  scores & grades each category
  // ═══════════════════════════════════════════════════════════
  var Analyzer = {

    analyze: function (existing) {
      var report = {
        score: 0,
        maxScore: 0,
        categories: {},
        missing: [],
        found: [],
        warnings: [],
        grade: 'F'
      };

      this.checkBasic(existing.basic, report);
      this.checkOpenGraph(existing.openGraph, report);
      this.checkTwitter(existing.twitter, report);
      this.checkSchema(existing.schema, report);
      this.checkFavicons(existing.favicons, report);
      this.checkPWA(existing.pwa, report);

      var pct = report.maxScore > 0 ? Math.round((report.score / report.maxScore) * 100) : 0;
      report.percentage = pct;
      report.grade = pct >= 95 ? 'A+' : pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 55 ? 'D' : 'F';

      // Warnings
      if (existing.basic.description && existing.basic.description.length > 160) {
        report.warnings.push('Description exceeds 160 characters – may be truncated in search results.');
      }
      if (existing.basic.title && existing.basic.title.length > 60) {
        report.warnings.push('Title exceeds 60 characters – may be truncated in search results.');
      }
      if (existing.basic.keywords) {
        report.warnings.push('Keywords meta tag has minimal SEO impact in modern search engines.');
      }
      if (existing.openGraph.image && !existing.openGraph.imageWidth) {
        report.warnings.push('og:image exists but og:image:width/height are missing – specify 1200x630 for best results.');
      }

      return report;
    },

    _check: function (name, value, score, report, category) {
      report.maxScore += score;
      if (!report.categories[category]) {
        report.categories[category] = { found: [], missing: [], score: 0, maxScore: 0 };
      }
      report.categories[category].maxScore += score;
      var present = (value !== null && value !== undefined && value !== '' && value !== false);
      if (present) {
        report.score += score;
        report.found.push(name);
        report.categories[category].found.push({ name: name, value: value, score: score });
        report.categories[category].score += score;
      } else {
        report.missing.push(name);
        report.categories[category].missing.push({ name: name, score: score });
      }
    },

    checkBasic: function (b, r) {
      var c = 'Basic';
      this._check('charset',          b.charset,      3,  r, c);
      this._check('viewport',         b.viewport,     6,  r, c);
      this._check('title',            b.title,        10, r, c);
      this._check('description',      b.description,  10, r, c);
      this._check('canonical',        b.canonical,    7,  r, c);
      this._check('lang attribute',   b.lang,         5,  r, c);
      this._check('robots',           b.robots,       4,  r, c);
      this._check('theme-color',      b.themeColor,   4,  r, c);
      this._check('keywords',         b.keywords,     2,  r, c);
      this._check('author',           b.author,       2,  r, c);
      this._check('referrer policy',  b.referrer,     2,  r, c);
      this._check('color-scheme',     b.colorScheme,  2,  r, c);
    },

    checkOpenGraph: function (og, r) {
      var c = 'Open Graph';
      this._check('og:title',         og.title,       8,  r, c);
      this._check('og:description',   og.description, 8,  r, c);
      this._check('og:image',         og.image,       10, r, c);
      this._check('og:image:alt',     og.imageAlt,    4,  r, c);
      this._check('og:image:width',   og.imageWidth,  3,  r, c);
      this._check('og:image:height',  og.imageHeight, 3,  r, c);
      this._check('og:url',           og.url,         6,  r, c);
      this._check('og:type',          og.type,        5,  r, c);
      this._check('og:site_name',     og.siteName,    5,  r, c);
      this._check('og:locale',        og.locale,      4,  r, c);
    },

    checkTwitter: function (tw, r) {
      var c = 'Twitter / X Cards';
      this._check('twitter:card',         tw.card,        8,  r, c);
      this._check('twitter:title',        tw.title,       6,  r, c);
      this._check('twitter:description',  tw.description, 6,  r, c);
      this._check('twitter:image',        tw.image,       8,  r, c);
      this._check('twitter:image:alt',    tw.imageAlt,    4,  r, c);
      this._check('twitter:domain',       tw.domain,      3,  r, c);
      this._check('twitter:site',         tw.site,        3,  r, c);
    },

    checkSchema: function (schemas, r) {
      var c = 'Schema.org / JSON-LD';
      var types = [];
      schemas.forEach(function (s) {
        if (s['@type']) types.push(s['@type']);
        if (s['@graph']) s['@graph'].forEach(function (g) { if (g['@type']) types.push(g['@type']); });
      });
      this._check('WebSite',              types.indexOf('WebSite') > -1,             8, r, c);
      this._check('Organization/Person',  types.indexOf('Organization') > -1 || types.indexOf('Person') > -1, 8, r, c);
      this._check('WebPage/Article',      types.indexOf('WebPage') > -1 || types.indexOf('Article') > -1, 6, r, c);
      this._check('BreadcrumbList',       types.indexOf('BreadcrumbList') > -1,       4, r, c);
    },

    checkFavicons: function (favicons, r) {
      var c = 'Favicons & Icons';
      var rels = favicons.map(function (f) { return f.rel; });
      var sizes = favicons.map(function (f) { return f.sizes || ''; });
      this._check('favicon (rel=icon)',    rels.some(function(rel){ return rel && rel.includes('icon'); }), 6, r, c);
      this._check('apple-touch-icon',      rels.some(function(rel){ return rel && rel.includes('apple-touch-icon'); }), 5, r, c);
      this._check('192×192 icon',          sizes.some(function(s){ return s.includes('192'); }), 4, r, c);
      this._check('512×512 icon',          sizes.some(function(s){ return s.includes('512'); }), 4, r, c);
      this._check('msapplication-TileImage', rels.some(function(rel){ return rel && rel.includes('msapplication'); }), 3, r, c);
    },

    checkPWA: function (pwa, r) {
      var c = 'PWA';
      this._check('web app manifest',             pwa.hasManifest,          10, r, c);
      this._check('mobile-web-app-capable',       pwa.mobileWebAppCapable,   5, r, c);
      this._check('apple-mobile-web-app-capable', pwa.appleWebAppCapable,    5, r, c);
      this._check('apple-mobile-web-app-title',   pwa.appleWebAppTitle,      3, r, c);
      this._check('apple status-bar-style',       pwa.appleStatusBarStyle,   3, r, c);
      this._check('application-name',             pwa.applicationName,       3, r, c);
      this._check('service worker registered',    pwa.swRegistered,          8, r, c);
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  GENERATOR  –  builds tag descriptors for missing items
  // ═══════════════════════════════════════════════════════════
  var Generator = {

    /** Returns array of tag-descriptor objects for missing basic meta. */
    generateBasic: function (existing, config) {
      var tags = [];
      var title   = existing.basic.title   || Utils.getPageTitle();
      var desc    = Utils.trunc(existing.basic.description || Utils.getPageDescription() || ('Welcome to ' + Utils.getSiteName()), 160);
      var theme   = Utils.getThemeColor(config);

      if (!existing.basic.charset) {
        tags.push({ type: 'meta', attrs: { charset: 'UTF-8' } });
      }
      if (!existing.basic.viewport) {
        tags.push({ type: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' } });
      }
      if (!existing.basic.description) {
        tags.push({ type: 'meta', attrs: { name: 'description', content: desc } });
      }
      if (!existing.basic.robots) {
        tags.push({ type: 'meta', attrs: { name: 'robots', content: config.robots || 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' } });
      }
      if (!existing.basic.googlebot) {
        tags.push({ type: 'meta', attrs: { name: 'googlebot', content: config.googlebot || 'index, follow' } });
      }
      if (!existing.basic.themeColor) {
        tags.push({ type: 'meta', attrs: { name: 'theme-color', content: theme } });
      }
      if (!existing.basic.colorScheme) {
        tags.push({ type: 'meta', attrs: { name: 'color-scheme', content: config.colorScheme || 'light dark' } });
      }
      if (!existing.basic.referrer) {
        tags.push({ type: 'meta', attrs: { name: 'referrer', content: config.referrer || 'strict-origin-when-cross-origin' } });
      }
      if (!existing.basic.canonical) {
        tags.push({ type: 'link', attrs: { rel: 'canonical', href: Utils.getCanonicalUrl() } });
      }
      if (!existing.basic.lang) {
        tags.push({ type: 'html-attr', attr: 'lang', value: config.lang || 'en' });
      }
      if (!existing.basic.author && config.author) {
        tags.push({ type: 'meta', attrs: { name: 'author', content: config.author } });
      }
      if (config.copyright) {
        tags.push({ type: 'meta', attrs: { name: 'copyright', content: config.copyright } });
      }
      return tags;
    },

    /** Returns array of tag-descriptor objects for missing Open Graph tags. */
    generateOpenGraph: function (existing, config, logoUrl) {
      var tags = [];
      var og       = existing.openGraph;
      var title    = og.title    || existing.basic.title   || Utils.getPageTitle();
      var desc     = Utils.trunc(og.description || existing.basic.description || Utils.getPageDescription() || '', 200);
      var url      = og.url      || Utils.getCanonicalUrl();
      var siteName = og.siteName || config.siteName || Utils.getSiteName();
      var image    = og.image    || config.ogImage  || config.image || logoUrl;
      var theme    = Utils.getThemeColor(config);

      if (!og.title)       tags.push({ type: 'meta', attrs: { property: 'og:title',       content: title } });
      if (!og.description) tags.push({ type: 'meta', attrs: { property: 'og:description', content: desc } });
      if (!og.url)         tags.push({ type: 'meta', attrs: { property: 'og:url',         content: url } });
      if (!og.type)        tags.push({ type: 'meta', attrs: { property: 'og:type',        content: config.ogType || 'website' } });
      if (!og.siteName)    tags.push({ type: 'meta', attrs: { property: 'og:site_name',   content: siteName } });
      if (!og.locale)      tags.push({ type: 'meta', attrs: { property: 'og:locale',      content: config.locale  || 'en_US' } });

      if (!og.image && image && image !== 'inline-svg') {
        var absImage = Utils.absoluteUrl(image);
        tags.push({ type: 'meta', attrs: { property: 'og:image',        content: absImage } });
        tags.push({ type: 'meta', attrs: { property: 'og:image:secure_url', content: absImage.replace(/^http:/, 'https:') } });
        tags.push({ type: 'meta', attrs: { property: 'og:image:width',  content: config.ogImageWidth  || '1200' } });
        tags.push({ type: 'meta', attrs: { property: 'og:image:height', content: config.ogImageHeight || '630' } });
        tags.push({ type: 'meta', attrs: { property: 'og:image:alt',    content: siteName + ' – ' + title } });
        tags.push({ type: 'meta', attrs: { property: 'og:image:type',   content: config.ogImageType || 'image/png' } });
      }
      return tags;
    },

    /** Returns array of tag-descriptor objects for missing Twitter Card tags. */
    generateTwitter: function (existing, config, logoUrl) {
      var tags = [];
      var tw    = existing.twitter;
      var og    = existing.openGraph;
      var title = tw.title       || og.title       || existing.basic.title || Utils.getPageTitle();
      var desc  = Utils.trunc(tw.description || og.description || existing.basic.description || Utils.getPageDescription() || '', 200);
      var image = tw.image       || og.image       || config.ogImage || config.image || logoUrl;

      if (!tw.card)        tags.push({ type: 'meta', attrs: { name: 'twitter:card',        content: (image && image !== 'inline-svg') ? 'summary_large_image' : 'summary' } });
      if (!tw.title)       tags.push({ type: 'meta', attrs: { name: 'twitter:title',       content: Utils.trunc(title, 70) } });
      if (!tw.description) tags.push({ type: 'meta', attrs: { name: 'twitter:description', content: desc } });
      if (!tw.domain)      tags.push({ type: 'meta', attrs: { name: 'twitter:domain',      content: Utils.domainName() } });
      if (!tw.url)         tags.push({ type: 'meta', attrs: { name: 'twitter:url',         content: Utils.getCanonicalUrl() } });

      if (!tw.image && image && image !== 'inline-svg') {
        tags.push({ type: 'meta', attrs: { name: 'twitter:image',     content: Utils.absoluteUrl(image) } });
        tags.push({ type: 'meta', attrs: { name: 'twitter:image:alt', content: title } });
      }
      if (!tw.site && config.twitterSite) {
        tags.push({ type: 'meta', attrs: { name: 'twitter:site', content: config.twitterSite } });
      }
      if (!tw.creator && config.twitterCreator) {
        tags.push({ type: 'meta', attrs: { name: 'twitter:creator', content: config.twitterCreator } });
      }
      return tags;
    },

    /** Returns JSON-LD schema.org blocks for missing types. */
    generateSchema: function (existing, config, logoUrl) {
      var tags    = [];
      var schemas = existing.schema;
      var types   = [];
      schemas.forEach(function (s) {
        if (s['@type']) types.push(s['@type']);
        if (s['@graph']) s['@graph'].forEach(function (g) { if (g['@type']) types.push(g['@type']); });
      });

      var siteName = config.siteName || Utils.getSiteName();
      var baseUrl  = Utils.getOrigin();
      var url      = Utils.getCanonicalUrl();
      var desc     = existing.basic.description || Utils.getPageDescription() || '';
      var title    = existing.basic.title || Utils.getPageTitle();
      var absLogo  = (logoUrl && logoUrl !== 'inline-svg') ? Utils.absoluteUrl(logoUrl) : null;

      // WebSite
      if (types.indexOf('WebSite') === -1) {
        var ws = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': baseUrl + '/#website',
          'url': baseUrl + '/',
          'name': siteName,
          'description': desc,
          'inLanguage': config.lang || 'en',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': { '@type': 'EntryPoint', 'urlTemplate': baseUrl + '/?s={search_term_string}' },
            'query-input': 'required name=search_term_string'
          }
        };
        tags.push({ type: 'json-ld', data: ws });
      }

      // Organization or Person
      if (types.indexOf('Organization') === -1 && types.indexOf('Person') === -1) {
        var orgType = config.orgType || 'Organization';
        var org = {
          '@context': 'https://schema.org',
          '@type': orgType,
          '@id': baseUrl + '/#' + orgType.toLowerCase(),
          'name': siteName,
          'url': baseUrl + '/',
          'description': desc,
          'inLanguage': config.lang || 'en'
        };
        if (absLogo) {
          org.logo = {
            '@type': 'ImageObject',
            '@id': baseUrl + '/#logo',
            'url': absLogo,
            'contentUrl': absLogo,
            'caption': siteName,
            'width': { '@type': 'QuantitativeValue', 'value': config.logoWidth || 200, 'unitCode': 'E37' },
            'height': { '@type': 'QuantitativeValue', 'value': config.logoHeight || 200, 'unitCode': 'E37' }
          };
          org.image = { '@id': baseUrl + '/#logo' };
        }
        if (config.sameAs && config.sameAs.length) org.sameAs = config.sameAs;
        if (config.email)       org.email       = config.email;
        if (config.telephone)   org.telephone   = config.telephone;
        if (config.foundingDate) org.foundingDate = config.foundingDate;
        if (config.address) {
          org.address = {
            '@type': 'PostalAddress',
            'streetAddress':   config.address.street || '',
            'addressLocality': config.address.city   || '',
            'addressRegion':   config.address.region || '',
            'postalCode':      config.address.zip    || '',
            'addressCountry':  config.address.country || ''
          };
        }
        tags.push({ type: 'json-ld', data: org });
      }

      // WebPage for the current page
      if (types.indexOf('WebPage') === -1 && types.indexOf('Article') === -1) {
        var wp = {
          '@context': 'https://schema.org',
          '@type': config.pageType || 'WebPage',
          '@id': url + '#webpage',
          'url': url,
          'name': title,
          'description': desc,
          'isPartOf': { '@id': baseUrl + '/#website' },
          'inLanguage': config.lang || 'en',
          'datePublished': config.datePublished || new Date().toISOString().split('T')[0],
          'dateModified': config.dateModified || new Date().toISOString(),
          'potentialAction': { '@type': 'ReadAction', 'target': [url] }
        };
        if (absLogo) {
          wp.primaryImageOfPage = {
            '@type': 'ImageObject',
            'url': absLogo,
            'width': config.logoWidth || 200,
            'height': config.logoHeight || 200
          };
        }
        tags.push({ type: 'json-ld', data: wp });
      }

      // BreadcrumbList
      if (types.indexOf('BreadcrumbList') === -1) {
        var pathParts = location.pathname.split('/').filter(Boolean);
        var items = [{ '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': baseUrl + '/' }];
        var cumPath = baseUrl;
        pathParts.forEach(function (part, idx) {
          cumPath += '/' + part;
          items.push({
            '@type': 'ListItem',
            'position': idx + 2,
            'name': decodeURIComponent(part).replace(/[-_]/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); }),
            'item': cumPath
          });
        });
        if (items.length > 1) {
          tags.push({
            type: 'json-ld',
            data: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items }
          });
        }
      }

      return tags;
    },

    /** Returns favicon/icon link tags for missing sizes. */
    generateFavicons: function (existing, config) {
      var tags      = [];
      var favicons  = existing.favicons;
      var logoUrl   = config.faviconUrl || config.logoUrl;
      var hasIcon   = favicons.some(function (f) { return f.rel && f.rel.includes('icon'); });
      var hasApple  = favicons.some(function (f) { return f.rel && f.rel.includes('apple-touch-icon'); });
      var hasMsTile = favicons.some(function (f) { return f.rel && f.rel.includes('msapplication'); });
      var theme     = Utils.getThemeColor(config);

      if (!hasIcon && logoUrl && logoUrl !== 'inline-svg') {
        [16, 32, 96, 192].forEach(function (size) {
          tags.push({ type: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: size + 'x' + size, href: Utils.absoluteUrl(logoUrl) } });
        });
        tags.push({ type: 'link', attrs: { rel: 'shortcut icon', href: Utils.absoluteUrl(logoUrl) } });
      }

      if (!hasApple && logoUrl && logoUrl !== 'inline-svg') {
        [57, 60, 72, 76, 114, 120, 144, 152, 167, 180].forEach(function (size) {
          tags.push({ type: 'link', attrs: { rel: 'apple-touch-icon', sizes: size + 'x' + size, href: Utils.absoluteUrl(logoUrl) } });
        });
      }

      if (!hasMsTile && logoUrl && logoUrl !== 'inline-svg') {
        tags.push({ type: 'meta', attrs: { name: 'msapplication-TileImage', content: Utils.absoluteUrl(logoUrl) } });
        tags.push({ type: 'meta', attrs: { name: 'msapplication-TileColor', content: theme } });
        tags.push({ type: 'meta', attrs: { name: 'msapplication-tap-highlight', content: 'no' } });
        tags.push({ type: 'meta', attrs: { name: 'msapplication-starturl', content: '/' } });
      }

      return tags;
    },

    /** Returns PWA meta tags and a Blob-based manifest link. */
    generatePWA: function (existing, config, logoUrl) {
      var tags      = [];
      var pwa       = existing.pwa;
      var siteName  = config.siteName   || Utils.getSiteName();
      var shortName = config.shortName  || siteName.substring(0, 12);
      var theme     = Utils.getThemeColor(config);
      var bgColor   = config.backgroundColor || '#ffffff';
      var desc      = Utils.trunc(config.description || existing.basic.description || Utils.getPageDescription() || '', 200);

      if (!pwa.mobileWebAppCapable) {
        tags.push({ type: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' } });
      }
      if (!pwa.appleWebAppCapable) {
        tags.push({ type: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } });
      }
      if (!pwa.appleStatusBarStyle) {
        tags.push({ type: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: config.statusBarStyle || 'black-translucent' } });
      }
      if (!pwa.appleWebAppTitle) {
        tags.push({ type: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: shortName } });
      }
      if (!pwa.applicationName) {
        tags.push({ type: 'meta', attrs: { name: 'application-name', content: shortName } });
      }
      if (!pwa.msTileColor) {
        tags.push({ type: 'meta', attrs: { name: 'msapplication-TileColor', content: theme } });
      }
      tags.push({ type: 'meta', attrs: { name: 'format-detection', content: 'telephone=no' } });

      // Build and inject manifest if missing
      if (!pwa.hasManifest) {
        var icons = [];
        if (logoUrl && logoUrl !== 'inline-svg') {
          var absLogo = Utils.absoluteUrl(logoUrl);
          [72, 96, 128, 144, 152, 192, 384, 512].forEach(function (size) {
            icons.push({ src: absLogo, sizes: size + 'x' + size, type: 'image/png', purpose: 'any maskable' });
          });
        }

        var manifest = {
          name:          siteName,
          short_name:    shortName,
          description:   desc,
          start_url:     config.startUrl     || '/',
          scope:         config.scope        || '/',
          display:       config.display      || 'standalone',
          orientation:   config.orientation  || 'portrait-primary',
          background_color: bgColor,
          theme_color:   theme,
          lang:          config.lang         || 'en',
          dir:           config.dir          || 'ltr',
          categories:    config.categories   || [],
          icons:         icons,
          screenshots:   config.screenshots  || [],
          shortcuts:     config.shortcuts    || [],
          prefer_related_applications: false,
          related_applications: config.relatedApps || [],
          iarc_rating_id: config.iarcRatingId || undefined,
          share_target:  config.shareTarget  || undefined,
          protocol_handlers: config.protocolHandlers || undefined
        };

        // Clean undefined
        Object.keys(manifest).forEach(function (k) { if (manifest[k] === undefined) delete manifest[k]; });

        tags.push({ type: 'manifest', data: manifest });
      }

      return tags;
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  INJECTOR  –  writes generated tags into <head>
  // ═══════════════════════════════════════════════════════════
  var Injector = {
    injected: [],

    injectAll: function (tagSets) {
      var self = this;
      tagSets.forEach(function (tags) {
        if (!tags) return;
        tags.forEach(function (tag) { self._inject(tag); });
      });
    },

    _inject: function (tag) {
      if (!tag || !tag.type) return;
      switch (tag.type) {
        case 'meta':       this._meta(tag.attrs);      break;
        case 'link':       this._link(tag.attrs);      break;
        case 'json-ld':    this._jsonLd(tag.data);     break;
        case 'manifest':   this._manifest(tag.data);   break;
        case 'html-attr':  this._htmlAttr(tag.attr, tag.value); break;
      }
    },

    _meta: function (attrs) {
      // Prevent duplicates
      var sel = attrs.charset ? 'meta[charset]'
              : attrs.name    ? 'meta[name="' + attrs.name + '"]'
              : attrs.property? 'meta[property="' + attrs.property + '"]'
              : null;
      if (sel && doc.querySelector(sel)) return;

      var el = doc.createElement('meta');
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      el.setAttribute('data-mg', '1');
      doc.head.appendChild(el);
      this.injected.push({ type: 'meta', attrs: attrs });
    },

    _link: function (attrs) {
      var sel = 'link[rel="' + attrs.rel + '"]' + (attrs.sizes ? '[sizes="' + attrs.sizes + '"]' : '');
      if (doc.querySelector(sel)) return;

      var el = doc.createElement('link');
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      el.setAttribute('data-mg', '1');
      doc.head.appendChild(el);
      this.injected.push({ type: 'link', attrs: attrs });
    },

    _jsonLd: function (data) {
      var script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-mg', '1');
      script.textContent = JSON.stringify(data, null, 2);
      doc.head.appendChild(script);
      this.injected.push({ type: 'json-ld', data: data });
    },

    _manifest: function (manifestData) {
      if (typeof Blob === 'undefined' || typeof URL === 'undefined') return;
      try {
        var blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/manifest+json' });
        var blobUrl = URL.createObjectURL(blob);
        var link = doc.createElement('link');
        link.rel = 'manifest';
        link.href = blobUrl;
        link.setAttribute('data-mg', '1');
        doc.head.appendChild(link);
        this.injected.push({ type: 'manifest', data: manifestData, blobUrl: blobUrl });
      } catch (e) {
        console.warn('[MetaGrapher] Manifest Blob URL creation failed:', e);
      }
    },

    _htmlAttr: function (attr, value) {
      if (!doc.documentElement.getAttribute(attr)) {
        doc.documentElement.setAttribute(attr, value);
        this.injected.push({ type: 'html-attr', attr: attr, value: value });
      }
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  SERVICE WORKER GENERATOR
  // ═══════════════════════════════════════════════════════════
  var ServiceWorkerGen = {

    /** Returns a complete Service Worker JS string. */
    buildCode: function (config) {
      var cacheName = (config && config.swCacheName) ? config.swCacheName : 'mg-sw-' + Date.now();
      var urls = JSON.stringify((config && config.urlsToCache) ? config.urlsToCache : ['/', '/index.html']);
      var offlinePage = (config && config.offlinePage) ? config.offlinePage : '/offline.html';
      var strategy = (config && config.cacheStrategy) ? config.cacheStrategy : 'network-first';

      return [
        '/* MetaGrapher Auto-Generated Service Worker */',
        'var CACHE_NAME = "' + cacheName + '";',
        'var URLS_TO_CACHE = ' + urls + ';',
        'var OFFLINE_PAGE = "' + offlinePage + '";',
        '',
        'self.addEventListener("install", function(e) {',
        '  e.waitUntil(',
        '    caches.open(CACHE_NAME).then(function(cache) {',
        '      return cache.addAll(URLS_TO_CACHE).catch(function(){});',
        '    })',
        '  );',
        '  self.skipWaiting();',
        '});',
        '',
        'self.addEventListener("activate", function(e) {',
        '  e.waitUntil(',
        '    caches.keys().then(function(keys) {',
        '      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));',
        '    })',
        '  );',
        '  self.clients.claim();',
        '});',
        '',
        'self.addEventListener("fetch", function(e) {',
        '  if (e.request.method !== "GET") return;',
        strategy === 'cache-first'
          ? [
              '  e.respondWith(',
              '    caches.match(e.request).then(function(cached) {',
              '      if (cached) return cached;',
              '      return fetch(e.request).then(function(res) {',
              '        if (!res || res.status !== 200 || res.type === "opaque") return res;',
              '        var clone = res.clone();',
              '        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });',
              '        return res;',
              '      }).catch(function() { return caches.match(OFFLINE_PAGE); });',
              '    })',
              '  );'
            ].join('\n')
          : [
              '  e.respondWith(',
              '    fetch(e.request).then(function(res) {',
              '      if (!res || res.status !== 200 || res.type === "opaque") return res;',
              '      var clone = res.clone();',
              '      caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });',
              '      return res;',
              '    }).catch(function() {',
              '      return caches.match(e.request).then(function(cached) {',
              '        return cached || caches.match(OFFLINE_PAGE);',
              '      });',
              '    })',
              '  );'
            ].join('\n'),
        '});',
        '',
        'self.addEventListener("message", function(e) {',
        '  if (e.data && e.data.action === "skipWaiting") self.skipWaiting();',
        '});'
      ].join('\n');
    },

    /** Registers a service worker from a generated Blob URL. */
    register: function (config) {
      if (!('serviceWorker' in navigator)) {
        console.warn('[MetaGrapher] Service Worker not supported in this browser.');
        return Promise.resolve(null);
      }
      var code = this.buildCode(config);
      var blob, swUrl;
      try {
        blob   = new Blob([code], { type: 'application/javascript' });
        swUrl  = URL.createObjectURL(blob);
      } catch (e) {
        console.warn('[MetaGrapher] Could not create SW Blob URL:', e);
        return Promise.resolve(null);
      }
      return navigator.serviceWorker.register(swUrl, { scope: (config && config.swScope) || '/' })
        .then(function (reg) {
          console.info('[MetaGrapher] Service Worker registered. Scope:', reg.scope);
          return reg;
        })
        .catch(function (err) {
          // Blob URL SW is blocked on some origins (cross-origin restriction)
          console.warn('[MetaGrapher] SW registration failed (blob URL restriction may apply):', err.message);
          return null;
        });
    }
  };


  // ═══════════════════════════════════════════════════════════
  //  MAIN  MetaGrapher  PUBLIC API
  // ═══════════════════════════════════════════════════════════
  var MetaGrapher = {
    version: '1.0.0',

    _config:      {},
    _existing:    null,
    _analysis:    null,
    _generated:   null,
    _logoUrl:     null,
    _logoCandidates: [],

    /**
     * Set configuration options.
     * @param {Object} options – see README for all keys
     */
    configure: function (options) {
      this._config = Object.assign ? Object.assign({}, options || {}) : (function(o){ var r={}; for(var k in o){r[k]=o[k];} return r; })(options || {});
      return this;
    },

    /**
     * Scan all existing metadata on the current page.
     */
    scan: function () {
      this._existing       = Scanner.scanAll();
      this._logoCandidates = LogoDetector.detect();
      this._logoUrl        = (this._config.logoUrl)
                               ? this._config.logoUrl
                               : (this._logoCandidates.length > 0 ? this._logoCandidates[0].url : null);
      return this;
    },

    /**
     * Analyze existing metadata and return a score/grade report.
     */
    analyze: function () {
      if (!this._existing) this.scan();
      this._analysis = Analyzer.analyze(this._existing);
      return this;
    },

    /**
     * Generate tag-descriptor objects for every missing meta tag.
     */
    generate: function () {
      if (!this._existing) this.scan();
      if (!this._analysis) this.analyze();
      var c = this._config, e = this._existing, l = this._logoUrl;
      this._generated = {
        basic:     Generator.generateBasic(e, c),
        openGraph: Generator.generateOpenGraph(e, c, l),
        twitter:   Generator.generateTwitter(e, c, l),
        schema:    Generator.generateSchema(e, c, l),
        favicons:  Generator.generateFavicons(e, c),
        pwa:       Generator.generatePWA(e, c, l)
      };
      return this;
    },

    /**
     * Inject all generated tags into <head>.
     */
    inject: function () {
      if (!this._generated) this.generate();
      var g = this._generated;
      Injector.injectAll([g.basic, g.openGraph, g.twitter, g.schema, g.favicons, g.pwa]);
      if (this._config.registerSW !== false) {
        ServiceWorkerGen.register(this._config);
      }
      return this;
    },

    /**
     * One-shot: configure → scan → analyze → generate → inject.
     * @param {Object} options
     */
    autoRun: function (options) {
      return this.configure(options || {}).scan().analyze().generate().inject();
    },

    /**
     * Returns a complete structured report of the scan, analysis, and injections.
     */
    getReport: function () {
      return {
        version:    this.version,
        url:        location.href,
        timestamp:  new Date().toISOString(),
        logo: {
          selected:   this._logoUrl,
          candidates: this._logoCandidates
        },
        existing:   this._existing,
        analysis:   this._analysis,
        generated:  this._generated,
        injected:   Injector.injected
      };
    },

    /**
     * Returns a string of all generated HTML meta tags (for copy/paste into <head>).
     */
    exportHTML: function () {
      if (!this._generated) this.generate();
      var lines = [];
      var allTags = [];
      var g = this._generated;
      ['basic','openGraph','twitter','favicons','pwa'].forEach(function (k) {
        if (g[k]) allTags = allTags.concat(g[k]);
      });
      allTags.forEach(function (tag) {
        if (tag.type === 'meta') {
          var attrs = Object.keys(tag.attrs).map(function (k) { return k + '="' + tag.attrs[k] + '"'; }).join(' ');
          lines.push('<meta ' + attrs + '>');
        } else if (tag.type === 'link') {
          var attrs = Object.keys(tag.attrs).map(function (k) { return k + '="' + tag.attrs[k] + '"'; }).join(' ');
          lines.push('<link ' + attrs + '>');
        } else if (tag.type === 'json-ld') {
          lines.push('<script type="application/ld+json">');
          lines.push(JSON.stringify(tag.data, null, 2));
          lines.push('<\/script>');
        } else if (tag.type === 'manifest') {
          lines.push('<!-- Web App Manifest (inject as manifest.json) -->');
          lines.push('<link rel="manifest" href="/manifest.json">');
          lines.push('<!-- manifest.json content: -->');
          lines.push('<!--');
          lines.push(JSON.stringify(tag.data, null, 2));
          lines.push('-->');
        }
      });
      return lines.join('\n');
    },

    // ── Sub-module access for advanced use ──────────────────
    Utils:            Utils,
    Scanner:          Scanner,
    LogoDetector:     LogoDetector,
    Analyzer:         Analyzer,
    Generator:        Generator,
    Injector:         Injector,
    ServiceWorkerGen: ServiceWorkerGen
  };

  // ── Expose globally ─────────────────────────────────────────
  global.MetaGrapher = MetaGrapher;

  // ── data-auto-run attribute support ─────────────────────────
  // <script src="library.js" data-auto-run
  //   data-mg-site-name="My Site"
  //   data-mg-theme-color="#0066ff">
  // </script>
  var _onReady = function () {
    var scriptEl = doc.querySelector('script[src*="library.js"][data-auto-run]');
    if (!scriptEl) return;
    var opts = {};
    var attrs = scriptEl.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name;
      if (name.indexOf('data-mg-') === 0) {
        // Convert data-mg-site-name → siteName
        var key = name.replace('data-mg-', '').replace(/-([a-z])/g, function (m, l) { return l.toUpperCase(); });
        opts[key] = attrs[i].value;
      }
    }
    MetaGrapher.autoRun(opts);
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', _onReady);
  } else {
    _onReady();
  }

}(window, document));
