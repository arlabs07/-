const NV=(()=>{
'use strict';
const CFG={skip:10,holdSpd:2,holdDly:600,uiHide:4e3,tapMs:350,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};
let ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,fs:false,netOk:true,sysTmr:null,gtTmr:null};
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
#nvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#nth{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;pointer-events:none}
#nov{position:absolute;inset:0;z-index:2;cursor:pointer}
/* gradients when UI shown */
#nct.nv~#nov::before,#nb.nv~#nov::after{opacity:1}
#nov::before{content:'';position:absolute;top:0;left:0;right:0;height:40%;background:linear-gradient(to bottom,rgba(0,0,0,.75),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
#nov::after{content:'';position:absolute;bottom:0;left:0;right:0;height:50%;background:linear-gradient(to top,rgba(0,0,0,.9),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
/* spinner */
#nsp{position:absolute;top:50%;left:50%;z-index:12;width:44px;height:44px;margin:-22px;border:3px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s}
#nsp.ns{opacity:1;animation:nvSpin .75s linear infinite}
@keyframes nvSpin{to{transform:rotate(360deg)}}
/* system message — centre, shared slot */
#nsh2{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:14;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px;font-weight:700;padding:10px 24px;border-radius:99px;opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;text-align:center}
#nsh2.ns{opacity:1}
/* seek nudge labels */
#nnl,#nnr{position:absolute;top:50%;transform:translateY(-50%);z-index:14;color:#fff;font-size:18px;font-weight:800;opacity:0;pointer-events:none;white-space:nowrap}
#nnl{left:14%}#nnr{right:14%;text-align:right}
.snp{animation:nvNudge .65s ease forwards}
@keyframes nvNudge{0%{opacity:1;transform:translateY(-50%) scale(.9)}40%{opacity:1;transform:translateY(-65%) scale(1.05)}100%{opacity:0;transform:translateY(-80%) scale(1)}}
/* ===== TOP BAR ===== */
#nct{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:flex-start;padding:14px 16px 10px;opacity:0;transform:translateY(-6px);transition:opacity .28s,transform .28s;pointer-events:none}
#nct.nv{opacity:1;transform:none;pointer-events:auto}
#nct-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
#nct-title{display:none;flex-direction:column;gap:2px;min-width:0;flex:1}
#nct-title-main{font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
#nct-title-sub{font-size:12px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* show title only in fullscreen */
#nr.nrfs #nct-title{display:flex}
#nct-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
/* FS-only right buttons */
.nct-fs-only{display:none}
#nr.nrfs .nct-fs-only{display:flex;align-items:center;justify-content:center}
/* non-FS fullscreen button */
#nfs-btn{display:flex;align-items:center;justify-content:center}
#nr.nrfs #nfs-btn{display:none}
/* ===== CENTRE CONTROLS ===== */
#ncc{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20;display:flex;align-items:center;gap:28px;opacity:0;pointer-events:none;transition:opacity .28s}
#ncc.nv{opacity:1;pointer-events:auto}
.nb-seek{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border:none;background:none;color:#fff;cursor:pointer;transition:transform .12s,opacity .15s;flex-shrink:0}
.nb-seek svg{width:38px;height:38px}
.nb-seek:active{transform:scale(.82);opacity:.7}
#npl2{display:flex;align-items:center;justify-content:center;width:68px;height:68px;border:none;background:none;color:#fff;cursor:pointer;transition:transform .12s;flex-shrink:0}
#npl2 svg{width:52px;height:52px}
#npl2:active{transform:scale(.88)}
/* ===== BOTTOM BAR ===== */
#nb{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0 0 10px;display:flex;flex-direction:column;gap:0;opacity:0;transform:translateY(6px);transition:opacity .28s,transform .28s;pointer-events:none}
#nb.nv{opacity:1;transform:none;pointer-events:auto}
/* seekbar row */
#nbseek{display:flex;align-items:center;gap:0;padding:0 16px}
#nsw{flex:1;padding:12px 0 4px;cursor:pointer;touch-action:none}
#nst{position:relative;height:3px;background:rgba(255,255,255,.3);border-radius:99px;transition:height .18s}
#nsw:hover #nst,#nsw:active #nst{height:5px}
#nsbuf,#nsf{position:absolute;inset:0;height:100%;border-radius:99px;pointer-events:none}
#nsbuf{background:rgba(255,255,255,.55)}
#nsf{background:#fff}
#nsth{position:absolute;top:50%;left:0;width:16px;height:16px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .18s;pointer-events:none;box-shadow:0 0 6px rgba(0,0,0,.6)}
#nsw:hover #nsth,#nsw:active #nsth,#nr.nrfs #nsth{transform:translate(-50%,-50%) scale(1)}
/* chapter dots on seekbar */
.nsch-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:5px;height:5px;border-radius:50%;background:rgba(255,180,0,.85);pointer-events:none}
#ntm{font-size:16px;font-weight:700;color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;padding-left:10px;flex-shrink:0;line-height:1}
/* hover time tooltip */
#nsh{position:absolute;bottom:calc(100% + 6px);background:rgba(0,0,0,.85);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap}
/* FS bottom row */
#nbrow-fs{display:none;align-items:center;justify-content:space-between;padding:6px 14px 2px}
#nr.nrfs #nbrow-fs{display:flex}
.nbfs-btn{display:flex;align-items:center;gap:7px;background:none;border:none;color:rgba(255,255,255,.88);font-size:13px;font-weight:600;cursor:pointer;padding:6px 4px;white-space:nowrap;font-family:inherit;transition:color .15s}
.nbfs-btn svg{width:18px;height:18px;flex-shrink:0}
.nbfs-btn:hover{color:#fff}
.nbfs-btn:active{opacity:.7}
/* FS episode peek row */
#nbpeek{display:none;overflow-x:auto;padding:6px 14px 0;scrollbar-width:none;gap:8px}
#nbpeek::-webkit-scrollbar{display:none}
#nr.nrfs #nbpeek{display:flex}
.nbpeek-ep{flex-shrink:0;width:100px;cursor:pointer}
.nbpeek-ep-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:5px;border:1.5px solid rgba(255,255,255,.12)}
.nbpeek-ep.act .nbpeek-ep-img{border-color:#fff}
/* non-FS body title (below video) */
#nvbody{padding:14px 16px 0;background:transparent}
#nvbody-title{font-size:22px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:4px;font-family:'Bebas Neue',cursive;letter-spacing:.02em}
#nvbody-sub{font-size:15px;font-weight:600;color:rgba(255,255,255,.75)}
/* ===== GESTURE STRIPS ===== */
#ng-left,#ng-right{position:absolute;top:0;bottom:0;width:22%;z-index:3;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px}
#nr.nrfs #ng-left,#nr.nrfs #ng-right{display:flex}
#ng-left{left:0}#ng-right{right:0}
.ng-track{width:4px;height:36%;background:rgba(255,255,255,.15);border-radius:99px;position:relative}
.ng-fill{position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,.75);border-radius:99px;transition:height .08s}
.ng-icon{color:rgba(255,255,255,.6)}
.ng-icon svg{width:18px;height:18px}
/* gesture toast */
#ng-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:15;background:rgba(0,0,0,.75);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:13px;font-weight:700;padding:8px 18px;border-radius:99px;display:none;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:opacity .2s;white-space:nowrap}
#nr.nrfs #ng-toast{display:flex}
#ng-toast.ns{opacity:1}
#ng-toast svg{width:18px;height:18px;flex-shrink:0}
/* ===== SETTINGS OVERLAY ===== */
#nfsov{position:absolute;inset:0;z-index:50;background:rgba(5,5,10,.88);backdrop-filter:blur(22px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s}
#nfsov.on{opacity:1;pointer-events:auto}
#nfsov-hd{display:flex;align-items:center;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;overflow-x:auto;scrollbar-width:none;position:relative}
#nfsov-hd::-webkit-scrollbar{display:none}
.nfsov-tab{padding:16px 18px;font-size:13px;font-weight:700;color:rgba(255,255,255,.45);white-space:nowrap;cursor:pointer;border-bottom:2.5px solid transparent;transition:color .18s,border-color .18s;flex-shrink:0}
.nfsov-tab.act{color:#fff;border-bottom-color:#fff}
#nfsov-close{position:absolute;right:14px;top:50%;transform:translateY(-50%);flex-shrink:0}
#nfsov-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
#nfsov-body::-webkit-scrollbar{display:none}
/* two-col layout for Audio & Subtitles */
.nfsov-2col{display:grid;grid-template-columns:1fr 1fr;gap:0;height:100%}
.nfsov-col{overflow-y:auto;border-right:1px solid rgba(255,255,255,.08)}
.nfsov-col:last-child{border-right:none}
.nfsov-col-hd{font-size:11px;font-weight:800;color:rgba(255,255,255,.4);letter-spacing:.1em;text-transform:uppercase;padding:16px 20px 8px}
/* single-col items */
.nfsov-item{display:flex;align-items:center;gap:14px;padding:14px 20px;cursor:pointer;transition:background .15s}
.nfsov-item:hover{background:rgba(255,255,255,.05)}
.nfsov-item-texts{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.nfsov-item-lbl{font-size:15px;font-weight:600;color:rgba(255,255,255,.75)}
.nfsov-item-sub{font-size:12px;color:rgba(255,255,255,.38)}
.nfsov-item.act .nfsov-item-lbl{color:#4d9fff;font-weight:700}
.nfsov-item-check{width:20px;height:20px;flex-shrink:0;color:#4d9fff;opacity:0}
.nfsov-item.act .nfsov-item-check{opacity:1}
/* chapters items */
.nfsov-item-ch{display:flex;align-items:center;gap:14px;padding:14px 20px;cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(255,255,255,.05)}
.nfsov-item-ch:hover{background:rgba(255,255,255,.05)}
.nfsov-item-ch.act{background:rgba(255,255,255,.07)}
.nfsov-ch-time{font-size:12px;font-weight:700;color:rgba(255,255,255,.4);font-variant-numeric:tabular-nums;flex-shrink:0;min-width:42px}
.nfsov-ch-lbl{font-size:14px;font-weight:600;color:rgba(255,255,255,.85);flex:1}
.nfsov-ch-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);flex-shrink:0}
.nfsov-item-ch.act .nfsov-ch-dot{background:#4d9fff}
/* ===== PLAYLIST OVERLAY ===== */
#nfspl{position:absolute;inset:0;z-index:50;background:rgba(5,5,10,.88);backdrop-filter:blur(22px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s}
#nfspl.on{opacity:1;pointer-events:auto}
#nfspl-hd{display:flex;align-items:center;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.1);position:relative;padding:0 52px 0 0}
#nfspl-tabs{display:flex;overflow-x:auto;scrollbar-width:none}
#nfspl-tabs::-webkit-scrollbar{display:none}
.nfspl-tab{padding:16px 22px;font-size:15px;font-weight:700;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2.5px solid transparent;transition:color .18s,border-color .18s;white-space:nowrap}
.nfspl-tab.act{color:#fff;border-bottom-color:#fff}
#nfspl-close{position:absolute;right:14px;top:50%;transform:translateY(-50%)}
#nfspl-seasons{display:flex;overflow-x:auto;padding:12px 16px 0;gap:10px;flex-shrink:0;scrollbar-width:none}
#nfspl-seasons::-webkit-scrollbar{display:none}
.nfspl-stab{padding:7px 18px;border-radius:99px;font-size:13px;font-weight:700;color:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.18);cursor:pointer;white-space:nowrap;transition:all .18s;flex-shrink:0}
.nfspl-stab.act{color:#fff;border-color:#fff;background:rgba(255,255,255,.1)}
#nfspl-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
#nfspl-body::-webkit-scrollbar{display:none}
.nfspl-eprow{display:flex;overflow-x:auto;padding:14px 16px 10px;gap:14px;scrollbar-width:none}
.nfspl-eprow::-webkit-scrollbar{display:none}
.nfspl-ep{flex-shrink:0;width:clamp(140px,30vw,190px);cursor:pointer}
.nfspl-ep-tw{position:relative;border-radius:8px;overflow:hidden;background:#111;aspect-ratio:16/9;margin-bottom:8px}
.nfspl-ep-tw img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}
.nfspl-ep:hover .nfspl-ep-tw img{transform:scale(1.04)}
.nfspl-ep.act .nfspl-ep-tw{box-shadow:0 0 0 2.5px #fff}
.nfspl-ep-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.32);opacity:0;transition:opacity .2s}
.nfspl-ep:hover .nfspl-ep-play{opacity:1}
.nfspl-ep-play svg{width:28px;height:28px;color:#fff}
.nfspl-ep-pb{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.12)}
.nfspl-ep-pbf{height:100%;background:linear-gradient(90deg,#6c63ff,#ec4899)}
.nfspl-ep-title{font-size:13px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.nfspl-ep-meta{font-size:11px;color:rgba(255,255,255,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.nfspl-ep-desc{font-size:10px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* generic nb button */
.nb{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:none;background:transparent;color:#fff;cursor:pointer;transition:background .18s,transform .1s;flex-shrink:0}
.nb:hover{background:rgba(255,255,255,.1)}.nb:active{transform:scale(.84)}
.nb svg{width:22px;height:22px;pointer-events:none}
video::cue{font-size:1.1em;background:rgba(0,0,0,.78);color:#fff;border-radius:3px;padding:2px 6px}
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
clearTimeout(_nt);_nt=setTimeout(()=>[el.nul,el.nur].forEach(x=>x&&x.classList.remove('snp')),700);
}
function sysMsg(msg,persist){
if(!el.sh2)return;
el.sh2.textContent=msg;el.sh2.classList.add('ns');
if(!persist){clearTimeout(ST.sysTmr);ST.sysTmr=setTimeout(()=>el.sh2&&el.sh2.classList.remove('ns'),2000);}
}
function clearSysMsg(){clearTimeout(ST.sysTmr);if(el.sh2)el.sh2.classList.remove('ns');}

function showUI(){if(!ST.started)return;ST.uiFull=true;el.bot&&el.bot.classList.add('nv');el.ct&&el.ct.classList.add('nv');el.cc&&el.cc.classList.add('nv');hiTmr();}
function hideUI(){if(!ST.started||ST.fsOvOpen)return;ST.uiFull=false;[el.bot,el.ct,el.cc].forEach(x=>x&&x.classList.remove('nv'));}
function hiTmr(){clearTimeout(ST.uiTmr);if(ST.playing&&!ST.fsOvOpen)ST.uiTmr=setTimeout(hideUI,CFG.uiHide);}

/* ===== Settings overlay ===== */
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
langs.forEach((lk,i)=>{body.insertAdjacentHTML('beforeend',_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,''));});
}else if(ST.fsOvTab==='subtitles'){
// two-column: audio left, subtitles right
const langsList=Object.keys(tr);
let html=`<div class="nfsov-2col"><div class="nfsov-col"><div class="nfsov-col-hd">AUDIO</div>`;
langsList.forEach((lk,i)=>{html+=_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,'')} );
html+=`</div><div class="nfsov-col"><div class="nfsov-col-hd">SUBTITLES</div>`;
html+=_fsItem('Off','',_noSub(),`NV._setSub(null)`,'');
caps.forEach(c=>{html+=_fsItem(c.label||c.lang,'',_subAct(c.lang),`NV._setSub('${c.lang}')`,'')} );
html+=`</div></div>`;
body.innerHTML=html;
return;
}else if(ST.fsOvTab==='chapters'){
if(!chs.length){body.innerHTML='<p style="padding:28px 20px;color:rgba(255,255,255,.35);font-size:14px;text-align:center">No chapters available</p>';return;}
chs.forEach((ch,i)=>{const next=chs[i+1];const cur=el.vid&&el.vid.currentTime>=ch.t&&(!next||el.vid.currentTime<next.t);body.insertAdjacentHTML('beforeend',`<div class="nfsov-item-ch${cur?' act':''}" onclick="NV._seekTo(${ch.t})"><div class="nfsov-ch-dot"></div><span class="nfsov-ch-time">${fT(ch.t)}</span><span class="nfsov-ch-lbl">${ch.title}</span></div>`);});
}else if(ST.fsOvTab==='speed'){
CFG.speeds.forEach(v=>{body.insertAdjacentHTML('beforeend',_fsItem(v+'×','',v===ST.spd,`NV._fsSetSpd(${v})`,''));});
}
}
function _fsItem(lbl,sub,act,onclick,badge){
return`<div class="nfsov-item${act?' act':''}" onclick="${onclick}"><div class="nfsov-item-check">${IC.check}</div><div class="nfsov-item-texts"><span class="nfsov-item-lbl">${lbl}</span>${sub?`<span class="nfsov-item-sub">${sub}</span>`:''}</div></div>`;
}
const _noSub=()=>!el.vid||Array.from(el.vid.textTracks||[]).every(t=>t.mode!=='showing');
const _subAct=l=>!!(el.vid&&Array.from(el.vid.textTracks||[]).find(t=>t.srclang===l&&t.mode==='showing'));

/* ===== Playlist overlay ===== */
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
tabs.innerHTML=['watchnext','episodes'].map(t=>`<div class="nfspl-tab${_fsplCurTab===t?' act':''}" onclick="NV._fsplSetTab('${t}')">${t==='watchnext'?'Watch Next':'Episodes'}</div>`).join('');
}
function _renderFsplBody(){
const body=g('nfspl-body');if(!body)return;
body.innerHTML='';
if(_fsplCurTab==='watchnext'){
const cw=D.getContinueWatching().filter(x=>x.show.id!==_sid).slice(0,14);
const row=document.createElement('div');row.className='nfspl-eprow';
cw.forEach(({show:s,ep,pct})=>{
const mv=!!s.isMovie;
row.innerHTML+=`<div class="nfspl-ep" onclick="NV._fsplPlay('${s.id}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||s.thumb||''}" loading="lazy"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${s.title}</div><div class="nfspl-ep-meta">${mv?ep.dur:`S${ep.s} E${ep.e}`}</div></div>`;
});
if(!cw.length)row.innerHTML='<p style="padding:24px 16px;color:rgba(255,255,255,.35);font-size:14px">Nothing in progress</p>';
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
row.innerHTML+=`<div class="nfspl-ep${act?' act':''}" onclick="NV._fsplPlay('${_sid}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||''}" loading="lazy"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${ep.title}</div><div class="nfspl-ep-meta">S${ep.s} E${ep.e} · ${ep.date} · ${ep.dur}</div><div class="nfspl-ep-desc">${ep.desc||''}</div></div>`;
});
body.appendChild(row);
}
}

/* ===== helpers ===== */
function tPlay(){if(!el.vid)return;if(ST.ended){el.vid.currentTime=0;el.vid.play();ST.ended=false;}else{el.vid.paused?el.vid.play():el.vid.pause();}}
function seek(d){if(!el.vid)return;el.vid.currentTime=Math.max(0,Math.min(el.vid.duration||0,el.vid.currentTime+d));nudge((d>0?'+':'')+d+'s',d>0?'r':'l');}
function adjSpd(dir){const idx=CFG.speeds.indexOf(ST.spd),ni=Math.max(0,Math.min(CFG.speeds.length-1,idx+dir));_fsSetSpd(CFG.speeds[ni]);}
function setVol(v){if(!el.vid)return;ST.vol=Math.max(0,Math.min(1,v));el.vid.volume=ST.vol;ST.muted=ST.vol===0;el.vid.muted=ST.muted;_showGst('vol');}
function tMute(){if(!el.vid)return;ST.muted=!ST.muted;el.vid.muted=ST.muted;}
function _fsSetSpd(v){if(!el.vid)return;ST.spd=v;el.vid.playbackRate=v;const b=g('nspd-lbl');if(b)b.textContent=v+'x';sysMsg(v+'× speed');}
function _setQual(q){loadTrk(ST.lang,q,true);_renderFsOvBody();}
function _setLang(l){loadTrk(l,ST.qual,true);_renderFsOvBody();}
function _setSub(lang){if(!el.vid)return;Array.from(el.vid.textTracks).forEach(t=>t.mode='hidden');if(lang){const trk=Array.from(el.vid.textTracks).find(t=>t.srclang===lang);if(trk)trk.mode='showing';}_renderFsOvBody();}
function _seekTo(t){if(el.vid)el.vid.currentTime=t;closeFsOv();}
function _fsplSetTab(t){_fsplCurTab=t;_renderFsplTabs();_renderFsplBody();}
function _fsplSetSeason(s){_fsplCurSeason=s;_renderFsplBody();}
function _fsplPlay(sid,eid){closeFspl();R.ep(sid,eid);}

function _showGst(type){
const v=type==='vol'?ST.vol:ST.bright;
const pct=Math.round(v*100);
const fill=g(type==='vol'?'ng-right-fill':'ng-left-fill');
if(fill)fill.style.height=pct+'%';
const toast=g('ng-toast');
if(toast){
toast.innerHTML=(type==='vol'?IC.volumeUp:IC.brightness)+`<span>${pct}%</span>`;
toast.classList.add('ns');
clearTimeout(ST.gtTmr);ST.gtTmr=setTimeout(()=>{if(toast)toast.classList.remove('ns');},1400);
}
}

function sFrac(f){const d=el.vid&&el.vid.duration;if(isFinite(d))el.vid.currentTime=Math.max(0,Math.min(d,f*d));}
function fFrac(e){const sw=g('nsw');if(!sw)return 0;const r=sw.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}

/* ===== tick ===== */
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

/* ===== track loading ===== */
function loadTrk(lk,qk,resume){
const tr=(_ep&&_ep.tracks)||{};const langs=Object.keys(tr);if(!langs.length)return;
if(!langs.includes(lk))lk=langs[0];ST.lang=lk;
const quals=Object.keys(tr[lk]||{});if(!quals.includes(qk))qk=quals[0]||qk;ST.qual=qk;
const src=tr[lk][qk],ct=resume&&el.vid?el.vid.currentTime:0,wp=el.vid&&!el.vid.paused;
if(!el.vid)return;
el.vid.src=src;el.vid.load();el.vid.currentTime=ct;ST.ended=false;
if(wp&&resume)el.vid.play().catch(()=>{});
const nth=g('nth');if(nth){nth.src=_ep.thumb||'';nth.style.display='block';}
const fst=g('nct-title-main');if(fst)fst.textContent=_show.title||'';
const fstsub=g('nct-title-sub');if(fstsub)fstsub.textContent=_ep.title||'';
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

/* ===== network ===== */
function _netSetup(){
const v=el.vid;if(!v)return;
let _wasPlaying=false;
window.addEventListener('offline',()=>{ST.netOk=false;_wasPlaying=ST.playing;sysMsg('No connection',true);});
window.addEventListener('online',()=>{
ST.netOk=true;clearSysMsg();
if(_wasPlaying){const pos=v.currentTime;v.src=v.src;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;v.play().catch(()=>{});},{once:true});sysMsg('Reconnected');}
});
v.addEventListener('error',()=>{if(ST.netOk){sysMsg('Playback error — retrying',true);setTimeout(()=>{const pos=v.currentTime;v.src=v.src;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;if(ST.playing)v.play().catch(()=>{});},{once:true});},2000);}});
}

/* ===== peek row ===== */
function _buildPeek(){
const peek=g('nbpeek');if(!peek)return;
peek.innerHTML='';
_pl.forEach(ep=>{
const pct=D.getProgress(_sid,ep.id),act=ep.id===_eid;
const d=document.createElement('div');d.className='nbpeek-ep'+(act?' act':'');
d.innerHTML=`<img class="nbpeek-ep-img" src="${ep.thumb||''}" loading="lazy">`;
d.onclick=()=>R.ep(_sid,ep.id);
peek.appendChild(d);
});
}

/* ===== bind events ===== */
function bndEvt(){
const v=el.vid;
v.addEventListener('play',()=>{ST.started=true;ST.playing=true;ST.ended=false;const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;const nth=g('nth');if(nth)nth.style.display='none';showUI();const sp=g('nsp');if(sp)sp.classList.remove('ns');});
v.addEventListener('pause',()=>{ST.playing=false;if(!ST.ended){const cp=g('npl2');if(cp)cp.innerHTML=IC.play;}showUI();const sp=g('nsp');if(sp)sp.classList.remove('ns');});
v.addEventListener('ended',()=>{
try{localStorage.removeItem(_lsKey(_sid,_eid));}catch{}
const i=_pl.findIndex(x=>x.id===_eid);
if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);
else{ST.playing=false;ST.ended=true;const cp=g('npl2');if(cp)cp.innerHTML=IC.replay;showUI();}
});
v.addEventListener('waiting',()=>{const sp=g('nsp');if(sp)sp.classList.add('ns');});
v.addEventListener('canplay',()=>{const sp=g('nsp');if(sp)sp.classList.remove('ns');_drawChDots();});
v.addEventListener('loadedmetadata',()=>{
tick();const rt=_loadPos();
if(rt>2&&rt<(v.duration-5)){v.currentTime=rt;sysMsg('Resumed '+fT(rt));v.play().catch(()=>{});}
});
v.addEventListener('durationchange',_drawChDots);

// play/pause btn
const cp=g('npl2');if(cp)cp.onclick=e=>{e.stopPropagation();tPlay();};
// seek btns (non-FS)
const skm=g('nsk10m'),skp=g('nsk10p');
if(skm)skm.onclick=e=>{e.stopPropagation();seek(-CFG.skip);};
if(skp)skp.onclick=e=>{e.stopPropagation();seek(CFG.skip);};
// fs toggle
const fsBtn=g('nfs-btn');if(fsBtn)fsBtn.onclick=e=>{e.stopPropagation();el.root&&el.root.requestFullscreen();};
const fsExit=g('nfs-exit');if(fsExit)fsExit.onclick=e=>{e.stopPropagation();document.exitFullscreen();};
// settings
const setBtn=g('nset');if(setBtn)setBtn.onclick=e=>{e.stopPropagation();openFsOv('quality');};
// screenshot placeholder
const ssBtn=g('nss');if(ssBtn)ssBtn.onclick=e=>{e.stopPropagation();sysMsg('Screenshot saved');};
// FS bottom btns
const wnBtn=g('nwn'),epBtn=g('nep'),nxBtn=g('nnx'),spdBtn=g('nspd');
if(wnBtn)wnBtn.onclick=e=>{e.stopPropagation();openFspl('watchnext');};
if(epBtn)epBtn.onclick=e=>{e.stopPropagation();openFspl('episodes');};
if(nxBtn)nxBtn.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);};
if(spdBtn)spdBtn.onclick=e=>{e.stopPropagation();openFsOv('speed');};
// overlay close btns
const fsovc=g('nfsov-close-btn');if(fsovc)fsovc.onclick=e=>{e.stopPropagation();closeFsOv();};
const fsplc=g('nfspl-close-btn');if(fsplc)fsplc.onclick=e=>{e.stopPropagation();closeFspl();};
// seekbar
const sw=g('nsw');
if(sw){
const ss=e=>{ST.drag=true;sFrac(fFrac(e));e.stopPropagation();};
const sm=e=>{if(ST.drag){sFrac(fFrac(e));tick();}};
const se=()=>{ST.drag=false;};
sw.addEventListener('mousedown',ss);sw.addEventListener('touchstart',ss,{passive:true});
document.addEventListener('mousemove',sm);
document.addEventListener('touchmove',e=>{if(ST.drag)sm(e);},{passive:true});
document.addEventListener('mouseup',se);document.addEventListener('touchend',se);
sw.addEventListener('mousemove',e=>{const f=fFrac(e);const sh=g('nsh');if(sh){sh.textContent=fT(f*(v.duration||0));sh.style.left=(f*100)+'%';sh.style.opacity='1';}});
sw.addEventListener('mouseleave',()=>{const sh=g('nsh');if(sh)sh.style.opacity='0';});
}
// overlay click / tap
const ov=g('nov');
if(ov){
ov.addEventListener('click',e=>{
if(e.target.closest('#nb')||e.target.closest('#nct')||e.target.closest('#ncc'))return;
if(ST.fsOvOpen)return;
if(!ST.started){tPlay();return;}
ST.uiFull?hideUI():showUI();
});
// escalating tap seek
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
_td.tmr=setTimeout(()=>{_td={side:'',cnt:0,tmr:null,lastT:0};},550);
}else{
clearTimeout(_td.tmr);_td={side,cnt:1,tmr:null,lastT:now};
_td.tmr=setTimeout(()=>{if(_td.side==='c'){if(!ST.started)tPlay();else ST.uiFull?hideUI():showUI();}_td={side:'',cnt:0,tmr:null,lastT:0};},CFG.tapMs+80);
}
clearTimeout(ST.holdTmr);
ST.holdTmr=setTimeout(()=>{if(!v.paused){v.playbackRate=CFG.holdSpd;sysMsg('2× speed',true);}},CFG.holdDly);
},{passive:true});
ov.addEventListener('touchend',()=>{clearTimeout(ST.holdTmr);if(v.playbackRate===CFG.holdSpd&&ST.spd!==CFG.holdSpd){v.playbackRate=ST.spd;clearSysMsg();}},{passive:true});
}
// gesture strips (volume / brightness)
['ng-left','ng-right'].forEach(id=>{
const strip=g(id);if(!strip)return;
const isLeft=id==='ng-left';let sy=0,sv=0;
strip.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sv=isLeft?ST.bright:ST.vol;e.stopPropagation();},{passive:true});
strip.addEventListener('touchmove',e=>{
const dy=sy-e.touches[0].clientY,delta=dy/100,nv=Math.max(0,Math.min(1,sv+delta));
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
});
// click outside closes overlays
document.addEventListener('click',e=>{
const fsov=g('nfsov');if(fsov&&fsov.classList.contains('on')&&!fsov.contains(e.target)&&e.target!==g('nset'))closeFsOv();
const fspl=g('nfspl');if(fspl&&fspl.classList.contains('on')&&!fspl.contains(e.target)&&e.target!==g('nwn')&&e.target!==g('nep'))closeFspl();
});
// set gesture icons
const gbi=g('ng-bright-icon');if(gbi)gbi.innerHTML=IC.brightness;
const gvi=g('ng-vol-icon');if(gvi)gvi.innerHTML=IC.volumeUp;
_netSetup();
}

