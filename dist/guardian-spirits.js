'use strict';
// Original elemental forms. These meshes exist only at discovery sites and in
// spirit portraits; bonded spirits never spawn a companion actor.
const GUARDIAN_FORMS={
 cinder:{height:1.2,form:'Ember bloom'},brook:{height:1.15,form:'Water sprite'},
 zephyr:{height:1.1,form:'Wind sylph'},cairn:{height:1.12,form:'Geode spirit'}
};
let guardianPortraitAt=-1;
// Closed, faceted lofts give every form its own authored silhouette.
function spiritLoft(r,rings,color,transform,sides=10){
 const rows=rings.map(([y,rx,rz,cx=0,cz=0])=>Array.from({length:sides},(_,i)=>{const a=i*Math.PI*2/sides;return transform([cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz]);}));
 for(let j=1;j<rows.length;j++)for(let i=0;i<sides;i++){const k=(i+1)%sides;r.face([rows[j-1][i],rows[j][i],rows[j][k],rows[j-1][k]],shade3(color,.84+.16*Math.sin(i/sides*Math.PI*2+.7)));}
 r.face(rows[0],shade3(color,.7));r.face([...rows.at(-1)].reverse(),color);
}
function spiritPetal(r,root,x,y,z,angle,length,width,color,bend=0){
 const c=Math.cos(angle),s=Math.sin(angle),part=p=>root([x+p[0]*c-p[1]*s,y+p[0]*s+p[1]*c,z+p[2]]);
 spiritLoft(r,[[0,width*.45,width*.22],[length*.35,width,width*.30],[length*.75,width*.6,width*.16,bend],[length,.005,.005,bend*1.6]],color,part,8);
}
function drawGuardian(r,id,x,z,clip='idle',phase=null,heading=0,portrait=false){
 const age=phase===null?time:phase*4,beat=Math.sin(age*2.5+SPIRITS[id].icon),q=portrait?r:groundedPainter(r,x,z),cy=Math.cos(heading),sy=Math.sin(heading),bob=.045*beat;
 const root=p=>[x+p[0]*cy+p[2]*sy,p[1]+bob,z-p[0]*sy+p[2]*cy];
 if(id==='cinder'){
  spiritLoft(q,[[.2,.02,.02],[.36,.21,.16],[.64,.26,.19],[.85,.18,.14],[1.04,.07,.05,.08],[1.2,.005,.005,.15+beat*.025]],'#e97737',root);
  spiritLoft(q,[[.32,.02,.02],[.46,.14,.045,0,.16],[.68,.12,.04,0,.185],[.82,.01,.01,.04,.17]],'#ffdc82',root);
  for(const side of [-1,1]){spiritPetal(q,root,side*.18,.54,0,-side*(.72+beat*.09),.40,.105,'#f6a94e',side*.02);spiritPetal(q,root,side*.12,.75,-.025,side*.32,.38,.09,'#d85132');}
 }else if(id==='brook'){
  spiritLoft(q,[[.18,.02,.02],[.31,.20,.16],[.56,.27,.20],[.76,.20,.16],[.92,.10,.09],[1.12,.008,.008,-.12+beat*.02]],'#469dc0',root,12);
  spiritLoft(q,[[.29,.015,.01],[.44,.16,.035,0,.18],[.66,.15,.035,0,.195],[.78,.01,.01,0,.16]],'#a4e6e8',root);
  for(const side of [-1,1])spiritPetal(q,root,side*.20,.65,0,-side*(1.0+beat*.12),.32,.14,'#76ccd7',side*.05);
  spiritPetal(q,root,0,.3,-.1,Math.PI+.3+beat*.12,.26,.10,'#79dce0');
 }else if(id==='zephyr'){
  spiritLoft(q,[[.25,.015,.015,.10],[.4,.16,.12],[.63,.21,.16],[.79,.16,.13],[.91,.03,.025]],'#dce9d8',root);
  for(const side of [-1,1])for(let i=0;i<3;i++)spiritPetal(q,root,side*(.16+i*.04),.58-i*.075,-i*.035,-side*(1.02+i*.19+beat*.13),.44-i*.06,.08,'#a6c9bd',side*.05);
  for(let i=0;i<2;i++)spiritPetal(q,root,.03-i*.09,.8,-.07,-.6+i*.3+beat*.08,.29,.07,'#b6d7c5',.12);
 }else{
  spiritLoft(q,[[.23,.11,.1],[.33,.25,.19],[.65,.28,.21],[.83,.18,.14],[.91,.07,.06]],'#8b8179',root,7);
  spiritLoft(q,[[.34,.06,.02,0,.19],[.48,.15,.05,0,.22],[.69,.10,.03,0,.20],[.78,.015,.01,0,.15]],'#c7ab76',root,6);
  for(const side of [-1,1]){spiritPetal(q,root,side*.13,.77,-.05,-side*.28,.32,.10,'#83b2a1');spiritPetal(q,root,side*(.34+beat*.015),.38+side*beat*.025,0,-side*.25,.23,.13,'#9a9081');}
  spiritPetal(q,root,0,.87,-.05,.12,.26,.08,'#b5d4b9');
 }
 const eyey=id==='zephyr'?.67:id==='cairn'?.63:.69,eyez=id==='zephyr'?.175:id==='cairn'?.27:.245;
 for(const side of [-1,1]){oval3(q,side*.075,eyey,eyez,.034,.052,.021,'#213c42',root,8);oval3(q,side*.075-.009,eyey+.018,eyez+.020,.009,.012,.006,'#f8f4d8',root,6);}
 return GUARDIAN_FORMS[id].height;
}
const creatureBeforeGuardians=creature3;
creature3=function(r,o,x,z){if(o.type==='spirit'&&GUARDIAN_FORMS[o.spiritId])return drawGuardian(r,o.spiritId,x,z,'idle',null,o.heading||0);return creatureBeforeGuardians(r,o,x,z);};
function drawGuardianSpecial(r){
 const e=spiritEffect;if(!e?.ids||e.scene!==currentScene)return;
 const progress=Math.min(1,e.age/e.commitAt),q=groundedPainter(r,px+.5,py+.5);
 // Elemental light travels from the caster; no spirit creature is summoned.
 for(const [i,id]of e.ids.entries())for(let n=0;n<5;n++){
  const a=e.age*6+n*Math.PI*2/5+i,travel=Math.max(0,(progress-.45)/.55),end=e.enemy?{x:(e.enemy.drawX??e.enemy.x)+.5,z:(e.enemy.drawY??e.enemy.y)+.5}:{x:px+.5,z:py+.5};
  const x=px+.5+(end.x-px-.5)*travel+Math.cos(a)*.15,z=py+.5+(end.z-py-.5)*travel+Math.sin(a)*.15;
  if(e.age<e.commitAt)oval3(q,x,1.0+Math.sin(a)*.12,z,.045,.065,.045,SPIRITS[id].color,p=>p,6);
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
 const motion=combatMotion('worship'),duration=motion.duration;
 stop();target=enemy;playerAttackReadyAt=time+duration;
 if(enemy)playerHeading=Math.atan2(enemy.x-px,enemy.y-py);
 spiritEffect={ids,scene:currentScene,enemy,started:time,age:0,duration,commitAt:motion.releaseAt,committed:false,large,x:enemy?.x??px,y:enemy?.y??py,color:SPIRITS[ids[0]].color};
 $('spiritsDialog').close();renderUI();save();
}
unleashSpirit=function(id){
 const owned=s.spirits[id],def=SPIRITS[id];if(spiritEffect||!owned||owned.state!=='set')return false;
 const enemy=spiritOpponent();if(def.power&&!enemy){$('spiritState').textContent='Select an enemy within spirit range first.';toast($('spiritState').textContent);return false;}
 if(id==='brook'&&s.hp>=maxhp()){$('spiritState').textContent='Your health is already full.';toast($('spiritState').textContent);return false;}
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
 if(time>=guardianPortraitAt&&$('spiritsDialog').open){guardianPortraitAt=time+1/12;drawGuardianPortrait();}
};
