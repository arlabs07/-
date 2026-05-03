const P={
_hcIdx:0,_hcTotal:0,_hcAnim:false,
home(){
const feat=D.shows.slice(0,4);
P._hcIdx=0;P._hcTotal=feat.length;P._hcAnim=false;
let h=`<div id="tb"><span class="logo">ANIMEX</span></div>`;
h+=`<div id="hc"><div class="hcs" id="hcs">`;
feat.forEach((s,i)=>{
const wl=D.wishlist.has(s.id);
h+=`<div class="hcd${i===0?' cur':''}" id="hcd${i}" onclick="R.show('${s.id}')">`;
h+=`<img class="hci" src="${s.thumb}" loading="lazy" alt="${s.t}"><div class="hco"></div>`;
h+=`<div class="hcb"><div class="hct">${s.t}</div><div class="hcm">${s.y} · ${s.langs} · ${s.s.split(' · ')[0]}</div>`;
h+=`<div class="hca">`;
h+=`<button class="btnp" onclick="event.stopPropagation();R.ep('${s.id}','${s.episodes[0].id}')"><i class="fa-solid fa-play"></i> Play</button>`;
h+=`<button class="btnw${wl?' on':''}" onclick="event.stopPropagation();P.toggleWL('${s.id}',this)"><i class="fa-${wl?'solid':'regular'} fa-plus"></i></button>`;
h+=`</div></div></div>`;
});
h+=`</div>`;
h+=`<div class="hcdots" id="hcdots">`;
feat.forEach((_,i)=>h+=`<div class="hcdot${i===0?' act':''}" id="dot${i}" onclick="P.hcGo(${i})"></div>`);
h+=`</div></div>`;
const cw=D.getContinueWatching();
if(cw.length){
h+=`<div class="sec"><div class="sech"><span class="sect">Continue Watching</span></div><div class="secr" id="cw-row">`;
cw.forEach(({show:s,ep,pct})=>{
h+=`<div class="cwc" onclick="R.ep('${s.id}','${ep.id}')">`;
h+=`<div class="cwcw"><img class="cwci" src="${ep.thumb}" alt="${ep.t}">`;
h+=`<div class="cwcpb"><div class="cwcpbf" style="width:${pct}%"></div></div></div>`;
h+=`<div class="cwcn">${ep.t}</div><div class="cwcs">S${ep.s} E${ep.e} · ${s.t}</div></div>`;
});
h+=`</div></div>`;
}
if(D.wishlist.size){
h+=`<div class="sec"><div class="sech"><span class="sect">Your Watchlist</span></div><div class="secr">`;
[...D.wishlist].forEach(id=>{
const s=D.shows.find(x=>x.id===id);if(!s)return;
h+=`<div class="sc" onclick="R.show('${s.id}')"><img class="sci" src="${s.thumb}" loading="lazy" alt="${s.t}"><div class="sct">${s.t}</div></div>`;
});
h+=`</div></div>`;
}
D.sections.slice(1).forEach(sec=>{
h+=`<div class="sec"><div class="sech"><span class="sect">${sec.title}</span>`;
h+=`<div class="seca" onclick="R.seeAll('${sec.title}')"><i class="fa-solid fa-chevron-right"></i></div></div><div class="secr">`;
sec.ids.forEach(id=>{
const s=D.shows.find(x=>x.id===id);if(!s)return;
h+=`<div class="sc" onclick="R.show('${s.id}')"><img class="sci" src="${s.thumb}" loading="lazy" alt="${s.t}"><div class="sct">${s.t}</div></div>`;
});
h+=`</div></div>`;
});
document.getElementById('page-home').innerHTML=h;
},
hcGo(idx){
if(P._hcAnim||idx===P._hcIdx)return;
const prev=document.getElementById('hcd'+P._hcIdx);
const next=document.getElementById('hcd'+idx);
if(!prev||!next)return;
P._hcAnim=true;
prev.className='hcd turn-out';
setTimeout(()=>{
prev.className='hcd';
next.className='hcd turn-in';
setTimeout(()=>{next.className='hcd cur';P._hcAnim=false;},500);
},480);
document.querySelectorAll('.hcdot').forEach((d,i)=>d.className='hcdot'+(i===idx?' act':''));
P._hcIdx=idx;
},
hcNext(){P.hcGo((P._hcIdx+1)%P._hcTotal);},
hcPrev(){P.hcGo((P._hcIdx-1+P._hcTotal)%P._hcTotal);},
toggleWL(id,el){
if(D.wishlist.has(id))D.wishlist.delete(id);else D.wishlist.add(id);
const on=D.wishlist.has(id);
el.className='btnw'+(on?' on':'');
el.innerHTML=`<i class="fa-${on?'solid':'regular'} fa-plus"></i>`;
P.toast(on?'Added to Watchlist':'Removed from Watchlist');
},
toggleWLShow(id){
if(D.wishlist.has(id))D.wishlist.delete(id);else D.wishlist.add(id);
const on=D.wishlist.has(id);
const btn=document.getElementById('sdoact-wl');
if(btn){btn.className='sdoact'+(on?' on':'');btn.innerHTML=`<i class="fa-${on?'solid':'regular'} fa-bookmark"></i><span>Watchlist</span>`;}
P.toast(on?'Added to Watchlist':'Removed from Watchlist');
},
toast(msg){
const t=document.getElementById('toast');
t.textContent=msg;t.classList.add('show');
clearTimeout(P._tt);P._tt=setTimeout(()=>t.classList.remove('show'),2200);
},
search(){
document.getElementById('page-search').innerHTML=`<div id="sp">
<div class="sbar"><i class="fa-solid fa-magnifying-glass"></i><input id="sinput" placeholder="Movies, shows and more" autocomplete="off" oninput="P.doSearch(this.value)"><i class="fa-solid fa-microphone" style="color:var(--w3)"></i></div>
<div class="srd act" id="sdefault">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span class="srh">Recent</span><span class="srcl" onclick="document.getElementById('srecs').innerHTML=''">Clear All</span></div>
<div class="sres" id="srecs">${D.shows.slice(0,3).map(s=>`<div class="srec" onclick="R.show('${s.id}')"><img class="sreci" src="${s.thumb}" alt="${s.t}"><div class="srect">${s.t}</div></div>`).join('')}</div>
<div class="srh" style="margin-bottom:12px">Trending</div>
<div class="tg">${(D.sections.find(x=>x.title==='Trending Now')||{ids:[]}).ids.map(id=>{const s=D.shows.find(x=>x.id===id);return s?`<div class="tgc" onclick="R.show('${s.id}')"><img src="${s.thumb}" loading="lazy" alt="${s.t}"></div>`:''}).join('')}</div>
</div>
<div class="srs" id="sresults"></div>
</div>`;
},
doSearch(q){
const def=document.getElementById('sdefault'),res=document.getElementById('sresults');
if(!q.trim()){def.className='srd act';res.className='srs';return;}
def.className='srd';res.className='srs act';
const hits=D.shows.filter(s=>s.t.toLowerCase().includes(q.toLowerCase())||s.s.toLowerCase().includes(q.toLowerCase()));
if(!hits.length){res.innerHTML=`<div style="padding:32px 16px;text-align:center;color:var(--w3)">No results for "${q}"</div>`;return;}
res.innerHTML=`<div class="srl" style="padding:0 16px">`+hits.map(s=>`<div class="src" onclick="R.show('${s.id}')"><img class="srci" src="${s.thumb}" alt="${s.t}"><div class="srcn"><div style="font-weight:600;margin-bottom:2px">${s.t}</div><div style="color:var(--w4);font-size:10px">${s.s}</div></div><i class="fa-solid fa-chevron-right" style="color:var(--w4);font-size:12px"></i></div>`).join('')+`</div>`;
},
profile(){
const wl=[...D.wishlist];
document.getElementById('page-profile').innerHTML=`<div id="prp">
<div class="prav"><i class="fa-solid fa-user"></i></div>
<div class="prn">Guest User</div><div class="pre">guest@animex.com</div>
<div class="prst">
<div class="prsti"><div class="prstn">${wl.length}</div><div class="prstl">WATCHLIST</div></div>
<div class="prsti"><div class="prstn">${D.shows.length}</div><div class="prstl">SHOWS</div></div>
<div class="prsti"><div class="prstn">${Object.keys(D.progress).length}</div><div class="prstl">WATCHED</div></div>
</div>
<div class="prbtn"><button onclick="P.toast('Sign in coming soon')">Sign In</button><button onclick="P.toast('Settings coming soon')">Settings</button></div>
<div class="prtabs"><div class="prtab act" onclick="P.ptab(this,'wl')">Watchlist</div><div class="prtab" onclick="P.ptab(this,'hist')">History</div></div>
<div id="ptab-wl">${wl.length?`<div class="prgrid">`+wl.map(id=>{const s=D.shows.find(x=>x.id===id);return s?`<div class="prgc" onclick="R.show('${s.id}')"><img src="${s.thumb}" alt="${s.t}"></div>`:''}).join('')+`</div>`:'<div style="padding:40px;text-align:center;color:var(--w3)"><i class="fa-regular fa-bookmark" style="font-size:32px;display:block;margin-bottom:8px"></i>Your watchlist is empty</div>'}</div>
<div id="ptab-hist" style="display:none">${Object.keys(D.progress).length?`<div class="prgrid">`+Object.keys(D.progress).map(id=>{const s=D.shows.find(x=>x.id===id);return s?`<div class="prgc" onclick="R.show('${s.id}')"><img src="${s.thumb}" alt="${s.t}"></div>`:''}).join('')+`</div>`:'<div style="padding:40px;text-align:center;color:var(--w3)"><i class="fa-regular fa-clock" style="font-size:32px;display:block;margin-bottom:8px"></i>No watch history</div>'}</div>
</div>`;
},
ptab(el,id){
document.querySelectorAll('.prtab').forEach(t=>t.classList.remove('act'));
el.classList.add('act');
document.getElementById('ptab-wl').style.display=id==='wl'?'':'none';
document.getElementById('ptab-hist').style.display=id==='hist'?'':'none';
},
};