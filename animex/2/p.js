const P=(()=>{
'use strict';
const _mc=new Map();
const CN='ax-img-v3';
let _cr=null;
const gC=()=>{if(!_cr)_cr='caches'in window?caches.open(CN):Promise.resolve(null);return _cr;};
const _io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(!e.isIntersecting)return;const img=e.target,src=img.dataset.src;if(!src){_io.unobserve(img);return;}_io.unobserve(img);const go=()=>{if(_mc.has(src)){img.src=_mc.get(src);img.classList.add('li');return;}gC().then(c=>{if(c)return c.match(src).then(r=>r?r.blob():fetch(src).then(fr=>{c.put(src,fr.clone());return fr.blob();}));return fetch(src).then(r=>r.blob());}).then(b=>typeof createImageBitmap!='undefined'?createImageBitmap(b).then(bm=>{bm.close();return URL.createObjectURL(b);}):URL.createObjectURL(b)).then(u=>{_mc.set(src,u);img.src=u;img.classList.add('li');}).catch(()=>{img.src=src;img.classList.add('li');});};'requestIdleCallback'in window?requestIdleCallback(go,{timeout:800}):setTimeout(go,0);delete img.dataset.src;});},{rootMargin:'200px'});
const lI=(src,cls,alt='')=>`<img data-src="${src}" src="" class="${cls}" alt="${alt}" loading="lazy">`;
const obsL=c=>c.querySelectorAll('img[data-src]').forEach(i=>_io.observe(i));
const wlBtn=(id,xc='')=>{const on=D.wishlist.has(id);return`<button class="btnw${on?' on':''}${xc?' '+xc:''}" data-wl="${id}">${on?IC.check:IC.add}</button>`;};
function _card(s){return`<div class="sc" onclick="R.show('${s.id}')"><div class="sc-i"><div class="sc-img-w">${lI(s.thumb,'sci',s.title)}</div><div class="sc-gl"></div><div class="sc-bot"><div class="sc-t">${s.title}</div><div class="sc-m">⭐${s.rating} · ${s.year}</div></div></div></div>`;}
function _mangaCard(m){return`<div class="sc" onclick="R.manga('${m.id}')"><div class="sc-i"><div class="sc-img-w">${lI(m.thumb,'sci',m.title)}</div><div class="sc-gl"></div><div class="sc-mg-badge">MANGA</div><div class="sc-bot"><div class="sc-t">${m.title}</div><div class="sc-m">⭐${m.rating} · ${m.year}</div></div></div></div>`;}
let _tt=null;
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('on');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('on'),2400);}
/* ── Rating ── */
const _rKey='ax_rt2';
const _rtAll=()=>{try{return JSON.parse(localStorage.getItem(_rKey)||'{}')}catch{return{}}};
const _rtGet=id=>_rtAll()[id]||0;
const _rtSet=(id,v)=>{const a=_rtAll();a[id]=v;try{localStorage.setItem(_rKey,JSON.stringify(a))}catch{}};
function openRating(id){const s=D.getShow(id)||D.getManga(id);if(!s)return;const cur=_rtGet(id);const stars=Array.from({length:5},(_,i)=>{const v=i+1;return`<button class="rt-star${v<=cur?' on':''}" data-v="${v}" onclick="P._doRate('${id}',${v})">★</button>`;}).join('');const html=`<div class="rt-wrap"><div class="rt-title">${s.title}</div><div class="rt-row">${stars}</div><div class="rt-hint">${cur?`Your rating: ${cur}/5`:'Tap to rate'}</div></div>`;let m=document.getElementById('rt-modal');if(!m){m=document.createElement('div');m.id='rt-modal';m.onclick=e=>{if(e.target===m)m.remove();};document.body.appendChild(m);}m.innerHTML=`<div class="rt-box">${html}</div>`;m.classList.add('on');}
function _doRate(id,v){_rtSet(id,v);const m=document.getElementById('rt-modal');if(m){const hint=m.querySelector('.rt-hint');if(hint)hint.textContent=`Your rating: ${v}/5`;m.querySelectorAll('.rt-star').forEach(b=>b.classList.toggle('on',+b.dataset.v<=v));}toast(`Rated ${v}/5 ★`);}
/* ── Share ── */
function share(id,eid){const s=D.getShow(id)||D.getManga(id);if(!s)return;const ep=eid?D.getEp(id,eid):null;const mv=!!s.isMovie;const title=mv?s.title:ep?`${s.title} · ${ep.title}`:s.title;const text=ep?ep.desc||s.desc:s.desc;const url=eid?`${location.origin}${location.pathname}#ep/${id}/${eid}`:s.isManga?`${location.origin}${location.pathname}#manga/${id}`:`${location.origin}${location.pathname}#show/${id}`;if(navigator.share){navigator.share({title,text,url}).catch(()=>{});}else{navigator.clipboard?navigator.clipboard.writeText(url).then(()=>toast('Link copied!')).catch(()=>toast('Link: '+url)):toast('Link: '+url);}}
/* ── Dynamic metadata ── */
function setMeta(id,eid){const s=D.getShow(id)||D.getManga(id);if(!s)return;const ep=eid?D.getEp(id,eid):null;const mv=!!s.isMovie;const isManga=!!s.isManga;const title=ep&&!mv?`${ep.title} · ${s.title} — AnimeX`:`${s.title} — AnimeX`;const desc=ep?ep.desc||s.desc:s.desc;const img=ep?ep.thumb||s.thumb:s.hero||s.thumb;const url=eid?`${location.origin}${location.pathname}#ep/${id}/${eid}`:isManga?`${location.origin}${location.pathname}#manga/${id}`:`${location.origin}${location.pathname}#show/${id}`;const _s=(sel,attr,val)=>{let el=document.querySelector(sel);if(!el){el=document.createElement('meta');if(attr==='name')el.setAttribute('name',sel.match(/name="([^"]+)"/)?.[1]||'');else el.setAttribute('property',sel.match(/property="([^"]+)"/)?.[1]||'');document.head.appendChild(el);}el.setAttribute('content',val);};document.title=title;_s('meta[name="description"]','name',desc||'');_s('meta[property="og:title"]','property',title);_s('meta[property="og:description"]','property',desc||'');_s('meta[property="og:image"]','property',img||'');_s('meta[property="og:url"]','property',url);_s('meta[property="og:type"]','property',isManga?'book':'video.other');_s('meta[name="twitter:card"]','name','summary_large_image');_s('meta[name="twitter:title"]','name',title);_s('meta[name="twitter:description"]','name',desc||'');_s('meta[name="twitter:image"]','name',img||'');}
document.addEventListener('click',e=>{const b=e.target.closest('[data-wl]');if(!b)return;e.stopPropagation();const id=b.dataset.wl,on=D.toggleWL(id);document.querySelectorAll(`[data-wl="${id}"]`).forEach(x=>{x.classList.toggle('on',on);x.innerHTML=on?IC.check:IC.add;});document.querySelectorAll(`[data-wl-s="${id}"]`).forEach(x=>{x.classList.toggle('on',on);x.innerHTML=(on?IC.check:IC.bookmark)+'<span>Watchlist</span>';});toast(on?'Added to Watchlist':'Removed from Watchlist');});
let _hc={shows:[],idx:0,tmr:null,anim:false,tx:0,tt:0};
function hcRnd(){const c=document.getElementById('hcs');if(!c)return;c.innerHTML='';_hc.shows.forEach((s,i)=>{const d=document.createElement('div');d.className='hcd';d.id='hcd'+i;const heroSrc=D.heroImg(s);d.innerHTML=`<img class="hci li" src="${heroSrc}" alt="${s.title}"><div class="hco"></div><div class="hcb"><div class="hct">${s.title}</div><div class="hcm">${s.year} · ${s.subtitle.split(' · ')[0]}</div><div class="hca"><button class="btnp" onclick="event.stopPropagation();R.ep('${s.id}','${s.episodes[0].id}')">${IC.play} Play</button>${wlBtn(s.id)}<button class="btni" onclick="event.stopPropagation();R.show('${s.id}')">${IC.info}</button></div></div>`;d.addEventListener('click',e=>{if(e.target.closest('.btnp')||e.target.closest('.btnw')||e.target.closest('.btni'))return;R.show(s.id);});c.appendChild(d);});hcSlots();}
function hcSlots(){const t=_hc.shows.length;_hc.shows.forEach((_,i)=>{const c=document.getElementById('hcd'+i);if(!c)return;const sl=(i-_hc.idx+t)%t;c.dataset.slot=sl;c.style.pointerEvents=sl===0?'auto':'none';});document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===_hc.idx));}
function hcGo(dir){if(_hc.anim)return;_hc.anim=true;const t=_hc.shows.length,pi=_hc.idx;_hc.idx=((_hc.idx+dir)+t)%t;const pc=document.getElementById('hcd'+pi);if(pc){pc.classList.add(dir>0?'hfl':'hfr');pc.addEventListener('animationend',()=>{pc.classList.remove('hfl','hfr');hcSlots();_hc.anim=false;},{once:true});}else{hcSlots();_hc.anim=false;}document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===_hc.idx));}
function hcAuto(){clearInterval(_hc.tmr);_hc.tmr=setInterval(()=>hcGo(1),4500);}
function hcTouch(){const el=document.getElementById('hc');if(!el)return;el.addEventListener('touchstart',e=>{_hc.tx=e.touches[0].clientX;_hc.tt=Date.now();},{passive:true});el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-_hc.tx,dt=Date.now()-_hc.tt;if(Math.abs(dx)>44&&dt<420){clearInterval(_hc.tmr);hcGo(dx<0?1:-1);hcAuto();}},{passive:true});}
function _skeletonRow(n=4){let h='<div class="secr">';for(let i=0;i<n;i++)h+=`<div class="sc sk-card"><div class="sc-i"><div class="sc-img-w sk"></div></div></div>`;return h+'</div>';}
function _skeletonHero(){return`<div id="tb"><span class="logo">ANIMEX</span></div><div id="hc"><div class="hc-stack" id="hcs"><div class="hcd sk-hero"></div></div><div class="hcdots"><div class="hcdot act"></div><div class="hcdot"></div><div class="hcdot"></div></div></div><div class="sec"><div class="sech"><span class="sect sk-text" style="width:140px;height:20px;display:block"></span></div>${_skeletonRow()}</div><div class="sec">${_skeletonRow()}</div>`;}
function home(){
const pg=document.getElementById('page-home');
if(!pg)return;
pg.innerHTML=_skeletonHero();
D.onReady(()=>{
_hc.shows=(D.sections[0]&&D.sections[0].ids||[]).map(id=>D.getShow(id)).filter(Boolean);
if(!_hc.shows.length)_hc.shows=D.shows.slice(0,4);
_hc.idx=0;_hc.anim=false;clearInterval(_hc.tmr);
let h=`<div id="tb"><span class="logo">ANIMEX</span></div><div id="hc"><div class="hc-stack" id="hcs"></div><div class="hcdots">`;
_hc.shows.forEach((_,i)=>h+=`<div class="hcdot${i===0?' act':''}" onclick="P._hcGoTo(${i})"></div>`);
h+=`</div></div>`;
const cw=D.getContinueWatching();
if(cw.length){h+=`<div class="sec stag"><div class="sech"><span class="sect">Continue Watching</span></div><div class="secr">`;cw.forEach(({show:s,ep,pct})=>{const mv=!!s.isMovie;const sub=mv?ep.dur:(ep.s!=null?`S${ep.s} E${ep.e}`:'');h+=`<div class="cwc" onclick="R.ep('${s.id}','${ep.id}')"><div class="cww">${lI(ep.thumb||s.thumb,'cwi',s.title)}<div class="cwpb"><div class="cwpbf" style="width:${pct}%"></div></div></div><div class="cwn">${mv?s.title:ep.title}</div><div class="cws">${sub?sub+' · ':''}${s.title}</div></div>`;});h+=`</div></div>`;}
if(D.wishlist.size){h+=`<div class="sec stag"><div class="sech"><span class="sect">Your Watchlist</span></div><div class="secr">`;[...D.wishlist].forEach(id=>{const s=D.getShow(id)||D.getManga(id);if(s)h+=s.isManga?_mangaCard(s):_card(s);});h+=`</div></div>`;}
// Video sections
D.sections.slice(1).forEach(sec=>{if(!sec||!sec.ids)return;h+=`<div class="sec"><div class="sech"><span class="sect">${sec.title}</span><button class="seca" onclick="R.seeAll('${sec.title}')">See all ${IC.chevRight}</button></div><div class="secr">`;sec.ids.forEach(id=>{const s=D.getShow(id);if(s)h+=_card(s);});h+=`</div></div>`;});
// Manga sections
D.mangaSections.forEach(sec=>{if(!sec||!sec.ids)return;h+=`<div class="sec"><div class="sech"><span class="sect">${sec.title}</span></div><div class="secr">`;sec.ids.forEach(id=>{const m=D.getManga(id);if(m)h+=_mangaCard(m);});h+=`</div></div>`;});
pg.innerHTML=h;
requestAnimationFrame(()=>{hcRnd();hcTouch();hcAuto();obsL(pg);});
});
}
function search(){
const pg=document.getElementById('page-search');
if(!pg)return;
D.onReady(()=>{
const tr=(D.sections.find(x=>x&&x.title==='Trending Now')||{ids:[]}).ids;
pg.innerHTML=`<div id="sp"><div class="sbar">${IC.search}<input id="sinput" placeholder="Movies, shows, manga and more" autocomplete="off">${IC.mic}</div><div class="srd act" id="sdef"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span class="srh">Recent</span><span class="srcl" id="clrb">Clear All</span></div><div class="sres" id="srecs">${D.shows.slice(0,3).map(s=>`<div class="srec" onclick="R.show('${s.id}')">${lI(s.thumb,'sreci',s.title)}<div class="srect">${s.title}</div></div>`).join('')}</div><div class="srh" style="margin-bottom:12px">Trending</div><div class="tg">${(tr||[]).map(id=>{const s=D.getShow(id);return s?`<div class="tgc" onclick="R.show('${s.id}')">${lI(s.thumb,'',s.title)}</div>`:''}).join('')}</div></div><div class="srs" id="sres"></div></div>`;
document.getElementById('sinput').addEventListener('input',e=>doSearch(e.target.value));
document.getElementById('clrb').addEventListener('click',()=>{document.getElementById('srecs').innerHTML='';});
obsL(pg);
});
}
function doSearch(q){const df=document.getElementById('sdef'),rs=document.getElementById('sres');if(!df||!rs)return;if(!q.trim()){df.className='srd act';rs.className='srs';return;}df.className='srd';rs.className='srs act';
const allItems=[...D.shows,...D.mangas];
const hits=allItems.filter(s=>s.title.toLowerCase().includes(q.toLowerCase())||(s.subtitle||'').toLowerCase().includes(q.toLowerCase()));
if(!hits.length){rs.innerHTML=`<div style="padding:32px 16px;text-align:center;color:var(--w3)">No results for "${q}"</div>`;return;}rs.innerHTML=`<div class="srl" style="padding:0 16px">`+hits.map(s=>`<div class="src" onclick="${s.isManga?`R.manga('${s.id}')`:`R.show('${s.id}')`}">${lI(s.thumb,'srci',s.title)}<div class="srcn"><div style="font-weight:600;margin-bottom:2px">${s.title}${s.isManga?'<span class="sc-mg-badge" style="position:relative;top:0;left:0;margin-left:6px">MANGA</span>':''}</div><div style="color:var(--w4);font-size:10px">${s.subtitle||''}</div></div>${IC.chevRight}</div>`).join('')+`</div>`;obsL(rs);}
function profile(){
const pg=document.getElementById('page-profile');
if(!pg)return;
D.onReady(()=>{
const wl=[...D.wishlist],cw=D.getContinueWatching();
let h=`<div id="prp"><div class="prh fade-up"><div class="prav"><span>A</span></div><div class="pri"><div class="prn">Animex Viewer</div><div class="prs">${wl.length} in watchlist · ${cw.length} in progress</div></div></div>`;
if(cw.length){h+=`<div class="prtit">Continue Watching</div><div class="prcr">`;cw.slice(0,6).forEach(({show:s,ep,pct})=>{const mv=!!s.isMovie;h+=`<div class="prcw" onclick="R.ep('${s.id}','${ep.id}')"><div class="prcwi">${lI(ep.thumb||s.thumb,'',s.title)}<div class="prcwb"><div class="prcwf" style="width:${pct}%"></div></div></div><div class="prcwn">${s.title}</div><div class="prcws">${mv?ep.dur:`EP ${ep.e} · ${pct}%`}</div></div>`;});h+=`</div>`;}
if(wl.length){h+=`<div class="prtit">Your Watchlist</div><div class="prwg">`;wl.forEach(id=>{const s=D.getShow(id)||D.getManga(id);if(!s)return;const click=s.isManga?`R.manga('${s.id}')`:`R.show('${s.id}')`;h+=`<div class="prwc" onclick="${click}">${lI(s.thumb,'',s.title)}<div class="prwov"><div class="prwn">${s.title}</div><div class="prwm">${s.isManga?'MANGA':'⭐'+s.rating+' · '+s.year}</div></div></div>`;});h+=`</div>`;}
if(!wl.length&&!cw.length)h+=`<div class="prempty">${IC.smile}<p>Start watching or reading to see your history here</p></div>`;
h+=`<div style="height:16px"></div></div>`;
pg.innerHTML=h;obsL(pg);
});
}
function buildEps(sid,season,curId=null,col=true){const s=D.getShow(sid);if(!s)return'';const eps=s.episodes.filter(e=>e.s===season),SI=4,nm=eps.length>SI;const shown=(col&&nm)?eps.slice(0,SI):eps;let h=`<div class="epc" id="epc-${sid}-${season}">`;shown.forEach(e=>{const pct=D.getProgress(sid,e.id),act=e.id===curId;h+=`<div class="er${act?' era':''}" onclick="R.ep('${sid}','${e.id}')"><div class="ertw">${lI(e.thumb,'eri',e.title)}${pct>2?`<div class="epb"><div class="epbf" style="width:${pct}%"></div></div>`:''}<div class="erio">${IC.playCircle}</div></div><div class="erib"><div class="ern">${e.title}</div><div class="erm">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div><div class="erd">${e.desc||''}</div></div></div>`;});h+=`</div>`;if(nm){h+=`<button class="vmb" onclick="P.openPlFull('${sid}',${curId?`'${curId}'`:'null'},${season})">${IC.expandMore}<span>Show ${eps.length-SI} more</span></button>`;}return h;}
/* ── Manga chapters list ── */
function buildMangaChapters(mid,manga){
const chs=manga.chapters||[];
if(!chs.length)return'<p style="padding:20px;color:var(--w3);font-size:13px">No chapters available yet</p>';
let h='<div class="epc">';
chs.forEach(ch=>{
const total=(ch.pages||[]).length||0;
const pg=D.getMangaProgress(mid,ch.id)||0;
const pct=total>0?Math.min(100,Math.round(pg/total*100)):0;
const label=ch.vol?`Vol.${ch.vol} · Ch.${ch.ch}`:`Ch.${ch.ch}`;
h+=`<div class="mch-row" onclick="R.chapter('${mid}','${ch.id}')">
<div class="mch-num">${label}</div>
<div class="mch-info">
<div class="mch-title">${ch.title||('Chapter '+ch.ch)}</div>
<div class="mch-meta">${ch.date||''}${total?' · '+total+' pages':''}${pct>0?' · '+pct+'% read':''}</div>
${pct>0?`<div class="mch-pb"><div class="mch-pbf" style="width:${pct}%"></div></div>`:''}
</div>
<div class="mch-ic">${IC.playCircle}</div>
</div>`;
});
h+='</div>';
return h;
}
function tVM(sid,season,btn){P.openPlFull(sid,null,season);}
function openPlFull(sid,curId,startSeason){const s=D.getShow(sid);if(!s)return;const container=document.getElementById('pl-fs');if(!container)return;const eps=s.episodes;const seasons=[...new Set(eps.map(e=>e.s))];const activeSeason=startSeason||seasons[0];container.innerHTML=`<div class="plfs-bar"><button class="plfs-back" onclick="P.closePlFull()">${IC.chevLeft}</button><div class="plfs-title">${s.title}</div></div><div class="plfs-stabs" id="plfs-tabs">${seasons.map(sn=>`<div class="plfs-tab${sn===activeSeason?' act':''}" onclick="P._plfsTab('${sid}',${sn},this)">Season ${sn}</div>`).join('')}</div>`;const body=document.createElement('div');body.className='plfs-body';body.id='plfs-body';container.appendChild(body);_plfsRnd(sid,activeSeason,curId);const vl=document.createElement('button');vl.className='plfs-vl';vl.innerHTML=`${IC.expandLess}<span>View Less</span>`;vl.onclick=()=>closePlFull();container.appendChild(vl);container.classList.add('op');document.body.style.overflow='hidden';}
function _plfsRnd(sid,season,curId){const s=D.getShow(sid);if(!s)return;const body=document.getElementById('plfs-body');if(!body)return;const eps=s.episodes.filter(e=>e.s===season);body.innerHTML=eps.map(e=>{const pct=D.getProgress(sid,e.id),act=e.id===curId;return`<div class="plfs-ep${act?' act':''}" onclick="P.closePlFull();R.ep('${sid}','${e.id}')"><div class="plfs-tw">${lI(e.thumb,'plfs-ti',e.title)}${pct>2?`<div class="epb"><div class="epbf" style="width:${pct}%"></div></div>`:''}<div class="erio">${IC.playCircle}</div></div><div class="plfs-meta"><div class="plfs-en">${e.title}</div><div class="plfs-em">S${e.s} E${e.e} · ${e.date} · ${e.dur}</div><div class="plfs-ed">${e.desc||''}</div></div></div>`;}).join('');obsL(body);}
function _plfsTab(sid,season,el){document.querySelectorAll('.plfs-tab').forEach(t=>t.classList.remove('act'));el.classList.add('act');_plfsRnd(sid,season,null);}
function closePlFull(){const c=document.getElementById('pl-fs');if(c){c.classList.remove('op');document.body.style.overflow='';}}
return{home,search,profile,buildEps,buildMangaChapters,tVM,toast,lI,obsL,_card,_mangaCard,wlBtn,openPlFull,closePlFull,_plfsRnd,_plfsTab,share,openRating,_doRate,setMeta,
_hcGoTo(idx){if(idx===_hc.idx)return;clearInterval(_hc.tmr);_hc.idx=idx;hcSlots();document.querySelectorAll('.hcdot').forEach((d,i)=>d.classList.toggle('act',i===idx));hcAuto();}};
})();
P._twls=function(id,btn){const on=D.toggleWL(id);document.querySelectorAll(`[data-wl-s="${id}"]`).forEach(b=>{b.classList.toggle('on',on);b.innerHTML=(on?IC.check:IC.bookmark)+'<span>Watchlist</span>';});document.querySelectorAll(`[data-wl="${id}"]`).forEach(b=>{b.classList.toggle('on',on);b.innerHTML=on?IC.check:IC.add;});P.toast(on?'Added to Watchlist':'Removed from Watchlist');};
document.addEventListener('DOMContentLoaded',()=>{D.load();R.init();KB.bind();});