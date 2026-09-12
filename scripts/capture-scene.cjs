// Export the game's actual geometry and shaders for offscreen OpenGL ES review.
// This is a render check, not browser or touch-input emulation.
const fs=require('fs'),vm=require('vm'),path=require('path');
const output=process.argv[2];if(!output)throw new Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const noop=()=>{},elements={};function element(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,setPointerCapture:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({width:1112,height:512,left:0,top:0}),showModal(){this.open=true},close(){this.open=false}}}
let next=0,captureIndex=0;const entries=[];const motionFrames=Number(process.env.EMBERFALL_CAPTURE_FRAMES||1);
const sandbox={processCaptureClip:process.env.EMBERFALL_CAPTURE_CLIP||'idle',console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})},
 upload(data){const name='mesh-'+next+++'.bin';fs.writeFileSync(path.join(output,name),Buffer.from(data.buffer,data.byteOffset,data.byteLength));return {buffer:name,count:data.length/12}},
 captureSkinning:process.env.EMBERFALL_CAPTURE_SKINNING==='1',captureIsolated:process.env.EMBERFALL_CAPTURE_ISOLATED==='1',captureGear:process.env.EMBERFALL_CAPTURE_GEAR?JSON.parse(process.env.EMBERFALL_CAPTURE_GEAR):null,captureAppearance:JSON.parse(process.env.EMBERFALL_CAPTURE_APPEARANCE||'{}'),
 capture(data){fs.writeFileSync(path.join(output,motionFrames>1?'scene-'+String(captureIndex++).padStart(3,'0')+'.json':'scene.json'),JSON.stringify(data));},motionFrames,captureYaw:Number(process.env.EMBERFALL_CAPTURE_YAW||-.55),captureTilt:Number(process.env.EMBERFALL_CAPTURE_TILT||.85),captureZoom:Number(process.env.EMBERFALL_CAPTURE_ZOOM||0),captureSex:process.env.EMBERFALL_CAPTURE_SEX||'male',choice:process.argv[3]||'willow-inside',posePhase:Number(process.argv[4]||0),captureWidth:Number(process.env.EMBERFALL_CAPTURE_WIDTH||1112),captureHeight:Number(process.env.EMBERFALL_CAPTURE_HEIGHT||512)};
