// Deterministic content snapshot, not an invented Vervesis project/scene format.
const {ctx,vm,fs,scriptOrder,omitted}=require('./content-fixture.cjs');
const path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../..'),out=path.join(root,'migration/content');
const check=process.argv.includes('--check'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
for(const d of ['scenes','terrain','data','behavior-reference'])fs.mkdirSync(path.join(out,d),{recursive:true});
const report={baselineCommit:'439dfaaea6e144ab9f2e8ab30304f9c34c1915b2',seed:91482,format:'Veldren source-content snapshot, not a Vervesis schema',coordinateEvidence:{map:['x','y'],render:['x','upY','z=mapY'],tileSize:1,forward:'+Z',yaw:'radians, atan2(dx,dz)',engineUnits:'Unconfirmed; do not assume physical metres'},scriptOrder,omitted,scenes:[],data:[],behaviors:[],files:[],failures:[]};
const keys=new Map(),seen=new Map(),behaviors=new Map();let compared=0;
ctx.buildingKey=b=>b.id??b.service?.id??sha(JSON.stringify([b.name,b.x,b.y,b.w,b.h,b.archetype])).slice(0,16);
function encode(v,pointer='$'){
 if(typeof v==='function'){const code=v.toString(),id=sha(code);behaviors.set(id,code);return {$behavior:id,executable:false};}
 if(v===undefined)return {$undefined:true};
 if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};
 if(v===null||typeof v!=='object')return v;
 if(keys.has(v)&&pointer!==keys.get(v))return {$entity:keys.get(v)};
 if(seen.has(v))return {$pointer:seen.get(v)};
 seen.set(v,pointer);
 if(ArrayBuffer.isView(v))return {$typed:v.constructor.name,values:Array.from(v)};
 const kind=Object.prototype.toString.call(v);
 if(kind==='[object Map]')return {$map:[...v.entries()].map((x,i)=>encode(x,pointer+'/'+i))};
 if(kind==='[object Set]')return {$set:[...v].map((x,i)=>encode(x,pointer+'/'+i))};
 if(Array.isArray(v))return v.map((x,i)=>encode(x,pointer+'/'+i));
 return Object.fromEntries(Object.keys(v).sort().map(k=>[k,encode(v[k],pointer+'/'+k)]));
}
function snapshot(v,pointer){seen.clear();return encode(v,pointer);}
function write(name,raw){
 const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(JSON.stringify(raw,null,2)+'\n'),target=path.join(out,name),digest=sha(bytes);
 if(check){if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==digest)report.failures.push({file:name,error:'Deterministic re-export differs'});else compared++;}
 else fs.writeFileSync(target,bytes);
 report.files.push({path:'migration/content/'+name,sha256:digest,bytes:bytes.length});
}
ctx.registerWorld=world=>{
 for(const [scene,w]of Object.entries(world)){
  for(const o of w.objects){const key=scene+':object:'+o.id;if([...keys.values()].includes(key))throw Error('Duplicate entity '+key);keys.set(o,key);}
  for(const b of w.buildings){const key=scene+':building:'+ctx.buildingKey(b);if([...keys.values()].includes(key))throw Error('Duplicate entity '+key);keys.set(b,key);}
 }
};
ctx.captureScene=(scene,w,dimensions,transforms)=>{
 const meta={...w};delete meta.objects;delete meta.buildings;
 const data={id:scene,dimensions,metadata:snapshot(meta,'scene:'+scene),entities:w.objects.map(o=>({id:keys.get(o),source:snapshot(o,keys.get(o)),renderPosition:transforms.objects[String(o.id)]})),buildings:w.buildings.map(b=>({id:keys.get(b),source:snapshot(b,keys.get(b)),sourceRotationMatrix:transforms.buildings[String(ctx.buildingKey(b))]}))};
 write('scenes/'+scene+'.json',data);report.scenes.push({id:scene,dimensions,objects:data.entities.length,buildings:data.buildings.length});
};
ctx.captureTerrain=(scene,width,height,corners,walk,nav)=>{
 for(const [name,v]of [['height.f32',corners],['walk.f32',walk],['blocked.u8',nav]])write('terrain/'+scene+'.'+name,Buffer.from(v.buffer,v.byteOffset,v.byteLength));
};
ctx.captureData=(name,value)=>{write('data/'+name+'.json',snapshot(value,'data:'+name));report.data.push(name);};
vm.runInContext('('+function(){
 let seed=91482;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();registerWorld(worldScenes);
 for(const [scene,w]of Object.entries(worldScenes)){
  currentScene=scene;s.sceneId=scene;objects.splice(0,objects.length,...w.objects);buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();realmNavigation.clear();
  const [width,height]=sceneSize(),transforms={objects:{},buildings:{}};
  for(const o of w.objects)transforms.objects[String(o.id)]=[o.x+.5,walkSurfaceHeight(o.x+.5,o.y+.5),o.y+.5];
  for(const b of w.buildings)transforms.buildings[String(buildingKey(b))]=buildingRotation(b);
  captureScene(scene,w,[width,height],transforms);
  const corners=new Float32Array((width+1)*(height+1)),walk=new Float32Array(width*height),nav=new Uint8Array(width*height),n=realmNav();
  for(let z=0;z<=height;z++)for(let x=0;x<=width;x++)corners[z*(width+1)+x]=landHeight(x,z);
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){walk[z*width+x]=walkSurfaceHeight(x+.5,z+.5);nav[z*width+x]=realmCellBlocked(n,z*width+x);}
  captureTerrain(scene,width,height,corners,walk,nav);
 }
}.toString()+')()',ctx,{timeout:1500000});
const names=new Set(['ITEMS','SPELLS','tutorialSteps','creatureKinds','sceneSizes','view3d','SETTLEMENTS']);
for(const file of scriptOrder.filter(f=>!omitted.includes(f)&&!f.startsWith('assets/'))){
 const code=fs.readFileSync(path.join(root,'dist',file),'utf8');
 for(const m of code.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z_0-9]+)\s*=/g))names.add(m[1]);
}
const exclusions=new Set(['REALM_MODELS','REALM_CREATURES','APPROVED_CREATURES','ECOLOGY_LAYOUT','BRIAR_ASSETS','AC']); // AC is a function-local browser AudioContext alias, not game data.
for(const name of [...names].sort()){
 if(exclusions.has(name))continue;
 try{const value=vm.runInContext(name,ctx);if(typeof value!=='function')ctx.captureData(name,value);}
 catch(error){report.failures.push({binding:name,error:String(error)});}
}
for(const [id,code]of behaviors){write('behavior-reference/'+id+'.js',Buffer.from('// Source reference only; not executable in the native runtime.\n'+code+'\n'));report.behaviors.push(id);}
write('data/server-shared-catalog.json',Buffer.from(fs.readFileSync(path.join(root,'worker/shared-catalog.json'))));
report.counts={scenes:report.scenes.length,objects:report.scenes.reduce((n,s)=>n+s.objects,0),buildings:report.scenes.reduce((n,s)=>n+s.buildings,0),data:report.data.length,behaviors:behaviors.size};
report.terrain={height:'Little-endian float32 grid vertices; rows z, columns x. Width+1 by height+1.',walk:'Little-endian float32 cell-centre walk heights including bridges.',navigation:'Static Uint8 tile blockage after resolving lazy cell values. Moving actors, doors and quest gates remain state-dependent.',triangles:'NW-SW-SE for local z>=x, otherwise NW-NE-SE.'};
if(check){fs.writeFileSync(path.join(root,'migration/reports/world-reexport.json'),JSON.stringify({compared,failures:report.failures,counts:report.counts},null,2)+'\n');}
else fs.writeFileSync(path.join(root,'migration/reports/world-content.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({check,compared,counts:report.counts,failures:report.failures}));process.exitCode=report.failures.length?1:0;
