const NV=(()=>{
'use strict';
/*
 * Nova Player v8 — Multi-Source Edition
 * Supports: native video (mp4/webm/hls/dash), YouTube, JW Player, Vimeo,
 *           Dailymotion, Twitch, Facebook, any iframe-embeddable source.
 * All sources route through a unified SRC_ADAPTER that bridges external APIs
 * back to Nova's internal state (ST) and UI controls.
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CFG={skip:10,holdSpd:2,holdDly:600,uiHide:5000,tapMs:350,speeds:[.25,.5,.75,1,1.25,1.5,1.75,2]};

// ─── STATE ─────────────────────────────────────────────────────────────────
let ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,
        uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,
        fs:false,netOk:true,sysTmr:null,gtTmr:null,bufErr:0,
        srcType:'native',// 'native'|'youtube'|'jwplayer'|'vimeo'|'dailymotion'|'twitch'|'iframe'
        duration:0,currentTime:0,adapterReady:false};

let _sid=null,_eid=null,_show=null,_ep=null,_pl=[];
let _si=false,_fsplCurTab='episodes',_fsplCurSeason=1;
const _prefKey=(s,e)=>`ax_pref_${s}_${e}`;
const _savePref=()=>{try{localStorage.setItem(_prefKey(_sid,_eid),JSON.stringify({lang:ST.lang,qual:ST.qual}));}catch{}};
const _loadPref=()=>{try{const v=localStorage.getItem(_prefKey(_sid,_eid));return v?JSON.parse(v):null;}catch{return null;}};
const _lsKey=(s,e)=>`ax_pos_${s}_${e}`;
const _savePos=()=>{const t=ST.currentTime,d=ST.duration;if(t>2&&isFinite(d)&&t<d-5)try{localStorage.setItem(_lsKey(_sid,_eid),String(Math.round(t)));}catch{}};
const _loadPos=()=>{try{const v=localStorage.getItem(_lsKey(_sid,_eid));return v?parseInt(v,10):0;}catch{return 0;}};

// ═══════════════════════════════════════════════════════════════════════════
//  SOURCE DETECTION & ADAPTER LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect what kind of source a URL is.
 * Returns: { type, id, embedUrl, isEmbed, isJWPlatform }
 *
 * JW Player type variants:
 *  'jwplayer'  — JW Platform-hosted iframe (cdn.jwplayer.com / content.jwplatform.com)
 *                These support JW's postMessage API natively.
 *  'jwpage'    — Self-hosted page running JW Player (e.g. animewali.p2pplay.online/#s1k9bj,
 *                any third-party site embedding JW Player).
 *                These are plain iframes — we try postMessage but fall back gracefully.
 */
function detectSource(url){
  if(!url)return{type:'native',id:null,embedUrl:url,isEmbed:false};
  const u=url.trim();

  // ── YouTube ─────────────────────────────────────────────────────────────
  let m=u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if(m)return{type:'youtube',id:m[1],
    embedUrl:'https://www.youtube-nocookie.com/embed/'+m[1]+'?enablejsapi=1&autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&origin='+encodeURIComponent(location.origin),
    isEmbed:true};

  // ── JW Player — JW Platform hosted iframe ───────────────────────────────
  // cdn.jwplayer.com/players/MEDIAID-PLAYERID.html
  // content.jwplatform.com/players/MEDIAID-PLAYERID.html
  m=u.match(/(?:cdn\.jwplayer\.com|content\.jwplatform\.com)\/players\/([A-Za-z0-9_-]+\.html)/);
  if(m)return{type:'jwplayer',id:m[1],embedUrl:u,isEmbed:true,isJWPlatform:true};

  // JW Platform — previews URL  cdn.jwplayer.com/previews/MEDIAID-PLAYERID
  m=u.match(/(?:cdn\.jwplayer\.com|content\.jwplatform\.com)\/previews\/([A-Za-z0-9]+-[A-Za-z0-9]+)/);
  if(m)return{type:'jwplayer',id:m[1],embedUrl:'https://cdn.jwplayer.com/players/'+m[1]+'.html',isEmbed:true,isJWPlatform:true};

  // JW Platform — any other jwplayer.com / jwplatform.com path
  m=u.match(/(?:[\w-]+\.jwplayer\.com|[\w-]+\.jwplatform\.com)\/\S+\/([A-Za-z0-9]+-[A-Za-z0-9]+)/);
  if(m)return{type:'jwplayer',id:m[1],embedUrl:u,isEmbed:true,isJWPlatform:true};

  // JW Player — bare MEDIAID-PLAYERID shorthand  e.g. "aBcd1234-EfGh5678"
  m=u.match(/^([A-Za-z0-9]{8}-[A-Za-z0-9]{8})$/);
  if(m)return{type:'jwplayer',id:m[1],embedUrl:'https://cdn.jwplayer.com/players/'+m[1]+'.html',isEmbed:true,isJWPlatform:true};

  // JW Player — self-hosted / third-party page embedding JW Player
  // Detect by explicit jwplayer: prefix the consumer can use
  if(u.startsWith('jwplayer:')){
    const raw=u.slice(9);
    // If it looks like a bare ID, resolve to JW Platform
    if(/^[A-Za-z0-9]{8}-[A-Za-z0-9]{8}$/.test(raw))
      return{type:'jwplayer',id:raw,embedUrl:'https://cdn.jwplayer.com/players/'+raw+'.html',isEmbed:true,isJWPlatform:true};
    return{type:'jwpage',id:null,embedUrl:raw,isEmbed:true,isJWPlatform:false};
  }

  // ── Vimeo ────────────────────────────────────────────────────────────────
  m=u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(m)return{type:'vimeo',id:m[1],
    embedUrl:'https://player.vimeo.com/video/'+m[1]+'?autoplay=1&transparent=0&api=1&player_id=nvframe',
    isEmbed:true};

  // ── Dailymotion ──────────────────────────────────────────────────────────
  m=u.match(/dailymotion\.com\/(?:video\/|embed\/video\/)([A-Za-z0-9]+)/);
  if(!m)m=u.match(/dai\.ly\/([A-Za-z0-9]+)/);
  if(m)return{type:'dailymotion',id:m[1],
    embedUrl:'https://www.dailymotion.com/embed/video/'+m[1]+'?autoplay=1&api=postMessage&id=nvframe',
    isEmbed:true};

  // ── Twitch ───────────────────────────────────────────────────────────────
  // VOD must come before channel (twitch.tv/videos/... vs twitch.tv/channel)
  m=u.match(/twitch\.tv\/videos\/(\d+)/);
  if(m)return{type:'twitch',id:'v'+m[1],
    embedUrl:`https://player.twitch.tv/?video=${m[1]}&parent=${location.hostname}&autoplay=true`,
    isEmbed:true};
  m=u.match(/twitch\.tv\/([A-Za-z0-9_]+)(?:[/?#]|$)/);
  if(m&&m[1]!=='videos')return{type:'twitch',id:m[1],
    embedUrl:`https://player.twitch.tv/?channel=${m[1]}&parent=${location.hostname}&autoplay=true`,
    isEmbed:true};

  // ── Facebook video ───────────────────────────────────────────────────────
  m=u.match(/facebook\.com\/(?:video(?:s\/|\?v=)|watch\/?\?v=)(\d+)/);
  if(m)return{type:'facebook',id:m[1],
    embedUrl:'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(u)+'&autoplay=1',
    isEmbed:true};

  // ── Explicit iframe prefix ───────────────────────────────────────────────
  if(u.startsWith('iframe:')){return{type:'iframe',id:null,embedUrl:u.slice(7),isEmbed:true};}

  // ── HLS manifest ─────────────────────────────────────────────────────────
  if(u.includes('.m3u8'))return{type:'hls',id:null,embedUrl:u,isEmbed:false};

  // ── DASH manifest ────────────────────────────────────────────────────────
  if(u.includes('.mpd'))return{type:'dash',id:null,embedUrl:u,isEmbed:false};

  // ── Native direct video file (mp4, webm, mkv, ogv, blob, etc.) ──────────
  if(/\.(mp4|webm|mkv|ogv|ogg|mov|avi|flv|wmv|ts)([\?#]|$)/i.test(u)||u.startsWith('blob:'))
    return{type:'native',id:null,embedUrl:u,isEmbed:false};

  // ── Any remaining .html / .htm URL → treat as generic embed page ─────────
  if(/\.(html|htm)([\?#]|$)/i.test(u))return{type:'jwpage',id:null,embedUrl:u,isEmbed:true,isJWPlatform:false};

  // ── URL with a hash fragment that looks like a video ID  ─────────────────
  // e.g. https://animewali.p2pplay.online/#s1k9bj  or  https://site.com/player#abc123
  if(u.includes('#')&&/https?:\/\//.test(u))return{type:'jwpage',id:null,embedUrl:u,isEmbed:true,isJWPlatform:false};

  // ── Fallback: if it's a full HTTP URL, embed it as generic iframe ────────
  if(/^https?:\/\//i.test(u))return{type:'jwpage',id:null,embedUrl:u,isEmbed:true,isJWPlatform:false};

  // ── Absolute last resort: native ─────────────────────────────────────────
  return{type:'native',id:null,embedUrl:u,isEmbed:false};
}

// ─── ADAPTER: abstract play/pause/seek/vol/time over any source ─────────────
const SRC_ADAPTER={
  _ytPlayer:null,_ytReady:false,_ytPoll:null,
  _jwReady:false,_jwPoll:null,
  _vimPoll:null,_dmPoll:null,
  _iframeEl:null,
  _hlsInstance:null,

  destroy(){
    cancelAnimationFrame(ST.raf);ST.raf=null;
    clearInterval(this._ytPoll);clearInterval(this._jwPoll);
    clearInterval(this._vimPoll);clearInterval(this._dmPoll);
    clearTimeout(this._jwFallbackTmr);
    if(this._jwMsgHandler){window.removeEventListener('message',this._jwMsgHandler);this._jwMsgHandler=null;}
    if(this._vimMsgHandler){window.removeEventListener('message',this._vimMsgHandler);this._vimMsgHandler=null;}
    if(this._dmMsgHandler){window.removeEventListener('message',this._dmMsgHandler);this._dmMsgHandler=null;}
    if(this._pgMsgHandler){window.removeEventListener('message',this._pgMsgHandler);this._pgMsgHandler=null;}
    this._ytPlayer=null;this._ytReady=false;
    this._jwReady=false;this._iframeEl=null;this._jwIsHosted=false;
    if(this._hlsInstance){this._hlsInstance.destroy();this._hlsInstance=null;}
  },

  // ── MOUNT a source into #nr ───────────────────────────────────────────
  mount(srcInfo,resumePos){
    this.destroy();
    ST.srcType=srcInfo.type;ST.adapterReady=false;ST.started=false;ST.ended=false;

    const nr=g('nr');if(!nr)return;
    // Remove any previous iframe
    const old=g('nvframe');if(old)old.remove();
    const vid=g('nvid');

    if(srcInfo.isEmbed){
      // Hide native video element
      if(vid){vid.style.display='none';vid.src='';}
      this._mountIframe(srcInfo,nr,resumePos);
    }else{
      // Show native video element
      if(vid)vid.style.display='';
      if(srcInfo.type==='hls')this._mountHLS(srcInfo.embedUrl,resumePos);
      else if(srcInfo.type==='dash')this._mountDASH(srcInfo.embedUrl,resumePos);
      else this._mountNative(srcInfo.embedUrl,resumePos);
    }
  },

  _mountNative(src,resumePos){
    const v=g('nvid');if(!v)return;
    v.src=src;v.load();
    if(resumePos>2)v.addEventListener('loadedmetadata',()=>{v.currentTime=resumePos;},{once:true});
    ST.adapterReady=true;
  },

  _mountHLS(src,resumePos){
    const v=g('nvid');if(!v)return;
    if(v.canPlayType('application/vnd.apple.mpegurl')){
      // Native HLS (Safari/iOS)
      v.src=src;v.load();
      if(resumePos>2)v.addEventListener('loadedmetadata',()=>{v.currentTime=resumePos;},{once:true});
      ST.adapterReady=true;
    }else if(typeof Hls!=='undefined'&&Hls.isSupported()){
      const hls=new Hls({startPosition:resumePos>2?resumePos:-1,enableWorker:true});
      this._hlsInstance=hls;
      hls.loadSource(src);hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{v.play().catch(()=>{});});
      hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal)sysMsg('Stream error',false);});
      ST.adapterReady=true;
    }else{
      // Fallback: try src directly (won't work in most browsers without HLS.js)
      v.src=src;v.load();ST.adapterReady=true;
      _loadHlsJs(()=>this._mountHLS(src,resumePos));
    }
  },

  _mountDASH(src,resumePos){
    const v=g('nvid');if(!v)return;
    if(typeof dashjs!=='undefined'){
      const player=dashjs.MediaPlayer().create();
      player.initialize(v,src,true);
      if(resumePos>2)setTimeout(()=>player.seek(resumePos),500);
      ST.adapterReady=true;
    }else{
      _loadDashJs(()=>this._mountDASH(src,resumePos));
    }
  },

  _mountIframe(srcInfo,nr,resumePos){
    const f=document.createElement('iframe');
    f.id='nvframe';f.src=srcInfo.embedUrl;
    f.allow='autoplay; fullscreen; encrypted-media; picture-in-picture';
    f.allowFullscreen=true;
    f.setAttribute('allowfullscreen','');
    f.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;z-index:2;background:#000';
    nr.appendChild(f);
    this._iframeEl=f;

    const nth=g('nth');if(nth)nth.style.display='none';

    switch(srcInfo.type){
      case'youtube': this._bridgeYouTube(f,srcInfo.id,resumePos); break;
      case'jwplayer': this._bridgeJWPlayer(f,resumePos,true); break;   // JW Platform hosted
      case'jwpage':   this._bridgeJWPlayer(f,resumePos,false); break;  // self-hosted JW page
      case'vimeo':    this._bridgeVimeo(f,resumePos); break;
      case'dailymotion': this._bridgeDailymotion(f,resumePos); break;
      case'twitch':   this._bridgeTwitch(f); break;
      default:        this._bridgeGenericIframe(f); break;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // YOUTUBE BRIDGE — uses IFrame Player API via postMessage
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeYouTube(iframe,videoId,resumePos){
    const self=this;
    // Load YT IFrame API if not yet loaded
    if(!window.YT||!window.YT.Player){
      if(!window._nvYTQueued){
        window._nvYTQueued=true;
        const s=document.createElement('script');
        s.src='https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
      const poll=setInterval(()=>{
        if(window.YT&&window.YT.Player){clearInterval(poll);self._initYTPlayer(iframe,videoId,resumePos);}
      },200);
      return;
    }
    this._initYTPlayer(iframe,videoId,resumePos);
  },

  _initYTPlayer(iframe,videoId,resumePos){
    const self=this;
    // Replace iframe with YT-managed one via the API
    const host=g('nvframe');
    if(host)host.removeAttribute('src');// let YT API own the iframe

    try{
      const ytEl=document.createElement('div');
      ytEl.id='nvyt';
      ytEl.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2';
      const nr=g('nr');if(nr){const old=g('nvframe');if(old)old.replaceWith(ytEl);else nr.appendChild(ytEl);}

      this._ytPlayer=new YT.Player('nvyt',{
        videoId,
        playerVars:{autoplay:1,controls:0,rel:0,modestbranding:1,playsinline:1,enablejsapi:1,
                    origin:location.origin,start:resumePos>2?Math.floor(resumePos):0},
        events:{
          onReady(e){
            self._ytReady=true;ST.adapterReady=true;
            e.target.setVolume(Math.round(ST.vol*100));
            if(ST.muted)e.target.mute();
            self._startYTPoll();
            ST.started=true;showUI();
            const nth=g('nth');if(nth)nth.style.display='none';
          },
          onStateChange(e){
            const YT_STATES={'-1':'unstarted','0':'ended','1':'playing','2':'paused','3':'buffering','5':'cued'};
            const s=e.data;
            if(s===YT.PlayerState.PLAYING){
              ST.playing=true;ST.ended=false;ST.started=true;
              const sp=g('nsp');if(sp)sp.classList.remove('ns');
              const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;
              showUI();hiTmr();
            }else if(s===YT.PlayerState.PAUSED){
              ST.playing=false;
              const cp=g('npl2');if(cp)cp.innerHTML=IC.play;
              showUI();
            }else if(s===YT.PlayerState.ENDED){
              ST.playing=false;ST.ended=true;
              clearInterval(self._ytPoll);
              const cp=g('npl2');if(cp)cp.innerHTML=IC.replay;
              _onEnded();
            }else if(s===YT.PlayerState.BUFFERING){
              const sp=g('nsp');if(sp)sp.classList.add('ns');
            }
          },
          onError(e){sysMsg('Video unavailable ('+e.data+')');}
        }
      });
      // Sync the _iframeEl ref to the actual YT iframe
      setTimeout(()=>{self._iframeEl=document.getElementById('nvyt')?.querySelector('iframe')||self._iframeEl;},800);
    }catch(err){
      console.error('YT Player init error',err);
      sysMsg('YouTube player failed');
    }
  },

  _startYTPoll(){
    const self=this;
    clearInterval(this._ytPoll);
    this._ytPoll=setInterval(()=>{
      if(!self._ytPlayer||!self._ytReady)return;
      try{
        ST.currentTime=self._ytPlayer.getCurrentTime()||0;
        ST.duration=self._ytPlayer.getDuration()||0;
        _tickUI();
        if(ST.duration>0)D.setProgress(_sid,_eid,Math.min(100,Math.round(ST.currentTime/ST.duration*100)));
        _savePos();
      }catch{}
    },500);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JW PLAYER BRIDGE — All versions, all deployment styles
  //
  // isHosted=true  → JW Platform iframe (cdn.jwplayer.com / content.jwplatform.com)
  //                  These support JW's own postMessage API natively.
  // isHosted=false → Self-hosted page running any JW Player version
  //                  (e.g. https://animewali.p2pplay.online/#s1k9bj)
  //                  We try all known postMessage formats and fall back gracefully.
  //
  // JW Player postMessage event formats across versions:
  //  v6 (Flash):   No postMessage support — pure iframe, show UI on load only.
  //  v7 hosted:    Sends {type:'jwpsrv_position',...} (internal analytics, not useful).
  //                Accepts {method:'play'},{method:'pause'},{method:'seek',value:t}
  //                via postMessage to the iframe origin.
  //  v7/v8 hosted: Sends {type:'ready'}, {type:'play'}, {type:'pause'},
  //                {type:'complete'}, {type:'time',position:N,duration:N},
  //                {type:'buffer'}, {type:'bufferFull'}, {type:'error',message:'...'}
  //                Accepts: {method:'play'}, {method:'pause'},
  //                {method:'seek',value:N}, {method:'setVolume',value:0-100},
  //                {method:'setPlaybackRate',value:N}
  //  v8 self:      player.js spec (embedly) — {context:'player.js',method:'play'} etc.
  //  Any version:  Falls back to showing iframe + UI overlay on iframe load.
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeJWPlayer(iframe,resumePos,isHosted){
    const self=this;
    self._jwIsHosted=!!isHosted;
    let apiResponded=false;      // did postMessage API respond at all?
    let fallbackFired=false;

    // ── Normalise a raw postMessage data payload ──────────────────────────
    // JW Player 7/8 hosted sends:  {type:'ready'|'play'|'time'|..., position, duration}
    // Some versions wrap in:        {event:'ready'|'play'|...}
    // player.js spec sends:         {context:'player.js', event:'ready'|'play'|...}
    // JW v7 internal analytics:     {type:'jwpsrv_position', playerId:'...'}  — skip
    function _parseJWMsg(raw){
      let d;
      try{d=typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}
      if(!d||typeof d!=='object')return null;
      // Skip JW internal analytics events (not player control events)
      if(d.type&&d.type.startsWith('jwpsrv'))return null;
      // Normalise event name to lowercase string
      const ev=(d.type||d.event||'').toLowerCase();
      // Normalise position/time
      const pos=d.position!=null?d.position:d.currentTime!=null?d.currentTime:d.time;
      const dur=d.duration!=null?d.duration:d.length;
      return{ev,pos,dur,raw:d};
    }

    // ── postMessage handler — covers JW v7/v8 hosted & player.js spec ─────
    const pmHandler=e=>{
      // Accept messages from the iframe's origin or wildcard
      const msg=_parseJWMsg(e.data);
      if(!msg)return;
      // Must come from our iframe (source check — but only if contentWindow available)
      if(e.source&&iframe.contentWindow&&e.source!==iframe.contentWindow)return;

      const{ev,pos,dur}=msg;

      if(ev==='ready'||ev==='playerready'){
        apiResponded=true;
        self._jwReady=true;ST.adapterReady=true;ST.started=true;
        // Send initial commands using all known JW formats
        if(resumePos>2){
          _jwSendAll(iframe,resumePos,'seek');
        }
        _jwSendAll(iframe,Math.round(ST.vol*100),'volume');
        const sp=g('nsp');if(sp)sp.classList.remove('ns');
        const nth=g('nth');if(nth)nth.style.display='none';
        showUI();
        self._startJWPoll(iframe);
        return;
      }
      if(ev==='play'||ev==='playing'||ev==='firstframe'){
        apiResponded=true;
        ST.playing=true;ST.ended=false;ST.started=true;
        const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;
        const sp=g('nsp');if(sp)sp.classList.remove('ns');
        const nth=g('nth');if(nth)nth.style.display='none';
        if(!ST.adapterReady){ST.adapterReady=true;showUI();}
        hiTmr();
        return;
      }
      if(ev==='pause'||ev==='idle'){
        apiResponded=true;
        ST.playing=false;
        const cp=g('npl2');if(cp)cp.innerHTML=IC.play;
        showUI();
        return;
      }
      if(ev==='complete'||ev==='ended'||ev==='finish'){
        apiResponded=true;
        ST.ended=true;ST.playing=false;
        _onEnded();
        return;
      }
      if(ev==='time'||ev==='timeupdate'||ev==='playProgress'){
        apiResponded=true;
        if(pos!=null)ST.currentTime=pos;
        if(dur!=null&&dur>0)ST.duration=dur;
        _tickUI();
        return;
      }
      if(ev==='buffer'||ev==='bufferchange'||ev==='stalled'){
        const sp=g('nsp');if(sp)sp.classList.add('ns');
        return;
      }
      if(ev==='bufferfull'||ev==='canplay'||ev==='loadeddata'){
        const sp=g('nsp');if(sp)sp.classList.remove('ns');
        return;
      }
      if(ev==='error'||ev==='setuperror'||ev==='mediaerror'){
        sysMsg('Player error'+(msg.raw.message?' — '+msg.raw.message:''),false);
        return;
      }
      // player.js spec getDuration response
      if(ev==='getduration'&&msg.raw.value!=null){
        ST.duration=msg.raw.value;_tickUI();
        return;
      }
      if(ev==='getcurrenttime'&&msg.raw.value!=null){
        ST.currentTime=msg.raw.value;_tickUI();
        return;
      }
      // Any message at all counts as the player being alive
      if(!apiResponded&&ev){
        apiResponded=true;
        ST.adapterReady=true;ST.started=true;
        showUI();
      }
    };
    window.addEventListener('message',pmHandler);
    self._jwMsgHandler=pmHandler;

    // ── On iframe load: send handshakes, start fallback timer ─────────────
    iframe.addEventListener('load',()=>{
      const sp=g('nsp');if(sp)sp.classList.add('ns');
      // Hide thumbnail once iframe starts loading
      const nth=g('nth');if(nth)nth.style.display='none';

      // Try all JW handshake formats with staggered delays
      // — JW 8 hosted format
      setTimeout(()=>_jwSendAll(iframe,null,'ping'),300);
      // — player.js spec addEventListener
      setTimeout(()=>{
        try{
          iframe.contentWindow.postMessage(
            JSON.stringify({context:'player.js',version:'0.0.11',method:'addEventListener',value:'ready',listener:'nv_ready'}),
            '*');
          iframe.contentWindow.postMessage(
            JSON.stringify({context:'player.js',version:'0.0.11',method:'addEventListener',value:'play',listener:'nv_play'}),
            '*');
          iframe.contentWindow.postMessage(
            JSON.stringify({context:'player.js',version:'0.0.11',method:'addEventListener',value:'timeupdate',listener:'nv_time'}),
            '*');
          iframe.contentWindow.postMessage(
            JSON.stringify({context:'player.js',version:'0.0.11',method:'addEventListener',value:'ended',listener:'nv_ended'}),
            '*');
          iframe.contentWindow.postMessage(
            JSON.stringify({context:'player.js',version:'0.0.11',method:'addEventListener',value:'pause',listener:'nv_pause'}),
            '*');
        }catch{}
      },500);

      // ── Fallback: if no postMessage response after 3 s, mark ready anyway ─
      // (covers JW v6 Flash, pages that block postMessage, or any unknown player)
      self._jwFallbackTmr=setTimeout(()=>{
        if(!fallbackFired){
          fallbackFired=true;
          if(!ST.adapterReady){
            ST.adapterReady=true;ST.started=true;
            const sp2=g('nsp');if(sp2)sp2.classList.remove('ns');
            // Since we have no time API, hide seekbar on non-hosted pages
            if(!self._jwIsHosted){
              const nr=g('nr');if(nr)nr.classList.add('nv-no-seek');
            }
            showUI();
          }
        }
      },3000);
    });
  },

  _startJWPoll(iframe){
    const self=this;
    clearInterval(this._jwPoll);
    this._jwPoll=setInterval(()=>{
      if(!self._jwReady)return;
      // Poll for current time using all known formats
      try{
        // JW 8 hosted
        iframe.contentWindow.postMessage(JSON.stringify({method:'getPosition'}),'*');
        // player.js spec
        iframe.contentWindow.postMessage(
          JSON.stringify({context:'player.js',version:'0.0.11',method:'getCurrentTime',listener:'nv_ct'}),'*');
      }catch{}
      _tickUI();
      if(ST.duration>0)D.setProgress(_sid,_eid,Math.min(100,Math.round(ST.currentTime/ST.duration*100)));
      _savePos();
    },800);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VIMEO BRIDGE — Vimeo Player API via postMessage
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeVimeo(iframe,resumePos){
    const self=this;
    const pmHandler=e=>{
      if(e.source!==iframe.contentWindow)return;
      let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data;}catch{return;}
      if(!d)return;
      if(d.event==='ready'){
        ST.adapterReady=true;ST.started=true;
        _vimSend(iframe,'addEventListener','play');
        _vimSend(iframe,'addEventListener','pause');
        _vimSend(iframe,'addEventListener','ended');
        _vimSend(iframe,'addEventListener','timeupdate');
        _vimSend(iframe,'addEventListener','bufferstart');
        _vimSend(iframe,'addEventListener','bufferend');
        if(resumePos>2)_vimSend(iframe,'setCurrentTime',resumePos);
        _vimSend(iframe,'setVolume',ST.vol);
        showUI();self._startVimPoll(iframe);
      }
      if(d.event==='play'){ST.playing=true;ST.ended=false;const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;showUI();hiTmr();}
      if(d.event==='pause'){ST.playing=false;const cp=g('npl2');if(cp)cp.innerHTML=IC.play;showUI();}
      if(d.event==='ended'){ST.ended=true;ST.playing=false;_onEnded();}
      if(d.event==='timeupdate'){if(d.data){if(d.data.seconds!=null)ST.currentTime=d.data.seconds;if(d.data.duration!=null)ST.duration=d.data.duration;_tickUI();}}
      if(d.event==='bufferstart'){const sp=g('nsp');if(sp)sp.classList.add('ns');}
      if(d.event==='bufferend'){const sp=g('nsp');if(sp)sp.classList.remove('ns');}
    };
    window.addEventListener('message',pmHandler);
    this._vimMsgHandler=pmHandler;
    iframe.addEventListener('load',()=>{
      setTimeout(()=>{_vimSend(iframe,'ping',null);},800);
      setTimeout(()=>{if(!ST.adapterReady){ST.adapterReady=true;ST.started=true;showUI();}},4000);
    });
  },

  _startVimPoll(iframe){
    const self=this;
    clearInterval(this._vimPoll);
    this._vimPoll=setInterval(()=>{
      _tickUI();
      if(ST.duration>0)D.setProgress(_sid,_eid,Math.min(100,Math.round(ST.currentTime/ST.duration*100)));
      _savePos();
    },500);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DAILYMOTION BRIDGE — postMessage API
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeDailymotion(iframe,resumePos){
    const pmHandler=e=>{
      let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data;}catch{return;}
      if(!d||!d.event)return;
      if(d.event==='apiready'){
        ST.adapterReady=true;ST.started=true;
        if(resumePos>2)_dmSend(iframe,'seek',resumePos);
        showUI();
      }
      if(d.event==='play'){ST.playing=true;const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;showUI();hiTmr();}
      if(d.event==='pause'){ST.playing=false;const cp=g('npl2');if(cp)cp.innerHTML=IC.play;showUI();}
      if(d.event==='end'){ST.ended=true;ST.playing=false;_onEnded();}
      if(d.event==='timeupdate'){if(d.time!=null)ST.currentTime=d.time;if(d.duration!=null)ST.duration=d.duration;_tickUI();}
      if(d.event==='waiting'){const sp=g('nsp');if(sp)sp.classList.add('ns');}
      if(d.event==='playing'){const sp=g('nsp');if(sp)sp.classList.remove('ns');}
    };
    window.addEventListener('message',pmHandler);
    this._dmMsgHandler=pmHandler;
    iframe.addEventListener('load',()=>setTimeout(()=>{if(!ST.adapterReady){ST.adapterReady=true;ST.started=true;showUI();}},4000));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TWITCH — no public postMessage API; just show UI on load
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeTwitch(iframe){
    iframe.addEventListener('load',()=>{ST.adapterReady=true;ST.started=true;showUI();});
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GENERIC IFRAME — minimal: show UI on load, hide spinner
  // ─────────────────────────────────────────────────────────────────────────
  _bridgeGenericIframe(iframe){
    iframe.addEventListener('load',()=>{
      ST.adapterReady=true;ST.started=true;
      const sp=g('nsp');if(sp)sp.classList.remove('ns');
      const nth=g('nth');if(nth)nth.style.display='none';
      showUI();
    });
  },

  // ─── UNIFIED CONTROLS (called by Nova's UI buttons) ───────────────────
  play(){
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){this._ytPlayer.playVideo();return;}
    if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){_jwSendAll(this._iframeEl,null,'play');return;}
    if(ST.srcType==='vimeo'&&this._iframeEl){_vimSend(this._iframeEl,'play',null);return;}
    if(ST.srcType==='dailymotion'&&this._iframeEl){_dmSend(this._iframeEl,'play');return;}
    const v=g('nvid');if(v)v.play().catch(()=>{});
  },

  pause(){
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){this._ytPlayer.pauseVideo();return;}
    if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){_jwSendAll(this._iframeEl,null,'pause');return;}
    if(ST.srcType==='vimeo'&&this._iframeEl){_vimSend(this._iframeEl,'pause',null);return;}
    if(ST.srcType==='dailymotion'&&this._iframeEl){_dmSend(this._iframeEl,'pause');return;}
    const v=g('nvid');if(v)v.pause();
  },

  seekTo(t){
    t=Math.max(0,t);
    ST.currentTime=t;
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){this._ytPlayer.seekTo(t,true);return;}
    if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){_jwSendAll(this._iframeEl,t,'seek');return;}
    if(ST.srcType==='vimeo'&&this._iframeEl){_vimSend(this._iframeEl,'setCurrentTime',t);return;}
    if(ST.srcType==='dailymotion'&&this._iframeEl){_dmSend(this._iframeEl,'seek',t);return;}
    const v=g('nvid');if(v&&isFinite(v.duration))v.currentTime=Math.min(v.duration,t);
  },

  seekBy(d){
    const t=ST.currentTime+d;
    nudge((d>0?'+':'')+d+'s',d>0?'r':'l');
    this.seekTo(t);
  },

  setVolume(v){
    v=Math.max(0,Math.min(1,v));ST.vol=v;ST.muted=v===0;
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){
      this._ytPlayer.setVolume(Math.round(v*100));
      v===0?this._ytPlayer.mute():this._ytPlayer.unMute();
    }else if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){
      _jwSendAll(this._iframeEl,Math.round(v*100),'volume');
    }else if(ST.srcType==='vimeo'&&this._iframeEl){
      _vimSend(this._iframeEl,'setVolume',v);
    }else{
      const vid=g('nvid');if(vid){vid.volume=v;vid.muted=ST.muted;}
    }
    _showGst('vol');
  },

  mute(m){
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){m?this._ytPlayer.mute():this._ytPlayer.unMute();return;}
    if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){
      _jwSendAll(this._iframeEl,m?0:Math.round(ST.vol*100),'volume');return;
    }
    const vid=g('nvid');if(vid)vid.muted=m;
  },

  setSpeed(v){
    if(ST.srcType==='youtube'&&this._ytPlayer&&this._ytReady){this._ytPlayer.setPlaybackRate(v);return;}
    if((ST.srcType==='jwplayer'||ST.srcType==='jwpage')&&this._iframeEl){_jwSendAll(this._iframeEl,v,'speed');return;}
    // Vimeo and others don't reliably support speed via postMessage; fall through
    const vid=g('nvid');if(vid)vid.playbackRate=v;
  },

  getCurrentTime(){return ST.currentTime||0;},
  getDuration(){return ST.duration||0;},
  isPaused(){return !ST.playing;}
};

// ─── postMessage helpers ─────────────────────────────────────────────────

/**
 * _jwSendAll — Send a command to a JW Player iframe using ALL known formats
 * simultaneously so it works regardless of JW version or hosting style.
 *
 * action: 'play' | 'pause' | 'seek' | 'volume' | 'speed' | 'ping'
 * value:  number for seek/volume/speed, null for play/pause/ping
 */
function _jwSendAll(iframe,value,action){
  if(!iframe||!iframe.contentWindow)return;
  const cw=iframe.contentWindow;
  try{
    // ── Format 1: JW Player 8 hosted API ──────────────────────────────────
    // {method:'play'} {method:'pause'} {method:'seek',value:N}
    // {method:'setVolume',value:0-100} {method:'setPlaybackRate',value:N}
    const jw8={};
    if(action==='play')jw8.method='play';
    else if(action==='pause')jw8.method='pause';
    else if(action==='seek'){jw8.method='seek';jw8.value=value;}
    else if(action==='volume'){jw8.method='setVolume';jw8.value=value;}
    else if(action==='speed'){jw8.method='setPlaybackRate';jw8.value=value;}
    else if(action==='ping'){jw8.method='getPlayerState';}
    if(jw8.method)cw.postMessage(JSON.stringify(jw8),'*');

    // ── Format 2: player.js / embedly spec ────────────────────────────────
    // {context:'player.js', version:'0.0.11', method:'play'|'pause'|'seek', value:N}
    const pj={context:'player.js',version:'0.0.11'};
    if(action==='play')pj.method='play';
    else if(action==='pause')pj.method='pause';
    else if(action==='seek'){pj.method='setCurrentTime';pj.value=value;}
    else if(action==='volume'){pj.method='setVolume';pj.value=value/100;}// player.js uses 0-1
    else if(action==='speed'){pj.method='setPlaybackRate';pj.value=value;}
    else if(action==='ping'){pj.method='addEventListener';pj.value='ready';pj.listener='nv_r';}
    if(pj.method)cw.postMessage(JSON.stringify(pj),'*');

    // ── Format 3: JW Player 7 direct method call ──────────────────────────
    // Some v7 builds accept {method:'play'} without the wrapper
    // We already covered this in Format 1, but also try old-style string
    if(action==='play')cw.postMessage('play','*');
    else if(action==='pause')cw.postMessage('pause','*');
  }catch{}
}

// Legacy single-format send (kept for _bridgeJWPlayer internal use)
function _jwSend(iframe,data){
  try{iframe.contentWindow.postMessage(JSON.stringify(data),'*');}catch{}
}

function _vimSend(iframe,method,value){try{iframe.contentWindow.postMessage(JSON.stringify({method,value}),'https://player.vimeo.com');}catch{}}
function _dmSend(iframe,command,value){try{iframe.contentWindow.postMessage(JSON.stringify(value!=null?{command,parameters:value}:{command}),'https://www.dailymotion.com');}catch{}}

// ─── Lazy HLS/DASH loaders ───────────────────────────────────────────────
function _loadHlsJs(cb){
  if(window.Hls){cb();return;}
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
  s.onload=cb;document.head.appendChild(s);
}
function _loadDashJs(cb){
  if(window.dashjs){cb();return;}
  const s=document.createElement('script');
  s.src='https://cdn.dashjs.org/latest/dash.all.min.js';
  s.onload=cb;document.head.appendChild(s);
}

// ─── shared ended handler ────────────────────────────────────────────────
function _onEnded(){
  try{localStorage.removeItem(_lsKey(_sid,_eid));}catch{}
  const cp=g('npl2');if(cp)cp.innerHTML=IC.replay;
  const i=_pl.findIndex(x=>x.id===_eid);
  if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);
  else{ST.playing=false;ST.ended=true;showUI();}
}

// ─── tick: update seekbar + timer ───────────────────────────────────────
function _tickUI(){
  const d=ST.duration,c=ST.currentTime,f=d?c/d:0;
  const sf=g('nsf'),sth=g('nsth'),ntm=g('ntm');
  if(sf)sf.style.width=(f*100)+'%';
  if(sth)sth.style.left=(f*100)+'%';
  if(ntm){const r=d-c;ntm.textContent=r>0?fT(r):'0:00';}
  if(_updSkip)_updSkip();
}

// ═══════════════════════════════════════════════════════════════════════════
//  CSS INJECTION
// ═══════════════════════════════════════════════════════════════════════════
function injectCSS(){
if(_si)return;_si=true;
const s=document.createElement('style');
s.textContent=`
#nr{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;outline:none}
#nr.nrfs{position:fixed;inset:0;width:100%;height:100%;aspect-ratio:unset;border-radius:0!important;z-index:10000}
#nvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;-webkit-user-select:none;user-select:none;pointer-events:none}
#nvframe,#nvyt{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:2;background:#000}
#nvyt iframe{position:absolute;inset:0;width:100%;height:100%}
#nth{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;pointer-events:none;display:block;background:#111}
#nov{position:absolute;inset:0;z-index:3;cursor:pointer}
#nov::before{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(0,0,0,.8),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
#nov::after{content:'';position:absolute;bottom:0;left:0;right:0;height:55%;background:linear-gradient(to top,rgba(0,0,0,.92),transparent);opacity:0;transition:opacity .3s;pointer-events:none}
#nct.nv~#nov::before,#nb.nv~#nov::after{opacity:1}
#nsp{position:absolute;top:50%;left:50%;z-index:12;width:52px;height:52px;margin:-26px;border:4px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s}
#nsp.ns{opacity:1;animation:nvSpin .75s linear infinite}
@keyframes nvSpin{to{transform:rotate(360deg)}}
#nsh2{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:14;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:17px;font-weight:700;padding:12px 28px;border-radius:99px;opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;text-align:center}
#nsh2.ns{opacity:1}
/* Source badge */
#nsrc-badge{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.8);font-size:11px;font-weight:700;padding:4px 14px;border-radius:99px;letter-spacing:.08em;pointer-events:none;opacity:0;transition:opacity .3s}
#nct.nv~#nsrc-badge{opacity:1}
#nnl,#nnr{position:absolute;top:50%;transform:translateY(-50%);z-index:14;color:#fff;font-size:22px;font-weight:800;opacity:0;pointer-events:none;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.9)}
#nnl{left:12%}#nnr{right:12%;text-align:right}
.snp{animation:nvNudge .7s ease forwards}
@keyframes nvNudge{0%{opacity:1;transform:translateY(-50%) scale(.9)}40%{opacity:1;transform:translateY(-65%) scale(1.08)}100%{opacity:0;transform:translateY(-82%) scale(1)}}
#nct{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px;opacity:0;transform:translateY(-8px);transition:opacity .28s,transform .28s;pointer-events:none}
#nct.nv{opacity:1;transform:none;pointer-events:auto}
#nct-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
#nct-title{display:none;flex-direction:column;gap:2px;min-width:0;flex:1}
#nct-title-main{font-size:16px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
#nct-title-sub{font-size:13px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nr.nrfs #nct-title{display:flex}
#nct-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.nct-fs-only{display:none!important}
#nr.nrfs .nct-fs-only{display:flex!important;align-items:center;justify-content:center}
.nct-nofs-only{display:flex;align-items:center;justify-content:center}
#nr.nrfs .nct-nofs-only{display:none!important}
#ncc{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .28s}
#ncc.nv{opacity:1;pointer-events:auto}
#npl2{display:flex;align-items:center;justify-content:center;width:80px;height:80px;border:none;background:rgba(0,0,0,.35);border-radius:50%;color:#fff;cursor:pointer;transition:transform .12s,background .15s;flex-shrink:0;backdrop-filter:blur(4px)}
#npl2 svg{width:42px;height:42px}
#npl2:active{transform:scale(.88);background:rgba(0,0,0,.55)}
/* Hide centre controls for embed-only sources (Twitch etc has own controls) */
#nr.nv-embed-basic #ncc{display:none!important}
#nb{position:absolute;bottom:0;left:0;right:0;z-index:20;padding:0;display:flex;flex-direction:column;gap:0;pointer-events:auto;transition:opacity .28s}
#nb-time-row,#nbrow-fs,#nbpeek{opacity:0;transition:opacity .28s;pointer-events:none}
#nb.nv #nb-time-row,#nb.nv #nbrow-fs,#nb.nv #nbpeek{opacity:1;pointer-events:auto}
#nbseek{pointer-events:auto;opacity:1;transition:opacity .28s}
#nr.nrfs #nb{opacity:0;pointer-events:none}
#nr.nrfs #nb.nv{opacity:1;pointer-events:auto}
#nr.nrfs #nb-time-row,#nr.nrfs #nbrow-fs,#nr.nrfs #nbpeek{opacity:1;pointer-events:auto}
/* Hide seekbar/time for sources with no time API (Twitch) */
#nr.nv-no-seek #nbseek,#nr.nv-no-seek #nb-time-row{display:none}
#nb-time-row{display:flex;justify-content:flex-end;padding:0 16px 6px;pointer-events:none}
#ntm{font-size:18px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.8)}
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
#nsh{position:absolute;bottom:calc(100% + 8px);background:rgba(0,0,0,.88);color:#fff;font-size:12px;font-weight:700;padding:4px 9px;border-radius:6px;opacity:0;transform:translateX(-50%);pointer-events:none;white-space:nowrap}
#nbrow-fs{display:none;align-items:center;justify-content:space-between;padding:6px 16px 4px}
#nr.nrfs #nbrow-fs{display:flex}
.nbfs-left,.nbfs-right{display:flex;gap:6px;align-items:center}
.nbfs-btn{display:flex;align-items:center;gap:8px;background:none;border:none;color:rgba(255,255,255,.88);font-size:14px;font-weight:600;cursor:pointer;padding:8px 6px;white-space:nowrap;font-family:inherit;transition:color .15s;letter-spacing:.01em}
.nbfs-btn svg{width:20px;height:20px;flex-shrink:0}
.nbfs-btn:hover{color:#fff}
.nbfs-btn:active{opacity:.7}
#nbpeek{display:none;overflow-x:auto;padding:6px 16px 0;scrollbar-width:none;gap:8px}
#nbpeek::-webkit-scrollbar{display:none}
#nr.nrfs #nbpeek{display:flex}
.nbpeek-ep{flex-shrink:0;width:110px;cursor:pointer}
.nbpeek-ep-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;border:2px solid rgba(255,255,255,.15);transition:border-color .2s}
.nbpeek-ep.act .nbpeek-ep-img,.nbpeek-ep:hover .nbpeek-ep-img{border-color:#fff}
.nb{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:none;background:transparent;color:#fff;cursor:pointer;transition:background .18s,transform .1s;flex-shrink:0}
.nb:hover{background:rgba(255,255,255,.12)}.nb:active{transform:scale(.84)}
.nb svg{width:24px;height:24px;pointer-events:none}
.nct-back svg{width:22px;height:22px}
#ng-left,#ng-right{position:absolute;top:0;bottom:0;width:22%;z-index:3;display:none}
#nr.nrfs #ng-left,#nr.nrfs #ng-right{display:block}
#ng-left{left:0}#ng-right{right:0}
#ng-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:15;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px;font-weight:700;padding:10px 22px;border-radius:99px;display:none;align-items:center;gap:10px;opacity:0;pointer-events:none;transition:opacity .2s;white-space:nowrap}
#nr.nrfs #ng-toast{display:flex}
#ng-toast.ns{opacity:1}
#ng-toast svg{width:20px;height:20px;flex-shrink:0}
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
#nskip{position:absolute;right:18px;z-index:25;bottom:calc(100% + 8px);display:none;align-items:center;gap:8px;background:rgba(10,10,20,.85);backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,.35);color:#fff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;cursor:pointer;white-space:nowrap;font-family:inherit;letter-spacing:.02em;transition:background .18s,transform .12s}
#nskip.vis{display:flex}
#nskip:hover{background:rgba(255,255,255,.15)}
#nskip:active{transform:scale(.95)}
`;
document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const g=id=>document.getElementById(id);
let el={},_nt=null;
const fT=t=>{if(!isFinite(t))return'0:00';const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};

function nudge(txt,side){const t=side==='l'?el.nul:el.nur;if(!t)return;t.textContent=txt;t.classList.remove('snp');void t.offsetWidth;t.classList.add('snp');clearTimeout(_nt);_nt=setTimeout(()=>[el.nul,el.nur].forEach(x=>x&&x.classList.remove('snp')),750);}
function sysMsg(msg,persist){if(!el.sh2)return;el.sh2.textContent=msg;el.sh2.classList.add('ns');if(!persist){clearTimeout(ST.sysTmr);ST.sysTmr=setTimeout(()=>el.sh2&&el.sh2.classList.remove('ns'),2200);}}
function clearSysMsg(){clearTimeout(ST.sysTmr);if(el.sh2)el.sh2.classList.remove('ns');}

function showUI(){if(!ST.started&&!ST.adapterReady)return;ST.uiFull=true;el.bot&&el.bot.classList.add('nv');el.ct&&el.ct.classList.add('nv');el.cc&&el.cc.classList.add('nv');_updSkip();hiTmr();}
function hideUI(){if(!ST.started||ST.fsOvOpen)return;ST.uiFull=false;[el.ct,el.cc].forEach(x=>x&&x.classList.remove('nv'));if(el.bot)el.bot.classList.remove('nv');}
function hiTmr(){clearTimeout(ST.uiTmr);if(ST.playing&&!ST.fsOvOpen)ST.uiTmr=setTimeout(hideUI,CFG.uiHide);}

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS / PLAYLIST OVERLAYS (unchanged logic, same as v7)
// ═══════════════════════════════════════════════════════════════════════════
function openFsOv(tab){ST.fsOvOpen=true;_setFsOvTab(tab||'quality');clearTimeout(ST.uiTmr);SRC_ADAPTER.pause();const ov=g('nfsov');if(ov)ov.classList.add('on');}
function closeFsOv(){ST.fsOvOpen=false;const ov=g('nfsov');if(ov)ov.classList.remove('on');SRC_ADAPTER.play();showUI();}
function _setFsOvTab(t){ST.fsOvTab=t;document.querySelectorAll('.nfsov-tab').forEach(x=>x.classList.toggle('act',x.dataset.tab===t));_renderFsOvBody();}
function _renderFsOvBody(){
  const body=g('nfsov-body');if(!body)return;
  const tr=(_ep&&_ep.tracks)||{},caps=(_ep&&_ep.captions)||[],chs=(_ep&&_ep.chapters)||[];
  body.innerHTML='';
  if(ST.fsOvTab==='quality'){
    const langs=Object.keys(tr),qs=langs.length?Object.keys(tr[ST.lang]||tr[langs[0]]):[];
    // For embed sources, show a note
    if(!qs.length){body.innerHTML='<p style="padding:32px 22px;color:rgba(255,255,255,.35);font-size:15px;text-align:center">Quality controlled by the source player</p>';return;}
    qs.forEach(q=>{body.insertAdjacentHTML('beforeend',_fsItem(q,'',q===ST.qual,`NV._setQual('${q}')`,q==='1080p'?'HD':q==='4K'?'Ultra HD':''));});
  }else if(ST.fsOvTab==='audio'){
    const langs=Object.keys(tr);
    if(!langs.length){body.innerHTML='<p style="padding:32px 22px;color:rgba(255,255,255,.35);font-size:15px;text-align:center">Audio controlled by the source player</p>';return;}
    langs.forEach((lk,i)=>{body.insertAdjacentHTML('beforeend',_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,'')); });
  }else if(ST.fsOvTab==='subtitles'){
    const langsList=Object.keys(tr);
    let html=`<div class="nfsov-2col"><div class="nfsov-col"><div class="nfsov-col-hd">AUDIO</div>`;
    if(langsList.length){langsList.forEach((lk,i)=>{html+=_fsItem(D.langLabels[lk]||lk.toUpperCase(),i===0?'Original':'',lk===ST.lang,`NV._setLang('${lk}')`,'')} );}
    else{html+='<p style="padding:16px 22px;color:rgba(255,255,255,.35);font-size:13px">Source controlled</p>';}
    html+=`</div><div class="nfsov-col"><div class="nfsov-col-hd">SUBTITLES</div>`;
    html+=_fsItem('Off','',_noSub(),`NV._setSub(null)`,'');
    caps.forEach(c=>{html+=_fsItem(c.label||c.lang,'',_subAct(c.lang),`NV._setSub('${c.lang}')`,'')} );
    html+=`</div></div>`;body.innerHTML=html;return;
  }else if(ST.fsOvTab==='chapters'){
    if(!chs.length){body.innerHTML='<p style="padding:32px 22px;color:rgba(255,255,255,.35);font-size:15px;text-align:center">No chapters available</p>';return;}
    const ct=ST.currentTime;
    chs.forEach((ch,i)=>{const next=chs[i+1];const cur=ct>=ch.t&&(!next||ct<next.t);body.insertAdjacentHTML('beforeend',`<div class="nfsov-item-ch${cur?' act':''}" onclick="NV._seekTo(${ch.t})"><div class="nfsov-ch-dot"></div><span class="nfsov-ch-time">${fT(ch.t)}</span><span class="nfsov-ch-lbl">${ch.title}</span></div>`);});
  }else if(ST.fsOvTab==='speed'){
    // Speed only available for native/hls/dash and youtube
    // Speed only available for native/hls/dash and youtube/jwplayer with API confirmed
    const noSpd=ST.srcType==='twitch'||ST.srcType==='facebook'||ST.srcType==='dailymotion'||ST.srcType==='iframe'||(ST.srcType==='jwpage'&&!SRC_ADAPTER._jwReady);
    if(noSpd){body.innerHTML='<p style="padding:32px 22px;color:rgba(255,255,255,.35);font-size:15px;text-align:center">Speed control not available for this source</p>';return;}
    CFG.speeds.forEach(v=>{body.insertAdjacentHTML('beforeend',_fsItem(v+'×','',v===ST.spd,`NV._fsSetSpd(${v})`,''));});
  }
}
function _fsItem(lbl,sub,act,onclick){return`<div class="nfsov-item${act?' act':''}" onclick="${onclick}"><div class="nfsov-item-check">${IC.check}</div><div class="nfsov-item-texts"><span class="nfsov-item-lbl">${lbl}</span>${sub?`<span class="nfsov-item-sub">${sub}</span>`:''}</div></div>`;}
const _noSub=()=>!el.vid||Array.from(el.vid.textTracks||[]).every(t=>t.mode!=='showing');
const _subAct=l=>!!(el.vid&&Array.from(el.vid.textTracks||[]).find(t=>t.srclang===l&&t.mode==='showing'));

function openFspl(tab){ST.fsOvOpen=true;_fsplCurTab=tab||'episodes';clearTimeout(ST.uiTmr);SRC_ADAPTER.pause();const ov=g('nfspl');if(ov)ov.classList.add('on');_renderFsplTabs();_renderFsplBody();}
function closeFspl(){ST.fsOvOpen=false;const ov=g('nfspl');if(ov)ov.classList.remove('on');SRC_ADAPTER.play();showUI();}
function _renderFsplTabs(){
  const tabs=g('nfspl-tabs');if(!tabs)return;
  tabs.innerHTML=['watchnext','episodes'].map(t=>`<div class="nfspl-tab${_fsplCurTab===t?' act':''}" onclick="NV._fsplSetTab('${t}')">${t==='watchnext'?'Watch Next':'Episodes'}</div>`).join('')
  +`<button class="nb" id="nfspl-close-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">${IC.close}</button>`;
  const cb=g('nfspl-close-btn');if(cb)cb.onclick=e=>{e.stopPropagation();closeFspl();};
}
function _renderFsplBody(){
  const body=g('nfspl-body');if(!body)return;body.innerHTML='';
  if(_fsplCurTab==='watchnext'){
    const cw=D.getContinueWatching().filter(x=>x.show.id!==_sid).slice(0,14);
    const row=document.createElement('div');row.className='nfspl-eprow';
    cw.forEach(({show:s,ep,pct})=>{const mv=!!s.isMovie;row.innerHTML+=`<div class="nfspl-ep" onclick="NV._fsplPlay('${s.id}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||s.thumb||''}"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${s.title}</div><div class="nfspl-ep-meta">${mv?ep.dur:`S${ep.s} E${ep.e}`}</div></div>`;});
    if(!cw.length)row.innerHTML='<p style="padding:28px 16px;color:rgba(255,255,255,.35);font-size:15px">Nothing in progress</p>';
    body.appendChild(row);
  }else{
    const s=D.getShow(_sid);if(!s)return;
    const seasons=[...new Set(s.episodes.map(e=>e.s))];
    if(seasons.length>1){const stabs=document.createElement('div');stabs.id='nfspl-seasons';seasons.forEach(sn=>{stabs.innerHTML+=`<div class="nfspl-stab${sn===_fsplCurSeason?' act':''}" onclick="NV._fsplSetSeason(${sn})">Season ${sn}</div>`;});body.appendChild(stabs);}
    const row=document.createElement('div');row.className='nfspl-eprow';
    s.episodes.filter(e=>e.s===_fsplCurSeason).forEach(ep=>{const pct=D.getProgress(_sid,ep.id),act=ep.id===_eid;row.innerHTML+=`<div class="nfspl-ep${act?' act':''}" onclick="NV._fsplPlay('${_sid}','${ep.id}')"><div class="nfspl-ep-tw"><img src="${ep.thumb||''}"><div class="nfspl-ep-play">${IC.playCircle}</div><div class="nfspl-ep-pb"><div class="nfspl-ep-pbf" style="width:${pct}%"></div></div></div><div class="nfspl-ep-title">${ep.title}</div><div class="nfspl-ep-meta">S${ep.s} E${ep.e} · ${ep.date} · ${ep.dur}</div><div class="nfspl-ep-desc">${ep.desc||''}</div></div>`;});
    body.appendChild(row);
  }
}

// ─── common helpers ──────────────────────────────────────────────────────
function tPlay(){
  if(ST.ended){SRC_ADAPTER.seekTo(0);SRC_ADAPTER.play();ST.ended=false;}
  else if(ST.playing){SRC_ADAPTER.pause();}
  else{SRC_ADAPTER.play();}
}
function seek(d){SRC_ADAPTER.seekBy(d);}
function adjSpd(dir){const idx=CFG.speeds.indexOf(ST.spd),ni=Math.max(0,Math.min(CFG.speeds.length-1,idx+dir));_fsSetSpd(CFG.speeds[ni]);}
function setVol(v){SRC_ADAPTER.setVolume(v);}
function tMute(){ST.muted=!ST.muted;SRC_ADAPTER.mute(ST.muted);}
function _fsSetSpd(v){ST.spd=v;SRC_ADAPTER.setSpeed(v);const b=g('nspd-lbl');if(b)b.textContent=v+'x';sysMsg(v+'× speed');if(ST.fsOvTab==='speed')_renderFsOvBody();}
function _setQual(q){loadTrk(ST.lang,q,true);_renderFsOvBody();}
function _setLang(l){loadTrk(l,ST.qual,true);_renderFsOvBody();}
function _setSub(lang){if(!el.vid)return;Array.from(el.vid.textTracks).forEach(t=>t.mode='hidden');if(lang){const trk=Array.from(el.vid.textTracks).find(t=>t.srclang===lang);if(trk)trk.mode='showing';}_renderFsOvBody();}
function _seekTo(t){SRC_ADAPTER.seekTo(t);closeFsOv();}
function _fsplSetTab(t){_fsplCurTab=t;_renderFsplTabs();_renderFsplBody();}
function _fsplSetSeason(s){_fsplCurSeason=s;_renderFsplBody();}
function _fsplPlay(sid,eid){closeFspl();R.ep(sid,eid);}

function _showGst(type){
  const v=type==='vol'?ST.vol:ST.bright;const pct=Math.round(v*100);
  const toast=g('ng-toast');
  if(toast){toast.innerHTML=(type==='vol'?IC.volumeUp:IC.brightness)+`<span>${pct}%</span>`;toast.classList.add('ns');clearTimeout(ST.gtTmr);ST.gtTmr=setTimeout(()=>{if(toast)toast.classList.remove('ns');},1600);}
}

function sFrac(f){SRC_ADAPTER.seekTo(f*ST.duration);}
function fFrac(e){const sw=g('nsw');if(!sw)return 0;const r=sw.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.max(0,Math.min(1,(x-r.left)/r.width));}

// ─── native video tick ───────────────────────────────────────────────────
function tick(){
  const v=g('nvid');
  if(v&&ST.srcType==='native'||ST.srcType==='hls'||ST.srcType==='dash'){
    const d=v?v.duration||0:0,c=v?v.currentTime||0:0;
    ST.duration=d;ST.currentTime=c;
    const f=d?c/d:0;
    const sf=g('nsf'),sth=g('nsth'),sbuf=g('nsbuf'),ntm=g('ntm');
    if(sf)sf.style.width=(f*100)+'%';
    if(sth)sth.style.left=(f*100)+'%';
    if(ntm){const r=d-c;ntm.textContent=r>0?fT(r):'0:00';}
    if(sbuf&&v&&v.buffered.length&&d>0){let b=0;for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=c&&v.buffered.end(i)>=c){b=v.buffered.end(i);break;}sbuf.style.width=(b/d*100)+'%';}
    if(d>0){D.setProgress(_sid,_eid,Math.min(100,Math.round(f*100)));_savePos();}
  }else{
    // For embed sources, tickUI driven by adapter polls
    _tickUI();
  }
  _updSkip();
  ST.raf=requestAnimationFrame(tick);
}

// ─── track loading (native only) ────────────────────────────────────────
function loadTrk(lk,qk,resume){
  const tr=(_ep&&_ep.tracks)||{};const langs=Object.keys(tr);if(!langs.length)return;
  if(!langs.includes(lk))lk=langs[0];ST.lang=lk;
  const quals=Object.keys(tr[lk]||{});if(!quals.includes(qk))qk=quals[0]||qk;ST.qual=qk;
  const src=tr[lk][qk],ct=resume?ST.currentTime:0,wp=ST.playing;
  const v=g('nvid');if(!v)return;
  v.src=src;v.load();v.currentTime=ct;ST.ended=false;ST.bufErr=0;
  if(wp&&resume)v.play().catch(()=>{});
  const nth=g('nth');if(nth){nth.src=_ep.thumb||'';nth.style.display='block';}
  if(_ep.thumb)v.setAttribute('poster',_ep.thumb);
  const fst=g('nct-title-main');if(fst)fst.textContent=_show.title||'';
  const fstsub=g('nct-title-sub');if(fstsub)fstsub.textContent=`S${_ep.s} E${_ep.e} · ${_ep.title||''}`;
  _savePref();_loadCaptions();_drawChDots();
}
function _loadCaptions(){
  const v=g('nvid');if(!v)return;
  const caps=(_ep&&_ep.captions)||[];
  Array.from(v.querySelectorAll('track')).forEach(t=>t.remove());
  caps.forEach(c=>{const t=document.createElement('track');t.kind='subtitles';t.label=c.label||c.lang||'';t.srclang=c.lang||'en';t.src=c.src;v.appendChild(t);});
}
function _drawChDots(){
  const st=g('nst');if(!st)return;
  st.querySelectorAll('.nsch-dot').forEach(d=>d.remove());
  const chs=(_ep&&_ep.chapters)||[];const d=ST.duration||0;
  if(!chs.length||!d)return;
  chs.forEach(ch=>{const dot=document.createElement('div');dot.className='nsch-dot';dot.style.left=(ch.t/d*100)+'%';st.appendChild(dot);});
}

// ─── network setup (native only) ────────────────────────────────────────
function _netSetup(){
  const v=g('nvid');if(!v)return;
  let _was=false;
  window.addEventListener('offline',()=>{ST.netOk=false;_was=ST.playing;sysMsg('No connection',true);});
  window.addEventListener('online',()=>{
    ST.netOk=true;clearSysMsg();
    if(_was){const pos=v.currentTime;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;v.play().catch(()=>{});},{once:true});sysMsg('Reconnected');}
  });
  v.addEventListener('error',()=>{
    if(!ST.netOk)return;const err=v.error;
    if(!err||err.code===1)return;
    ST.bufErr++;if(ST.bufErr>2){clearSysMsg();return;}
    sysMsg('Retrying…',true);
    setTimeout(()=>{const pos=v.currentTime;v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=pos;if(ST.playing)v.play().catch(()=>{});},{once:true});},2500);
  });
  v.setAttribute('controlsList','nodownload noremoteplayback');
  v.disablePictureInPicture=true;
  v.addEventListener('contextmenu',e=>e.preventDefault());
}

