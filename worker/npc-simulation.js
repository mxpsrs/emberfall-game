// NPC decisions run against committed server state, never a browser's poses.
// CAS transactions in shared-world serialize ticks from concurrent observers.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function cell(e,x,y){const n=e.nav;x=Math.round(x)-n.left;y=Math.round(y)-n.top;return x<0||y<0||x>=n.width||y>=n.width?3:Number(n.cells[y*n.width+x]);}
export function npcLineOfSight(e,a,b){if(!e.nav)return true;const steps=Math.ceil(distance(a,b)*4);for(let i=1;i<steps;i++)if(cell(e,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)&2)return false;return true;}
function nextStep(e,v,goal,range){
 if(!e.nav)return null;const queue=[[v.x,v.y,null]],seen=new Set([v.x+':'+v.y]);
 for(let i=0;i<queue.length&&i<1849;i++){
  const [x,y,first]=queue[i];if(first&&Math.hypot(x-goal.x,y-goal.y)<=range)return first;
  const directions=[[1,0],[-1,0],[0,1],[0,-1]].sort((a,b)=>Math.hypot(x+a[0]-goal.x,y+a[1]-goal.y)-Math.hypot(x+b[0]-goal.x,y+b[1]-goal.y));
  for(const [dx,dy]of directions){const nx=x+dx,ny=y+dy,key=nx+':'+ny;if(seen.has(key)||cell(e,nx,ny)&1)continue;seen.add(key);queue.push([nx,ny,first||[nx,ny]]);}
 }
 return null;
}
function contains(h,v,p,e){
 const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy);
 if(h.shape==='strike')return distance(v,p)<=1.8+(e.radius||0);
 if(h.shape==='projectile')return Math.hypot(p.x-h.fromX,p.y-h.fromY)<=h.range+1;
 if(h.shape==='cone'){const x=p.x-h.fromX,y=p.y-h.fromY,r=Math.hypot(x,y);return r<=h.length&&(r<.01||(x*Math.sin(h.heading)+y*Math.cos(h.heading))/r>=Math.cos(h.halfAngle));}
 if(h.shape==='ring')return d>=h.inner&&d<=h.radius;
 if(h.shape==='cross')return Math.abs(dx)<=h.radius&&Math.abs(dy)<=h.length||Math.abs(dy)<=h.radius&&Math.abs(dx)<=h.length;
 return d<=h.radius;
}
export function advanceNpc(e,v,players,now,catalog,rollEnemy){
 if(!e.hp||v.deadUntil)return [];
 const effects=[],boss=catalog.hunts[e.encounter],p=players.get(v.target);
 if(v.target&&(!p||distance(p,e)>(boss?16:11)||distance(p,v)>18)){
  v.target=null;v.pose=null;v.hazard=null;v.returning=true;v.nextMove=now;v.nextAttack=0;
 }
 if(!v.target){
  if(v.returning){if(distance(v,e)<.1)v.returning=false;else if(now>=(v.nextMove||0)){const step=nextStep(e,v,e,0);if(step)[v.x,v.y]=step;v.nextMove=now+1000/(e.speed||1.25);}}
  else if(!e.stationary&&e.type!=='dummy'&&e.kind!=='warden'&&now>=(v.nextMove||0)){
   const directions=distance(v,e)>=3?[[Math.sign(e.x-v.x),0],[0,Math.sign(e.y-v.y)]]:[[1,0],[-1,0],[0,1],[0,-1]];
   const start=Math.floor(now/1000+Number(e.id))%directions.length;
   for(let i=0;i<directions.length;i++){const [dx,dy]=directions[(start+i)%directions.length],x=v.x+dx,y=v.y+dy;if(!(cell(e,x,y)&1)&&![...players.values()].some(p=>Math.hypot(p.x-x,p.y-y)<.8)){v.x=x;v.y=y;break;}}
   v.nextMove=now+(3+Number(e.id)%5)*1000;
  }
  return effects;
 }
 if(e.type==='dummy')return effects;
 const phase=boss?.mechanics?boss.phases.reduce((n,p,i)=>v.hp/v.maxhp<=p.at?i:n,0):0;
 if(phase!==(v.phase||0)){v.phase=phase;v.move=0;v.hazard=null;v.pose=null;v.nextAttack=now+2000;}
 if(v.hazard&&now>=v.hazard.due){
  const h=v.hazard,dodged=!contains(h,v,p,e)||!npcLineOfSight(e,{x:h.fromX,y:h.fromY},p);
  effects.push({kind:'enemyHit',actor:v.target,id:'npc-hit:'+e.id+':'+v.generation+':'+v.pose.attackAt,result:{ok:true,damage:dodged?0:h.damage,dodged,entity:e.id,generation:v.generation,style:h.style,x:v.x,y:v.y,hp:v.hp,maxhp:v.maxhp}});
  v.lastEnemyHit=v.pose.attackAt;v.hazard=null;
 }
 const d=distance(v,p),range=boss?.mechanics?1.6+(e.radius||0):e.style==='melee'?1.5+(e.radius||0):5.5;
 if(!boss?.anchored&&!v.hazard&&d>range&&now>=(v.nextMove||0)){
  const step=nextStep(e,v,p,range);if(step)[v.x,v.y]=step;v.nextMove=now+1000/(e.speed||1.25);
 }
 if(now<(v.nextAttack||0)||v.hazard||d>10||!npcLineOfSight(e,v,p))return effects;
 const speed=boss?.phases?.[phase]?.speed||1;
 let key=boss?.mechanics?boss.phases[phase].moves[(v.move||0)%boss.phases[phase].moves.length]:e.style==='magic'?'spell':e.style==='ranged'?'arrow':'bite';
 if(e.encounter==='varkesh')key=d<3.7?'bite':'blight';
 if(key==='bite'&&d>1.7+(e.radius||0))return effects;
 const move={...catalog.moves[key]};let clip=e.kind==='forestgiant'?['attack','attack2','attack3'][(v.move||0)%3]:null;
 if(e.kind==='forestgiant')move.windup=1;
 if(e.encounter==='colossus'&&key==='sweep')move.radius=4.2;
 if(e.encounter==='veyr'){Object.assign(move,key==='sweep'?{radius:3.2}:key==='ring'?{inner:2.1,radius:4.6}:{});clip=key==='sweep'?(phase?'attack3':(v.move||0)%4===0?'attack':'attack2'):key==='ring'?'cast2':'cast';}
 if(e.encounter==='varkesh'){if(key==='bite')Object.assign(move,{shape:'cone',length:4.6,halfAngle:.78,windup:1.2});clip=key==='bite'?'attack':'cast';}
 if(e.encounter==='xalith'){Object.assign(move,{shape:'circle',origin:'enemy',radius:3.2,windup:1.15});clip=(v.move||0)%2?'attack2':'attack';}
 move.windup*=speed;const heading=Math.atan2(p.x-v.x,p.y-v.y);
 let damage=rollEnemy(v.defender||{xp:{},equipment:{}},e,move.style);
 if(e.encounter==='veyr'&&v.assisted&&damage>0)damage=Math.max(1,Math.ceil(damage*.5));
 v.pose={attackAt:now,clip,move:key,windup:move.windup*1000,heading,style:move.style};
 v.hazard={...move,key,x:move.origin==='enemy'?v.x:p.x,y:move.origin==='enemy'?v.y:p.y,fromX:v.x,fromY:v.y,heading,started:now,due:now+move.windup*1000,damage};
 v.move=(v.move||0)+1;v.nextAttack=v.hazard.due+(boss?.mechanics?2300*speed:(e.interval||3.2)*1000);
 effects.push({kind:'enemyAction',actor:v.target,id:'npc-action:'+e.id+':'+v.generation+':'+now,result:{entity:e.id,generation:v.generation,x:v.x,y:v.y,pose:v.pose,hazard:v.hazard}});
 return effects;
}
