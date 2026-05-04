const NV=(()=>{
'use strict';
const CFG={skip:10,holdSpd:2,holdDly:500,uiHide:3e3,tapMs:300,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};
let ST={lang:'en',qual:'720p',spd:1,vol:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,plOpen:false,langOpen:false,spdOpen:false,qualOpen:false,lastTap:0,drag:false,raf:null,holdTmr:null};
let _sid=null,_eid=null,_show=null,_ep=null,_pl=[];
let _si=false;
function injectCSS(){
if(_si)return;_si=true;
const s=document.createElement('style');
s.textContent=`.xsc::-webkit-scrollbar{width:6px}.xsc::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:10px}
#nr{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;user-select:none;outline:none}
#nr.nrfs{position:fixed;inset:0;width:100%;height:100%;aspect-ratio:unset;border-radius:0;z-index:10000}
#nvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#nth{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;pointer-events:none}
#nov{position:absolute;inset:0;z-index:2;cursor:pointer}
#nov::before,#nov::after{content:'';position:absolute;left:0;right:0;height:45%;opacity:0;transition:opacity .3s;pointer-events:none}
#nov::before{top:0;background:linear-gradient(to bottom,rgba(0,0,0,.6),transparent)}
#nov::after{bottom:0;background:linear-gradient(to top,rgba(0,0,0,.85),transparent)}
#nct.nv,#nb.nv{opacity:1;transform:none;pointer-events:auto}
#nct.nv~#nov::before,#nct.nv~#nov::after{opacity:1}
#ncp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.5);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;color:#fff;border:1px solid rgba(255,255,255,.15);z-index:15;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
#ncp svg{width:34px;height:34px}
#ncp.ns{opacity:1;pointer-events:auto}
#nct{position:absolute;top:0;left:0;right:0;z-index:20;padding:14px 18px;display:flex;align-items:center;opacity:0;transform:translateY(-8px);transition:opacity .3s,transform .3s;pointer-events:none}
#nb{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0 14px 14px;display:flex;flex-direction:column;gap:6px;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none}
#nfst{color:#fff;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%;background:rgba(10,10,15,.7);backdrop-filter:blur(10px);padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:0;visibility:hidden;transition:opacity .3s}
#nr.nrfs #nfst{opacity:1;visibility:visible}
#nbl{display:flex;justify-content:space-between;align-items:center;width:100%;gap:6px}
.ncg{display:flex;align-items:center;gap:3px;background:rgba(20,20,25,.75);backdrop-filter:blur(16px);padding:4px 8px;border-radius:14px;border:1px solid rgba(255,255,255,.12)}
#nsw{padding:10px 0 5px;cursor:pointer;touch-action:none;width:100%}
#nst{position:relative;height:5px;background:rgba(255,255,255,.2);border-radius:99px;transition:height .2s}
#nsw:hover #nst,#nsw:active #nst{height:7px}
#nsbuf,#nsf{position:absolute;inset:0;height:100%;border-radius:99px;pointer-events:none}
#nsbuf{background:rgba(255,255,255,.5)}
#nsf{background:#fff}
#nsth{position:absolute;top:50%;left:0;width:15px;height:15px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .2s;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,.5)}
#nsw:hover #nsth,#nsw:active #nsth{transform:translate(-50%,-50%) scale(1)}
#nsh{position:absolute;bottom:155%;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:600;padding:3px 7px;border-radius:5px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap}
.nb{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:#f0f0f8;cursor:pointer;transition:background .2s,transform .1s;flex-shrink:0}
.nb:hover{background:rgba(255,255,255,.1)}.nb:active{transform:scale(.88)}
.nb svg{width:20px;height:20px;pointer-events:none}
#npl2{background:rgba(255,255,255,.1);width:40px;height:40px}
#npl2 svg{width:24px;height:24px}
.nbl{padding:0 12px;border-radius:99px;height:34px;font-size:12px;font-weight:700;gap:5px;width:auto}
.nbl svg{width:16px;height:16px}
#ntm{font-size:11px;font-weight:600;color:#f0f0f8;white-space:nowrap;margin:0 6px;font-variant-numeric:tabular-nums}
#nvw{display:flex;align-items:center}
#nvs{width:0;overflow:hidden;transition:width .3s}
#nvw:hover #nvs,#nvw:focus-within #nvs{width:60px}
#nvt{position:relative;height:4px;background:rgba(255,255,255,.3);border-radius:99px;width:60px;margin:0 5px}
#nvf{position:absolute;inset:0;height:100%;background:#fff;border-radius:99px;pointer-events:none}
input[type=range]#nvsl{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0}
.nm{position:absolute;background:rgba(12,12,18,.92);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:5px;min-width:130px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:30;max-height:240px;overflow-y:auto}
.nm.no{opacity:1;transform:none;pointer-events:auto}
.nm.ndu{bottom:calc(100% + 10px);right:0;transform:translateY(8px) scale(.95)}
.nm.ndd{top:calc(100% + 10px);right:0;transform:translateY(-8px) scale(.95)}
.nmi{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:none;border-radius:8px;background:transparent;color:rgba(240,240,248,.6);font-size:13px;font-weight:600;cursor:pointer;text-align:left;transition:.2s}
.nmi:hover{background:rgba(255,255,255,.1);color:#fff}
.nmi.na{color:#fff;background:rgba(255,255,255,.06)}
.nmi svg{width:14px;height:14px;color:#fff;flex-shrink:0}
#npp{position:absolute;right:0;top:0;bottom:0;width:min(330px,85%);z-index:40;background:rgba(8,8,14,.97);backdrop-filter:blur(24px);border-left:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s}
#npp.no{transform:none}
#npph{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;font-size:15px;font-weight:700;color:#fff;border-bottom:1px solid rgba(255,255,255,.12)}
#nppls{list-style:none;overflow-y:auto;flex:1;padding:6px 0}
.nppi{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:background .2s}
.nppi:hover{background:rgba(255,255,255,.05)}
.nppi.na{background:rgba(255,255,255,.1);border-left:3px solid #fff}
.npit{width:84px;height:48px;border-radius:7px;overflow:hidden;background:#111;flex-shrink:0}
.npit img{width:100%;height:100%;object-fit:cover}
.npim{display:flex;flex-direction:column;gap:3px;overflow:hidden}
.npin{font-size:13px;font-weight:600;color:#f0f0f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.npis{font-size:11px;color:rgba(240,240,248,.55)}
#nsp{position:absolute;top:50%;left:50%;z-index:10;width:52px;height:52px;margin:-26px;border:3px solid rgba(255,255,255,.12);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s}
#nsp.ns{opacity:1;animation:nsp .8s linear infinite}
@keyframes nsp{to{transform:rotate(360deg)}}
#nsh2{position:absolute;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.72);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:700;padding:5px 16px;border-radius:99px;opacity:0;pointer-events:none;z-index:15;transition:opacity .2s}
#nsh2.ns{opacity:1}
#nn,#nnl,#nnr{position:absolute;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.72);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:15px;font-weight:700;padding:9px 20px;border-radius:99px;opacity:0;pointer-events:none;z-index:15;white-space:nowrap}
#nn{left:50%}#nnl{left:25%}#nnr{left:75%}
.snp{animation:snp .6s cubic-bezier(.4,0,.2,1) forwards}
@keyframes snp{0%{opacity:1;transform:translate(-50%,-50%) scale(.8)}40%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}100%{opacity:0;transform:translate(-50%,-62%) scale(1)}}
@media(max-width:520px){.nb{width:32px;height:32px}.nb svg{width:17px;height:17px}#npl2{width:36px;height:36px}.nbl{font-size:11px;padding:0 9px}#ntm{font-size:10px;margin:0 3px}.ncg{padding:3px 5px}#nvs{display:none}#ncth{display:none!important}}`;
document.head.appendChild(s);
}
const g=id=>document.getElementById(id);
function glk(){return{root:g('nr'),vid:g('nvid'),ov:g('nov'),cp:g('ncp'),th:g('nth'),cth:g('ncth'),fst:g('nfst'),ct:g('nct'),bot:g('nb'),st:g('nst'),sf:g('nsf'),sbuf:g('nsbuf'),sth:g('nsth'),sh:g('nsh'),pl2:g('npl2'),prev:g('nprev'),next:g('nnext'),vol:g('nvol'),vs:g('nvsl'),vf:g('nvf'),tm:g('ntm'),spb:g('nspb'),spm:g('nspm'),lb:g('nlb'),lm:g('nlm'),qb:g('nqb'),qm:g('nqm'),fs:g('nfs'),plb:g('nplb'),plp:g('npp'),pll:g('nppls'),plc:g('nppc'),nu:g('nn'),nul:g('nnl'),nur:g('nnr'),spin:g('nsp'),sh2:g('nsh2')};}
let el={},_nt=null;
const fT=t=>{if(!isFinite(t))return'0:00';const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
function nudge(txt,side){const t=side==='l'?el.nul:side==='r'?el.nur:el.nu;if(!t)return;t.textContent=txt;t.classList.remove('snp');t.offsetWidth;t.classList.add('snp');clearTimeout(_nt);_nt=setTimeout(()=>{el.nu&&el.nu.classList.remove('snp');el.nul&&el.nul.classList.remove('snp');el.nur&&el.nur.classList.remove('snp');},680);}
function showUI(){if(!ST.started)return;ST.uiFull=true;el.bot&&el.bot.classList.add('nv');el.ct&&el.ct.classList.add('nv');if(el.vid&&el.vid.paused&&!ST.ended)el.cp&&el.cp.classList.add('ns');hiTmr();}
function hideUI(){if(!ST.started)return;ST.uiFull=false;el.bot&&el.bot.classList.remove('nv');el.ct&&el.ct.classList.remove('nv');el.cp&&el.cp.classList.remove('ns');cMenus();}
function hiTmr(){clearTimeout(ST.uiTmr);if(ST.playing)ST.uiTmr=setTimeout(hideUI,CFG.uiHide);}
function cMenus(){['s','l','q','p'].forEach(k=>sMn(k,false));}
function sMn(k,v){const M={s:[el.spm,'spdOpen'],l:[el.lm,'langOpen'],q:[el.qm,'qualOpen'],p:[el.plp,'plOpen']};if(!M[k]||!M[k][0])return;const on=v!==undefined?v:!ST[M[k][1]];if(on)Object.keys(M).filter(x=>x!==k).forEach(x=>{M[x][0]&&M[x][0].classList.remove('no');ST[M[x][1]]=false;});M[k][0].classList.toggle('no',on);ST[M[k][1]]=on;if(on&&k==='s')setTimeout(updSpd,50);}
function tPlay(){if(!el.vid)return;if(ST.ended){el.vid.currentTime=0;el.vid.play();ST.ended=false;}else{el.vid.paused?el.vid.play():el.vid.pause();}}
function seek(d){if(!el.vid)return;el.vid.currentTime=Math.max(0,Math.min(el.vid.duration||0,el.vid.currentTime+d));nudge(d>0?`+${d}s`:`${d}s`,d>0?'r':'l');}
function adjSpd(dir){const idx=CFG.speeds.indexOf(ST.spd);const ni=Math.max(0,Math.min(CFG.speeds.length-1,idx+dir));setSpd(CFG.speeds[ni]);}
function setVol(v){if(!el.vid)return;ST.vol=Math.max(0,Math.min(1,v));el.vid.volume=ST.vol;ST.muted=ST.vol===0;el.vid.muted=ST.muted;updVol();}
function tMute(){if(!el.vid)return;ST.muted=!ST.muted;el.vid.muted=ST.muted;updVol();nudge(ST.muted?'Muted':'Unmuted','c');}
function setSpd(v){if(!el.vid)return;ST.spd=Math.max(.25,Math.min(3,v));el.vid.playbackRate=ST.spd;updSpd();nudge(`${ST.spd}x`,'c');}
function updVol(){if(!el.vs||!el.vf||!el.vol)return;const v=ST.muted?0:ST.vol;el.vf.style.width=100*v+'%';el.vs.value=v;el.vol.innerHTML=v===0?IC.mute:IC.volume;}
function updSpd(){document.querySelectorAll('.nmi[data-s]').forEach(b=>{const n=parseFloat(b.dataset.s)===ST.spd;b.classList.toggle('na',n);b.innerHTML=n?`${IC.check}<span>${b.dataset.s}x</span>`:`${b.dataset.s}x`;if(n&&ST.spdOpen)b.scrollIntoView({block:'nearest'});});if(el.spb)el.spb.querySelector('span').textContent=ST.spd+'x';}
function sFrac(f){const d=el.vid&&el.vid.duration;if(isFinite(d))el.vid.currentTime=Math.max(0,Math.min(d,f*d));}
function fFrac(e){const r=el.st.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}
function tick(){if(!el.vid)return;const d=el.vid.duration||0,c=el.vid.currentTime||0,f=d?c/d:0;if(el.sf)el.sf.style.width=100*f+'%';if(el.sth)el.sth.style.left=100*f+'%';if(el.tm)el.tm.textContent=`${fT(c)} / ${fT(d)}`;if(el.vid.buffered.length>0&&d>0){let b=0;for(let i=0;i<el.vid.buffered.length;i++)if(el.vid.buffered.start(i)<=c&&el.vid.buffered.end(i)>=c){b=el.vid.buffered.end(i);break;}if(el.sbuf)el.sbuf.style.width=b/d*100+'%';}if(d>0)D.setProgress(_sid,_eid,Math.min(100,Math.round(f*100)));ST.raf=requestAnimationFrame(tick);}
function loadTrk(lk,qk,resume){if(!_show||!_show.tracks)return;const tr=_show.tracks,langs=Object.keys(tr);if(!langs.includes(lk))lk=langs[0];ST.lang=lk;const quals=Object.keys(tr[lk]);if(!quals.includes(qk))qk=quals[0];ST.qual=qk;const src=tr[lk][qk],ct=resume?el.vid.currentTime:0,wp=!el.vid.paused;el.vid.src=src;el.vid.load();el.vid.currentTime=ct;ST.ended=false;if(wp&&resume)el.vid.play().catch(()=>{});if(el.th){el.th.src=_ep.thumb;el.th.style.display='block';}if(el.cth)el.cth.src=_ep.thumb;if(el.fst)el.fst.textContent=`${_show.title} · ${_ep.title}`;bldLng(langs);bldQual(quals);if(el.lb){el.lb.querySelector('span').textContent=lk.toUpperCase();el.lb.style.display=langs.length>1?'flex':'none';}if(el.qb){el.qb.querySelector('span').textContent=qk;el.qb.style.display=quals.length>1?'flex':'none';}}
function bldLng(ls2){if(!el.lm)return;el.lm.innerHTML='';ls2.forEach(lk=>{const b=document.createElement('button');b.className='nmi';b.dataset.l=lk;const label=D.langLabels[lk]||lk.toUpperCase(),act=lk===ST.lang;b.classList.toggle('na',act);b.innerHTML=act?`${IC.check}<span>${label}</span>`:label;b.onclick=e=>{e.stopPropagation();if(ST.lang!==lk){loadTrk(lk,ST.qual,true);nudge(label,'c');}sMn('l',false);};el.lm.appendChild(b);});}
function bldQual(qs){if(!el.qm)return;el.qm.innerHTML='';qs.forEach(qk=>{const b=document.createElement('button');b.className='nmi';b.dataset.q=qk;const act=qk===ST.qual;b.classList.toggle('na',act);b.innerHTML=act?`${IC.check}<span>${qk}</span>`:qk;b.onclick=e=>{e.stopPropagation();if(ST.qual!==qk){loadTrk(ST.lang,qk,true);nudge(qk,'c');}sMn('q',false);};el.qm.appendChild(b);});}
function bldSpd(){if(!el.spm)return;el.spm.innerHTML='';CFG.speeds.forEach(v=>{const b=document.createElement('button');b.className='nmi';b.dataset.s=v;b.textContent=v+'x';b.onclick=e=>{e.stopPropagation();setSpd(v);sMn('s',false);};el.spm.appendChild(b);});}
function bldPl(){if(!el.pll)return;el.pll.innerHTML='';_pl.forEach(ep=>{const li=document.createElement('li');li.className='nppi';li.innerHTML=`<div class="npit"><img src="${ep.thumb||''}"></div><div class="npim"><span class="npin">S${ep.s} E${ep.e} · ${ep.title}</span><span class="npis">${ep.dur||''}</span></div>`;li.classList.toggle('na',ep.id===_eid);li.onclick=()=>{sMn('p',false);R.ep(_sid,ep.id);};el.pll.appendChild(li);});}
function bndEvt(){
const v=el.vid;
v.addEventListener('play',()=>{ST.started=true;ST.playing=true;ST.ended=false;if(el.pl2)el.pl2.innerHTML=IC.pause;if(el.cp){el.cp.innerHTML=IC.pause;}if(el.th)el.th.style.display='none';el.cp&&el.cp.classList.remove('ns');showUI();el.spin&&el.spin.classList.remove('ns');});
v.addEventListener('pause',()=>{ST.playing=false;if(!ST.ended){if(el.pl2)el.pl2.innerHTML=IC.play;if(el.cp)el.cp.innerHTML=IC.play;}showUI();el.spin&&el.spin.classList.remove('ns');});
v.addEventListener('ended',()=>{const i=_pl.findIndex(x=>x.id===_eid);if(i<_pl.length-1)R.ep(_sid,_pl[i+1].id);else{ST.playing=false;ST.ended=true;if(el.pl2)el.pl2.innerHTML=IC.replay;if(el.cp){el.cp.innerHTML=IC.replay;el.cp.classList.add('ns');}showUI();}});
v.addEventListener('waiting',()=>el.spin&&el.spin.classList.add('ns'));
v.addEventListener('canplay',()=>el.spin&&el.spin.classList.remove('ns'));
v.addEventListener('loadedmetadata',()=>{
tick();
const rt=D.getResumeTime(_sid,_eid);
if(rt>5&&rt<(v.duration-10)){
v.currentTime=rt;
nudge(`Resumed ${fT(rt)}`,'c');
v.play().catch(()=>{});
}
});
if(el.pl2)el.pl2.onclick=e=>{e.stopPropagation();tPlay();};
if(el.cp)el.cp.onclick=e=>{e.stopPropagation();tPlay();};
if(el.prev)el.prev.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i>0)R.ep(_sid,_pl[i-1].id);};
if(el.next)el.next.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i<_pl.length-1)R.ep(_sid,_pl[i+1].id);};
if(el.vol)el.vol.onclick=e=>{e.stopPropagation();tMute();};
if(el.vs)el.vs.oninput=e=>setVol(parseFloat(e.target.value));
if(el.fs)el.fs.onclick=e=>{e.stopPropagation();document.fullscreenElement?document.exitFullscreen():el.root.requestFullscreen();};
if(el.spb)el.spb.onclick=e=>{e.stopPropagation();cMenus();sMn('s');};
if(el.lb)el.lb.onclick=e=>{e.stopPropagation();cMenus();sMn('l');};
if(el.qb)el.qb.onclick=e=>{e.stopPropagation();cMenus();sMn('q');};
if(el.plb)el.plb.onclick=e=>{e.stopPropagation();sMn('p');};
if(el.plc)el.plc.onclick=e=>{e.stopPropagation();sMn('p',false);};
const ss=e=>{ST.drag=true;sFrac(fFrac(e));e.stopPropagation();};
const sm=e=>{if(ST.drag){sFrac(fFrac(e));tick();}};
const se=()=>{ST.drag=false;};
if(el.st){
el.st.addEventListener('mousedown',ss);el.st.addEventListener('touchstart',ss,{passive:true});
document.addEventListener('mousemove',sm);document.addEventListener('touchmove',e=>{if(ST.drag)sm(e);},{passive:true});
document.addEventListener('mouseup',se);document.addEventListener('touchend',se);
el.st.addEventListener('mousemove',e=>{const f=fFrac(e);if(el.sh){el.sh.textContent=fT(f*(el.vid.duration||0));el.sh.style.left=100*f+'%';el.sh.style.opacity='1';}});
el.st.addEventListener('mouseleave',()=>{if(el.sh)el.sh.style.opacity='0';});
}
if(el.ov){
el.ov.addEventListener('click',e=>{if(e.target.closest('#nb')||e.target.closest('#nct'))return;if(!ST.started){tPlay();return;}ST.uiFull?hideUI():showUI();});
el.ov.addEventListener('touchstart',e=>{if(!ST.started)return;const t=e.touches[0],now=Date.now();if(now-ST.lastTap<CFG.tapMs){clearTimeout(ST.holdTmr);const r=el.ov.getBoundingClientRect(),x=t.clientX-r.left;if(x<r.width/3)seek(-CFG.skip);else if(x>2*r.width/3)seek(CFG.skip);else tPlay();ST.lastTap=0;return;}ST.lastTap=now;ST.holdTmr=setTimeout(()=>{if(!el.vid.paused){el.vid.playbackRate=CFG.holdSpd;el.sh2&&el.sh2.classList.add('ns');}},CFG.holdDly);},{passive:true});
el.ov.addEventListener('touchend',()=>{clearTimeout(ST.holdTmr);if(el.vid.playbackRate===CFG.holdSpd&&ST.spd!==CFG.holdSpd){el.vid.playbackRate=ST.spd;el.sh2&&el.sh2.classList.remove('ns');}},{passive:true});
}
document.addEventListener('fullscreenchange',()=>{const f=!!document.fullscreenElement;if(el.fs)el.fs.innerHTML=f?IC.exitFs:IC.fullscreen;if(el.root)el.root.classList.toggle('nrfs',f);});
document.addEventListener('click',e=>{if(!e.target.closest('#nspb')&&!e.target.closest('#nspm'))sMn('s',false);if(!e.target.closest('#nlb')&&!e.target.closest('#nlm'))sMn('l',false);if(!e.target.closest('#nqb')&&!e.target.closest('#nqm'))sMn('q',false);if(ST.plOpen&&!e.target.closest('#npp')&&!e.target.closest('#nplb'))sMn('p',false);});
}
return{
init(sid,eid,show,ep){
injectCSS();_sid=sid;_eid=eid;_show=show;_ep=ep;_pl=show.episodes||[];
ST={lang:'en',qual:'720p',spd:1,vol:1,muted:false,playing:false,ended:false,started:false,uiTmr:null,uiFull:false,plOpen:false,langOpen:false,spdOpen:false,qualOpen:false,lastTap:0,drag:false,raf:null,holdTmr:null};
el=glk();
if(el.pl2)el.pl2.innerHTML=IC.play;if(el.cp)el.cp.innerHTML=IC.play;if(el.prev)el.prev.innerHTML=IC.skipPrev;if(el.next)el.next.innerHTML=IC.skipNext;if(el.vol)el.vol.innerHTML=IC.volume;if(el.fs)el.fs.innerHTML=IC.fullscreen;if(el.plb)el.plb.innerHTML=IC.playlist;if(el.plc)el.plc.innerHTML=IC.close;
if(el.spb)el.spb.innerHTML=IC.speed+'<span>1x</span>';if(el.lb)el.lb.innerHTML=IC.language+'<span>EN</span>';if(el.qb)el.qb.innerHTML=IC.quality+'<span>720p</span>';
bldSpd();bldPl();
if(show.tracks){const langs=Object.keys(show.tracks),fl=langs[0],fq=Object.keys(show.tracks[fl])[0];loadTrk(fl,fq,false);}
bndEvt();updVol();if(el.cp)el.cp.classList.add('ns');if(el.root)el.root.focus();if(ST.raf)cancelAnimationFrame(ST.raf);tick();
},
destroy(){if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;clearTimeout(ST.uiTmr);clearTimeout(ST.holdTmr);if(el.vid){el.vid.pause();el.vid.src='';}if(document.fullscreenElement)document.exitFullscreen();el={};},
// Public API for KB module
_tPlay:tPlay,_showUI:showUI,_hideUI:hideUI,
_seek:seek,_adjSpd:adjSpd,
_setVol:setVol,_tMute:tMute,_setSpd:setSpd,
_getVol:()=>ST.vol,_getSpd:()=>ST.spd,_isPlaying:()=>ST.playing
};
})();