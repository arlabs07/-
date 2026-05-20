const NV=(()=>{
'use strict';
// uiHide=5000ms (point 4), skip kept for double-tap gesture (point 1)
const CFG={skip:10,holdSpd:2,holdDly:600,uiHide:5000,tapMs:350,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};
let ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,fs:false,netOk:true,sysTmr:null,gtTmr:null,bufErr:0};
let _sid=null,_eid=null,_show=null,_ep=null,_pl=[];
let _si=false,_fsplCurTab='episodes',_fsplCurSeason=1;
const _prefKey=(s,e)=>`ax_pref_${s}_${e}`;
const _savePref=()=>{try{localStorage.setItem(_prefKey(_sid,_eid),JSON.stringify({lang:ST.lang,qual:ST.qual}));}catch{}};
const _loadPref=()=>{try{const v=localStorage.getItem(_prefKey(_sid,_eid));return v?JSON.parse(v):null;}catch{return null;}};
const _lsKey=(s,e)=>`ax_pos_${s}_${e}`;
const _savePos=()=>{if(!_sid||!_eid||!el.vid)return;const t=el.vid.currentTime,d=el.vid.duration;if(t>2&&isFinite(d)&&t<d-5)try{localStorage.setItem(_lsKey(_sid,_eid),String(Math.round(t)));}catch{}};
const _loadPos=()=>{try{const v=localStorage.getItem(_lsKey(_sid,_eid));return v?parseInt(v,10):0;}catch{return 0;}};

function injectCSS(){
if(_si)return;_si=true;
const s=document.createElement('style');
s.textContent=`
#nr{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;outline:none}
#nr.nrfs{position:fixed;inset:0;width:100%;height:100%;aspect-ratio:unset;border-radius:0!important;z-index:10000}
#nvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;-webkit-user-select:none;user-select:none;pointer-events:none}
#nth{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;pointer-events:none;display:block;background:#111}
#nov{position:absolute;inset:0;z-index:2;cursor:pointer}
#nov::before{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(0,0,0,.8),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
#nov::after{content:'';position:absolute;bottom:0;left:0;right:0;height:55%;background:linear-gradient(to top,rgba(0,0,0,.92),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
#nct.nv~#nov::before,#nb.nv~#nov::after{opacity:1}
/* spinner */
#nsp{position:absolute;top:50%;left:50%;z-index:12;width:52px;height:52px;margin:-26px;border:4px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s}
#nsp.ns{opacity:1;animation:nvSpin .75s linear infinite}
@keyframes nvSpin{to{transform:rotate(360deg)}}
/* system message */
#nsh2{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:14;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:17px;font-weight:700;padding:12px 28px;border-radius:99px;opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;text-align:center}
#nsh2.ns{opacity:1}
/* seek nudge labels */
#nnl,#nnr{position:absolute;top:50%;transform:translateY(-50%);z-index:14;color:#fff;font-size:22px;font-weight:800;opacity:0;pointer-events:none;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.9)}
#nnl{left:12%}#nnr{right:12%;text-align:right}
.snp{animation:nvNudge .7s ease forwards}
@keyframes nvNudge{0%{opacity:1;transform:translateY(-50%) scale(.9)}40%{opacity:1;transform:translateY(-65%) scale(1.08)}100%{opacity:0;transform:translateY(-82%) scale(1)}}

/* ═══ TOP BAR ═══ */
#nct{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px;opacity:0;transform:translateY(-8px);transition:opacity .28s,transform .28s;pointer-events:none}
#nct.nv{opacity:1;transform:none;pointer-events:auto}
#nct-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
#nct-title{display:none;flex-direction:column;gap:2px;min-width:0;flex:1}
#nct-title-main{font-size:16px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
#nct-title-sub{font-size:13px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* title only in FS */
#nr.nrfs #nct-title{display:flex}
#nct-right{display:flex;align-items:center;gap:6px;flex-shrink:0}

/* FS-only elements (settings, exit-fs) — hidden by default with !important */
.nct-fs-only{display:none!important}
#nr.nrfs .nct-fs-only{display:flex!important;align-items:center;justify-content:center}
/* Non-FS only (enter-fs button) */
.nct-nofs-only{display:flex;align-items:center;justify-content:center}
#nr.nrfs .nct-nofs-only{display:none!important}

/* ═══ CENTRE: play only (point 1 — no seek buttons) ═══ */
#ncc{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .28s}
#ncc.nv{opacity:1;pointer-events:auto}
#npl2{display:flex;align-items:center;justify-content:center;width:80px;height:80px;border:none;background:rgba(0,0,0,.35);border-radius:50%;color:#fff;cursor:pointer;transition:transform .12s,background .15s;flex-shrink:0;backdrop-filter:blur(4px)}
#npl2 svg{width:42px;height:42px}
#npl2:active{transform:scale(.88);background:rgba(0,0,0,.55)}

/* ═══ BOTTOM BAR ═══ */
/* Non-FS: seekbar always visible at bottom, time/action rows fade with UI
   Full-FS: entire #nb fades with UI (seekbar disappears when idle) */
#nb{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0;display:flex;flex-direction:column;gap:0;pointer-events:auto;transition:opacity .28s}
/* non-FS: seekbar row always on, only sub-rows fade */
#nb-time-row,#nbrow-fs,#nbpeek{opacity:0;transition:opacity .28s;pointer-events:none}
#nb.nv #nb-time-row,#nb.nv #nbrow-fs,#nb.nv #nbpeek{opacity:1;pointer-events:auto}
#nbseek{pointer-events:auto;opacity:1;transition:opacity .28s}
/* FS: entire bar (including seekbar) fades when UI hidden */
#nr.nrfs #nb{opacity:0;pointer-events:none}
#nr.nrfs #nb.nv{opacity:1;pointer-events:auto}
/* In FS, time/action/peek always follow parent opacity so reset them */
#nr.nrfs #nb-time-row,#nr.nrfs #nbrow-fs,#nr.nrfs #nbpeek{opacity:1;pointer-events:auto}

/* Timer row above seekbar — right-aligned (point 5) */
#nb-time-row{display:flex;justify-content:flex-end;padding:0 16px 6px;pointer-events:none}
#ntm{font-size:18px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.8)}

/* Seekbar — full width, no timer beside it (point 5) */
#nbseek{padding:0 16px;display:flex;align-items:center}
#nsw{flex:1;padding:14px 0 6px;cursor:pointer;touch-action:none}
#nst{position:relative;height:4px;background:rgba(255,255,255,.3);border-radius:99px;transition:height .18s}
#nsw:hover #nst,#nsw:active #nst,#nr.nrfs #nst{height:6px}
#nsbuf,#nsf{position:absolute;inset:0;height:100%;border-radius:99px;pointer-events:none}
#nsbuf{background:rgba(255,255,255,.55)}
#nsf{background:#fff}
#nsth{position:absolute;top:50%;left:0;width:18px;height:18px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .18s;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,.6)}
#nsw:hover #nsth,#nsw:active #nsth,#nr.nrfs #nsth{transform:translate(-50%,-50%) scale(1)}
.nsch-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;background:rgba(255,180,0,.9);pointer-events:none}
/* hover time tooltip */
#nsh{position:absolute;bottom:calc(100% + 8px);background:rgba(0,0,0,.88);color:#fff;font-size:12px;font-weight:700;padding:4px 9px;border-radius:6px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap}

/* FS action row (point 9 — right-aligned speed as text) */
#nbrow-fs{display:none;align-items:center;justify-content:space-between;padding:6px 16px 4px}
#nr.nrfs #nbrow-fs{display:flex}
.nbfs-left,.nbfs-right{display:flex;gap:6px;align-items:center}
.nbfs-btn{display:flex;align-items:center;gap:8px;background:none;border:none;color:rgba(255,255,255,.88);font-size:14px;font-weight:600;cursor:pointer;padding:8px 6px;white-space:nowrap;font-family:inherit;transition:color .15s;letter-spacing:.01em}
.nbfs-btn svg{width:20px;height:20px;flex-shrink:0}
.nbfs-btn:hover{color:#fff}
.nbfs-btn:active{opacity:.7}

/* Episode peek strip */
#nbpeek{display:none;overflow-x:auto;padding:6px 16px 0;scrollbar-width:none;gap:8px}
#nbpeek::-webkit-scrollbar{display:none}
#nr.nrfs #nbpeek{display:flex}
.nbpeek-ep{flex-shrink:0;width:110px;cursor:pointer}
.nbpeek-ep-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;border:2px solid rgba(255,255,255,.15);transition:border-color .2s}
.nbpeek-ep.act .nbpeek-ep-img,.nbpeek-ep:hover .nbpeek-ep-img{border-color:#fff}

/* Generic icon button */
.nb{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:none;background:transparent;color:#fff;cursor:pointer;transition:background .18s,transform .1s;flex-shrink:0}
.nb:hover{background:rgba(255,255,255,.12)}.nb:active{transform:scale(.84)}
.nb svg{width:24px;height:24px;pointer-events:none}
.nct-back svg{width:22px;height:22px}

/* ═══ GESTURE ZONES (point 6 — invisible zones, no static bars) ═══ */
#ng-left,#ng-right{position:absolute;top:0;bottom:0;width:22%;z-index:3;display:none}
#nr.nrfs #ng-left,#nr.nrfs #ng-right{display:block}
#ng-left{left:0}#ng-right{right:0}

/* Gesture toast — only visible during active gesture */
#ng-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:15;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px;font-weight:700;padding:10px 22px;border-radius:99px;display:none;align-items:center;gap:10px;opacity:0;pointer-events:none;transition:opacity .2s;white-space:nowrap}
#nr.nrfs #ng-toast{display:flex}
#ng-toast.ns{opacity:1}
#ng-toast svg{width:20px;height:20px;flex-shrink:0}

/* ═══ SETTINGS OVERLAY ═══ */
#nfsov{position:absolute;inset:0;z-index:50;background:rgba(4,4,8,.9);backdrop-filter:blur(24px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s}
#nfsov.on{opacity:1;pointer-events:auto}
#nfsov-hd{display:flex;align-items:center;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;overflow-x:auto;scrollbar-width:none;position:relative}
#nfsov-hd::-webkit-scrollbar{display:none}
.nfsov-tab{padding:18px 20px;font-size:14px;font-weight:700;color:rgba(255,255,255,.45);white-space:nowrap;cursor:pointer;border-bottom:2.5px solid transparent;transition:color .18s,border-color .18s;flex-shrink:0}
.nfsov-tab.act{color:#fff;border-bottom-color:#fff}
#nfsov-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
#nfsov-body::-webkit-scrollbar{display:none}
.nfsov-2col{display:grid;grid-template-columns:1fr 1fr;gap:0;height:100%}
.nfsov-col{overflow-y:auto;border-right:1px solid rgba(255,255,255,.08)}
.nfsov-col:last-child{border-right:none}
.nfsov-col-hd{font-size:12px;font-weight:800;color:rgba(255,255,255,.4);letter-spacing:.12em;text-transform:uppercase;padding:18px 22px 10px}
.nfsov-item{display:flex;align-items:center;gap:16px;padding:16px 22px;cursor:pointer;transition:background .15s}
.nfsov-item:hover{background:rgba(255,255,255,.06)}
.nfsov-item-texts{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.nfsov-item-lbl{font-size:16px;font-weight:600;color:rgba(255,255,255,.78)}
.nfsov-item-sub{font-size:13px;color:rgba(255,255,255,.38)}
.nfsov-item.act .nfsov-item-lbl{color:#5aabff;font-weight:700}
.nfsov-item-check{width:22px;height:22px;flex-shrink:0;color:#5aabff;opacity:0}
.nfsov-item.act .nfsov-item-check{opacity:1}
.nfsov-item-ch{display:flex;align-items:center;gap:16px;padding:16px 22px;cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(255,255,255,.05)}
.nfsov-item-ch:hover{background:rgba(255,255,255,.05)}
.nfsov-item-ch.act{background:rgba(255,255,255,.07)}
.nfsov-ch-time{font-size:13px;font-weight:700;color:rgba(255,255,255,.4);font-variant-numeric:tabular-nums;flex-shrink:0;min-width:46px}
.nfsov-ch-lbl{font-size:15px;font-weight:600;color:rgba(255,255,255,.85);flex:1}
.nfsov-ch-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.3);flex-shrink:0}
.nfsov-item-ch.act .nfsov-ch-dot{background:#5aabff}

/* ═══ PLAYLIST OVERLAY ═══ */
#nfspl{position:absolute;inset:0;z-index:50;background:rgba(4,4,8,.9);backdrop-filter:blur(24px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s}
#nfspl.on{opacity:1;pointer-events:auto}
#nfspl-tabs{display:flex;align-items:center;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.1);position:relative;padding:0 52px 0 0;overflow-x:auto;scrollbar-width:none}
#nfspl-tabs::-webkit-scrollbar{display:none}
.nfspl-tab{padding:18px 24px;font-size:16px;font-weight:700;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2.5px solid transparent;transition:color .18s,border-color .18s;white-space:nowrap}
.nfspl-tab.act{color:#fff;border-bottom-color:#fff}
#nfspl-seasons{display:flex;overflow-x:auto;padding:14px 16px 0;gap:10px;flex-shrink:0;scrollbar-width:none}
#nfspl-seasons::-webkit-scrollbar{display:none}
.nfspl-stab{padding:8px 20px;border-radius:99px;font-size:14px;font-weight:700;color:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.18);cursor:pointer;white-space:nowrap;transition:all .18s;flex-shrink:0}
.nfspl-stab.act{color:#fff;border-color:#fff;background:rgba(255,255,255,.1)}
#nfspl-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
#nfspl-body::-webkit-scrollbar{display:none}
.nfspl-eprow{display:flex;overflow-x:auto;padding:16px 16px 12px;gap:14px;scrollbar-width:none}
.nfspl-eprow::-webkit-scrollbar{display:none}
.nfspl-ep{flex-shrink:0;width:clamp(150px,32vw,200px);cursor:pointer}
.nfspl-ep-tw{position:relative;border-radius:8px;overflow:hidden;background:#111;aspect-ratio:16/9;margin-bottom:8px}
.nfspl-ep-tw img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}
.nfspl-ep:hover .nfspl-ep-tw img{transform:scale(1.04)}
.nfspl-ep.act .nfspl-ep-tw{box-shadow:0 0 0 2.5px #fff}
.nfspl-ep-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.32);opacity:0;transition:opacity .2s}
.nfspl-ep:hover .nfspl-ep-play,.nfspl-ep.act .nfspl-ep-play{opacity:1}
.nfspl-ep-play svg{width:32px;height:32px;color:#fff}
.nfspl-ep-pb{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.12)}
.nfspl-ep-pbf{height:100%;background:linear-gradient(90deg,#6c63ff,#ec4899)}
.nfspl-ep-title{font-size:14px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:4px}
.nfspl-ep-meta{font-size:12px;color:rgba(255,255,255,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.nfspl-ep-desc{font-size:11px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
video::cue{font-size:1.15em;background:rgba(0,0,0,.8);color:#fff;border-radius:3px;padding:2px 6px}
/* ═══ SKIP INTRO/OUTRO BUTTON (point 4) ═══ */
#nskip{position:absolute;right:18px;z-index:25;bottom:calc(100% + 8px);display:none;align-items:center;gap:8px;background:rgba(10,10,20,.85);backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,.35);color:#fff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;cursor:pointer;white-space:nowrap;font-family:inherit;letter-spacing:.02em;transition:background .18s,transform .12s}
#nskip.vis{display:flex}
#nskip:hover{background:rgba(255,255,255,.15)}
#nskip:active{transform:scale(.95)}
`;
document.head.appendChild(s);
}

const g=id=>document.getElementById(id);
let el={},_nt=null;

const fT=t=>{if(!isFinite(t))return'0:00';const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const fRem=()=>{if(!el.vid)return'0:00';const r=(el.vid.duration||0)-el.vid.currentTime;return r>0?fT(r):'0:00';};

function nudge(txt,side){
const t=side==='l'?el.nul:el.nur;
if(!t)return;
t.textContent=txt;t.classList.remove('snp');void t.offsetWidth;t.classList.add('snp');
clearTimeout(_nt);_nt=setTimeout(()=>[el.nul,el.nur].forEach(x=>x&&x.classList.remove('snp')),750);
}
function sysMsg(msg,persist){
if(!el.sh2)return;
el.sh2.textContent=msg;el.sh2.classList.add('ns');
if(!persist){clearTimeout(ST.sysTmr);ST.sysTmr=setTimeout(()=>el.sh2&&el.sh2.classList.remove('ns'),2200);}
}
function clearSysMsg(){clearTimeout(ST.sysTmr);if(el.sh2)el.sh2.classList.remove('ns');}

// seekbar always visible; only top bar + centre + sub-rows toggle (points 1,4)
function showUI(){if(!ST.started)return;ST.uiFull=true;el.bot&&el.bot.classList.add('nv');el.ct&&el.ct.classList.add('nv');el.cc&&el.cc.classList.add('nv');_updSkip();hiTmr();}
function hideUI(){if(!ST.started||ST.fsOvOpen)return;ST.uiFull=false;[el.ct,el.cc].forEach(x=>x&&x.classList.remove('nv'));if(el.bot)el.bot.classList.remove('nv');}
function hiTmr(){clearTimeout(ST.uiTmr);if(ST.playing&&!ST.fsOvOpen)ST.uiTmr=setTimeout(hideUI,CFG.uiHide);}

/* ═══ Settings overlay — only × closes (point 7) ═══ */
function openFsOv(tab){
ST.fsOvOpen=true;_setFsOvTab(tab||'quality');
clearTimeout(ST.uiTmr);
if(el.vid&&ST.playing)el.vid.pause();
const ov=g('nfsov');if(ov)ov.classList.add('on');
}
function closeFsOv(){
ST.fsOvOpen=false;
const ov=g('nfsov');if(ov)ov.classList.remove('on');
if(el.vid&&!ST.ended)el.vid.play().catch(()=>{});
showUI();
}
function _setFsOvTab(t){
ST.fsOvTab=t;
document.querySelectorAll('.nfsov-tab').forEach(x=>x.classList.toggle('act',x.dataset.tab===t));
_renderFsOvBody();
}
function _renderFsOvBody(){
const body=g('nfsov-body');if(!body)return;
const tr=(_ep&&_ep.tracks)||{},caps=(_ep&&_ep.captions)||[],chs=(_ep&&_ep.chapters)||[];
body.innerHTML='';
if(ST.fsOvTab==='quality'){
const langs=Object.keys(tr),qs=langs.length?Object.keys(tr[ST.lang]||tr[langs[0]]):[];
qs.forEach(q=>{body.insertAdjacentHTML('beforeend',_fsItem(q,'',q===ST.qual,`NV._setQual('${q}')`,q==='1080p'?'HD':q==='4K'?'Ultra HD':''));});
}else if(ST.fsOvTab==='audio'){
const langs=Object.keys(tr);
langs.forEach((lk,i)=>{body.insertAdjacentHTML('beforeend',_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,'')); });
}else if(ST.fsOvTab==='subtitles'){
const langsList=Object.keys(tr);
let html=`<div class="nfsov-2col"><div class="nfsov-col"><div class="nfsov-col-hd">AUDIO</div>`;
langsList.forEach((lk,i)=>{html+=_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,'')} );
html+=`</div><div class="nfsov-col"><div class="nfsov-col-hd">SUBTITLES</div>`;
html+=_fsItem('Off','',_noSub(),`NV._setSub(null)`,'');
caps.forEach(c=>{html+=_fsItem(c.label||c.lang,'',_subAct(c.lang),`NV._setSub('${c.lang}')`,'')} );
html+=`</div></div>`;
body.innerHTML=html;return;
}else if(ST.fsOvTab==='chapters'){
if(!chs.length){body.innerHTML='<p style="padding:32px 22px;color:rgba(255,255,255,.35);font-size:15px;text-align:center">No chapters available</p>';return;}
chs.forEach((ch,i)=>{const next=chs[i+1];const cur=el.vid&&el.vid.currentTime>=ch.t&&(!next||el.vid.currentTime<next.t);body.insertAdjacentHTML('beforeend',`<div class="nfsov-item-ch${cur?' act':''}" onclick="NV._seekTo(${ch.t})"><div class="nfsov-ch-dot"></div><span class="nfsov-ch-time">${fT(ch.t)}</span><span class="nfsov-ch-lbl">${ch.title}</span></div>`);});
}else if(ST.fsOvTab==='speed'){
CFG.speeds.forEach(v=>{body.insertAdjacentHTML('beforeend',_fsItem(v+'×','',v===ST.spd,`NV._fsSetSpd(${v})`,''));});
}
}
function _fsItem(lbl,sub,act,onclick){
return`<div class="nfsov-item${act?' act':''}" onclick="${onclick}"><div class="nfsov-item-check">${IC.check}</div><div class="nfsov-item-texts"><span class="nfsov-item-lbl">${lbl}</span>${sub?`<span class="nfsov-item-sub">${sub}</span>`:''}</div></div>`;
}
const _noSub=()=>!el.vid||Array.from(el.vid.textTracks||[]).every(t=>t.mode!=='showing');
const _subAct=l=>!!(el.vid&&Array.from(el.vid.textTracks||[]).find(t=>t.srclang===l&&t.mode==='showing'));

