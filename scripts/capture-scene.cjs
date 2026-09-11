// Export the game's actual geometry and shaders for offscreen OpenGL ES review.
// This is a render check, not browser or touch-input emulation.
const fs=require('fs'),vm=require('vm'),path=require('path');
const output=process.argv[2];if(!output)throw new Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const noop=()=>{},elements={};function element(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,setPointerCapture:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({width:1112,height:512,left:0,top:0}),showModal(){this.open=true},close(){this.open=false}}}
let next=0;const entries=[];
const sandbox={console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})},
 upload(data){const name='mesh-'+next+++'.bin';fs.writeFileSync(path.join(output,name),Buffer.from(data.buffer,data.byteOffset,data.byteLength));return {buffer:name,count:data.length/12}},
 capture(data){fs.writeFileSync(path.join(output,'scene.json'),JSON.stringify(data));},choice:process.argv[3]||'willow-inside',posePhase:Number(process.argv[4]||0)};
vm.createContext(sandbox);
for(const name of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game','view3d','art-direction','renderer-gl','kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name+'.js'),'utf8'),sandbox,{filename:name});
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();screen={w:1112,h:512};s.character={name:'Adventurer',look:0,frame:'male',hair:0,race:'human'};s.equipment={weapon:'bronzeSword',body:'leatherArmor'};s.worldClock=120;time=1;assetsReady=true;
const captureInn=buildings.find(b=>b.service?.destination==='willowInn');
if(choice==='willow-inside')activateScene('overworld',captureInn.service.x,captureInn.service.y-2);
else if(choice==='willow-outside')activateScene('overworld',captureInn.service.x,captureInn.service.y+7);
else if(choice==='briarhaven')activateScene('overworld',42,51);
else if(choice==='hills')activateScene('overworld',575,230);
else if(choice==='river')activateScene('overworld',119,61);
else if(choice==='lake')activateScene('overworld',28,64);
else if(choice==='edge')activateScene('overworld',14,18);
else if(choice==='bridge')activateScene('overworld',111,52);
else if(choice==='shore')activateScene('overworld',52,87);
else if(choice==='shop')activateScene('overworld',54,47);
else if(choice==='combat'){const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;lastAttack=time-posePhase*.65;enemy.attackAt=lastAttack;playerHeading=Math.PI/2;}
else if(choice==='walk'||choice==='run'){activateScene('overworld',43,75);playerMotion.moving=true;playerMotion.blend=1;playerMotion.running=choice==='run';playerMotion.phase=posePhase;playerMotion.heading=1.5;playerHeading=1.5;}
if(choice==='willow-inside')setWalkInDoor(captureInn.service,true,true);
view3d.zoom=['walk','run','combat'].includes(choice)?110:choice==='willow-inside'?40:choice==='shop'?38:choice==='briarhaven'?28:22;view3d.yaw=-.55;view3d.tilt=.85;updateDoorThreshold();
realmGPU={cache:new WeakMap(),sharedMeshes:new WeakMap(),terrain:new Map(),gl:{deleteBuffer(){}},upload,
 render(entries,dynamic){if(dynamic.length)entries.push(upload(new Float32Array(dynamic)));
 const draws=entries.map(e=>{const m=e.model?Array.from(e.model):null;if(m)m[7]+=landHeight(m[3],m[11]);return {file:e.buffer,count:e.count,terrain:!!e.terrain,model:m?[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};});
 capture({vertex:realmVertexShader,fragment:realmFragmentShader,draws,width:screen.w,height:screen.h,uniforms:{uCamera:[px+.5,py+.5,view3d.yaw,view3d.tilt],uView:[screen.w,screen.h,view3d.zoom,0],uOrigin:[px+.5,0,py+.5],uLightRange:Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/view3d.zoom*.65)),uTime:time,uInterior:0,uNight:0,uLandCamera:walkSurfaceHeight(px+.5,py+.5),uEye:[Math.sin(view3d.yaw)*Math.cos(view3d.tilt),Math.sin(view3d.tilt),Math.cos(view3d.yaw)*Math.cos(view3d.tilt)]}});
 }};
draw3d();
`,sandbox);
console.log('Captured',next,'mesh buffers for',sandbox.choice);
