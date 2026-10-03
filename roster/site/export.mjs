// Single-model exports for the dossier: the raw GLB, or a standalone offline HTML viewer
// (Three.js + shared stage code + the GLB embedded as base64; Idle / Run / Rig_Test / skeleton).
const base=new URL('../',import.meta.url);
const VENDOR={
 'pg/app/vendor/three/build/three.core.js':'../showoff/runtime-modules/vendor/three/build/three.core.js',
 'pg/app/vendor/three/build/three.module.js':'../showoff/runtime-modules/vendor/three/build/three.module.js',
 'pg/app/vendor/three/examples/jsm/loaders/GLTFLoader.js':'../showoff/runtime-modules/vendor/three/examples/jsm/loaders/GLTFLoader.js',
 'pg/app/vendor/three/examples/jsm/utils/BufferGeometryUtils.js':'../showoff/runtime-modules/vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ASCII-only file names: some browsers/OSes drop non-ASCII download names.
const TRANS={'ł':'l','Ł':'L','æ':'ae','Æ':'AE','ø':'o','Ø':'O','ß':'ss','đ':'d','œ':'oe'};
const ascii=s=>String(s||'').replace(/[łŁæÆøØßđœ]/g,c=>TRANS[c]).normalize('NFKD').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
export const fileStem=r=>[r.code||'NOCODE',ascii(r.appellation||r.nameEn)||'operator',r.asset.slice(0,8)].join('_');
function b64(bytes){let s='';const u=new Uint8Array(bytes);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);}
const dataJS=src=>'data:text/javascript;base64,'+b64(new TextEncoder().encode(src));
const fetchText=async u=>{const r=await fetch(new URL(u,base));if(!r.ok)throw new Error(u+' '+r.status);return r.text();};
export async function glbBytes(r){const res=await fetch(new URL('../showoff/'+r.glb,base));if(!res.ok)throw new Error('GLB '+res.status);return res.arrayBuffer();}
export function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}

export async function standaloneHTML(r,meta){
 const imports={};
 for(const [spec,path] of Object.entries(VENDOR))imports[spec]=dataJS(await fetchText(path));
 imports['skeleton-clone']=dataJS(await fetchText('shared/skeleton-clone.mjs'));
 imports['stage']=dataJS((await fetchText('shared/stage.mjs')).replace("'./skeleton-clone.mjs'","'skeleton-clone'"));
 const glb=b64(await glbBytes(r));
 const licensePaths={
  '原创代码 MIT':'../LICENSE',
  '角色资源使用条款':'../ASSET-USAGE.md',
  'CC BY-NC 4.0 完整许可':'../LICENSES/CC-BY-NC-4.0.txt',
  '版权声明':'../NOTICE',
  'Three.js MIT':'../showoff/runtime-modules/vendor/three/LICENSE',
 };
 const licenses=await Promise.all(Object.entries(licensePaths).map(async ([title,path])=>({title,text:await fetchText(path)})));
 const licenseHTML=licenses.map(l=>`<h3>${esc(l.title)}</h3><pre>${esc(l.text)}</pre>`).join('');
 const info={name:r.name,en:r.appellation||r.nameEn||'',code:r.code||'',rarity:r.rarity,prof:meta.prof,factions:r.factions,ip:r.ip,form:r.form,key:r.key,model:r.model,accent:meta.accent,usage:r.usage||''};
 return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.name)} · PRTS 单体档案</title>