/* ═══ Playlist overlay — only × closes (point 7) ═══ */
function openFspl(tab){
ST.fsOvOpen=true;_fsplCurTab=tab||'episodes';
clearTimeout(ST.uiTmr);
if(el.vid&&ST.playing)el.vid.pause();
const ov=g('nfspl');if(ov)ov.classList.add('on');
_renderFsplTabs();_renderFsplBody();
}
function closeFspl(){
ST.fsOvOpen=false;
const ov=g('nfspl');if(ov)ov.classList.remove('on');
if(el.vid&&!ST.ended)el.vid.play().catch(()=>{});
showUI();
}
function _renderFsplTabs(){
const tabs=g('nfspl-tabs');if(!tabs)return;
tabs.innerHTML=['watchnext','episodes'].map(t=>
`<div class="nfspl-tab${_fsplCurTab===t?' act':''}" onclick="NV._fsplSetTab('${t}')">${t==='watchnext'?'Watch Next':'Episodes'}</div>`
).join('')
+`<button class="nb" id="nfspl-close-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">${IC.close}</button>`;
const cb=g('nfspl-close-btn');if(cb)cb.onclick=e=>{e.stopPropagation();closeFspl();};
}
function _renderFsplBody(){
const body=g('nfspl-body');if(!body)return;
body.innerHTML='';
if(_fsplCurTab==='watchnext'){
const cw=D.getContinueWatching().filter(x=>x.show.id!==_sid).slice(0,14);
const row=document.createElement('div');row.className='nfspl-eprow';
cw.forEach(({show:s,ep,pct})=>{const mv=!!s.isMovie;
row.innerHTML+=`<div class="nfspl-ep" onclick="NV._fsplPlay('${s.id}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||s.thumb||''}"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${s.title}</div><div class="nfspl-ep-meta">${mv?ep.dur:`S${ep.s} E${ep.e}`}</div></div>`;});
if(!cw.length)row.innerHTML='<p style="padding:28px 16px;color:rgba(255,255,255,.35);font-size:15px">Nothing in progress</p>';
body.appendChild(row);
}else{
const s=D.getShow(_sid);if(!s)return;
const seasons=[...new Set(s.episodes.map(e=>e.s))];
if(seasons.length>1){
const stabs=document.createElement('div');stabs.id='nfspl-seasons';
seasons.forEach(sn=>{stabs.innerHTML+=`<div class="nfspl-stab${sn===_fsplCurSeason?' act':''}" onclick="NV._fsplSetSeason(${sn})">Season ${sn}</div>`;});
body.appendChild(stabs);
}
const row=document.createElement('div');row.className='nfspl-eprow';
s.episodes.filter(e=>e.s===_fsplCurSeason).forEach(ep=>{
const pct=D.getProgress(_sid,ep.id),act=ep.id===_eid;
row.innerHTML+=`<div class="nfspl-ep${act?' act':''}" onclick="NV._fsplPlay('${_sid}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||''}"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${ep.title}</div><div class="nfspl-ep-meta">S${ep.s} E${ep.e} · ${ep.date} · ${ep.dur}</div><div class="nfspl-ep-desc">${ep.desc||''}</div></div>`;});
body.appendChild(row);
}
}

