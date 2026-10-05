'use strict';
// Veldren's fieldwork loop uses completed actions, never raw XP awards.
// Legacy item keys remain stable so existing inventories and saves survive.
const FIELD_ELEMENTS={Woodcutting:'Air',Fishing:'Water',Mining:'Earth',Firemaking:'Fire'};
const FIELD_MILESTONES=[12,48,120];
const FIELD_SPELLS={
 trailwind:{name:'Trailwind',category:'Fieldcraft',level:8,ingredients:{airRunes:2,runes:1},energy:24,cooldown:30,baseXP:6,color:'#b8e5dc',desc:'Recover up to 24 run energy. Useful between gathering sites. 30 second recovery.'},
 mendingCurrent:{name:'Mending Current',category:'Support',level:18,ingredients:{waterRunes:3,runes:2},heal:6,cooldown:30,baseXP:9,color:'#79c9ed',desc:'Restore up to 6 of your Hitpoints. 30 second recovery.'},
 bondlight:{name:'Memorial Light',category:'Support',level:25,worship:5,ingredients:{earthRunes:2,waterRunes:2,runes:2},heal:4,cooldown:45,baseXP:12,color:'#9ecec1',desc:'Restore up to 4 Hitpoints. Requires Worship 5. 45 second recovery.'}
};
function fieldProgress(state=s){state.fieldwork??={};for(const key of Object.keys(FIELD_ELEMENTS))state.fieldwork[key]=Math.max(0,Math.min(1000000,Math.floor(Number(state.fieldwork[key])||0)));return state.fieldwork;}
discoverSkillSpirit=function(skill,resource){
 if(!FIELD_ELEMENTS[skill])return null;
 const progress=fieldProgress(),count=++progress[skill];
 if(FIELD_MILESTONES.includes(count))toast(skill+' fieldwork milestone reached.');
 return null;
};
function fieldSpellFailure(id,state=s,now=Date.now()){
 const spell=FIELD_SPELLS[id];if(!spell)return 'Unknown spell.';
 if(skillLevel('Magic',state.xp?.Magic)<spell.level)return 'Requires Magic '+spell.level+'.';
 if(spell.worship&&skillLevel('Worship',state.xp?.Worship)<spell.worship)return 'Requires Worship '+spell.worship+'.';
 if((state.fieldSpellReady?.[id]||0)>now)return 'That spell is recovering.';
 if(spell.heal&&state.hp>=Math.max(10,skillLevel('Hitpoints',state.xp?.Hitpoints)))return 'Your health is already full.';
 if(spell.energy&&(state.runEnergy??100)>=100)return 'Your run energy is already full.';
 if(Object.entries(spell.ingredients).some(([key,n])=>(state.bag?.[key]||0)<n))return 'Not enough relics.';
 return null;
}
function applyFieldSpell(id,readyAt){
 const spell=FIELD_SPELLS[id];if(!spell)return false;
 consumeIngredients(spell.ingredients);s.fieldSpellReady??={};s.fieldSpellReady[id]=readyAt;
 if(spell.energy)s.runEnergy=Math.min(100,(s.runEnergy||0)+spell.energy);
 if(spell.heal)s.hp=Math.min(maxhp(),s.hp+spell.heal);
 gain('Magic',spell.baseXP);playerAction={kind:'ritual',started:time,duration:1.2};
 if(typeof publishSharedAction==='function')publishSharedAction({kind:'work',work:'ritual',started:sharedNow(),duration:1200});
 renderUI();save();toast(spell.name+' cast.');return true;
}
function castFieldSpell(id){
 const error=fieldSpellFailure(id,s,typeof sharedNow==='function'?sharedNow():Date.now());if(error){toast(error);return false;}
 if(typeof tradeBusy==='function'&&tradeBusy()){toast('Finish trading before casting.');return false;}
 if(typeof sharedLive==='function'&&sharedLive()){if(sharedPending('fieldSpell'))return false;sharedQueue('fieldSpell',{spell:id});return true;}
 return applyFieldSpell(id,Date.now()+FIELD_SPELLS[id].cooldown*1000);
}
// Material identity is expressed through properties; real-world metals stay named.
const MATERIAL_ROLES={
 bronze:{purpose:'Repairable starter metal',weight:1},iron:{purpose:'Sturdy general-purpose metal',weight:1.2},steel:{purpose:'Tempered physical protection',weight:1.4},
 black:{purpose:'Charsteel: kiln-tempered armour for ward resistance',weight:1.3,magicDefense:2},
 mithril:{purpose:'Windsteel: light alloy for long gathering routes',weight:.65,affinity:'Air'},
 adamant:{purpose:'Deepiron: dense quarry metal for holding ground',weight:1.7,affinity:'Earth'},
 rune:{purpose:'Eldrite: balanced protection for difficult expeditions',weight:1.15,affinity:'Balanced'},
 gold:{purpose:'Gilded metalwork: ceremonial finish, Eldrite-grade protection',weight:1.4},
 dragonslayer:{purpose:'Wyrmforged: reinforced metal for dangerous expeditions',weight:1.8,magicDefense:3}
};
function fieldEquipmentEffects(state){
 const counts={},result={weight:0,runCost:1,armor:0,magicDefense:0,magicAccuracy:0,rangedAccuracy:0,attackBonus:0,guard:0,sets:[]};
 for(const [slot,id]of Object.entries(state.equipment||{})){const item=ITEMS[id];if(!item||!['head','body','legs','hands','feet'].includes(slot))continue;result.weight+=item.weight||0;result.magicDefense+=item.wardResistance||0;if(item.armorSet)counts[item.armorSet]=(counts[item.armorSet]||0)+1;}
 if(counts.mithril>=3){result.runCost=.9;result.sets.push('Windsteel route gear · 10% less running energy');}
 if(counts.adamant>=3){result.guard=1;result.sets.push('Deepiron hold · hits of 6+ reduced by 1');}
 if(counts.black>=3){result.magicDefense+=4;result.sets.push('Charsteel kiln ward · +4 Magic defence');}
 if(counts.rune>=3){result.attackBonus=2;result.rangedAccuracy=2;result.magicAccuracy=2;result.armor=2;result.sets.push('Eldrite balance · +2 combat and armour');}
 return result;
}
for(const item of Object.values(ITEMS)){
 const role=MATERIAL_ROLES[item.armorSet];if(!role||!['head','body','legs','hands','feet'].includes(item.slot))continue;
 item.weight=Math.round(role.weight*({head:1,body:3,legs:2,hands:.4,feet:.6}[item.slot])*10)/10;item.wardResistance=role.magicDefense||0;item.affinity=role.affinity||null;
 item.desc+=' '+role.purpose+'. Weight '+item.weight+'.'+(role.affinity?' Affinity: '+role.affinity+'.':'');
}
const fieldBonusBefore=equipmentBonus;
equipmentBonus=function(stat){return fieldBonusBefore(stat)+(fieldEquipmentEffects(s)[stat]||0);};
const fieldGuardBefore=applyEnemyHit;
applyEnemyHit=function(o,hit){return fieldGuardBefore(o,typeof sharedApplying!=='undefined'&&sharedApplying?hit:hit>=6?Math.max(0,hit-fieldEquipmentEffects(s).guard):hit);};
Object.assign(COMBAT_SKILL_DETAILS,{
 Attack:'Controls accuracy with melee weapons. Tap an enemy to approach and attack automatically.',
 Strength:'Controls melee impact. Heavy equipment favours holding ground; lighter gear supports movement.',
 Defense:'Avoid hits and choose protection for the job: light Windsteel routes, Deepiron holding power or balanced Eldrite gear.',
 Hitpoints:'Your health reserve. Cooking, food and Mending Current replenish it.',
 Magic:'Cast with charged relics. Learn Shaping, Binding and Resonance combat spells plus Fieldcraft and Support magic.',
 Ranged:'Use Fletching to supply equipped arrows. Tap an enemy to attack from a clear distance.',
 Worship:'Honor the fallen by burying bones and restoring memorial places across Veldren.',
 Woodcutting:'Work reachable woodland groves. Each tree rests before it can be gathered again.',
 Mining:'Earth discovery and resonance. Copper/tin 1; iron 15; coal 30; gold 40; Windsteel 55; Deepiron 70; Eldrite 85. Mine lodestone to supply Relic Shaping.',
 Fishing:'Supply Cooking from coastal and river routes.',
 Firemaking:'Create cooking sites for the journey. Fires leave ashes when spent.',
 Smithing:'Ores become metal, arrows and fitted equipment. Materials offer route, guard and balanced combat builds. Mine lodestone separately for the Relic Shaping craft.',
 Cooking:'Turn gathered food into expedition supplies. Higher levels reduce burning; ranges and campfires support different journeys.',
 Fletching:'Connect woodland logs, feathers and smithed arrowheads to ranged ammunition.'
});
function renderFieldcraftPage(page){
 if(page==='supplies')return renderRelicShapingPage();
 const p=$('panel'),intro=document.createElement('p');intro.className='classic-spell-detail';intro.textContent='Support your expedition with charged relics. Each spell shows its effect and recovery time.';p.appendChild(intro);
 for(const [id,row]of Object.entries(FIELD_SPELLS)){const b=document.createElement('button');b.type='button';b.className='fieldcraft-recipe';b.textContent=row.name+' · Magic '+row.level+'\n'+row.desc+'\nCost: '+Object.entries(row.ingredients).map(([key,n])=>n+' '+ITEMS[key].name).join(' + ');b.onclick=()=>castFieldSpell(id);p.appendChild(b);}
}

