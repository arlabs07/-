console.log('r.js loaded, P=', typeof P, 'D=', typeof D);
const R={
_cur:'home',_curShow:null,_curEp:null,
init(){
const h=location.hash.slice(1)||'home';
this.route(h);
window.addEventListener('hashchange',()=>this.route(location.hash.slice(1)||'home'));
document.querySelectorAll('.bni[data-pg]').forEach(el=>el.addEventListener('click',()=>{location.hash=el.dataset.pg;}));
document.getElementById('bni-home-btn').addEventListener('click',()=>{location.hash='home';});
},
route(h){
const parts=h.split('/');const pg=parts[0];
if(pg==='show'){this.show(parts[1],false);return;}
if(pg==='ep'){this.ep(parts[1],parts[2],false);return;}
if(pg==='see'){this.seeAll(decodeURIComponent(parts[1]),false);return;}
const sdo=document.getElementById('sdo');
if(sdo.classList.contains('open')){sdo.classList.remove('open');document.body.style.overflow='';setTimeout(()=>sdo.innerHTML='',350);}
const evo=document.getElementById('evo');
if(evo.classList.contains('open')){evo.classList.remove('open');document.body.style.overflow='';NV.destroy();}
const sao=document.getElementById('sao');
if(sao.classList.contains('open')){sao.classList.remove('open');setTimeout(()=>sao.innerHTML='',350);}
document.querySelectorAll('.pg').forEach(el=>el.classList.remove('act'));
document.querySelectorAll('.bni[data-pg]').forEach(el=>el.classList.toggle('act',el.dataset.pg===pg));
document.getElementById('bni-home-btn').classList.toggle('act',pg==='home');
const page=document.getElementById('page-'+pg);
if(!page)return;
page.classList.add('act');
if(pg==='home')P.home();
else if(pg==='search')P.search();
else if(pg==='profile')P.profile();
this._cur=pg;
},
show(id,push=true){
const s=D.shows.find(x=>x.id===id);if(!s)return;
if(push)history.pushState(null,'','#show/'+id);
const wl=D.wishlist.has(id);
let h=`<div class="sdoh"><img class="sdohi" src="${s.hero}" alt="${s.t}" loading="lazy"><div class="sdoho"></div><div class="sdoclose" onclick="R.closeShow()"><i class="fa-solid fa-xmark"></i></div></div>`;
h+=`<div class="sdob"><div class="sdologo">${s.t}</div>`;
h+=`<div class="sdometa">${s.y} · ${s.seasons} Season${s.seasons>1?'s':''} · ${s.langs} · ⭐ ${s.rating}</div>`;
h+=`<button class="sdoplay" onclick="R.ep('${id}','${s.episodes[0].id}')"><i class="fa-solid fa-play"></i> Watch · ${s.ep}</button>`;
h+=`<div class="sdogens">${s.genres.map(g=>`<span class="sdogen">${g}</span>`).join('')}</div>`;
h+=`<div class="sdodesc">${s.desc}</div>`;
h+=`<div class="sdoacts">`;
h+=`<button class="sdoact${wl?' on':''}" id="sdoact-wl" onclick="P.toggleWLShow('${id}')"><i class="fa-${wl?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span></button>`;
h+=`<button class="sdoact" onclick="P.toast('Shared!')"><i class="fa-solid fa-share-nodes"></i><span>Share</span></button>`;
h+=`<button class="sdoact" onclick="P.toast('Rated!')"><i class="fa-regular fa-heart"></i><span>Rate</span></button>`;
h+=`</div>`;
h+=`<div style="font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.04em;margin-bottom:12px">${s.t} — Episodes</div>`;
h+=`<div class="stabs" id="stabs">`;
for(let i=1;i<=s.seasons;i++)h+=`<div class="stab${i===1?' act':''}" onclick="R.switchSeason('${id}',${i},this)">Season ${i}</div>`;
h+=`</div><div id="eps-list">${R.buildEps(s,1)}</div>`;
h+=`<div style="font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.04em;margin:20px 0 12px">More Like This</div><div class="mlts">`;
D.shows.filter(x=>x.id!==id).slice(0,5).forEach(ms=>{h+=P._card(ms);});
h+=`</div></div>`;
const el=document.getElementById('sdo');
el.innerHTML=h;
requestAnimationFrame(()=>el.classList.add('open'));
document.body.style.overflow='hidden';
},
buildEps(s,season){
return s.episodes.filter(e=>e.s===season).map(e=>{
const pct=D.getProgress(s.id,e.id);
return`<div class="er" onclick="R.ep('${s.id}','${e.id}')"><div style="position:relative;flex-shrink:0"><img class="eri" src="${e.thumb}" alt="${e.t}">${pct>2?`<div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.15);border-radius:0 0 6px 6px"><div style="width:${pct}%;height:100%;background:#fff;border-radius:inherit"></div></div>`:''}<div class="erio"><i class="fa-solid fa-play"></i></div></div><div class="erib"><div class="ern">${e.t}</div><div class="erm">S${e.s} E${e.e} · ${e.d} · ${e.dur}</div><div class="erd">${e.desc}</div></div></div>`;
}).join('');
},
switchSeason(id,n,el){
document.querySelectorAll('.stab').forEach(t=>t.classList.remove('act'));
el.classList.add('act');
const s=D.shows.find(x=>x.id===id);if(!s)return;
document.getElementById('eps-list').innerHTML=R.buildEps(s,n);
},
closeShow(){
const el=document.getElementById('sdo');
el.classList.remove('open');
document.body.style.overflow='';
setTimeout(()=>{el.innerHTML='';history.back();},350);
},
ep(showId,epId,push=true){
const s=D.shows.find(x=>x.id===showId);if(!s)return;
const ep=s.episodes.find(x=>x.id===epId);if(!ep)return;
const evo=document.getElementById('evo');
const isOpen=evo.classList.contains('open');
if(isOpen){
// Switch episode without re-routing — just update content + reinit player
R._curShow=showId;R._curEp=epId;
NV.destroy();
R._buildEvoBody(s,ep,showId,evo);
NV.init(showId,epId,s,ep);
return;
}
if(push)history.pushState(null,'','#ep/'+showId+'/'+epId);
R._curShow=showId;R._curEp=epId;
R._buildEvoBody(s,ep,showId,evo);
requestAnimationFrame(()=>evo.classList.add('open'));
document.body.style.overflow='hidden';
NV.init(showId,epId,s,ep);
},
_buildEvoBody(s,ep,showId,evo){
const wl=D.wishlist.has(showId);
let h=`<div id="evo-topbar"><div id="evo-topbar-back" onclick="R.closeEp()"><i class="fa-solid fa-chevron-down"></i></div><div id="evo-topbar-title">${s.t} · S${ep.s} E${ep.e}</div></div>`;
h+=`<div id="np-page"><div id="np-page-title"></div><div id="np-root" role="region" tabindex="-1"><video id="np-video" preload="metadata" playsinline webkit-playsinline></video><img id="np-thumb" alt="thumbnail" draggable="false"><div id="np-spinner" role="status"></div><div id="np-speed-hold">2x</div><div id="np-nudge"></div><div id="np-nudge-left"></div><div id="np-nudge-right"></div><div id="np-overlay" role="presentation" aria-hidden="true"></div><button id="np-center-play" class="np-btn"></button><div id="np-top-bar"><div id="np-fs-title"></div><div style="display:flex;gap:8px;margin-left:auto"><div style="position:relative"><button id="np-quality" class="np-btn np-btn-label" aria-haspopup="true"></button><div id="np-quality-menu" class="np-menu dropdown custom-scroll" role="menu"></div></div><div style="position:relative"><button id="np-lang" class="np-btn np-btn-label" aria-haspopup="true"></button><div id="np-lang-menu" class="np-menu dropdown custom-scroll" role="menu"></div></div></div></div><div id="np-controls" role="toolbar"><div id="np-seek-wrap" role="slider" tabindex="0"><div id="np-seek-track"><div id="np-seek-buf"></div><div id="np-seek-fill"></div><div id="np-seek-thumb"></div><div id="np-seek-hover"></div></div></div><div id="np-bottom-layout"><div style="display:flex;align-items:center;gap:10px"><img id="np-current-thumb" alt="" style="width:56px;height:32px;border-radius:6px;object-fit:cover;background:#000;box-shadow:0 2px 8px rgba(0,0,0,.5)"><div class="np-ctrl-group"><button id="np-prev" class="np-btn" title="Previous"></button><button id="np-play" class="np-btn" title="Play (k)"></button><button id="np-next" class="np-btn" title="Next"></button><div id="np-vol-wrap"><button id="np-vol" class="np-btn"></button><div id="np-vol-slider-wrap"><div id="np-vol-track"><div id="np-vol-fill"></div><input type="range" id="np-vol-slider" min="0" max="1" step="0.02" value="1"></div></div></div><span id="np-time">0:00 / 0:00</span></div></div><div class="np-ctrl-group"><div style="position:relative"><button id="np-speed" class="np-btn np-btn-label"></button><div id="np-speed-menu" class="np-menu dropup custom-scroll" role="menu"></div></div><button id="np-pl" class="np-btn" title="Playlist"></button><button id="np-fs" class="np-btn" title="Fullscreen (f)"></button></div></div></div><div id="np-pl-panel" role="complementary"><div id="np-pl-header"><span>Episodes</span><button id="np-pl-close" class="np-btn"></button></div><ul id="np-pl-list" class="custom-scroll" role="listbox"></ul></div></div></div>`;
h+=`<div id="evo-body">`;
h+=`<div class="evot">${ep.t}</div><div class="evom">S${ep.s} E${ep.e} · ${ep.d} · ${ep.dur}</div>`;
h+=`<div style="font-size:11px;color:var(--w3);line-height:1.6;margin-bottom:12px">${ep.desc}</div>`;
h+=`<div class="evoacts">`;
h+=`<button class="evoact${wl?' on':''}" id="evo-wl-btn" onclick="P.toggleWLShow('${showId}')"><i class="fa-${wl?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span></button>`;
h+=`<button class="evoact" onclick="P.toast('Shared!')"><i class="fa-solid fa-share-nodes"></i><span>Share</span></button>`;
h+=`<button class="evoact" onclick="P.toast('Rated!')"><i class="fa-regular fa-heart"></i><span>Rate</span></button>`;
h+=`</div>`;
// Season nav + episodes
h+=`<div style="font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.04em;margin-bottom:8px">${s.t} — Episodes</div>`;
h+=`<div class="stabs" id="evo-stabs">`;
for(let i=1;i<=s.seasons;i++){
const active=i===ep.s;
h+=`<div class="stab${active?' act':''}" onclick="R.evoSwitchSeason('${showId}',${i},this)">Season ${i}</div>`;
}
h+=`</div><div id="evo-eps-list">${R.buildEvoEps(s,ep.s,ep.id)}</div>`;
// You May Like
const related=D.shows.filter(x=>x.id!==showId).slice(0,6);
if(related.length){
h+=`<div style="font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.04em;margin:20px 0 8px">You May Like</div>`;
h+=`<div class="secr" style="padding:0 0 6px">`;
related.forEach(ms=>h+=P._card(ms));
h+=`</div>`;
const related2=D.shows.filter(x=>x.id!==showId).slice(2,8);
h+=`<div class="secr" style="padding:4px 0 6px">`;
related2.forEach(ms=>h+=P._card(ms));
h+=`</div>`;
}
h+=`</div>`;
evo.innerHTML=h;
},
buildEvoEps(s,season,curEpId){
return s.episodes.filter(e=>e.s===season).map(e=>{
const pct=D.getProgress(s.id,e.id);
const active=e.id===curEpId;
return`<div class="er${active?' er-active':''}" onclick="R.ep('${s.id}','${e.id}')"><div style="position:relative;flex-shrink:0"><img class="eri" src="${e.thumb}" alt="${e.t}">${pct>2?`<div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.15);border-radius:0 0 6px 6px"><div style="width:${pct}%;height:100%;background:#fff;border-radius:inherit"></div></div>`:''}<div class="erio"><i class="fa-solid fa-play"></i></div></div><div class="erib"><div class="ern">${e.t}</div><div class="erm">S${e.s} E${e.e} · ${e.dur}</div><div class="erd">${e.desc}</div></div></div>`;
}).join('');
},
evoSwitchSeason(showId,n,el){
document.querySelectorAll('#evo-stabs .stab').forEach(t=>t.classList.remove('act'));
el.classList.add('act');
const s=D.shows.find(x=>x.id===showId);if(!s)return;
document.getElementById('evo-eps-list').innerHTML=R.buildEvoEps(s,n,R._curEp);
},
closeEp(){
NV.destroy();
const el=document.getElementById('evo');
el.classList.remove('open');
document.body.style.overflow='';
setTimeout(()=>{el.innerHTML='';},350);
const hash=location.hash.slice(1);
if(hash.startsWith('ep/')){history.back();}
},
seeAll(title,push=true){
const sec=D.sections.find(x=>x.title===title);if(!sec)return;
if(push)history.pushState(null,'','#see/'+encodeURIComponent(title));
const sao=document.getElementById('sao');
let h=`<div class="saotb"><div class="saotb-back" onclick="R.closeSeeAll()"><i class="fa-solid fa-chevron-left"></i></div><div class="saotb-title">${title}</div></div>`;
h+=`<div class="saobody"><div class="saogrid">`;
sec.ids.forEach(id=>{const s=D.shows.find(x=>x.id===id);if(!s)return;h+=P._card(s);});
h+=`</div></div>`;
sao.innerHTML=h;
requestAnimationFrame(()=>sao.classList.add('open'));
document.body.style.overflow='hidden';
},
closeSeeAll(){
const el=document.getElementById('sao');
el.classList.remove('open');
document.body.style.overflow='';
setTimeout(()=>{el.innerHTML='';history.back();},350);
}
};
document.addEventListener('DOMContentLoaded',()=>R.init());