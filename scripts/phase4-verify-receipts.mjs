// Validate captured Phase 4 runs without turning software-GPU timings into FPS
// certification. A load may start between samples; the final sample must settle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const paths=process.argv.slice(2);
assert(paths.length,'Pass one or more Phase 4 browser receipt paths');
const reports=[];
for(const path of paths){
 const run=JSON.parse(readFileSync(path,'utf8'));
 assert.match(run.sourceCommit,/^[a-f0-9]{40}$/);
 assert.deepEqual(run.errors,[],path+': page errors');
 assert(run.results.length>0,path+': no measured views');
 const mobile=run.environment.mobile,concurrency=mobile?2:4,mb=1024*1024;
 const gpuBudget=(mobile?128:256)*mb,cpuBudget=(mobile?64:128)*mb;
 let frames=0,pendingFrames=0,peakGpu=0,peakCpu=0;
 const routes=new Map();
 for(const view of run.results){
  assert(view.frames.length>=3,view.name+': insufficient samples');
  for(const frame of view.frames){
   const r=frame.renderer,s=r.streaming,b=r.residency;
   assert(frame.presented,view.name+': frame did not present');
   for(const key of ['gpuBytes','cpuBytes'])assert(Number.isFinite(b[key])&&b[key]>=0,view.name+': unavailable allocation measurement');
   for(const key of ['loading','queued','failed'])assert(Number.isInteger(s[key])&&s[key]>=0,view.name+': unavailable load counter');
   assert.equal(s.concurrency,concurrency,view.name+': wrong load profile');
   assert.equal(s.failed,0,view.name+': failed load');
   assert(s.loading<=concurrency,view.name+': concurrency exceeded');
   assert.deepEqual(r.draws.failures,[],view.name+': failed draw resource');
   assert.equal(b.gpuBudget,gpuBudget,view.name+': wrong GPU profile');
   assert.equal(b.cpuBudget,cpuBudget,view.name+': wrong staging profile');
   assert(!b.overBudget,view.name+': reported allocation overage');
   assert(b.gpuBytes<=gpuBudget&&b.cpuBytes<=cpuBudget,view.name+': allocation overage');
   frames++;pendingFrames+=Number(s.loading>0||s.queued>0);
   peakGpu=Math.max(peakGpu,b.gpuBytes);peakCpu=Math.max(peakCpu,b.cpuBytes);
  }
  const last=view.frames.at(-1).renderer;
  assert.equal(last.streaming.loading+last.streaming.queued,0,view.name+': final sample not settled');
  const name=view.name.replace(/-return-\d+$/,''),lap=Number(view.name.match(/-return-(\d+)$/)?.[1]||0);
  if(!routes.has(name))routes.set(name,[]);
  routes.get(name).push({lap,gpuBytes:last.residency.gpuBytes,cpuBytes:last.residency.cpuBytes,
   geometryResources:last.legacy.meshes,streamResources:last.streaming.tracked,
   streamCells:last.streaming.cells.length,evictions:last.residency.evictions});
 }
 for(const samples of routes.values())for(let i=0;i<samples.length;i++)assert.equal(samples[i].lap,i,'Missing or repeated route pass');
 reports.push({path,sourceCommit:run.sourceCommit,label:run.label,mobile,
  views:run.results.length,frames,pendingFrames,failedLoads:0,pageErrors:0,
  sampledBudgetOverruns:0,peakGpuBytes:peakGpu,peakCpuBytes:peakCpu,
  routes:Object.fromEntries(routes)});
}
console.log(JSON.stringify({reports,limits:[
 'Known GPU/staging allocation estimates only; not complete heap or driver VRAM.',
 'Recorded route passes and samples are not continuous hardware FPS certification.',
 'In-flight loads are allowed within profile limits; every final view sample settled.'
]},null,2));