// The opening is a single departure story. Lesson identities and the saved
// bank substeps remain stable, so an existing character resumes its real work.
const FIRSTLIGHT_CHAPTERS=[
 {id:'signal',title:'I · A signal across the water',end:'magic',why:'Firstlight was built around a surviving crossing stone. Rowan needs a new wayfarer who can carry its signal to Briarhaven.'},
 {id:'hands',title:'II · A blade made by your hands',end:'loot',why:'The crossing cannot promise safe roads. Forge your own tool, then help Vale deal with the giant rats threatening the stores.'},
 {id:'provisions',title:'III · Supplies for the crossing',end:'withdraw',why:'Firstlight survives because its people share their work. Bring timber to Nell, prepare food with Bram and secure supplies with Ada.'},
 {id:'accord',title:'IV · The First Accord',end:'talk-finish',why:'Sera keeps Firstlight’s memorial traditions. Honor the fallen, then carry the island’s accord into Veldren.'}
];
function firstlightChapter(){return FIRSTLIGHT_CHAPTERS.find(c=>s.tutorial<=tutorialSteps.findIndex(t=>t.event===c.end))||FIRSTLIGHT_CHAPTERS.at(-1);}
Object.assign(TUTORS.guide,{text:FREEDOM_FIGHTER_STORIES.guide+'\nFirstlight began as a refuge around this crossing stone. Its keepers made an accord: teach each newcomer how to live from the land, then help them reach the mainland. Today you carry our next signal to Briarhaven. First open your bag and Skills. Then find Elowen in the southeast school; she will show you how an elemental relic holds the power you gather.'});
Object.assign(TUTORS.magic,{text:'A charged relic holds elemental power; the Mind relic gives it direction. Take my staff and practice supplies. Equip the staff with the Magic icon and cast Gust Needle at the practice dummy: one Air relic and one Mind relic per cast. Your signal is the first part of Rowan’s crossing. Relic supplies are dwindling. Arcanist Selene at Briarhaven’s mainland school is searching for a way to make more; speak to her after your crossing. Next, Orin will help you make something that lasts after the spell is spent.'});
Object.assign(TUTORS.mining,{text:'A wayfarer should know the hands that made their equipment. Mine copper and tin in my yard, use an ore on the furnace to smelt bronze, then use the bar on the anvil and choose Dagger. Smithing turns the rock into tools, arrows and armour. Once you have made your dagger, find Captain Vale at the yard. He needs help protecting our stores.'});
Object.assign(TUTORS.woods,{text:'Vale keeps the stores safe; now we must fill them. Cut the marked tree for a log and carry it to Nell by the water. Each felled tree leaves a stump for everyone until it regrows, so work another tree while it rests. Nell will use your timber for the fire that cooks your first catch.'});
Object.assign(TUTORS.fishing,{text:'Ash’s timber is our cooking fuel. Net shrimp at the marked ripples, light your log beside me and use the raw shrimp on that fire. Then take your new cooking experience to Bram in the eastern kitchen. He is packing food for the crossing.'});
Object.assign(TUTORS.cooking,{text:'A journey begins with food you can make again. Take this flour and water. Select the flour and then the jug to make dough; use the dough on our range to bake bread. Try eating it: food restores health lost in a fight. Take your supplies to Banker Ada in the northern bank. She will show you how Firstlight’s stores stay available on the mainland.'});
Object.assign(TUTORS.bank,{text:'Your supplies should outlast a crowded bag. Open the bank and click the highlighted inventory item to deposit it. I will then highlight that same stored item to withdraw. Next, try the 1, 5, 10 and All quantity controls; close the bank when the lesson says you are ready. These stores follow your character to Briarhaven. Sera waits at the southwest shrine to complete the accord.'});
Object.assign(TUTORS.worship,{text:'Worship keeps the names and sacrifices of the fallen from being lost. Bury the bones you kept to honour them, then return to Rowan. Across Veldren, memorial shrines and acts of remembrance continue this practice.'});
const openingTitles={'talk-guide':'The crossing keeper','talk-magic':'Carry Firstlight’s signal',magic:'Shape the signal',smith:'A blade made by your hands','talk-combat':'Protect the stores','talk-woods':'Fill the crossing stores','talk-cooking':'Food for a new wayfarer','talk-bank':'Supplies that travel with you','talk-worship':'The First Accord','talk-finish':'Carry the accord to Briarhaven'};
for(const step of tutorialSteps)if(openingTitles[step.event])step.title=openingTitles[step.event];
const chapterEventBefore=tutorialEvent;
tutorialEvent=function(event){const previous=s.tutorial;const result=chapterEventBefore(event);if(s.tutorial>previous){s.firstlightCharter??={};for(const c of FIRSTLIGHT_CHAPTERS)if((s.tutorialCompleted||[]).includes(c.end))s.firstlightCharter[c.id]=true;}return result;};

if(typeof combatStatGroups==='function'){const fieldStatsBefore=combatStatGroups;
combatStatGroups=function(){const groups=fieldStatsBefore(),effects=fieldEquipmentEffects(s);groups.push(['Material traits',[['Worn material weight',effects.weight.toFixed(1)],...effects.sets.map(text=>[text,'Active'])]]);return groups;};}
