const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
drawMinimap=drawMapServices=draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;s.character={name:'Rendered click review'};s.tutorial=38;s.tutorialReward=true;s.mainStoryQuest={stage:25};s.mountainQuest={stage:20,lairKey:true};screen={w:800,h:390};
let uploaded;realmGPU={skinning:false,skinnedMeshes:new WeakMap(),cache:new WeakMap(),sharedMeshes:new WeakMap(),terrain:new Map(),gl:{deleteBuffer(){},createBuffer:()=>({}),bindBuffer(t,b){uploaded=b},bufferData(t,d){}},upload:d=>({buffer:{},count:d.length/12}),render(){}};
$('modal').open=$('creator').open=$('spiritsDialog').open=false;view3d.zoom=32;
let clicks=0;
for(const id of Object.keys(worldScenes).filter(cavePassageKind))for(const inside of [false,true]){
 const door=worldScenes.overworld.objects.find(o=>o.destination===id),exit=worldScenes[id].exit,o=inside?exit:door;
 activateScene(inside?id:'overworld',o.x,o.y+(inside?-4:5));view3d.yaw=inside?Math.PI:0;draw3d();
 const hit=hitboxes.find(h=>h.o===o);assert(hit,'production frame installs passage target');
 let q;
 if(o.passageKind==='cave'){assert(hit.polygon,'mouth polygon');q=hit.polygon.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});}
 else {assert(hit.geometry,'ladder geometry');const p=project3(o.x+.5,inside?1.3:.1,o.y+.5);q={x:p.x,y:p.y};assert(!buildings.some(b=>b.service===o),'no house door shell over ladder');}
 assert.equal(worldHits3(q.x,q.y)[0]?.o,o,'visible passage is foremost target');clickWorld3({clientX:q.x,clientY:q.y});assert.equal(target,o,'click targets the opening');assert(path.length>0,'click automatically routes to threshold');assert(worldClickFeedback.interaction,'interaction red X');
 // Follow the actual route and arrival action, without clicking any floor tile.
 const end=path.at(-1);s.x=px=end[0];s.y=py=end[1];path=[];arrive();assert.equal(currentScene,inside?'overworld':id,'arrival crosses paired entrance automatically');clicks++;
}
console.log('PASS: '+clicks+' actual rendered cave/ladder clicks select, route and cross both directions without a ground click.');
`,ctx);
