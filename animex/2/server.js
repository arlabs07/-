const D=(()=>{
'use strict';
const LL={en:'English',hi:'Hindi',ja:'Japanese',es:'Spanish',fr:'French',de:'German',ta:'Tamil',te:'Telugu'};
let _shows=[],_sections=[],_map={},_loaded=false,_loading=false,_cbs=[];
let _mangas=[],_mangaSections=[],_mmap={};
const _wlKey='ax_wl5',_prKey='ax_pr5';
let _wl=null,_pr=null,_pt=null;
const lg=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const ls=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const gWL=()=>{if(!_wl)_wl=new Set(lg(_wlKey,[]));return _wl;};
const gPR=()=>{if(!_pr)_pr=lg(_prKey,{});return _pr;};
const svWL=()=>ls(_wlKey,[...gWL()]);
const svPR=()=>{if(_pt)return;_pt=setTimeout(()=>{ls(_prKey,gPR());_pt=null;},5e3);};
function _load(){
if(_loaded)return Promise.resolve();
if(_loading)return new Promise(r=>_cbs.push(r));
_loading=true;
const _finish=(shows,sections,mangas,mangaSections)=>{
_shows=shows;_sections=sections;_map={};
_shows.forEach(s=>{if(s&&s.id)_map[s.id]=s;});
_mangas=mangas;_mangaSections=mangaSections;_mmap={};
_mangas.forEach(m=>{if(m&&m.id)_mmap[m.id]=m;});
_loaded=true;_loading=false;
const cbs=_cbs.splice(0);cbs.forEach(r=>r());
};
if(typeof ParqraDB==='undefined'){
console.warn('AnimeX: ParqraDB not available');
_finish([],[],[],[]);
return Promise.resolve();
}
try{
const db=new ParqraDB('hero_cards');
const db2=new ParqraDB('sections');
const db3=new ParqraDB('series');
const db4=new ParqraDB('movies');
const db5=new ParqraDB('manga');
const db6=new ParqraDB('manga_sections');
return Promise.all([
db.list({limit:'100',sort_by:'created_at',sort_order:'asc'}),
db2.list({limit:'50',sort_by:'created_at',sort_order:'asc'}),
db3.list({limit:'200',sort_by:'created_at',sort_order:'asc'}),
db4.list({limit:'200',sort_by:'created_at',sort_order:'asc'}),
db5.list({limit:'200',sort_by:'created_at',sort_order:'asc'}),
db6.list({limit:'50',sort_by:'created_at',sort_order:'asc'})
]).then(([r1,r2,r3,r4,r5,r6])=>{
const series=(r3&&r3.data?r3.data:[]).map(x=>x.data).filter(Boolean);
const mvs=(r4&&r4.data?r4.data:[]).map(x=>Object.assign({},x.data,{isMovie:true})).filter(Boolean);
const sections=(r2&&r2.data?r2.data:[]).map(x=>x.data).filter(Boolean);
const mangas=(r5&&r5.data?r5.data:[]).map(x=>Object.assign({},x.data,{isManga:true})).filter(Boolean);
const mangaSections=(r6&&r6.data?r6.data:[]).map(x=>x.data).filter(Boolean);
_finish([...series,...mvs],sections,mangas,mangaSections);
}).catch(e=>{
console.error('AnimeX: server load failed',e);
_finish([],[],[],[]);
});
}catch(e){
console.error('AnimeX: ParqraDB init failed',e);
_finish([],[],[],[]);
return Promise.resolve();
}
}
function onReady(cb){
if(_loaded){cb();return;}
_load().then(()=>{cb();});
}
return{
langLabels:LL,
get shows(){return _shows;},
get sections(){return _sections;},
get mangas(){return _mangas;},
get mangaSections(){return _mangaSections;},
load:_load,
onReady,
// ── Video shows / movies ──
getShow(id){return _map[id]||null;},
isMovie(id){return!!(_map[id]&&_map[id].isMovie);},
heroImg(s){const mob=window.innerWidth<768;return(mob&&s.hero_mobile)||s.hero||s.thumb||'';},
getEp(sid,eid){const s=_map[sid];return s?s.episodes&&s.episodes.find(e=>e.id===eid)||null:null;},
// ── Manga ──
getManga(id){return _mmap[id]||null;},
getMangaChapter(mid,chid){const m=_mmap[mid];return m?(m.chapters||[]).find(c=>c.id===chid)||null:null;},
// ── Wishlist (shared between shows + manga) ──
get wishlist(){return gWL();},
toggleWL(id){const w=gWL();w.has(id)?w.delete(id):w.add(id);svWL();return w.has(id);},
// ── Video progress ──
setProgress(sid,eid,pct){const p=gPR();if(!p[sid])p[sid]={};p[sid][eid]=pct;svPR();},
getProgress(sid,eid){return(gPR()[sid]||{})[eid]||0;},
getContinueWatching(){const out=[],p=gPR();Object.keys(p).forEach(sid=>{if(sid==='_mg')return;const s=_map[sid];if(!s)return;Object.keys(p[sid]).forEach(eid=>{const pct=p[sid][eid];if(pct>2&&pct<95){const ep=s.episodes&&s.episodes.find(x=>x.id===eid);if(ep)out.push({show:s,ep,pct});}});});return out;},
// ── Manga progress (page index, 0-based) ──
setMangaProgress(mid,chid,page){const p=gPR();if(!p._mg)p._mg={};if(!p._mg[mid])p._mg[mid]={};p._mg[mid][chid]=page;svPR();},
getMangaProgress(mid,chid){return((gPR()._mg||{})[mid]||{})[chid]||0;},
getContinueManga(){const out=[],p=(gPR()._mg||{});Object.keys(p).forEach(mid=>{const m=_mmap[mid];if(!m)return;Object.keys(p[mid]).forEach(chid=>{const pg=p[mid][chid];if(pg>0){const ch=(m.chapters||[]).find(x=>x.id===chid);if(ch)out.push({manga:m,ch,page:pg});}});});return out;}
};
})();