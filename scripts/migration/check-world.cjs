// Independent comparison against fresh world construction; never loads native scenes.
const {ctx,vm,fs}=require('./content-fixture.cjs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'migration'),report={scenes:0,entities:0,scalarFields:0,terrainSamples:0,navigationSamples:0,relationships:0,failures:[]};
ctx.checkScene=(scene,w,width,height,sample)=>{
 const saved=JSON.parse(fs.readFileSync(path.join(out,'content/scenes',scene+'.json'),'utf8'));
 if(saved.dimensions[0]!==width||saved.dimensions[1]!==height)report.failures.push({scene,error:'Dimensions differ'});
 const ids=new Map(saved.entities.map(e=>[String(e.source.id),e]));
 if(w.objects.length!==ids.size)report.failures.push({scene,error:'Object count differs'});
 for(const object of w.objects){
  const s=ids.get(String(object.id));if(!s){report.failures.push({scene,entity:object.id,error:'Missing object'});continue;}
  for(const [key,value]of Object.entries(object)){
   if(value===null||['string','boolean','number'].includes(typeof value)&&Number.isFinite(typeof value==='number'?value:0)){
    report.scalarFields++;if(s.source[key]!==value)report.failures.push({scene,entity:object.id,key,expected:value,actual:s.source[key]});
   }
   if(key==='building'&&value){report.relationships++;if(w.buildings.includes(value)){if(!s.source.building?.$entity?.startsWith(scene+':building:'))report.failures.push({scene,entity:object.id,error:'Missing registered building relationship'});}else{for(const [field,v]of Object.entries(value))if(v===null||['string','number','boolean'].includes(typeof v)){if(s.source.building?.[field]!==v)report.failures.push({scene,entity:object.id,error:'Inline source building differs',field});}}}
  }
  report.entities++;
 }
 const heights=fs.readFileSync(path.join(out,'content/terrain',scene+'.height.f32')),walk=fs.readFileSync(path.join(out,'content/terrain',scene+'.walk.f32')),nav=fs.readFileSync(path.join(out,'content/terrain',scene+'.blocked.u8'));
 for(const p of sample){
  report.terrainSamples+=2;report.navigationSamples++;
  if(Math.abs(heights.readFloatLE((p.z*(width+1)+p.x)*4)-p.height)>0.00003||Math.abs(walk.readFloatLE((p.z*width+p.x)*4)-p.walk)>0.00003||nav[p.z*width+p.x]!==p.blocked)report.failures.push({scene,sample:p,error:'Terrain/navigation differs'});
 }
 report.scenes++;
};
vm.runInContext('('+function(){
 let seed=91482;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
 for(const [scene,w]of Object.entries(worldScenes)){
  currentScene=scene;s.sceneId=scene;objects.splice(0,objects.length,...w.objects);buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();realmNavigation.clear();
  const [width,height]=sceneSize(),nav=realmNav(),sample=[];
  for(let i=0;i<12;i++){const x=(i*997+17)%width,z=(i*257+13)%height;sample.push({x,z,height:landHeight(x,z),walk:walkSurfaceHeight(x+.5,z+.5),blocked:realmCellBlocked(nav,z*width+x)});}
  checkScene(scene,w,width,height,sample);
 }
}.toString()+')()',ctx,{timeout:300000});
const inventory=JSON.parse(fs.readFileSync(path.join(out,'reports/world-content.json'),'utf8'));
for(const file of inventory.files){const raw=fs.readFileSync(path.join(root,file.path));if(crypto.createHash('sha256').update(raw).digest('hex')!==file.sha256)report.failures.push({file:file.path,error:'Hash differs'});}
fs.writeFileSync(path.join(out,'reports/world-parity.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=report.failures.length?1:0;
