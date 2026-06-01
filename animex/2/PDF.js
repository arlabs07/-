const MR=(()=>{
'use strict';
/* AnimeX Manga Reader v1 — AnyFlip-inspired
   Sources: image URL array | direct PDF (pdf.js) | Google Drive | Dropbox | iframe fallback
*/
const PDFCDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFWK='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let ST={pages:[],cur:0,total:0,zoom:1,fs:false,mode:'single',pdfDoc:null,pdfPending:new Set()};
let _mid=null,_chid=null,_manga=null,_ch=null;
let _si=false;

const _key=(m,c)=>`ax_mg_${m}_${c}`;
const _save=()=>{try{localStorage.setItem(_key(_mid,_chid),String(ST.cur));}catch{}};
const _load=()=>{try{return parseInt(localStorage.getItem(_key(_mid,_chid))||'0',10)||0;}catch{return 0;}};

function injectCSS(){
if(_si)return;_si=true;
const s=document.createElement('style');
s.textContent=`
/* ── Manga Reader Overlay ── */
#mro{
  position:fixed;inset:0;background:#3a3a3a;z-index:700;
  display:flex;flex-direction:column;
  transform:translateY(100%);
  transition:transform .38s cubic-bezier(.32,.72,0,1);
  overflow:hidden;
}
#mro.op{transform:none}

/* Root flex column fills the overlay */
#mr-root{
  display:flex;flex-direction:column;
  width:100%;height:100%;
  overflow:hidden;position:relative;
}

/* Spinner */
#mr-sp{
  position:absolute;top:50%;left:50%;z-index:30;
  width:44px;height:44px;margin:-22px;
  border:4px solid rgba(255,255,255,.12);border-top-color:#fff;
  border-radius:50%;display:none;pointer-events:none;
}
#mr-sp.on{display:block;animation:mrSpin .72s linear infinite}
@keyframes mrSpin{to{transform:rotate(360deg)}}

/* ── Top bar — always visible ── */
#mr-top{
  display:flex;align-items:center;gap:4px;
  padding:10px 8px 8px;
  background:rgba(10,10,14,.96);
  border-bottom:1px solid rgba(255,255,255,.06);
  flex-shrink:0;z-index:20;
}
#mr-brand{
  font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.1em;
  background:linear-gradient(135deg,#fff 0%,#aaa 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  flex-shrink:0;user-select:none;margin-right:4px;
}
#mr-chinfo{
  font-size:11px;color:rgba(255,255,255,.4);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  flex:1;min-width:0;
}
#mr-chiname{color:rgba(255,255,255,.25)}
.mr-tb{
  width:36px;height:36px;border-radius:50%;border:none;
  background:transparent;color:rgba(255,255,255,.58);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .15s,color .15s;flex-shrink:0;
}
.mr-tb:hover{background:rgba(255,255,255,.1);color:#fff}
.mr-tb svg{width:20px;height:20px}

/* ── Viewport — fills all remaining space between top and bottom bars ── */
#mr-view{
  flex:1;
  display:flex;align-items:center;justify-content:center;
  position:relative;
  overflow:hidden;
  min-height:0; /* critical: allows flex child to shrink below content size */
}

/* ── Book wrapper ── */
#mr-book{
  display:flex;align-items:stretch;position:relative;
  max-height:100%;width:100%;justify-content:center;
  filter:drop-shadow(-6px 8px 32px rgba(0,0,0,.9)) drop-shadow(4px 6px 16px rgba(0,0,0,.55));
}
.mr-spine{
  width:12px;flex-shrink:0;
  background:linear-gradient(to right,#040404 0%,#161616 30%,#2a2a2a 55%,#1e1e1e 100%);
  border-radius:3px 0 0 3px;
}
#mr-pg-wrap{
  position:relative;background:#fff;overflow:hidden;
  display:flex;flex-direction:column;flex:1;max-width:600px;
}
#mr-pg{
  display:flex;align-items:center;justify-content:center;
  background:#fff;width:100%;flex:1;position:relative;overflow:hidden;
}
.mr-img{
  max-width:100%;max-height:100%;
  width:auto;height:auto;
  object-fit:contain;display:block;
  user-select:none;-webkit-user-select:none;
  transform-origin:center;
  transition:transform .18s;
}
.mr-edge{
  width:8px;flex-shrink:0;
  background:linear-gradient(to right,#c8c8c8 0%,#eee 35%,#e0e0e0 65%,#d4d4d4 100%);
  border-radius:0 3px 3px 0;
}

/* Page flip animations */
@keyframes mrFO{0%{transform:perspective(900px) rotateY(0);transform-origin:left center;opacity:1}100%{transform:perspective(900px) rotateY(-78deg);transform-origin:left center;opacity:0}}
@keyframes mrFI{0%{transform:perspective(900px) rotateY(78deg);transform-origin:right center;opacity:0}100%{transform:perspective(900px) rotateY(0);transform-origin:right center;opacity:1}}
@keyframes mrBO{0%{transform:perspective(900px) rotateY(0);transform-origin:right center;opacity:1}100%{transform:perspective(900px) rotateY(78deg);transform-origin:right center;opacity:0}}
@keyframes mrBI{0%{transform:perspective(900px) rotateY(-78deg);transform-origin:left center;opacity:0}100%{transform:perspective(900px) rotateY(0);transform-origin:left center;opacity:1}}
.mr-ao-fwd{animation:mrFO .24s ease-in forwards;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff}
.mr-ai-fwd{animation:mrFI .28s .08s ease-out both}
.mr-ao-bwd{animation:mrBO .24s ease-in forwards;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff}
.mr-ai-bwd{animation:mrBI .28s .08s ease-out both}

/* ── Webtoon scroll mode ── */
#mr-wt{
  display:none;flex-direction:column;align-items:center;
  width:100%;height:100%;
  overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;
}
#mr-wt::-webkit-scrollbar{width:4px}
#mr-wt::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
.mr-wt-img{width:100%;max-width:720px;display:block;user-select:none;border-bottom:2px solid #3a3a3a}
.mr-wt-ph{
  width:100%;max-width:720px;min-height:380px;
  background:rgba(255,255,255,.04);display:flex;align-items:center;
  justify-content:center;color:rgba(255,255,255,.18);font-size:12px;
}

/* Webtoon mode active state */
#mr-root.mr-wt #mr-pg{display:none}
#mr-root.mr-wt #mr-wt{display:flex}
#mr-root.mr-wt .mr-spine,#mr-root.mr-wt .mr-edge{display:none}
#mr-root.mr-wt #mr-pg-wrap{background:transparent;max-width:100%}
#mr-root.mr-wt #mr-book{filter:none;width:100%}

/* ── Nav arrows — hidden on mobile, shown on desktop only ── */
.mr-arr{
  position:absolute;top:50%;transform:translateY(-50%);
  z-index:10;width:40px;height:68px;border-radius:8px;border:none;
  background:rgba(0,0,0,.28);color:rgba(255,255,255,.5);
  cursor:pointer;display:none; /* hidden by default (mobile) */
  align-items:center;justify-content:center;
  transition:all .15s;backdrop-filter:blur(6px);
}
.mr-arr:hover{background:rgba(0,0,0,.55);color:#fff}
.mr-arr svg{width:22px;height:22px}
#mr-prev-arr{left:4px}
#mr-next-arr{right:4px}
/* Show arrows only on desktop */
@media(min-width:768px){
  .mr-arr{display:flex}
  #mr-root.mr-wt .mr-arr{display:none}
}

/* ── Progress bar ── */
#mr-prog{height:2px;background:rgba(255,255,255,.1);flex-shrink:0;z-index:20}
#mr-pbar{height:100%;background:linear-gradient(90deg,#6c63ff,#ec4899);width:0;transition:width .28s}

/* ── Bottom toolbar — always visible, raised above app nav ── */
#mr-bot{
  display:flex;align-items:center;justify-content:center;gap:2px;
  padding:6px 10px;
  /* Sit above the app's bottom nav bar (--bn = 64px) */
  padding-bottom:calc(var(--bn,64px) + env(safe-area-inset-bottom,0px) + 4px);
  background:rgba(10,10,14,.96);
  border-top:1px solid rgba(255,255,255,.06);
  flex-shrink:0;z-index:20;
}
.mr-bb{
  height:36px;min-width:36px;border-radius:8px;border:none;
  background:transparent;color:rgba(255,255,255,.58);
  cursor:pointer;font-size:12px;font-weight:700;
  font-family:'DM Sans',sans-serif;
  display:flex;align-items:center;justify-content:center;
  padding:0 6px;transition:background .15s,color .15s;
  white-space:nowrap;gap:4px;flex-shrink:0;
}
.mr-bb:hover{background:rgba(255,255,255,.1);color:#fff}
.mr-bb:active{opacity:.65}
.mr-bb svg{width:18px;height:18px;flex-shrink:0}
.mr-bb.act{color:#fff;background:rgba(255,255,255,.12)}
#mr-pctr{
  font-size:12px;font-weight:700;color:rgba(255,255,255,.62);
  padding:0 4px;font-variant-numeric:tabular-nums;
  min-width:60px;text-align:center;flex-shrink:0;user-select:none;
}
.mr-sep{width:1px;height:20px;background:rgba(255,255,255,.1);flex-shrink:0;margin:0 2px}

/* Page placeholder */
.mr-pg-ph{
  display:flex;align-items:center;justify-content:center;
  width:100%;min-height:260px;background:#f2f2f2;
  color:rgba(0,0,0,.2);font-size:13px;
}
`;
document.head.appendChild(s);
}

const g=id=>document.getElementById(id);
const fmt=(c,t)=>t?`${c+1} / ${t}`:'— / —';

// ─── URL normalisation ───────────────────────────────────────────────
function _normPDF(url){
  if(!url)return null;
  let m=url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
  if(m)return{type:'gdrive',embed:`https://drive.google.com/file/d/${m[1]}/preview`};
  m=url.match(/drive\.google\.com\/(?:open|uc)\?.*?id=([^&\s]+)/);
  if(m)return{type:'gdrive',embed:`https://drive.google.com/file/d/${m[1]}/preview`};
  if(url.includes('dropbox.com'))return{type:'direct',url:url.replace('dl=0','dl=1')};
  if(url.includes('onedrive.live.com')||url.includes('1drv.ms'))return{type:'iframe',embed:url};
  return{type:'direct',url};
}

// ─── pdf.js lazy load ───────────────────────────────────────────────
function _loadLib(cb){
  if(window.pdfjsLib){cb();return;}
  const s=document.createElement('script');s.src=PDFCDN;
  s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWK;cb();};
  s.onerror=()=>cb(new Error('pdf.js unavailable'));
  document.head.appendChild(s);
}

// ─── Chapter loading ─────────────────────────────────────────────────
function _loadChapter(ch){
  const sp=g('mr-sp');if(sp)sp.classList.add('on');
  if(ch.pages&&ch.pages.length){
    ST.pages=ch.pages.slice();ST.total=ST.pages.length;
    if(sp)sp.classList.remove('on');
    _ready();
  }else if(ch.pdf){
    _loadPDFSrc(ch.pdf);
  }else{
    if(sp)sp.classList.remove('on');
    _showErr('No pages found for this chapter.');
  }
}

function _loadPDFSrc(url){
  const norm=_normPDF(url);
  if(!norm){_showErr('Invalid PDF URL.');return;}
  if(norm.type==='gdrive'||norm.type==='iframe'){_showIframe(norm.embed);return;}
  _loadLib(err=>{
    if(err){
      _showIframe(`https://docs.google.com/gview?url=${encodeURIComponent(norm.url)}&embedded=true`);
      return;
    }
    const task=pdfjsLib.getDocument({url:norm.url,withCredentials:false});
    task.promise.then(doc=>{
      ST.pdfDoc=doc;ST.total=doc.numPages;ST.pages=new Array(ST.total).fill(null);
      const sp=g('mr-sp');if(sp)sp.classList.remove('on');
      _ready();
      for(let i=1;i<=Math.min(5,ST.total);i++)_renderPDFPage(i);
    }).catch(()=>{
      _showIframe(`https://docs.google.com/gview?url=${encodeURIComponent(norm.url)}&embedded=true`);
    });
  });
}

function _renderPDFPage(n1){
  if(!ST.pdfDoc||ST.pdfPending.has(n1)||ST.pages[n1-1])return;
  ST.pdfPending.add(n1);
  ST.pdfDoc.getPage(n1).then(pg=>{
    const vp=pg.getViewport({scale:1.8});
    const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
    return pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise.then(()=>{
      const dataUrl=cv.toDataURL('image/jpeg',.88);
      ST.pages[n1-1]=dataUrl;ST.pdfPending.delete(n1);
      if(n1-1===ST.cur)_showPage(ST.cur,null);
    });
  }).catch(()=>ST.pdfPending.delete(n1));
}

function _showIframe(src){
  const sp=g('mr-sp');if(sp)sp.classList.remove('on');
  const bk=g('mr-book');if(!bk)return;
  bk.innerHTML=`<iframe src="${src}" style="width:min(100%,720px);height:100%;border:0;background:#fff;border-radius:3px" allowfullscreen loading="lazy"></iframe>`;
  const pctr=g('mr-pctr');if(pctr)pctr.textContent='PDF';
  const prog=g('mr-prog');if(prog)prog.style.display='none';
  ST.total=0;
}

function _showErr(msg){
  const sp=g('mr-sp');if(sp)sp.classList.remove('on');
  const pg=g('mr-pg');
  if(pg)pg.innerHTML=`<div class="mr-pg-ph" style="background:#fff;color:#999;padding:24px;font-size:13px;font-family:'DM Sans',sans-serif;text-align:center">${msg}</div>`;
}

// ─── Page display — always applies current zoom ──────────────────────
function _showPage(n,dir){
  const pg=g('mr-pg');if(!pg)return;
  const src=ST.pages[n];
  const zStyle=`scale(${ST.zoom})`;
  if(!src){
    pg.innerHTML='<div class="mr-pg-ph">Loading…</div>';
    if(ST.pdfDoc)_renderPDFPage(n+1);
    return;
  }
  if(!dir){
    pg.innerHTML=`<img src="${src}" class="mr-img" style="transform:${zStyle}" draggable="false" alt="">`;
    return;
  }
  const old=pg.querySelector('img,.mr-pg-ph');
  const ni=document.createElement('img');
  ni.src=src;ni.className=`mr-img mr-ai-${dir}`;
  ni.style.transform=zStyle;ni.draggable=false;
  if(old){
    old.className=(old.className||'').replace(/\bmr-a[io]-\w+/g,'')+` mr-ao-${dir}`;
    old.addEventListener('animationend',()=>old.remove(),{once:true});
  }
  pg.appendChild(ni);
}

// ─── Webtoon mode renderer ────────────────────────────────────────────
function _updWebtoon(){
  const wt=g('mr-wt');if(!wt)return;
  wt.innerHTML='';
  for(let i=0;i<ST.total;i++){
    if(ST.pages[i]){
      const img=document.createElement('img');img.src=ST.pages[i];
      img.className='mr-wt-img';img.alt='';img.loading='lazy';img.draggable=false;
      wt.appendChild(img);
    }else{
      const ph=document.createElement('div');ph.className='mr-wt-ph';ph.textContent=`Page ${i+1}`;
      if(ST.pdfDoc)_renderPDFPage(i+1);
      wt.appendChild(ph);
    }
  }
}

function _ready(){
  const saved=_load();
  _goTo(Math.min(saved,Math.max(0,ST.total-1)),false);
}

// ─── Navigation ──────────────────────────────────────────────────────
function _goTo(n,anim){
  if(ST.total===0)return;
  n=Math.max(0,Math.min(ST.total-1,n));
  const dir=anim!==false?(n>ST.cur?'fwd':'bwd'):null;
  ST.cur=n;_save();
  if(ST.mode==='wt')_updWebtoon();
  else _showPage(n,dir);
  const pctr=g('mr-pctr');if(pctr)pctr.textContent=fmt(ST.cur,ST.total);
  const pb=g('mr-pbar');if(pb&&ST.total>0)pb.style.width=((n+1)/ST.total*100)+'%';
  if(typeof D!=='undefined'&&D.setMangaProgress)D.setMangaProgress(_mid,_chid,n);
  if(ST.pdfDoc){
    for(let i=n+1;i<=Math.min(n+5,ST.total);i++)_renderPDFPage(i);
    if(n>0)_renderPDFPage(n);
  }
}
function _prev(){_goTo(ST.cur-1,true);}
function _next(){_goTo(ST.cur+1,true);}

// ─── Modes ───────────────────────────────────────────────────────────
function _setMode(m){
  ST.mode=m;
  const root=g('mr-root');if(!root)return;
  root.classList.toggle('mr-wt',m==='wt');
  const btn=g('mr-mode-btn');if(btn)btn.classList.toggle('act',m==='wt');
  if(m==='wt')_updWebtoon();else _showPage(ST.cur,null);
}
function _toggleMode(){_setMode(ST.mode==='wt'?'single':'wt');}

// ─── Zoom — applies to both book and webtoon modes ──────────────────
function _zoomIn(){_applyZoom(ST.zoom+.25);}
function _zoomOut(){_applyZoom(ST.zoom-.25);}
function _applyZoom(z){
  ST.zoom=Math.max(.5,Math.min(3,z));
  // Apply to book mode image
  const img=g('mr-pg')?.querySelector('.mr-img');
  if(img)img.style.transform=`scale(${ST.zoom})`;
  // Apply to all webtoon images
  const wt=g('mr-wt');
  if(wt)wt.querySelectorAll('.mr-wt-img').forEach(i=>i.style.transform=`scale(${ST.zoom})`);
  const lbl=g('mr-zoom-lbl');if(lbl)lbl.textContent=Math.round(ST.zoom*100)+'%';
}

// ─── Fullscreen ──────────────────────────────────────────────────────
function _toggleFS(){
  const root=g('mr-root');if(!root)return;
  if(!document.fullscreenElement)root.requestFullscreen&&root.requestFullscreen().catch(()=>{});
  else document.exitFullscreen&&document.exitFullscreen().catch(()=>{});
}

// ─── Touch + keyboard ────────────────────────────────────────────────
function _bindEvt(){
  const view=g('mr-view');if(!view)return;
  let sx=0,sy=0,moved=false;
  view.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;moved=false;},{passive:true});
  view.addEventListener('touchmove',()=>{moved=true;},{passive:true});
  view.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(!moved||Math.abs(dx)<8&&Math.abs(dy)<8){return;}// tap without swipe — do nothing
    if(ST.mode!=='wt'&&Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>44){dx<0?_next():_prev();}
  },{passive:true});
  // Tap to navigate (left zone / right zone) in single-page mode
  view.addEventListener('click',e=>{
    if(e.target.closest('.mr-arr,.mr-bb,.mr-tb'))return;
    if(ST.mode==='wt')return;// webtoon scrolls naturally
    const r=view.getBoundingClientRect(),x=e.clientX-r.left;
    if(x<r.width*.35)_prev();
    else if(x>r.width*.65)_next();
  });
  document.addEventListener('keydown',_kh);
  document.addEventListener('fullscreenchange',()=>{
    const btn=g('mr-fs-btn');if(btn)btn.innerHTML=document.fullscreenElement?IC.exitFs:IC.fullscreen;
  });
}