/* helpers */
function tPlay(){if(!el.vid)return;if(ST.ended){el.vid.currentTime=0;el.vid.play();ST.ended=false;}else{el.vid.paused?el.vid.play():el.vid.pause();}}
function seek(d){if(!el.vid)return;el.vid.currentTime=Math.max(0,Math.min(el.vid.duration||0,el.vid.currentTime+d));nudge((d>0?'+':'')+d+'s',d>0?'r':'l');}
function adjSpd(dir){const idx=CFG.speeds.indexOf(ST.spd),ni=Math.max(0,Math.min(CFG.speeds.length-1,idx+dir));_fsSetSpd(CFG.speeds[ni]);}
function setVol(v){if(!el.vid)return;ST.vol=Math.max(0,Math.min(1,v));el.vid.volume=ST.vol;ST.muted=ST.vol===0;el.vid.muted=ST.muted;_showGst('vol');}
function tMute(){if(!el.vid)return;ST.muted=!ST.muted;el.vid.muted=ST.muted;}
function _fsSetSpd(v){if(!el.vid)return;ST.spd=v;el.vid.playbackRate=v;const b=g('nspd-lbl');if(b)b.textContent=v+'x';sysMsg(v+'× speed');if(ST.fsOvTab==='speed')_renderFsOvBody();}
function _setQual(q){loadTrk(ST.lang,q,true);_renderFsOvBody();}
function _setLang(l){loadTrk(l,ST.qual,true);_renderFsOvBody();}
function _setSub(lang){if(!el.vid)return;Array.from(el.vid.textTracks).forEach(t=>t.mode='hidden');if(lang){const trk=Array.from(el.vid.textTracks).find(t=>t.srclang===lang);if(trk)trk.mode='showing';}_renderFsOvBody();}
function _seekTo(t){if(el.vid)el.vid.currentTime=t;closeFsOv();}
function _fsplSetTab(t){_fsplCurTab=t;_renderFsplTabs();_renderFsplBody();}
function _fsplSetSeason(s){_fsplCurSeason=s;_renderFsplBody();}
function _fsplPlay(sid,eid){closeFspl();R.ep(sid,eid);}

