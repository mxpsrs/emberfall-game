// Export the game's actual geometry and shaders for offscreen OpenGL ES review.
// This is a render check, not browser or touch-input emulation.
const fs=require('fs'),vm=require('vm'),path=require('path');
const output=process.argv[2];if(!output)throw new Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const noop=()=>{},elements={};function element(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,append:noop,remove:noop,replaceChildren:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,setPointerCapture:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({width:1112,height:512,left:0,top:0}),showModal(){this.open=true},close(){this.open=false}}}
let next=0,captureIndex=0;const entries=[];const motionFrames=Number((process.env.VELDREN_CAPTURE_FRAMES||process.env.EMBERFALL_CAPTURE_FRAMES)||1);
const sandbox={reviewAsset:(process.env.VELDREN_REVIEW_CREATURE||process.env.EMBERFALL_REVIEW_CREATURE)?JSON.parse(fs.readFileSync((process.env.VELDREN_REVIEW_CREATURE||process.env.EMBERFALL_REVIEW_CREATURE),'utf8')):null,processCaptureClip:(process.env.VELDREN_CAPTURE_CLIP||process.env.EMBERFALL_CAPTURE_CLIP)||'idle',console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})},
 upload(data){const name='mesh-'+next+++'.bin';fs.writeFileSync(path.join(output,name),Buffer.from(data.buffer,data.byteOffset,data.byteLength));return {buffer:name,count:data.length/12}},
 captureInstancing:(process.env.VELDREN_CAPTURE_INSTANCING||process.env.EMBERFALL_CAPTURE_INSTANCING)==='1',captureTextureSkinning:(process.env.VELDREN_CAPTURE_SKINNING||process.env.EMBERFALL_CAPTURE_SKINNING)==='texture',captureSkinning:['1','texture'].includes((process.env.VELDREN_CAPTURE_SKINNING||process.env.EMBERFALL_CAPTURE_SKINNING)),captureIsolated:(process.env.VELDREN_CAPTURE_ISOLATED||process.env.EMBERFALL_CAPTURE_ISOLATED)==='1',captureAmmo:Number((process.env.VELDREN_CAPTURE_AMMO||process.env.EMBERFALL_CAPTURE_AMMO)||2500),captureGear:(process.env.VELDREN_CAPTURE_GEAR||process.env.EMBERFALL_CAPTURE_GEAR)?JSON.parse((process.env.VELDREN_CAPTURE_GEAR||process.env.EMBERFALL_CAPTURE_GEAR)):null,captureAppearance:JSON.parse((process.env.VELDREN_CAPTURE_APPEARANCE||process.env.EMBERFALL_CAPTURE_APPEARANCE)||'{}'),
 capture(data){fs.writeFileSync(path.join(output,motionFrames>1?'scene-'+String(captureIndex++).padStart(3,'0')+'.json':'scene.json'),JSON.stringify(data));},motionFrames,captureYaw:Number((process.env.VELDREN_CAPTURE_YAW||process.env.EMBERFALL_CAPTURE_YAW)||-.55),captureTilt:Number((process.env.VELDREN_CAPTURE_TILT||process.env.EMBERFALL_CAPTURE_TILT)||.85),captureZoom:Number((process.env.VELDREN_CAPTURE_ZOOM||process.env.EMBERFALL_CAPTURE_ZOOM)||0),captureSex:(process.env.VELDREN_CAPTURE_SEX||process.env.EMBERFALL_CAPTURE_SEX)||'male',choice:process.argv[3]||'willow-inside',posePhase:Number(process.argv[4]||0),captureWidth:Number((process.env.VELDREN_CAPTURE_WIDTH||process.env.EMBERFALL_CAPTURE_WIDTH)||1112),captureHeight:Number((process.env.VELDREN_CAPTURE_HEIGHT||process.env.EMBERFALL_CAPTURE_HEIGHT)||512)};
