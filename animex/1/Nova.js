const NV=(()=>{
'use strict';
const CFG={skip:10,holdSpd:2,holdDly:500,uiHide:4e3,tapMs:320,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};
let ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',lastTap:0,tapCnt:0,tapSide:'',tapTmr:null,drag:false,raf:null,holdTmr:null,fs:false,netOk:true,netTmr:null,gestDrag:null};
let _sid=null,_eid=null,_show=null,_ep=null,_pl=[];
let _si=false;
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
.xsc::-webkit-scrollbar{width:5px}.xsc::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:10px}
#nr{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;user-select:none;outline:none;-webkit-user-select:none}
#nr.nrfs{position:fixed;inset:0;width:100%;height:100%;aspect-ratio:unset;border-radius:0;z-index:10000}
#nvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#nth{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;pointer-events:none}
#nov{position:absolute;inset:0;z-index:2;cursor:pointer}
#nov::before,#nov::after{content:'';position:absolute;left:0;right:0;height:45%;opacity:0;transition:opacity .3s;pointer-events:none}
#nov::before{top:0;background:linear-gradient(to bottom,rgba(0,0,0,.65),transparent)}
#nov::after{bottom:0;background:linear-gradient(to top,rgba(0,0,0,.85),transparent)}
#nct.nv~#nov::before,#nct.nv~#nov::after,#nb.nv~#nov::before{opacity:1}
/* spinner */
#nsp{position:absolute;top:50%;left:50%;z-index:10;width:48px;height:48px;margin:-24px;border:3px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s}
#nsp.ns{opacity:1;animation:nspn .75s linear infinite}
@keyframes nspn{to{transform:rotate(360deg)}}
/* network / nudge toast — shared slot */
#nsh2{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.78);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:99px;opacity:0;pointer-events:none;z-index:16;transition:opacity .25s;white-space:nowrap;text-align:center;max-width:240px}
#nsh2.ns{opacity:1}
/* seek nudge labels */
#nn,#nnl,#nnr{position:absolute;top:50%;transform:translate(-50%,-50%);color:#fff;font-size:16px;font-weight:800;padding:10px 22px;border-radius:99px;background:rgba(0,0,0,.65);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);opacity:0;pointer-events:none;z-index:16;white-space:nowrap}
#nn{left:50%}#nnl{left:22%}#nnr{left:78%}
.snp{animation:snp .65s cubic-bezier(.4,0,.2,1) forwards}
@keyframes snp{0%{opacity:1;transform:translate(-50%,-50%) scale(.85)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-68%) scale(1)}}
/* thumbnail on hover seek */
#nsh{position:absolute;bottom:calc(100% + 8px);background:rgba(0,0,0,.88);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap;z-index:25}
/* ---- TOP BAR (shared) ---- */
#nct{position:absolute;top:0;left:0;right:0;z-index:20;padding:12px 14px;display:flex;align-items:center;gap:8px;opacity:0;transform:translateY(-8px);transition:opacity .28s,transform .28s;pointer-events:none}
#nct.nv{opacity:1;transform:none;pointer-events:auto}
#nctl{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
#nctr{display:flex;align-items:center;gap:6px}
/* title — only in fullscreen */
#nfst{font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none;flex:1}
#nr.nrfs #nfst{display:block}
/* centre controls (non-FS) — seek-10 play seek+10 */
#ncc{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:14px;z-index:20;opacity:0;pointer-events:none;transition:opacity .28s}
#ncc.nv{opacity:1;pointer-events:auto}
/* in FS centre controls are hidden — gestures handle seeks */
#nr.nrfs #ncc{display:none}
/* ---- BOTTOM BAR ---- */
#nb{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0 14px 10px;display:flex;flex-direction:column;gap:0;opacity:0;transform:translateY(8px);transition:opacity .28s,transform .28s;pointer-events:none}
#nb.nv{opacity:1;transform:none;pointer-events:auto}
/* non-FS: seekbar + time-remaining only */
#nbrow-seek{display:flex;align-items:center;gap:8px;width:100%}
#nsw{flex:1;padding:10px 0 4px;cursor:pointer;touch-action:none}
#nst{position:relative;height:4px;background:rgba(255,255,255,.22);border-radius:99px;transition:height .18s}
#nsw:hover #nst,#nsw:active #nst{height:6px}
#nsbuf,#nsf{position:absolute;inset:0;height:100%;border-radius:99px;pointer-events:none}
#nsbuf{background:rgba(255,255,255,.45)}
#nsf{background:#fff}
#nsth{position:absolute;top:50%;left:0;width:14px;height:14px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .18s;pointer-events:none;box-shadow:0 0 6px rgba(0,0,0,.6)}
#nsw:hover #nsth,#nsw:active #nsth{transform:translate(-50%,-50%) scale(1)}
#ntm{font-size:11px;font-weight:700;color:rgba(255,255,255,.85);white-space:nowrap;font-variant-numeric:tabular-nums;flex-shrink:0}
/* FS-only bottom row */
#nbrow-fs{display:none;justify-content:space-between;align-items:center;margin-top:6px}
#nr.nrfs #nbrow-fs{display:flex}
/* non-FS fullscreen button is in top-right */
#nfs-inline{display:flex}
#nr.nrfs #nfs-inline{display:none}
/* FS settings & exit in top-right */
#nct-fsr{display:none;align-items:center;gap:6px}
#nr.nrfs #nct-fsr{display:flex}
/* gesture strips */
#ng-left,#ng-right{position:absolute;top:0;bottom:0;width:18%;z-index:3;display:none;flex-direction:column;justify-content:center;align-items:center}
#nr.nrfs #ng-left,#nr.nrfs #ng-right{display:flex}
#ng-left{left:0}
#ng-right{right:0}
.ng-track{width:4px;height:40%;background:rgba(255,255,255,.15);border-radius:99px;position:relative;overflow:visible}
.ng-fill{position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,.7);border-radius:99px;transition:height .08s}
.ng-icon{font-size:11px;font-weight:700;color:rgba(255,255,255,.7);margin-top:6px}
/* FS settings overlay */
#nfsov{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.78);backdrop-filter:blur(20px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s;overflow:hidden}
#nfsov.on{opacity:1;pointer-events:auto}
#nfsov-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.1);overflow-x:auto;flex-shrink:0;scrollbar-width:none}
#nfsov-tabs::-webkit-scrollbar{display:none}
.nfsov-tab{padding:13px 18px;font-size:12px;font-weight:700;color:rgba(255,255,255,.45);white-space:nowrap;cursor:pointer;border-bottom:2px solid transparent;transition:color .18s,border-color .18s;flex-shrink:0}
.nfsov-tab.act{color:#fff;border-bottom-color:#fff}
#nfsov-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;scrollbar-width:none}
#nfsov-body::-webkit-scrollbar{display:none}
.nfsov-item{display:flex;align-items:center;gap:10px;padding:13px 20px;cursor:pointer;transition:background .18s;border-radius:0}
.nfsov-item:hover{background:rgba(255,255,255,.06)}
.nfsov-item.act{background:rgba(255,255,255,.08)}
.nfsov-item .nfsov-dot{width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,.4);flex-shrink:0;transition:background .18s,border-color .18s}
.nfsov-item.act .nfsov-dot{background:#fff;border-color:#fff}
.nfsov-item-lbl{font-size:14px;font-weight:600;color:rgba(255,255,255,.75);flex:1}
.nfsov-item.act .nfsov-item-lbl{color:#fff}
.nfsov-ch-time{font-size:11px;color:rgba(255,255,255,.4);font-variant-numeric:tabular-nums;flex-shrink:0}
#nfsov-close{position:absolute;top:10px;right:12px;z-index:51}
/* FS playlist overlay (watch next + episodes) */
#nfspl{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.82);backdrop-filter:blur(20px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s;overflow:hidden}
#nfspl.on{opacity:1;pointer-events:auto}
#nfspl-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}
.nfspl-tab{padding:13px 20px;font-size:13px;font-weight:700;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2px solid transparent;transition:color .18s,border-color .18s}
.nfspl-tab.act{color:#fff;border-bottom-color:#fff}
#nfspl-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
#nfspl-body::-webkit-scrollbar{display:none}
#nfspl-seasons{display:flex;overflow-x:auto;padding:8px 14px 0;gap:8px;flex-shrink:0;scrollbar-width:none}
#nfspl-seasons::-webkit-scrollbar{display:none}
.nfspl-stab{padding:6px 14px;border-radius:99px;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.15);cursor:pointer;white-space:nowrap;transition:all .18s;flex-shrink:0}
.nfspl-stab.act{color:#fff;border-color:#fff;background:rgba(255,255,255,.1)}
.nfspl-eprow{display:flex;overflow-x:auto;padding:14px 14px 8px;gap:12px;scrollbar-width:none}
.nfspl-eprow::-webkit-scrollbar{display:none}
.nfspl-ep{flex-shrink:0;width:clamp(130px,28vw,180px);cursor:pointer}
.nfspl-ep-tw{position:relative;border-radius:8px;overflow:hidden;background:#111;aspect-ratio:16/9}
.nfspl-ep-tw img{width:100%;height:100%;object-fit:cover;transition:transform .2s}
.nfspl-ep:hover .nfspl-ep-tw img{transform:scale(1.04)}
.nfspl-ep-pb{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.12)}
.nfspl-ep-pbf{height:100%;background:linear-gradient(90deg,#6c63ff,#ec4899)}
.nfspl-ep-act .nfspl-ep-tw{box-shadow:0 0 0 2px #fff}
.nfspl-ep-title{font-size:11px;font-weight:600;color:rgba(255,255,255,.85);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nfspl-ep-meta{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px}
#nfspl-close{position:absolute;top:10px;right:12px;z-index:51}
/* nb buttons */
.nb{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:#f0f0f8;cursor:pointer;transition:background .18s,transform .1s;flex-shrink:0}
.nb:hover{background:rgba(255,255,255,.1)}.nb:active{transform:scale(.86)}
.nb svg{width:20px;height:20px;pointer-events:none}
#npl2{background:rgba(255,255,255,.12);width:52px;height:52px;border-radius:50%}
#npl2 svg{width:28px;height:28px}
.nb-sm{width:32px;height:32px}.nb-sm svg{width:18px;height:18px}
.nbl{padding:0 12px;border-radius:99px;height:32px;font-size:11px;font-weight:700;gap:5px;width:auto}
.nbl svg{width:15px;height:15px}
/* seek label on seek buttons */
.nb-seek{position:relative;flex-direction:column;gap:1px;width:40px;height:40px}
.nb-seek svg{width:20px;height:20px}
.nb-seek-lbl{font-size:9px;font-weight:800;color:rgba(255,255,255,.7);line-height:1;position:absolute;bottom:4px}
/* volume / brightness popup (gesture result) */
#ng-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.72);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:700;padding:6px 16px;border-radius:99px;opacity:0;pointer-events:none;z-index:17;transition:opacity .2s;white-space:nowrap;display:none}
#nr.nrfs #ng-toast{display:flex;align-items:center;gap:8px}
#ng-toast.ns{opacity:1}
/* side panel (episodes list, non-FS) */
#npp{position:absolute;right:0;top:0;bottom:0;width:min(300px,82%);z-index:40;background:rgba(6,6,12,.97);backdrop-filter:blur(24px);border-left:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s}
#npp.no{transform:none}
#npph{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;font-size:14px;font-weight:700;color:#fff;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}
#nppls{list-style:none;overflow-y:auto;flex:1;padding:4px 0;scrollbar-width:none}
#nppls::-webkit-scrollbar{display:none}
.nppi{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;transition:background .18s}
.nppi:hover{background:rgba(255,255,255,.05)}
.nppi.na{background:rgba(255,255,255,.09);border-left:3px solid #fff}
.npit{width:80px;height:45px;border-radius:6px;overflow:hidden;background:#111;flex-shrink:0}
.npit img{width:100%;height:100%;object-fit:cover}
.npim{display:flex;flex-direction:column;gap:2px;overflow:hidden;flex:1}
.npin{font-size:12px;font-weight:600;color:#f0f0f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.npis{font-size:10px;color:rgba(240,240,248,.5)}
.npich{font-size:10px;color:rgba(240,240,248,.38);font-variant-numeric:tabular-nums}
video::cue{font-size:1.05em;background:rgba(0,0,0,.76);color:#fff;border-radius:3px;padding:2px 5px}
@media(max-width:420px){#npl2{width:46px;height:46px}.nb-seek{width:36px;height:36px}.nb{width:32px;height:32px}.nb svg{width:17px;height:17px}}`;
document.head.appendChild(s);
}
const g=id=>document.getElementById(id);
function glk(){return{
root:g('nr'),vid:g('nvid'),ov:g('nov'),cp:g('npl2'),th:g('nth'),
ct:g('nct'),bot:g('nb'),cc:g('ncc'),
st:g('nst'),sf:g('nsf'),sbuf:g('nsbuf'),sth:g('nsth'),sh:g('nsh'),
tm:g('ntm'),
fst:g('nfst'),
fsBtn:g('nfs-inline'),fsExit:g('nfs-exit'),settBtn:g('nset'),
nu:g('nn'),nul:g('nnl'),nur:g('nnr'),
spin:g('nsp'),sh2:g('nsh2'),
ngt:g('ng-toast'),
plp:g('npp'),pll:g('nppls'),
sk10m:g('nsk10m'),sk10p:g('nsk10p'),
fsov:g('nfsov'),
fspl:g('nfspl'),
plbFs:g('nplb-fs'),wNbFs:g('nwnb-fs'),
nglf:g('ng-left'),ngrf:g('ng-right'),
nglfFill:g('ng-left-fill'),ngrfFill:g('ng-right-fill')
};}
let el={},_nt=null;
const fT=t=>{if(!isFinite(t))return'0:00';const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const fRem=t=>{if(!el.vid)return'0:00';const r=(el.vid.duration||0)-t;return r>0?'-'+fT(r):'0:00';};
function nudge(txt,side){const t=side==='l'?el.nul:side==='r'?el.nur:el.nu;if(!t)return;t.textContent=txt;t.classList.remove('snp');void t.offsetWidth;t.classList.add('snp');clearTimeout(_nt);_nt=setTimeout(()=>[el.nu,el.nul,el.nur].forEach(x=>x&&x.classList.remove('snp')),700);}
function sysMsg(msg,persist){if(!el.sh2)return;el.sh2.innerHTML=msg;el.sh2.classList.add('ns');if(!persist){clearTimeout(ST.sysTmr);ST.sysTmr=setTimeout(()=>el.sh2&&el.sh2.classList.remove('ns'),2200);}}
function clearSysMsg(){if(el.sh2)el.sh2.classList.remove('ns');}
function showUI(){if(!ST.started)return;ST.uiFull=true;el.bot&&el.bot.classList.add('nv');el.ct&&el.ct.classList.add('nv');el.cc&&el.cc.classList.add('nv');hiTmr();}
function hideUI(){if(!ST.started)return;if(ST.fsOvOpen)return;ST.uiFull=false;el.bot&&el.bot.classList.remove('nv');el.ct&&el.ct.classList.remove('nv');el.cc&&el.cc.classList.remove('nv');}
function hiTmr(){clearTimeout(ST.uiTmr);if(ST.playing&&!ST.fsOvOpen)ST.uiTmr=setTimeout(hideUI,CFG.uiHide);}
/* ---- settings overlay ---- */
function openFsOv(tab){if(!el.fsov)return;ST.fsOvOpen=true;ST.fsOvTab=tab||'quality';clearTimeout(ST.uiTmr);if(el.vid&&ST.playing){el.vid.pause();}el.fsov.classList.add('on');renderFsOvTabs();renderFsOvBody();}
function closeFsOv(){if(!el.fsov)return;ST.fsOvOpen=false;el.fsov.classList.remove('on');if(el.vid)el.vid.play().catch(()=>{});showUI();}
function renderFsOvTabs(){const fsov=el.fsov;if(!fsov)return;const tabs=fsov.querySelector('#nfsov-tabs');if(!tabs)return;const list=['quality','language','subtitles','chapters','speed'];tabs.innerHTML=list.map(t=>`<div class="nfsov-tab${ST.fsOvTab===t?' act':''}" onclick="NV._fsOvTab('${t}')">${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('');}
function renderFsOvBody(){const body=g('nfsov-body');if(!body)return;const tr=(_ep&&_ep.tracks)||{};const caps=(_ep&&_ep.captions)||[];const chs=(_ep&&_ep.chapters)||[];const spds=CFG.speeds;body.innerHTML='';
if(ST.fsOvTab==='quality'){const langs=Object.keys(tr);const qs=langs.length?Object.keys(tr[ST.lang]||tr[langs[0]]):[]; qs.forEach(q=>{const act=q===ST.qual;body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${act?' act':''}" onclick="NV._setQual('${q}')"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">${q}</span></div>`);});}
else if(ST.fsOvTab==='language'){const langs=Object.keys(tr);langs.forEach(lk=>{const act=lk===ST.lang;body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${act?' act':''}" onclick="NV._setLang('${lk}')"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">${D.langLabels[lk]||lk.toUpperCase()}</span></div>`);});}
else if(ST.fsOvTab==='subtitles'){body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${!caps.length||_noSub()?' act':''}" onclick="NV._setSub(null)"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">Off</span></div>`);caps.forEach(c=>{const act=_subAct(c.lang);body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${act?' act':''}" onclick="NV._setSub('${c.lang}')"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">${c.label||c.lang}</span></div>`);});}
else if(ST.fsOvTab==='chapters'){if(!chs.length){body.innerHTML='<p style="padding:24px 20px;color:rgba(255,255,255,.35);font-size:13px;text-align:center">No chapters</p>';return;}chs.forEach((ch,i)=>{const next=chs[i+1];const cur=el.vid&&el.vid.currentTime>=ch.t&&(!next||el.vid.currentTime<next.t);body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${cur?' act':''}" onclick="NV._seekTo(${ch.t})"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">${ch.title}</span><span class="nfsov-ch-time">${fT(ch.t)}</span></div>`);});}
else if(ST.fsOvTab==='speed'){spds.forEach(v=>{const act=v===ST.spd;body.insertAdjacentHTML('beforeend',`<div class="nfsov-item${act?' act':''}" onclick="NV._fsSetSpd(${v})"><div class="nfsov-dot"></div><span class="nfsov-item-lbl">${v}×</span></div>`);});}}
const _noSub=()=>!el.vid||Array.from(el.vid.textTracks||[]).every(t=>t.mode!=='showing');
const _subAct=lang=>el.vid&&Array.from(el.vid.textTracks||[]).some(t=>t.srclang===lang&&t.mode==='showing');
/* ---- fs playlist overlay ---- */
let _fsplTab='episodes',_fsplSeason=1;
function openFspl(tab){if(!el.fspl)return;ST.fsOvOpen=true;_fsplTab=tab||'episodes';clearTimeout(ST.uiTmr);if(el.vid&&ST.playing)el.vid.pause();el.fspl.classList.add('on');renderFsplTabs();renderFsplBody();}
function closeFspl(){if(!el.fspl)return;ST.fsOvOpen=false;el.fspl.classList.remove('on');if(el.vid)el.vid.play().catch(()=>{});showUI();}
function renderFsplTabs(){const tabs=g('nfspl-tabs');if(!tabs)return;tabs.innerHTML=['watchnext','episodes'].map(t=>`<div class="nfspl-tab${_fsplTab===t?' act':''}" onclick="NV._fsplTab('${t}')">${t==='watchnext'?'Watch Next':'Episodes'}</div>`).join('');}
function renderFsplBody(){const body=g('nfspl-body');if(!body)return;body.innerHTML='';
if(_fsplTab==='watchnext'){const cw=D.getContinueWatching().filter(x=>x.show.id!==_sid).slice(0,12);const row=document.createElement('div');row.className='nfspl-eprow';cw.forEach(({show:s,ep,pct})=>{const mv=!!s.isMovie;row.innerHTML+=`<div class="nfspl-ep" onclick="NV._fsplPlay('${s.id}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||s.thumb||''}" loading="lazy"><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${s.title}</div><div class="nfspl-ep-meta">${mv?ep.dur:`S${ep.s} E${ep.e}`}</div></div>`;});if(!cw.length)row.innerHTML='<p style="padding:20px;color:rgba(255,255,255,.35);font-size:13px">Nothing in progress</p>';body.appendChild(row);}
else{const s=D.getShow(_sid);if(!s)return;const seasons=[...new Set(s.episodes.map(e=>e.s))];if(seasons.length>1){const stabs=document.createElement('div');stabs.id='nfspl-seasons';seasons.forEach(sn=>{stabs.innerHTML+=`<div class="nfspl-stab${sn===_fsplSeason?' act':''}" onclick="NV._fsplSeason(${sn})">${`S${sn}`}</div>`;});body.appendChild(stabs);}const row=document.createElement('div');row.className='nfspl-eprow';s.episodes.filter(e=>e.s===_fsplSeason).forEach(ep=>{const pct=D.getProgress(_sid,ep.id),act=ep.id===_eid;row.innerHTML+=`<div class="nfspl-ep${act?' nfspl-ep-act':''}" onclick="NV._fsplPlay('${_sid}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||''}" loading="lazy"><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${ep.title}</div><div class="nfspl-ep-meta">S${ep.s} E${ep.e} · ${ep.dur}</div></div>`;});body.appendChild(row);}}
/* ---- misc helpers ---- */
function tPlay(){if(!el.vid)return;if(ST.ended){el.vid.currentTime=0;el.vid.play();ST.ended=false;}else{el.vid.paused?el.vid.play():el.vid.pause();}}
function seek(d){if(!el.vid)return;el.vid.currentTime=Math.max(0,Math.min(el.vid.duration||0,el.vid.currentTime+d));nudge((d>0?'+':'')+d+'s',d>0?'r':'l');}
function adjSpd(dir){const idx=CFG.speeds.indexOf(ST.spd),ni=Math.max(0,Math.min(CFG.speeds.length-1,idx+dir));_fsSetSpd(CFG.speeds[ni]);}
function setVol(v){if(!el.vid)return;ST.vol=Math.max(0,Math.min(1,v));el.vid.volume=ST.vol;ST.muted=ST.vol===0;el.vid.muted=ST.muted;_showGesture('vol');}
function tMute(){if(!el.vid)return;ST.muted=!ST.muted;el.vid.muted=ST.muted;nudge(ST.muted?'Muted':'Unmuted','c');}
function _fsSetSpd(v){if(!el.vid)return;ST.spd=v;el.vid.playbackRate=v;nudge(v+'×','c');const spdb=g('nspb-fs');if(spdb)spdb.textContent=v+'×';}
function _setQual(q){loadTrk(ST.lang,q,true);renderFsOvBody();}
function _setLang(l){loadTrk(l,ST.qual,true);renderFsOvBody();}
function _setSub(lang){if(!el.vid)return;Array.from(el.vid.textTracks).forEach(t=>t.mode='hidden');if(lang){const trk=Array.from(el.vid.textTracks).find(t=>t.srclang===lang);if(trk)trk.mode='showing';}renderFsOvBody();}
function _seekTo(t){if(el.vid)el.vid.currentTime=t;closeFsOv();}
function _fsplTab(t){_fsplTab=t;renderFsplTabs();renderFsplBody();}
function _fsplSeason(s){_fsplSeason=s;renderFsplBody();}
function _fsplPlay(sid,eid){closeFspl();R.ep(sid,eid);}
function _showGesture(type){const v=type==='vol'?ST.vol:ST.bright;const fill=type==='vol'?el.ngrfFill:el.nglfFill;const pct=Math.round(v*100);if(fill)fill.style.height=pct+'%';if(el.ngt){el.ngt.textContent=(type==='vol'?'🔊 ':'☀b ')+pct+'%';el.ngt.classList.add('ns');clearTimeout(ST.gtTmr);ST.gtTmr=setTimeout(()=>el.ngt&&el.ngt.classList.remove('ns'),1200);}}
function sFrac(f){const d=el.vid&&el.vid.duration;if(isFinite(d))el.vid.currentTime=Math.max(0,Math.min(d,f*d));}
function fFrac(e){const r=el.st.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}
/* ---- network monitor ---- */
function _netSetup(){
const v=el.vid;if(!v)return;
let _wasPlaying=false,_stallPos=0;
v.addEventListener('stalled',()=>{_stallPos=v.currentTime;});
v.addEventListener('error',()=>{sysMsg('⚠ Connection error — retrying…',true);_retry();});
const _offline=()=>{ST.netOk=false;_wasPlaying=ST.playing;sysMsg('📶 No connection',true);};
const _online=()=>{ST.netOk=true;clearSysMsg();if(_wasPlaying){const pos=v.currentTime;v.src=v.src;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;v.play().catch(()=>{});},{once:true});sysMsg('✓ Reconnected');}};
window.addEventListener('offline',_offline);
window.addEventListener('online',_online);
function _retry(){const pos=v.currentTime;setTimeout(()=>{if(!ST.netOk)return;v.src=v.src;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;if(_wasPlaying)v.play().catch(()=>{});},{once:true});},2000);}
}
/* ---- tick ---- */
function tick(){if(!el.vid)return;const d=el.vid.duration||0,c=el.vid.currentTime||0,f=d?c/d:0;
if(el.sf)el.sf.style.width=(f*100)+'%';
if(el.sth)el.sth.style.left=(f*100)+'%';
if(el.tm)el.tm.textContent=fRem(c);
if(el.vid.buffered.length&&d>0){let b=0;for(let i=0;i<el.vid.buffered.length;i++)if(el.vid.buffered.start(i)<=c&&el.vid.buffered.end(i)>=c){b=el.vid.buffered.end(i);break;}if(el.sbuf)el.sbuf.style.width=(b/d*100)+'%';}
if(d>0){D.setProgress(_sid,_eid,Math.min(100,Math.round(f*100)));_savePos();}
ST.raf=requestAnimationFrame(tick);}
/* ---- track loading ---- */
function loadTrk(lk,qk,resume){const tr=(_ep&&_ep.tracks)||{};const langs=Object.keys(tr);if(!langs.length)return;if(!langs.includes(lk))lk=langs[0];ST.lang=lk;const quals=Object.keys(tr[lk]);if(!quals.includes(qk))qk=quals[0];ST.qual=qk;const src=tr[lk][qk],ct=resume?el.vid.currentTime:0,wp=!el.vid.paused;el.vid.src=src;el.vid.load();el.vid.currentTime=ct;ST.ended=false;if(wp&&resume)el.vid.play().catch(()=>{});if(el.th){el.th.src=_ep.thumb||'';el.th.style.display='block';}if(el.fst)el.fst.textContent=`${_show.title}${_ep.title?' · '+_ep.title:''}`;_savePref();loadCaptions();}
function loadCaptions(){if(!el.vid)return;const caps=(_ep&&_ep.captions)||[];Array.from(el.vid.querySelectorAll('track')).forEach(t=>t.remove());caps.forEach(c=>{const t=document.createElement('track');t.kind='subtitles';t.label=c.label||c.lang||'';t.srclang=c.lang||'en';t.src=c.src;el.vid.appendChild(t);});}
/* ---- escalating tap seek ---- */
function _tapSeek(side){clearTimeout(ST.tapTmr);if(ST.tapSide!==side){ST.tapCnt=0;ST.tapSide=side;}ST.tapCnt++;const secs=ST.tapCnt*CFG.skip;const dir=side==='r'?1:-1;seek(dir*secs);ST.tapTmr=setTimeout(()=>{ST.tapCnt=0;ST.tapSide='';},CFG.tapMs*2+200);}
/* ---- gesture (brightness/volume) ---- */
function _bindGestures(){
['nglf','ngrf'].forEach(id=>{const el2=g(id);if(!el2)return;const isLeft=id==='nglf';let sy=0,sv=0;el2.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sv=isLeft?ST.bright:ST.vol;e.stopPropagation();},{passive:true});el2.addEventListener('touchmove',e=>{const dy=sy-e.touches[0].clientY;const delta=dy/120;const nv=Math.max(0,Math.min(1,sv+delta));if(isLeft){ST.bright=nv;if(el.vid)el.vid.style.filter=`brightness(${nv})`;_showGesture('bright');}else{setVol(nv);}e.stopPropagation();},{passive:true});el2.addEventListener('mousedown',e=>{sy=e.clientY;sv=isLeft?ST.bright:ST.vol;const mm=ev=>{const dy=sy-ev.clientY,delta=dy/120,nv=Math.max(0,Math.min(1,sv+delta));if(isLeft){ST.bright=nv;if(el.vid)el.vid.style.filter=`brightness(${nv})`; _showGesture('bright');}else setVol(nv);};const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);e.stopPropagation();});});
}
/* ---- events ---- */
function bndEvt(){
const v=el.vid;
v.addEventListener('play',()=>{ST.started=true;ST.playing=true;ST.ended=false;if(el.cp)el.cp.innerHTML=IC.pause;if(el.th)el.th.style.display='none';showUI();el.spin&&el.spin.classList.remove('ns');});
v.addEventListener('pause',()=>{ST.playing=false;if(!ST.ended)if(el.cp)el.cp.innerHTML=IC.play;showUI();el.spin&&el.spin.classList.remove('ns');});
v.addEventListener('ended',()=>{try{localStorage.removeItem(_lsKey(_sid,_eid));}catch{}const i=_pl.findIndex(x=>x.id===_eid);if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);else{ST.playing=false;ST.ended=true;if(el.cp)el.cp.innerHTML=IC.replay;showUI();}});
v.addEventListener('waiting',()=>el.spin&&el.spin.classList.add('ns'));
v.addEventListener('canplay',()=>el.spin&&el.spin.classList.remove('ns'));
v.addEventListener('loadedmetadata',()=>{tick();const rt=_loadPos();if(rt>2&&rt<(v.duration-5)){v.currentTime=rt;sysMsg('↩ Resumed '+fT(rt));v.play().catch(()=>{});}});
// play/pause button
if(el.cp)el.cp.onclick=e=>{e.stopPropagation();tPlay();};
// seek buttons (non-FS)
const sk10m=g('nsk10m'),sk10p=g('nsk10p');
if(sk10m)sk10m.onclick=e=>{e.stopPropagation();seek(-CFG.skip);};
if(sk10p)sk10p.onclick=e=>{e.stopPropagation();seek(CFG.skip);};
// fullscreen
const fsBtn=g('nfs-inline');if(fsBtn)fsBtn.onclick=e=>{e.stopPropagation();el.root.requestFullscreen();};
const fsExit=g('nfs-exit');if(fsExit)fsExit.onclick=e=>{e.stopPropagation();document.exitFullscreen();};
// settings
const settBtn=g('nset');if(settBtn)settBtn.onclick=e=>{e.stopPropagation();openFsOv('quality');};
// FS bottom buttons
const plbFs=g('nplb-fs');if(plbFs)plbFs.onclick=e=>{e.stopPropagation();openFspl('episodes');};
const wNbFs=g('nwnb-fs');if(wNbFs)wNbFs.onclick=e=>{e.stopPropagation();openFspl('watchnext');};
const spdbFs=g('nspb-fs');if(spdbFs)spdbFs.onclick=e=>{e.stopPropagation();openFsOv('speed');};
const nxtFs=g('nnxt-fs');if(nxtFs)nxtFs.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);};
// overlay close
const fsovClose=g('nfsov-close');if(fsovClose)fsovClose.onclick=e=>{e.stopPropagation();closeFsOv();};
const fsplClose=g('nfspl-close');if(fsplClose)fsplClose.onclick=e=>{e.stopPropagation();closeFspl();};
// seekbar
const sw=g('nsw');
if(sw){
const ss=e=>{ST.drag=true;sFrac(fFrac(e));e.stopPropagation();};
const sm=e=>{if(ST.drag){sFrac(fFrac(e));tick();}};
const se=()=>ST.drag=false;
sw.addEventListener('mousedown',ss);sw.addEventListener('touchstart',ss,{passive:true});
document.addEventListener('mousemove',sm);document.addEventListener('touchmove',e=>{if(ST.drag)sm(e);},{passive:true});
document.addEventListener('mouseup',se);document.addEventListener('touchend',se);
sw.addEventListener('mousemove',e=>{const f=fFrac(e);const shEl=g('nsh');if(shEl){shEl.textContent=fT(f*(v.duration||0));shEl.style.left=(f*100)+'%';shEl.style.opacity='1';}});
sw.addEventListener('mouseleave',()=>{const shEl=g('nsh');if(shEl)shEl.style.opacity='0';});
}
// overlay tap
if(el.ov){
el.ov.addEventListener('click',e=>{
if(e.target.closest('#nb')||e.target.closest('#nct')||e.target.closest('#ncc'))return;
if(ST.fsOvOpen)return;
if(!ST.started){tPlay();return;}
ST.uiFull?hideUI():showUI();
});
// touch: escalating tap seek + hold for 2x speed
let _tapData={side:'',cnt:0,tmr:null,lastT:0};
el.ov.addEventListener('touchstart',e=>{
if(ST.fsOvOpen)return;
const t=e.touches[0];const now=Date.now();const r=el.ov.getBoundingClientRect();const x=t.clientX-r.left;
const side=x<r.width/3?'l':x>2*r.width/3?'r':'c';
if(now-_tapData.lastT<CFG.tapMs+100&&_tapData.side===side&&side!=='c'){
clearTimeout(_tapData.tmr);_tapData.cnt++;
const secs=_tapData.cnt*CFG.skip;
seek((side==='r'?1:-1)*secs);
nudge((side==='r'?'+':'-')+secs+'s',side);
_tapData.lastT=now;
_tapData.tmr=setTimeout(()=>{_tapData={side:'',cnt:0,tmr:null,lastT:0};},500);
}else{
clearTimeout(_tapData.tmr);_tapData={side,cnt:1,tmr:null,lastT:now};
_tapData.tmr=setTimeout(()=>{
if(_tapData.side==='c'){if(!ST.started){tPlay();}else{ST.uiFull?hideUI():showUI();}}
_tapData={side:'',cnt:0,tmr:null,lastT:0};
},CFG.tapMs+100);
}
// hold for 2x
clearTimeout(ST.holdTmr);
ST.holdTmr=setTimeout(()=>{if(!v.paused){v.playbackRate=CFG.holdSpd;sysMsg('2× speed',true);}},CFG.holdDly);
},{passive:true});
el.ov.addEventListener('touchend',()=>{
clearTimeout(ST.holdTmr);
if(v.playbackRate===CFG.holdSpd&&ST.spd!==CFG.holdSpd){v.playbackRate=ST.spd;clearSysMsg();}
},{passive:true});
}
document.addEventListener('fullscreenchange',()=>{ST.fs=!!document.fullscreenElement;if(el.root)el.root.classList.toggle('nrfs',ST.fs);});
// close overlays on click outside
document.addEventListener('click',e=>{
if(ST.fsOvOpen&&el.fsov&&el.fsov.classList.contains('on')&&!el.fsov.contains(e.target)&&e.target!==g('nset'))closeFsOv();
if(ST.fsOvOpen&&el.fspl&&el.fspl.classList.contains('on')&&!el.fspl.contains(e.target)&&e.target!==g('nplb-fs')&&e.target!==g('nwnb-fs'))closeFspl();
});
_bindGestures();
_netSetup();
}
return{
init(sid,eid,show,ep){
injectCSS();_sid=sid;_eid=eid;_show=show;_ep=ep;_pl=show.episodes||[];_fsplSeason=(ep&&ep.s)||1;
ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',lastTap:0,tapCnt:0,tapSide:'',tapTmr:null,drag:false,raf:null,holdTmr:null,fs:false,netOk:true,netTmr:null,gestDrag:null};
el=glk();
if(el.cp)el.cp.innerHTML=IC.play;
if(ep.tracks){const pref=_loadPref();const langs=Object.keys(ep.tracks);const fl=pref&&langs.includes(pref.lang)?pref.lang:langs[0];const qs=Object.keys(ep.tracks[fl]);const fq=pref&&qs.includes(pref.qual)?pref.qual:qs[0];loadTrk(fl,fq,false);}
bndEvt();if(el.root)el.root.focus();if(ST.raf)cancelAnimationFrame(ST.raf);tick();
const spdbFs=g('nspb-fs');if(spdbFs)spdbFs.textContent='1×';
},
destroy(){if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;clearTimeout(ST.uiTmr);clearTimeout(ST.holdTmr);if(el.vid){el.vid.pause();el.vid.src='';}if(document.fullscreenElement)document.exitFullscreen();el={};},
_tPlay:tPlay,_showUI:showUI,_hideUI:hideUI,
_seek:seek,_adjSpd:adjSpd,_setVol:setVol,_tMute:tMute,
_getVol:()=>ST.vol,_getSpd:()=>ST.spd,_isPlaying:()=>ST.playing,
_seekTo,_setQual,_setLang,_setSub,_fsSetSpd,
_fsOvTab(t){ST.fsOvTab=t;renderFsOvTabs();renderFsOvBody();},
_fsplTab,_fsplSeason,_fsplPlay,
openFsOv,closeFsOv,openFspl,closeFspl
};
})();