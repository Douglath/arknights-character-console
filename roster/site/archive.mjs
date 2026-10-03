// PRTS operator archive: faceted roster, dossier with live 3D model, index table and panorama wall.
import {PROF,PROF_ORDER,RARITY_COLOR,CHAPTER_STYLE,glyph} from '../shared/glyphs.mjs';
import {ModelStage,instantiate,setMotion,motionInfo} from '../shared/stage.mjs';
import {standaloneHTML,glbBytes,download,fileStem} from './export.mjs';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
const PV=params.has('pv');if(PV)document.body.classList.add('pv');

const data=await (await fetch('../data/roster.json')).json();
const records=data.records,S=data.summary;
const byAsset=new Map(records.map(r=>[r.asset,r]));
const CHAPTERS=S.byChapter;const chapterName=Object.fromEntries(CHAPTERS.map(c=>[c.id,c]));
const REGIONS=new Set(Object.keys(S.regions));
const portrait=r=>`../data/portraits/${r.asset}.webp`;
for(const r of records){
 r.regions=r.factions.filter(f=>REGIONS.has(f));r.orgs=r.factions.filter(f=>!REGIONS.has(f));
 r.formType=r.alt?'alt':'base';
 r.hay=[r.name,r.nameEn,r.personName,r.code,r.appellation,r.model,...r.factions,r.ip,r.profZh,PROF[r.prof]?.en].join(' ').toLowerCase();
}
const count=(list,fn)=>{const m=new Map();for(const r of list)for(const v of [].concat(fn(r)))if(v!=null)m.set(v,(m.get(v)||0)+1);return m;};
const sortDesc=m=>[...m].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);

// ---------- facets ----------
const FACETS=[
 {id:'prof',zh:'职业',en:'CLASS',get:r=>r.prof,values:PROF_ORDER,label:v=>PROF[v].zh,kind:'prof'},
 {id:'rarity',zh:'星级',en:'RARITY',get:r=>r.rarity,values:[6,5,4,3,2,1],label:v=>v+'★',kind:'star'},
 {id:'chapter',zh:'主题分组',en:'CHAPTER',get:r=>r.chapter,values:CHAPTERS.map(c=>c.id),label:v=>chapterName[v].zh},
 {id:'region',zh:'地区',en:'REGION',get:r=>r.regions,values:sortDesc(count(records,r=>r.regions))},
 {id:'org',zh:'组织 / 小队',en:'FACTION',get:r=>r.orgs,values:sortDesc(count(records,r=>r.orgs))},
 {id:'ip',zh:'联动',en:'COLLAB',get:r=>r.ip,values:sortDesc(count(records,r=>r.ip))},
 {id:'formType',zh:'形态',en:'FORM',get:r=>r.formType,values:['base','alt'],label:v=>v==='alt'?'异格':'原型'},
];
const state={q:'',view:'dossier',sort:'rarity',groupBy:'chapter',sel:null};
for(const f of FACETS)state[f.id]=new Set();

function readHash(){
 const h=new URLSearchParams(location.hash.slice(1));
 state.q=h.get('q')||'';state.view=h.get('view')||'dossier';state.sort=h.get('sort')||'rarity';
 state.groupBy=h.get('group')||'chapter';state.sel=h.get('op');
 for(const f of FACETS){state[f.id]=new Set((h.get(f.id)||'').split(',').filter(Boolean).map(v=>f.id==='rarity'?+v:v));}
}
function writeHash(){
 const h=new URLSearchParams();
 if(state.view!=='dossier')h.set('view',state.view);if(state.q)h.set('q',state.q);
 if(state.sort!=='rarity')h.set('sort',state.sort);if(state.groupBy!=='chapter')h.set('group',state.groupBy);
 for(const f of FACETS)if(state[f.id].size)h.set(f.id,[...state[f.id]].join(','));
 if(state.sel)h.set('op',state.sel);
 history.replaceState(null,'','#'+h.toString());
}
const match=(r,skip)=>{
 if(state.q&&!state.q.toLowerCase().split(/\s+/).every(w=>r.hay.includes(w)))return false;
 for(const f of FACETS){if(f.id===skip||!state[f.id].size)continue;const v=[].concat(f.get(r));if(!v.some(x=>state[f.id].has(x)))return false;}
 return true;
};
const profIdx=Object.fromEntries(PROF_ORDER.map((p,i)=>[p,i]));
const chapIdx=Object.fromEntries(CHAPTERS.map((c,i)=>[c.id,i]));
const SORTS={
 rarity:(a,b)=>b.rarity-a.rarity||profIdx[a.prof]-profIdx[b.prof]||(a.code||'').localeCompare(b.code||''),
 prof:(a,b)=>profIdx[a.prof]-profIdx[b.prof]||b.rarity-a.rarity,
 code:(a,b)=>(a.code||'~').localeCompare(b.code||'~'),
 name:(a,b)=>a.name.localeCompare(b.name,'zh'),
 chapter:(a,b)=>chapIdx[a.chapter]-chapIdx[b.chapter]||b.rarity-a.rarity,
};
let filtered=records;