// gesture toast only (point 6 — no static bars)
function _showGst(type){
const v=type==='vol'?ST.vol:ST.bright;
const pct=Math.round(v*100);
const toast=g('ng-toast');
if(toast){
toast.innerHTML=(type==='vol'?IC.volumeUp:IC.brightness)+`<span>${pct}%</span>`;
toast.classList.add('ns');
clearTimeout(ST.gtTmr);ST.gtTmr=setTimeout(()=>{if(toast)toast.classList.remove('ns');},1600);
}
}

function sFrac(f){const d=el.vid&&el.vid.duration;if(isFinite(d))el.vid.currentTime=Math.max(0,Math.min(d,f*d));}
function fFrac(e){const sw=g('nsw');if(!sw)return 0;const r=sw.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}

/* tick */
function tick(){
if(!el.vid)return;
const d=el.vid.duration||0,c=el.vid.currentTime||0,f=d?c/d:0;
const sf=g('nsf'),sth=g('nsth'),sbuf=g('nsbuf'),ntm=g('ntm');
if(sf)sf.style.width=(f*100)+'%';
if(sth)sth.style.left=(f*100)+'%';
if(ntm)ntm.textContent=fRem();
if(sbuf&&el.vid.buffered.length&&d>0){let b=0;for(let i=0;i<el.vid.buffered.length;i++)if(el.vid.buffered.start(i)<=c&&el.vid.buffered.end(i)>=c){b=el.vid.buffered.end(i);break;}sbuf.style.width=(b/d*100)+'%';}
if(d>0){D.setProgress(_sid,_eid,Math.min(100,Math.round(f*100)));_savePos();}
ST.raf=requestAnimationFrame(tick);
}

