/* ═══════════════════════════════════════════════
   AnimeX · p.js  — Pages & UI v3
   ═══════════════════════════════════════════════ */
const P = (() => {
  'use strict';

  /* ── Lazy image observer ── */
  const _imgObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
        img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
        img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
        _imgObs.unobserve(img);
      }
    });
  }, { rootMargin: '120px' });

  function lazyImg(src, cls, alt = '') {
    return `<img data-src="${src}" src="" class="${cls}" alt="${alt}" loading="lazy">`;
  }

  function observeLazy(container) {
    container.querySelectorAll('img[data-src]').forEach(img => _imgObs.observe(img));
  }

  /* ── Watchlist button HTML (unified Plus/Tick) ── */
  function wlBtnHtml(id, extraClass = '') {
    const on = D.wishlist.has(id);
    return `<button class="btnw${on ? ' on' : ''}${extraClass ? ' ' + extraClass : ''}" 
      data-wl="${id}" aria-label="${on ? 'Remove from watchlist' : 'Add to watchlist'}">
      <i class="fa-solid ${on ? 'fa-check' : 'fa-plus'}"></i>
    </button>`;
  }

  /* ── Show card ── */
  function _card(s) {
    return `<div class="sc" onclick="R.show('${s.id}')">
      <div class="sc-inner">
        ${lazyImg(s.thumb, 'sci', s.title)}
        <div class="sc-overlay">
          <div class="sc-title">${s.title}</div>
          <div class="sc-meta">⭐${s.rating} · ${s.year}</div>
        </div>
      </div>
    </div>`;
  }

  /* ── Toast ── */
  let _tt = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ── Global watchlist toggle (delegated) ── */
  function _handleWLClick(e) {
    const btn = e.target.closest('[data-wl]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.wl;
    const on = D.toggleWL(id);
    /* Update all matching buttons */
    document.querySelectorAll(`[data-wl="${id}"]`).forEach(b => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-label', on ? 'Remove from watchlist' : 'Add to watchlist');
      b.innerHTML = `<i class="fa-solid ${on ? 'fa-check' : 'fa-plus'}"></i>`;
    });
    /* Also update sdoact / evoact style buttons */
    document.querySelectorAll(`[data-wl-show="${id}"]`).forEach(b => {
      b.classList.toggle('on', on);
      b.innerHTML = `<i class="fa-${on ? 'solid fa-check' : 'regular fa-bookmark'}"></i><span>Watchlist</span>`;
    });
    toast(on ? 'Added to Watchlist' : 'Removed from Watchlist');
  }
  document.addEventListener('click', _handleWLClick);

  /* ═══════════════════════════
     HERO STACKED CAROUSEL
  ═══════════════════════════ */
  let _hc = {
    shows: [], idx: 0, timer: null,
    animating: false, touchX: 0, touchT: 0
  };

  function _hcRender() {
    const container = document.getElementById('hcs');
    if (!container) return;
    container.innerHTML = '';
    _hc.shows.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'hcd';
      div.id = 'hcd' + i;
      div.innerHTML = `
        ${lazyImg(s.thumb, 'hci', s.title)}
        <div class="hco"></div>
        <div class="hcb">
          <div class="hct">${s.title}</div>
          <div class="hcm">${s.year} · ${s.subtitle.split(' · ')[0]}</div>
          <div class="hca">
            <button class="btnp" onclick="event.stopPropagation();R.ep('${s.id}','${s.episodes[0].id}')">
              <i class="fa-solid fa-play"></i> Play
            </button>
            ${wlBtnHtml(s.id)}
            <button class="btninfo" onclick="event.stopPropagation();R.show('${s.id}')">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </div>
        </div>`;
      /* click on card body → show detail */
      div.addEventListener('click', e => {
        if (e.target.closest('.btnp') || e.target.closest('.btnw') || e.target.closest('.btninfo')) return;
        R.show(s.id);
      });
      container.appendChild(div);
    });
    _hcSetSlots();
    observeLazy(container);
  }

  function _hcSetSlots() {
    const total = _hc.shows.length;
    _hc.shows.forEach((_, i) => {
      const card = document.getElementById('hcd' + i);
      if (!card) return;
      /* slot = position relative to active, wrapping */
      const slot = (i - _hc.idx + total) % total;
      card.dataset.slot = slot;
      card.style.pointerEvents = slot === 0 ? 'auto' : 'none';
    });
    /* update dots */
    document.querySelectorAll('.hcdot').forEach((d, i) => {
      d.classList.toggle('act', i === _hc.idx);
    });
  }

  function _hcGo(dir) {
    if (_hc.animating) return;
    _hc.animating = true;
    const total = _hc.shows.length;
    const prevIdx = _hc.idx;
    _hc.idx = ((_hc.idx + dir) + total) % total;

    const prevCard = document.getElementById('hcd' + prevIdx);
    if (prevCard) {
      prevCard.classList.add(dir > 0 ? 'fly-out-left' : 'fly-out-right');
      prevCard.addEventListener('animationend', () => {
        prevCard.classList.remove('fly-out-left', 'fly-out-right');
        _hcSetSlots();
        _hc.animating = false;
      }, { once: true });
    } else {
      _hcSetSlots();
      _hc.animating = false;
    }
    /* Update dots immediately */
    document.querySelectorAll('.hcdot').forEach((d, i) => {
      d.classList.toggle('act', i === _hc.idx);
    });
  }

  function _hcStartAuto() {
    clearInterval(_hc.timer);
    _hc.timer = setInterval(() => _hcGo(1), 4500);
  }

  function _hcBindTouch() {
    const el = document.getElementById('hc');
    if (!el) return;
    el.addEventListener('touchstart', e => {
      _hc.touchX = e.touches[0].clientX;
      _hc.touchT = Date.now();
    }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _hc.touchX;
      const dt = Date.now() - _hc.touchT;
      if (Math.abs(dx) > 44 && dt < 420) {
        clearInterval(_hc.timer);
        _hcGo(dx < 0 ? 1 : -1);
        _hcStartAuto();
      }
    }, { passive: true });
  }

  /* ═══════════════════════════
     HOME PAGE
  ═══════════════════════════ */
  function home() {
    const pg = document.getElementById('page-home');
    _hc.shows = D.sections[0].ids.map(id => D.getShow(id)).filter(Boolean);
    _hc.idx = 0; _hc.animating = false;
    clearInterval(_hc.timer);

    let h = `<div id="tb"><span class="logo">ANIMEX</span></div>`;

    /* Hero carousel */
    h += `<div id="hc">
      <div class="hc-stack" id="hcs"></div>
      <div class="hcdots">`;
    _hc.shows.forEach((_, i) => h += `<div class="hcdot${i === 0 ? ' act' : ''}" onclick="P._hcGoTo(${i})"></div>`);
    h += `</div></div>`;

    /* Continue Watching */
    const cw = D.getContinueWatching();
    if (cw.length) {
      h += `<div class="sec stagger">
        <div class="sech"><span class="sect">Continue Watching</span></div>
        <div class="secr">`;
      cw.forEach(({ show: s, ep, pct }) => {
        h += `<div class="cwc" onclick="R.ep('${s.id}','${ep.id}')">
          <div class="cwcw">
            ${lazyImg(ep.thumb, 'cwci', ep.title)}
            <div class="cwcpb"><div class="cwcpbf" style="width:${pct}%"></div></div>
          </div>
          <div class="cwcn">${ep.title}</div>
          <div class="cwcs">S${ep.s} E${ep.e} · ${s.title}</div>
        </div>`;
      });
      h += `</div></div>`;
    }

    /* Watchlist section */
    if (D.wishlist.size) {
      h += `<div class="sec stagger">
        <div class="sech"><span class="sect">Your Watchlist</span></div>
        <div class="secr">`;
      [...D.wishlist].forEach(id => {
        const s = D.getShow(id); if (!s) return;
        h += _card(s);
      });
      h += `</div></div>`;
    }

    /* Content sections */
    D.sections.slice(1).forEach(sec => {
      h += `<div class="sec">
        <div class="sech">
          <span class="sect">${sec.title}</span>
          <button class="seca" onclick="R.seeAll('${sec.title}')">See all <i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="secr">`;
      sec.ids.forEach(id => { const s = D.getShow(id); if (s) h += _card(s); });
      h += `</div></div>`;
    });

    pg.innerHTML = h;

    /* Init carousel after DOM ready */
    requestAnimationFrame(() => {
      _hcRender();
      _hcBindTouch();
      _hcStartAuto();
      observeLazy(pg);
    });
  }

  /* ═══════════════════════════
     SEARCH PAGE
  ═══════════════════════════ */
  function search() {
    const pg = document.getElementById('page-search');
    const trending = (D.sections.find(x => x.title === 'Trending Now') || { ids: [] }).ids;
    pg.innerHTML = `<div id="sp">
      <div class="sbar">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="sinput" placeholder="Movies, shows and more" autocomplete="off">
        <i class="fa-solid fa-microphone" style="color:var(--w3)"></i>
      </div>
      <div class="srd act" id="sdefault">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span class="srh">Recent</span>
          <span class="srcl" id="clr-btn">Clear All</span>
        </div>
        <div class="sres" id="srecs">
          ${D.shows.slice(0, 3).map(s => `<div class="srec" onclick="R.show('${s.id}')">
            ${lazyImg(s.thumb, 'sreci', s.title)}
            <div class="srect">${s.title}</div>
          </div>`).join('')}
        </div>
        <div class="srh" style="margin-bottom:12px">Trending</div>
        <div class="tg">
          ${trending.map(id => {
            const s = D.getShow(id); if (!s) return '';
            return `<div class="tgc" onclick="R.show('${s.id}')">
              ${lazyImg(s.thumb, '', s.title)}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="srs" id="sresults"></div>
    </div>`;

    document.getElementById('sinput').addEventListener('input', e => _doSearch(e.target.value));
    document.getElementById('clr-btn').addEventListener('click', () => {
      document.getElementById('srecs').innerHTML = '';
    });
    observeLazy(pg);
  }

  function _doSearch(q) {
    const def = document.getElementById('sdefault');
    const res = document.getElementById('sresults');
    if (!q.trim()) { def.className = 'srd act'; res.className = 'srs'; return; }
    def.className = 'srd'; res.className = 'srs act';
    const hits = D.shows.filter(s =>
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(q.toLowerCase())
    );
    if (!hits.length) {
      res.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--w3)">No results for "${q}"</div>`;
      return;
    }
    res.innerHTML = `<div class="srl" style="padding:0 16px">` +
      hits.map(s => `<div class="src" onclick="R.show('${s.id}')">
        ${lazyImg(s.thumb, 'srci', s.title)}
        <div class="srcn">
          <div style="font-weight:600;margin-bottom:2px">${s.title}</div>
          <div style="color:var(--w4);font-size:10px">${s.subtitle}</div>
        </div>
        <i class="fa-solid fa-chevron-right" style="color:var(--w4);font-size:11px"></i>
      </div>`).join('') + `</div>`;
    observeLazy(res);
  }

  /* ═══════════════════════════
     PROFILE PAGE
  ═══════════════════════════ */
  function profile() {
    const wl = [...D.wishlist];
    const cw = D.getContinueWatching();
    const watched = Object.keys(D.shows.reduce((acc, s) => {
      if (D.getProgress(s.id, s.episodes[0]?.id) > 0) acc[s.id] = true;
      return acc;
    }, {}));

    let h = `<div id="prp">
      <div class="pr-header fade-up">
        <div class="pr-avatar"><span>A</span></div>
        <div class="pr-info">
          <div class="pr-name">Animex Viewer</div>
          <div class="pr-stats-inline">${wl.length} in watchlist · ${cw.length} in progress</div>
        </div>
      </div>`;

    if (cw.length) {
      h += `<div class="pr-section-title">Continue Watching</div>
        <div class="pr-continue-row">`;
      cw.slice(0, 6).forEach(({ show: s, ep, pct }) => {
        h += `<div class="pr-cw-card" onclick="R.ep('${s.id}','${ep.id}')">
          <div class="pr-cw-img-wrap">
            ${lazyImg(ep.thumb, '', ep.title)}
            <div class="pr-cw-bar"><div class="pr-cw-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="pr-cw-name">${s.title}</div>
          <div class="pr-cw-sub">EP ${ep.e} · ${pct}%</div>
        </div>`;
      });
      h += `</div>`;
    }

    if (wl.length) {
      h += `<div class="pr-section-title">Your Watchlist</div>
        <div class="pr-wl-grid">`;
      wl.forEach(id => {
        const s = D.getShow(id); if (!s) return;
        h += `<div class="pr-wl-card" onclick="R.show('${s.id}')">
          ${lazyImg(s.thumb, '', s.title)}
          <div class="pr-wl-overlay">
            <div class="pr-wl-name">${s.title}</div>
            <div class="pr-wl-meta">⭐${s.rating} · ${s.year}</div>
          </div>
        </div>`;
      });
      h += `</div>`;
    }

    if (!wl.length && !cw.length) {
      h += `<div class="pr-empty">
        <i class="fa-regular fa-face-smile-beam"></i>
        <p>Start watching to see your history here</p>
      </div>`;
    }

    h += `<div style="height:16px"></div></div>`;
    const pg = document.getElementById('page-profile');
    pg.innerHTML = h;
    observeLazy(pg);
  }

  /* ═══════════════════════════
     EPISODE LIST builder (shared)
  ═══════════════════════════ */
  function buildEps(showId, season, curEpId = null, collapsed = true) {
    const s = D.getShow(showId); if (!s) return '';
    const eps = s.episodes.filter(e => e.s === season);
    const SHOW_INIT = 4;
    const needsMore = eps.length > SHOW_INIT;
    const shown = (collapsed && needsMore) ? eps.slice(0, SHOW_INIT) : eps;

    let h = `<div class="eps-collapsible${collapsed && needsMore ? ' collapsed' : ''}" id="eps-col-${showId}-${season}">`;
    shown.forEach(e => {
      const pct = D.getProgress(showId, e.id);
      const active = e.id === curEpId;
      h += `<div class="er${active ? ' er-active' : ''}" onclick="R.ep('${showId}','${e.id}')">
        <div class="er-thumb-wrap">
          ${lazyImg(e.thumb, 'eri', e.title)}
          ${pct > 2 ? `<div class="ep-pbar"><div class="ep-pbar-fill" style="width:${pct}%"></div></div>` : ''}
          <div class="erio"><i class="fa-solid fa-play"></i></div>
        </div>
        <div class="erib">
          <div class="ern">${e.title}</div>
          <div class="erm">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div>
          <div class="erd">${e.desc}</div>
        </div>
      </div>`;
    });
    h += `</div>`;

    if (needsMore) {
      const remaining = eps.length - SHOW_INIT;
      h += `<button class="view-more-btn" id="vmb-${showId}-${season}" 
        onclick="P.toggleViewMore('${showId}',${season},this)">
        <i class="fa-solid fa-chevron-down"></i>
        <span>${collapsed ? `Show ${remaining} more episodes` : 'Show less'}</span>
      </button>`;
    }
    return h;
  }

  function toggleViewMore(showId, season, btn) {
    const s = D.getShow(showId); if (!s) return;
    const container = document.getElementById(`eps-col-${showId}-${season}`);
    if (!container) return;
    const isCollapsed = container.classList.contains('collapsed');
    const eps = s.episodes.filter(e => e.s === season);
    const SHOW_INIT = 4;

    if (isCollapsed) {
      /* Expand: render remaining episodes */
      const remaining = eps.slice(SHOW_INIT);
      let extra = '';
      remaining.forEach(e => {
        const pct = D.getProgress(showId, e.id);
        extra += `<div class="er" onclick="R.ep('${showId}','${e.id}')">
          <div class="er-thumb-wrap">
            ${lazyImg(e.thumb, 'eri', e.title)}
            ${pct > 2 ? `<div class="ep-pbar"><div class="ep-pbar-fill" style="width:${pct}%"></div></div>` : ''}
            <div class="erio"><i class="fa-solid fa-play"></i></div>
          </div>
          <div class="erib">
            <div class="ern">${e.title}</div>
            <div class="erm">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div>
            <div class="erd">${e.desc}</div>
          </div>
        </div>`;
      });
      container.insertAdjacentHTML('beforeend', extra);
      container.classList.remove('collapsed');
      container.style.maxHeight = '';
      observeLazy(container);
      btn.classList.add('open');
      btn.innerHTML = `<i class="fa-solid fa-chevron-down"></i><span>Show less</span>`;
    } else {
      /* Collapse */
      container.classList.add('collapsed');
      const remaining = eps.length - SHOW_INIT;
      /* Remove extra nodes */
      const rows = container.querySelectorAll('.er');
      rows.forEach((r, i) => { if (i >= SHOW_INIT) r.remove(); });
      btn.classList.remove('open');
      btn.innerHTML = `<i class="fa-solid fa-chevron-down"></i><span>Show ${remaining} more episodes</span>`;
    }
  }

  /* ═══════════════════════════
     Public exports
  ═══════════════════════════ */
  return {
    home, search, profile,
    buildEps, toggleViewMore,
    toast, lazyImg, observeLazy,
    _card, wlBtnHtml,
    _hcGoTo(idx) {
      if (idx === _hc.idx) return;
      const dir = ((idx - _hc.idx + _hc.shows.length) % _hc.shows.length) <= _hc.shows.length / 2 ? 1 : -1;
      clearInterval(_hc.timer);
      _hc.idx = idx; /* jump directly */
      _hcSetSlots();
      document.querySelectorAll('.hcdot').forEach((d, i) => d.classList.toggle('act', i === idx));
      _hcStartAuto();
    }
  };

  function _hcSetSlots() {
    const total = _hc.shows.length;
    _hc.shows.forEach((_, i) => {
      const card = document.getElementById('hcd' + i);
      if (!card) return;
      const slot = ((i - _hc.idx) + total) % total;
      card.dataset.slot = slot;
      card.style.pointerEvents = slot === 0 ? 'auto' : 'none';
    });
  }

  function _hcStartAuto() {
    clearInterval(_hc.timer);
    _hc.timer = setInterval(() => _hcGo(1), 4500);
  }

  function _hcGo(dir) {
    if (_hc.animating) return;
    _hc.animating = true;
    const total = _hc.shows.length;
    const prevIdx = _hc.idx;
    _hc.idx = ((_hc.idx + dir) + total) % total;

    const prevCard = document.getElementById('hcd' + prevIdx);
    if (prevCard) {
      prevCard.classList.add(dir > 0 ? 'fly-out-left' : 'fly-out-right');
      prevCard.addEventListener('animationend', () => {
        prevCard.classList.remove('fly-out-left', 'fly-out-right');
        _hcSetSlots();
        _hc.animating = false;
      }, { once: true });
    } else {
      _hcSetSlots();
      _hc.animating = false;
    }
    document.querySelectorAll('.hcdot').forEach((d, i) => d.classList.toggle('act', i === _hc.idx));
  }
})();