function renderFacets(){
 const root=$('facetRoot');let html='';
 for(const f of FACETS){
  const c=count(records.filter(r=>match(r,f.id)),f.get);
  const lab=f.label||(v=>v);
  html+=`<section class="facet"><h3>${f.zh}<small>${f.en}</small></h3>`;
  if(f.kind==='prof')html+=`<div class="prof-grid">${f.values.map(v=>`<button class="prof-btn${state.prof.has(v)?' on':''}" data-f="prof" data-v="${v}">${glyph(v)}<b>${PROF[v].zh}</b><em>${c.get(v)||0}</em></button>`).join('')}</div>`;
  else if(f.kind==='star')html+=`<div class="star-row">${f.values.map(v=>`<button class="star-btn${state.rarity.has(v)?' on':''}" style="color:${RARITY_COLOR[v]}" data-f="rarity" data-v="${v}"><b>${v}★</b><em>${c.get(v)||0}</em></button>`).join('')}</div>`;
  else html+=`<div class="chips">${f.values.map(v=>{const n=c.get(v)||0,on=state[f.id].has(v);return `<button class="chip${on?' on':''}${n||on?'':' zero'}" data-f="${f.id}" data-v="${esc(v)}">${esc(lab(v))}<em>${n}</em></button>`;}).join('')}</div>`;
  html+='</section>';
 }
 root.innerHTML=html;
}
$('facetRoot').addEventListener('click',e=>{
 const b=e.target.closest('[data-f]');if(!b)return;
 const f=b.dataset.f,v=f==='rarity'?+b.dataset.v:b.dataset.v,set=state[f];
 set.has(v)?set.delete(v):set.add(v);update();
});

function renderActive(){
 const tags=[];
 for(const f of FACETS)for(const v of state[f.id])tags.push(`<span class="tag">${esc(f.zh)} · ${esc((f.label||(x=>x))(v))}<button data-rm="${f.id}" data-v="${esc(v)}" aria-label="移除">×</button></span>`);
 if(state.q)tags.push(`<span class="tag">搜索 · ${esc(state.q)}<button data-rm="q" aria-label="移除">×</button></span>`);
 $('activeTags').innerHTML=tags.join('')||'<span class="hint">ALL OPERATORS · 未筛选</span>';
}
$('activeTags').addEventListener('click',e=>{
 const b=e.target.closest('[data-rm]');if(!b)return;
 if(b.dataset.rm==='q'){state.q='';$('search').value='';}
 else state[b.dataset.rm].delete(b.dataset.rm==='rarity'?+b.dataset.v:b.dataset.v);
 update();
});

// ---------- dossier ----------
function cardHTML(r){
 return `<button class="card${r.asset===state.sel?' sel':''}" role="option" data-a="${r.asset}" style="--rc:${RARITY_COLOR[r.rarity]}" title="${esc(r.name)} · ${esc(r.model)}">
  <img src="${portrait(r)}" width="360" height="480" alt="" loading="lazy" decoding="async"><span class="c-code">${esc(r.code||'—')}</span><span class="c-prof">${glyph(r.prof)}</span>
  ${r.alt?'<span class="c-alt">ALTER</span>':''}<span class="c-name">${esc(r.name)}</span><span class="c-rar"></span></button>`;
}
function renderRoster(){$('roster').innerHTML=filtered.map(cardHTML).join('');}
$('roster').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)select(c.dataset.a);});

