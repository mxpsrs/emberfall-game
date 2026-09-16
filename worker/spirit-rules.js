// Generated from dist/spirits.js; one rule set for local and shared combat.
import catalog from './shared-catalog.json' with {type:'json'};
const SPIRITS=catalog.spirits;
export function spiritAttuned(state){return SPIRITS[state.attunedSpirit]&&state.spirits?.[state.attunedSpirit]?state.attunedSpirit:state.spirits?.[state.firstSpirit]?state.firstSpirit:Object.keys(SPIRITS).find(id=>state.spirits?.[id])||null;}
export function spiritBondRank(state,id,worship){const xp=Math.max(0,Number(state.spirits?.[id]?.bondXP)||0);return xp>=240&&worship>=12?3:xp>=80&&worship>=5?2:1;}
export function spiritBuild(state,worship){
 const id=spiritAttuned(state),rank=spiritBondRank(state,id,worship);
 return {id,rank,armor:id==='cairn'?3+rank:id==='flint'?2:id==='rill'?(rank>=2?2:1):0,health:id==='brook'?3+rank:0,aim:id==='zephyr'?3+rank:id==='gale'?2:0,runCost:id==='zephyr'?.85:id==='gale'?.8:1};
}
export function spiritStrike(state,worship,memory,damage,style,now){
 const build=spiritBuild(state,worship),id=build.id;
 const out={damage,heal:0,energy:0,slow:0,proc:null,spirit:id,memory};
 if(!id||damage<=0||!['melee','ranged','magic'].includes(style))return out;
 const old=memory?.id===id&&now-memory.at<12000?memory:{id,hits:0,style:null,procAt:-100000};
 const m=out.memory={...old,hits:old.hits+1,style,at:now},strong=build.rank===3?2:1;
 if(id==='cinder'&&m.hits%4===0){out.damage+=strong;out.proc='Kindle';}
 if(id==='brook'&&m.hits%5===0){out.heal=strong;out.proc='Undertow';}
 if(id==='rill'&&m.hits%4===0){out.heal=strong;out.proc='Quiet current';}
 if(id==='gale'&&m.hits%4===0){out.energy=3+build.rank;out.proc='Slipstream';}
 if(id==='flint'&&m.hits%5===0){out.damage+=1+strong;out.slow=1;out.proc='Fault';}
 if(id==='pyre'&&old.style&&old.style!==style&&now-old.procAt>=6000){out.damage+=strong;m.procAt=now;out.proc='Crossfire';}
 return out;
}
export function spiritGuard(state,worship,damage){const b=spiritBuild(state,worship);return b.id==='cairn'&&damage>=(b.rank===3?3:4)?damage-1:damage;}
