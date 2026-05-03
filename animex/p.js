/* AnimeX · p.js — Pages & UI v4
   - Lazy images: IntersectionObserver + requestIdleCallback + createImageBitmap decode
   - Image cache via Cache API (CacheStorage) with fallback to memory
   - No download buttons
   - Global keyboard shortcuts: 1/2/3 = pages, / = search, ? = help
*/
const P = (() => {
  'use strict';

  /* ── Image Cache (Cache API with memory fallback) ── */
  const _memCache = new Map();
  const CACHE_NAME = 'animex-img-v1';
  let _cacheReady = null;
  function _getCache() {
    if (!_cacheReady) _cacheReady = 'caches' in window ? caches.open(CACHE_NAME) : Promise.resolve(null);
    return _cacheReady;
  }

  /* ── Lazy image observer with decode acceleration ── */
  const _imgObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        const src = img.dataset.src;
        if (!src) { _imgObs.unobserve(img); return; }
        _imgObs.unobserve(img);
        /* Schedule decode off-main-thread when browser is idle */
        const load = () => {
          if (_memCache.has(src)) {
            img.src = src;
            img.classList.add('loaded');
            return;
          }
          _getCache().then(cache => {
            if (cache) {
              return cache.match(src).then(resp => {
                if (resp) return resp.blob();
                return fetch(src).then(r => { cache.put(src, r.clone()); return r.blob(); });
              });
            }
            return fetch(src).then(r => r.blob());
          }).then(blob => {
            if (typeof createImageBitmap !== 'undefined') {
              return createImageBitmap(blob).then(bmp => { bmp.close(); return URL.createObjectURL(blob); });
            }
            return URL.createObjectURL(blob);
          }).then(url => {
            _memCache.set(src, url);
            img.src = url;
            img.classList.add('loaded');
          }).catch(() => {
            img.src = src;
            img.classList.add('loaded');
          });
        };
        if ('requestIdleCallback' in window) {
          requestIdleCallback(load, { timeout: 800 });
        } else {
          setTimeout(load, 0);
        }
        delete img.dataset.src;
      }
    });
  }, { rootMargin: '180px' });

  function lazyImg(src, cls, alt = '') {
    return `<img data-src="${src}" src="" class="${cls}" alt="${alt}" loading="lazy">`;
  }
  function observeLazy(container) {
    container.querySelectorAll('img[data-src]').forEach(img => _imgObs.observe(img));
  }

  /* ── Watchlist button ── */
  function wlBtnHtml(id, extraClass = '') {
    const on = D.wishlist.has(id);
    return `<button class="btnw${on?' on':''}${extraClass?' '+extraClass:''}" data-wl="${id}" aria-label="${on?'Remove from watchlist':'Add to watchlist'}">
      <span class="material-icons">${on?'check':'add'}</span>
    </button>`;
  }

  /* ── Show card ── */
  function _card(s) {
    return `<div class="sc" onclick="R.show('${s.id}')">
      <div class="sc-inner">
        ${lazyImg(s.thumb,'sci',s.title)}
        <div class="sc-overlay">
          <div class="sc-title">${s.title||'Untitled'}</div>
          <div class="sc-meta">⭐${s.rating} · ${s.year}</div>
        </div>
      </div>
    </div>`;
  }

  /* ── Toast ── */
  let _tt=null;
  function toast(msg){
    const t=document.getElementById('toast');
    t.textContent=msg;t.classList.add('show');
    clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2400);
  }

  /* ── Global watchlist toggle ── */
  function _handleWLClick(e) {
    const btn=e.target.closest('[data-wl]');
    if(!btn)return;e.stopPropagation();
    const id=btn.dataset.wl,on=D.toggleWL(id);
    document.querySelectorAll(`[data-wl="${id}"]`).forEach(b=>{
      b.classList.toggle('on',on);
      b.setAttribute('aria-label',on?'Remove from watchlist':'Add to watchlist');
      b.innerHTML=`<span class="material-icons">${on?'check':'add'}</span>`;
    });
    document.querySelectorAll(`[data-wl-show="${id}"]`).forEach(b=>{
      b.classList.toggle('on',on);
      b.innerHTML=`<span class="material-icons">${on?'check':'bookmark_border'}</span><span>Watchlist</span>`;
    });
    toast(on?'Added to Watchlist':'Removed from Watchlist');
  }
  document.addEventListener('click',_handleWLClick);

  /* ── Global keyboard shortcuts ── */
  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;
    const evo=document.getElementById('evo');
    /* Don't intercept when player is open */
    if(evo&&evo.classList.contains('open'))return;
    switch(e.key){
      case'1':location.hash='home';break;
      case'2':location.hash='search';break;
      case'3':location.hash='profile';break;
      case'/':e.preventDefault();location.hash='search';setTimeout(()=>{const i=document.getElementById('sinput');if(i)i.focus();},200);break;
      case'?':toast('Keys: 1=Home 2=Search 3=Profile /=Search Space=Play ←→=Seek F=Fullscreen M=Mute');break;
    }
  });

  /* ══════════════ HERO CAROUSEL ══════════════ */
  let _hc={shows:[],idx:0,timer:null,animating:false,touchX:0,touchT:0};

  function _hcRender(){
    const container=document.getElementById('hcs');if(!container)return;
    container.innerHTML='';
    _hc.shows.forEach((s,i)=>{
      const div=document.createElement('div');div.className='hcd';div.id='hcd'+i;
      div.innerHTML=`${lazyImg(s.thumb,'hci',s.title)}<div class="hco"></div><div class="hcb">
        <div class="hct">${s.title||'Untitled'}</div>
        <div class="hcm">${s.year} · ${s.subtitle.split(' · ')[0]}</div>
        <div class="hca">
          <button class="btnp" onclick="event.stopPropagation();R.ep('${s.id}','${s.episodes[0].id}')">
            <span class="material-icons">play_arrow</span> Play
          </button>
          ${wlBtnHtml(s.id)}
          <button class="btninfo" onclick="event.stopPropagation();R.show('${s.id}')">
            <span class="material-icons">info</span>
          </button>
        </div>
      </div>`;
      div.addEventListener('click',e=>{if(e.target.closest('.btnp')||e.target.closest('.btnw')||e.target.closest('.btninfo'))return;R.show(s.id);});
      container.appendChild(div);
    });
    _hcSetSlots();observeLazy(container);
  }

  function _hcSetSlots(){
    const total=_hc.shows.length;
    _hc.shows.forEach((_,i)=>{
      const card=document.getElementById('hcd'+i);if(!card)return;
      const slot=(i-_hc.idx+total)%total;card.dataset.slot=slot;
      card.style.pointerEvents=slot===0?'auto':'none';
    });
    document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===_hc.idx));
  }

  function _hcGo(dir){
    if(_hc.animating)return;_hc.animating=true;
    const total=_hc.shows.length,prevIdx=_hc.idx;
    _hc.idx=((_hc.idx+dir)+total)%total;
    const prevCard=document.getElementById('hcd'+prevIdx);
    if(prevCard){
      prevCard.classList.add(dir>0?'fly-out-left':'fly-out-right');
      prevCard.addEventListener('animationend',()=>{prevCard.classList.remove('fly-out-left','fly-out-right');_hcSetSlots();_hc.animating=false;},{once:true});
    }else{_hcSetSlots();_hc.animating=false;}
    document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===_hc.idx));
  }

  function _hcStartAuto(){clearInterval(_hc.timer);_hc.timer=setInterval(()=>_hcGo(1),4500);}

  function _hcBindTouch(){
    const el=document.getElementById('hc');if(!el)return;
    el.addEventListener('touchstart',e=>{_hc.touchX=e.touches[0].clientX;_hc.touchT=Date.now();},{passive:true});
    el.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-_hc.touchX,dt=Date.now()-_hc.touchT;
      if(Math.abs(dx)>44&&dt<420){clearInterval(_hc.timer);_hcGo(dx<0?1:-1);_hcStartAuto();}
    },{passive:true});
  }

  /* ══════════════ HOME ══════════════ */
  function home(){
    const pg=document.getElementById('page-home');
    _hc.shows=D.sections[0].ids.map(id=>D.getShow(id)).filter(Boolean);
    _hc.idx=0;_hc.animating=false;clearInterval(_hc.timer);
    let h=`<div id="tb"><span class="logo">ANIMEX</span></div>`;
    h+=`<div id="hc"><div class="hc-stack" id="hcs"></div><div class="hcdots">`;
    _hc.shows.forEach((_,i)=>h+=`<div class="hcdot${i===0?' act':''}" onclick="P._hcGoTo(${i})"></div>`);
    h+=`</div></div>`;
    const cw=D.getContinueWatching();
    if(cw.length){
      h+=`<div class="sec stagger"><div class="sech"><span class="sect">Continue Watching</span></div><div class="secr">`;
      cw.forEach(({show:s,ep,pct})=>{h+=`<div class="cwc" onclick="R.ep('${s.id}','${ep.id}')">
        <div class="cwcw">${lazyImg(ep.thumb,'cwci',ep.title)}<div class="cwcpb"><div class="cwcpbf" style="width:${pct}%"></div></div></div>
        <div class="cwcn">${ep.title||'Untitled'}</div><div class="cwcs">S${ep.s} E${ep.e} · ${s.title}</div></div>`;});
      h+=`</div></div>`;
    }
    if(D.wishlist.size){
      h+=`<div class="sec stagger"><div class="sech"><span class="sect">Your Watchlist</span></div><div class="secr">`;
      [...D.wishlist].forEach(id=>{const s=D.getShow(id);if(s)h+=_card(s);});
      h+=`</div></div>`;
    }
    D.sections.slice(1).forEach(sec=>{
      h+=`<div class="sec"><div class="sech"><span class="sect">${sec.title}</span>
        <button class="seca" onclick="R.seeAll('${sec.title}')">See all <span class="material-icons" style="font-size:11px">chevron_right</span></button>
      </div><div class="secr">`;
      sec.ids.forEach(id=>{const s=D.getShow(id);if(s)h+=_card(s);});
      h+=`</div></div>`;
    });
    pg.innerHTML=h;
    requestAnimationFrame(()=>{_hcRender();_hcBindTouch();_hcStartAuto();observeLazy(pg);});
  }

  /* ══════════════ SEARCH ══════════════ */
  function search(){
    const pg=document.getElementById('page-search');
    const trending=(D.sections.find(x=>x.title==='Trending Now')||{ids:[]}).ids;
    pg.innerHTML=`<div id="sp">
      <div class="sbar">
        <span class="material-icons" style="color:var(--w3);font-size:20px">search</span>
        <input id="sinput" placeholder="Movies, shows and more" autocomplete="off">
        <span class="material-icons" style="color:var(--w3);font-size:20px">mic</span>
      </div>
      <div class="srd act" id="sdefault">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span class="srh">Recent</span><span class="srcl" id="clr-btn">Clear All</span>
        </div>
        <div class="sres" id="srecs">
          ${D.shows.slice(0,3).map(s=>`<div class="srec" onclick="R.show('${s.id}')">
            ${lazyImg(s.thumb,'sreci',s.title)}<div class="srect">${s.title||'Untitled'}</div></div>`).join('')}
        </div>
        <div class="srh" style="margin-bottom:12px">Trending</div>
        <div class="tg">
          ${trending.map(id=>{const s=D.getShow(id);if(!s)return'';return`<div class="tgc" onclick="R.show('${s.id}')">${lazyImg(s.thumb,'',s.title)}</div>`;}).join('')}
        </div>
      </div>
      <div class="srs" id="sresults"></div>
    </div>`;
    document.getElementById('sinput').addEventListener('input',e=>_doSearch(e.target.value));
    document.getElementById('clr-btn').addEventListener('click',()=>{document.getElementById('srecs').innerHTML='';});
    observeLazy(pg);
  }

  function _doSearch(q){
    const def=document.getElementById('sdefault'),res=document.getElementById('sresults');
    if(!q.trim()){def.className='srd act';res.className='srs';return;}
    def.className='srd';res.className='srs act';
    const hits=D.shows.filter(s=>s.title.toLowerCase().includes(q.toLowerCase())||s.subtitle.toLowerCase().includes(q.toLowerCase()));
    if(!hits.length){res.innerHTML=`<div style="padding:32px 16px;text-align:center;color:var(--w3)">No results for "${q}"</div>`;return;}
    res.innerHTML=`<div class="srl" style="padding:0 16px">`+
      hits.map(s=>`<div class="src" onclick="R.show('${s.id}')">
        ${lazyImg(s.thumb,'srci',s.title)}
        <div class="srcn"><div style="font-weight:600;margin-bottom:2px">${s.title||'Untitled'}</div><div style="color:var(--w4);font-size:10px">${s.subtitle}</div></div>
        <span class="material-icons" style="color:var(--w4);font-size:14px">chevron_right</span>
      </div>`).join('')+`</div>`;
    observeLazy(res);
  }

  /* ══════════════ PROFILE ══════════════ */
  function profile(){
    const wl=[...D.wishlist],cw=D.getContinueWatching();
    let h=`<div id="prp">
      <div class="pr-header fade-up">
        <div class="pr-avatar"><span>A</span></div>
        <div class="pr-info">
          <div class="pr-name">Animex Viewer</div>
          <div class="pr-stats-inline">${wl.length} in watchlist · ${cw.length} in progress</div>
        </div>
      </div>`;
    if(cw.length){
      h+=`<div class="pr-section-title">Continue Watching</div><div class="pr-continue-row">`;
      cw.slice(0,6).forEach(({show:s,ep,pct})=>{h+=`<div class="pr-cw-card" onclick="R.ep('${s.id}','${ep.id}')">
        <div class="pr-cw-img-wrap">${lazyImg(ep.thumb,'',ep.title)}<div class="pr-cw-bar"><div class="pr-cw-fill" style="width:${pct}%"></div></div></div>
        <div class="pr-cw-name">${s.title||'Untitled'}</div><div class="pr-cw-sub">EP ${ep.e} · ${pct}%</div></div>`;});
      h+=`</div>`;
    }
    if(wl.length){
      h+=`<div class="pr-section-title">Your Watchlist</div><div class="pr-wl-grid">`;
      wl.forEach(id=>{const s=D.getShow(id);if(!s)return;h+=`<div class="pr-wl-card" onclick="R.show('${s.id}')">
        ${lazyImg(s.thumb,'',s.title)}
        <div class="pr-wl-overlay"><div class="pr-wl-name">${s.title||'Untitled'}</div><div class="pr-wl-meta">⭐${s.rating} · ${s.year}</div></div></div>`;});
      h+=`</div>`;
    }
    if(!wl.length&&!cw.length)h+=`<div class="pr-empty"><span class="material-icons" style="font-size:40px;display:block;margin-bottom:12px;color:var(--w4)">sentiment_satisfied</span><p>Start watching to see your history here</p></div>`;
    h+=`<div style="height:16px"></div></div>`;
    const pg=document.getElementById('page-profile');pg.innerHTML=h;observeLazy(pg);
  }

  /* ══════════════ EPISODE LIST ══════════════ */
  function buildEps(showId,season,curEpId=null,collapsed=true){
    const s=D.getShow(showId);if(!s)return'';
    const eps=s.episodes.filter(e=>e.s===season);
    const SHOW_INIT=4,needsMore=eps.length>SHOW_INIT;
    const shown=(collapsed&&needsMore)?eps.slice(0,SHOW_INIT):eps;
    let h=`<div class="eps-collapsible${collapsed&&needsMore?' collapsed':''}" id="eps-col-${showId}-${season}">`;
    shown.forEach(e=>{
      const pct=D.getProgress(showId,e.id),active=e.id===curEpId;
      h+=`<div class="er${active?' er-active':''}" onclick="R.ep('${showId}','${e.id}')">
        <div class="er-thumb-wrap">
          ${lazyImg(e.thumb,'eri',e.title)}
          ${pct>2?`<div class="ep-pbar"><div class="ep-pbar-fill" style="width:${pct}%"></div></div>`:''}
          <div class="erio"><span class="material-icons">play_arrow</span></div>
        </div>
        <div class="erib">
          <div class="ern">${e.title||'Untitled'}</div>
          <div class="erm">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div>
          <div class="erd">${e.desc||''}</div>
        </div>
      </div>`;
    });
    h+=`</div>`;
    if(needsMore){
      const remaining=eps.length-SHOW_INIT;
      h+=`<button class="view-more-btn" id="vmb-${showId}-${season}" onclick="P.toggleViewMore('${showId}',${season},this)">
        <span class="material-icons" style="font-size:14px">expand_more</span>
        <span>${collapsed?`Show ${remaining} more episodes`:'Show less'}</span>
      </button>`;
    }
    return h;
  }

  function toggleViewMore(showId,season,btn){
    const s=D.getShow(showId);if(!s)return;
    const container=document.getElementById(`eps-col-${showId}-${season}`);if(!container)return;
    const isCollapsed=container.classList.contains('collapsed');
    const eps=s.episodes.filter(e=>e.s===season);
    const SHOW_INIT=4;
    if(isCollapsed){
      const remaining=eps.slice(SHOW_INIT);let extra='';
      remaining.forEach(e=>{
        const pct=D.getProgress(showId,e.id);
        extra+=`<div class="er" onclick="R.ep('${showId}','${e.id}')">
          <div class="er-thumb-wrap">
            ${lazyImg(e.thumb,'eri',e.title)}
            ${pct>2?`<div class="ep-pbar"><div class="ep-pbar-fill" style="width:${pct}%"></div></div>`:''}
            <div class="erio"><span class="material-icons">play_arrow</span></div>
          </div>
          <div class="erib"><div class="ern">${e.title||'Untitled'}</div>
          <div class="erm">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div>
          <div class="erd">${e.desc||''}</div></div></div>`;
      });
      container.insertAdjacentHTML('beforeend',extra);
      container.classList.remove('collapsed');container.style.maxHeight='';
      observeLazy(container);
      btn.classList.add('open');
      btn.innerHTML=`<span class="material-icons" style="font-size:14px">expand_less</span><span>Show less</span>`;
    }else{
      container.classList.add('collapsed');
      const remaining=eps.length-SHOW_INIT;
      container.querySelectorAll('.er').forEach((r,i)=>{if(i>=SHOW_INIT)r.remove();});
      btn.classList.remove('open');
      btn.innerHTML=`<span class="material-icons" style="font-size:14px">expand_more</span><span>Show ${remaining} more episodes</span>`;
    }
  }

  return{
    home,search,profile,buildEps,toggleViewMore,toast,lazyImg,observeLazy,_card,wlBtnHtml,
    _hcGoTo(idx){
      if(idx===_hc.idx)return;
      clearInterval(_hc.timer);_hc.idx=idx;_hcSetSlots();
      document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===idx));
      _hcStartAuto();
    }
  };

  function _hcSetSlots(){
    const total=_hc.shows.length;
    _hc.shows.forEach((_,i)=>{
      const card=document.getElementById('hcd'+i);if(!card)return;
      const slot=((i-_hc.idx)+total)%total;card.dataset.slot=slot;
      card.style.pointerEvents=slot===0?'auto':'none';
    });
  }
  function _hcStartAuto(){clearInterval(_hc.timer);_hc.timer=setInterval(()=>_hcGo(1),4500);}
  function _hcGo(dir){
    if(_hc.animating)return;_hc.animating=true;
    const total=_hc.shows.length,prevIdx=_hc.idx;
    _hc.idx=((_hc.idx+dir)+total)%total;
    const prevCard=document.getElementById('hcd'+prevIdx);
    if(prevCard){
      prevCard.classList.add(dir>0?'fly-out-left':'fly-out-right');
      prevCard.addEventListener('animationend',()=>{prevCard.classList.remove('fly-out-left','fly-out-right');_hcSetSlots();_hc.animating=false;},{once:true});
    }else{_hcSetSlots();_hc.animating=false;}
    document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===_hc.idx));
  }
})();