<style>
 html,body{margin:0;height:100%;background:#0e0f11;color:#ecebe6;font:14px/1.5 "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden}
 canvas{position:fixed;inset:0;width:100%;height:100%;cursor:grab}
 .info{position:fixed;left:28px;bottom:28px;max-width:460px;pointer-events:none}
 .code{font:500 13px monospace;letter-spacing:.2em;color:#8d9096}.stars{color:#ffd23f;margin-left:10px}
 h1{margin:4px 0;font-size:52px;font-weight:900;letter-spacing:.04em}h1 small{display:block;font-size:15px;letter-spacing:.3em;color:#8d9096;font-weight:500}
 .prof{display:inline-block;background:${esc(meta.accent)};color:#111;font-weight:800;padding:3px 12px;margin:6px 0}
 .chips span{display:inline-block;border:1px solid rgba(255,255,255,.25);padding:1px 8px;margin:0 4px 4px 0;font-size:12px}
 .meta{font:11px monospace;color:#5b5f66;margin-top:8px}
 .bar{position:fixed;right:24px;top:24px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
 .bar button{background:rgba(0,0,0,.5);color:#ecebe6;border:1px solid rgba(255,255,255,.25);height:34px;padding:0 12px;cursor:pointer;font:inherit}
 .bar button.on{background:${esc(meta.accent)};color:#111;border-color:${esc(meta.accent)};font-weight:700}
 .note{position:fixed;right:24px;top:66px;font-size:11px;color:#5b5f66;text-align:right;max-width:360px}
 .licenses{position:fixed;right:20px;bottom:20px;max-width:620px;background:#17191e;border:1px solid #666;padding:8px;max-height:60vh;overflow:auto;font-size:12px}.licenses pre{white-space:pre-wrap;overflow-wrap:anywhere}.licenses summary{cursor:pointer}
 .top{position:fixed;left:0;top:0;width:220px;height:3px;background:${esc(meta.accent)}}
</style>
<script type="importmap">${JSON.stringify({imports})}</script></head>
<body><canvas id="c"></canvas><div class="top"></div>
<div class="bar"><button data-m="idle" class="on">待机 IDLE</button><button data-m="run">跑动 RUN</button><button data-m="rig">测试动作 RIG</button><button id="bones">骨骼 BONES</button></div>
<div class="note" id="note"></div>
<div class="info"><div class="code">${esc(info.code)}<span class="stars">${'★'.repeat(info.rarity)}</span></div>
<h1>${esc(info.name)}<small>${esc(info.en.toUpperCase())}</small></h1><div class="prof">${esc(info.prof)}</div>
<div class="chips">${info.factions.map(f=>`<span>${esc(f)}</span>`).join('')}${info.ip?`<span>${esc(info.ip)}</span>`:''}</div>
<div>${esc(info.usage)}</div><div class="meta">MODEL ${esc(info.model)} · FORM ${esc(info.form)} · ASSET ${esc(info.key)}<br>同人模型资源：Douglath / arknights-character-console<br>非官方 · CC BY-NC 4.0 · 角色版权归鹰角网络；联动角色归各自版权方</div></div>
<details class="licenses"><summary>使用条款与完整许可</summary>${licenseHTML}</details>
<script type="module">
import {GLTFLoader} from 'pg/app/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {ModelStage,instanceFromGLTF,setMotion,motionInfo} from 'stage';
const bin=Uint8Array.from(atob('${glb}'),c=>c.charCodeAt(0)).buffer;
const g=await new GLTFLoader().parseAsync(bin,'');
const canvas=document.getElementById('c'),stage=new ModelStage(canvas,{});stage.setRimColor(${JSON.stringify(meta.accent)});
const inst=instanceFromGLTF(g);stage.add(inst,{height:5});
const mi=motionInfo(inst);document.getElementById('note').textContent='跑动：'+(mi.run||'不可用')+' · 内置动画：'+mi.clips.join(' / ')+' · 头发/尾巴物理与眨眼脚本不在 GLB 中';
const fit=()=>stage.resize(innerWidth,innerHeight);addEventListener('resize',fit);fit();
let drag=null,idle=0;canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,yaw:stage.orbit.yaw,pitch:stage.orbit.pitch};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;stage.orbit.yaw=drag.yaw-(e.clientX-drag.x)*.008;stage.orbit.pitch=Math.max(-.2,Math.min(.8,drag.pitch+(e.clientY-drag.y)*.005));idle=performance.now();};
canvas.onpointerup=()=>drag=null;canvas.onwheel=e=>{e.preventDefault();stage.orbit.zoom=Math.max(.5,Math.min(1.7,stage.orbit.zoom*(1+e.deltaY*.001)));};
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{setMotion(inst,b.dataset.m);document.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',x===b));});
document.getElementById('bones').onclick=e=>{stage.showSkeleton(!stage.skeleton);e.target.classList.toggle('on',stage.skeleton);};
const t0=performance.now();(function loop(){const t=(performance.now()-t0)/1000;if(performance.now()-idle>3000)stage.orbit.yaw+=.003;
 const wide=innerWidth>innerHeight;stage.frame({distance:wide?19:23,target:new stage.V3(wide?-1.6:0,wide?2.6:3.4,0)});stage.render(t);requestAnimationFrame(loop);})();
</script></body></html>`;
}
