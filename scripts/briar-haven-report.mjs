// Summarize the retained production-render samples without treating software
// graphics, incomplete baseline loading or CPU-only checks as hardware results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const dir='docs/qa/briar-haven';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)).toString():fs.readFileSync(p,'utf8'));
const release=read(dir+'/release.json');
const after=read(dir+'/'+release.evidenceLabel+'/result.json.gz'),before=read(dir+'/before/result.json.gz');
assert.equal(after.workerSha256,release.workerSha256);
const percentile=(values,p)=>{
 const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
 return a.length?Math.round(a[Math.ceil(p*a.length)-1]*100)/100:null;
};
const timings=a=>({p50:percentile(a,.5),p95:percentile(a,.95),p99:percentile(a,.99),maximum:percentile(a,1)});
const max=(a,key)=>Math.max(...a.map(key));
const views=after.results.map(v=>{
 assert.equal(v.frames.length,120);
 const f=v.frames,intervals=f.map(x=>x.frameIntervalMs).filter(x=>x>0);
 return {name:v.name,scene:v.scene,player:v.player,view:v.view,camera:v.camera,samples:f.length,settleMs:Math.round(v.settleMs),
  cpuDrawMs:timings(f.map(x=>x.cpuMs)),frameIntervalMs:timings(intervals),
  estimatedSoftwareFps:Math.round(100000/percentile(intervals,.5))/100,
  intervalsOver100ms:intervals.filter(x=>x>100).length,
  synchronizationMs:timings(f.map(x=>x.renderer.frame.synchronizationMs)),
  renderSubmissionMs:timings(f.map(x=>x.renderer.frame.renderMs)),
  submissions:{canonicalRenderableMaximum:max(f,x=>x.renderer.draws.submissions),compatibilityPacketMaximum:max(f,x=>x.renderer.frame.submittedPackets),note:'Renderer submission counters; these are not measured hardware draw calls.'},
  memory:{estimatedGpuBytesMaximum:max(f,x=>x.renderer.residency.gpuBytes),accountedCpuBytesMaximum:max(f,x=>x.renderer.residency.cpuBytes),reportedJsHeapBytesMaximum:max(f,x=>x.heap),overBudget:f.some(x=>x.renderer.residency.overBudget),note:'Resource estimates and browser heap reporting, not physical driver VRAM or a long-duration leak test.'},
  terrain:{workerMs:timings(f.map(x=>x.terrain?.workerMs)),schedulerMs:timings(f.map(x=>x.terrain?.ms)),snapshotMs:timings(f.map(x=>x.terrain?.snapshotMs)),final:f.at(-1).terrain},
  finalQueues:{loading:f.at(-1).renderer.draws.loading,visibleInstances:f.at(-1).renderer.draws.pendingVisibleInstances,construction:f.at(-1).renderer.draws.construction.queued,modelBuild:f.at(-1).renderer.models.buildQueue.queued,compatibilityResources:f.at(-1).renderer.frame.deferredResources,compatibilityRenderables:f.at(-1).renderer.frame.deferredRenderables,terrain:f.at(-1).terrain?.pending??0},
  modelFailures:[...new Set(f.flatMap(x=>x.renderer.draws.failures))]};
});
const result={workerSha256:release.workerSha256,runtimeSourceRemoteCommit:release.runtimeSourceRemoteCommit,
 backend:after.backend,browser:after.browser,resolution:after.resolution,deviceScaleFactor:after.deviceScaleFactor,hour:after.hour,startupMs:Math.round(after.startupMs),views,
 baseline:{sourceCommit:'2ea45c72ed0b545a45329d1a53b6a93a1bd7b3f9',startupMs:Math.round(before.startupMs),settled:false,samples:before.results.map(v=>({name:v.name,frames:v.frames.length})),note:'Matching route, camera inputs, resolution and daylight. Baseline screenshots include incomplete loading/construction and lack frame-interval samples. They cannot establish a settled before/after FPS improvement.'},
 targetVerification:{desktop60Fps:false,iPhone15ProMax30Fps:false,GalaxyS2430Fps:false,hosted39ConcurrentPlayers:false},
 limitations:['SwiftShader is software graphics. Its slow frame times and long startup/settle times are real for this environment; they do not establish physical desktop or phone performance.','The requested FPS targets have not been established. An unplayable software baseline is not accepted as performance success.','The software GPU timer is not used as a hardware GPU benchmark.','Only six settled 120-frame samples and bounded gameplay/editor routes were recorded; sustained traversal and resource behavior on physical devices remain unverified.']};
fs.writeFileSync(dir+'/performance.json',JSON.stringify(result,null,2)+'\n');
console.log('View | CPU p50/p95/p99 ms | frame interval p50/p95/p99 ms | settle ms | estimated GPU MiB');
for(const v of views)console.log(`${v.name} | ${v.cpuDrawMs.p50}/${v.cpuDrawMs.p95}/${v.cpuDrawMs.p99} | ${v.frameIntervalMs.p50}/${v.frameIntervalMs.p95}/${v.frameIntervalMs.p99} | ${v.settleMs} | ${(v.memory.estimatedGpuBytesMaximum/1048576).toFixed(1)}`);