return{
init(sid,eid,show,ep){
injectCSS();_sid=sid;_eid=eid;_show=show;_ep=ep;_pl=show.episodes||[];
_fsplCurSeason=(ep&&ep.s)||1;
ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,fs:false,netOk:true,sysTmr:null,gtTmr:null};
el={root:g('nr'),vid:g('nvid'),ct:g('nct'),bot:g('nb'),cc:g('ncc'),sh2:g('nsh2'),nul:g('nnl'),nur:g('nnr'),ngrfFill:g('ng-right-fill'),nglfFill:g('ng-left-fill')};
const cp=g('npl2');if(cp)cp.innerHTML=IC.play;
if(ep.tracks){
const pref=_loadPref();const langs=Object.keys(ep.tracks);
const fl=pref&&langs.includes(pref.lang)?pref.lang:langs[0];
const qs=Object.keys(ep.tracks[fl]||{});const fq=pref&&qs.includes(pref.qual)?pref.qual:qs[0];
loadTrk(fl,fq,false);
}
bndEvt();
_buildPeek();
const spdb=g('nspd-lbl');if(spdb)spdb.textContent='1x';
if(el.root)el.root.focus();
if(ST.raf)cancelAnimationFrame(ST.raf);tick();
// build settings tabs
const fsoHd=g('nfsov-hd');
if(fsoHd){
const tabs=['quality','audio & subtitles','playback speed','chapters'];
const tabKeys=['quality','subtitles','speed','chapters'];
fsoHd.innerHTML=tabs.map((t,i)=>`<div class="nfsov-tab" data-tab="${tabKeys[i]}" onclick="NV._fsOvTabClick('${tabKeys[i]}')">${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('')
+`<button class="nb nfsov-tab" id="nfsov-close-btn" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:20px">${IC.close}</button>`;
}
},
destroy(){if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;clearTimeout(ST.uiTmr);clearTimeout(ST.holdTmr);if(el.vid){el.vid.pause();el.vid.src='';}if(document.fullscreenElement)document.exitFullscreen();el={};},
_tPlay:tPlay,_showUI:showUI,_hideUI:hideUI,
_seek:seek,_adjSpd:adjSpd,_setVol:setVol,_tMute:tMute,
_getVol:()=>ST.vol,_getSpd:()=>ST.spd,_isPlaying:()=>ST.playing,
_seekTo:_seekTo,_setQual:_setQual,_setLang:_setLang,_setSub:_setSub,_fsSetSpd:_fsSetSpd,
_fsOvTabClick:(t)=>{_setFsOvTab(t);},
_fsplSetTab:_fsplSetTab,_fsplSetSeason:_fsplSetSeason,_fsplPlay:_fsplPlay,
openFsOv:openFsOv,closeFsOv:closeFsOv,openFspl:openFspl,closeFspl:closeFspl
};
})();