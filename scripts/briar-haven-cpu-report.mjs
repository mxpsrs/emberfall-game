// Compare actual sampled CPU work at an identical rendered School pose.
// This is neither physical GPU timing nor the original checkpoint FPS baseline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root='docs/qa/briar-haven';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)).toString():fs.readFileSync(p,'utf8'));
const release=read(root+'/release.json');
const beforeLabel='school-door-final',afterLabel=release.landmarkEvidenceLabel;
const receipt=label=>read(root+'/'+label+(fs.existsSync(root+'/'+label+'/result.json.gz')?'/result.json.gz':'/capture-progress.json.gz'));
const before=receipt(beforeLabel),after=receipt(afterLabel);
assert.equal(after.workerSha256,release.workerSha256);
for(const key of ['resolution','deviceScaleFactor','hour'])assert.deepEqual(after[key],before[key]);
for(const key of ['name','scene','player','view','camera'])assert.deepEqual(after.results[0][key],before.results[0][key]);
function summarize(label){
 const file=label+'/cpu-profile.json.gz',profile=read(root+'/'+file),nodes=new Map(profile.nodes.map(n=>[n.id,n.callFrame.functionName]));
 assert(profile.samples.length>0);assert.equal(profile.samples.length,profile.timeDeltas.length);
 const sums={sampledMs:0,nonIdleMs:0,copyMs:0,moduleDataMs:0,gcMs:0};
 for(let i=0;i<profile.samples.length;i++){
  const name=nodes.get(profile.samples[i]),ms=profile.timeDeltas[i]/1000;sums.sampledMs+=ms;
  if(name!=='(idle)')sums.nonIdleMs+=ms;
  if(name==='copy')sums.copyMs+=ms;if(name==='moduleData')sums.moduleDataMs+=ms;if(name==='(garbage collector)')sums.gcMs+=ms;
 }
 return {file,...Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,Math.round(v*100)/100]))};
}
const old=summarize(beforeLabel),fresh=summarize(afterLabel);
const report={comparison:'Identical actual School camera pose, 1920x1080, DPR 1, hour 11; Chrome V8 sampling over 30 presented frames.',beforeWorkerSha256:before.workerSha256,afterWorkerSha256:after.workerSha256,before:old,after:fresh,nonIdleReductionPercent:Math.round((1-fresh.nonIdleMs/old.nonIdleMs)*10000)/100,limitation:'Software GPU; sampled CPU work relative to the prior door-safe implementation, not hardware FPS certification or the original checkpoint baseline.'};
fs.writeFileSync(root+'/cpu-comparison-clearance-final.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
