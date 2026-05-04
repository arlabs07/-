const D=(()=>{
'use strict';
const LL={en:'English',hi:'Hindi',ja:'Japanese',es:'Spanish',fr:'French',de:'German',ta:'Tamil',te:'Telugu'};
const SH=[
{id:'pokemon',title:'Pokémon',subtitle:'Animation · Kids · Adventure',year:'2023',rating:7.6,seasons:4,langs:['en','ja'],desc:'A young trainer and his Pikachu travel the world, battling Pokémon and growing stronger together.',genres:['Animation','Kids','Animals','Coming-of-Age','Comedy'],thumb:'https://picsum.photos/seed/poke/300/450',hero:'https://picsum.photos/seed/pokeh/800/450',tracks:{ja:{'720p':'https://cdn.videas.fr/v-medias/s5/hlsv1/7e/53/7e531338-0aae-407e-8f1a-21814314389a/playlist.m3u8'},en:{'720p':'https://cdn.videas.fr/v-medias/s5/a/34/53/3453ee2145f44a1a956410042da8ba10/e35d26fd6f364c5492bfddecfbc6b6e5/0fd2f828-67c1-4c5e-8730-2261e20ba2bb.mp4'}},episodes:[
{id:'s1e1',s:1,e:1,title:'I Choose You',date:'16 Jul 2023',dur:'21m',thumb:'https://picsum.photos/seed/ep1/160/90',desc:"Ash's journey begins with a grumpy Pikachu."},
{id:'s1e2',s:1,e:2,title:'Pokémon Emergency',date:'16 Aug 2023',dur:'20m',thumb:'https://picsum.photos/seed/ep2/160/90',desc:'Ash and his injured Pikachu race into Viridian City.'},
{id:'s1e3',s:1,e:3,title:'Ash Catches a Pokémon',date:'23 Aug 2023',dur:'20m',thumb:'https://picsum.photos/seed/ep3/160/90',desc:"Ash catches a Caterpie. Misty's bug phobia makes her uneasy."},
{id:'s1e4',s:1,e:4,title:'Challenge of the Samurai',date:'30 Aug 2023',dur:'21m',thumb:'https://picsum.photos/seed/ep4/160/90',desc:'A samurai challenges Ash to a duel in the forest.'},
{id:'s1e5',s:1,e:5,title:'Showdown in Pewter City',date:'6 Sep 2023',dur:'21m',thumb:'https://picsum.photos/seed/ep5/160/90',desc:'Ash challenges Brock, the Rock-type Gym Leader.'},
{id:'s1e6',s:1,e:6,title:'Clefairy and the Moon Stone',date:'13 Sep 2023',dur:'20m',thumb:'https://picsum.photos/seed/ep6/160/90',desc:'A rare Moon Stone is discovered in Mt. Moon.'},
{id:'s2e1',s:2,e:1,title:'Princess vs. Princess',date:'1 Jan 2024',dur:'21m',thumb:'https://picsum.photos/seed/ep7/160/90',desc:'Misty enters a princess competition on Princess Day.'},
{id:'s2e2',s:2,e:2,title:'The Purr-fect Hero',date:'8 Jan 2024',dur:'21m',thumb:'https://picsum.photos/seed/ep8/160/90',desc:'Meowth becomes a class mascot for a group of kids.'}
]},
{id:'mario',title:'Super Mario Bros.',subtitle:'Animation · Family · Comedy',year:'2023',rating:5.8,seasons:1,langs:['en'],desc:'A plumber from Brooklyn is transported to a fantastical world.',genres:['Animation','Family','Comedy','Adventure'],thumb:'https://picsum.photos/seed/mario/300/450',hero:'https://picsum.photos/seed/marioh/800/450',tracks:{en:{'1080p':'https://arlabs07.netlify.app/video/arlabs07.mp4','720p':'https://arlabs07.netlify.app/video/arlabs07.mp4'}},episodes:[{id:'s1e1',s:1,e:1,title:'The Super Mario Bros. Movie',date:'2023',dur:'1h 32m',thumb:'https://picsum.photos/seed/marioe/160/90',desc:'Full theatrical release.'}]},
{id:'doraemon',title:'Doraemon',subtitle:'Animation · Kids · Comedy',year:'2022',rating:8.1,seasons:6,langs:['en','ja'],desc:'A robotic cat from the future helps a young boy with magical gadgets.',genres:['Animation','Kids','Comedy','Family'],thumb:'https://picsum.photos/seed/dora/300/450',hero:'https://picsum.photos/seed/dorah/800/450',tracks:{en:{'720p':'https://arlabs07.netlify.app/video/arlabs07.mp4'},ja:{'720p':'https://cdn.videas.fr/v-medias/s5/hlsv1/7e/53/7e531338-0aae-407e-8f1a-21814314389a/playlist.m3u8'}},episodes:[
{id:'s1e1',s:1,e:1,title:'The Beginning',date:'12 Jan 2022',dur:'22m',thumb:'https://picsum.photos/seed/dorae1/160/90',desc:'Doraemon arrives from the future to help Nobita.'},
{id:'s1e2',s:1,e:2,title:'The Anywhere Door',date:'19 Jan 2022',dur:'22m',thumb:'https://picsum.photos/seed/dorae2/160/90',desc:'Doraemon pulls out the Anywhere Door.'},
{id:'s1e3',s:1,e:3,title:'Small Light',date:'26 Jan 2022',dur:'22m',thumb:'https://picsum.photos/seed/dorae3/160/90',desc:'The Small Light shrinks everything it touches.'}
]},
{id:'motupatlu',title:'Motu Patlu',subtitle:'Animation · Kids · Comedy',year:'2022',rating:6.9,seasons:8,langs:['hi'],desc:'Two best friends go on hilarious adventures in Furfuri Nagar.',genres:['Animation','Kids','Comedy'],thumb:'https://picsum.photos/seed/motu/300/450',hero:'https://picsum.photos/seed/motuh/800/450',tracks:{hi:{'720p':'https://arlabs07.netlify.app/video/arlabs07.mp4'}},episodes:[
{id:'s1e1',s:1,e:1,title:'Pilot',date:'2022',dur:'18m',thumb:'https://picsum.photos/seed/motue/160/90',desc:'The first adventure.'},
{id:'s1e2',s:1,e:2,title:'Samosa Crisis',date:'2022',dur:'18m',thumb:'https://picsum.photos/seed/motue2/160/90',desc:"Motu's obsession with samosas causes trouble."}
]},
{id:'dragon',title:'How To Train Your Dragon',subtitle:'Animation · Fantasy · Adventure',year:'2023',rating:8.1,seasons:1,langs:['hi','en'],desc:'A young Viking befriends a dragon.',genres:['Animation','Fantasy','Adventure','Family'],thumb:'https://picsum.photos/seed/httyd/300/450',hero:'https://picsum.photos/seed/httydh/800/450',tracks:{hi:{'720p':'https://arlabs07.netlify.app/video/arlabs07.mp4'},en:{'1080p':'https://arlabs07.netlify.app/video/arlabs07.mp4'}},episodes:[{id:'s1e1',s:1,e:1,title:'How to Train Your Dragon',date:'2023',dur:'1h 38m',thumb:'https://picsum.photos/seed/httyde/160/90',desc:'Hiccup befriends Toothless.'}]},
{id:'balganesh',title:'Bal Ganesh',subtitle:'Animation · Mythology · Kids',year:'2022',rating:7.2,seasons:2,langs:['hi'],desc:'The adventures of young Lord Ganesha.',genres:['Animation','Mythology','Kids'],thumb:'https://picsum.photos/seed/balg/300/450',hero:'https://picsum.photos/seed/balgh/800/450',tracks:{hi:{'720p':'https://arlabs07.netlify.app/video/arlabs07.mp4'}},episodes:[{id:'s1e1',s:1,e:1,title:'The Beginning',date:'2022',dur:'20m',thumb:'https://picsum.photos/seed/balge/160/90',desc:'The story of young Ganesha begins.'}]}
];
const SEC=[
{title:'Featured',ids:['mario','pokemon','doraemon','dragon']},
{title:'Popular in Kids',ids:['motupatlu','doraemon','balganesh','pokemon','dragon']},
{title:'Trending Now',ids:['pokemon','dragon','mario','motupatlu']},
{title:'New Releases',ids:['mario','balganesh','dragon']},
{title:'Top Rated',ids:['doraemon','dragon','pokemon','mario']}
];
const _m={};SH.forEach(s=>{_m[s.id]=s;});
const lg=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const ls=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
let _wl=null,_pr=null,_pt=null;
const gWL=()=>{if(!_wl)_wl=new Set(lg('ax_wl4',[]));return _wl;};
const gPR=()=>{if(!_pr)_pr=lg('ax_pr4',{});return _pr;};
const svWL=()=>ls('ax_wl4',[...gWL()]);
const svPR=()=>{if(_pt)return;_pt=setTimeout(()=>{ls('ax_pr4',gPR());_pt=null;},5e3);};
const pDur=d=>{let s=0;const h=d.match(/(\d+)h/),m=d.match(/(\d+)m/);if(h)s+=+h[1]*3600;if(m)s+=+m[1]*60;return s||1800;};
return{
shows:SH,sections:SEC,langLabels:LL,
getShow:id=>_m[id]||null,
getEp(sid,eid){const s=_m[sid];return s?s.episodes.find(e=>e.id===eid)||null:null;},
get wishlist(){return gWL();},
toggleWL(id){const w=gWL();w.has(id)?w.delete(id):w.add(id);svWL();return w.has(id);},
setProgress(sid,eid,pct){const p=gPR();if(!p[sid])p[sid]={};p[sid][eid]=pct;svPR();},
getProgress(sid,eid){return(gPR()[sid]||{})[eid]||0;},
getResumeTime(sid,eid){const pct=this.getProgress(sid,eid);if(!pct)return 0;const ep=this.getEp(sid,eid);return ep?Math.floor(pDur(ep.dur)*pct/100):0;},
getContinueWatching(){const out=[],p=gPR();Object.keys(p).forEach(sid=>{const s=_m[sid];if(!s)return;Object.keys(p[sid]).forEach(eid=>{const pct=p[sid][eid];if(pct>2&&pct<95){const ep=s.episodes.find(x=>x.id===eid);if(ep)out.push({show:s,ep,pct});}});});return out;}
};
})();