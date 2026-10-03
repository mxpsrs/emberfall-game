// Verify the exact built game and its recorded acceptance before publication.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)).toString():fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const directory='docs/qa/briar-haven',release=read(directory+'/release.json');
assert.equal(hash('dist/server/index.js'),release.workerSha256,'publish the tested Worker');
assert(fs.statSync('dist/server/index.js').size<=64*1024*1024,'Worker retains the hosting size limit');
for(const [path,expected] of Object.entries(release.files))assert.equal(hash(path),expected,'tested source '+path);
const rendered=read(directory+'/'+release.evidenceLabel+'/result.json.gz');
assert.equal(rendered.workerSha256,release.workerSha256);
assert.deepEqual(rendered.errors,[]);assert.deepEqual(rendered.editorBindingErrors,[]);
const baseline=read(directory+'/before/result.json.gz');
assert.deepEqual(rendered.resolution,baseline.resolution,'matching capture resolution');
assert.equal(rendered.deviceScaleFactor,baseline.deviceScaleFactor,'matching backing scale');
assert.equal(rendered.hour,baseline.hour,'matching daylight');
const names=['main-street','services-smithy','houses','magic-school','interior','town-edge'];
assert.deepEqual(rendered.results.map(r=>r.name),names);
function verifyView(view,label){
 assert.equal(view.frames.length,120,'settled samples '+view.name);
 assert(fs.statSync(directory+'/'+label+'/'+view.name+'.jpg').size>10000);
 const final=view.frames.at(-1).renderer;
 assert.deepEqual(final.draws.failures,[]);assert.equal(final.draws.loading,0);
 assert.equal(final.draws.pendingVisibleInstances,0);assert.equal(final.draws.construction.queued,0);
 assert.equal(final.frame.deferredResources,0);assert.equal(final.frame.deferredRenderables,0);
 assert.equal(final.models.buildQueue.queued,0);assert.equal(final.residency.overBudget,false);
 const terrain=view.frames.at(-1).terrain;assert(terrain&&Number.isFinite(terrain.ms),'record actual terrain work');
 assert.equal(terrain.pending??0,0,'terrain streaming is settled '+view.name);
 assert.equal(terrain.failures??0,0,'terrain streaming has no failed loads '+view.name);
 assert.equal(terrain.mode,'worker','production terrain uses its background worker '+view.name);
 assert.equal(terrain.bakedSourceMatched,true,'matching authored terrain source '+view.name);
 assert.equal(terrain.baseValid,true,'unchanged startup retains prebuilt terrain '+view.name);
 assert.equal(terrain.snapshotMs,0,'unchanged startup avoids live heightfield resampling '+view.name);
}
for(const view of rendered.results){
 const before=baseline.results.find(v=>v.name===view.name);
 assert(before,'retained baseline route '+view.name);
 assert.equal(view.scene,before.scene,'matching scene '+view.name);
 assert.deepEqual(view.player,before.player,'matching route position '+view.name);
 for(const input of ['yaw','tilt','zoom'])assert.equal(view.view[input],before.view[input],'matching camera input '+view.name+' '+input);
 verifyView(view,release.evidenceLabel);
}
const landmark=read(directory+'/'+release.landmarkEvidenceLabel+'/result.json.gz');
assert.equal(landmark.workerSha256,release.workerSha256);assert.deepEqual(landmark.errors,[]);assert.deepEqual(landmark.editorBindingErrors,[]);
assert.equal(landmark.results.length,1);assert.equal(landmark.results[0].name,'school-facade');
assert(Math.abs(landmark.results[0].camera.yaw-Math.PI)<.001,'inspect the north-facing School entrance');
verifyView(landmark.results[0],release.landmarkEvidenceLabel);
if(landmark.results[0].recovery){const original=landmark.results[0],recaptured=original.recovery.recaptured;assert.equal(recaptured.frames.length,30);for(const key of ['name','scene','player','view'])assert.deepEqual(recaptured[key],original[key]);const f=recaptured.frames.at(-1);assert.equal(f.terrain.pending,0);assert.equal(f.terrain.snapshotMs,0);assert.equal(f.renderer.draws.loading,0);assert.equal(f.renderer.draws.pendingVisibleInstances,0);assert.equal(f.renderer.draws.construction.queued,0);assert.deepEqual(f.renderer.draws.failures,[]);}
const night=read(directory+'/'+release.landmarkEvidenceLabel+'/night.json.gz');
assert.equal(night.workerSha256,release.workerSha256);assert.deepEqual(night.errors,[]);
assert.equal(night.night.hour,21);assert.equal(night.night.frames.length,30);
assert.equal(night.landmark.destination,'realm_briarhaven_3','the facade capture faces the canonical Magic School');
assert(night.surfaceLuminance.night.mean<night.surfaceLuminance.day.mean*.9,'matching actual night surfaces remain darker than daylight');
assert(fs.statSync(directory+'/'+release.landmarkEvidenceLabel+'/night-school.jpg').size>10000);
assert.equal(night.night.frames.at(-1).terrain.pending,0);
assert.deepEqual(night.night.frames.at(-1).renderer.draws.failures,[]);
const smithy=read(directory+'/'+release.landmarkEvidenceLabel+'/smithy.json.gz');
assert.equal(smithy.workerSha256,release.workerSha256);assert.deepEqual(smithy.errors,[]);assert.equal(smithy.hour,11);
verifyView(smithy.smithy,release.landmarkEvidenceLabel);
const gameplay=read(directory+'/gameplay/result.json'),editor=read(directory+'/editor-result.json');
for(const receipt of [gameplay,editor]){assert.equal(receipt.workerSha256,release.workerSha256);assert.deepEqual(receipt.errors,[]);}
for(const flag of ['doorPicked','entered','exited','closedDoorCutaway','restoredRoof'])assert.equal(gameplay[flag],true);
assert.equal(gameplay.traversal.length,12);
assert.equal(new Set(gameplay.traversal.map(b=>b.id)).size,12);
assert(gameplay.traversal.every(b=>b.closed&&b.clear&&b.entered&&b.exited));
for(const flag of ['cameraMovement','gizmoDrag','terrainStroke','reload'])assert.equal(editor[flag],true);
assert.equal(editor.save.verified,true);
console.log('PASS: exact tested Worker, unchanged runtime inputs, six settled Filament views, twelve door traversals and complete editor acceptance.');