// ─── skip intro/outro ────────────────────────────────────────────────────
function _getSkipCh(){
  const chs=(_ep&&_ep.chapters)||[];if(!chs.length)return null;
  const t=ST.currentTime;
  for(let i=0;i<chs.length;i++){
    const ch=chs[i],next=chs[i+1];
    const inRange=t>=ch.t&&(next?t<next.t:t<(ST.duration||Infinity));
    if(inRange){const lc=(ch.title||'').toLowerCase();
      if(lc.includes('intro'))return{label:'Skip Intro',next:next?next.t:ch.t+90};
      if(lc.includes('outro')||lc.includes('credit'))return{label:'Skip Outro',next:ST.duration||ch.t+300};}
  }
  return null;
}
function _updSkip(){
  if(!ST.fs)return;const btn=g('nskip');if(!btn)return;
  const sk=_getSkipCh();
  if(sk){btn.textContent=sk.label;btn._skipTo=sk.next;btn.classList.add('vis');}
  else{btn.classList.remove('vis');}
}

// ─── peek row ───────────────────────────────────────────────────────────
function _buildPeek(){
  const peek=g('nbpeek');if(!peek)return;peek.innerHTML='';
  _pl.forEach(ep=>{
    const act=ep.id===_eid;const d=document.createElement('div');d.className='nbpeek-ep'+(act?' act':'');
    d.innerHTML=`<img class="nbpeek-ep-img" src="${ep.thumb||''}" loading="lazy" onerror="this.style.background='#222'">`;
    d.onclick=()=>R.ep(_sid,ep.id);peek.appendChild(d);
  });
}

