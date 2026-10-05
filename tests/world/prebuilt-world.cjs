'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const fixture=require.resolve('../../scripts/qa/game-fixture.cjs'),source=fs.readFileSync('client/prebuilt-world.js','utf8'),data=fs.readFileSync('client/world-construction.json','utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function make(){delete require.cache[fixture];const {ctx}=require(fixture),run=s=>vm.runInContext(s,ctx);run(source);ctx.construction=JSON.parse(data);return {ctx,run};}
const {ctx,run}=make();assert(run('VeldrenPrebuiltWorld.eligible()'));const start=performance.now();run('VeldrenPrebuiltWorld.decode(construction)');const decodeMs=performance.now()-start;
assert.equal(hash(run('JSON.stringify(VeldrenPrebuiltWorld.encode())')),hash(JSON.stringify(JSON.parse(data))),'construction graph roundtrip');
assert(run('Object.values(worldScenes).every(w=>w.buildings.every(b=>!b.service?.building||b.service.building===b))'),'cyclic building/service identity');
assert(run('worldScenes.tutorial.objects.includes(trainingPenGate)'),'tutorial gate identity');
run('VeldrenPrebuiltWorld.resume();setupLoot();');assert.equal(run('currentScene'),'tutorial');assert.equal(run('s.x'),42);assert.equal(run('s.y'),51);
// A returning character keeps account-owned progress and a valid world position.
const oldState=run('JSON.stringify(s)');run("s.tutorial=38;s.tutorialReward=true;s.sceneId='overworld';s.x=197;s.y=81;s.bag.coins=321;s.bank.logs=17;s.xp.Mining=4321;s.character={name:'Saved character'};");
assert(run('VeldrenPrebuiltWorld.eligible()'));const saved=run('JSON.stringify({bag:s.bag,bank:s.bank,xp:s.xp,character:s.character})');run('VeldrenPrebuiltWorld.resume()');assert.equal(run('currentScene'),'overworld');assert.equal(run('s.x'),197);assert.equal(run('s.y'),81);assert.equal(run('JSON.stringify({bag:s.bag,bank:s.bank,xp:s.xp,character:s.character})'),saved);
run('s.worldScale=2');assert(!run('VeldrenPrebuiltWorld.eligible()'),'old saves use original migration');
// Network failure cannot leave a partially hydrated world.
(async()=>{const f=make();f.ctx.fetch=async()=>{throw Error('offline')};f.ctx.realmAssetURL=p=>p;assert.equal(await f.ctx.VeldrenPrebuiltWorld.load(),false);assert.equal(f.run('Object.keys(worldScenes).length'),0);
 const malformed=JSON.parse(data);malformed.nodes[0][1].push(['bad',[malformed.nodes.length+1]]);f.ctx.bad=malformed;assert.throws(()=>f.run('VeldrenPrebuiltWorld.decode(bad)'),/Invalid world reference/);assert.equal(f.run('Object.keys(worldScenes).length'),0);
 console.log(JSON.stringify({pass:true,scenes:run('Object.keys(worldScenes).length'),objects:run('Object.values(worldScenes).reduce((n,w)=>n+w.objects.length,0)'),decodeMs,checks:['graph and cyclic-reference parity','fresh tutorial entry','saved progress and position','legacy save fallback','network fallback','invalid asset rejection']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
