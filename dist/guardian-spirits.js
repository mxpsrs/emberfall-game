'use strict';
// Four distinct licensed rigs, scaled as companions and shared by world and portrait rendering.
const GUARDIAN_FORMS={
 cinder:{model:'boss_varkesh',height:1.05,tint:[1.65,.78,.38],special:'cast',form:'Ember drake'},
 brook:{model:'boss_veyr',height:1.12,tint:[.65,1.35,1.8],special:'cast2',form:'Tide guardian'},
 zephyr:{model:'wolf',height:.8,tint:[1.35,1.65,1.7],special:'attack',form:'Wind wolf'},
 cairn:{model:'boss_colossus',height:1.12,tint:[1.4,1.15,.65],special:'attack',form:'Stone guardian'}
};
const guardianFollowers=new Map();let guardianPortraitAt=-1;
const guardianWaterMeshes=new WeakMap();
function guardianMesh(id,look,mesh){
 if(id!=='brook')return creatureTint(look,mesh);
 if(guardianWaterMeshes.has(mesh))return guardianWaterMeshes.get(mesh);
 const colors=source=>Float32Array.from(source,(v,i)=>{const start=i-i%3,light=.55+.45*Math.max(source[start],source[start+1],source[start+2]);return [.23,.72,.92][i%3]*light;});
 const water={...mesh,c:colors(mesh.c),f:colors(mesh.f||mesh.c),t:new Float32Array(mesh.p.length/3).fill(19)};guardianWaterMeshes.set(mesh,water);return water;
}
function drawGuardian(r,id,x,z,clip='idle',phase=null,heading=0,portrait=false){
 const form=GUARDIAN_FORMS[id],a=creatureAssets[form.model];clip=a.clips[clip]?clip:'idle';
 phase=phase??((time+(SPIRITS[id].icon*.37))/a.clips[clip].duration)%1;
 phase=Math.round(phase*48)/48;
 const pose=r.skinned?creatureRigPose(form.model,clip,phase):creaturePose(form.model,clip,phase),k=a.scale*form.height/a.height;
 const q=portrait?r:groundedPainter(r,x,z),root=briarTransform(x,-Math.min(pose.floorY,a.mesh.bounds[0][1])*k,z,k,heading),look={tint:form.tint};
 if(q.skinned){if(a.splitSkinPalette){const batches=creatureSkinBatches(a);pose.batchPalettes??=batches.map(batch=>{const palette=new Float32Array(batch.joints.length*12);batch.joints.forEach((joint,i)=>palette.set(pose.palette.subarray(joint*12,joint*12+12),i*12));return palette;});batches.forEach((batch,i)=>q.skinned(guardianMesh(id,look,batch.mesh),root,pose.batchPalettes[i]));}else q.skinned(guardianMesh(id,look,a.mesh),root,pose.palette);}
 else briarEmit(q,guardianMesh(id,look,pose),root);
 return form.height;
}
const creatureBeforeGuardians=creature3;
creature3=function(r,o,x,z){if(o.type==='spirit'&&GUARDIAN_FORMS[o.spiritId])return drawGuardian(r,o.spiritId,x,z,'idle',null,o.heading||0);return creatureBeforeGuardians(r,o,x,z);};
function drawGuardianFollowers(r){
 for(const [id,owned]of Object.entries(s.spirits||{})){if(!GUARDIAN_FORMS[id]||owned.state!=='set'||spiritEffect?.ids?.includes(id))continue;const f=guardianFollowers.get(id);if(f)drawGuardian(r,id,f.x,f.z,f.moving?'walk':'idle',null,f.heading);}
 const e=spiritEffect;if(!e?.ids||e.scene!==currentScene)return;
 for(const [i,id]of e.ids.entries()){
  const p=e.positions[i],phase=Math.min(1,e.age/e.duration);drawGuardian(r,id,p.x,p.z,GUARDIAN_FORMS[id].special,phase,p.heading);
  const color=SPIRITS[id].color,t=Math.min(1,e.age/e.commitAt),end=e.enemy?{x:e.enemy.drawX+.5,z:e.enemy.drawY+.5}:{x:px+.5,z:py+.5};
  if(t>.25&&t<1){const progress=(t-.25)/.75,q=groundedPainter(r,p.x,p.z),x=p.x+(end.x-p.x)*progress,z=p.z+(end.z-p.z)*progress,y=.65+Math.sin(progress*Math.PI)*.35;
   for(let n=0;n<4;n++){const angle=e.age*11+n*Math.PI/2;oval3(q,x+Math.cos(angle)*.13,y+Math.sin(angle)*.13,z,.065,.065,.065,color,a=>a,6);}
  }
 }
}
function drawGuardianPortrait(){
 if(!$('spiritsDialog').open||typeof creatorPainter!=='function'||!assetsReady)return;
 const c=$('spiritPortrait'),g=c.getContext('2d'),form=GUARDIAN_FORMS[selectedSpirit];g.clearRect(0,0,c.width,c.height);
 const scale=95/form.height,cy=Math.cos(-.5),sy=Math.sin(-.5),r=creatorPainter(g,(x,y,z)=>({x:c.width/2+(x*cy-z*sy)*scale,y:140-y*scale+(x*sy+z*cy)*scale*.12,depth:x*sy+z*cy+y*.12}),c.width,c.height);
 drawGuardian(r,selectedSpirit,0,0,'idle',null,0,true);r.flush();
}
const renderBeforeGuardians=renderSpirits;
renderSpirits=function(){renderBeforeGuardians();drawGuardianPortrait();};
function startGuardianSpecial(ids,enemy,large=false){
 const duration=Math.max(1.4,...ids.map(id=>Math.min(3,creatureAssets[GUARDIAN_FORMS[id].model].clips[GUARDIAN_FORMS[id].special].duration)));
 spiritEffect={ids,scene:currentScene,enemy,age:0,duration,commitAt:duration*.58,committed:false,large,x:enemy?.x??px,y:enemy?.y??py,color:SPIRITS[ids[0]].color,positions:ids.map((id,i)=>{const f=guardianFollowers.get(id),x=f?.x??px+.5+(i-.5)*.7,z=f?.z??py+1.5;return {x,z,heading:enemy?Math.atan2(enemy.x+.5-x,enemy.y+.5-z):playerHeading};})};
 $('spiritsDialog').close();renderUI();save();
}
unleashSpirit=function(id){
 const owned=s.spirits[id],def=SPIRITS[id];if(spiritEffect||!owned||owned.state!=='set')return false;
 const enemy=spiritOpponent();if(def.power&&!enemy){$('spiritState').textContent='Select an enemy within spirit range first.';return false;}
 if(id==='brook'&&s.hp>=maxhp()){$('spiritState').textContent='Your health is already full.';return false;}
 owned.state='standby';s.hp=Math.min(s.hp,maxhp());startGuardianSpecial([id],enemy);return true;
};
summonSpirits=function(){
 const ids=Object.entries(s.spirits||{}).filter(([,v])=>v.state==='standby').map(([id])=>id),enemy=spiritOpponent();if(spiritEffect||ids.length<2||!enemy)return false;
 for(const id of ids){s.spirits[id].state='recovery';s.spirits[id].recovery=30;}startGuardianSpecial(ids,enemy,true);return true;
};
function commitGuardianSpecial(e){
 if(e.committed||e.scene!==currentScene)return;e.committed=true;
 const id=e.ids[0],enemy=e.enemy,valid=enemy&&objects.includes(enemy)&&enemy.hp>0&&enemy.dead<=time&&Math.hypot(enemy.x-px,enemy.y-py)<=8&&lineOfSight(px,py,enemy.x,enemy.y);
 if(e.large){if(valid){const damage=e.ids.length*12+lv('Worship')*2;for(const o of objects.filter(o=>fighter(o)&&o.hp>0&&o.dead<=time&&(o===enemy||o.type==='enemy')&&Math.hypot(o.x-enemy.x,o.y-enemy.y)<=2.5&&lineOfSight(enemy.x,enemy.y,o.x,o.y)))resolveHit(o,damage,'worship');}}
 else if(id==='brook'){const healed=Math.min(20,maxhp()-s.hp);s.hp+=healed;floating('+'+healed,px,py,'#9ee5ff');}
 else if(id==='cairn')stoneWard=8;
 else if(valid)resolveHit(enemy,SPIRITS[id].power+lv('Worship'),'worship',id==='zephyr'?3:0);
 if(valid&&enemy.hp>0)beginEncounter(enemy);renderUI();save();
}
const updateBeforeGuardians=updateSpirits;
updateSpirits=function(dt){
 if(spiritEffect?.ids){if(spiritEffect.scene!==currentScene)spiritEffect=null;else if(spiritEffect.age+dt>=spiritEffect.commitAt)commitGuardianSpecial(spiritEffect);}
 updateBeforeGuardians(dt);
 for(const [id,owned]of Object.entries(s.spirits||{})){if(!GUARDIAN_FORMS[id]||owned.state!=='set')continue;const index=SPIRITS[id].icon,side=(index%2?1:-1)*(.7+Math.floor(index/2)*.5),back=1.2+Math.floor(index/2)*.9;
  let x=px+.5-Math.sin(playerHeading)*back+Math.cos(playerHeading)*side,z=py+.5-Math.cos(playerHeading)*back-Math.sin(playerHeading)*side;if(!land(Math.floor(x),Math.floor(z))){x=px+.5;z=py+.5;}let f=guardianFollowers.get(id);
  if(!f||f.scene!==currentScene){f={x,z,heading:playerHeading,scene:currentScene};guardianFollowers.set(id,f);}
  const dx=x-f.x,dz=z-f.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*(s.runEnabled?5:2.8));f.moving=d>.1;if(d>.02){f.heading=Math.atan2(dx,dz);f.x+=dx/d*step;f.z+=dz/d*step;}
 }
 if(time>=guardianPortraitAt&&$('spiritsDialog').open){guardianPortraitAt=time+1/12;drawGuardianPortrait();}
};
