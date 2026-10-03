// Shared Three.js model stage for the archive viewer and PV hero shots.
// Time is always supplied by the host (render(t)); nothing reads the wall clock here.
import * as T from 'pg/app/vendor/three/build/three.module.js';
import {GLTFLoader} from 'pg/app/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from './skeleton-clone.mjs';

export const THREE=T;
const loader=new GLTFLoader();
const cache=new Map();

export function loadModel(glb){
 if(!cache.has(glb))cache.set(glb,loader.loadAsync(new URL(glb,new URL('../../showoff/',import.meta.url)).href));
 const p=cache.get(glb);
 if(cache.size>48){const first=cache.keys().next().value;if(first!==glb)cache.delete(first);}
 return p;
}

// Each call returns an independent instance (skinned meshes need a deep clone).
export async function instantiate(glb){return instanceFromGLTF(await loadModel(glb));}
export function instanceFromGLTF(g){
 const root=clone(g.scene);
 const mixer=new T.AnimationMixer(root);
 root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root,true);
 const bones={};root.traverse(o=>{if(o.isBone)bones[o.name]=o;});
 const bind=new Map(Object.values(bones).map(b=>[b,{q:b.quaternion.clone(),p:b.position.clone()}]));
 const inst={root,mixer,clips:g.animations,bones,bind,box,size:box.getSize(new T.Vector3()),center:box.getCenter(new T.Vector3())};
 inst.arms=captureArms(inst);
 setMotion(inst,'idle');
 return inst;
}
// Motion modes: 'idle' (GLB Idle clip), 'rig' (GLB Rig_Test clip), 'run' (the GLB's own Run/Walk clip
// when present, otherwise a procedural run cycle on the standard thigh/shin/upper_arm/forearm bones).
// Real run clips first; walk clips only when the model has no standard leg bones for the procedural run.
const RUN_CLIPS=['Run_InPlace','Run_In_Place','Jog_InPlace','Run','Run_Demo'],WALK_CLIPS=['Walk_InPlace','Walk','Walk_Lite'];
const runClipOf=inst=>RUN_CLIPS.map(n=>inst.clips.find(c=>c.name===n)).find(Boolean)??(inst.bones.thighL?null:WALK_CLIPS.map(n=>inst.clips.find(c=>c.name===n)).find(Boolean));
export function motionInfo(inst){
 const runClip=runClipOf(inst);
 return {run:runClip?`GLB 动画 ${runClip.name}${inst.armAssist?' + 摆臂补正':''}`:(inst.bones.thighL?'程序化跑步循环':null),rig:!!inst.clips.find(c=>c.name==='Rig_Test'),clips:inst.clips.map(c=>c.name)};
}
export function setMotion(inst,mode){
 inst.mixer.stopAllAction();for(const [b,v] of inst.bind){b.quaternion.copy(v.q);b.position.copy(v.p);}
 const pick=mode==='rig'?inst.clips.find(c=>c.name==='Rig_Test'):mode==='run'?runClipOf(inst):null;
 const clip=pick??(mode==='run'&&inst.bones.thighL?null:inst.clips.find(c=>c.name==='Idle')??inst.clips[0]);
 inst.mode=mode;inst.procedural=mode==='run'&&!pick;inst.clip=clip;inst.clipDuration=clip?.duration||1;
 if(clip)inst.mixer.clipAction(clip).play();
 inst.armAssist=mode==='run'&&!!pick&&inst.arms.length>0&&!!inst.bones.thighL&&clipArmSwing(inst)<.05;
}
const _q=new T.Quaternion(),_p=new T.Quaternion(),_x=new T.Vector3(1,0,0);
function rotateRigX(inst,bone,angle){
 // Rotate a bone by `angle` about the rig-space lateral axis, whatever its local axes are.
 if(!bone)return;const rigInv=inst.root.getWorldQuaternion(new T.Quaternion()).invert();
 bone.parent.updateWorldMatrix(true,false);_p.copy(rigInv).multiply(bone.parent.getWorldQuaternion(new T.Quaternion()));
 _q.setFromAxisAngle(_x,angle);bone.quaternion.copy(_p.clone().invert().multiply(_q).multiply(_p).multiply(inst.bind.get(bone).q));
}
// Arm frames in rig space, measured from the bind pose (handles A-pose, T-pose and mirrored local axes).
function captureArms(inst){
 const B=inst.bones,out=[];inst.root.updateMatrixWorld(true);const rigInv=inst.root.getWorldQuaternion(new T.Quaternion()).invert();
 for(const side of ['L','R'])for(const [name,child] of [['upper_arm','forearm'],['forearm','hand']]){
  const joint=B[name+side],tip=B[child+side];if(!joint||!tip)continue;
  const dir=tip.getWorldPosition(new T.Vector3()).sub(joint.getWorldPosition(new T.Vector3())).applyQuaternion(rigInv).normalize();
  out.push({joint,side,name,dir,rot:rigInv.clone().multiply(joint.getWorldQuaternion(new T.Quaternion()))});}
 return out;
}
// Aim a bone so its bind direction points along `target` (rig space), keeping its bind twist.
function aimRig(inst,f,target){
 const rigInv=inst.root.getWorldQuaternion(new T.Quaternion()).invert();
 f.joint.parent.updateWorldMatrix(true,false);
 const parent=rigInv.multiply(f.joint.parent.getWorldQuaternion(new T.Quaternion()));
 const desired=new T.Quaternion().setFromUnitVectors(f.dir,target).multiply(f.rot);
 f.joint.quaternion.copy(parent.invert().multiply(desired));
}
// Arms: hang the upper arm just outside the body, swing it fore/aft opposite to the same-side leg
// (sL = +1 when the left leg is fully forward), and bend the elbow forward. Rotating the bind pose
// about the lateral axis instead would only spin wide A/T-pose arms around themselves.
const AX=new T.Vector3(1,0,0);
function swingArms(inst,sL){
 for(const f of inst.arms){
  const out=Math.sign(f.dir.x)||(f.side==='L'?1:-1),swing=.6*sL*(f.side==='L'?1:-1);
  const upper=new T.Vector3(out*.32,-1,0).normalize().applyAxisAngle(AX,swing);
  aimRig(inst,f,f.name==='upper_arm'?upper:upper.clone().applyAxisAngle(AX,-.95));}
}
// Forward component of the left thigh in rig space (used to phase-lock arms to an authored clip's legs).
function thighForward(inst){const a=inst.bones.thighL,b=inst.bones.shinL;if(!a||!b)return 0;inst.root.updateMatrixWorld(true);
 const inv=inst.root.matrixWorld.clone().invert();const d=b.getWorldPosition(new T.Vector3()).applyMatrix4(inv).sub(a.getWorldPosition(new T.Vector3()).applyMatrix4(inv));return d.z/Math.max(d.length(),1e-6);}
