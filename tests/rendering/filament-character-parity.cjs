'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');
ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/renderer-filament.js','utf8'),ctx,{filename:'renderer-filament.js'});
vm.runInContext(`{
const pack=mesh=>{
 const topology=realmMeshTopology(mesh),raw=realmVertexData(mesh,topology),arrays=realmFilamentArrays(raw);
 for(let vertex=0;vertex<arrays.count;vertex++)for(let channel=0;channel<4;channel++)assert.equal(arrays.colors[vertex*4+channel],raw[vertex*12+6+channel],'Filament changed authored character channel '+channel);
 return arrays.colors;
};
s.character={name:'Filament parity',look:0,frame:'male',skin:0,topStyle:5,bottomStyle:4,topColor:1,bottomColor:6,hair:4,hairColor:3,beard:2};
s.equipment={};
const player=pack(avatarMaterial('male',s.equipment,0));
assert(Math.max(...player)>.5,'authored player surface colours remain visible');
const first=npcAppearance({id:101,name:'Resident one',type:'villager'}),second=npcAppearance({id:202,name:'Resident two',type:'villager'});
const npcA=pack(avatarMaterial(first.frame,{_appearance:first},first.look));
const npcB=pack(avatarMaterial(second.frame,{_appearance:second},second.look));
assert.notDeepEqual(npcA,npcB,'distinct NPC skin, face, hair and clothing definitions remain distinct at the Filament boundary');
for(const sex of ['male','female']){
 const identity={frame:sex,skin:0,eyeColor:0,hairColor:1,hair:3,topStyle:0,bottomStyle:0},source=rebuiltAvatars[sex].mesh;
 const base=avatarMaterial(sex,{_appearance:identity},0),eyes=avatarMaterial(sex,{_appearance:{...identity,eyeColor:1}},0),skin=avatarMaterial(sex,{_appearance:{...identity,skin:5}},0);
 let changedIris=0,unchangedEye=0,changedSkin=0;
 for(let v=0;v<source.p.length/3;v++){
  const original=Array.from(base.c.subarray(v*3,v*3+3));
  if(source.surface[v]===2){assert.deepEqual(Array.from(skin.c.subarray(v*3,v*3+3)),original,'skin choice preserves eyes');if(!source.iris[v]){assert.deepEqual(Array.from(eyes.c.subarray(v*3,v*3+3)),original,'eye choice preserves sclera/pupil');unchangedEye++;}else if(original.some((x,k)=>x!==eyes.c[v*3+k]))changedIris++;}
  else {assert.deepEqual(Array.from(eyes.c.subarray(v*3,v*3+3)),original,'eye choice affects only the authored eyes');if(source.surface[v]===1&&original.some((x,k)=>x!==skin.c[v*3+k]))changedSkin++;}
 }
 assert(changedIris>0&&unchangedEye>0&&changedSkin>0,'authored skin and eye masks are populated');
 for(const hair of [0,1,2,5]){const mesh=avatarMaterial(sex,{_appearance:{...identity,hair}},0),posed=avatarPose(sex,'walk',.4,{_appearance:{...identity,hair}},0);assert(mesh.p.length>base.p.length,'supplied hairstyle is assembled');assert([...posed.p].every(Number.isFinite),'hair follows the shared animated rig');}
 const clothed=outfitClothingMesh(sex,'Peasant','Arms',0,5);for(let v=0;v<clothed.p.length/3;v++)if(clothed.skin[v])assert.deepEqual(Array.from(clothed.c.subarray(v*3,v*3+3)),Array.from(new Float32Array(avatarSkinColor(sex,5))),'exposed clothing skin matches authored body palette');
}
console.log('PASS: selected player and deterministic NPC appearance channels reach Filament unchanged.');
}`,ctx);
