const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const house={walkIn:true,x:10,y:10,w:10,h:10};
const objects=[{type:'prop',name:'Street lantern',streetLantern:true,x:23,y:15},{type:'range',x:12,y:12},{type:'furnace',x:14,y:14},{type:'camp',x:16,y:16},{type:'camp',x:30,y:30}];
const ctx={assert,console,s:{worldClock:120},time:0,px:15,py:15,currentScene:'overworld',worldScenes:{overworld:{objects,buildings:[house],decor:[{kind:'hearth',x:18,z:18}]}},setupTutorialVillage(){},prop3(){},landHeight:()=>0,worldObjectsInBounds:()=>objects,inWorld:()=>true,cavePassageKind:()=>null,CREATURE_LAIRS:{}};vm.createContext(ctx);const source=fs.readFileSync('dist/world.js','utf8');vm.runInContext(source.slice(source.indexOf('function worldCycleSeconds('),source.indexOf('function livingWorld(')),ctx);vm.runInContext(fs.readFileSync('dist/world-lighting.js','utf8'),ctx);
vm.runInContext(`
for(const clock of [120,380]){Date.now=()=>clock*1000;const sources=worldLightSources();assert(sources.every(o=>!(o.x>10&&o.x<20&&o.z>10&&o.z<20)),'no interior fixture leaks an exterior point source');assert(sources.some(o=>o.x===30.5),'real outdoor fire still emits');assert.equal(sources.some(o=>o.x===23.5),clock===380,'street lighting only at night');const room=realmLightingState();assert.equal(room.rooms.length,1);assert.equal(room.roomCeilings[0],2.5);}
console.log('PASS: indoor lamps, ranges, furnaces and hearths produce no outside light; outdoor lanterns switch off in daylight; room lighting stops below roofs.');
`,ctx);
