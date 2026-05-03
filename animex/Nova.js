/* AnimeX · Nova.js — Video Player v4
   Uses Material Icons (span.material-icons) instead of inline SVGs.
   Removed download button. Resume from localStorage on init.
   Keyboard shortcuts: Space=play, arrows=seek, f=fullscreen, m=mute.
*/
const NV=(()=>{
"use strict";
const CFG={skipSec:10,holdSpeed:2,holdDelay:500,uiHideDelay:3000,doubleTapMs:300,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};
/* Material Icons helpers */
const MI=n=>`<span class="material-icons">${n}</span>`;
let ST={lang:'en',quality:'720p',speed:1,vol:1,muted:false,playing:false,isEnded:false,hasStarted:false,seeking:false,holdTimer:null,uiTimer:null,uiVisible:false,fullscreen:false,playlistOpen:false,langOpen:false,speedOpen:false,qualityOpen:false,lastTap:0,dragSeek:false,raf:null};
let _showId=null,_epId=null,_showData=null,_epData=null,_playlist=[];
let _styleInjected=false;
function injectStyle(){
if(_styleInjected)return;_styleInjected=true;
const s=document.createElement('style');
s.textContent=`
.custom-scroll::-webkit-scrollbar{width:6px}.custom-scroll::-webkit-scrollbar-track{background:transparent}.custom-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:10px}
#np-root{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;user-select:none;contain:layout style;outline:none;}
#np-root.fullscreen{position:fixed;inset:0;width:100%;height:100%;max-height:none!important;aspect-ratio:unset!important;border-radius:0;z-index:9999;}
#np-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}
#np-thumb{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:1;pointer-events:none;}
#np-overlay{position:absolute;inset:0;z-index:2;cursor:pointer;}
#np-overlay::before,#np-overlay::after{content:'';position:absolute;left:0;right:0;height:45%;opacity:0;transition:opacity .3s;pointer-events:none;}
#np-overlay::before{top:0;background:linear-gradient(to bottom,rgba(0,0,0,.6) 0%,transparent 100%);}
#np-overlay::after{bottom:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 100%);}
#np-controls.visible~#np-overlay::before,#np-controls.visible~#np-overlay::after{opacity:1;}
#np-center-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.5);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;color:#fff;border:1px solid rgba(255,255,255,.15);z-index:15;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;}
#np-center-play .material-icons{font-size:36px;}
#np-center-play:active{transform:translate(-50%,-50%) scale(.9);}
#np-center-play.show{opacity:1;pointer-events:auto;}
#np-top-bar{position:absolute;top:0;left:0;right:0;z-index:20;padding:16px 20px;display:flex;align-items:center;opacity:0;transform:translateY(-10px);transition:opacity .3s,transform .3s;pointer-events:none;}
#np-controls{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0 16px 16px;display:flex;flex-direction:column;gap:8px;opacity:0;transform:translateY(10px);transition:opacity .3s,transform .3s;pointer-events:none;}
#np-top-bar.visible,#np-controls.visible{opacity:1;transform:none;pointer-events:auto;}
#np-fs-title{color:#fff;font-size:16px;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%;background:rgba(10,10,15,.7);backdrop-filter:blur(10px);padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;}
#np-root.fullscreen #np-fs-title{opacity:1;visibility:visible;}
#np-bottom-layout{display:flex;justify-content:space-between;align-items:center;width:100%;gap:8px;}
.np-ctrl-group{display:flex;align-items:center;gap:4px;background:rgba(20,20,25,.7);backdrop-filter:blur(16px);padding:4px 8px;border-radius:14px;border:1px solid rgba(255,255,255,.15);flex-wrap:nowrap;}
#np-seek-wrap{padding:10px 0 6px;cursor:pointer;touch-action:none;width:100%;}
#np-seek-track{position:relative;height:5px;background:rgba(255,255,255,.2);border-radius:99px;transition:height .2s;}
#np-seek-wrap:hover #np-seek-track,#np-seek-wrap:active #np-seek-track{height:7px;}
#np-seek-buf{position:absolute;inset:0;width:0;height:100%;background:rgba(255,255,255,.6);border-radius:99px;pointer-events:none;}
#np-seek-fill{position:absolute;inset:0;width:0;height:100%;background:#fff;border-radius:99px;pointer-events:none;}
#np-seek-thumb{position:absolute;top:50%;left:0;width:16px;height:16px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .2s;pointer-events:none;box-shadow:0 0 10px rgba(0,0,0,.5);}
#np-seek-wrap:hover #np-seek-thumb,#np-seek-wrap:active #np-seek-thumb{transform:translate(-50%,-50%) scale(1);}
#np-seek-hover{position:absolute;bottom:150%;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);color:#fff;font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap;}
.np-btn{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:none;background:transparent;color:#f0f0f8;cursor:pointer;transition:background .2s,color .2s,transform .1s;flex-shrink:0;}
.np-btn:hover{background:rgba(255,255,255,.1);color:#fff;}.np-btn:active{transform:scale(.9);}
.np-btn .material-icons{font-size:22px;pointer-events:none;}
#np-play{background:rgba(255,255,255,.1);width:42px;height:42px;}
#np-play .material-icons{font-size:26px;}
.np-btn-label{padding:0 14px;border-radius:99px;height:36px;font-size:13px;font-weight:700;gap:6px;width:auto;}
.np-btn-label .material-icons{font-size:18px;}
#np-time{font-size:12px;font-weight:600;color:#f0f0f8;white-space:nowrap;margin:0 8px;font-variant-numeric:tabular-nums;}
#np-vol-wrap{display:flex;align-items:center;}
#np-vol-slider-wrap{width:0;overflow:hidden;transition:width .3s;}
#np-vol-wrap:hover #np-vol-slider-wrap,#np-vol-wrap:focus-within #np-vol-slider-wrap{width:65px;}
#np-vol-track{position:relative;height:4px;background:rgba(255,255,255,.3);border-radius:99px;width:65px;margin:0 6px;}
#np-vol-fill{position:absolute;inset:0;height:100%;background:#fff;border-radius:99px;pointer-events:none;}
input[type=range]#np-vol-slider{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;}
.np-menu{position:absolute;background:rgba(15,15,20,.9);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:6px;min-width:140px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:30;max-height:250px;overflow-y:auto;}
.np-menu.open{opacity:1;transform:none;pointer-events:auto;}
.np-menu.dropup{bottom:calc(100% + 12px);right:0;transform:translateY(10px) scale(.95);}
.np-menu.dropdown{top:calc(100% + 12px);right:0;transform:translateY(-10px) scale(.95);}
.np-menu-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;border-radius:8px;background:transparent;color:rgba(240,240,248,.6);font-size:14px;font-weight:600;cursor:pointer;text-align:left;transition:.2s;}
.np-menu-item:hover{background:rgba(255,255,255,.1);color:#fff;}
.np-menu-item.active{color:#fff;background:rgba(255,255,255,.05);}
.np-menu-item .material-icons{font-size:16px;color:#fff;flex-shrink:0;}
#np-pl-panel{position:absolute;right:0;top:0;bottom:0;width:min(340px,85%);z-index:40;background:rgba(10,10,15,.95);backdrop-filter:blur(24px);border-left:1px solid rgba(255,255,255,.15);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s;}
#np-pl-panel.open{transform:none;}
#np-pl-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;font-size:16px;font-weight:700;color:#fff;border-bottom:1px solid rgba(255,255,255,.15);}
#np-pl-close{width:32px;height:32px;}
#np-pl-list{list-style:none;overflow-y:auto;flex:1;padding:8px 0;}
.np-pl-item{display:flex;align-items:center;gap:14px;padding:12px 18px;cursor:pointer;transition:background .2s;}
.np-pl-item:hover{background:rgba(255,255,255,.05);}
.np-pl-item.active{background:rgba(255,255,255,.1);border-left:3px solid #fff;}
.np-pl-thumb-wrap{width:88px;height:50px;border-radius:8px;overflow:hidden;background:#1a1a2e;flex-shrink:0;}
.np-pl-thumb{width:100%;height:100%;object-fit:cover;}
.np-pl-meta{display:flex;flex-direction:column;gap:4px;overflow:hidden;}
.np-pl-name{font-size:14px;font-weight:600;color:#f0f0f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.np-pl-langs{font-size:11px;color:rgba(240,240,248,.6);display:flex;gap:4px;flex-wrap:wrap;}
.np-pl-lang-badge{background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;}
#np-spinner{position:absolute;top:50%;left:50%;z-index:10;width:56px;height:56px;margin:-28px;border:3px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s;}
#np-spinner.show{opacity:1;animation:npspin .8s linear infinite;}
@keyframes npspin{to{transform:rotate(360deg)}}
#np-speed-hold{position:absolute;top:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:14px;font-weight:700;padding:6px 18px;border-radius:99px;opacity:0;pointer-events:none;z-index:15;transition:opacity .2s;}
#np-speed-hold.show{opacity:1;}
#np-nudge,#np-nudge-left,#np-nudge-right{position:absolute;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:16px;font-weight:700;padding:10px 22px;border-radius:99px;opacity:0;pointer-events:none;z-index:15;white-space:nowrap;}
#np-nudge{left:50%}#np-nudge-left{left:25%}#np-nudge-right{left:75%}
.show-nudge{animation:nudgePop .6s cubic-bezier(.4,0,.2,1) forwards;}
@keyframes nudgePop{0%{opacity:1;transform:translate(-50%,-50%) scale(.8)}40%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}
@media(max-width:560px){
.np-btn{width:34px;height:34px;}.np-btn .material-icons{font-size:18px;}
#np-play{width:38px;height:38px;}.np-btn-label{font-size:12px;padding:0 10px;}
#np-time{font-size:11px;margin:0 4px;}.np-ctrl-group{padding:4px;}
#np-vol-slider-wrap{display:none;}#np-current-thumb{display:none!important;}
}`;
document.head.appendChild(s);
}
function g(id){return document.getElementById(id);}
function lk(){
return{
root:g('np-root'),video:g('np-video'),overlay:g('np-overlay'),centerPlay:g('np-center-play'),
thumb:g('np-thumb'),currentThumb:g('np-current-thumb'),fsTitle:g('np-fs-title'),
controls:g('np-controls'),topBar:g('np-top-bar'),
seekTrack:g('np-seek-track'),seekFill:g('np-seek-fill'),seekBuf:g('np-seek-buf'),seekThumb:g('np-seek-thumb'),seekHover:g('np-seek-hover'),
playBtn:g('np-play'),prevBtn:g('np-prev'),nextBtn:g('np-next'),
volBtn:g('np-vol'),volSlider:g('np-vol-slider'),volFill:g('np-vol-fill'),
timeEl:g('np-time'),speedBtn:g('np-speed'),speedMenu:g('np-speed-menu'),
langBtn:g('np-lang'),langMenu:g('np-lang-menu'),qualityBtn:g('np-quality'),qualityMenu:g('np-quality-menu'),
fsBtn:g('np-fs'),plBtn:g('np-pl'),plPanel:g('np-pl-panel'),plList:g('np-pl-list'),plClose:g('np-pl-close'),
nudge:g('np-nudge'),nudgeLeft:g('np-nudge-left'),nudgeRight:g('np-nudge-right'),
spinner:g('np-spinner'),speedHold:g('np-speed-hold')
};
}
let el={};
let _nudgeTimer=null;
function fmtT(t){if(!isFinite(t))return'0:00';const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}
function nudge(txt,side){const t=side==='left'?el.nudgeLeft:side==='right'?el.nudgeRight:el.nudge;t.textContent=txt;t.classList.remove('show-nudge');t.offsetWidth;t.classList.add('show-nudge');clearTimeout(_nudgeTimer);_nudgeTimer=setTimeout(()=>{el.nudge.classList.remove('show-nudge');el.nudgeLeft.classList.remove('show-nudge');el.nudgeRight.classList.remove('show-nudge');},650);}
function showUI(){if(!ST.hasStarted)return;ST.uiVisible=true;el.controls.classList.add('visible');el.topBar.classList.add('visible');if(el.video.paused&&!ST.isEnded)el.centerPlay.classList.add('show');hideUITimer();}
function hideUI(){if(!ST.hasStarted)return;ST.uiVisible=false;el.controls.classList.remove('visible');el.topBar.classList.remove('visible');el.centerPlay.classList.remove('show');closeMenus();}
function hideUITimer(){clearTimeout(ST.uiTimer);if(ST.playing)ST.uiTimer=setTimeout(hideUI,CFG.uiHideDelay);}
function closeMenus(){['speed','lang','quality','pl'].forEach(k=>setMenu(k,false));}
function setMenu(k,val){
const map={speed:[el.speedMenu,'speedOpen'],lang:[el.langMenu,'langOpen'],quality:[el.qualityMenu,'qualityOpen'],pl:[el.plPanel,'playlistOpen']};
const open=val!==undefined?val:!ST[map[k][1]];
if(open)Object.keys(map).filter(x=>x!==k).forEach(x=>{map[x][0].classList.remove('open');ST[map[x][1]]=false;});
map[k][0].classList.toggle('open',open);ST[map[k][1]]=open;
if(open&&k==='speed')setTimeout(()=>updateSpeedUI(),50);
}
function togglePlay(){
if(ST.isEnded){el.video.currentTime=0;el.video.play();ST.isEnded=false;}
else{el.video.paused?el.video.play():el.video.pause();}
}
function seek(dt){el.video.currentTime=Math.max(0,Math.min(el.video.duration||0,el.video.currentTime+dt));nudge(dt>0?`+${dt}s`:`${dt}s`,dt>0?'right':'left');}
function setVol(v){ST.vol=Math.max(0,Math.min(1,v));el.video.volume=ST.vol;ST.muted=ST.vol===0;el.video.muted=ST.muted;updateVolUI();}
function toggleMute(){ST.muted=!ST.muted;el.video.muted=ST.muted;updateVolUI();nudge(ST.muted?'Muted':'Unmuted','center');}
function setSpeed(v){ST.speed=Math.max(.25,Math.min(3,v));el.video.playbackRate=ST.speed;updateSpeedUI();nudge(`${ST.speed}x`,'center');}
function updateVolUI(){const v=ST.muted?0:ST.vol;el.volFill.style.width=100*v+'%';el.volSlider.value=v;el.volBtn.innerHTML=MI(v===0?'volume_off':'volume_up');}
function updateSpeedUI(){document.querySelectorAll('.np-menu-item[data-speed]').forEach(b=>{const n=parseFloat(b.dataset.speed)===ST.speed;b.classList.toggle('active',n);b.innerHTML=n?`${MI('check')}<span>${b.dataset.speed}x</span>`:`${b.dataset.speed}x`;if(n&&ST.speedOpen)b.scrollIntoView({block:'nearest'});});el.speedBtn.querySelector('span').textContent=ST.speed+'x';}
function seekFrac(fr){const d=el.video.duration;if(isFinite(d))el.video.currentTime=Math.max(0,Math.min(d,fr*d));}
function fracFromE(e){const r=el.seekTrack.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}
function tick(){
const d=el.video.duration||0,c=el.video.currentTime||0,f=d?c/d:0;
el.seekFill.style.width=100*f+'%';el.seekThumb.style.left=100*f+'%';el.timeEl.textContent=`${fmtT(c)} / ${fmtT(d)}`;
if(el.video.buffered.length>0&&d>0){let b=0;for(let i=0;i<el.video.buffered.length;i++)if(el.video.buffered.start(i)<=c&&el.video.buffered.end(i)>=c){b=el.video.buffered.end(i);break;}el.seekBuf.style.width=b/d*100+'%';}
if(d>0){const pct=Math.min(100,Math.round(f*100));D.setProgress(_showId,_epId,pct);}
ST.raf=requestAnimationFrame(tick);
}
function loadTrack(langKey,qualKey,resume){
const tr=_showData.tracks;
const langs=Object.keys(tr);
if(!langs.includes(langKey))langKey=langs[0];
ST.lang=langKey;
const quals=Object.keys(tr[langKey]);
if(!quals.includes(qualKey))qualKey=quals[0];
ST.quality=qualKey;
const src=tr[langKey][qualKey];
const ct=resume?el.video.currentTime:0;
const wasPlaying=!el.video.paused;
el.video.src=src;el.video.load();el.video.currentTime=ct;
ST.isEnded=false;
if(wasPlaying&&resume)el.video.play().catch(()=>{});
el.thumb.src=_epData.thumb;el.thumb.style.display='block';
if(el.currentThumb)el.currentThumb.src=_epData.thumb;
el.fsTitle.textContent=`${_showData.title||_showData.t||'Untitled'} · ${_epData.title||_epData.t||'Untitled'}`;
el.fsTitle.style.display='';
buildLangMenu(langs);buildQualMenu(quals);
el.langBtn.querySelector('span').textContent=langKey.toUpperCase();
el.qualityBtn.querySelector('span').textContent=qualKey;
el.langBtn.style.display=langs.length>1?'flex':'none';
el.qualityBtn.style.display=quals.length>1?'flex':'none';
}
function buildLangMenu(langs){
el.langMenu.innerHTML='';
langs.forEach(lk=>{
const b=document.createElement('button');b.className='np-menu-item';b.dataset.lang=lk;
const label=D.langLabels[lk]||lk.toUpperCase();
const active=lk===ST.lang;b.classList.toggle('active',active);
b.innerHTML=active?`${MI('check')}<span>${label}</span>`:label;
b.addEventListener('click',e=>{e.stopPropagation();if(ST.lang!==lk){loadTrack(lk,ST.quality,true);nudge(D.langLabels[lk]||lk.toUpperCase(),'center');}setMenu('lang',false);});
el.langMenu.appendChild(b);
});
}
function buildQualMenu(quals){
el.qualityMenu.innerHTML='';
quals.forEach(qk=>{
const b=document.createElement('button');b.className='np-menu-item';b.dataset.quality=qk;
const active=qk===ST.quality;b.classList.toggle('active',active);
b.innerHTML=active?`${MI('check')}<span>${qk}</span>`:qk;
b.addEventListener('click',e=>{e.stopPropagation();if(ST.quality!==qk){loadTrack(ST.lang,qk,true);nudge(qk,'center');}setMenu('quality',false);});
el.qualityMenu.appendChild(b);
});
}
function buildSpeedMenu(){
el.speedMenu.innerHTML='';
CFG.speeds.forEach(v=>{const b=document.createElement('button');b.className='np-menu-item';b.dataset.speed=v;b.innerHTML=`${v}x`;b.addEventListener('click',e=>{e.stopPropagation();setSpeed(v);setMenu('speed',false);});el.speedMenu.appendChild(b);});
}
function buildPlaylist(){
el.plList.innerHTML='';
_playlist.forEach((ep,i)=>{
const li=document.createElement('li');li.className='np-pl-item';
const name=ep.title||ep.t||'Untitled';
li.innerHTML=`<div class="np-pl-thumb-wrap"><img class="np-pl-thumb" src="${ep.thumb||''}"></div><div class="np-pl-meta"><span class="np-pl-name">S${ep.s} E${ep.e} · ${name}</span><div class="np-pl-langs">${ep.dur||''}</div></div>`;
li.classList.toggle('active',ep.id===_epId);
li.addEventListener('click',()=>{setMenu('pl',false);R.ep(_showId,ep.id);});
el.plList.appendChild(li);
});
}
let _kbBound=false;
function bindKeyboard(){
if(_kbBound)return;_kbBound=true;
document.addEventListener('keydown',e=>{
/* ignore when typing in inputs */
if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;
/* ignore when player overlay isn't open */
const evo=document.getElementById('evo');
if(!evo||!evo.classList.contains('open'))return;
switch(e.code){
case'Space':case'KeyK':e.preventDefault();togglePlay();showUI();break;
case'ArrowRight':e.preventDefault();seek(CFG.skipSec);showUI();break;
case'ArrowLeft':e.preventDefault();seek(-CFG.skipSec);showUI();break;
case'ArrowUp':e.preventDefault();setVol(Math.min(1,ST.vol+.1));showUI();break;
case'ArrowDown':e.preventDefault();setVol(Math.max(0,ST.vol-.1));showUI();break;
case'KeyM':e.preventDefault();toggleMute();showUI();break;
case'KeyF':e.preventDefault();document.fullscreenElement?document.exitFullscreen():el.root.requestFullscreen();break;
}
});
}
function bindEvents(){
const vd=el.video;
vd.addEventListener('play',()=>{ST.hasStarted=true;ST.playing=true;ST.isEnded=false;el.playBtn.innerHTML=MI('pause');el.centerPlay.innerHTML=MI('pause');el.thumb.style.display='none';el.centerPlay.classList.remove('show');showUI();el.spinner.classList.remove('show');});
vd.addEventListener('pause',()=>{ST.playing=false;if(!ST.isEnded){el.playBtn.innerHTML=MI('play_arrow');el.centerPlay.innerHTML=MI('play_arrow');}showUI();el.spinner.classList.remove('show');});
vd.addEventListener('ended',()=>{
const idx=_playlist.findIndex(x=>x.id===_epId);
if(idx<_playlist.length-1){R.ep(_showId,_playlist[idx+1].id);}
else{ST.playing=false;ST.isEnded=true;el.playBtn.innerHTML=MI('replay');el.centerPlay.innerHTML=MI('replay');el.centerPlay.classList.add('show');showUI();}
});
vd.addEventListener('waiting',()=>el.spinner.classList.add('show'));
vd.addEventListener('canplay',()=>el.spinner.classList.remove('show'));
vd.addEventListener('loadedmetadata',()=>{
tick();
/* Resume from saved position */
const resumeTime=D.getResumeTime(_showId,_epId);
if(resumeTime>5&&resumeTime<(vd.duration-10)){vd.currentTime=resumeTime;nudge(`Resumed at ${fmtT(resumeTime)}`,'center');}
});
el.playBtn.addEventListener('click',e=>{e.stopPropagation();togglePlay();});
el.centerPlay.addEventListener('click',e=>{e.stopPropagation();togglePlay();});
el.prevBtn.addEventListener('click',e=>{e.stopPropagation();const i=_playlist.findIndex(x=>x.id===_epId);if(i>0)R.ep(_showId,_playlist[i-1].id);});
el.nextBtn.addEventListener('click',e=>{e.stopPropagation();const i=_playlist.findIndex(x=>x.id===_epId);if(i<_playlist.length-1)R.ep(_showId,_playlist[i+1].id);});
el.volBtn.addEventListener('click',e=>{e.stopPropagation();toggleMute();});
el.volSlider.addEventListener('input',e=>setVol(parseFloat(e.target.value)));
el.fsBtn.addEventListener('click',e=>{e.stopPropagation();document.fullscreenElement?document.exitFullscreen():el.root.requestFullscreen();});
el.speedBtn.addEventListener('click',e=>{e.stopPropagation();closeMenus();setMenu('speed');});
el.langBtn.addEventListener('click',e=>{e.stopPropagation();closeMenus();setMenu('lang');});
el.qualityBtn.addEventListener('click',e=>{e.stopPropagation();closeMenus();setMenu('quality');});
el.plBtn.addEventListener('click',e=>{e.stopPropagation();setMenu('pl');});
el.plClose.addEventListener('click',e=>{e.stopPropagation();setMenu('pl',false);});
const seekStart=e=>{ST.dragSeek=true;seekFrac(fracFromE(e));e.stopPropagation();};
const seekMove=e=>{if(ST.dragSeek){seekFrac(fracFromE(e));tick();}};
const seekEnd=()=>{ST.dragSeek=false;};
el.seekTrack.addEventListener('mousedown',seekStart);el.seekTrack.addEventListener('touchstart',seekStart,{passive:true});
document.addEventListener('mousemove',seekMove);document.addEventListener('touchmove',e=>{if(ST.dragSeek)seekMove(e);},{passive:true});
document.addEventListener('mouseup',seekEnd);document.addEventListener('touchend',seekEnd);
el.seekTrack.addEventListener('mousemove',e=>{const f=fracFromE(e);el.seekHover.textContent=fmtT(f*(el.video.duration||0));el.seekHover.style.left=100*f+'%';el.seekHover.style.opacity='1';});
el.seekTrack.addEventListener('mouseleave',()=>el.seekHover.style.opacity='0');
el.overlay.addEventListener('click',e=>{if(e.target.closest('#np-controls')||e.target.closest('#np-top-bar'))return;if(!ST.hasStarted){togglePlay();return;}ST.uiVisible?hideUI():showUI();});
el.overlay.addEventListener('touchstart',e=>{
if(!ST.hasStarted)return;
const t=e.touches[0],now=Date.now();
if(now-ST.lastTap<CFG.doubleTapMs){
clearTimeout(ST.holdTimer);
const r=el.overlay.getBoundingClientRect(),x=t.clientX-r.left;
if(x<r.width/3)seek(-CFG.skipSec);else if(x>2*r.width/3)seek(CFG.skipSec);else togglePlay();
ST.lastTap=0;return;
}
ST.lastTap=now;
ST.holdTimer=setTimeout(()=>{if(!el.video.paused){el.video.playbackRate=CFG.holdSpeed;el.speedHold.classList.add('show');}},CFG.holdDelay);
},{passive:true});
el.overlay.addEventListener('touchend',()=>{clearTimeout(ST.holdTimer);if(el.video.playbackRate===CFG.holdSpeed&&ST.speed!==CFG.holdSpeed){el.video.playbackRate=ST.speed;el.speedHold.classList.remove('show');}},{passive:true});
document.addEventListener('fullscreenchange',()=>{ST.fullscreen=!!document.fullscreenElement;el.fsBtn.innerHTML=MI(ST.fullscreen?'fullscreen_exit':'fullscreen');el.root.classList.toggle('fullscreen',ST.fullscreen);});
document.addEventListener('click',e=>{
if(!e.target.closest('#np-speed')&&!e.target.closest('#np-speed-menu'))setMenu('speed',false);
if(!e.target.closest('#np-lang')&&!e.target.closest('#np-lang-menu'))setMenu('lang',false);
if(!e.target.closest('#np-quality')&&!e.target.closest('#np-quality-menu'))setMenu('quality',false);
if(ST.playlistOpen&&!e.target.closest('#np-pl-panel')&&!e.target.closest('#np-pl'))setMenu('pl',false);
});
bindKeyboard();
}
return{
init(showId,epId,showData,epData){
injectStyle();
_showId=showId;_epId=epId;_showData=showData;_epData=epData;
_playlist=showData.episodes;
ST={lang:'en',quality:'720p',speed:1,vol:1,muted:false,playing:false,isEnded:false,hasStarted:false,seeking:false,holdTimer:null,uiTimer:null,uiVisible:false,fullscreen:false,playlistOpen:false,langOpen:false,speedOpen:false,qualityOpen:false,lastTap:0,dragSeek:false,raf:null};
el=lk();
el.playBtn.innerHTML=MI('play_arrow');
el.centerPlay.innerHTML=MI('play_arrow');
el.prevBtn.innerHTML=MI('skip_previous');
el.nextBtn.innerHTML=MI('skip_next');
el.volBtn.innerHTML=MI('volume_up');
el.fsBtn.innerHTML=MI('fullscreen');
el.plBtn.innerHTML=MI('playlist_play');
el.plClose.innerHTML=MI('close');
el.speedBtn.innerHTML=MI('speed')+'<span>1x</span>';
el.langBtn.innerHTML=MI('language')+'<span>EN</span>';
el.qualityBtn.innerHTML=MI('settings')+'<span>720p</span>';
buildSpeedMenu();buildPlaylist();
const langs=Object.keys(showData.tracks);
const firstLang=langs[0];
const firstQual=Object.keys(showData.tracks[firstLang])[0];
loadTrack(firstLang,firstQual,false);
bindEvents();
updateVolUI();
el.centerPlay.classList.add('show');
el.root.focus();
if(ST.raf)cancelAnimationFrame(ST.raf);
tick();
},
destroy(){
if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;
clearTimeout(ST.uiTimer);clearTimeout(ST.holdTimer);
if(el.video){el.video.pause();el.video.src='';}
if(document.fullscreenElement)document.exitFullscreen();
el={};
}
};
})();