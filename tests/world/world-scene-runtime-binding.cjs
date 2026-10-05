const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../client/',noop=()=>{};
function element(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={console,assert,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};
vm.createContext(ctx);
for(const file of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+file+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:file});
vm.runInContext(`renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupLoot();activateScene('overworld',75,62);`,ctx);
vm.runInContext(fs.readFileSync(root+'world-scene-format.js','utf8'),ctx,{filename:'world-scene-format.js'});
const result=vm.runInContext(`(()=>{
 const graph=VeldrenSceneFormat.fromLegacy({version:1,revision:0,changes:[]});
 const expected=Object.values(worldScenes).reduce((sum,scene)=>sum+(scene.objects?.filter(item=>!item._editorPreview).length||0)+(scene.buildings?.length||0),0);
 const linked=VeldrenSceneFormat.attachRuntimeWorld(graph,worldScenes);
 assert.equal(linked.entities,expected,'every generated world object and building receives a canonical runtime entity');
 assert(linked.scenes>0&&graph.scenes.reduce((sum,scene)=>sum+scene.entities.length,0)===expected);
 const first=worldScenes.overworld.objects.find(item=>item._sceneEntityId);assert(first);
 const stableId=first._sceneEntityId;assert(graph.scenes.find(scene=>scene.scene==='overworld').entities.find(entity=>entity.id===stableId).components.RuntimeBinding);
 const again=VeldrenSceneFormat.attachRuntimeWorld(graph,worldScenes);assert.equal(again.entities,expected);assert.equal(graph.scenes.reduce((sum,scene)=>sum+scene.entities.length,0),expected,'rebind is idempotent');
 const persisted=VeldrenSceneFormat.withoutRuntimeBindings(graph);assert.equal(persisted.scenes.reduce((sum,scene)=>sum+scene.entities.length,0),0,'generated runtime entities are excluded from authored persistence');
 return {entities:expected,scenes:linked.scenes};
})()`,ctx);
console.log(`PASS: ${result.entities} generated world objects/buildings bind to canonical runtime scene entities across ${result.scenes} scenes; IDs are stable, rebinding is idempotent, and generated entities remain transient.`);