/* track loading */
function loadTrk(lk,qk,resume){
const tr=(_ep&&_ep.tracks)||{};const langs=Object.keys(tr);if(!langs.length)return;
if(!langs.includes(lk))lk=langs[0];ST.lang=lk;
const quals=Object.keys(tr[lk]||{});if(!quals.includes(qk))qk=quals[0]||qk;ST.qual=qk;
const src=tr[lk][qk],ct=resume&&el.vid?el.vid.currentTime:0,wp=el.vid&&!el.vid.paused;
if(!el.vid)return;
el.vid.src=src;el.vid.load();el.vid.currentTime=ct;ST.ended=false;ST.bufErr=0;
if(wp&&resume)el.vid.play().catch(()=>{});
// show thumbnail (point 11)
const nth=g('nth');if(nth){nth.src=_ep.thumb||'';nth.style.display='block';}if(el.vid&&_ep.thumb)el.vid.setAttribute('poster',_ep.thumb);
const fst=g('nct-title-main');if(fst)fst.textContent=_show.title||'';
const fstsub=g('nct-title-sub');if(fstsub)fstsub.textContent=`S${_ep.s} E${_ep.e} · ${_ep.title||''}`;
_savePref();_loadCaptions();_drawChDots();
}
function _loadCaptions(){
if(!el.vid)return;
const caps=(_ep&&_ep.captions)||[];
Array.from(el.vid.querySelectorAll('track')).forEach(t=>t.remove());
caps.forEach(c=>{const t=document.createElement('track');t.kind='subtitles';t.label=c.label||c.lang||'';t.srclang=c.lang||'en';t.src=c.src;el.vid.appendChild(t);});
}
function _drawChDots(){
const st=g('nst');if(!st)return;
st.querySelectorAll('.nsch-dot').forEach(d=>d.remove());
const chs=(_ep&&_ep.chapters)||[];const d=el.vid&&el.vid.duration||0;
if(!chs.length||!d)return;
chs.forEach(ch=>{const dot=document.createElement('div');dot.className='nsch-dot';dot.style.left=(ch.t/d*100)+'%';st.appendChild(dot);});
}

