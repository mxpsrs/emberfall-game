// Export the game's actual geometry and shaders for offscreen OpenGL ES review.
// This is a render check, not browser or touch-input emulation.
const fs=require('fs'),vm=require('vm'),path=require('path');
const output=process.argv[2];if(!output)throw new Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const noop=()=>{},elements={};function element(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,setPointerCapture:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({width:1112,height:512,left:0,top:0}),showModal(){this.open=true},close(){this.open=false}}}
let next=0,captureIndex=0;const entries=[];const motionFrames=Number(process.env.EMBERFALL_CAPTURE_FRAMES||1);
const sandbox={console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})},
 upload(data){const name='mesh-'+next+++'.bin';fs.writeFileSync(path.join(output,name),Buffer.from(data.buffer,data.byteOffset,data.byteLength));return {buffer:name,count:data.length/12}},
 capture(data){fs.writeFileSync(path.join(output,motionFrames>1?'scene-'+String(captureIndex++).padStart(3,'0')+'.json':'scene.json'),JSON.stringify(data));},motionFrames,captureYaw:Number(process.env.EMBERFALL_CAPTURE_YAW||-.55),captureTilt:Number(process.env.EMBERFALL_CAPTURE_TILT||.85),captureZoom:Number(process.env.EMBERFALL_CAPTURE_ZOOM||0),captureSex:process.env.EMBERFALL_CAPTURE_SEX||'male',choice:process.argv[3]||'willow-inside',posePhase:Number(process.argv[4]||0),captureWidth:Number(process.env.EMBERFALL_CAPTURE_WIDTH||1112),captureHeight:Number(process.env.EMBERFALL_CAPTURE_HEIGHT||512)};
vm.createContext(sandbox);
for(const name of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game','view3d','art-direction','renderer-gl','kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world','world-style'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name+'.js'),'utf8'),sandbox,{filename:name});
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();screen={w:captureWidth,h:captureHeight};s.character={name:'Adventurer',look:0,frame:captureSex,hair:0,race:'human'};s.equipment={weapon:'bronzeSword',body:'leatherArmor'};s.worldClock=120;time=1;assetsReady=true;
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
else if(['crownreach','ironhollow','aelindor','deepforge','moonwillow'].includes(choice)){const town=SETTLEMENTS.find(t=>t.id===choice);activateScene('overworld',town.x,town.y+8);}
else if(choice.endsWith('-castle')){const race=choice.split('-')[0],b=buildings.find(b=>b.race===race&&b.archetype==='castle');activateScene('overworld',b.x+b.w/2,b.y+b.h+12);}
else if(choice==='mine')activateScene('mine',10,12);
else if(choice==='forge-detail')activateScene('overworld',69,45);
else if(choice==='props'){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 for(const [i,name]of ['forge','Bed','Dining table','Barrel','Bookcase','Merchant wagon','Altar','camp'].entries())objects.push({id:4000000+i,type:['forge','camp'].includes(name)?name:'prop',name,x:36+(i%4)*4,y:69+Math.floor(i/4)*4,dead:0});
}
else if(['wolf','skeleton','slime'].includes(choice)){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 objects.push({id:4000000,type:'enemy',kind:choice,x:44,y:75,drawX:44,drawY:75,sprite:1,dead:0,attackAt:1-posePhase*.65});
}
else if(choice==='combat'){const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;lastAttack=time-posePhase*.65;enemy.attackAt=lastAttack;playerHeading=Math.PI/2;}
else if(['walk','run','idle','sword','transition'].includes(choice)){activateScene('overworld',43,75);playerMotion.moving=['walk','run','transition'].includes(choice);playerMotion.blend=playerMotion.moving?1:0;playerMotion.running=choice==='run';playerMotion.phase=posePhase;playerMotion.heading=1.5;playerHeading=1.5;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;}
if(choice==='willow-inside')setWalkInDoor(captureInn.service,true,true);
view3d.zoom=captureZoom||(['walk','run','combat','idle','sword','transition'].includes(choice)?110:choice==='willow-inside'?40:choice==='shop'?38:choice==='briarhaven'?28:22);view3d.yaw=captureYaw;view3d.tilt=captureTilt;updateDoorThreshold();
realmGPU={cache:new WeakMap(),sharedMeshes:new WeakMap(),terrain:new Map(),gl:{deleteBuffer(){}},upload,
 render(entries,dynamic){if(dynamic.length)entries.push(upload(new Float32Array(dynamic)));
 const draws=entries.map(e=>{const m=e.model?Array.from(e.model):null;if(m)m[7]+=landHeight(m[3],m[11]);return {file:e.buffer,count:e.count,terrain:!!e.terrain,normal:Array.from(realmNormalMatrix(e.model)),model:m?[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};});
 capture({vertex:realmVertexShader,fragment:realmFragmentShader,draws,width:screen.w,height:screen.h,uniforms:{uCamera:[px+.5,py+.5,view3d.yaw,view3d.tilt],uView:[screen.w,screen.h,cameraZoom3(),0],uOrigin:[px+.5,0,py+.5],uLightRange:Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/cameraZoom3()*.65)),uTime:time,uInterior:inWorld()?0:1,uNight:inWorld()?0:.25,uLandCamera:walkSurfaceHeight(px+.5,py+.5),uEye:[Math.sin(view3d.yaw)*Math.cos(view3d.tilt),Math.sin(view3d.tilt),Math.cos(view3d.yaw)*Math.cos(view3d.tilt)]}});
 }};
for(let i=0;i<motionFrames;i++){
 if(motionFrames>1){posePhase=i/(motionFrames-1);playerMotion.phase=posePhase;time=1+posePhase;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;if(choice==='idle')time=posePhase*rebuiltAvatars[captureSex].clips.swordIdle.duration;if(choice==='transition')playerMotion.blend=Math.sin(posePhase*Math.PI)**2;}
 draw3d();
}
`,sandbox);
console.log('Captured',next,'mesh buffers for',sandbox.choice);
module.exports=sandbox;
