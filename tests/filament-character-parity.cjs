'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {ctx}=require('../scripts/benchmark-desktop.cjs');
ctx.assert=assert;
vm.runInContext(fs.readFileSync('dist/renderer-filament.js','utf8'),ctx,{filename:'renderer-filament.js'});
vm.runInContext(`{
const pack=mesh=>{
 const topology=realmMeshTopology(mesh),raw=realmVertexData(mesh,topology),arrays=realmFilamentArrays(raw);
 for(let vertex=0;vertex<arrays.count;vertex++)for(let channel=0;channel<4;channel++)assert.equal(arrays.colors[vertex*4+channel],raw[vertex*12+6+channel],'Filament changed authored character channel '+channel);
 return arrays.colors;
};
s.character={name:'Filament parity',look:0,frame:'male',skin:0,topStyle:5,bottomStyle:4,topColor:1,bottomColor:6,hair:4,hairColor:3,beard:2};
s.equipment={};
const player=pack(avatarMaterial('male',s.equipment,0));
assert(Math.max(...player)>1,'player skin highlight retains its authored range above one');
const first=npcAppearance({id:101,name:'Resident one',type:'villager'}),second=npcAppearance({id:202,name:'Resident two',type:'villager'});
const npcA=pack(avatarMaterial(first.frame,{_appearance:first},first.look));
const npcB=pack(avatarMaterial(second.frame,{_appearance:second},second.look));
assert.notDeepEqual(npcA,npcB,'distinct NPC skin, face, hair and clothing definitions remain distinct at the Filament boundary');
console.log('PASS: selected player and deterministic NPC appearance channels reach Filament unchanged.');
}`,ctx);