// Hand fore/aft travel over one clip loop, as a fraction of body height (detects clips with frozen arms).
function clipArmSwing(inst){const h=inst.bones.handL||inst.bones.forearmL,u=inst.bones.upper_armL;if(!h||!u)return 1;const zs=[],fw=[];
 for(let k=0;k<12;k++){inst.mixer.setTime(k/12*inst.clipDuration);inst.root.updateMatrixWorld(true);const inv=inst.root.matrixWorld.clone().invert();
  zs.push(h.getWorldPosition(new T.Vector3()).applyMatrix4(inv).z-u.getWorldPosition(new T.Vector3()).applyMatrix4(inv).z);fw.push(Math.abs(thighForward(inst)));}
 inst.legReach=Math.max(...fw,.05);return (Math.max(...zs)-Math.min(...zs))/inst.box.getSize(new T.Vector3()).y;}
function proceduralRun(inst,t){
 const B=inst.bones,ph=t*Math.PI*2*1.45,s=Math.sin(ph),c=Math.cos(ph);
 for(const [b,v] of inst.bind){b.quaternion.copy(v.q);b.position.copy(v.p);}
 rotateRigX(inst,B.spine,.18);
 for(const [side,sign] of [['L',1],['R',-1]]){const ls=s*sign,lc=c*sign;
  rotateRigX(inst,B['thigh'+side],-.8*ls);rotateRigX(inst,B['shin'+side],.25+1.0*Math.max(0,lc));}
 swingArms(inst,s);
 if(B.hips)B.hips.position.y=inst.bind.get(B.hips).p.y+Math.abs(c)*.06*inst.size.y;
}

