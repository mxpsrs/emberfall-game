const {ctx,vm,fs}=require('./content-fixture.cjs');
const path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../..'),out=path.join(root,'.qa/migration/static');
fs.mkdirSync(path.join(out,'meshes'),{recursive:true});
const encode=(_,v)=>ArrayBuffer.isView(v)?{typed:v.constructor.name,base64:Buffer.from(v.buffer,v.byteOffset,v.byteLength).toString('base64')}:v;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),known=new WeakMap(),regions=new Map(),failures=[];
ctx.staticBuildingKey=b=>b.id??b.service?.id??hash(JSON.stringify([b.name,b.x,b.y,b.w,b.h,b.archetype])).slice(0,16);
function meshId(mesh){if(known.has(mesh))return known.get(mesh);const raw=JSON.stringify(mesh,encode),id=hash(raw);known.set(mesh,id);fs.writeFileSync(path.join(out,'meshes',id+'.json'),raw);return id;}
ctx.staticFailure=(scene,id,error)=>failures.push({scene,id,error:String(error)});
ctx.captureStatic=(scene,id,name,x,z,instances,faceMesh)=>{
 const parts=instances.map(p=>({mesh:meshId(p.mesh),transform:p.matrix}));
 if(faceMesh)parts.push({mesh:meshId(faceMesh),transform:[1,0,0,0,0,1,0,0,0,0,1,0]});
 if(!parts.length)return;
 const key=scene==='overworld'?'overworld-'+Math.floor(x/128)+'-'+Math.floor(z/128):scene;
 if(!regions.has(key))regions.set(key,{id:key,scene,entities:[]});
 regions.get(key).entities.push({id,name,parts});
};
vm.runInContext('('+function(){
 let seed=91482;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
 for(const [scene,w]of Object.entries(worldScenes)){
  currentScene=scene;s.sceneId=scene;time=0;objects.splice(0,objects.length,...w.objects);buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();
  function capture(id,name,x,z,fn){
   const data=[],instances=[],r={face:(...args)=>realmFaceData(data,...args),indexed:(mesh,matrix)=>instances.push({mesh,matrix:realmGroundedMatrix(matrix)})};
   try{fn(r);let mesh=null;if(data.length){const count=data.length/12,p=new Float32Array(count*3),n=new Float32Array(count*3),c=new Float32Array(count*3),t=new Uint8Array(count),uv=new Float32Array(count*2);
    for(let i=0;i<count;i++){p.set(data.slice(i*12,i*12+3),i*3);n.set(data.slice(i*12+3,i*12+6),i*3);c.set(data.slice(i*12+6,i*12+9),i*3);t[i]=data[i*12+9];uv.set(data.slice(i*12+10,i*12+12),i*2);}
    mesh={p,n,c,f:c,t,uv,i:Uint32Array.from({length:count},(_,i)=>i)};}
    captureStatic(scene,id,name,x,z,instances,mesh);
   }catch(error){staticFailure(scene,id,error.stack);}
  }
  for(const b of buildings){b._cutaway=false;capture(scene+':building:'+staticBuildingKey(b),b.name,b.x,b.y,r=>building3(r,b));}
  for(const o of objects){
   if(fighter(o)||o.characterSprite||['elder','shop','questgiver','spirit','villager','inn'].includes(o.type)||o.building?.walkIn)continue;
   if(o.arcPhantom||o.mountainKey==='memory'||['camp','crop','gate','fish'].includes(o.type))continue;
   capture(scene+':object:'+o.id,o.name,o.x,o.y,r=>prop3(r,o,o.x+.5,o.y+.5));
  }
 }
}.toString()+')()',ctx,{timeout:600000});
for(const region of regions.values())fs.writeFileSync(path.join(out,region.id+'.json'),JSON.stringify(region));
const report={regions:[...regions.values()].map(r=>({id:r.id,scene:r.scene,entities:r.entities.length})),failures,entities:[...regions.values()].reduce((n,r)=>n+r.entities.length,0)};
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({regions:regions.size,entities:report.entities,failures}));
