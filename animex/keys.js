const KB=(()=>{
'use strict';
let _bound=false;
const _on=(el,ev,fn,opt)=>el.addEventListener(ev,fn,opt);
function _inInput(){const t=document.activeElement;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);}
function _evoOpen(){const e=document.getElementById('evo');return e&&e.classList.contains('op');}
function _sdoOpen(){const e=document.getElementById('sdo');return e&&e.classList.contains('op');}
function _saoOpen(){const e=document.getElementById('sao');return e&&e.classList.contains('op');}
function _plFsOpen(){const e=document.getElementById('pl-fs');return e&&e.classList.contains('op');}
function _getPage(){const pages=['home','search','profile'];for(const p of pages){const el=document.getElementById('page-'+p);if(el&&el.classList.contains('act'))return p;}return'home';}
function bind(){
if(_bound)return;_bound=true;
_on(document,'keydown',e=>{
if(_inInput())return;
const k=e.key,c=e.code;
// Close overlays with Escape
if(k==='Escape'){
if(_evoOpen()){R.closeEp();return;}
if(_plFsOpen()){P.closePlFull();return;}
if(_sdoOpen()){R.closeShow();return;}
if(_saoOpen()){R.closeSeeAll();return;}
return;
}
// Player shortcuts — only when episode player is open
if(_evoOpen()){
switch(c){
case'Space':case'KeyK':e.preventDefault();NV._tPlay();NV._showUI();break;
case'ArrowRight':e.preventDefault();NV._seek(10);NV._showUI();break;
case'ArrowLeft':e.preventDefault();NV._seek(-10);NV._showUI();break;
case'ArrowUp':e.preventDefault();NV._setVol(Math.min(1,(NV._getVol()||0)+.1));NV._showUI();break;
case'ArrowDown':e.preventDefault();NV._setVol(Math.max(0,(NV._getVol()||0)-.1));NV._showUI();break;
case'KeyM':e.preventDefault();NV._tMute();NV._showUI();break;
case'KeyF':e.preventDefault();document.fullscreenElement?document.exitFullscreen():document.getElementById('nr')?.requestFullscreen();break;
case'KeyJ':e.preventDefault();NV._seek(-10);NV._showUI();break;
case'KeyL':e.preventDefault();NV._seek(10);NV._showUI();break;
case'Comma':e.preventDefault();NV._adjSpd(-1);NV._showUI();break;
case'Period':e.preventDefault();NV._adjSpd(1);NV._showUI();break;
}
return;
}
// Global page navigation — only when no overlay open
if(!_sdoOpen()&&!_saoOpen()&&!_plFsOpen()){
switch(k){
case'1':location.hash='home';break;
case'2':location.hash='search';break;
case'3':location.hash='profile';break;
case'/':e.preventDefault();location.hash='search';setTimeout(()=>{const i=document.getElementById('sinput');if(i)i.focus();},200);break;
case'?':P.toast('Shortcuts: 1/2/3=Pages /=Search Esc=Back Space/K=Play ←→=Seek F=Full M=Mute ,/.=Speed');break;
}
}
});
}
return{bind};
})();