let stage,stageToken=0,modelPromise=Promise.resolve();
const canvas=$('stage');
function ensureStage(){
 if(stage)return stage;
 stage=new ModelStage(canvas,{pixelRatio:PV?1:Math.min(2,devicePixelRatio||1)});resizeStage();
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:stage.orbit.yaw,pitch:stage.orbit.pitch};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;stage.orbit.yaw=drag.yaw-(e.clientX-drag.x)*.008;stage.orbit.pitch=Math.max(-.2,Math.min(.8,drag.pitch+(e.clientY-drag.y)*.005));lastInput=now();});
 canvas.addEventListener('pointerup',()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();stage.orbit.zoom=Math.max(.55,Math.min(1.6,stage.orbit.zoom*(1+e.deltaY*.001)));},{passive:false});
 new ResizeObserver(resizeStage).observe(canvas);
 return stage;
}
function resizeStage(){if(!stage)return;const b=canvas.getBoundingClientRect();if(b.width&&b.height)stage.resize(b.width,b.height);}
// Keep the model in the right half on wide screens so the dossier text stays readable.
function stageFrame(){const wide=canvas.clientWidth>canvas.clientHeight*.9;stage.frame({distance:wide?21:23,target:new stage.V3(wide?-2.2:0,wide?2.6:3.6,0)});}
const now=()=>performance.now()/1000;let lastInput=-99;

let motion='idle',current=null;
async function showModel(r){
 const token=++stageToken,s=ensureStage();
 const inst=await instantiate(r.glb);if(token!==stageToken)return;
 s.clear();setMotion(inst,motion);s.add(inst,{yaw:0,height:5});s.orbit.yaw=-.35;s.orbit.pitch=.06;current=inst;
 s.setRimColor(CHAPTER_STYLE[r.chapter]?.accent||'#ffd400');updateMotionUI();
}
function updateMotionUI(){
 document.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('on',b.dataset.motion===motion));
 const mi=current?motionInfo(current):null;
 document.querySelector('[data-motion="run"]').disabled=!mi?.run;document.querySelector('[data-motion="rig"]').disabled=!mi?.rig;
 $('motionNote').textContent=mi?`跑动来源：${mi.run||'不可用'} · GLB 内置：${mi.clips.join(' / ')}`:'';
}
document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>{motion=b.dataset.motion;if(current)setMotion(current,motion);updateMotionUI();}));
$('toggleBones').onclick=()=>{const s=ensureStage();s.showSkeleton(!s.skeleton);$('toggleBones').classList.toggle('on',s.skeleton);$('toggleBones').setAttribute('aria-pressed',s.skeleton);};
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2400);}
$('dlGlb').onclick=async()=>{const r=byAsset.get(state.sel);if(!r)return;try{download(fileStem(r)+'.glb',new Blob([await glbBytes(r)],{type:'model/gltf-binary'}));toast('已下载 GLB · '+r.name);}catch(e){toast('GLB 下载失败：'+e.message);}};
$('dlHtml').onclick=async()=>{const r=byAsset.get(state.sel);if(!r)return;$('dlHtml').disabled=true;toast('正在打包单体 HTML…');
 try{const html=await standaloneHTML(r,{prof:`${PROF[r.prof]?.zh||''} ${PROF[r.prof]?.en||''}`,accent:CHAPTER_STYLE[r.chapter]?.accent||'#ffd400'});
  download(fileStem(r)+'.html',new Blob([html],{type:'text/html'}));toast(`已导出单体 HTML · ${(html.length/1048576).toFixed(1)} MB`);}
 catch(e){toast('导出失败：'+e.message);}finally{$('dlHtml').disabled=false;}};