// ─── source badge ────────────────────────────────────────────────────────
function _updateBadge(type){
  const b=g('nsrc-badge');if(!b)return;
  const labels={youtube:'YouTube',jwplayer:'JW Player',jwpage:'JW Player',vimeo:'Vimeo',dailymotion:'Dailymotion',twitch:'Twitch',facebook:'Facebook',hls:'Live / HLS',dash:'DASH',iframe:'Embedded',native:''};
  const lbl=labels[type]||'';
  b.textContent=lbl;b.style.display=lbl?'':'none';
}

// ─── native video events ─────────────────────────────────────────────────
function _bindNativeEvents(){
  const v=g('nvid');if(!v)return;
  v.addEventListener('play',()=>{
    ST.started=true;ST.playing=true;ST.ended=false;
    const cp=g('npl2');if(cp)cp.innerHTML=IC.pause;
    const nth=g('nth');if(nth)nth.style.display='none';
    const sp=g('nsp');if(sp)sp.classList.remove('ns');
    showUI();
  });
  v.addEventListener('pause',()=>{ST.playing=false;if(!ST.ended){const cp=g('npl2');if(cp)cp.innerHTML=IC.play;}showUI();const sp=g('nsp');if(sp)sp.classList.remove('ns');});
  v.addEventListener('ended',()=>{_onEnded();});
  v.addEventListener('waiting',()=>{const sp=g('nsp');if(sp)sp.classList.add('ns');});
  v.addEventListener('playing',()=>{const sp=g('nsp');if(sp)sp.classList.remove('ns');clearSysMsg();ST.bufErr=0;});
  v.addEventListener('canplay',()=>{const sp=g('nsp');if(sp)sp.classList.remove('ns');_drawChDots();});
  v.addEventListener('loadedmetadata',()=>{
    ST.duration=v.duration;tick();
    const rt=_loadPos();
    if(rt>2&&rt<(v.duration-5)){v.currentTime=rt;sysMsg('Resumed '+fT(rt));}
    v.play().catch(()=>{});
  });
  v.addEventListener('durationchange',()=>{ST.duration=v.duration;_drawChDots();});
  v.addEventListener('timeupdate',()=>{if(ST.fs)_updSkip();});
}

