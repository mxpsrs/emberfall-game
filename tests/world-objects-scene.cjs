'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const wasm=fs.readFileSync('dist/native/veldren-core.wasm');
async function main(){for(const editor of [false,true]){
 const ctx={console,VELDREN_CONTEXT:editor?'editor':'runtime',WebAssembly,DataView,TextEncoder,TextDecoder,realmAssetURL:p=>p,addEventListener(){},fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)})};ctx.window=ctx;vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx),load=f=>run(fs.readFileSync('dist/'+f+'.js','utf8'));
 const declaration=fs.readFileSync('dist/game.js','utf8').split('\n').find(l=>l.startsWith('let objects ='));
 run(declaration+`;let currentScene='one',worldObjectRevision=0,worldObjectIndex=null,worldObjectArrayObserved=false;const worldScenes={one:{objects:[{id:1,type:'prop',name:'Rock',x:1,y:1},{id:2,type:'villager',name:'Guide',x:2,y:2,characterSprite:true}],buildings:[]},two:{objects:[],buildings:[]}};objects.push(...worldScenes.one.objects);`);
 for(const f of ['native-runtime','building-assembly','world-scene-format','world-ownership-runtime','world-building-scene','world-light-scene','world-spawn-scene','world-objects-scene'])load(f);await ctx.realmNativeReady;
 await ctx.VeldrenSceneOwnership.migrateStaticProps();await ctx.VeldrenSpawnScene.migrate();const api=ctx.VeldrenWorldObjects,n=ctx.realmNative.scenes;run('function landHeight(){return 0;}function prop3(r,o,x,z){r.indexed(null,VeldrenAssembly.transform(x,0,z,o.heading||0,o.editorTransform?.scale||1));return 2;}');api.install();assert.equal([...api.timerScenes()].reduce((total,[name,scene])=>total+scene.objects.length,0),1,'Only the actor needs timers; static props are excluded');
 const actor=run('worldScenes.one.objects.find(o=>o.id===2)'),rock=run('worldScenes.one.objects.find(o=>o.type===\'prop\')');ctx.actor=actor;
 for(const source of ['objects.push({})','objects[0]={}','objects.length=0','delete objects[0]','Object.defineProperty(objects,0,{value:{}})','Array.prototype.splice.call(objects,0,1)','objects.splice(0,objects.length)','worldScenes.one.objects=[]','worldScenes.one.objects.push({})','worldScenes.one.objects[0]={}'])assert.throws(()=>run(`'use strict';${source}`),source);
 assert(Object.isFrozen(run('worldScenes.one.objects')));const saved=JSON.stringify(n.serialize());
 run(`const fire={id:'fire:1',type:'camp',x:3,y:3,expiresAt:Date.now()+10000};VeldrenWorldObjects.addSession('one',fire,'fire');`);assert.equal(run('objects.length'),3);assert.throws(()=>api.addSession('one',actor,'fire'));
 api.moveActor(actor,'two');assert.equal(run('objects.length'),2);assert(run('worldScenes.two.objects.includes(actor)'));assert.equal(JSON.stringify(n.serialize()),saved,'session placement is not a permanent spawn edit');
 assert(n.setTransform('one',rock._sceneEntityId,{position:[8,0,9],rotation:[0,0,0,1],scale:[1,1,1]}));assert.equal(run('objects[0].x'),8);assert(run('objects.includes(fire)'));
 run(`currentScene='two';VeldrenWorldObjects.select(worldScenes.two.objects)`);assert.equal(run('objects[0]'),actor);
 // Native edits republish category membership without losing an escort or fire.
 n.upsert('one',{id:'extra',name:'New stone',parent:null,active:true,transform:{position:[4,0,4],rotation:[0,0,0,1],scale:[1,1,1]},components:{GeneratedProp:{generationKey:'extra'},MeshRenderer:{asset:'procedural:prop/12'}},metadata:{}});
 assert(run('worldScenes.two.objects.includes(actor)'));assert(run('worldScenes.one.objects.includes(fire)'));assert.equal(run('objects.length'),1);
 api.moveActor(actor,'one');assert.equal(run('objects.length'),0);run(`currentScene='one';VeldrenWorldObjects.activate()`);assert.equal(run('objects.length'),4);
 api.removeSession(run('fire'));assert.equal(run('objects.length'),3);
 if(editor){run(`const preview={id:'preview',type:'prop',_editorPreview:true};VeldrenWorldObjects.addSession('one',preview,'preview')`);assert.equal(run('objects.length'),4);api.removeSession(run('preview'));}
 run(`const authored=VeldrenSceneOwnership.createProp('one',{id:'authored',type:'prop',name:'Authored lamp',x:4,y:5,editorAsset:{source:'briar',key:'Lamp'},editorTransform:{rotation:30,scale:2},walkThrough:true})`);
 n.upsert('one',{id:'direct-mesh',name:'Direct mesh',parent:null,active:true,transform:{position:[3,0,4],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'briar:Lamp'}},metadata:{}});
 const direct=run('objects.find(o=>o._sceneEntityId===\'direct-mesh\')');assert(direct?._generatedSceneEntity);assert.equal(direct.editorAsset.key,'Lamp');direct.x=6;assert.equal(n.entity('one','direct-mesh').worldMatrix[12],6);n.remove('one','direct-mesh');
 let mesh;ctx.painter={indexed(_m,m){mesh=Array.from(m)}};run('prop3(painter,authored,authored.x+.5,authored.y+.5)');assert(Math.abs(mesh[0]-2*Math.cos(Math.PI/6))<1e-8);assert(Math.abs(mesh[2]-1)<1e-8);assert.equal(mesh[3],4.5);assert.equal(mesh[11],5.5);
 assert(n.entity('one','authored'));assert(run('objects.includes(authored)'));assert(n.remove('one','authored'));assert(!run('objects.some(o=>o._sceneEntityId===\'authored\')'));
 api.moveActor(actor,'two');assert(n.remove('one',actor._sceneEntityId));assert.equal(run('worldScenes.two.objects.length'),0,'deletion removes travelling actors');
 assert(n.load(JSON.parse(saved)));assert.equal(run('objects.length'),2);assert.equal(run('worldScenes.two.objects.length'),0);assert.equal(JSON.stringify(n.serialize()),saved);
 }console.log('PASS: controlled native and active membership; session fires, previews and cross-scene escorts; authored create/delete; independent save and reload.');}
main().catch(e=>{console.error(e);process.exitCode=1});