function renderDossier(){
 const r=byAsset.get(state.sel);if(!r)return;
 const chap=CHAPTER_STYLE[r.chapter];
 document.querySelector('.dossier').style.setProperty('--chap',chap?.accent);
 document.querySelector('.dossier').style.setProperty('--rc',RARITY_COLOR[r.rarity]);
 $('dsBgName').textContent=(r.appellation||r.nameEn||r.name);
 $('dsCode').textContent=`${r.code||'NO.CODE'} / ${chapterName[r.chapter].en}`;
 $('dsStars').textContent='★'.repeat(r.rarity);
 $('dsName').textContent=r.name;$('dsNameEn').textContent=r.appellation||r.nameEn||'';
 $('dsProf').innerHTML=`${glyph(r.prof)}<span>${PROF[r.prof]?.zh||'—'}</span><small>${PROF[r.prof]?.en||''} · ${r.pos==='MELEE'?'近战位':r.pos==='RANGED'?'远程位':'—'}</small>`;
 $('dsChips').innerHTML=[...r.factions.map(f=>`<span>${esc(f)}</span>`),r.ip?`<span class="ip">${esc(r.ip)}</span>`:'',r.alt?'<span>异格形态</span>':''].join('');
 $('dsUsage').textContent=r.usage||'';$('dsDesc').textContent=r.desc||'';
 $('dsMeta').innerHTML=`MODEL ${esc(r.model)}<br>FORM ${esc(r.form)} · ASSET ${esc(r.key)}${r.variants>1?`<br>该形态共 ${r.variants} 个模型版本，分别计数`:''}`;
 const rel=records.filter(x=>x.person===r.person&&x.asset!==r.asset);
 $('dsRelated').innerHTML=rel.length?`<span class="lbl">SAME PERSON · 同一人物的其他条目（独立形态 / 版本）</span>`+rel.map(x=>`<button data-a="${x.asset}"><img src="${portrait(x)}" alt="">${esc(x.name)}${x.form===r.form?' · 版本':''}</button>`).join(''):'';
 $('hudLine').textContent=`PRTS://ARCHIVE/${r.form.toUpperCase()}`;
 const i=filtered.indexOf(r);$('dsIndex').textContent=i<0?'— / '+filtered.length:`${String(i+1).padStart(3,'0')} / ${filtered.length}`;
 modelPromise=showModel(r);
}
$('dsRelated').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)select(b.dataset.a);});
function step(d){const i=filtered.findIndex(r=>r.asset===state.sel);const n=filtered[(i+d+filtered.length)%filtered.length];if(n)select(n.asset);}
$('prevOp').onclick=()=>step(-1);$('nextOp').onclick=()=>step(1);

function select(asset,{view}={}){
 state.sel=asset;if(view)state.view=view;
 document.querySelectorAll('.card.sel').forEach(c=>c.classList.remove('sel'));
 const card=document.querySelector(`.card[data-a="${asset}"]`);card?.classList.add('sel');
 if(card&&!PV)card.scrollIntoView({block:'nearest'});
 if(view)applyView();renderDossier();writeHash();
}

// ---------- index ----------
function renderIndex(){
 $('indexTable').querySelectorAll('th').forEach(th=>th.classList.toggle('on',th.dataset.sort===state.sort));
 $('indexTable').tBodies[0].innerHTML=filtered.map(r=>`<tr data-a="${r.asset}">
  <td class="t-code">${esc(r.code||'—')}</td><td><img src="${portrait(r)}" alt="" loading="lazy"></td>
  <td class="t-name"><b>${esc(r.name)}</b>${r.alt?' <small style="display:inline">ALTER</small>':''}<small>${esc(r.appellation||r.nameEn||'')}</small></td>
  <td style="color:${RARITY_COLOR[r.rarity]}">${'★'.repeat(r.rarity)}</td><td>${glyph(r.prof)} ${PROF[r.prof]?.zh||''}</td>
  <td>${esc(r.factions.join(' / '))}</td><td>${esc(chapterName[r.chapter].zh)}</td><td class="t-key">${esc(r.key)}</td></tr>`).join('');
}
$('indexTable').addEventListener('click',e=>{
 const th=e.target.closest('th[data-sort]');if(th){state.sort=th.dataset.sort;$('sort').value=state.sort;update();return;}
 const tr=e.target.closest('tr[data-a]');if(tr)select(tr.dataset.a,{view:'dossier'});
});

// ---------- panorama ----------
const GROUPS={
 chapter:{keys:CHAPTERS.map(c=>c.id),get:r=>r.chapter,title:k=>[chapterName[k].zh,chapterName[k].en],color:k=>CHAPTER_STYLE[k]?.accent},
 prof:{keys:PROF_ORDER,get:r=>r.prof,title:k=>[PROF[k].zh,PROF[k].en],color:()=>null},
 rarity:{keys:[6,5,4,3,2,1],get:r=>r.rarity,title:k=>['★'.repeat(k),k+'-STAR'],color:k=>RARITY_COLOR[k]},
 region:{keys:[...sortDesc(count(records,r=>r.region)),null],get:r=>r.region,title:k=>k?[k,'REGION']:['其他 / 无地区','UNAFFILIATED'],color:()=>null},
};
function renderPanorama(){
 const g=GROUPS[state.groupBy];$('panoCount').textContent=filtered.length;
 $('pano').innerHTML=g.keys.map(k=>{
  const list=filtered.filter(r=>g.get(r)===k);if(!list.length)return '';
  const [zh,en]=g.title(k),c=g.color(k);
  return `<section class="pano-group" ${c?`style="--g:${c}"`:''}><header><b>${esc(zh)}</b><small>${esc(en)}</small><em>${list.length}</em></header>
  <div class="pano-wall">${list.map(r=>`<button data-a="${r.asset}" style="--rc:${RARITY_COLOR[r.rarity]}" title="${esc(r.name)}"><img src="${portrait(r)}" width="360" height="480" alt="${esc(r.name)}" loading="lazy"></button>`).join('')}</div></section>`;
 }).join('');
}
$('pano').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)select(b.dataset.a,{view:'dossier'});});

