import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const context={console,Float32Array,Uint32Array};vm.createContext(context);
const assets=await createRequire(import.meta.url)('../helpers/native-assets.cjs')(context,process.cwd());
const readModel=id=>JSON.parse(fs.readFileSync('client/'+assets.record(id).derivedPath));
const decode=(stream,Type)=>{const bytes=Buffer.from(stream.data,'base64');return new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
const canonical=JSON.parse(fs.readFileSync('client/assets/canonical/lods.json')).models;
let variants=0;
for(const row of canonical){
 const original=readModel(row.model),before=JSON.stringify(original);
 assert.deepEqual(Array.from(assets.record(row.model).lods,v=>v.asset),row.lods.map(v=>v.asset));
 let triangles=row.triangles[0];
 for(const level of row.lods.slice(1)){
  const model=readModel(level.asset);assert.deepEqual(model.materials,original.materials);assert.deepEqual(model.images,original.images);assert.deepEqual(model.bounds,original.bounds);
  assert.equal(model.sourceHash,original.sourceHash);assert.equal(model.nodes.length,original.nodes.length);
  const plan=assets.renderPlan(model);assert(plan.draws.length>0,'actual native render planner accepts generated PBR geometry');
  let count=0;
  for(const mesh of model.meshes)for(const primitive of mesh.primitives){
   const p=primitive.attributes.POSITION,i=decode(primitive.indices,Uint32Array);assert.equal(i.length%3,0);assert(i.every(n=>n<p.count));count+=i.length/3;
   for(const stream of Object.values(primitive.attributes)){const values=decode(stream,Float32Array);assert.equal(values.length,stream.count*stream.components);assert(values.every(Number.isFinite));}
  }
  assert(count<triangles*.92);triangles=count;variants++;
 }
 assert.equal(JSON.stringify(readModel(row.model)),before,'near geometry is not rewritten by derivation');
}
const unpack=text=>JSON.parse(text.slice(text.indexOf('=')+1).trim().replace(/;$/,''));
const catalog=unpack(fs.readFileSync('client/assets/realms/models.js','utf8'));
const original=unpack(execFileSync('git',['show','8f82a643bd45ff3155158a3884b7d2a246b0ef47:client/assets/realms/models.js'],{maxBuffer:64*1024*1024}).toString());
const scenery=JSON.parse(fs.readFileSync('client/assets/realms/scenery-lods.json')).models;
for(const row of scenery){
 const near=catalog.models[row.model];for(const field of ['p','pScale','n','uv','t','i','c','f'])assert.equal(near[field],original.models[row.model][field],'LOD0 '+row.model+' '+field);
 let count=Buffer.from(near.i,'base64').length/6;
 for(const level of row.lods.slice(1)){
  const far=catalog.models[level.asset.slice(8)],bytes=Buffer.from(far.i,'base64'),indices=new Uint16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),vertices=Buffer.from(far.p,'base64').length/6;
  assert(indices.every(i=>i<vertices));assert(indices.length/3<count*.92);count=indices.length/3;assert(assets.has(level.asset));variants++;
 }
}
console.log(`PASS: ${canonical.length} canonical roofs and ${scenery.length} scenery models, ${variants} generated levels, actual native PBR plans, shared materials/images, finite streams, valid indices and unchanged LOD0`);
assets.destroy();