vm.createContext(sandbox);
for(const name of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game','view3d','art-direction','renderer-gl','kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','tree-identity','world-depth','organic-world','walk-in-world','world-style','building-orientation','assets/realms/monsters','creatures','item-models'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name+'.js'),'utf8'),sandbox,{filename:name});
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();screen={w:captureWidth,h:captureHeight};s.character={name:'Adventurer',look:0,frame:captureSex,hair:0,race:'human'};s.equipment={weapon:'bronzeSword',body:'leatherArmor'};s.worldClock=120;time=1;assetsReady=true;
if(captureGear)s.equipment=captureGear;Object.assign(s.character,captureAppearance);
const captureInn=buildings.find(b=>b.service?.destination==='willowInn');
if(choice==='willow-inside')activateScene('overworld',captureInn.service.x,captureInn.service.y-2);
else if(choice==='willow-outside')activateScene('overworld',captureInn.service.x,captureInn.service.y+7);
else if(choice.startsWith('tutor-')){const o=tutorialTutor(choice.slice(6));const b=o.interiorBuilding&&buildings.find(b=>b.service?.destination===o.interiorBuilding);if(b)setWalkInDoor(b.service,true,true);const p=route(o.x,o.y,true,1.45);const end=p?.at(-1)||[o.x+1,o.y];activateScene('overworld',...end);}
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
else if(choice==='tree-lineup'){
 activateScene('overworld',50,81);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 for(const [i,resourceId]of ['normal','oak','willow','maple','yew','magic'].entries())objects.push({id:4000002+i,type:'tree',resourceId,name:resourceId,x:36+i*6,y:78,drawX:36+i*6,drawY:78,dead:0});
}
else if(['chopping','mining','fishing'].includes(choice)){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 const type=choice==='chopping'?'tree':choice==='mining'?'ore':'fish';target={id:4000000,type,resourceId:type==='tree'?'normal':type==='ore'?'copper':'shrimp',name:choice,x:44,y:75,drawX:44,drawY:75,dead:0};objects.push(target);elapsed=posePhase*actionDuration(target);playerHeading=Math.PI/2;s.tutorial=tutorialSteps.length;
}
else if(choice==='props'){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 for(const [i,name]of ['forge','Bed','Dining table','Barrel','Bookcase','Merchant wagon','Altar','camp'].entries())objects.push({id:4000000+i,type:['forge','camp'].includes(name)?name:'prop',name,x:36+(i%4)*4,y:69+Math.floor(i/4)*4,dead:0});
}
else if(['goblin','king','wolf','ridgewolf','rat','skeleton','slime','creature-lineup'].includes(choice)){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 for(const [i,kind]of (choice==='creature-lineup'?['goblin','wolf','rat','skeleton','slime','king']:[choice]).entries()){
  const x=choice==='creature-lineup'?38+(i%3)*4:44,y=choice==='creature-lineup'?71+Math.floor(i/3)*5:75;
  objects.push({id:4000000+i,type:'enemy',name:kind,kind,x,y,drawX:x,drawY:y,sprite:1,dead:0,attackAt:-100,hitAt:-100,_creatureMotion:{time:1,x:x+.5,z:y+.5,phase:posePhase,blend:0,speed:0,heading:.2}});
 }
}
else if(choice==='combat'){const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;lastAttack=time-posePhase*.65;enemy.attackAt=lastAttack;playerHeading=Math.PI/2;}
else if(['walk','run','idle','sword','transition'].includes(choice)){activateScene('overworld',43,75);playerMotion.moving=['walk','run','transition'].includes(choice);playerMotion.blend=playerMotion.moving?1:0;playerMotion.running=choice==='run';playerMotion.phase=posePhase;playerMotion.heading=1.5;playerHeading=1.5;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;}
if(captureIsolated){objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};}
if(choice==='willow-inside')setWalkInDoor(captureInn.service,true,true);
view3d.zoom=captureZoom||(['walk','run','combat','idle','sword','transition'].includes(choice)?110:choice==='willow-inside'?40:choice==='shop'?38:choice==='briarhaven'?28:22);view3d.yaw=captureYaw;view3d.tilt=captureTilt;updateDoorThreshold();
realmGPU={skinning:captureSkinning,skinnedMeshes:new WeakMap(),cache:new WeakMap(),sharedMeshes:new WeakMap(),terrain:new Map(),gl:{deleteBuffer(){}},upload,
 render(entries,dynamic){if(dynamic.length)entries.push(upload(new Float32Array(dynamic)));
 const draws=entries.map(e=>{const m=e.model?Array.from(e.model):null;if(m)m[7]+=landHeight(m[3],m[11]);return {file:e.buffer,count:e.count,stride:e.stride||48,palette:e.palette?Array.from(e.palette):null,terrain:!!e.terrain,normal:Array.from(realmNormalMatrix(e.model)),model:m?[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};});
 capture({vertex:captureSkinning?realmSkinnedVertexShader:realmVertexShader,fragment:realmFragmentShader,draws,width:screen.w,height:screen.h,uniforms:{uCamera:[px+.5,py+.5,view3d.yaw,view3d.tilt],uView:[screen.w,screen.h,cameraZoom3(),0],uOrigin:[px+.5,0,py+.5],uLightRange:Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/cameraZoom3()*.65)),uTime:time,uInterior:inWorld()?0:1,uNight:inWorld()?0:.25,uLandCamera:walkSurfaceHeight(px+.5,py+.5),uEye:[Math.sin(view3d.yaw)*Math.cos(view3d.tilt),Math.sin(view3d.tilt),Math.cos(view3d.yaw)*Math.cos(view3d.tilt)]}});
 }};
for(let i=0;i<motionFrames;i++){
 if(motionFrames>1){posePhase=i/(motionFrames-1);playerMotion.phase=posePhase;time=1+posePhase;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;if(choice==='idle')time=posePhase*rebuiltAvatars[captureSex].clips.swordIdle.duration;if(choice==='transition')playerMotion.blend=Math.sin(posePhase*Math.PI)**2;}
 if(creatureAssets[choice]){
  const o=objects[0],a=creatureAssets[choice],clip=processCaptureClip;
  o._creatureMotion.time=time;o._creatureMotion.phase=posePhase;o._creatureMotion.blend=['walk','run'].includes(clip)?1:0;o._creatureMotion.speed=clip==='run'?4:1.5;
  if(clip==='attack')o.attackAt=time-posePhase*a.clips.attack.duration;
  if(clip==='death'){o.dead=time+25;o.deathAt=time-posePhase*a.clips.death.duration;}
 }
 draw3d();
}
`,sandbox);
console.log('Captured',next,'mesh buffers for',sandbox.choice);
module.exports=sandbox;
