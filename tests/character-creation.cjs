const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const {ctx,els}=require('../scripts/benchmark-desktop.cjs');
function element(){const e={children:[],attributes:{},dataset:{},style:{setProperty(){}},classList:{add(){}},append(...children){this.children.push(...children)},appendChild(child){this.children.push(child)},replaceChildren(...children){this.children=children},setAttribute(key,value){this.attributes[key]=value},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},setPointerCapture(){},showModal(){this.open=true},close(){this.open=false}};Object.defineProperty(e,'id',{get(){return this._id},set(value){this._id=value;els[value]=this}});return e;}
ctx.document.createElement=element;for(const id of ['appearanceFields','clothingFields','creatorBody'])els[id]=element();
const canvas=createCanvas(480,560);Object.assign(els.characterPreview??=element(),{width:480,height:560,getContext:()=>canvas.getContext('2d')});
vm.runInContext('startRebuiltRealm=()=>{};accountUsername="Learner";stop=()=>{};',ctx);vm.runInContext(fs.readFileSync('dist/character-creation.js','utf8'),ctx);
vm.runInContext(`
const paintCreator=renderLooks;let rendered=0;renderLooks=()=>{rendered++};s=defaults();openCreator(false);
assert.equal(creatorDraft.topStyle,4);assert.equal(creatorDraft.bottomStyle,3);assert.equal(creatorDraft.frame,'male');assert.equal($('choice-frame-0').attributes['aria-pressed'],'true');
assert.equal(Object.values(s.equipment).filter(Boolean).length,0);assert.equal(Object.keys(s.gear).length,0,'clothing does not grant equipment');
$('choice-frame-1').onclick();assert.equal(creatorDraft.frame,'female');assert.equal($('choice-frame-1').attributes['aria-pressed'],'true');
setCreatorChoice('topStyle',2);creatorStep('topStyle',1);assert.equal(creatorDraft.topStyle,6,'next wraps to None');creatorStep('topStyle',-1);assert.equal(creatorDraft.topStyle,5,'previous wraps to Ranger');
setCreatorChoice('hair',4);assert.equal(creatorDraft.hair,5);$('choice-eyeColor-2').onclick();assert.equal(creatorDraft.eyeColor,2);$('choice-hairColor-3').onclick();assert.equal(creatorDraft.hairColor,3);assert.equal($('choice-hairColor-3').attributes['aria-pressed'],'true');
setCreatorChoice('bottomStyle',2);assert.equal($('appearance-bottomStyle').textContent,'Ranger trousers');
creatorAngle=0;$('characterPreview').listeners.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(creatorAngle,Math.PI/4);$('characterPreview').listeners.keydown({key:'ArrowLeft',preventDefault(){}});assert.equal(creatorAngle,0);
$('characterPreview').listeners.pointerdown({pointerId:1,button:0,clientX:100,preventDefault(){}});$('characterPreview').listeners.pointermove({pointerId:1,clientX:160});assert.equal(creatorAngle,.84);$('characterPreview').listeners.pointerup({pointerId:1});assert.equal(creatorDrag,null);
$('creatorZoom').onclick();assert.equal(creatorFace,true);$('creatorZoom').onclick();assert.equal(creatorFace,false);
s.character={name:'Original',frame:'male',hair:1,topStyle:2,bottomStyle:1};openCreator(true);assert.equal(creatorDraft.topStyle,4,'removed legacy top defaults to Peasant');assert.equal(creatorDraft.bottomStyle,3,'removed legacy legs default to Peasant');setCreatorChoice('topStyle',1);assert.equal(s.character.topStyle,2,'draft changes do not modify saved character');
s.character={name:'Ranger',frame:'female',topStyle:5,bottomStyle:4,topColor:2,bottomColor:7};openCreator(true);assert.equal(creatorDraft.topStyle,5);assert.equal(creatorDraft.bottomStyle,4);assert.equal(creatorDraft.topColor,2);assert.equal(creatorDraft.bottomColor,7);assert.equal($('appearance-topStyle').textContent,'Ranger tunic');
for(let i=0;i<100;i++){$('creatorRandom').onclick();assert([6,4,5].includes(creatorDraft.topStyle));assert([5,3,4].includes(creatorDraft.bottomStyle));assert([0,1,2,3,5].includes(creatorDraft.hair));}
assert.equal(ITEMS.rangerHood.slot,'head');assert(ITEMS.rangerHood.openFace);assert(SKILL_SHOP_STOCK.some(row=>row[0]==='rangerHood'),'hood can be obtained');
for(const sex of ['male','female']){
 for(const hair of ['Hair_SimpleParted','Hair_Long','Hair_Buzzed','Hair_BuzzedFemale','Hair_Buns']){const fitted=fittedHairMesh(hair,sex);assert(fitted.bounds[1][1]>rebuiltAvatars[sex].mesh.bounds[1][1]+.007,'hair covers crown '+sex+' '+hair);assert([...fitted.p].every(Number.isFinite));}
 const bare={frame:sex,hair:3,beard:0,skin:2,topStyle:6,bottomStyle:5,topColor:0,bottomColor:0},unclothed=avatarMaterial(sex,{_appearance:bare},0);assert.equal(unclothed.i.length,rebuiltAvatars[sex].mesh.i.length,'None retains authored body and underwear');assert.deepEqual(unclothed.c,avatarMaterial(sex,{_appearance:{...bare,topColor:1,bottomColor:1}},0).c,'unused clothing colors do not tint the bare body');assert.deepEqual(unclothed.p,rebuiltAvatars[sex].mesh.p,'None adds no generated clothing geometry');
 for(const topStyle of [4,5])for(const bottomStyle of [3,4]){
  const identity={frame:sex,hair:4,hairColor:1,skin:2,topStyle,bottomStyle,topColor:2,bottomColor:7},gear={_appearance:identity};
  const plain=avatarMaterial(sex,gear,0),hooded=avatarMaterial(sex,{...gear,head:'rangerHood'},0),hood=wornModularMesh(sex,'rangerHood'),hair=avatarHeadPart(sex,'Hair_SimpleParted',1);
  assert.equal(hooded.i.length,plain.i.length+hood.i.length-hair.i.length,'hood adds its mesh and hides hair without deleting face');
  assert(plain.p.length/3<65536);assert.equal(plain.w.length,plain.p.length/3*4);
  const changed=avatarMaterial(sex,{_appearance:{...identity,topColor:1,bottomColor:0}},0);assert.notDeepEqual(plain.c,changed.c,'outfit colors change');
  for(const clip of ['idle','walk','run']){const pose=avatarPose(sex,clip,.45,gear,0);assert([...pose.p].every(Number.isFinite));}
  s.character=identity;s.equipment={};creatorDraft=null;const player=avatarMaterial(sex,s.equipment,0);assert.deepEqual(player.p,plain.p,'world and other-player outfit geometry agree');
 }
}
creatorDraft={frame:'male',hair:1,hairColor:1,skin:1,topStyle:4,bottomStyle:3,topColor:6,bottomColor:7};paintCreator();
assert($('characterPreview').getContext('2d').getImageData(0,0,480,560).data.some(v=>v>0),'production preview renders actual outfit');
console.log('PASS: appearance controls, draft isolation, old saves, separate obtainable hood, visible face, crown fitting, outfit colors and animated/remote geometry.');
`,ctx);
