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
}
for(const view of rendered.results)verifyView(view,release.evidenceLabel);
const landmark=read(directory+'/'+release.landmarkEvidenceLabel+'/result.json.gz');
assert.equal(landmark.workerSha256,release.workerSha256);assert.deepEqual(landmark.errors,[]);assert.deepEqual(landmark.editorBindingErrors,[]);
assert.equal(landmark.results.length,1);assert.equal(landmark.results[0].name,'school-facade');
assert(Math.abs(landmark.results[0].camera.yaw-Math.PI)<.001,'inspect the north-facing School entrance');
verifyView(landmark.results[0],release.landmarkEvidenceLabel);
const gameplay=read(directory+'/gameplay/result.json'),editor=read(directory+'/editor-result.json');
for(const receipt of [gameplay,editor]){assert.equal(receipt.workerSha256,release.workerSha256);assert.deepEqual(receipt.errors,[]);}
for(const flag of ['doorPicked','entered','exited','closedDoorCutaway','restoredRoof'])assert.equal(gameplay[flag],true);
assert.equal(gameplay.traversal.length,12);
assert.equal(new Set(gameplay.traversal.map(b=>b.id)).size,12);
assert(gameplay.traversal.every(b=>b.closed&&b.clear&&b.entered&&b.exited));
for(const flag of ['cameraMovement','gizmoDrag','terrainStroke','reload'])assert.equal(editor[flag],true);
assert.equal(editor.save.verified,true);
console.log('PASS: exact tested Worker, unchanged runtime inputs, six settled Filament views, twelve door traversals and complete editor acceptance.');
