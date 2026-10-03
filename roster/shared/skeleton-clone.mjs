// Skinned-mesh aware clone, adapted from three.js examples/jsm/utils/SkeletonUtils.clone (MIT).
export function clone(source){
 const sourceLookup=new Map(),cloneLookup=new Map(),copy=source.clone();
 parallel(source,copy,(a,b)=>{sourceLookup.set(b,a);cloneLookup.set(a,b);});
 copy.traverse(node=>{
  if(!node.isSkinnedMesh)return;
  const src=sourceLookup.get(node),bones=src.skeleton.bones;
  node.skeleton=src.skeleton.clone();node.bindMatrix.copy(src.bindMatrix);
  node.skeleton.bones=bones.map(b=>cloneLookup.get(b));
  node.bind(node.skeleton,node.bindMatrix);
 });
 return copy;
}
function parallel(a,b,cb){cb(a,b);for(let i=0;i<a.children.length;i++)parallel(a.children[i],b.children[i],cb);}