function _kh(e){
  const mro=g('mro');if(!mro||!mro.classList.contains('op'))return;
  switch(e.key){
    case'ArrowRight':case'ArrowDown':e.preventDefault();_next();break;
    case'ArrowLeft':case'ArrowUp':e.preventDefault();_prev();break;
    case'f':case'F':_toggleFS();break;
    case'Escape':if(typeof R!=='undefined')R.closeChapter();break;
  }
}

// ─── HTML — no thumbnail panel ───────────────────────────────────────
function _html(manga,ch){
  const chLabel=ch.vol?`Vol.${ch.vol} · Ch.${ch.ch}`:`Ch.${ch.ch}`;
  const chTitle=ch.title||chLabel;
  return`<div id="mr-root">
<div id="mr-sp"></div>
<div id="mr-top">
  <button class="mr-tb" onclick="R.closeChapter()" title="Back">${IC.chevDown}</button>
  <div id="mr-brand">ANIMEX</div>
  <div id="mr-chinfo">${manga.title}<span id="mr-chiname"> · ${chTitle}</span></div>
  <button class="mr-tb" id="mr-fs-btn" onclick="MR._toggleFS()" title="Fullscreen">${IC.fullscreen}</button>
  <button class="mr-tb" onclick="P.share('${manga.id}')" title="Share">${IC.share}</button>
  <button class="mr-tb" onclick="R.closeChapter()" title="Close">${IC.close}</button>
</div>
<div id="mr-view">
  <div id="mr-book">
    <div class="mr-spine"></div>
    <div id="mr-pg-wrap">
      <div id="mr-pg"><div class="mr-pg-ph">Loading…</div></div>
      <div id="mr-wt"></div>
    </div>
    <div class="mr-edge"></div>
  </div>
  <button class="mr-arr" id="mr-prev-arr" onclick="MR._prev()">${IC.chevLeft}</button>
  <button class="mr-arr" id="mr-next-arr" onclick="MR._next()">${IC.chevRight}</button>
</div>
<div id="mr-prog"><div id="mr-pbar"></div></div>
<div id="mr-bot">
  <button class="mr-bb" onclick="MR._prev()">${IC.chevLeft}</button>
  <span id="mr-pctr">— / —</span>
  <button class="mr-bb" onclick="MR._next()">${IC.chevRight}</button>
  <div class="mr-sep"></div>
  <button class="mr-bb" onclick="MR._zoomOut()" title="Zoom out">−</button>
  <span class="mr-bb" id="mr-zoom-lbl" style="pointer-events:none;cursor:default;min-width:40px">100%</span>
  <button class="mr-bb" onclick="MR._zoomIn()" title="Zoom in">+</button>
  <div class="mr-sep"></div>
  <button class="mr-bb" id="mr-mode-btn" onclick="MR._toggleMode()" title="Toggle Webtoon / Book mode">${IC.playlist}</button>
</div>
</div>`;
}

// ─── Public ──────────────────────────────────────────────────────────
function init(mid,chid,manga,ch){
  injectCSS();
  _mid=mid;_chid=chid;_manga=manga;_ch=ch;
  ST={pages:[],cur:0,total:0,zoom:1,fs:false,mode:'single',pdfDoc:null,pdfPending:new Set()};
  const mro=g('mro');if(!mro)return;
  mro.innerHTML=_html(manga,ch);
  requestAnimationFrame(()=>{mro.classList.add('op');_bindEvt();_loadChapter(ch);});
}

function destroy(){
  document.removeEventListener('keydown',_kh);
  ST.pages.forEach(p=>{if(p&&p.startsWith('blob:'))URL.revokeObjectURL(p);});
  ST.pdfDoc=null;
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  const mro=g('mro');
  if(mro){mro.classList.remove('op');setTimeout(()=>{if(mro)mro.innerHTML='';},400);}
}

return{
  init,destroy,
  _prev,_next,_goTo:(n)=>_goTo(n,true),
  _toggleFS,_toggleMode,_zoomIn,_zoomOut
};
})();