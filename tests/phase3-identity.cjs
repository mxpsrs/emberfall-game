const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderAction=draw=drawPortrait=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
const before=JSON.stringify({main:s.mainStory,mountain:s.mountainQuest});
for(const t of SETTLEMENTS){assert(REGIONAL_ACCOUNTS[t.id]);const w=worldScenes.overworld;assert(w.objects.some(o=>o.talk===regionalAccount(t.id).place+' '+regionalAccount(t.id).belief),t.id+' has an accessible local voice');}
assert.equal(JSON.stringify({main:s.mainStory,mountain:s.mountainQuest}),before,'reading regional accounts must not progress private quests');
assert(!Object.values(worldScenes).some(w=>w.objects.some(o=>o.name==='Lorekeeper Ilyra')),'no duplicate quest-scholar identity');
for(const k of Object.keys(HUNT_ENCOUNTERS)){assert(HUNT_FIELD_NOTES[k]);assert(HUNT_ENCOUNTERS[k].drops);}
s.mountainQuest={version:2,stage:18};const reactions=['rellan','hesta','ilyra','edda'].map(k=>arcWorldReaction({mainStoryKey:k}));assert.equal(new Set(reactions).size,4);
assert.equal(HUNT_ENCOUNTERS.colossus.phases.length,2);assert(HUNT_ENCOUNTERS.colossus.anchored);assert.equal(worldScenes.overworld.objects.filter(o=>o.briarhavenGoblin).length,15);
// Floor coverage must retain openings without giant depth-sorted polygons or
// overlapping room/base surfaces that hide actors in the Canvas renderer.
currentScene='floor-test';const faces=[];civilPaintFloor({face:p=>faces.push(p)},0,0,10,10,'#aaa',18,.04,[{x:2,y:2,w:4,h:4}]);
let area=0;for(const p of faces){const w=p[2][0]-p[0][0],h=p[1][2]-p[0][2];assert(w<=2&&h<=2);area+=w*h;assert(!(p[0][0]<6&&p[2][0]>2&&p[0][2]<6&&p[1][2]>2),'cutout remains open');}assert.equal(area,84);
console.log('PASS: all 13 regional voices wired into residents without quest mutation; unique scholar identity; distinct recurring reactions; all boss field notes; anchored Colossus and inhabited goblin village preserved.');
`,ctx);
const credits=fs.readFileSync('dist/credits.html','utf8');for(const text of ['CC BY','Kevin Iglesias','Kenney','Emmraan','Quaternius'])ctx.assert(credits.includes(text),'credit missing '+text);
