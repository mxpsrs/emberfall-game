const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.tutorial=38;s.tutorialReward=true;s.character={name:'Picking review'};activateScene('overworld',55,61);screen={w:800,h:390};
const base={face(){},indexed(){},skinned(){}},tests=[];
function renderPick(o){const capture=capturePickGeometry3(base);if(o.type==='tree')emitMesh3(capture.painter,cachedMesh3(o,'prop',r=>prop3(r,o,o.x+.5,o.y+.5)));else creature3(capture.painter,o,o.x+.5,o.y+.5);return capture.geometry;}
function commands(list){return list.flatMap(c=>c.cached?[...c.cached.instances.map(i=>({mesh:i.mesh,m:i.matrix})),...c.cached.faces.map(f=>({points:f.points}))]:[c]);}
// Independently project actual animated mesh triangles; test their visible outer
// regions, including where the former trunk/body rectangle missed the model.
function sample(c,id){const {m,palette}=c,mesh=pickReadableMesh3(c.mesh);let p=Array.from(mesh.p.slice(id*3,id*3+3));if(palette){const out=[0,0,0];for(let n=0;n<4;n++)for(let a=0;a<3;a++){const at=mesh.j[id*4+n]*12+a*4;out[a]+=mesh.w[id*4+n]*(palette[at]*p[0]+palette[at+1]*p[1]+palette[at+2]*p[2]+palette[at+3]);}p=out;}const q=briarPoint(p,0,m);return flatProject3(q[0],q[1]+landHeight(m[3],m[11])-walkSurfaceHeight(px+.5,py+.5),q[2]);}
function edgeSamples(geometry){const triangles=[];for(const c of commands(geometry)){if(!c.mesh)continue;const mesh=pickReadableMesh3(c.mesh);for(let i=0;i<mesh.i.length;i+=3){const a=sample(c,mesh.i[i]),b=sample(c,mesh.i[i+1]),d=sample(c,mesh.i[i+2]),area=Math.abs((b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x));if(area>.001)triangles.push({x:(a.x+b.x+d.x)/3,y:(a.y+b.y+d.y)/3});}}return [triangles.reduce((a,b)=>a.x<b.x?a:b),triangles.reduce((a,b)=>a.x>b.x?a:b),triangles.reduce((a,b)=>a.y<b.y?a:b)];}
let missesRepaired=0,cases=0;const start=Date.now();
for(const [index,species]of Object.keys(TREE_APPEARANCE).entries())for(const yaw of [-1.5,.4,2.2]){
 view3d.yaw=yaw;view3d.zoom=yaw<0?14:yaw<1?34:65;const o={id:9000000+index,type:'tree',resourceId:species,x:55,y:61,dead:0},geometry=renderPick(o),points=edgeSamples(geometry),trunk=project3(55.5,0,61.5);
 for(const p of points){assert(pickGeometry3(geometry,p.x,p.y),species+' canopy selectable');if(Math.abs(p.x-trunk.x)>cameraZoom3()*.55)missesRepaired++;}assert.equal(pickGeometry3(geometry,-10000,-10000),null);cases++;
}
for(const kind of ['rat','wolf','goblin','ork','colossus','veyr','varkesh','xalith'])for(const phase of [0,.35]){
 view3d.yaw=.6;view3d.zoom=phase?65:14;time=5+phase;const o={id:9010000+cases,type:'monster',kind,name:kind,x:55,y:61,drawX:55,drawY:61,dead:0,hp:100,maxhp:100,attackAt:phase?5:-100},geometry=renderPick(o);assert(geometry.length,kind+' rendered');
 for(const p of edgeSamples(geometry))assert(pickGeometry3(geometry,p.x,p.y),kind+' animated edge selectable');cases++;
}
for(const kind of ['wolf','varkesh','xalith']){view3d.zoom=34;const o={id:9500000+cases,type:'monster',kind,x:55,y:61,drawX:55,drawY:61,dead:0,attackAt:5},capture=capturePickGeometry3({face(){},indexed(){}});creature3(capture.painter,o,55.5,61.5);for(const p of edgeSamples(capture.geometry))assert(pickGeometry3(capture.geometry,p.x,p.y),kind+' CPU pose edge selectable');cases++;}
assert(missesRepaired>12,'canopy positions outside former trunk boxes are now selected');
const o={id:999,type:'tree',resourceId:'oak',x:55,y:61,dead:0},geometry=renderPick(o),p=edgeSamples(geometry)[0];hitboxes=[{o,geometry,depth:0}];let selected=null,walks=0;select=v=>selected=v;walkTo=()=>walks++;$('modal').open=$('creator').open=$('spiritsDialog').open=false;
clickWorld3({clientX:p.x,clientY:p.y});assert.equal(selected,o);assert.equal(walks,0);assert.equal(worldClickFeedback.interaction,true);assert.equal(worldPick({clientX:p.x,clientY:p.y}).objects[0],o,'long press / right-click shares canopy picking');
clickWorld3({clientX:-10000,clientY:-10000});assert.equal(walks,1,'empty space still walks');o.dead=time+10;assert.equal(worldHits3(p.x,p.y).length,0,'felled tree is not selectable');
const tri=z=>[{points:[[54,0,z],[56,0,z],[55,3,z]]}];view3d.yaw=0;const a={id:1,dead:0},b={id:2,dead:0};hitboxes=[{o:a,geometry:tri(61),depth:999},{o:b,geometry:tri(61.1),depth:-999}];const q=project3(55,1,61.05);assert.equal(worldHits3(q.x,q.y)[0].o,b,'visible surface depth wins over object-center depth');
const t=pickTriangle3(10,0,{x:0,y:0,depth:0},{x:8,y:0,depth:0},{x:0,y:8,depth:0},4);assert(t&&t.distance===2,'touch edge allowance');
console.log('PASS: '+cases+' rendered tree/monster poses; '+missesRepaired+' former canopy misses repaired; animated extremities, empty ground, corpse/felled-tree exclusion, shared primary/context picking, red feedback, depth ordering and touch edge allowance.');
// CSS scaling must not turn a visible object click into a ground click.
const originalBounds=canvas.getBoundingClientRect;canvas.getBoundingClientRect=()=>({left:30,top:20,width:400,height:195});
const clicked={id:'scaled-click',type:'prop',name:'Evidence',x:55,y:61};hitboxes=[{o:clicked,x:390,y:185,w:20,h:20,depth:0}];
const event={clientX:230,clientY:117.5};assert.equal(worldPick(event).objects[0],clicked);let selectedObject=null;select=o=>selectedObject=o;$('creator').open=$('modal').open=$('spiritsDialog').open=false;clickWorld3(event);assert.equal(selectedObject,clicked);canvas.getBoundingClientRect=originalBounds;
console.log('PASS: scaled desktop/mobile canvas uses the same object coordinates for click and context menu.');
`,ctx);