vm.createContext(sandbox);
for(const name of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game','view3d','art-direction','renderer-gl','kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','tree-identity','world-depth','organic-world','walk-in-world','world-style','building-orientation','assets/realms/monsters','assets/realms/approved-creatures','creatures','item-models','game-icons','trading','world-options','map-icons','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters','briarhaven','guardian-spirits']){if(name==='creatures'&&sandbox.reviewAsset)vm.runInContext('APPROVED_CREATURES[reviewAsset.key]=reviewAsset.model',sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name+'.js'),'utf8'),sandbox,{filename:name});}
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();screen={w:captureWidth,h:captureHeight};s.character={name:'Adventurer',look:0,frame:captureSex,hair:0,race:'human'};s.equipment={weapon:'bronzeSword',body:'leatherArmor'};s.worldClock=120;time=1;assetsReady=true;
s.tutorial=tutorialSteps.length;s.tutorialReward=true;drawMapServices=()=>{};drawMinimap=()=>{};
if(captureGear)s.equipment=captureGear;s.equippedAmmoCount=captureAmmo;Object.assign(s.character,captureAppearance);
const captureInn=buildings.find(b=>b.service?.destination==='willowInn');
if(choice==='willow-inside')activateScene('overworld',captureInn.service.x,captureInn.service.y-2);
else if(choice==='willow-outside')activateScene('overworld',captureInn.service.x,captureInn.service.y+7);
else if(choice.startsWith('tutor-')){const o=tutorialTutor(choice.slice(6));const b=o.interiorBuilding&&buildings.find(b=>b.service?.destination===o.interiorBuilding);if(b)setWalkInDoor(b.service,true,true);const p=route(o.x,o.y,true,1.45);const end=p?.at(-1)||[o.x+1,o.y];activateScene('overworld',...end);}
else if(choice==='briarhaven')activateScene('overworld',55,61);
else if(choice==='goblin-village')activateScene('overworld',95,99);
else if(choice.startsWith('firstlight-')){s.tutorial=0;s.tutorialReward=false;activateScene('tutorial',...(choice==='firstlight-woods'?[26,45]:choice==='firstlight-overview'?[50,62]:[43,55]));}
else if(choice==='hills')activateScene('overworld',575,230);
else if(choice==='river')activateScene('overworld',119,61);
else if(choice==='lake')activateScene('overworld',28,64);
else if(choice==='guardians'){activateScene('overworld',55,66);s.spirits={};for(const [i,id]of Object.keys(SPIRITS).entries())objects.push({id:'spirit-review-'+id,type:'spirit',spiritId:id,name:SPIRITS[id].name,x:52+i*1.6,y:64,drawX:52+i*1.6,drawY:64,heading:.3,dead:0});}
else if(choice==='sky')activateScene('overworld',55,61);
else if(choice==='edge')activateScene('overworld',14,18);
else if(choice==='bridge')activateScene('overworld',111,52);
else if(choice==='shore')activateScene('overworld',52,87);
else if(choice==='shop')activateScene('overworld',54,47);
else if(['crownreach','ironhollow','aelindor','deepforge','moonwillow'].includes(choice)){const town=SETTLEMENTS.find(t=>t.id===choice);activateScene('overworld',town.x,town.y+8);}
else if(choice.endsWith('-castle')){const race=choice.split('-')[0],b=buildings.find(b=>b.race===race&&b.archetype==='castle');activateScene('overworld',b.x+b.w/2,b.y+b.h+12);}
else if(choice==='mine')activateScene('mine',10,12);
else if(choice==='forge-detail')activateScene('overworld',69,45);
else if(choice==='ork-warrens')activateScene('ork_warrens',19,22);
else if(choice.startsWith('colossus-lair')){activateScene('lair_colossus',23,25);const boss=objects.find(o=>o.encounter==='colossus');beginEncounter(boss);if(choice.includes('red'))boss.hp=Math.floor(boss.maxhp*.45);updateEncounterAI(0);if(choice.includes('attack'))scheduleEnemyMove(activeEncounter,processCaptureClip==='attack'?'shot':processCaptureClip);time+=posePhase;}
else if(choice.startsWith('veyr-lair')){activateScene('lair_veyr',22,25);const boss=objects.find(o=>o.encounter==='veyr');beginEncounter(boss);if(choice.includes('phase2'))boss.hp=Math.floor(boss.maxhp*.45);updateEncounterAI(0);if(choice.includes('attack'))scheduleEnemyMove(activeEncounter,processCaptureClip==='attack'?'sweep':processCaptureClip);time+=posePhase;}
else if(choice.startsWith('xalith-lair')){activateScene('lair_xalith',27,26);const boss=objects.find(o=>o.encounter==='xalith');beginEncounter(boss);if(choice.includes('attack'))scheduleEnemyMove(activeEncounter,'bite');time+=posePhase;}
else if(choice.startsWith('varkesh-lair')){activateScene('lair_varkesh',29,28);const boss=objects.find(o=>o.encounter==='varkesh');beginEncounter(boss);if(choice.includes('attack'))scheduleEnemyMove(activeEncounter,processCaptureClip==='attack'?'blight':processCaptureClip);time+=posePhase;}
else if(choice==='giant-grove')activateScene('overworld',40,143);
else if(choice==='rat-pen')activateScene('overworld',54,82);
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
else if(Object.hasOwn(creatureAssets,choice)||choice==='creature-lineup'){
 activateScene('overworld',43,75);objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};
 for(const [i,kind]of (choice==='creature-lineup'?['goblin','wolf','rat','skeleton','slime','king']:[choice]).entries()){
  const x=choice==='creature-lineup'?38+(i%3)*4:44,y=choice==='creature-lineup'?71+Math.floor(i/3)*5:75;
  objects.push({id:4000000+i,type:'enemy',name:kind,kind,creatureLook:kind,x,y,drawX:x,drawY:y,sprite:1,dead:0,attackAt:-100,hitAt:-100,_creatureMotion:{time:1,x:x+.5,z:y+.5,phase:posePhase,blend:0,speed:0,heading:.2}});
 }
}
else if(choice==='combat'){const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;lastAttack=time-posePhase*.65;enemy.attackAt=lastAttack;playerHeading=Math.PI/2;}
else if(['walk','run','idle','sword','transition','ranged','magic','bury','firemaking','cook','bow-idle'].includes(choice)){activateScene('overworld',43,75);playerMotion.moving=['walk','run','transition'].includes(choice);playerMotion.blend=playerMotion.moving?1:0;playerMotion.running=choice==='run';playerMotion.phase=posePhase;playerMotion.heading=1.5;playerHeading=1.5;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;}
function captureAction(){if(['ranged','magic'].includes(choice)){lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips[choice].duration;playerAttackMotion={...combatMotion(choice),weapon:s.equipment.weapon,ammo:'arrows',started:lastAttack,color:'#76c7ed'};}if(['bury','cook','firemaking'].includes(choice)){const duration=choice==='firemaking'?2.4:1.8;playerAction={kind:choice,started:time-posePhase*duration,duration,commitAt:choice==='firemaking'?2.1:.95,committed:posePhase>.9};}}
captureAction();
if(choice==='firstlight-crossing'){s.tutorial=tutorialSteps.length-1;beginTutorialCrossing();tutorialCrossing.age=posePhase*2.6;time+=tutorialCrossing.age;}
if(captureIsolated){objects.splice(0);buildings.splice(0);resetLandSurface();drawRealmCrossings=()=>{};}
if(choice==='willow-inside')setWalkInDoor(captureInn.service,true,true);
view3d.zoom=captureZoom||(['walk','run','combat','idle','sword','transition','ranged','magic','bury','firemaking','cook','bow-idle'].includes(choice)?110:choice==='willow-inside'?40:choice==='shop'?38:choice==='briarhaven'?28:22);view3d.yaw=captureYaw;view3d.tilt=captureTilt;updateDoorThreshold();
let capturedIndexBuffer;
realmGPU={skinning:captureSkinning,skinnedMeshes:new WeakMap(),cache:new WeakMap(),sharedMeshes:new WeakMap(),terrain:new Map(),gl:{deleteBuffer(){},createBuffer:()=>({}),bindBuffer(target,buffer){capturedIndexBuffer=buffer;},bufferData(target,data){capturedIndexBuffer.file=upload(data).buffer;}},upload,
 render(entries,dynamic){if(dynamic.length)entries.push(upload(new Float32Array(dynamic)));
 const prepared=realmPrepareDraws(entries,captureInstancing),instanceFile=prepared.transforms.length?upload(prepared.transforms).buffer:null;
 const draws=[...prepared.singles,...prepared.batches].map(e=>{const m=e.model?Array.from(e.model):null;if(m)m[7]+=landHeight(m[3],m[11]);return {file:e.buffer,indexFile:e.index?.buffer.file,instanceFile:e.instances?instanceFile:null,instances:e.instances,instanceOffset:e.instanceOffset,count:e.count,stride:e.stride||48,palette:e.palette?Array.from(e.palette):null,bossColor:e.bossColor||0,dissolve:e.dissolve||0,terrain:!!e.terrain,normal:Array.from(realmNormalMatrix(e.model)),model:m?[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};});
 capture({uniformVertex:realmSkinnedVertexShader,instancedVertex:realmInstancedVertexShader,vertex:captureTextureSkinning?realmTextureSkinnedVertexShader:captureSkinning?realmSkinnedVertexShader:realmVertexShader,fragment:realmFragmentShader,draws,width:screen.w,height:screen.h,uniforms:{uCamera:[px+.5,py+.5,view3d.yaw,view3d.tilt],uView:[screen.w,screen.h,cameraZoom3(),0],uOrigin:[px+.5,0,py+.5],uLightRange:Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/cameraZoom3()*.65)),uTime:time,uInterior:inWorld()?0:1,uNight:inWorld()?0:.25,uMood:CREATURE_LAIRS[currentScene]?.ambient||[1,1,1],uFogColor:CREATURE_LAIRS[currentScene]?.fog||[.28,.39,.40],uGlowColor:CREATURE_LAIRS[currentScene]?.light||[.20,.10,.025],uLandCamera:walkSurfaceHeight(px+.5,py+.5),uEye:[Math.sin(view3d.yaw)*Math.cos(view3d.tilt),Math.sin(view3d.tilt),Math.cos(view3d.yaw)*Math.cos(view3d.tilt)]}});
 }};