// ---------- shell ----------
function renderStats(){
 $('stats').innerHTML=[[S.models,'MODELS 模型条目'],[S.forms,'FORMS 形态'],[S.persons,'OPERATORS 人物']].map(([n,l])=>`<div class="stat"><b>${n}</b><small>${l}</small></div>`).join('');
 $('totalCount').textContent=S.models;
}
function applyView(){
 document.querySelectorAll('.views [data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===state.view));
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.dataset.panel===state.view));
 if(state.view==='dossier')requestAnimationFrame(resizeStage);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();state.view=b.dataset.view;applyView();update();}));
function update(){
 filtered=records.filter(r=>match(r)).sort(SORTS[state.sort]||SORTS.rarity);
 $('resultCount').textContent=filtered.length;
 renderFacets();renderActive();
 if(state.view==='dossier'){renderRoster();if(!byAsset.has(state.sel)||!filtered.some(r=>r.asset===state.sel))state.sel=filtered[0]?.asset??state.sel;renderDossier();}
 if(state.view==='index')renderIndex();
 if(state.view==='panorama')renderPanorama();
 writeHash();
}
let searchTimer;
$('search').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.q=e.target.value.trim();update();},120);});
$('sort').addEventListener('change',e=>{state.sort=e.target.value;update();});
$('groupBy').addEventListener('change',e=>{state.groupBy=e.target.value;update();});
$('reset').onclick=()=>{for(const f of FACETS)state[f.id].clear();state.q='';$('search').value='';update();};
$('filterToggle').onclick=()=>$('filters').classList.toggle('open');
$('filterClose').onclick=()=>$('filters').classList.remove('open');
addEventListener('keydown',e=>{
 if(e.target.matches('input,select'))return;
 if(e.key==='/'){e.preventDefault();$('search').focus();}
 if(state.view==='dossier'&&(e.key==='ArrowRight'||e.key==='ArrowDown')){e.preventDefault();step(1);}
 if(state.view==='dossier'&&(e.key==='ArrowLeft'||e.key==='ArrowUp')){e.preventDefault();step(-1);}
});

readHash();$('search').value=state.q;$('sort').value=state.sort;$('groupBy').value=state.groupBy;
renderStats();applyView();update();

// Wall-clock loop for normal browsing; PV capture drives renderAt(t) instead.
function loop(){if(stage&&state.view==='dossier'){const t=now();if(t-lastInput>3)stage.orbit.yaw+=.0025;stageFrame();stage.render(t);}requestAnimationFrame(loop);}
if(!PV)requestAnimationFrame(loop);

window.archive={
 records,summary:S,state,
 set(next){Object.assign(state,next);for(const f of FACETS)if(next[f.id])state[f.id]=new Set(next[f.id]);if(next.q!==undefined)$('search').value=next.q;$('sort').value=state.sort;$('groupBy').value=state.groupBy;applyView();update();},
 firstAsset:()=>filtered[0]?.asset,
 ...(PV?{_current:()=>current,_stage:()=>stage}:{}),  // capture/QA hooks only in ?pv=1 mode
 select:(a,o)=>select(a,o),
 setMotion(m){motion=m;if(current)setMotion(current,m);updateMotionUI();},
 showSkeleton(on){const s=ensureStage();s.showSkeleton(on);$('toggleBones').classList.toggle('on',on);},
 async waitModel(){let p;do{p=modelPromise;await p;}while(p!==modelPromise);},
 renderAt(t,yaw=-.35){if(!stage)return;stage.orbit.yaw=yaw;stageFrame();stage.render(t);},
 scroll(sel,y){const el=document.querySelector(sel);if(el)el.scrollTop=y;},
};
document.documentElement.dataset.ready='1';
