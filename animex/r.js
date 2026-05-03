/* ═══════════════════════════════════════════════
   AnimeX · r.js  — Router v3
   ═══════════════════════════════════════════════ */
const R = (() => {
  'use strict';

  let _curShow = null, _curEp = null, _cur = 'home';

  /* ── Overlay refs ── */
  const _sdo  = () => document.getElementById('sdo');
  const _evo  = () => document.getElementById('evo');
  const _sao  = () => document.getElementById('sao');

  /* ── Close all overlays silently ── */
  function _closeAll() {
    const sdo = _sdo(), evo = _evo(), sao = _sao();
    if (sdo.classList.contains('open')) {
      sdo.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => { sdo.innerHTML = ''; }, 380);
    }
    if (evo.classList.contains('open')) {
      evo.classList.remove('open');
      document.body.style.overflow = '';
      NV.destroy();
      setTimeout(() => { evo.innerHTML = ''; }, 380);
    }
    if (sao.classList.contains('open')) {
      sao.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => { sao.innerHTML = ''; }, 380);
    }
  }

  /* ══════════════════════════════
     ROUTING
  ══════════════════════════════ */
  function init() {
    const h = location.hash.slice(1) || 'home';
    _route(h);
    window.addEventListener('hashchange', () => _route(location.hash.slice(1) || 'home'));
    document.querySelectorAll('.bni[data-pg]').forEach(el =>
      el.addEventListener('click', () => { location.hash = el.dataset.pg; })
    );
    document.getElementById('bni-home-btn').addEventListener('click', () => { location.hash = 'home'; });
  }

  function _route(h) {
    const parts = h.split('/');
    const pg = parts[0];

    if (pg === 'show') { show(parts[1], false); return; }
    if (pg === 'ep')   { ep(parts[1], parts[2], false); return; }
    if (pg === 'see')  { seeAll(decodeURIComponent(parts[1]), false); return; }

    _closeAll();

    document.querySelectorAll('.pg').forEach(el => el.classList.remove('act'));
    document.querySelectorAll('.bni[data-pg]').forEach(el =>
      el.classList.toggle('act', el.dataset.pg === pg)
    );
    document.getElementById('bni-home-btn').classList.toggle('act', pg === 'home');

    const page = document.getElementById('page-' + pg);
    if (!page) return;
    page.classList.add('act');

    if (pg === 'home')    P.home();
    else if (pg === 'search')  P.search();
    else if (pg === 'profile') P.profile();

    _cur = pg;
  }

  /* ══════════════════════════════
     SHOW DETAIL OVERLAY
  ══════════════════════════════ */
  function show(id, push = true) {
    const s = D.getShow(id); if (!s) return;
    if (push) history.pushState(null, '', '#show/' + id);

    const wl = D.wishlist.has(id);
    const langsStr = s.langs.map(l => D.langLabels[l] || l).join(', ');
    const el = _sdo();

    let h = `
    <div class="sdoh">
      ${P.lazyImg(s.hero, 'sdohi', s.title)}
      <div class="sdoho"></div>
      <div class="sdoclose" onclick="R.closeShow()"><i class="fa-solid fa-xmark"></i></div>
    </div>
    <div class="sdob">
      <div class="sdologo">${s.title}</div>
      <div class="sdometa">${s.year} · ${s.seasons} Season${s.seasons > 1 ? 's' : ''} · ${langsStr} · ⭐ ${s.rating}</div>
      <button class="sdoplay" onclick="R.ep('${id}','${s.episodes[0].id}')">
        <i class="fa-solid fa-play"></i> Watch · S${s.episodes[0].s} E${s.episodes[0].e}
      </button>
      <div class="sdogens">${s.genres.map(g => `<span class="sdogen">${g}</span>`).join('')}</div>
      <div class="sdodesc">${s.desc}</div>
      <div class="sdoacts">
        <button class="sdoact wl-btn${wl ? ' on' : ''}" data-wl-show="${id}"
          onclick="P._toggleWLShow('${id}',this)">
          <i class="fa-${wl ? 'solid fa-check' : 'regular fa-bookmark'}"></i>
          <span>Watchlist</span>
        </button>
        <button class="sdoact" onclick="P.toast('Shared!')">
          <i class="fa-solid fa-share-nodes"></i><span>Share</span>
        </button>
        <button class="sdoact" onclick="P.toast('Rated!')">
          <i class="fa-regular fa-heart"></i><span>Rate</span>
        </button>
      </div>
      <div class="sec-heading">${s.title} — Episodes</div>
      <div class="stabs" id="stabs">`;
    for (let i = 1; i <= s.seasons; i++) {
      h += `<div class="stab${i === 1 ? ' act' : ''}" onclick="R.switchSeason('${id}',${i},this)">Season ${i}</div>`;
    }
    h += `</div>
      <div id="eps-list">${P.buildEps(id, 1)}</div>
      <div class="sec-heading">More Like This</div>
      <div class="mlts">`;
    D.shows.filter(x => x.id !== id).slice(0, 6).forEach(ms => { h += P._card(ms); });
    h += `</div></div>`;

    el.innerHTML = h;
    requestAnimationFrame(() => el.classList.add('open'));
    document.body.style.overflow = 'hidden';
    P.observeLazy(el);
  }

  function switchSeason(showId, n, tabEl) {
    document.querySelectorAll('.stab').forEach(t => t.classList.remove('act'));
    tabEl.classList.add('act');
    document.getElementById('eps-list').innerHTML = P.buildEps(showId, n);
    P.observeLazy(document.getElementById('eps-list'));
  }

  function closeShow() {
    const el = _sdo();
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { el.innerHTML = ''; history.back(); }, 380);
  }

  /* ══════════════════════════════
     EPISODE PLAYER OVERLAY
  ══════════════════════════════ */
  function ep(showId, epId, push = true) {
    const s  = D.getShow(showId); if (!s) return;
    const epData = D.getEp(showId, epId); if (!epData) return;
    const evoEl = _evo();
    const isOpen = evoEl.classList.contains('open');

    if (isOpen) {
      /* Switch episode in-place */
      _curShow = showId; _curEp = epId;
      NV.destroy();
      _buildEvoBody(s, epData, showId, evoEl);
      NV.init(showId, epId, s, epData);
      return;
    }

    if (push) history.pushState(null, '', '#ep/' + showId + '/' + epId);
    _curShow = showId; _curEp = epId;
    _buildEvoBody(s, epData, showId, evoEl);
    requestAnimationFrame(() => evoEl.classList.add('open'));
    document.body.style.overflow = 'hidden';
    NV.init(showId, epId, s, epData);
  }

  function _buildEvoBody(s, epData, showId, evoEl) {
    const wl = D.wishlist.has(showId);
    const langsStr = s.langs.map(l => D.langLabels[l] || l).join(', ');

    let h = `
    <div id="evo-topbar">
      <div id="evo-topbar-back" onclick="R.closeEp()"><i class="fa-solid fa-chevron-down"></i></div>
      <div id="evo-topbar-title">${s.title} · S${epData.s} E${epData.e}</div>
    </div>
    <div id="np-page">
      <div id="np-page-title"></div>
      <div id="np-root" role="region" tabindex="-1">
        <video id="np-video" preload="metadata" playsinline webkit-playsinline></video>
        <img id="np-thumb" alt="thumbnail" draggable="false">
        <div id="np-spinner" role="status"></div>
        <div id="np-speed-hold">2×</div>
        <div id="np-nudge"></div>
        <div id="np-nudge-left"></div>
        <div id="np-nudge-right"></div>
        <div id="np-overlay" role="presentation" aria-hidden="true"></div>
        <button id="np-center-play" class="np-btn"></button>
        <div id="np-top-bar">
          <div id="np-fs-title"></div>
          <div style="display:flex;gap:8px;margin-left:auto">
            <div style="position:relative">
              <button id="np-quality" class="np-btn np-btn-label" aria-haspopup="true"></button>
              <div id="np-quality-menu" class="np-menu dropdown custom-scroll" role="menu"></div>
            </div>
            <div style="position:relative">
              <button id="np-lang" class="np-btn np-btn-label" aria-haspopup="true"></button>
              <div id="np-lang-menu" class="np-menu dropdown custom-scroll" role="menu"></div>
            </div>
          </div>
        </div>
        <div id="np-controls" role="toolbar">
          <div id="np-seek-wrap" role="slider" tabindex="0">
            <div id="np-seek-track">
              <div id="np-seek-buf"></div>
              <div id="np-seek-fill"></div>
              <div id="np-seek-thumb"></div>
              <div id="np-seek-hover"></div>
            </div>
          </div>
          <div id="np-bottom-layout">
            <div style="display:flex;align-items:center;gap:10px">
              <img id="np-current-thumb" alt="" style="width:54px;height:30px;border-radius:5px;object-fit:cover;background:#000;box-shadow:0 2px 8px rgba(0,0,0,.5)">
              <div class="np-ctrl-group">
                <button id="np-prev" class="np-btn" title="Previous"></button>
                <button id="np-play" class="np-btn" title="Play"></button>
                <button id="np-next" class="np-btn" title="Next"></button>
                <div id="np-vol-wrap">
                  <button id="np-vol" class="np-btn"></button>
                  <div id="np-vol-slider-wrap">
                    <div id="np-vol-track">
                      <div id="np-vol-fill"></div>
                      <input type="range" id="np-vol-slider" min="0" max="1" step="0.02" value="1">
                    </div>
                  </div>
                </div>
                <span id="np-time">0:00 / 0:00</span>
              </div>
            </div>
            <div class="np-ctrl-group">
              <div style="position:relative">
                <button id="np-speed" class="np-btn np-btn-label"></button>
                <div id="np-speed-menu" class="np-menu dropup custom-scroll" role="menu"></div>
              </div>
              <button id="np-pl" class="np-btn" title="Episodes"></button>
              <button id="np-fs" class="np-btn" title="Fullscreen"></button>
            </div>
          </div>
        </div>
        <div id="np-pl-panel" role="complementary">
          <div id="np-pl-header">
            <span>Episodes</span>
            <button id="np-pl-close" class="np-btn"></button>
          </div>
          <ul id="np-pl-list" class="custom-scroll" role="listbox"></ul>
        </div>
      </div>
    </div>
    <div id="evo-body">
      <div class="evot">${epData.title}</div>
      <div class="evom">S${epData.s} E${epData.e} · ${epData.date} · ${epData.dur}</div>
      <div style="font-size:11px;color:var(--w3);line-height:1.6;margin-bottom:14px">${epData.desc}</div>
      <div class="evoacts">
        <button class="evoact wl-btn${wl ? ' on' : ''}" data-wl-show="${showId}"
          onclick="P._toggleWLShow('${showId}',this)">
          <i class="fa-${wl ? 'solid fa-check' : 'regular fa-bookmark'}"></i><span>Watchlist</span>
        </button>
        <button class="evoact" onclick="P.toast('Shared!')">
          <i class="fa-solid fa-share-nodes"></i><span>Share</span>
        </button>
        <button class="evoact" onclick="P.toast('Rated!')">
          <i class="fa-regular fa-heart"></i><span>Rate</span>
        </button>
      </div>
      <div class="sec-heading">${s.title} — Episodes</div>
      <div class="stabs" id="evo-stabs">`;
    for (let i = 1; i <= s.seasons; i++) {
      h += `<div class="stab${i === epData.s ? ' act' : ''}" onclick="R._evoSwitchSeason('${showId}',${i},this)">Season ${i}</div>`;
    }
    h += `</div>
      <div id="evo-eps-list">${P.buildEps(showId, epData.s, epData.id)}</div>`;

    /* You May Like */
    const related = D.shows.filter(x => x.id !== showId).slice(0, 8);
    if (related.length) {
      h += `<div class="sec-heading">You May Like</div>
        <div class="secr" style="padding:0 0 8px">`;
      related.forEach(ms => h += P._card(ms));
      h += `</div>`;
    }
    h += `</div>`;

    evoEl.innerHTML = h;
    P.observeLazy(evoEl);
  }

  function _evoSwitchSeason(showId, n, tabEl) {
    document.querySelectorAll('#evo-stabs .stab').forEach(t => t.classList.remove('act'));
    tabEl.classList.add('act');
    const container = document.getElementById('evo-eps-list');
    container.innerHTML = P.buildEps(showId, n, _curEp);
    P.observeLazy(container);
  }

  function closeEp() {
    NV.destroy();
    const el = _evo();
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { el.innerHTML = ''; }, 380);
    const hash = location.hash.slice(1);
    if (hash.startsWith('ep/')) history.back();
  }

  /* ══════════════════════════════
     SEE ALL OVERLAY
  ══════════════════════════════ */
  function seeAll(title, push = true) {
    const sec = D.sections.find(x => x.title === title); if (!sec) return;
    if (push) history.pushState(null, '', '#see/' + encodeURIComponent(title));
    const el = _sao();
    let h = `
    <div class="saotb">
      <div class="saotb-back" onclick="R.closeSeeAll()"><i class="fa-solid fa-chevron-left"></i></div>
      <div class="saotb-title">${title}</div>
    </div>
    <div class="saobody">
      <div class="saogrid">`;
    sec.ids.forEach(id => { const s = D.getShow(id); if (s) h += P._card(s); });
    h += `</div></div>`;
    el.innerHTML = h;
    requestAnimationFrame(() => el.classList.add('open'));
    document.body.style.overflow = 'hidden';
    P.observeLazy(el);
  }

  function closeSeeAll() {
    const el = _sao();
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { el.innerHTML = ''; history.back(); }, 380);
  }

  /* ── Expose ── */
  return { init, show, ep, seeAll, closeShow, closeEp, closeSeeAll, switchSeason, _evoSwitchSeason };
})();

/* ── Expose watchlist show-detail toggle to P ── */
P._toggleWLShow = function(id, btn) {
  const on = D.toggleWL(id);
  /* update all overlay action buttons */
  document.querySelectorAll(`[data-wl-show="${id}"]`).forEach(b => {
    b.classList.toggle('on', on);
    b.innerHTML = `<i class="fa-${on ? 'solid fa-check' : 'regular fa-bookmark'}"></i><span>Watchlist</span>`;
  });
  /* update all card btnw buttons */
  document.querySelectorAll(`[data-wl="${id}"]`).forEach(b => {
    b.classList.toggle('on', on);
    b.setAttribute('aria-label', on ? 'Remove from watchlist' : 'Add to watchlist');
    b.innerHTML = `<i class="fa-solid ${on ? 'fa-check' : 'fa-plus'}"></i>`;
  });
  P.toast(on ? 'Added to Watchlist' : 'Removed from Watchlist');
};

document.addEventListener('DOMContentLoaded', () => R.init());