export class ModelStage{
 constructor(canvas,{background=null,pixelRatio=Math.min(2,globalThis.devicePixelRatio||1)}={}){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:background===null,preserveDrawingBuffer:true});
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setPixelRatio(pixelRatio);
  this.scene=new T.Scene();if(background)this.scene.background=new T.Color(background);else this.renderer.setClearColor(0x000000,0);
  this.camera=new T.PerspectiveCamera(26,1,.1,800);
  this.hemi=new T.HemisphereLight(0xfff8ee,0x30384a,1.9);this.scene.add(this.hemi);
  this.key=new T.DirectionalLight(0xffffff,2.5);this.key.position.set(-6,10,9);this.scene.add(this.key);
  this.rim=new T.DirectionalLight(0x9fdcff,2.2);this.rim.position.set(8,5,-9);this.scene.add(this.rim);
  this.floor=makeFloor();this.scene.add(this.floor);
  this.V3=T.Vector3;this.actors=[];this.orbit={yaw:-.35,pitch:.06,zoom:1};this.helpers=[];this.skeleton=false;this.speed=0;
 }
 showSkeleton(on){this.skeleton=on;for(const h of this.helpers)this.scene.remove(h);this.helpers=[];
  if(on)for(const a of this.actors){const h=new T.SkeletonHelper(a.root);h.material.color.set('#ffd400');h.material.depthTest=false;h.material.transparent=true;h.renderOrder=9;this.scene.add(h);this.helpers.push(h);
   const pts=[];a.root.traverse(o=>{if(o.isBone)pts.push(o);});const geo=new T.SphereGeometry(.06*a.size.y/5,8,6),mat=new T.MeshBasicMaterial({color:'#27c0e6',depthTest:false,transparent:true});
   for(const b of pts){const m=new T.Mesh(geo,mat);m.renderOrder=10;b.add(m);m.userData.joint=true;}h.userData.joints=pts;}
  else for(const a of this.actors)a.root.traverse(o=>{for(const ch of [...o.children])if(ch.userData.joint)o.remove(ch);});
 }
 setRimColor(c){this.rim.color.set(c);this.floor.material.uniforms.tint.value.set(c);}
 resize(w,h){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 clear(){if(this.skeleton)this.showSkeleton(false),this.skeleton=true;for(const h of this.helpers)this.scene.remove(h);this.helpers=[];for(const a of this.actors)this.scene.remove(a.root);this.actors=[];}
 // Normalises every model to a height of ~5 units, standing at x.
 add(inst,{x=0,z=0,yaw=0,height=5}={}){
  const s=height/Math.max(inst.size.y,.01);
  inst.root.scale.setScalar(s);inst.root.position.set(x-inst.center.x*s,-inst.box.min.y*s,z-inst.center.z*s);
  inst.root.rotation.y=yaw;inst.baseYaw=yaw;this.scene.add(inst.root);this.actors.push(inst);if(this.skeleton)this.showSkeleton(true);return inst;
 }
 frame({target=new T.Vector3(0,2.5,0),distance=15,yaw=this.orbit.yaw,pitch=this.orbit.pitch}={}){
  const d=distance*this.orbit.zoom;
  this.camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*d,target.y+Math.sin(pitch)*d,target.z+Math.cos(yaw)*Math.cos(pitch)*d);
  this.camera.lookAt(target);
 }
 render(t){
  let running=false;
  for(const a of this.actors){
   if(a.procedural)proceduralRun(a,t);
   else{a.mixer.setTime(t%a.clipDuration);
    // Keep translating run/walk clips in place: pin root and hips to their bind x/z.
    if(a.mode==='run')for(const b of [a.bones.root,a.bones.hips])if(b){const p=a.bind.get(b).p;b.position.x=p.x;b.position.z=p.z;}
    if(a.armAssist)swingArms(a,Math.max(-1,Math.min(1,thighForward(a)/a.legReach)));}
   running||=a.mode==='run';}
  this.floor.material.uniforms.time.value=running?t*14:t;
  this.renderer.render(this.scene,this.camera);
 }
}

function makeFloor(){
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},tint:{value:new T.Color('#ffd400')}},
  vertexShader:'varying vec2 v;void main(){v=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 v;uniform float time;uniform vec3 tint;
  void main(){float r=length(v);float ring=smoothstep(.05,0.,abs(r-2.6))*.75+smoothstep(.03,0.,abs(r-3.3))*.35;
   float a=atan(v.y,v.x);float ticks=step(.92,fract(a*36./6.2831+time*.05))*smoothstep(.04,0.,abs(r-3.8));
   float glow=exp(-r*r*.3)*.3;float alpha=(ring+ticks*.7+glow)*smoothstep(5.,3.,r);
   gl_FragColor=vec4(mix(vec3(1.),tint,.75),alpha);}`});
 const mesh=new T.Mesh(new T.PlaneGeometry(16,16),m);mesh.rotation.x=-Math.PI/2;mesh.position.y=.01;return mesh;
}
