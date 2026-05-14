const R=(()=>{
'use strict';
let _cShow=null,_cEp=null;
const _sdo=()=>document.getElementById('sdo');
const _evo=()=>document.getElementById('evo');
const _sao=()=>document.getElementById('sao');
let _stack=[];
function _isDesktop(){return window.innerWidth>=900;}
function init(){const h=location.hash.slice(1)||'home';_route(h);window.addEventListener('hashchange',()=>_route(location.hash.slice(1)||'home'));document.querySelectorAll('.bni[data-pg]').forEach(el=>el.addEventListener('click',()=>{location.hash=el.dataset.pg;}));document.getElementById('bni-home-btn').addEventListener('click',()=>{location.hash='home';});}
function _route(h){const parts=h.split('/'),pg=parts[0];
if(pg==='show'){
const evoEl=_evo();if(evoEl&&evoEl.classList.contains('op')){NV.destroy();evoEl.classList.remove('op');_stack=_stack.filter(z=>z!==700);document.body.style.overflow='';setTimeout(()=>{evoEl.innerHTML='';show(parts[1],false);},300);}else{show(parts[1],false);}return;
}
if(pg==='ep'){ep(parts[1],parts[2],false);return;}
if(pg==='see'){seeAll(decodeURIComponent(parts[1]),false);return;}
_closeAll();document.querySelectorAll('.pg').forEach(el=>el.classList.remove('act'));document.querySelectorAll('.bni[data-pg]').forEach(el=>el.classList.toggle('act',el.dataset.pg===pg));document.getElementById('bni-home-btn').classList.toggle('act',pg==='home');const page=document.getElementById('page-'+pg);if(!page)return;page.classList.add('act');if(pg==='home')P.home();else if(pg==='search')P.search();else if(pg==='profile')P.profile();}
function _closeAll(){[_sdo(),_evo(),_sao()].forEach(el=>{if(el&&el.classList.contains('op')){el.classList.remove('op');setTimeout(()=>{el.innerHTML='';},380);}});if(_evo()&&_evo().classList.contains('op'))NV.destroy();_stack=[];document.body.style.overflow='';}
function show(id,push=true){D.onReady(()=>{const s=D.getShow(id);if(!s)return;if(push)history.pushState(null,'','#show/'+id);const wl=D.wishlist.has(id),ls=s.langs?s.langs.map(l=>D.langLabels[l]||l).join(', '):'',el=_sdo(),mv=!!s.isMovie;let h=`<div class="sdoh"><img class="sdohi li" src="${D.heroImg(s)}" alt="${s.title}"><div class="sdoho"></div><div class="sdocl" onclick="R.closeShow()">${IC.close}</div></div><div class="sdob"><div class="sdolog">${s.title}</div><div class="sdomt">${s.year}${mv?` · ${s.dur||''}`:(` · ${s.seasons} Season${s.seasons>1?'s':''}`)} · ${ls} · ⭐ ${s.rating}</div><button class="sdopl" onclick="R.ep('${id}','${s.episodes[0].id}')">${IC.play} Watch${mv?'':` · S${s.episodes[0].s} E${s.episodes[0].e}`}</button><div class="sdogns">${(s.genres||[]).map(g=>`<span class="sdogn">${g}</span>`).join('')}</div><div class="sdodsc">${s.desc||''}</div><div class="sdoacts"><button class="sdoact wlb${wl?' on':''}" data-wl-s="${id}" onclick="P._twls('${id}',this)">${(wl?IC.check:IC.bookmark)}<span>Watchlist</span></button><button class="sdoact" onclick="P.share('${id}')">${IC.share}<span>Share</span></button><button class="sdoact" onclick="P.openRating('${id}')">${IC.heart}<span>Rate</span></button></div>`;if(!mv){h+=`<div class="sch">${s.title} — Episodes</div><div class="stabs" id="stabs">`;for(let i=1;i<=s.seasons;i++)h+=`<div class="stab${i===1?' act':''}" onclick="R.sSeason('${id}',${i},this)">Season ${i}</div>`;h+=`</div><div id="epsl">${P.buildEps(id,1)}</div>`;}h+=`<div class="sch">More Like This</div><div class="mlts">`;D.shows.filter(x=>x.id!==id).slice(0,6).forEach(ms=>{h+=P._card(ms);});h+=`</div></div>`;el.innerHTML=h;const z=600;el.style.zIndex=z;_stack.push(z);document.body.style.overflow='hidden';requestAnimationFrame(()=>el.classList.add('op'));P.obsL(el);P.setMeta(id);});}
function sSeason(sid,n,te){document.querySelectorAll('.stab').forEach(t=>t.classList.remove('act'));te.classList.add('act');document.getElementById('epsl').innerHTML=P.buildEps(sid,n);P.obsL(document.getElementById('epsl'));}
function closeShow(){const el=_sdo();el.classList.remove('op');_stack=_stack.filter(z=>z!==600);document.body.style.overflow='';setTimeout(()=>{el.innerHTML='';history.back();},380);}
function ep(sid,eid,push=true){D.onReady(()=>{const s=D.getShow(sid);if(!s)return;const epData=D.getEp(sid,eid);if(!epData)return;const evoEl=_evo(),isOp=evoEl.classList.contains('op');if(isOp){_cShow=sid;_cEp=eid;NV.destroy();_bldEvo(s,epData,sid,evoEl);NV.init(sid,eid,s,epData);return;}if(push)history.pushState(null,'','#ep/'+sid+'/'+eid);_cShow=sid;_cEp=eid;_bldEvo(s,epData,sid,evoEl);const z=700;evoEl.style.zIndex=z;_stack.push(z);document.body.style.overflow='hidden';requestAnimationFrame(()=>evoEl.classList.add('op'));NV.init(sid,eid,s,epData);P.setMeta(sid,eid);});}
function _bldEvo(s,epData,sid,evoEl){
const wl=D.wishlist.has(sid),isDesk=_isDesktop(),mv=!!s.isMovie;

/* ── Video player HTML ──────────────────────────────────────────────────
   All element IDs must match exactly what Nova.js looks up via g(id).
   Nova.js g() references:
     Top bar   : nct, nct-left, nct-right, nct-title, nct-title-main,
                 nct-title-sub, nfs-btn (non-FS fullscreen), nset (settings),
                 nss (screenshot), nfs-exit (exit fullscreen)
     Centre    : ncc, npl2, nsk10m, nsk10p
     Bottom    : nb, nsw, nst, nsbuf, nsf, nsth, nsh, ntm, nbrow-fs,
                 nwn, nep, nnx, nspd, nspd-lbl, nbpeek
     Overlays  : nfsov, nfsov-hd, nfsov-body, nfsov-close-btn
                 nfspl, nfspl-tabs, nfspl-body, nfspl-close-btn
     Misc      : nsp, nsh2, nnl, nnr, nov, nth
                 ng-left, ng-right, ng-left-fill, ng-right-fill,
                 ng-bright-icon, ng-vol-icon, ng-toast
──────────────────────────────────────────────────────────────────────── */
const videoHtml=`<div id="np-page"><div id="nr" role="region" tabindex="-1">

  <!-- video + thumbnail -->
  <video id="nvid" preload="metadata" playsinline webkit-playsinline></video>
  <img id="nth" alt="" draggable="false">

  <!-- spinner -->
  <div id="nsp" role="status"></div>

  <!-- centre system message (shared slot) -->
  <div id="nsh2"></div>

  <!-- seek nudge labels -->
  <div id="nnl"></div>
  <div id="nnr"></div>

  <!-- gesture strips: left = brightness, right = volume -->
  <div id="ng-left">
    <div class="ng-track"><div class="ng-fill" id="ng-left-fill" style="height:100%"></div></div>
    <div class="ng-icon" id="ng-bright-icon"></div>
  </div>
  <div id="ng-right">
    <div class="ng-track"><div class="ng-fill" id="ng-right-fill" style="height:80%"></div></div>
    <div class="ng-icon" id="ng-vol-icon"></div>
  </div>

  <!-- gesture toast (brightness / volume label) -->
  <div id="ng-toast"></div>

  <!-- overlay tap surface -->
  <div id="nov" role="presentation" aria-hidden="true"></div>

  <!-- ════ TOP BAR ════ -->
  <div id="nct">
    <div id="nct-left">
      <!-- back button (always visible) -->
      <button class="nb" onclick="R.closeEp()" title="Back">${IC.chevDown}</button>
      <!-- title shown only in fullscreen via CSS #nr.nrfs #nct-title{display:flex} -->
      <div id="nct-title">
        <span id="nct-title-main"></span>
        <span id="nct-title-sub"></span>
      </div>
    </div>
    <div id="nct-right">
      <!-- screenshot: FS only -->
      <button class="nb nct-fs-only" id="nss" title="Screenshot">${IC.screenshot}</button>
      <!-- settings: FS only -->
      <button class="nb nct-fs-only" id="nset" title="Settings">${IC.quality}</button>
      <!-- exit fullscreen: FS only -->
      <button class="nb nct-fs-only" id="nfs-exit" title="Exit fullscreen">${IC.exitFs}</button>
      <!-- enter fullscreen: non-FS only -->
      <button class="nb" id="nfs-btn" title="Fullscreen">${IC.fullscreen}</button>
    </div>
  </div>

  <!-- ════ CENTRE CONTROLS ════ -->
  <div id="ncc">
    <button class="nb-seek" id="nsk10m" title="Rewind 10s">${IC.seekBack}</button>
    <button class="nb" id="npl2" style="width:68px;height:68px" title="Play/Pause">${IC.play}</button>
    <button class="nb-seek" id="nsk10p" title="Forward 10s">${IC.seekFwd}</button>
  </div>

  <!-- ════ BOTTOM BAR ════ -->
  <div id="nb" role="toolbar">

    <!-- seek row -->
    <div id="nbseek">
      <div id="nsw" role="slider" tabindex="0">
        <div id="nst">
          <div id="nsbuf"></div>
          <div id="nsf"></div>
          <div id="nsth"></div>
          <div id="nsh"></div>
        </div>
      </div>
      <span id="ntm">0:00</span>
    </div>

    <!-- FS bottom action row — hidden in non-FS, shown in fullscreen via CSS -->
    <div id="nbrow-fs">
      <div style="display:flex;gap:4px;align-items:center">
        ${mv?'':`<button class="nbfs-btn" id="nwn">${IC.watchNext}<span>Watch Next</span></button>`}
        ${mv?'':`<button class="nbfs-btn" id="nep">${IC.episodes}<span>Episodes</span></button>`}
        <button class="nbfs-btn" id="nspd">${IC.speed}<span id="nspd-lbl">1×</span></button>
      </div>
      <div style="display:flex;gap:4px;align-items:center">
        ${mv?'':`<button class="nbfs-btn" id="nnx">${IC.skipNext}<span>Next Episode</span></button>`}
      </div>
    </div>

    <!-- FS episode peek strip — scrollable thumbnails -->
    <div id="nbpeek"></div>

  </div>

  <!-- ════ SETTINGS OVERLAY (built by Nova.js init into #nfsov-hd) ════ -->
  <div id="nfsov">
    <div id="nfsov-hd"></div>
    <div id="nfsov-body"></div>
  </div>

  <!-- ════ PLAYLIST OVERLAY (built by Nova.js renderFspl into #nfspl-tabs / #nfspl-body) ════ -->
  <div id="nfspl">
    <div id="nfspl-tabs"></div>
    <div id="nfspl-body"></div>
  </div>

</div></div>`;

const metaLine=mv?`${epData.date} · ${epData.dur}`:`S${epData.s||''} E${epData.e||''} · ${epData.date} · ${epData.dur}`;
let bodyHtml=`<div id="evobody">
  <div class="evott2">${mv?s.title:epData.title}</div>
  <div class="evometa">${metaLine}</div>
  <div style="font-size:11px;color:var(--w3);line-height:1.6;margin-bottom:14px">${epData.desc||s.desc||''}</div>
  <div class="evoacts">
    <button class="evoact wlb${wl?' on':''}" data-wl-s="${sid}" onclick="P._twls('${sid}',this)">${(wl?IC.check:IC.bookmark)}<span>Watchlist</span></button>
    <button class="evoact" onclick="P.share('${sid}','${epData.id}')">${IC.share}<span>Share</span></button>
    <button class="evoact" onclick="P.openRating('${sid}')">${IC.heart}<span>Rate</span></button>
  </div>`;

if(!mv){
bodyHtml+=`<div class="sch">${s.title} — Episodes</div>
  <div class="stabs" id="evostabs">`;
for(let i=1;i<=s.seasons;i++)bodyHtml+=`<div class="stab${i===epData.s?' act':''}" onclick="R._evoss('${sid}',${i},this)">Season ${i}</div>`;
bodyHtml+=`</div><div id="evoepsl">${P.buildEps(sid,epData.s,epData.id)}</div>`;
}

const rel=D.shows.filter(x=>x.id!==sid).slice(0,8);
const ymlCard=ms=>`<div class="sc" onclick="R.closeEp();setTimeout(()=>R.show('${ms.id}'),350)"><div class="sc-i"><div class="sc-img-w"><img data-src="${ms.thumb||''}" src="" class="sci" alt="${ms.title}" loading="lazy"></div><div class="sc-gl"></div><div class="sc-bot"><div class="sc-t">${ms.title}</div><div class="sc-m">⭐${ms.rating} · ${ms.year}</div></div></div></div>`;

if(isDesk){bodyHtml+=`<div id="evo-yml"><div id="evo-yml-title">You May Like</div><div id="evo-yml-grid">`;rel.forEach(ms=>bodyHtml+=ymlCard(ms));bodyHtml+=`</div></div>`;}
else if(rel.length){bodyHtml+=`<div class="sch">You May Like</div><div class="secr" style="padding:0 0 8px">`;rel.forEach(ms=>bodyHtml+=ymlCard(ms));bodyHtml+=`</div>`;}
bodyHtml+=`</div>`;

let h='';
if(isDesk&&!mv){h+=`<div id="evo-main-col">${videoHtml}${bodyHtml}</div>`;h+=_bldDeskPlPanel(s,epData,sid);}
else{h+=isDesk?`<div id="evo-main-col">${videoHtml}${bodyHtml}</div>`:videoHtml+bodyHtml;}
evoEl.innerHTML=h;P.obsL(evoEl);if(isDesk&&!mv)_bindDeskPl(s,sid,epData);
}
function _bldDeskPlPanel(s,epData,sid){const seasons=[...new Set(s.episodes.map(e=>e.s))];let h=`<div id="evo-pl-panel"><div id="evo-pl-panel-hd"><span>${s.title}</span><span style="font-size:10px;color:var(--w3);font-weight:400">${s.episodes.length} episodes</span></div>`;if(seasons.length>1){h+=`<div id="evo-pl-panel-stabs">`;seasons.forEach(sn=>h+=`<div class="stab${sn===epData.s?' act':''}" onclick="R._deskPlSeason('${sid}',${sn},this)">${`S${sn}`}</div>`);h+=`</div>`;}h+=`<div id="evo-pl-panel-list">${_bldDeskEpList(s,epData.s,epData.id,sid)}</div></div>`;return h;}
function _bldDeskEpList(s,season,curId,sid){return s.episodes.filter(e=>e.s===season).map(e=>{const pct=D.getProgress(sid,e.id),act=e.id===curId;return`<div class="evo-pl-ep${act?' act':''}" onclick="R.ep('${sid}','${e.id}')"><div class="evo-pl-th"><img data-src="${e.thumb}" src="" alt="${e.title}" loading="lazy"><div class="evo-pl-pb"><div class="evo-pl-pbf" style="width:${pct}%"></div></div></div><div class="evo-pl-meta"><div class="evo-pl-en">${e.title}</div><div class="evo-pl-em">E${e.e} · ${e.dur}</div></div></div>`;}).join('');}
function _bindDeskPl(s,sid,epData){const list=document.getElementById('evo-pl-panel-list');if(list){const act=list.querySelector('.evo-pl-ep.act');if(act)setTimeout(()=>act.scrollIntoView({block:'nearest'}),200);P.obsL(list);}}
function _deskPlSeason(sid,season,te){document.querySelectorAll('#evo-pl-panel-stabs .stab').forEach(t=>t.classList.remove('act'));te.classList.add('act');const s=D.getShow(sid);const list=document.getElementById('evo-pl-panel-list');if(list&&s){list.innerHTML=_bldDeskEpList(s,season,_cEp,sid);P.obsL(list);}}
function _evoss(sid,n,te){document.querySelectorAll('#evostabs .stab').forEach(t=>t.classList.remove('act'));te.classList.add('act');const c=document.getElementById('evoepsl');c.innerHTML=P.buildEps(sid,n,_cEp);P.obsL(c);}
function closeEp(){NV.destroy();const el=_evo();el.classList.remove('op');_stack=_stack.filter(z=>z!==700);document.body.style.overflow='';setTimeout(()=>{el.innerHTML='';},380);const h=location.hash.slice(1);if(h.startsWith('ep/'))history.back();}
function seeAll(title,push=true){D.onReady(()=>{const sec=D.sections.find(x=>x&&x.title===title);if(!sec)return;if(push)history.pushState(null,'','#see/'+encodeURIComponent(title));const el=_sao();let h=`<div class="saotb"><div class="saobk" onclick="R.closeSeeAll()">${IC.chevLeft}</div><div class="saoti">${title}</div></div><div class="saobdy"><div class="saog">`;(sec.ids||[]).forEach(id=>{const s=D.getShow(id);if(s)h+=P._card(s);});h+=`</div></div>`;el.innerHTML=h;const z=500;el.style.zIndex=z;_stack.push(z);document.body.style.overflow='hidden';requestAnimationFrame(()=>el.classList.add('op'));P.obsL(el);});}
function closeSeeAll(){const el=_sao();el.classList.remove('op');_stack=_stack.filter(z=>z!==500);document.body.style.overflow='';setTimeout(()=>{el.innerHTML='';history.back();},380);}
return{init,show,ep,seeAll,closeShow,closeEp,closeSeeAll,sSeason,_evoss,_deskPlSeason};
})();
