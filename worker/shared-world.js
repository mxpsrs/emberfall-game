import {advanceNpc,npcLineOfSight} from './npc-simulation.js';
import catalog from './shared-catalog.json' with {type:'json'};
const enc=JSON.stringify,parse=JSON.parse;
const sceneEntities=new Map();for(const e of Object.values(catalog.entities)){if(!sceneEntities.has(e.scene))sceneEntities.set(e.scene,[]);sceneEntities.get(e.scene).push(e);}
const point=(x,y)=>Number.isFinite(x)&&Number.isFinite(y);
const near=(a,b,r)=>point(a.x,a.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=r;
const token=v=>typeof v==='string'&&/^[a-zA-Z0-9_:-]{1,100}$/.test(v);
const styles=['melee','ranged','magic','worship'];
function level(s,k){const xp=Math.max(0,Number(s.xp?.[k])||0);if(k==='Worship')return Math.min(99,1+Math.floor(Math.sqrt(xp/35)));let n=1;while(n<99&&xp>=catalog.xp[n+1])n++;return n;}
function gear(s){return Object.values(s.equipment||{}).map(id=>catalog.items[id]).filter(Boolean);}
function bonus(s,key){return gear(s).reduce((n,item)=>n+(item[key]||0),0);}
function chance(attack,defense){return attack>defense?1-(defense+2)/(2*(attack+1)):attack/(2*(defense+1));}
function rollHit(s,e,style,event={}){
 const focus=s[style+'Training']||'balanced',skill=style==='melee'?'Attack':style==='ranged'?'Ranged':style==='magic'?'Magic':'Worship';
 const aim=style==='magic'?bonus(s,'magicAccuracy'):style==='ranged'?bonus(s,'attackBonus')+bonus(s,'rangedAccuracy'):bonus(s,'attackBonus');
 const a=(level(s,skill)+8+(focus==='accurate'?3:focus==='balanced'?1:0))*(64+aim),d=(e.defenseLevel+9)*64*(e.weak===style?.8:1);
 let max;if(style==='magic'){const spell=catalog.spells[s.spell]||catalog.spells.windStrike||Object.values(catalog.spells)[0];if(level(s,'Magic')<spell.level)return 0;max=spell.power;}
 else if(style==='worship'){const ids=[...new Set(event.spirits||[])].filter(id=>s.spirits?.[id]&&catalog.spirits[id]);return ids.length>1?ids.length*12+level(s,'Worship')*2:ids.length?(catalog.spirits[ids[0]].power||0)+level(s,'Worship'):0;}
 else{const effective=level(s,style==='ranged'?'Ranged':'Strength')+8+(focus==='aggressive'||focus==='focused'?3:focus==='balanced'?1:0),strength=style==='ranged'?(catalog.items[s.equipment?.ammo]?.rangedStrength||7):bonus(s,'strengthBonus');max=Math.max(style==='ranged'?2:1,Math.floor(.5+effective*(strength+64)/640));}
 if(e.type==='dummy')return Math.max(1,Math.floor(Math.random()*(max+1)));
 if(Math.random()>=chance(a,d))return 0;return Math.max(style==='ranged'?1:0,Math.floor(Math.random()*(max+1)));
}
function rollEnemy(s,e,style){const skill=style==='magic'?level(s,'Magic')*.7+level(s,'Defense')*.3:level(s,'Defense'),a=(e.attackLevel+8)*64,d=(skill+8)*(64+bonus(s,'armor'));return Math.random()<chance(a,d)?Math.floor(Math.random()*(e.maxHit+1)):0;}
export function publicAction(input,now){
 const a=input.action;if(!a||typeof a!=='object'||!['combat','gather','work','teleport'].includes(a.kind))return null;
 if(!Number.isFinite(a.started)||a.started<now-15000||a.started>now+1500)return null;
 const allowedTools=['axe','pickaxe','fishingRod','fishingNet','lobsterPot','harpoon'];
 return {kind:a.kind,started:Math.min(now,a.started),duration:Math.max(200,Math.min(10000,Number(a.duration)||1200)),weapon:catalog.items[a.weapon]?.slot==='weapon'?a.weapon:null,style:styles.includes(a.style)?a.style:null,tool:allowedTools.includes(a.tool)?a.tool:null,work:['bury','cook','firemaking'].includes(a.work)?a.work:null,type:['tree','ore','fish'].includes(a.type)?a.type:null,color:a.color==='red'?'red':'green',target:point(a.target?.x,a.target?.y)&&near(input,a.target,20)?{x:a.target.x,y:a.target.y,...(token(a.target.entity)&&catalog.entities[input.scene+':'+a.target.entity]?{entity:a.target.entity}:{} )}:null};
}
function initial(e,now,actor){return {entity:e.id,hp:e.hp,maxhp:e.hp,x:e.x,y:e.y,generation:1,deadUntil:0,owner:e.hp?'server':actor,ownerUntil:now+5000,nextMove:now+(3+Number(e.id)%5)*1000,target:null,pose:null,hazard:null,phase:0,move:0,defender:null,returning:false,nextAttack:0,opened:false,signature:[e.kind,e.hp,e.x,e.y,'server-v1'].join(':')};}
function lootFor(e){
 const common={ridgewolf:{fang:2,bones:1},sentinel:{bones:4,runes:20,ironSword:1},wolf:{fang:1,bones:1},goblin:{bones:1,arrows:3},slime:{herbs:1,runes:2},skeleton:{bones:2,runes:3},bandit:{bones:1,arrows:5},rat:{bones:1},man:{bones:1},king:{bones:3,runes:15,ironHelm:1},warden:{bones:3,runes:12,ironShield:1}};
 return e.type==='dummy'?{}:{coins:e.coins,...(e.drops||common[e.kind]||{bones:1}),...(e.marks?{huntersMark:e.marks}:{})};
}
async function cooldown(db,id,nonce,now,ms){
 await db.prepare('INSERT INTO shared_clocks (id,ready_at,nonce) VALUES (?,0,?) ON CONFLICT DO NOTHING').bind(id,'').run();
 const r=await db.prepare('UPDATE shared_clocks SET ready_at=?,nonce=? WHERE id=? AND (ready_at<=? OR nonce=?) RETURNING nonce').bind(now+ms,nonce,id,now,nonce).first();return !!r;
}
export async function syncSharedWorld(env,actor,s,input,now,scope){
 const db=env.DB,w=input.world;if(!w||w.protocol!==1)return null;
 const scene=input.scene,entityKey=id=>scope+':'+scene+':'+id,receiptKey=id=>actor+':'+id;
 const watch=[...new Set((Array.isArray(w.watch)?w.watch:[]).filter(id=>token(id)))].slice(0,64);
 // Actors are subscribed by the server, independently of each player's
 // nearest-resource list. Two nearby observers must receive the same fight.
 const requested=[...(Array.isArray(w.events)?w.events:[]).slice(0,12).map(e=>e.entity),input.action?.target?.entity,...watch].filter(token);
 const nearby=(sceneEntities.get(scene)||[]).filter(e=>e.hp&&near(input,e,50)||e.door&&near(input,e,8));
 const definitions=[...new Map([...requested.map(id=>catalog.entities[scene+':'+id]).filter(e=>e&&near(input,e,75)),...nearby].map(e=>[e.id,e])).values()].slice(0,192);
 const activity=publicAction(input,now);
 if(activity)await db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1) ON CONFLICT DO NOTHING').bind(actor+':activity:'+activity.kind+':'+activity.started,scope,scene,actor,'activity',enc({...activity,x:input.x,y:input.y}),now).run();
 if(w.arrival&&token(w.arrival)){
  const permit=await db.prepare("SELECT result FROM shared_events WHERE id=? AND actor=? AND kind='teleport'").bind(receiptKey(w.arrival),actor).first();
  if(permit){const p=parse(permit.result);if(p.ok&&p.destination===scene&&now>=p.arriveAt&&near(input,{x:p.entry[0],y:p.entry[1]},5))await db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1) ON CONFLICT DO NOTHING').bind(receiptKey(w.arrival)+':arrival',scope,scene,actor,'arrival',enc({permit:w.arrival,x:input.x,y:input.y,arrivedAt:now}),now).run();}
 }
 const names=definitions.map(e=>entityKey(e.id));
 async function readRows(){const rows=[];for(let i=0;i<names.length;i+=80){const batch=names.slice(i,i+80);rows.push(...(await db.prepare('SELECT * FROM shared_entities WHERE id IN ('+batch.map(()=>'?').join(',')+')').bind(...batch).all()).results);}return rows;}
 let rows=await readRows(),known=new Set(rows.map(r=>r.entity_id));
 const missing=definitions.filter(e=>!known.has(e.id));if(missing.length)await db.batch(missing.map(e=>db.prepare('INSERT INTO shared_entities (id,scope,scene,entity_id,state,revision) VALUES (?,?,?,?,?,0) ON CONFLICT DO NOTHING').bind(entityKey(e.id),scope,scene,e.id,enc(initial(e,now,actor)))));
 if(missing.length)rows=await readRows();
 const maintenance=[];
 for(const row of rows){const e=catalog.entities[scene+':'+row.entity_id],v=parse(row.state),fresh=initial(e,now,actor);let change=false;
  if(v.signature!==fresh.signature){Object.assign(v,fresh,{generation:v.generation+1});change=true;}
  else if(v.deadUntil&&v.deadUntil<=now){Object.assign(v,fresh,{generation:v.generation+1});change=true;}
  else if(e.hp&&!v.deadUntil&&v.owner!=='server'){v.owner='server';v.ownerUntil=now+5000;if(v.target){v.target=null;v.x=e.x;v.y=e.y;v.hp=e.hp;v.pose=null;}change=true;}
  if(!v.deadUntil&&!v.target&&v.hp<e.hp&&now>=(v.recoverAt||0)){v.hp=Math.min(e.hp,v.hp+1);v.recoverAt=now+5000;change=true;}
  if(change)maintenance.push(db.prepare('UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(enc(v),row.id,row.revision));
 }
 if(maintenance.length)await db.batch(maintenance);
 // A browser can request an attack, but cannot move or animate an NPC.
 // Use fresh committed positions, including the caller's published presence.
 const players=new Map((await db.prepare('SELECT player_id,payload FROM player_presence WHERE scene=? AND seen_at>?').bind(scene,now-12000).all()).results.map(r=>[r.player_id,parse(r.payload)]));
 players.set(actor,{x:input.x,y:input.y});
 rows=await readRows();const ticks=[];
 for(const row of rows){const e=catalog.entities[scene+':'+row.entity_id];if(!e.hp)continue;
  const v=parse(row.state),before=enc(v);if(v.target===actor)v.defender={xp:s.xp,equipment:s.equipment};
  const effects=advanceNpc(e,v,players,now,catalog,rollEnemy);if(enc(v)===before)continue;
  ticks.push(db.prepare('UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(enc(v),row.id,row.revision));
  for(const effect of effects){const result={...effect.result,id:effect.id,scene,kind:effect.kind,revision:row.revision+1};
   ticks.push(db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0 ON CONFLICT DO NOTHING').bind(effect.actor+':'+effect.id,scope,scene,effect.actor,effect.kind,enc(result),now,effect.kind==='enemyHit'?0:1));
  }
 }
 if(ticks.length)await db.batch(ticks);
 const ack=(Array.isArray(w.ack)?w.ack:[]).filter(token).slice(-80);
 if(ack.length)await db.prepare('UPDATE shared_events SET acked=1 WHERE actor=? AND id IN ('+ack.map(()=>'?').join(',')+')').bind(actor,...ack.map(receiptKey)).run();
 const events=(Array.isArray(w.events)?w.events:[]).slice(0,12);
 for(const event of events){
  if(!token(event.id))continue;const rid=receiptKey(event.id);
  if(await db.prepare('SELECT id FROM shared_events WHERE id=?').bind(rid).first())continue;
  const result={id:event.id,kind:event.kind,scene,ok:false};
  const record=()=>db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,0) ON CONFLICT DO NOTHING').bind(rid,scope,scene,actor,String(event.kind).slice(0,24),enc(result),now);
  if(event.scene!==scene){result.error='You have left that scene.';await record().run();continue;}
  const e=catalog.entities[scene+':'+event.entity];
  if(['attack','hit','enemyHit','companion','harvest','door'].includes(event.kind)){
   if(!e||!definitions.some(d=>d.id===e.id)){result.error='Target is outside the shared area.';await record().run();continue;}
   for(let attempt=0;attempt<8;attempt++){
    if(await db.prepare('SELECT id FROM shared_events WHERE id=?').bind(rid).first())break;
    const row=await db.prepare('SELECT * FROM shared_entities WHERE id=?').bind(entityKey(e.id)).first();if(!row)break;
    const v=parse(row.state);let loot=null;result.ok=false;delete result.error;result.entity=e.id;result.generation=v.generation;
    const fail=message=>{result.ok=false;result.error=message;};
    if(event.kind==='door'){
     if(!e.door||!near(input,e,3))fail('Stand beside the door.');else{v.opened=event.open===true;result.ok=true;result.opened=v.opened;}
    }else if(v.deadUntil>now)fail('That target is not available until it returns.');
    else if(!e.hp&&event.kind!=='harvest')fail('That target cannot fight.');
    else if(event.generation!==v.generation)fail('That encounter has already ended.');
    else if(event.kind==='harvest'){
     const d=e.resource;
     if(!d||!near(input,v,2))fail('Stand beside the resource.');
     else if(level(s,d.skill)<d.level)fail('Your skill level is too low.');
     else if(!await cooldown(db,actor+':gather',event.id,now,1800))fail('You are still gathering.');
     else if(Math.random()>Math.min(.95,.425+(level(s,d.skill)-d.level)*.009)){result.ok=true;result.missed=true;}
     else{result.ok=true;result.item=d.item||d.raw;result.xp=d.xp;result.skill=d.skill;result.bait=d.bait||null;
      if(e.type==='ore'||e.type==='tree'&&(d.resourceId==='normal'||Math.random()<.125)){v.deadUntil=now+e.respawn;v.target=null;}
     }
    }else if(event.kind==='attack'){
     const range=event.style==='melee'?2+(e.radius||0):10+(e.radius||0);
     if(!near(input,v,range)||!npcLineOfSight(e,v,input))fail('Target is out of attack range.');
     else if(e.mainStoryStage!=null&&s.mainStoryQuest?.stage!==e.mainStoryStage||e.scene==='quest_underiron'&&s.mountainQuest?.stage!==6||e.encounter==='veyr'&&(s.mountainQuest?.stage||0)<17)fail('Complete the story objectives before this fight.');
     else{result.ok=true;if(!v.target){v.owner='server';v.target=actor;v.pose=null;v.hazard=null;v.nextAttack=now+(e.encounter?2500:e.interval*1000);v.defender={xp:s.xp,equipment:s.equipment};v.assisted=s.mountainQuest?.stage===17;}}
    }else if(event.kind==='hit'){
     const style=styles.includes(event.style)?event.style:'melee',weapon=catalog.items[s.equipment?.weapon],range=style==='melee'?2+(e.radius||0):10+(e.radius||0);
     if(!near(input,v,range)||!npcLineOfSight(e,v,input))fail('Target is out of attack range.');
     else if(e.mainStoryStage!=null&&s.mainStoryQuest?.stage!==e.mainStoryStage||e.scene==='quest_underiron'&&s.mountainQuest?.stage!==6||e.encounter==='veyr'&&(s.mountainQuest?.stage||0)<17)fail('Complete the story objectives before this fight.');
     else if(style==='worship'&&(!token(event.cast)||v.spiritCasts?.[actor]===event.cast))fail('That spirit effect has already struck.');
     else if(!await cooldown(db,actor+':attack',style==='worship'?event.cast:event.id,now,style==='worship'?4000:.6*(style==='magic'?5:weapon?.attackTicks||4)*1000-150))fail('Your next attack is not ready.');
     else{if(style==='worship'){v.spiritCasts??={};v.spiritCasts[actor]=event.cast;}const damage=Math.min(v.hp,rollHit(s,e,style,event));v.hp-=damage;if(!v.target){v.owner='server';v.target=actor;v.nextAttack=now+(e.encounter?2500:e.interval*1000);v.defender={xp:s.xp,equipment:s.equipment};v.assisted=s.mountainQuest?.stage===17;}result.ok=true;result.damage=damage;result.style=style;result.focus=s[style+'Training']||'balanced';result.defeat=v.hp<=0;
      if(v.hp<=0){v.deadUntil=now+e.respawn;v.target=null;v.pose=null;loot={id:entityKey(e.id)+':loot:'+v.generation,scope,scene,kind:'loot',payload:{items:lootFor(e),x:v.x,y:v.y,owner:actor,publicAt:now+30000},expires:now+120000};}
     }
    }else if(event.kind==='companion'){
     if(e.encounter!=='veyr'||s.mountainQuest?.stage!==17||v.target!==actor)fail('No companion is assisting this encounter.');
     else if(!await cooldown(db,actor+':companion',event.id,now,3900))fail('Companion spell is recovering.');
     else{result.ok=true;result.damage=Math.min(2,Math.max(0,v.hp-1));v.hp-=result.damage;}
    }else{fail('Enemy attacks are resolved by the world server.');}

    if(!result.ok){await record().run();break;}
    result.revision=row.revision+1;result.x=v.x;result.y=v.y;result.hp=v.hp;result.maxhp=v.maxhp;
    const statements=[db.prepare('UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM shared_events WHERE id=?)').bind(enc(v),row.id,row.revision,rid),db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,0 WHERE changes()>0 ON CONFLICT DO NOTHING').bind(rid,scope,scene,actor,event.kind,enc(result),now)];
    if(loot)statements.push(db.prepare('INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) SELECT ?,?,?,?,?,?,0 WHERE EXISTS (SELECT 1 FROM shared_events WHERE id=?) ON CONFLICT DO NOTHING').bind(loot.id,scope,scene,loot.kind,enc(loot.payload),loot.expires,rid));
    await db.batch(statements);if(await db.prepare('SELECT id FROM shared_events WHERE id=?').bind(rid).first())break;
   }
   continue;
  }
  if(event.kind==='fire'||event.kind==='drop'){
   if(!point(event.x,event.y)||!near(input,event,event.kind==='fire'?2:12)){result.error='That location is out of reach.';await record().run();continue;}
   if(event.kind==='fire'){
    const tree=catalog.trees[event.log];if(!tree||level(s,'Firemaking')<tree.level){result.error='Invalid fire.';await record().run();continue;}
    const existing=await db.prepare("SELECT id FROM shared_objects WHERE scope=? AND scene=? AND kind='fire' AND expires_at>? AND json_extract(payload,'$.x')=? AND json_extract(payload,'$.y')=?").bind(scope,scene,now,event.x,event.y).first();
    if(existing){result.error='Someone already lit a fire here.';await record().run();continue;}
    if(!await cooldown(db,actor+':fire',event.id,now,1800)){result.error='Wait before lighting another fire.';await record().run();continue;}
    if(!await cooldown(db,scope+':'+scene+':fire:'+event.x+':'+event.y,rid,now,150000)){result.error='Someone already lit a fire here.';await record().run();continue;}
    result.ok=true;result.xp=tree.fire;result.object={id:rid,kind:'fire',x:event.x,y:event.y,owner:actor,logType:event.log,expiresAt:now+150000};
   }else{const items=Object.fromEntries(Object.entries(event.items||{}).filter(([id,n])=>catalog.items[id]&&Number.isSafeInteger(n)&&n>0&&n<=1000000000).slice(0,25));if(!Object.keys(items).length){result.error='Nothing to drop.';await record().run();continue;}result.ok=true;result.object={id:rid,kind:'loot',items,x:Math.round(event.x),y:Math.round(event.y),owner:actor,publicAt:now+30000,expiresAt:now+120000};}
   const o=result.object;
   await db.batch([db.prepare('INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) VALUES (?,?,?,?,?,?,0) ON CONFLICT DO NOTHING').bind(o.id,scope,scene,o.kind,enc(o),o.expiresAt),record()]);continue;
  }
  if(event.kind==='pickup'){
   for(let attempt=0;attempt<8;attempt++){
    result.ok=false;delete result.error;
    if(await db.prepare('SELECT id FROM shared_events WHERE id=?').bind(rid).first())break;
    const row=await db.prepare("SELECT * FROM shared_objects WHERE id=? AND scope=? AND scene=? AND kind='loot' AND expires_at>?").bind(String(event.object),scope,scene,now).first();
    if(!row){result.error='That drop has already gone.';await record().run();break;}
    const o=parse(row.payload),n=Math.min(o.items?.[event.item]||0,Math.max(0,Number.isSafeInteger(event.count)?event.count:0));
    if(!near(input,o,1)||o.owner!==actor&&o.publicAt>now||!n){result.error='That item is not available to collect.';await record().run();break;}
    o.items[event.item]-=n;if(!o.items[event.item])delete o.items[event.item];result.ok=true;result.item=event.item;result.count=n;result.object=row.id;
    await db.batch([db.prepare('UPDATE shared_objects SET payload=?,revision=revision+1 WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM shared_events WHERE id=?)').bind(enc(o),row.id,row.revision,rid),db.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,0 WHERE changes()>0 ON CONFLICT DO NOTHING').bind(rid,scope,scene,actor,'pickup',enc(result),now)]);
   }continue;
  }
  if(event.kind==='teleport'){
   const destination=String(event.destination),lairs=['lair_veyr','lair_varkesh','lair_colossus','lair_xalith'],entry={lair_veyr:[22,44],lair_varkesh:[29,54],lair_colossus:[23,44],lair_xalith:[27,50],overworld:[42,51]};
   const clock=await db.prepare('SELECT ready_at FROM shared_clocks WHERE id=?').bind(actor+':attack').first();
   // Rowan's permit precedes completion: the character is on the final lesson,
   // not one step past it. Export this index from the actual tutorial sequence.
   const finishStage=catalog.tutorial.finishStages[s.tutorialVersion]??catalog.tutorial.finishStage;
   if(event.mode==='rowan'?scene!=='tutorial'||(s.tutorial||0)<finishStage:scene==='tutorial'||!lairs.includes(destination)||destination==='lair_veyr'&&(s.mountainQuest?.stage||0)<18){result.error='That crossing is not unlocked.';await record().run();continue;}
   if(event.mode==='rowan'&&destination!=='overworld'){result.error='Invalid island crossing.';await record().run();continue;}
   if(clock&&clock.ready_at+6000>now){result.error='Leave combat before teleporting.';await record().run();continue;}
   if(!await cooldown(db,actor+':teleport',event.id,now,4000)){result.error='A crossing is already forming.';await record().run();continue;}
   result.ok=true;result.destination=destination;result.entry=entry[destination];result.departure={scene,x:input.x,y:input.y};result.startedAt=now;result.arriveAt=now+2600;result.color=event.mode==='rowan'?'green':'red';await record().run();continue;
  }
  result.error='Unknown world action.';await record().run();
 }
 const burned=(await db.prepare("SELECT * FROM shared_objects WHERE scope=? AND scene=? AND kind='fire' AND expires_at<=? AND expires_at>?").bind(scope,scene,now,now-120000).all()).results;
 if(burned.length)await db.batch(burned.map(row=>{const o=parse(row.payload);return db.prepare("INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) VALUES (?,?,?,'loot',?,?,0) ON CONFLICT DO NOTHING").bind(row.id+':ashes',scope,scene,enc({x:o.x,y:o.y,owner:o.owner,items:{ashes:1},publicAt:row.expires_at+30000}),row.expires_at+120000);}));
 rows=await readRows();
 const objects=(await db.prepare('SELECT * FROM shared_objects WHERE scope=? AND scene=? AND expires_at>?').bind(scope,scene,now).all()).results.flatMap(row=>{const o=parse(row.payload);return near(input,o,75)&&(row.kind==='fire'||o.owner===actor||o.publicAt<=now)?[{...o,id:row.id,kind:row.kind,expiresAt:row.expires_at,revision:row.revision}]:[];});
 const receipts=(await db.prepare('SELECT result FROM shared_events WHERE scope=? AND actor=? AND acked=0 ORDER BY created_at LIMIT 128').bind(scope,actor).all()).results.map(r=>parse(r.result));
 // Expired props/events are bounded; entity rows remain for consistent respawns.
 await db.prepare('DELETE FROM shared_objects WHERE expires_at<?').bind(now-120000).run();
 await db.prepare('DELETE FROM shared_events WHERE acked=1 AND created_at<?').bind(now-86400000).run();
 return {protocol:1,scope,actor,serverTime:Date.now(),effects:await readSharedEffects(db,scope,scene,actor,input,now-6000),entities:rows.filter(row=>!w.revisions||w.revisions[row.entity_id]!==row.revision).map(row=>({...parse(row.state),revision:row.revision})).map(({defender,assisted,...v})=>({...v,hazard:v.hazard?(({damage,...h})=>h)(v.hazard):null})),objects,receipts,acked:ack};
}

// Public combat effects contain no inventory, rewards, private drops or saves.
export async function readSharedEffects(db,scope,scene,actor,position,since){
 const rows=(await db.prepare("SELECT id,actor,kind,result,created_at FROM shared_events WHERE scope=? AND scene=? AND created_at>=? AND kind IN ('activity','enemyAction','hit','enemyHit','companion') ORDER BY created_at DESC LIMIT 128").bind(scope,scene,since).all()).results;
 return rows.reverse().flatMap(row=>{if(row.actor===actor&&row.kind!=='enemyAction')return [];const r=parse(row.result);if(!near(position,r,75))return [];
  const base={id:row.id,actor:row.actor,kind:row.kind,at:row.created_at,x:r.x,y:r.y};
  if(row.kind==='activity')return [{...base,action:r}];
  if(row.kind==='enemyAction')return [{...base,entity:r.entity,generation:r.generation,pose:r.pose,hazard:r.hazard?(({damage,...h})=>h)(r.hazard):null}];
  return r.ok?[{...base,entity:r.entity,generation:r.generation,revision:r.revision,damage:r.damage,dodged:!!r.dodged,hp:r.hp,maxhp:r.maxhp,defeat:!!r.defeat}]:[];
 });
}
