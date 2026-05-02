const R={
_cur:'home',
init(){
const h=location.hash.slice(1)||'home';
this.route(h);
window.addEventListener('hashchange',()=>this.route(location.hash.slice(1)||'home'));
document.querySelectorAll('.bni').forEach(el=>el.addEventListener('click',()=>{const pg=el.dataset.pg;location.hash=pg;}));
document.getElementById('sdo').addEventListener('click',function(e){if(e.target===this)R.closeShow();});
document.getElementById('evo').addEventListener('click',function(e){if(e.target===this)R.closeEp();});
},
route(h){
const parts=h.split('/');const pg=parts[0];
if(pg==='show'){this.show(parts[1],false);return;}
if(pg==='ep'){this.ep(parts[1],parts[2],false);return;}
document.querySelectorAll('.pg').forEach(el=>el.classList.remove('act'));
document.querySelectorAll('.bni').forEach(el=>{el.classList.toggle('act',el.dataset.pg===pg);});
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
let h=`<div class="sdoh"><img class="sdohi" src="${s.hero}" alt="${s.t}" loading="lazy"><div class="sdoho"></div><div class="sdoclose" onclick="R.closeShow()"><i class="fa-solid fa-xmark"></i></div></div><div class="sdob"><div class="sdologo">${s.t}</div><div class="sdometa"><i class="fa-regular fa-calendar" style="margin-right:4px;color:#3b82f6"></i>Watch with Monthly Free · <strong style="color:#3b82f6">IMDb ${s.rating}</strong><br>${s.y} · ${s.seasons} Season${s.seasons>1?'s':''} · ${s.langs}</div><button class="sdoplay" onclick="R.ep('${id}','${s.episodes[0].id}')"><i class="fa-solid fa-play" style="margin-right:8px"></i>Watch Latest · ${s.ep}</button><div class="sdogens">${s.genres.map(g=>`<span class="sdogen">${g}</span>`).join('')}</div><div class="sdodesc">${s.desc}</div><div class="sdoacts"><button class="sdoact ${wl?'on':''}" id="sdoact-wl" onclick="R.toggleWLShow('${id}')"><i class="fa-${wl?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span></button><button class="sdoact" onclick="P.toast('Shared!')"><i class="fa-solid fa-share-nodes"></i><span>Share</span></button><button class="sdoact" onclick="P.toast('Rated!')"><i class="fa-regular fa-heart"></i><span>Rate</span></button></div><div style="font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.04em;margin-bottom:12px">← ${s.t}</div><div class="stabs" id="stabs">`;
for(let i=1;i<=s.seasons;i++)h+=`<div class="stab ${i===1?'act':''}" onclick="R.switchSeason('${id}',${i},this)">Season ${i}</div>`;
h+=`</div><div id="eps-list">${R.buildEps(s,1)}</div><div style="font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.04em;margin:20px 0 12px">More Like This</div><div class="mlts">`;
D.shows.filter(x=>x.id!==id).slice(0,4).forEach(ms=>{h+=`<div class="sc" style="min-width:110px;width:110px" onclick="R.show('${ms.id}')"><img class="sci" src="${ms.thumb}" alt="${ms.t}"><div class="sct">${ms.t}</div></div>`;});
h+=`</div></div>`;
document.getElementById('sdo').innerHTML=h;
requestAnimationFrame(()=>document.getElementById('sdo').classList.add('open'));
document.body.style.overflow='hidden';
},
buildEps(s,season){
return s.episodes.filter(e=>e.s===season).map(e=>`<div class="er" onclick="R.ep('${s.id}','${e.id}')"><div style="position:relative;flex-shrink:0"><img class="eri" src="${e.thumb}" alt="${e.t}"><div class="erio"><i class="fa-solid fa-play"></i></div></div><div class="erib"><div class="ern">${e.t}</div><div class="erm">S${e.s} E${e.e} · ${e.d} · ${e.dur}</div><div class="erd">${e.desc}</div></div><div class="erdl"><i class="fa-solid fa-download" style="opacity:.4"></i></div></div>`).join('');
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
toggleWLShow(id){
const on=D.wishlist.has(id);
if(on)D.wishlist.delete(id);else D.wishlist.add(id);
const btn=document.getElementById('sdoact-wl');
if(btn){btn.className='sdoact'+(D.wishlist.has(id)?' on':'');btn.innerHTML=`<i class="fa-${D.wishlist.has(id)?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span>`;}
P.toast(D.wishlist.has(id)?'Added to Watchlist':'Removed from Watchlist');
},
ep(showId,epId,push=true){
const s=D.shows.find(x=>x.id===showId);if(!s)return;
const e=s.episodes.find(x=>x.id===epId);if(!e)return;
if(push)history.pushState(null,'','#ep/'+showId+'/'+epId);
const more=s.episodes.filter(x=>x.id!==epId).slice(0,3);
let h=`<div class="evov"><div class="evoc" onclick="R.closeEp()"><i class="fa-solid fa-chevron-down"></i></div><div class="evop"><i class="fa-solid fa-play"></i></div></div><div class="evob"><div class="evot">${s.t}</div><div class="evom">S${e.s} E${e.e} · ${e.t} · ${e.dur}</div><div style="font-size:12px;color:var(--w3);line-height:1.6;margin-bottom:16px">${e.desc}</div><div style="display:flex;gap:16px;border-top:1px solid var(--w4);border-bottom:1px solid var(--w4);margin-bottom:16px"><button class="sdoact" style="border:none" onclick="R.toggleWLShow('${showId}')"><i class="fa-${D.wishlist.has(showId)?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span></button><button class="sdoact" style="border:none" onclick="P.toast('Shared!')"><i class="fa-solid fa-share-nodes"></i><span>Share</span></button><button class="sdoact" style="border:none" onclick="P.toast('Rated!')"><i class="fa-regular fa-heart"></i><span>Rate</span></button></div>`;
if(more.length){h+=`<div style="font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.04em;margin-bottom:8px">Next Episodes</div>`;more.forEach(ep=>{h+=`<div class="er" onclick="R.ep('${showId}','${ep.id}')"><div style="position:relative;flex-shrink:0"><img class="eri" src="${ep.thumb}" alt="${ep.t}"><div class="erio"><i class="fa-solid fa-play"></i></div></div><div class="erib"><div class="ern">${ep.t}</div><div class="erm">S${ep.s} E${ep.e} · ${ep.dur}</div></div></div>`;});}
h+=`</div>`;
document.getElementById('evo').innerHTML=h;
requestAnimationFrame(()=>document.getElementById('evo').classList.add('open'));
document.body.style.overflow='hidden';
},
closeEp(){
const el=document.getElementById('evo');
el.classList.remove('open');
document.body.style.overflow='';
setTimeout(()=>{el.innerHTML='';history.back();},350);
}
};
document.addEventListener('DOMContentLoaded',()=>R.init());