// Isolated creature captures review the requested native pose without the
// combat timing warp. Lair captures still exercise the normal gameplay path.
const nativeCapturePose=creatureRigPose;
creatureRigPose=function(kind,clip,phase,blend=1,baseClip='idle',basePhase=0){
 if(kind===choice)return nativeCapturePose(kind,processCaptureClip,posePhase,1);
 return nativeCapturePose(kind,clip,phase,blend,baseClip,basePhase);
};
for(let i=0;i<motionFrames;i++){
 if(motionFrames>1){posePhase=i/(motionFrames-1);playerMotion.phase=posePhase;time=1+posePhase;if(choice==='sword')lastAttack=time-posePhase*rebuiltAvatars[captureSex].clips.melee.duration;if(choice==='idle')time=posePhase*rebuiltAvatars[captureSex].clips.swordIdle.duration;if(choice==='transition')playerMotion.blend=Math.sin(posePhase*Math.PI)**2;}
 if(creatureAssets[choice]){
  const o=objects[0],a=creatureAssets[choice],clip=processCaptureClip;
  o._creatureMotion.time=time;o._creatureMotion.phase=posePhase;o._creatureMotion.blend=['walk','run'].includes(clip)?1:0;o._creatureMotion.speed=clip==='run'?4:1.5;
  if(clip.startsWith('attack')){o.attackAt=time-posePhase*a.clips[clip].duration;o.attackClip=clip;o.attackWindup=a.clips[clip].duration*.6;}
  if(clip==='death'){o.dead=time+25;o.deathAt=time-posePhase*a.clips.death.duration;}
 }
captureAction();draw3d();
}
`,sandbox);
console.log('Captured',next,'mesh buffers for',sandbox.choice);
module.exports=sandbox;
