const P={
home(){
const feat=D.shows.slice(0,4);
let h=`<div id="tb"><span class="logo">ANIMEX</span><div class="tbr"><div class="tbi"><i class="fa-solid fa-bell"></i></div><div class="tbi"><i class="fa-solid fa-circle-user"></i></div></div></div>`;
h+=`<div id="hc"><div class="hcs" id="hcs">`;
feat.forEach((s,i)=>{
const wl=D.wishlist.has(s.id);
h+=`<div class="hcd" onclick="R.show('${s.id}')"><img class="hci" src="${s.thumb}" loading="lazy" alt="${s.t}"><div class="hco"></div><div class="hcb"><div class="hct">${s.t}</div><div class="hcm">${s.y} · ${s.langs} · ${s.s.split(' · ')[0]}</div><div class="hca"><button class="btnp" onclick="event.stopPropagation();R.ep('${s.id}','${s.episodes[0].id}')"><i class="fa-solid fa-play"></i></button><button class="btnw ${wl?'on':''}" onclick="event.stopPropagation();P.toggleWL('${s.id}',this)"><i class="fa-${wl?'solid':'regular'} fa-bookmark"></i></button></div></div></div>`;
});
h+=`</div><div class="hcdots" id="hcdots">`;
feat.forEach((_,i)=>h+=`<div class="hcdot ${i===0?'act':''}" id="dot${i}"></div>`);
h+=`</div></div>`;
D.sections.slice(1).forEach(sec=>{
h+=`<div class="sec"><div class="sech"><span class="sect">${sec.title}</span><a class="seca">See all</a></div><div class="secr">`;
sec.ids.forEach(id=>{
const s=D.shows.find(x=>x.id===id);if(!s)return;
const wl=D.wishlist.has(s.id);
h+=`<div class="sc" onclick="R.show('${s.id}')"><img class="sci" src="${s.thumb}" loading="lazy" alt="${s.t}"><div class="scwb ${wl?'on':''}" onclick="event.stopPropagation();P.toggleWLCard('${s.id}',this)"><i class="fa-${wl?'solid':'regular'} fa-bookmark"></i></div><div class="sct">${s.t}</div></div>`;
});
h+=`</div></div>`;
});
document.getElementById('page-home').innerHTML=h;
requestAnimationFrame(()=>P.initCarousel());
},
initCarousel(){
const el=document.getElementById('hcs');if(!el)return;
const feat=D.shows.slice(0,4);let cur=0;
el.addEventListener('scroll',()=>{
const idx=Math.round(el.scrollLeft/el.offsetWidth);
if(idx!==cur){cur=idx;feat.forEach((_,i)=>{const d=document.getElementById('dot'+i);if(d){d.className='hcdot'+(i===idx?' act':'');}});}
},{ passive:true });
},
toggleWL(id,el){
const on=D.wishlist.has(id);
if(on){D.wishlist.delete(id);}else{D.wishlist.add(id);}
el.className='btnw'+(D.wishlist.has(id)?' on':'');
el.innerHTML=`<i class="fa-${D.wishlist.has(id)?'solid':'regular'} fa-bookmark"></i>`;
P.toast(D.wishlist.has(id)?'Added to Watchlist':'Removed from Watchlist');
P.syncWL(id);
},
toggleWLCard(id,el){
const on=D.wishlist.has(id);
if(on){D.wishlist.delete(id);}else{D.wishlist.add(id);}
el.className='scwb'+(D.wishlist.has(id)?' on':'');
el.innerHTML=`<i class="fa-${D.wishlist.has(id)?'solid':'regular'} fa-bookmark"></i>`;
P.toast(D.wishlist.has(id)?'Added to Watchlist':'Removed from Watchlist');
},
toast(msg){
const t=document.getElementById('toast');
t.textContent=msg;t.classList.add('show');
clearTimeout(P._tt);P._tt=setTimeout(()=>t.classList.remove('show'),2000);
},
syncWL(id){
const c=document.querySelectorAll(`.scwb`);
c.forEach(el=>{if(el.closest('.sc')&&el.onclick?.toString().includes(`'${id}'`)){}});
},
search(){
document.getElementById('page-search').innerHTML=`<div id="sp"><div class="sbar"><i class="fa-solid fa-magnifying-glass"></i><input id="sinput" placeholder="Movies, shows and more" autocomplete="off" oninput="P.doSearch(this.value)"><i class="fa-solid fa-microphone" style="color:var(--w3)"></i></div><div class="srd act" id="sdefault"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span class="srh">Recent</span><span class="srcl" onclick="P.clearRecent()">Clear All</span></div><div class="sres" id="srecs">${P.buildRecent()}</div><div class="srh" style="margin-bottom:12px">Trending</div><div class="tg">${P.buildTrend()}</div></div><div class="srs" id="sresults"></div></div>`;
},
buildRecent(){
return D.shows.slice(0,3).map(s=>`<div class="srec" onclick="R.show('${s.id}')"><img class="sreci" src="${s.thumb}" alt="${s.t}"><div class="srect">${s.t}</div></div>`).join('');
},
buildTrend(){
const sec=D.sections.find(x=>x.title==='Trending Now');
return sec.ids.map(id=>{const s=D.shows.find(x=>x.id===id);if(!s)return'';return`<div class="tgc" onclick="R.show('${s.id}')"><img src="${s.thumb}" loading="lazy" alt="${s.t}"></div>`;}).join('');
},
clearRecent(){document.getElementById('srecs').innerHTML='';},
doSearch(q){
const def=document.getElementById('sdefault');
const res=document.getElementById('sresults');
if(!q.trim()){def.className='srd act';res.className='srs';return;}
def.className='srd';res.className='srs act';
const hits=D.shows.filter(s=>s.t.toLowerCase().includes(q.toLowerCase())||s.s.toLowerCase().includes(q.toLowerCase()));
if(!hits.length){res.innerHTML=`<div style="padding:32px 16px;text-align:center;color:var(--w3)">No results for "${q}"</div>`;return;}
res.innerHTML=`<div class="srl" style="padding:0 16px">`+hits.map(s=>`<div class="src" onclick="R.show('${s.id}')"><img class="srci" src="${s.thumb}" alt="${s.t}"><div class="srcn"><div style="font-weight:600;margin-bottom:2px">${s.t}</div><div style="color:var(--w4);font-size:10px">${s.s}</div></div><i class="fa-solid fa-chevron-right" style="color:var(--w4);font-size:12px"></i></div>`).join('')+`</div>`;
},
profile(){
const wl=[...D.wishlist];
document.getElementById('page-profile').innerHTML=`<div id="prp"><div class="prav"><i class="fa-solid fa-user"></i></div><div class="prn">Guest User</div><div class="pre">guest@animex.com</div><div class="prst"><div class="prsti"><div class="prstn">${wl.length}</div><div class="prstl">WATCHLIST</div></div><div class="prsti"><div class="prstn">${D.shows.length}</div><div class="prstl">SHOWS</div></div><div class="prsti"><div class="prstn">0</div><div class="prstl">WATCHED</div></div></div><div class="prbtn"><button onclick="P.toast('Sign in coming soon')">Sign In</button><button onclick="P.toast('Settings coming soon')">Settings</button></div><div class="prtabs"><div class="prtab act" onclick="P.ptab(this,'wl')">Watchlist</div><div class="prtab" onclick="P.ptab(this,'hist')">History</div></div><div id="ptab-wl">${wl.length?`<div class="prgrid">`+wl.map(id=>{const s=D.shows.find(x=>x.id===id);return s?`<div class="prgc" onclick="R.show('${s.id}')"><img src="${s.thumb}" alt="${s.t}"></div>`:''}).join('')+`</div>`:'<div style="padding:40px;text-align:center;color:var(--w3)"><i class="fa-regular fa-bookmark" style="font-size:32px;display:block;margin-bottom:8px"></i>Your watchlist is empty</div>'}</div><div id="ptab-hist" style="display:none"><div style="padding:40px;text-align:center;color:var(--w3)"><i class="fa-regular fa-clock" style="font-size:32px;display:block;margin-bottom:8px"></i>No watch history</div></div></div>`;
},
ptab(el,id){
document.querySelectorAll('.prtab').forEach(t=>t.classList.remove('act'));
el.classList.add('act');
document.getElementById('ptab-wl').style.display=id==='wl'?'':'none';
document.getElementById('ptab-hist').style.display=id==='hist'?'':'none';
},
};