// ─── BIND ALL EVENTS ─────────────────────────────────────────────────────
function bndEvt(){
  _bindNativeEvents();
  _netSetup();

  // Centre play button
  const cp=g('npl2');if(cp)cp.onclick=e=>{e.stopPropagation();tPlay();};

  // Fullscreen enter/exit
  const fsBtn=g('nfs-btn');if(fsBtn)fsBtn.onclick=e=>{e.stopPropagation();el.root&&el.root.requestFullscreen&&el.root.requestFullscreen().catch(()=>{});};
  const fsExit=g('nfs-exit');if(fsExit)fsExit.onclick=e=>{e.stopPropagation();document.exitFullscreen&&document.exitFullscreen().catch(()=>{});};

  // Settings gear (FS only)
  const setBtn=g('nset');if(setBtn)setBtn.onclick=e=>{e.stopPropagation();if(ST.fs)openFsOv('quality');};

  // Bottom FS row buttons
  const wnBtn=g('nwn'),epBtn=g('nep'),spdBtn=g('nspd'),nxBtn=g('nnx');
  if(wnBtn)wnBtn.onclick=e=>{e.stopPropagation();openFspl('watchnext');};
  if(epBtn)epBtn.onclick=e=>{e.stopPropagation();openFspl('episodes');};
  if(spdBtn)spdBtn.onclick=e=>{e.stopPropagation();if(ST.fs)openFsOv('speed');};
  if(nxBtn)nxBtn.onclick=e=>{e.stopPropagation();const i=_pl.findIndex(x=>x.id===_eid);if(i>=0&&i<_pl.length-1)R.ep(_sid,_pl[i+1].id);};

  // Seekbar
  const sw=g('nsw');
  if(sw){
    const ss=e=>{ST.drag=true;sFrac(fFrac(e));e.stopPropagation();showUI();};
    const sm=e=>{if(ST.drag){sFrac(fFrac(e));_tickUI();}};
    const se=()=>{ST.drag=false;};
    sw.addEventListener('mousedown',ss);sw.addEventListener('touchstart',ss,{passive:true});
    document.addEventListener('mousemove',sm);
    document.addEventListener('touchmove',e=>{if(ST.drag)sm(e);},{passive:true});
    document.addEventListener('mouseup',se);document.addEventListener('touchend',se);
    sw.addEventListener('mousemove',e=>{const f=fFrac(e);const sh=g('nsh');if(sh){sh.textContent=fT(f*(ST.duration||0));sh.style.left=(f*100)+'%';sh.style.opacity='1';}});
    sw.addEventListener('mouseleave',()=>{const sh=g('nsh');if(sh)sh.style.opacity='0';});
  }

  // Overlay tap
  const ov=g('nov');
  if(ov){
    ov.addEventListener('click',e=>{
      if(e.target.closest('#nb')||e.target.closest('#nct')||e.target.closest('#ncc'))return;
      if(ST.fsOvOpen)return;
      if(!ST.started&&!ST.adapterReady){SRC_ADAPTER.play();return;}
      if(!ST.uiFull){showUI();}else{hiTmr();}
    });
    // Double-tap seek
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
        _td.lastT=now;
        _td.tmr=setTimeout(()=>{_td={side:'',cnt:0,tmr:null,lastT:0};},600);
      }else{
        clearTimeout(_td.tmr);_td={side,cnt:1,tmr:null,lastT:now};
        _td.tmr=setTimeout(()=>{
          if(_td.side==='c'){if(!ST.started&&!ST.adapterReady)SRC_ADAPTER.play();else{if(!ST.uiFull)showUI();else hiTmr();}}
          _td={side:'',cnt:0,tmr:null,lastT:0};
        },CFG.tapMs+80);
      }
      const v=g('nvid');
      clearTimeout(ST.holdTmr);
      ST.holdTmr=setTimeout(()=>{if(v&&!v.paused){v.playbackRate=CFG.holdSpd;sysMsg('2× speed',true);}},CFG.holdDly);
    },{passive:true});
    ov.addEventListener('touchend',()=>{
      clearTimeout(ST.holdTmr);
      const v=g('nvid');if(v&&v.playbackRate===CFG.holdSpd&&ST.spd!==CFG.holdSpd){v.playbackRate=ST.spd;clearSysMsg();}
    },{passive:true});
  }

  // Side gesture strips
  ['ng-left','ng-right'].forEach(id=>{
    const strip=g(id);if(!strip)return;
    const isLeft=id==='ng-left';let sy=0,sv=0;
    strip.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sv=isLeft?ST.bright:ST.vol;e.stopPropagation();},{passive:true});
    strip.addEventListener('touchmove',e=>{
      const dy=sy-e.touches[0].clientY,delta=dy/120,nv=Math.max(0,Math.min(1,sv+delta));
      const v=g('nvid');
      if(isLeft){ST.bright=nv;if(v)v.style.filter=`brightness(${nv})`;_showGst('bright');}
      else setVol(nv);
      e.stopPropagation();
    },{passive:true});
  });

  // Fullscreen change
  document.addEventListener('fullscreenchange',()=>{
    ST.fs=!!document.fullscreenElement;
    if(el.root)el.root.classList.toggle('nrfs',ST.fs);
    if(ST.fs)SRC_ADAPTER.play();
    if(!ST.fs){const btn=g('nskip');if(btn)btn.classList.remove('vis');}
    else _updSkip();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════
return{
  init(sid,eid,show,ep){
    injectCSS();_sid=sid;_eid=eid;_show=show;_ep=ep;_pl=show.episodes||[];
    _fsplCurSeason=(ep&&ep.s)||1;
    ST={lang:'en',qual:'720p',spd:1,vol:1,bright:1,muted:false,playing:false,ended:false,started:false,
        uiTmr:null,uiFull:false,fsOvOpen:false,fsOvTab:'quality',drag:false,raf:null,holdTmr:null,
        fs:false,netOk:true,sysTmr:null,gtTmr:null,bufErr:0,srcType:'native',duration:0,currentTime:0,adapterReady:false};

    el={root:g('nr'),vid:g('nvid'),ct:g('nct'),bot:g('nb'),cc:g('ncc'),sh2:g('nsh2'),nul:g('nnl'),nur:g('nnr')};
    const cp=g('npl2');if(cp)cp.innerHTML=IC.play;

    // Show thumbnail immediately
    const nth=g('nth'),v=el.vid;
    if(nth&&ep.thumb){nth.src=ep.thumb;nth.style.display='block';}
    if(v&&ep.thumb)v.setAttribute('poster',ep.thumb);

    // Set title
    const fst=g('nct-title-main');if(fst)fst.textContent=show.title||'';
    const fstsub=g('nct-title-sub');if(fstsub)fstsub.textContent=`S${ep.s||''} E${ep.e||''} · ${ep.title||''}`;

    // Determine the source URL (priority: tracks > src/url/video/link/youtube/jwplayer)
    (()=>{
      let srcUrl='';
      // 1. Try multi-quality tracks
      if(ep.tracks&&Object.keys(ep.tracks).length){
        const pref=_loadPref(),langs=Object.keys(ep.tracks);
        const fl=pref&&langs.includes(pref.lang)?pref.lang:langs[0];
        const qs=Object.keys(ep.tracks[fl]||{});const fq=pref&&qs.includes(pref.qual)?pref.qual:qs[0];
        ST.lang=fl;ST.qual=fq;
        srcUrl=ep.tracks[fl][fq];
      }else{
        // 2. Fallback: any direct source field
        srcUrl=ep.src||ep.url||ep.video||ep.link||ep.youtube||ep.jwplayer||ep.vimeo||ep.embed||'';
      }

      if(!srcUrl){v&&(v.src='');return;}

      const info=detectSource(srcUrl);
      ST.srcType=info.type;
      _updateBadge(info.type);

      // Adjust UI for embed-only sources with no time/seek API.
      // 'jwpage' defers this decision to _bridgeJWPlayer's fallback timer —
      // if postMessage works, seekbar stays; if not, timer adds nv-no-seek.
      if(info.type==='twitch'||info.type==='facebook'||info.type==='iframe'){
        el.root&&el.root.classList.add('nv-no-seek');
      }else{
        el.root&&el.root.classList.remove('nv-no-seek');
      }

      const resumePos=_loadPos()||0;
      SRC_ADAPTER.mount(info,resumePos);
      _loadCaptions();_drawChDots();_savePref();
    })();

    bndEvt();
    _buildPeek();
    const spdb=g('nspd-lbl');if(spdb)spdb.textContent='1x';
    if(el.root)el.root.focus();
    if(ST.raf)cancelAnimationFrame(ST.raf);tick();

    // Settings tabs
    const fsoHd=g('nfsov-hd');
    if(fsoHd){
      const tabDefs=[{key:'quality',label:'Quality'},{key:'subtitles',label:'Audio & Subtitles'},{key:'speed',label:'Playback Speed'},{key:'chapters',label:'Chapters'}];
      fsoHd.innerHTML=tabDefs.map(t=>`<div class="nfsov-tab" data-tab="${t.key}" onclick="NV._fsOvTabClick('${t.key}')">${t.label}</div>`).join('')
      +`<button class="nb" id="nfsov-close-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">${IC.close}</button>`;
      const cb=g('nfsov-close-btn');if(cb)cb.onclick=e=>{e.stopPropagation();closeFsOv();};
      _setFsOvTab('quality');
    }

    setTimeout(()=>showUI(),300);
  },

  destroy(keepFs=false){
    SRC_ADAPTER.destroy();
    if(ST.raf)cancelAnimationFrame(ST.raf);ST.raf=null;
    clearTimeout(ST.uiTmr);clearTimeout(ST.holdTmr);clearTimeout(ST.sysTmr);clearTimeout(ST.gtTmr);
    const v=g('nvid');if(v){v.pause();v.src='';}
    const ytel=g('nvyt');if(ytel)ytel.remove();
    const fr=g('nvframe');if(fr)fr.remove();
    if(!keepFs&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    el={};
  },

  // Public control surface (used by keys.js and external callers)
  _tPlay:tPlay,_showUI:showUI,_hideUI:hideUI,
  _seek:seek,_adjSpd:adjSpd,_setVol:setVol,_tMute:tMute,
  _getVol:()=>ST.vol,_getSpd:()=>ST.spd,_isPlaying:()=>ST.playing,
  _seekTo:_seekTo,_setQual:_setQual,_setLang:_setLang,_setSub:_setSub,_fsSetSpd:_fsSetSpd,
  _fsOvTabClick:(t)=>{_setFsOvTab(t);},
  _fsplSetTab:_fsplSetTab,_fsplSetSeason:_fsplSetSeason,_fsplPlay:_fsplPlay,
  _doSkip:()=>{const btn=g('nskip');if(btn&&btn._skipTo!=null){SRC_ADAPTER.seekTo(btn._skipTo);btn.classList.remove('vis');}},
  openFsOv:openFsOv,closeFsOv:closeFsOv,openFspl:openFspl,closeFspl:closeFspl,

  // Expose detectSource so server.js/p.js can pre-check source types
  detectSource
};
})();