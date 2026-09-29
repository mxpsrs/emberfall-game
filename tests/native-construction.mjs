import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const bytes=fs.readFileSync(new URL('../dist/native/veldren-core.wasm',import.meta.url));
const code=fs.readFileSync(new URL('../dist/native-runtime.js',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
const node=(id,parent=null)=>({id,name:id,parent,active:true,transform:I(),components:{},metadata:{}});
const world={format:'veldren.world',version:2,revision:8,updatedAt:null,terrain:{patches:[]},scenes:[{format:'veldren.scene',version:2,scene:'overworld',entities:[node('root'),node('a','root'),node('b','root'),node('leaf','a')]}]};
async function boot(){
 const counts={load:0};const context={DataView,TextEncoder,TextDecoder,realmAssetURL:p=>p,addEventListener(){},fetch:async()=>({ok:true,arrayBuffer:async()=>bytes}),WebAssembly:{async instantiate(...args){const result=await WebAssembly.instantiate(...args),api={...result.instance.exports},load=api.veldren_world_document_load;api.veldren_world_document_load=(...args)=>{counts.load++;return load(...args);};return {instance:{exports:api}};}}};context.window=context;vm.createContext(context);vm.runInContext(code,context);return {native:await context.realmNativeReady,counts};
}
const fast=await boot(),reference=await boot(),n=fast.native.scenes,r=reference.native.scenes;
assert(n.load(world));assert(r.load(world));let notifications=0;n.subscribe(()=>notifications++);
await n.construct(async()=>{
 const originalLoads=fast.counts.load;let doc=n.serialize(),scene=doc.scenes[0];
 // New parents precede children at import time even when source order differs.
 scene.entities.push(node('child','new-parent'),node('new-parent','root'));
 scene.entities.find(e=>e.id==='leaf').parent='b';scene.entities.find(e=>e.id==='a').metadata.note='authored';
 assert(r.load(doc));assert(n.load(doc));assert.equal(fast.counts.load,originalLoads,'ordinary category import avoids a full world reload');
 assert.deepEqual(plain(n.serialize()),plain(r.serialize()));assert.equal(notifications,0);
 // Retain and move a child before deleting its old parent.
 doc=n.serialize();scene=doc.scenes[0];scene.entities.find(e=>e.id==='leaf').parent='new-parent';scene.entities=scene.entities.filter(e=>e.id!=='b');
 assert(r.load(doc));assert(n.load(doc));assert.deepEqual(plain(n.serialize()),plain(r.serialize()));assert(n.entity('overworld','leaf'));
 // Rejected entity after an earlier successful upsert must roll back atomically.
 const before=plain(n.serialize());doc=n.serialize();scene=doc.scenes[0];scene.entities.find(e=>e.id==='a').name='must roll back';scene.entities.find(e=>e.id==='child').transform.scale=[0,1,1];
 assert.equal(n.load(doc),false);assert.deepEqual(plain(n.serialize()),before);
 // Authored sibling reordering and world metadata use the full atomic path.
 doc=n.serialize();doc.scenes[0].entities.reverse();doc.revision=19;doc.terrain.patches.push({id:'terrain',height:2});
 assert(r.load(doc));assert(n.load(doc));assert.deepEqual(plain(n.serialize()),plain(r.serialize()));
 // Native writes between serialization and import must not use stale diffs.
 doc=n.serialize();assert(n.upsert('overworld',node('out-of-band')));assert(n.load(doc));assert.deepEqual(plain(n.serialize()),plain(r.serialize()));
 // New scenes, next-entity counters and empty scenes round-trip identically.
 doc=n.serialize();doc.scenes.push({format:'veldren.scene',version:2,scene:'cellar',entities:[node('entity-8')]});
 assert(r.load(doc));assert(n.load(doc));assert.deepEqual(plain(n.serialize()),plain(r.serialize()));
 assert.deepEqual(Array.from(n.names()),['cellar','overworld']);
 assert(n.upsert('new-scene',node('new-root')));assert(r.upsert('new-scene',node('new-root')));assert.deepEqual(plain(n.serialize()),plain(r.serialize()),'interleaved native writes register new scenes');
 doc=n.serialize();doc.scenes.push({format:'veldren.scene',version:2,scene:'empty',entities:[]});
 assert(r.load(doc));assert(n.load(doc));assert.deepEqual(plain(n.serialize()),plain(r.serialize()));
});
assert.equal(notifications,1,'derived views rebuild once at the construction boundary');
const loads=fast.counts.load;assert(n.load(world));assert.equal(fast.counts.load,loads+1,'ordinary save/editor load retains native full-load semantics');
await assert.rejects(n.construct(async()=>{throw Error('stop');}),/stop/);assert(n.load(world));
fast.native.destroy();reference.native.destroy();
console.log('PASS: incremental native construction matches full imports, preserves hierarchy/order/metadata, rolls back invalid imports and releases scope.');
