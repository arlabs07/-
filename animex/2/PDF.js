const MR=(()=>{
'use strict';
/* AnimeX Manga Reader v1 — AnyFlip-inspired
   Sources: image URL array | direct PDF (pdf.js) | Google Drive | Dropbox | iframe fallback
*/
const PDFCDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFWK='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let ST={pages:[],cur:0,total:0,zoom:1,fs:false,mode:'single',thumbs:false,pdfDoc:null,pdfPending:new Set()};
let _mid=null,_chid=null,_manga=null,_ch=null;
let _si=false,_uiVis=true;

const _key=(m,c)=>`ax_mg_${m}_${c}`;
const _save=()=>{try{localStorage.setItem(_key(_mid,_chid),String(ST.cur));}catch{}};
const _load=()=>{try{return parseInt(localStorage.getItem(_key(_mid,_chid))||'0',10)||0;}catch{return 0;}};

function injectCSS(){
if(_si)return;_si=true;
const s=document.createElement('style');
s.textContent=`
#mro{position:fixed;inset:0;background:#3a3a3a;z-index:700;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .38s cubic-bezier(.32,.72,0,1);overflow:hidden}
#mro.op{transform:none}
#mr-root{display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;position:relative}
/* Spinner */
#mr-sp{position:absolute;top:50%;left:50%;z-index:30;width:44px;height:44px;margin:-22px;border:4px solid rgba(255,255,255,.12);border-top-color:#fff;border-radius:50%;display:none;pointer-events:none}
#mr-sp.on{display:block;animation:mrSpin .72s linear infinite}
@keyframes mrSpin{to{transform:rotate(360deg)}}
/* Top bar */
#mr-top{display:flex;align-items:center;gap:4px;padding:10px 8px 8px;background:rgba(10,10,14,.96);border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;z-index:20;transition:opacity .28s,transform .28s}
#mr-top.mr-ui-hid{opacity:0;pointer-events:none;transform:translateY(-100%)}
#mr-brand{font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.1em;background:linear-gradient(135deg,#fff 0%,#aaa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;flex-shrink:0;user-select:none;margin-right:4px}
#mr-chinfo{font-size:11px;color:rgba(255,255,255,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
#mr-chiname{color:rgba(255,255,255,.25)}
.mr-tb{width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:rgba(255,255,255,.58);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0}
.mr-tb:hover{background:rgba(255,255,255,.1);color:#fff}
.mr-tb svg{width:20px;height:20px}
/* Viewport */
#mr-view{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:14px 50px}
/* Book */
#mr-book{display:flex;align-items:stretch;position:relative;max-height:100%;
  filter:drop-shadow(-6px 8px 32px rgba(0,0,0,.9)) drop-shadow(4px 6px 16px rgba(0,0,0,.55))}
.mr-spine{width:12px;flex-shrink:0;background:linear-gradient(to right,#040404 0%,#161616 30%,#2a2a2a 55%,#1e1e1e 100%);border-radius:3px 0 0 3px}
#mr-pg-wrap{position:relative;background:#fff;overflow:hidden;display:flex;flex-direction:column}
#mr-pg{display:flex;align-items:center;justify-content:center;background:#fff;min-width:180px;min-height:260px;position:relative;overflow:hidden}
.mr-img{max-width:100%;max-height:calc(100vh - 152px);width:auto;height:auto;object-fit:contain;display:block;user-select:none;-webkit-user-select:none;transform-origin:center;transition:transform .18s}
.mr-edge{width:8px;flex-shrink:0;background:linear-gradient(to right,#c8c8c8 0%,#eee 35%,#e0e0e0 65%,#d4d4d4 100%);border-radius:0 3px 3px 0}
/* Page flip */
@keyframes mrFO{0%{transform:perspective(900px) rotateY(0);transform-origin:left center;opacity:1}100%{transform:perspective(900px) rotateY(-78deg);transform-origin:left center;opacity:0}}
@keyframes mrFI{0%{transform:perspective(900px) rotateY(78deg);transform-origin:right center;opacity:0}100%{transform:perspective(900px) rotateY(0);transform-origin:right center;opacity:1}}
@keyframes mrBO{0%{transform:perspective(900px) rotateY(0);transform-origin:right center;opacity:1}100%{transform:perspective(900px) rotateY(78deg);transform-origin:right center;opacity:0}}
@keyframes mrBI{0%{transform:perspective(900px) rotateY(-78deg);transform-origin:left center;opacity:0}100%{transform:perspective(900px) rotateY(0);transform-origin:left center;opacity:1}}
.mr-ao-fwd{animation:mrFO .24s ease-in forwards;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff}
.mr-ai-fwd{animation:mrFI .28s .08s ease-out both}
.mr-ao-bwd{animation:mrBO .24s ease-in forwards;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff}
.mr-ai-bwd{animation:mrBI .28s .08s ease-out both}
/* Webtoon mode */
#mr-wt{display:none;flex-direction:column;align-items:center;width:100%;overflow-y:auto;max-height:calc(100vh - 152px);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
#mr-wt::-webkit-scrollbar{width:4px}
#mr-wt::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}
.mr-wt-img{width:100%;max-width:720px;display:block;user-select:none;border-bottom:2px solid #3a3a3a}
.mr-wt-ph{width:100%;max-width:720px;min-height:380px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.18);font-size:12px}
#mr-root.mr-wt #mr-pg{display:none}
#mr-root.mr-wt #mr-wt{display:flex}
#mr-root.mr-wt .mr-spine,#mr-root.mr-wt .mr-edge{display:none}
#mr-root.mr-wt #mr-pg-wrap{background:transparent}
#mr-root.mr-wt #mr-book{filter:none}
#mr-root.mr-wt .mr-arr{display:none}
/* Nav arrows */
.mr-arr{position:absolute;top:50%;transform:translateY(-50%);z-index:10;width:40px;height:68px;border-radius:8px;border:none;background:rgba(0,0,0,.28);color:rgba(255,255,255,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;backdrop-filter:blur(6px)}
.mr-arr:hover{background:rgba(0,0,0,.55);color:#fff}
.mr-arr svg{width:22px;height:22px}
#mr-prev-arr{left:4px}
#mr-next-arr{right:4px}
/* Progress bar */
#mr-prog{height:2px;background:rgba(255,255,255,.1);flex-shrink:0;z-index:20}
#mr-pbar{height:100%;background:linear-gradient(90deg,#6c63ff,#ec4899);width:0;transition:width .28s}
/* Bottom toolbar — replicates AnyFlip layout */
#mr-bot{display:flex;align-items:center;justify-content:center;gap:2px;padding:7px 10px calc(7px + env(safe-area-inset-bottom,0px));background:rgba(10,10,14,.96);border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;z-index:20;transition:opacity .28s,transform .28s}
#mr-bot.mr-ui-hid{opacity:0;pointer-events:none;transform:translateY(100%)}
.mr-bb{height:38px;min-width:38px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.58);cursor:pointer;font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;padding:0 7px;transition:background .15s,color .15s;white-space:nowrap;gap:4px;flex-shrink:0}
.mr-bb:hover{background:rgba(255,255,255,.1);color:#fff}
.mr-bb:active{opacity:.65}
.mr-bb svg{width:18px;height:18px;flex-shrink:0}
.mr-bb.act{color:#fff;background:rgba(255,255,255,.12)}
#mr-pctr{font-size:12px;font-weight:700;color:rgba(255,255,255,.62);padding:0 4px;font-variant-numeric:tabular-nums;min-width:64px;text-align:center;flex-shrink:0;user-select:none}
.mr-sep{width:1px;height:20px;background:rgba(255,255,255,.1);flex-shrink:0;margin:0 2px}
/* Thumbnail panel — slides up from bottom of viewport */
#mr-tp{position:absolute;bottom:0;left:0;right:0;z-index:25;background:rgba(8,8,12,.97);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.1);padding:10px 10px 6px;display:flex;overflow-x:auto;gap:6px;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);scrollbar-width:none;max-height:148px;align-items:flex-start}
#mr-tp::-webkit-scrollbar{display:none}
#mr-tp.on{transform:translateY(0)}
.mr-th{flex-shrink:0;width:64px;cursor:pointer;border-radius:4px;overflow:hidden;border:2px solid rgba(255,255,255,.1);transition:border-color .15s,transform .18s}
.mr-th:hover{border-color:rgba(255,255,255,.38);transform:translateY(-2px)}
.mr-th.act{border-color:#fff}
.mr-th img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}
.mr-th span{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:3/4;background:rgba(255,255,255,.06);font-size:10px;color:rgba(255,255,255,.38);font-weight:600;font-family:'DM Sans',sans-serif}
/* Page placeholder */
.mr-pg-ph{display:flex;align-items:center;justify-content:center;width:100%;min-height:260px;background:#f2f2f2;color:rgba(0,0,0,.2);font-size:13px}
/* ── MANGA DETAIL OVERLAY ── */
#mdo{position:fixed;inset:0;background:var(--b0);overflow-y:auto;transform:translateY(100%);transition:transform .38s cubic-bezier(.32,.72,0,1);z-index:600;scrollbar-width:none}
#mdo.op{transform:none}
#mdo::-webkit-scrollbar{display:none}
/* Manga cards — same .sc structure but MANGA badge */
.sc-mg-badge{position:absolute;top:8px;left:8px;background:linear-gradient(135deg,#6c63ff,#ec4899);color:#fff;font-size:8px;font-weight:800;padding:2px 6px;border-radius:3px;letter-spacing:.06em;z-index:2;text-transform:uppercase}
/* Manga chapter rows */
.mch-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--w5);cursor:pointer;transition:background .18s}
.mch-row:hover{background:rgba(255,255,255,.02);border-radius:8px;padding-left:8px}
.mch-num{font-size:13px;font-weight:700;color:var(--w3);font-variant-numeric:tabular-nums;min-width:42px;flex-shrink:0}
.mch-info{flex:1;min-width:0}
.mch-title{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mch-meta{font-size:10px;color:var(--w3);margin-top:2px}
.mch-pb{margin-top:5px;height:2px;background:rgba(255,255,255,.1);border-radius:1px;overflow:hidden}
.mch-pbf{height:100%;background:var(--grad)}
.mch-ic{width:32px;height:32px;border-radius:50%;background:var(--b2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mch-ic svg{width:16px;height:16px;color:var(--w3)}
/* manga status badge */
.mg-status{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;margin-left:8px;vertical-align:middle}
.mg-status.ongoing{background:rgba(74,222,128,.2);color:#4ade80}
.mg-status.completed{background:rgba(96,165,250,.2);color:#60a5fa}
`;
document.head.appendChild(s);
}

const g=id=>document.getElementById(id);
const fmt=(c,t)=>t?`${c+1} / ${t}`:'— / —';

// ─── URL normalisation ───────────────────────────────────────────────
function _normPDF(url){
  if(!url)return null;
  // Google Drive view/open/share links → preview iframe
  let m=url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
  if(m)return{type:'gdrive',embed:`https://drive.google.com/file/d/${m[1]}/preview`};
  m=url.match(/drive\.google\.com\/(?:open|uc)\?.*?id=([^&\s]+)/);
  if(m)return{type:'gdrive',embed:`https://drive.google.com/file/d/${m[1]}/preview`};
  // Dropbox dl=0 → dl=1 for direct download
  if(url.includes('dropbox.com'))return{type:'direct',url:url.replace('dl=0','dl=1')};
  // OneDrive embed
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
    // Preferred: image URL array — full control
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
  // Google Drive / OneDrive / explicit iframe → embed directly
  if(norm.type==='gdrive'||norm.type==='iframe'){_showIframe(norm.embed);return;}
  // Direct PDF → try pdf.js first, iframe fallback on CORS error
  _loadLib(err=>{
    if(err){
      // pdf.js failed to load → Google Docs viewer fallback
      _showIframe(`https://docs.google.com/gview?url=${encodeURIComponent(norm.url)}&embedded=true`);
      return;
    }
    const task=pdfjsLib.getDocument({url:norm.url,withCredentials:false});
    task.promise.then(doc=>{
      ST.pdfDoc=doc;ST.total=doc.numPages;ST.pages=new Array(ST.total).fill(null);
      const sp=g('mr-sp');if(sp)sp.classList.remove('on');
      _ready();
      // Pre-render first 5 pages immediately
      for(let i=1;i<=Math.min(5,ST.total);i++)_renderPDFPage(i);
    }).catch(()=>{
      // CORS or bad URL — Google Docs viewer fallback
      _showIframe(`https://docs.google.com/gview?url=${encodeURIComponent(norm.url)}&embedded=true`);
    });
  });
}

function _renderPDFPage(n1){
  // n1 is 1-indexed (pdf.js convention)
  if(!ST.pdfDoc||ST.pdfPending.has(n1)||ST.pages[n1-1])return;
  ST.pdfPending.add(n1);
  ST.pdfDoc.getPage(n1).then(pg=>{
    const vp=pg.getViewport({scale:1.8});
    const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
    return pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise.then(()=>{
      const dataUrl=cv.toDataURL('image/jpeg',.88);
      ST.pages[n1-1]=dataUrl;ST.pdfPending.delete(n1);
      if(n1-1===ST.cur)_showPage(ST.cur,null);
      _updThumbImg(n1-1,dataUrl);
    });
  }).catch(()=>ST.pdfPending.delete(n1));
}

function _showIframe(src){
  const sp=g('mr-sp');if(sp)sp.classList.remove('on');
  const bk=g('mr-book');if(!bk)return;
  // Remove book chrome entirely for iframe sources
  bk.innerHTML=`<iframe src="${src}" style="width:min(100%,720px);height:calc(100vh - 158px);border:0;background:#fff;border-radius:3px" allowfullscreen loading="lazy"></iframe>`;
  const pctr=g('mr-pctr');if(pctr)pctr.textContent='PDF';
  const prog=g('mr-prog');if(prog)prog.style.display='none';
  ST.total=0;_uiVis=true;_syncUI();
}

function _showErr(msg){
  const sp=g('mr-sp');if(sp)sp.classList.remove('on');
  const pg=g('mr-pg');
  if(pg)pg.innerHTML=`<div class="mr-pg-ph" style="background:#fff;color:#999;padding:24px;font-size:13px;font-family:'DM Sans',sans-serif;text-align:center">${msg}</div>`;
}

// ─── Page display ────────────────────────────────────────────────────
function _showPage(n,dir){
  const pg=g('mr-pg');if(!pg)return;
  const src=ST.pages[n];
  if(!src){
    pg.innerHTML='<div class="mr-pg-ph">Loading…</div>';
    if(ST.pdfDoc)_renderPDFPage(n+1);
    return;
  }
  if(!dir){
    pg.innerHTML=`<img src="${src}" class="mr-img" style="transform:scale(${ST.zoom})" draggable="false" alt="">`;
    return;
  }
  const old=pg.querySelector('img,.mr-pg-ph');
  const ni=document.createElement('img');
  ni.src=src;ni.className=`mr-img mr-ai-${dir}`;
  ni.style.transform=`scale(${ST.zoom})`;ni.draggable=false;
  if(old){
    old.className=(old.className||'').replace(/\bmr-a[io]-\w+/g,'')+` mr-ao-${dir}`;
    old.addEventListener('animationend',()=>old.remove(),{once:true});
  }
  pg.appendChild(ni);
}

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
  _buildThumbs();
  const saved=_load();
  _goTo(Math.min(saved,Math.max(0,ST.total-1)),false);
  _uiVis=true;_syncUI();
}

// ─── Navigation ──────────────────────────────────────────────────────
function _goTo(n,anim){
  if(ST.total===0)return;
  n=Math.max(0,Math.min(ST.total-1,n));
  const dir=anim!==false?(n>ST.cur?'fwd':'bwd'):null;
  ST.cur=n;_save();
  if(ST.mode==='wt')_updWebtoon();
  else _showPage(n,dir);
  // Update counters + progress
  const pctr=g('mr-pctr');if(pctr)pctr.textContent=fmt(ST.cur,ST.total);
  const pb=g('mr-pbar');if(pb&&ST.total>0)pb.style.width=((n+1)/ST.total*100)+'%';
  _updThumbAct();
  if(typeof D!=='undefined'&&D.setMangaProgress)D.setMangaProgress(_mid,_chid,n);
  // Pre-render adjacent PDF pages
  if(ST.pdfDoc){
    for(let i=n+1;i<=Math.min(n+5,ST.total);i++)_renderPDFPage(i);
    if(n>0)_renderPDFPage(n);
  }
}
function _prev(){_goTo(ST.cur-1,true);}
function _next(){_goTo(ST.cur+1,true);}

// ─── Thumbnails ──────────────────────────────────────────────────────
function _buildThumbs(){
  const tp=g('mr-tp');if(!tp)return;
  tp.innerHTML='';
  for(let i=0;i<ST.total;i++){
    const d=document.createElement('div');d.className='mr-th'+(i===ST.cur?' act':'');d.dataset.p=i;
    if(ST.pages[i]){const img=document.createElement('img');img.src=ST.pages[i];img.loading='lazy';d.appendChild(img);}
    else{const sp=document.createElement('span');sp.textContent=i+1;d.appendChild(sp);}
    d.onclick=()=>{_goTo(i,true);_setThumbs(false);};
    tp.appendChild(d);
  }
}
function _updThumbImg(i,src){
  const tp=g('mr-tp');if(!tp)return;
  const d=tp.children[i];if(!d)return;
  const sp=d.querySelector('span');
  if(sp){const img=document.createElement('img');img.src=src;img.loading='lazy';d.replaceChild(img,sp);}
}
function _updThumbAct(){
  const tp=g('mr-tp');if(!tp)return;
  tp.querySelectorAll('.mr-th').forEach(t=>t.classList.toggle('act',+t.dataset.p===ST.cur));
  const a=tp.querySelector('.mr-th.act');if(a)a.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function _setThumbs(v){
  ST.thumbs=v;const tp=g('mr-tp');if(tp)tp.classList.toggle('on',v);
}
function _toggleThumbs(){_setThumbs(!ST.thumbs);}

// ─── Modes ───────────────────────────────────────────────────────────
function _setMode(m){
  ST.mode=m;
  const root=g('mr-root');if(!root)return;
  root.classList.toggle('mr-wt',m==='wt');
  const btn=g('mr-mode-btn');if(btn)btn.classList.toggle('act',m==='wt');
  if(m==='wt')_updWebtoon();else _showPage(ST.cur,null);
}
function _toggleMode(){_setMode(ST.mode==='wt'?'single':'wt');}

// ─── Zoom ────────────────────────────────────────────────────────────
function _zoomIn(){_applyZoom(ST.zoom+.25);}
function _zoomOut(){_applyZoom(ST.zoom-.25);}
function _applyZoom(z){
  ST.zoom=Math.max(.5,Math.min(3,z));
  const img=g('mr-pg')?.querySelector('.mr-img');if(img)img.style.transform=`scale(${ST.zoom})`;
  const lbl=g('mr-zoom-lbl');if(lbl)lbl.textContent=Math.round(ST.zoom*100)+'%';
}

// ─── Fullscreen ──────────────────────────────────────────────────────
function _toggleFS(){
  const root=g('mr-root');if(!root)return;
  if(!document.fullscreenElement)root.requestFullscreen&&root.requestFullscreen().catch(()=>{});
  else document.exitFullscreen&&document.exitFullscreen().catch(()=>{});
}

// ─── UI visibility ───────────────────────────────────────────────────
let _uiTmr=null;
function _syncUI(){
  const t=g('mr-top'),b=g('mr-bot');
  if(t)t.classList.toggle('mr-ui-hid',!_uiVis);
  if(b)b.classList.toggle('mr-ui-hid',!_uiVis);
}
function _showUI(){_uiVis=true;_syncUI();clearTimeout(_uiTmr);}
function _autoHide(){clearTimeout(_uiTmr);_uiTmr=setTimeout(()=>{if(ST.mode!=='wt'){_uiVis=false;_syncUI();}},4000);}
function _toggleUI(){_uiVis=!_uiVis;_syncUI();if(_uiVis)_autoHide();}

// ─── Touch + keyboard ────────────────────────────────────────────────
function _bindEvt(){
  const view=g('mr-view');if(!view)return;
  let sx=0,sy=0,moved=false;
  view.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;moved=false;},{passive:true});
  view.addEventListener('touchmove',()=>{moved=true;},{passive:true});
  view.addEventListener('touchend',e=>{
    if(ST.thumbs){return;}
    const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(!moved||Math.abs(dx)<8&&Math.abs(dy)<8){_toggleUI();return;}
    if(ST.mode!=='wt'&&Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>44){dx<0?_next():_prev();}
  },{passive:true});
  // Click zones
  view.addEventListener('click',e=>{
    if(e.target.closest('#mr-tp,.mr-arr,.mr-bb,.mr-tb'))return;
    if(ST.thumbs){_setThumbs(false);return;}
    if(ST.mode==='wt'){_toggleUI();return;}
    const r=view.getBoundingClientRect(),x=e.clientX-r.left;
    if(x<r.width*.3)_prev();
    else if(x>r.width*.7)_next();
    else _toggleUI();
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

// ─── HTML ────────────────────────────────────────────────────────────
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
  <div id="mr-tp"></div>
</div>
<div id="mr-prog"><div id="mr-pbar"></div></div>
<div id="mr-bot">
  <button class="mr-bb" onclick="MR._toggleThumbs()" title="Page thumbnails">${IC.episodes}</button>
  <div class="mr-sep"></div>
  <button class="mr-bb" onclick="MR._prev()">${IC.chevLeft}</button>
  <span id="mr-pctr">— / —</span>
  <button class="mr-bb" onclick="MR._next()">${IC.chevRight}</button>
  <div class="mr-sep"></div>
  <button class="mr-bb" onclick="MR._zoomOut()" title="Zoom out">−</button>
  <span class="mr-bb" id="mr-zoom-lbl" style="pointer-events:none;cursor:default;min-width:42px">100%</span>
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
  ST={pages:[],cur:0,total:0,zoom:1,fs:false,mode:'single',thumbs:false,pdfDoc:null,pdfPending:new Set()};
  _uiVis=true;
  const mro=g('mro');if(!mro)return;
  mro.innerHTML=_html(manga,ch);
  requestAnimationFrame(()=>{mro.classList.add('op');_bindEvt();_loadChapter(ch);});
}

function destroy(){
  document.removeEventListener('keydown',_kh);
  clearTimeout(_uiTmr);
  // Revoke any data: URLs from pdf.js renders
  ST.pages.forEach(p=>{if(p&&p.startsWith('data:image'))return;if(p&&p.startsWith('blob:'))URL.revokeObjectURL(p);});
  ST.pdfDoc=null;
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  const mro=g('mro');
  if(mro){mro.classList.remove('op');setTimeout(()=>{if(mro)mro.innerHTML='';},400);}
}

return{
  init,destroy,
  _prev,_next,_goTo:(n)=>_goTo(n,true),
  _toggleFS,_toggleThumbs,_toggleMode,_zoomIn,_zoomOut
};
})();