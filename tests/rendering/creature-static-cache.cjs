'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('client/view3d.js','utf8');
const helperStart=source.indexOf('let meshDetail3=1;');
const helperEnd=source.indexOf('function painter3',helperStart);
const creatureStart=source.indexOf('function creature3',helperEnd);
const creatureEnd=source.indexOf('function prop3',creatureStart);
assert(helperStart>=0&&helperEnd>helperStart&&creatureStart>helperEnd&&creatureEnd>creatureStart,
 'static mesh and creature rendering helpers are present');
let now=0,builds=0,submissions=0;
const context={Map,WeakMap,performance:{now:()=>now},time:1,target:null,px:0,py:0,
 npcLook:o=>o.look||0,npcEquipment:o=>({...o.gear}),
 humanoid3(renderer){builds++;renderer.face([[0,0,0],[1,0,0],[0,1,0]],'#ffffff');}};
vm.createContext(context);
vm.runInContext(source.slice(helperStart,helperEnd),context);
vm.runInContext(source.slice(creatureStart,creatureEnd),context);
const renderer={face(){submissions++;}};
const actor={id:7,kind:'guard',type:'villager',x:0,y:0,drawX:0,drawY:0,look:1,attackAt:-9,gear:{body:'leatherArmor'}};
assert.equal(context.creature3(renderer,actor,0,0),2);
assert.equal(builds,1,'first stationary pose builds its geometry');
assert.equal(submissions,1);
context.creature3(renderer,actor,0,0);
assert.equal(builds,1,'a repeated stationary pose reuses cached geometry');
assert.equal(submissions,2,'cached geometry still submits its faces each frame');

actor.x=actor.drawX=.4;
context.creature3(renderer,actor,.4,0);
assert.equal(builds,2,'moving characters retain the live animation path');
actor.x=actor.drawX=1.5;actor.y=actor.drawY=0;
context.creature3(renderer,actor,1.5,0);
assert.equal(builds,3,'a moved stationary character builds a position-specific pose');
actor.gear.body='iron_body';
context.creature3(renderer,actor,1.5,0);
assert.equal(builds,4,'appearance changes invalidate the stationary pose cache');
actor.gear.body='iron_body';actor.attackAt=1;
context.time=1.1;
context.creature3(renderer,actor,1.5,0);
assert.equal(builds,5,'attacking characters retain the live animation path');

now=25;vm.runInContext('staticMeshDeadline3=20',context);
actor.attackAt=-9;context.time=1.2;
actor.x=actor.drawX=2.5;
assert.equal(context.creature3(renderer,actor,2.5,0),null,'over-budget first-time poses defer');
assert.equal(builds,5,'deferred poses do not allocate geometry');
now=30;
vm.runInContext('staticMeshDeadline3=40',context);
assert.equal(context.creature3(renderer,actor,2.5,0),2,'deferred stationary poses stream on a later frame');
assert.equal(builds,6);
console.log('PASS: stationary creature poses reuse geometry; movement, appearance, attacks, and frame-budget deferral behave correctly.');
