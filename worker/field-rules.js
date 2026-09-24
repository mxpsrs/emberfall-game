// Generated from the browser fieldwork and relic rules.
import catalog from './shared-catalog.json' with {type:'json'};
const ITEMS=catalog.items,FIELD_SPELLS=catalog.fieldSpells,RELIC_RECIPES=catalog.relicRecipes,RELIC_ANCHORS=catalog.relicAnchors;
function skillLevel(skill,xp){xp=Math.max(0,Number(xp)||0);if(skill==='Worship')return Math.min(99,1+Math.floor(Math.sqrt(xp/35)));let n=1;while(n<99&&xp>=catalog.xp[n+1])n++;return n;}
export function fieldEquipmentEffects(state){
 const counts={},result={weight:0,runCost:1,armor:0,magicDefense:0,magicAccuracy:0,rangedAccuracy:0,attackBonus:0,guard:0,sets:[]};
 for(const [slot,id]of Object.entries(state.equipment||{})){const item=ITEMS[id];if(!item||!['head','body','legs','hands','feet'].includes(slot))continue;result.weight+=item.weight||0;result.magicDefense+=item.wardResistance||0;if(item.armorSet)counts[item.armorSet]=(counts[item.armorSet]||0)+1;}
 if(counts.mithril>=3){result.runCost=.9;result.sets.push('Windsteel route gear · 10% less running energy');}
 if(counts.adamant>=3){result.guard=1;result.sets.push('Deepiron hold · hits of 6+ reduced by 1');}
 if(counts.black>=3){result.magicDefense+=4;result.sets.push('Charsteel kiln ward · +4 Magic defence');}
 if(counts.rune>=3){result.attackBonus=2;result.rangedAccuracy=2;result.magicAccuracy=2;result.armor=2;result.sets.push('Eldrite balance · +2 combat and armour');}
 return result;
}
export function fieldSpellFailure(id,state=s,now=Date.now()){
 const spell=FIELD_SPELLS[id];if(!spell)return 'Unknown spell.';
 if(skillLevel('Magic',state.xp?.Magic)<spell.level)return 'Requires Magic '+spell.level+'.';
 if(spell.worship&&skillLevel('Worship',state.xp?.Worship)<spell.worship)return 'Requires Worship '+spell.worship+'.';
 if((state.fieldSpellReady?.[id]||0)>now)return 'That spell is recovering.';
 if(spell.heal&&state.hp>=Math.max(10,skillLevel('Hitpoints',state.xp?.Hitpoints)))return 'Your health is already full.';
 if(spell.energy&&(state.runEnergy??100)>=100)return 'Your run energy is already full.';
 if(Object.entries(spell.ingredients).some(([key,n])=>(state.bag?.[key]||0)<n))return 'Not enough relics.';
 return null;
}
export function relicOperation(state,action,recipe,input){
 const stage=Number(state.relicQuest?.stage)||0,r=RELIC_RECIPES[recipe],bag=state.bag||{};
 const at=key=>{const a=RELIC_ANCHORS[key];return a&&input.scene===a.scene&&Math.hypot(input.x-a.x,input.y-a.y)<=2;};
 const fail=error=>({ok:false,error});
 const result={ok:true,action,recipe,take:{},give:{},xp:{}};
 if(action==='accept'){if(stage!==0||!at('teacher'))return fail('Speak to Selene to begin.');result.stage=1;}
 else if(action==='archive'){if(stage!==1||!at('archive'))return fail('Find the old crossing records in Ironcrown’s library.');result.stage=2;}
 else if(action==='learn'){if(stage!==2||!at('teacher'))return fail('Bring the library discovery to Selene.');result.stage=3;if(!bag.relicChisel)result.give.relicChisel=1;}
 else if(action==='chisel'){if(stage<3||!at('teacher')||bag.relicChisel||state.bank?.relicChisel)return fail('Your chisel is in your bag or bank.');result.give.relicChisel=1;}
 else if(action==='shape'){
  if(stage<3)return fail('Learn the inscription from Selene during The Well Between Worlds.');
  if(!r)return fail('Choose a relic pattern.');
  if(skillLevel('Relic Shaping',state.xp?.['Relic Shaping'])<r.level)return fail('Requires Relic Shaping '+r.level+'.');
  if(!bag.relicChisel||!bag.lodestone)return fail('You need an inscribing chisel and lodestone in your bag.');
  result.take.lodestone=1;result.give[r.unfinished]=1;result.xp['Relic Shaping']=r.xp;
  if(stage===3&&recipe==='air')result.stage=4;
 }else if(action==='lake'){
  if(stage!==4||!at('lake')||!bag.unfinished_air)return fail('Bring an unfinished Air relic to the lake’s immersion stone.');
  result.take.unfinished_air=1;result.give.airRunes=10;result.give.lakeRecord=1;result.stage=5;result.xp['Relic Shaping']=20;
 }else if(action==='leyline'){
  if(stage!==5||!at('teacher')||!bag.lakeRecord)return fail('Bring the lake resonance record to Selene.');
  result.take.lakeRecord=1;result.stage=6;
 }else if(action==='charge'){
  if(stage<6||!at('altar'))return fail('Selene must first connect the school altar to the Fairy Lands lake.');
  if(!r||!bag[r.unfinished])return fail('Bring an unfinished relic to the leyline altar.');
  if(skillLevel('Relic Shaping',state.xp?.['Relic Shaping'])<r.level)return fail('Requires Relic Shaping '+r.level+'.');
  result.take[r.unfinished]=1;result.give[r.item]=r.count;result.xp['Relic Shaping']=r.xp*2;
  if(stage===6){result.stage=7;result.xp['Relic Shaping']+=150;result.xp.Magic=100;result.give.coins=150;}
 }else return fail('Unknown relic action.');
 return result;
}
