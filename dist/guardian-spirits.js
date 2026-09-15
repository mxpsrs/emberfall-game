'use strict';
// Spirits are portraits and elemental casting effects. No creature meshes.
const spiritCasts=[];
function drawGuardianSpecial(r){
 const bond=spiritBondEffect;
 if(bond&&bond.scene===currentScene){const t=bond.age/bond.duration,d=SPIRITS[bond.id],q=groundedPainter(r,bond.x+.5,bond.y+.5);
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18+bond.age*2,rad=.3+Math.sin(t*Math.PI)*.8,y=.2+(i%6)*.22+t*.7;oval3(q,bond.x+.5+Math.cos(a)*rad,y,bond.y+.5+Math.sin(a)*rad,.035,.055,.035,d.color,p=>p,6);}
 }
 const e=spiritEffect;if(!e?.ids||e.scene!==currentScene)return;
 const progress=Math.min(1,e.age/e.commitAt),q=groundedPainter(r,px+.5,py+.5);
 for(const [i,id]of e.ids.entries())for(let n=0;n<5;n++){
  const a=e.age*6+n*Math.PI*2/5+i,travel=Math.max(0,(progress-.45)/.55),end=e.enemy?{x:(e.enemy.drawX??e.enemy.x)+.5,z:(e.enemy.drawY??e.enemy.y)+.5}:{x:px+.5,z:py+.5};
  const x=px+.5+(end.x-px-.5)*travel+Math.cos(a)*.15,z=py+.5+(end.z-py-.5)*travel+Math.sin(a)*.15;
  if(e.age<e.commitAt)oval3(q,x,1+Math.sin(a)*.12,z,.045,.065,.045,SPIRITS[id].color,p=>p,6);
 }
}
function startGuardianSpecial(ids,enemy,large=false){
 const motion=combatMotion('worship'),duration=motion.duration;
 // A spirit cast never cancels movement, targeting or the normal attack clock.
 spiritEffect={ids,scene:currentScene,enemy,started:time,age:0,duration,commitAt:motion.releaseAt,committed:false,large,x:enemy?.x??px,y:enemy?.y??py,color:SPIRITS[ids[0]].color};
 spiritCasts.push(spiritEffect);renderUI();save();
}
unleashSpirit=function(id){
 const owned=s.spirits[id],d=SPIRITS[id];if(!d||!owned||spiritRemaining(id)>0)return false;
 const enemy=spiritOpponent();let error='';
 if(d.power&&!enemy)error='Select an enemy within spirit range first.';
 if((d.heal||d.renewal)&&s.hp>=maxhp())error='Your health is already full.';
 if(d.energy&&(s.runEnergy??100)>=100)error='Your run energy is already full.';
 if(d.renewal&&spiritRenewal>0)error='Renewal is still restoring your health.';
 if(error){if($('spiritQuickHelp'))$('spiritQuickHelp').textContent=error;toast(error);return false;}
 owned.state='recovery';owned.recovery=spiritCooldown(id);owned.readyAt=Date.now()+owned.recovery*1000;s.hp=Math.min(s.hp,maxhp());startGuardianSpecial([id],d.power?enemy:null);return true;
};
summonSpirits=function(){
 const ids=Object.entries(s.spirits||{}).filter(([id,v])=>SPIRITS[id]&&!spiritRemaining(id)).map(([id])=>id),enemy=spiritOpponent();if(ids.length<2||!enemy){toast('Select a nearby enemy and have at least two spirits ready.');return false;}
 for(const id of ids){s.spirits[id].state='recovery';s.spirits[id].recovery=spiritCooldown(id);s.spirits[id].readyAt=Date.now()+spiritCooldown(id)*1000;}s.hp=Math.min(s.hp,maxhp());startGuardianSpecial(ids,enemy,true);return true;
};
function commitGuardianSpecial(e){
 if(e.committed||e.scene!==currentScene)return;e.committed=true;
 const d=SPIRITS[e.ids[0]],enemy=e.enemy,valid=enemy&&objects.includes(enemy)&&enemy.hp>0&&enemy.dead<=time&&Math.hypot(enemy.x-px,enemy.y-py)<=8&&lineOfSight(px,py,enemy.x,enemy.y);
 if(e.large||d.area){if(valid){const max=spiritMaxHit(e.large?e.ids.length*12:d.power,e.large),radius=e.large?2.5:d.area;for(const o of objects.filter(o=>fighter(o)&&o.hp>0&&o.dead<=time&&(o===enemy||o.type==='enemy')&&Math.hypot(o.x-enemy.x,o.y-enemy.y)<=radius&&lineOfSight(enemy.x,enemy.y,o.x,o.y)))resolveHit(o,spiritDamage(o,max),'worship');}}
 else if(d.heal){const healed=Math.min(d.heal,maxhp()-s.hp);s.hp+=healed;floating('+'+healed,px,py,d.color);}
 else if(d.ward){stoneWard=d.ward;s.spiritWardUntil=Date.now()+d.ward*1000;}
 else if(d.renewal){spiritRenewal=d.renewal;spiritRenewalTick=0;}
 else if(d.energy){const restored=Math.min(d.energy,100-(s.runEnergy??100));s.runEnergy=(s.runEnergy??100)+restored;floating('+'+restored+' energy',px,py,d.color);}
 else if(valid)resolveHit(enemy,spiritDamage(enemy,spiritMaxHit(d.power)),'worship',d.slow||0);
 renderUI();save();
}
const updateBeforeGuardians=updateSpirits;
updateSpirits=function(dt){
 for(let i=spiritCasts.length-1;i>=0;i--){const cast=spiritCasts[i];cast.age+=dt;
  if(cast.scene!==currentScene){spiritCasts.splice(i,1);continue;}
  if(cast.age>=cast.commitAt&&!cast.committed){const visual=spiritEffect;spiritEffect=cast;try{commitGuardianSpecial(cast);}finally{spiritEffect=visual;}}
  if(cast.age>=cast.duration)spiritCasts.splice(i,1);
 }
 spiritEffect=spiritCasts.at(-1)||null;updateBeforeGuardians(dt);
};
