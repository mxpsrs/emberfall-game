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
setCreatorChoice('topStyle',5);creatorStep('topStyle',1);assert.equal(creatorDraft.topStyle,0,'next wraps');creatorStep('topStyle',-1);assert.equal(creatorDraft.topStyle,5,'previous wraps');
$('choice-hairColor-3').onclick();assert.equal(creatorDraft.hairColor,3);assert.equal($('choice-hairColor-3').attributes['aria-pressed'],'true');
setCreatorChoice('bottomStyle',4);assert.equal($('appearance-bottomStyle').textContent,'Ranger trousers');
creatorAngle=0;$('characterPreview').listeners.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(creatorAngle,Math.PI/4);$('characterPreview').listeners.keydown({key:'ArrowLeft',preventDefault(){}});assert.equal(creatorAngle,0);
$('characterPreview').listeners.pointerdown({pointerId:1,button:0,clientX:100,preventDefault(){}});$('characterPreview').listeners.pointermove({pointerId:1,clientX:160});assert.equal(creatorAngle,.84);$('characterPreview').listeners.pointerup({pointerId:1});assert.equal(creatorDrag,null);
$('creatorZoom').onclick();assert.equal(creatorFace,true);$('creatorZoom').onclick();assert.equal(creatorFace,false);
s.character={name:'Original',frame:'male',hair:1,topStyle:2,bottomStyle:1};openCreator(true);assert.equal(creatorDraft.topStyle,2,'old appearance retained');setCreatorChoice('topStyle',5);assert.equal(s.character.topStyle,2,'draft changes do not modify saved character');
assert.equal(ITEMS.rangerHood.slot,'head');assert(ITEMS.rangerHood.openFace);assert(SKILL_SHOP_STOCK.some(row=>row[0]==='rangerHood'),'hood can be obtained');
for(const sex of ['male','female']){
 for(const hair of ['Hair_SimpleParted','Hair_Long','Hair_Buzzed']){const fitted=fittedHairMesh(hair,sex);assert(fitted.bounds[1][1]>rebuiltAvatars[sex].mesh.bounds[1][1]+.007,'hair covers crown '+sex+' '+hair);assert([...fitted.p].every(Number.isFinite));}
 for(const topStyle of [4,5])for(const bottomStyle of [3,4]){
  const identity={frame:sex,hair:4,hairColor:1,skin:2,topStyle,bottomStyle,topColor:2,bottomColor:7},gear={_appearance:identity};
  const plain=avatarMaterial(sex,gear,0),hooded=avatarMaterial(sex,{...gear,head:'rangerHood'},0),hood=wornModularMesh(sex,'rangerHood'),cap=avatarHairCap(sex,1),hair=modularMesh(sex,'Hair.007');
  assert.equal(hooded.i.length,plain.i.length+hood.i.length-cap.i.length-hair.i.length,'hood adds its mesh and hides hair without deleting face');
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