/* network + error handling (point 13 — smarter error detection) */
function _netSetup(){
const v=el.vid;if(!v)return;
let _wasPlaying=false;
window.addEventListener('offline',()=>{ST.netOk=false;_wasPlaying=ST.playing;sysMsg('No connection',true);});
window.addEventListener('online',()=>{
ST.netOk=true;clearSysMsg();
if(_wasPlaying){const pos=v.currentTime;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;v.play().catch(()=>{});},{once:true});sysMsg('Reconnected');}
});
// Only show real errors — ignore MEDIA_ERR_ABORTED (code 1 = user navigated away)
v.addEventListener('error',()=>{
if(!ST.netOk)return;
const err=v.error;
if(!err||err.code===1)return;// code 1 = aborted, normal
ST.bufErr++;
if(ST.bufErr>2){clearSysMsg();return;}// stop retrying after 3 attempts
sysMsg('Retrying…',true);
setTimeout(()=>{
const pos=v.currentTime;
v.load();
v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;if(ST.playing)v.play().catch(()=>{});},{once:true});
},2500);
});
// protect video (point 13)
v.setAttribute('controlsList','nodownload noremoteplayback');
v.disablePictureInPicture=true;
v.addEventListener('contextmenu',e=>e.preventDefault());
}

/* peek row */
/* ═══ Skip Intro/Outro (point 4) ═══ */
function _getSkipCh(){
const chs=(_ep&&_ep.chapters)||[];
if(!chs.length||!el.vid)return null;
const t=el.vid.currentTime;
for(let i=0;i<chs.length;i++){
const ch=chs[i],next=chs[i+1];
const inRange=t>=ch.t&&(next?t<next.t:t<(el.vid.duration||Infinity));
if(inRange){
const lc=(ch.title||'').toLowerCase();
if(lc==='intro'||lc.includes('intro'))return{label:'Skip Intro',next:next?next.t:ch.t+90};
if(lc==='outro'||lc.includes('outro')||lc==='credits'||lc.includes('credit'))return{label:'Skip Outro',next:el.vid.duration||ch.t+300};
}
}
return null;
}
function _updSkip(){
if(!ST.fs)return;// skip button only in fullscreen
const btn=g('nskip');if(!btn)return;
const sk=_getSkipCh();
if(sk){btn.textContent=sk.label;btn._skipTo=sk.next;btn.classList.add('vis');}
else{btn.classList.remove('vis');}
}
function _buildPeek(){
const peek=g('nbpeek');if(!peek)return;
peek.innerHTML='';
_pl.forEach(ep=>{
const act=ep.id===_eid;
const d=document.createElement('div');d.className='nbpeek-ep'+(act?' act':'');
d.innerHTML=`<img class="nbpeek-ep-img" src="${ep.thumb||''}" loading="lazy" onerror="this.style.background='#222'">`;
d.onclick=()=>R.ep(_sid,ep.id);
peek.appendChild(d);
});
}

