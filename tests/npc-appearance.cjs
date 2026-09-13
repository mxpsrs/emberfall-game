const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('dist/npc-dialogue.js','utf8'),ctx);
vm.runInContext(`{
renderUI=renderTutorial=renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;time=20;
creatorPainter=()=>({flush(){}});let rendered=null;humanoid3=(r,x,z,look,gear)=>{rendered={look,gear};};
const people=Object.values(worldScenes).flatMap(scene=>scene.objects).filter(o=>o.tutor||o.appearanceRole||o.civilianModel||o.characterSprite||['man','villager','elder','shop','questgiver','inn'].includes(o.type));
assert(people.length>30);
const combinations=new Set();
for(const o of people){
 const appearance=npcAppearance(o);assert([4,5].includes(appearance.topStyle));assert([3,4].includes(appearance.bottomStyle));combinations.add([appearance.topStyle,appearance.bottomStyle,appearance.topColor,appearance.bottomColor].join('/'));
 assert.deepEqual(npcAppearance({...o,x:o.x+10,y:o.y+10}),appearance,'walking cannot change an outfit');
 rendered=null;creature3({},o,(o.drawX??o.x)+.5,(o.drawY??o.y)+.5);assert(rendered,o.name+' uses the shared human renderer');const world=rendered;
 npcDialogueState={speaker:o};drawNpcPortrait();assert.equal(rendered.look,world.look,o.name+' portrait uses the same face variation');
 for(const key of ['_appearance','_frame','_race','_hoodColor','head','body','weapon','shield','feet'])assert.deepEqual(rendered.gear[key],world.gear[key],o.name+' matches '+key);
 assert(!world.gear._civilian&&!world.gear._cloth,'legacy body replacements and flat clothing overrides are absent');
}
assert(combinations.size>12,'residents have varied creator clothing combinations');
const guide=tutorialTutor('guide'),gear=npcEquipment(guide);assert.equal(gear.head,'rangerHood');assert.equal(gear._hoodColor,5);assert.equal(gear._appearance.topStyle,5);assert.equal(gear._appearance.bottomStyle,4);assert.equal(gear._appearance.topColor,5);assert.equal(gear._appearance.bottomColor,5);
assert.deepEqual(npcEquipment({...guide,name:'Mysterious man'}),npcEquipment({...guide,name:'Elder Rowan'}),'revealing his name does not replace his outfit');
for(const frame of ['male','female']){const normal=avatarMaterial(frame,{head:'rangerHood',_appearance:{...gear._appearance,frame}},0),black=avatarMaterial(frame,{...gear,_appearance:{...gear._appearance,frame}},0);assert.notDeepEqual(normal.c,black.c,'black hood tint has a separate material cache');assert.deepEqual(normal.p,black.p,'dye does not alter body proportions');}
assert(npcEquipment({name:'Town guard',type:'villager'}).weapon,'guards retain their duty equipment');
console.log('PASS: '+people.length+' NPCs share world/portrait identity, creator outfits, stable variation, black hooded Ranger guide and duty equipment.');
}`,ctx);
