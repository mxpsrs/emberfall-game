// Release measurements from the instantiated world and production mesh builders.
const {ctx,vm,fs}=require('./game-fixture.cjs');
ctx.measurementPath=process.argv[2]||'docs/environment-review/measurements.json';
vm.runInContext(`
renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',55,61,false);
const measurement={scope:'Instantiated production world and geometry; not a human timed navigation study',settlements:[],scale:[],props:{count:0,grounded:0,exceptions:[]},rooms:{count:0,purposeful:0,exceptions:[]},roads:{samples:0,readable:0,gaps:[]}};
for(const t of SETTLEMENTS){
 const homes=buildings.filter(b=>b.settlement===t.id&&b.archetype==='house'),profiles={};
 for(const b of homes){const key=[b.race,b.w,b.h,b.variant||0,b.doorFacing].join(':');profiles[key]=(profiles[key]||0)+1;}
 const plan=settlementPlans.get(t.id);
 measurement.settlements.push({name:t.name,homes:homes.length,profiles,maxIdenticalShare:Math.max(0,...Object.values(profiles))/Math.max(1,homes.length),entrances:plan.entrances,roadSegments:plan.roads.length});
}
// Measured world-space bounds, including both mesh packs and deliberate custom forms.
let bounds;
const point=p=>{if(!p.every(Number.isFinite))throw new Error('Nonfinite mesh vertex');for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],p[i]);bounds.max[i]=Math.max(bounds.max[i],p[i]);}};
const painter={face(points){for(const p of points)point([p[0],p[1]+landHeight(p[0],p[2]),p[2]]);},indexed(mesh,m){const matrix=Array.from(m);matrix[7]+=landHeight(m[3],m[11]);for(let i=0;i<mesh.p.length;i+=3)point(briarPoint(mesh.p,i,matrix));}};
const sample=(name,kind,fn)=>{bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};fn();return {name,kind,min:bounds.min,max:bounds.max,size:bounds.max.map((x,i)=>x-bounds.min[i])};};
for(const race of ['human','dwarf','elf'])for(const type of ['house','shop','inn','hall','forge']){
 const b=buildings.find(b=>b.race===race&&b.archetype===type&&!b.civilCastle);if(!b)continue;
 b._cutaway=false;const result=sample(b.name,'building',()=>building3(painter,b));
 result.footprint=[b.w,b.h];result.doorWidthTiles=1;measurement.scale.push(result);
}
for(const b of buildings.filter(b=>b.civilCastle)){b._cutaway=false;measurement.scale.push(sample(b.name,'castle',()=>building3(painter,b)));}
for(const kind of ['well','bench','table','sign','cart','barrel']){const o=objects.find(o=>o.propKind===kind&&o.placement);if(o)measurement.scale.push(sample(o.name,kind,()=>prop3(painter,o,o.x+.5,o.y+.5)));}
for(const [scene,w]of Object.entries(worldScenes)){
 currentScene=scene;
 for(const o of w.objects.filter(o=>o.placement)){
  measurement.props.count++;
  const x=o.x+.5,z=o.y+.5,h=walkSurfaceHeight(x,z);
  // Placement uses a shared terrain/floor anchor. Check that this anchor and
  // every footprint corner are finite and near the same supporting surface.
  const box=propBox(o),heights=[[x,z],[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom]].map(p=>walkSurfaceHeight(...p));
  const spread=Math.max(...heights)-Math.min(...heights);
  if(Number.isFinite(h)&&heights.every(Number.isFinite)&&spread<=.25)measurement.props.grounded++;
  else measurement.props.exceptions.push({scene,id:o.id,name:o.name,spread,position:[o.x,o.y],kind:o.propKind});
 }
}
for(const r of propPlacementRooms.values()){
 measurement.rooms.count++;
 const props=r.props.filter(o=>o.placement?.reason&&o.placement?.anchor&&PROP_RULES[o.propKind]?.rooms?.includes(r.usage));
 if(props.length)measurement.rooms.purposeful++;else measurement.rooms.exceptions.push({id:r.id,usage:r.usage});
}
currentScene='overworld';
// Sample every intended authored route, weighted at one sample per tile.
// organicRoads is the final authored route network. realmRoads is the retired
// axis-aligned precursor and includes straight chords replaced by curved paths.
const segments=organicRoads;
for(const segment of segments){
 const {a,b}=segment,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));if(!n)continue;
 for(let i=0;i<n;i++){const t=(i+.5)/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;measurement.roads.samples++;
  if(roadInfluence(x,y)[0]>.08||bridgesInRealm().some(k=>Math.abs(x-k.x)<(k.eastWest?k.span/2:k.width/2)&&Math.abs(y-k.z)<(k.eastWest?k.width/2:k.span/2)))measurement.roads.readable++;
  else if(measurement.roads.gaps.length<50)measurement.roads.gaps.push([x,y]);
 }
}
measurement.props.groundedShare=measurement.props.grounded/measurement.props.count;
measurement.rooms.purposefulShare=measurement.rooms.purposeful/measurement.rooms.count;
measurement.roads.readableShare=measurement.roads.readable/measurement.roads.samples;
measurementResult=measurement;
console.log(JSON.stringify({settlements:measurement.settlements,scaleSamples:measurement.scale.length,props:{...measurement.props,exceptions:measurement.props.exceptions.slice(0,10)},rooms:{...measurement.rooms,exceptions:measurement.rooms.exceptions.slice(0,5)},roads:measurement.roads}));
`,ctx);
fs.writeFileSync(ctx.measurementPath,JSON.stringify(ctx.measurementResult,null,2));