/* bind events */
function bndEvt(){
const v=el.vid;

v.addEventListener('play',()=>{
ST.started=true;ST.playing=true;ST.ended=false;
const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;
// hide thumbnail once playing (point 11)
const nth=g('nth');if(nth)nth.style.display='none';
const sp=g('nsp');if(sp)sp.classList.remove('ns');
showUI();
});
v.addEventListener('pause',()=>{
ST.playing=false;
if(!ST.ended){const cp=g('npl2');if(cp)cp.innerHTML=IC.play;}
showUI();
const sp=g('nsp');if(sp)sp.classList.remove('ns');
});
v.addEventListener('ended',()=>{
try{localStorage.removeItem(_lsKey(_sid,_eid));}catch{}
const i=_pl.findIndex(x=>x.id===_eid);
if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);
else{ST.playing=false;ST.ended=true;const cp=g('npl2');if(cp)cp.innerHTML=IC.replay;showUI();}
});
v.addEventListener('waiting',()=>{const sp=g('nsp');if(sp)sp.classList.add('ns');});
v.addEventListener('playing',()=>{const sp=g('nsp');if(sp)sp.classList.remove('ns');clearSysMsg();ST.bufErr=0;});
v.addEventListener('canplay',()=>{const sp=g('nsp');if(sp)sp.classList.remove('ns');_drawChDots();});

// point 12: auto-play on load
v.addEventListener('loadedmetadata',()=>{
tick();
const rt=_loadPos();
if(rt>2&&rt<(v.duration-5)){v.currentTime=rt;sysMsg('Resumed '+fT(rt));}
v.play().catch(()=>{});// auto-play regardless
});
v.addEventListener('durationchange',_drawChDots);
v.addEventListener('timeupdate',()=>{if(ST.fs)_updSkip();});

// play/pause centre btn
const cp=g('npl2');if(cp)cp.onclick=e=>{e.stopPropagation();tPlay();};

// fullscreen — enter and exit (point 3)
const fsBtn=g('nfs-btn');
if(fsBtn)fsBtn.onclick=e=>{e.stopPropagation();el.root&&el.root.requestFullscreen&&el.root.requestFullscreen().catch(()=>{});};
const fsExit=g('nfs-exit');
if(fsExit)fsExit.onclick=e=>{e.stopPropagation();document.exitFullscreen&&document.exitFullscreen().catch(()=>{});};

// settings gear — FS only (CSS handles visibility, but also guard)
const setBtn=g('nset');
if(setBtn)setBtn.onclick=e=>{e.stopPropagation();if(ST.fs)openFsOv('quality');};

// FS bottom row
const wnBtn=g('nwn'),epBtn=g('nep'),spdBtn=g('nspd'),nxBtn=g('nnx');
if(wnBtn)wnBtn.onclick=e=>{e.stopPropagation();openFspl('watchnext');};
if(epBtn)epBtn.onclick=e=>{e.stopPropagation();openFspl('episodes');};
if(spdBtn)spdBtn.onclick=e=>{e.stopPropagation();if(ST.fs)openFsOv('speed');};
if(nxBtn)nxBtn.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);};

// seekbar
const sw=g('nsw');
if(sw){
const ss=e=>{ST.drag=true;sFrac(fFrac(e));e.stopPropagation();showUI();};
const sm=e=>{if(ST.drag){sFrac(fFrac(e));tick();}};
const se=()=>{ST.drag=false;};
sw.addEventListener('mousedown',ss);sw.addEventListener('touchstart',ss,{passive:true});
document.addEventListener('mousemove',sm);
document.addEventListener('touchmove',e=>{if(ST.drag)sm(e);},{passive:true});
document.addEventListener('mouseup',se);document.addEventListener('touchend',se);
sw.addEventListener('mousemove',e=>{const f=fFrac(e);const sh=g('nsh');if(sh){sh.textContent=fT(f*(v.duration||0));sh.style.left=(f*100)+'%';sh.style.opacity='1';}});
sw.addEventListener('mouseleave',()=>{const sh=g('nsh');if(sh)sh.style.opacity='0';});
}

// overlay tap handler (point 4 — click shows UI, doesn't toggle-hide it)
const ov=g('nov');
if(ov){
ov.addEventListener('click',e=>{
if(e.target.closest('#nb')||e.target.closest('#nct')||e.target.closest('#ncc'))return;
if(ST.fsOvOpen)return;
if(!ST.started){tPlay();return;}
if(!ST.uiFull){showUI();}else{hiTmr();}// just reset timer, don't hide on tap
});
// double-tap seek gesture (point 1 — replaces seek buttons)
let _td={side:'',cnt:0,tmr:null,lastT:0};
ov.addEventListener('touchstart',e=>{
if(ST.fsOvOpen)return;
const t=e.touches[0],now=Date.now();
const r=ov.getBoundingClientRect(),x=t.clientX-r.left;
const side=x<r.width/3?'l':x>2*r.width/3?'r':'c';
if(now-_td.lastT<CFG.tapMs+80&&_td.side===side&&side!=='c'){
clearTimeout(_td.tmr);_td.cnt++;
const secs=_td.cnt*CFG.skip;
seek((side==='r'?1:-1)*secs);
nudge((side==='r'?'+':'-')+secs+'s',side);
_td.lastT=now;
_td.tmr=setTimeout(()=>{_td={side:'',cnt:0,tmr:null,lastT:0};},600);
}else{
clearTimeout(_td.tmr);_td={side,cnt:1,tmr:null,lastT:now};
_td.tmr=setTimeout(()=>{
if(_td.side==='c'){if(!ST.started)tPlay();else{if(!ST.uiFull)showUI();else hiTmr();}}
_td={side:'',cnt:0,tmr:null,lastT:0};
},CFG.tapMs+80);
}
clearTimeout(ST.holdTmr);
ST.holdTmr=setTimeout(()=>{if(v&&!v.paused){v.playbackRate=CFG.holdSpd;sysMsg('2× speed',true);}},CFG.holdDly);
},{passive:true});
ov.addEventListener('touchend',()=>{clearTimeout(ST.holdTmr);if(v&&v.playbackRate===CFG.holdSpd&&ST.spd!==CFG.holdSpd){v.playbackRate=ST.spd;clearSysMsg();}},{passive:true});
}

// gesture strips — invisible zones, swipe up/down for vol/bright (point 6)
['ng-left','ng-right'].forEach(id=>{
const strip=g(id);if(!strip)return;
const isLeft=id==='ng-left';let sy=0,sv=0;
strip.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sv=isLeft?ST.bright:ST.vol;e.stopPropagation();},{passive:true});
strip.addEventListener('touchmove',e=>{
const dy=sy-e.touches[0].clientY,delta=dy/120,nv=Math.max(0,Math.min(1,sv+delta));
if(isLeft){ST.bright=nv;if(v)v.style.filter=`brightness(${nv})`;_showGst('bright');}
else setVol(nv);
e.stopPropagation();
},{passive:true});
});

// fullscreen change
document.addEventListener('fullscreenchange',()=>{
ST.fs=!!document.fullscreenElement;
if(el.root)el.root.classList.toggle('nrfs',ST.fs);
if(ST.fs&&el.vid)el.vid.play().catch(()=>{});
if(!ST.fs){const btn=g('nskip');if(btn)btn.classList.remove('vis');}// hide skip btn outside FS
else _updSkip();
});

// point 7: NO outside-click close — only × button closes overlays
// (removed document.addEventListener click handler that closed on outside click)

_netSetup();
}

return{
init(sid,eid,show,ep){
injectCSS();_sid=sid;_eid=eid;_show=show;_ep=ep;_pl=show.episodes||[];
_fsplCurSeason=(ep&&ep.s)||1;
ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,fs:false,netOk:true,sysTmr:null,gtTmr:null,bufErr:0};
el={root:g('nr'),vid:g('nvid'),ct:g('nct'),bot:g('nb'),cc:g('ncc'),sh2:g('nsh2'),nul:g('nnl'),nur:g('nnr')};
const cp=g('npl2');if(cp)cp.innerHTML=IC.play;
// Resolve video source from tracks, or fallback to ep.src / ep.url / ep.video
(()=>{
  const v=el.vid;if(!v)return;
  // show thumbnail/poster immediately
  const nth=g('nth');
  if(nth&&ep.thumb){nth.src=ep.thumb;nth.style.display='block';}
  if(ep.thumb)v.setAttribute('poster',ep.thumb);
  // try tracks first
  if(ep.tracks&&Object.keys(ep.tracks).length){
    const pref=_loadPref();const langs=Object.keys(ep.tracks);
    const fl=pref&&langs.includes(pref.lang)?pref.lang:langs[0];
    const qs=Object.keys(ep.tracks[fl]||{});const fq=pref&&qs.includes(pref.qual)?pref.qual:qs[0];
    loadTrk(fl,fq,false);
    return;
  }
  // fallback: direct src field (ep.src, ep.url, ep.video, ep.link)
  const directSrc=ep.src||ep.url||ep.video||ep.link||'';
  if(directSrc){
    v.src=directSrc;v.load();v.currentTime=_loadPos()||0;
    const nth2=g('nth');if(nth2&&ep.thumb){nth2.src=ep.thumb;nth2.style.display='block';}
    _loadCaptions();_drawChDots();_savePref();
  }
})();
bndEvt();
_buildPeek();
const spdb=g('nspd-lbl');if(spdb)spdb.textContent='1x';
if(el.root)el.root.focus();
if(ST.raf)cancelAnimationFrame(ST.raf);tick();
// build settings tabs into #nfsov-hd
const fsoHd=g('nfsov-hd');
if(fsoHd){
const tabDefs=[{key:'quality',label:'Quality'},{key:'subtitles',label:'Audio & Subtitles'},{key:'speed',label:'Playback Speed'},{key:'chapters',label:'Chapters'}];
fsoHd.innerHTML=tabDefs.map(t=>`<div class="nfsov-tab" data-tab="${t.key}" onclick="NV._fsOvTabClick('${t.key}')">${t.label}</div>`).join('')
+`<button class="nb" id="nfsov-close-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">${IC.close}</button>`;
const cb=g('nfsov-close-btn');if(cb)cb.onclick=e=>{e.stopPropagation();closeFsOv();};
_setFsOvTab('quality');
}
// show UI on open
setTimeout(()=>showUI(),300);
},
// point 12: keepFs flag prevents exiting fullscreen on episode switch
destroy(keepFs=false){
if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;
clearTimeout(ST.uiTmr);clearTimeout(ST.holdTmr);clearTimeout(ST.sysTmr);clearTimeout(ST.gtTmr);
if(el.vid){el.vid.pause();el.vid.src='';}
if(!keepFs&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
el={};
},
_tPlay:tPlay,_showUI:showUI,_hideUI:hideUI,
_seek:seek,_adjSpd:adjSpd,_setVol:setVol,_tMute:tMute,
_getVol:()=>ST.vol,_getSpd:()=>ST.spd,_isPlaying:()=>ST.playing,
_seekTo:_seekTo,_setQual:_setQual,_setLang:_setLang,_setSub:_setSub,_fsSetSpd:_fsSetSpd,
_fsOvTabClick:(t)=>{_setFsOvTab(t);},
_fsplSetTab:_fsplSetTab,_fsplSetSeason:_fsplSetSeason,_fsplPlay:_fsplPlay,
_doSkip:()=>{const btn=g('nskip');if(btn&&btn._skipTo!=null&&el.vid){el.vid.currentTime=btn._skipTo;btn.classList.remove('vis');}},
openFsOv:openFsOv,closeFsOv:closeFsOv,openFspl:openFspl,closeFspl:closeFspl
};
})();