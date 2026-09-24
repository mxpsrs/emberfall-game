'use strict';
// On-device frame measurements. No account data or network requests.
let renderRecording=null,renderReport=null;
function summarizeRenderFrames(samples){
 const frames=samples.map(s=>s.ms).sort((a,b)=>a-b),total=frames.reduce((a,b)=>a+b,0),slow=frames.slice(Math.floor(frames.length*.99));
 return {frames:frames.length,averageFPS:1000*frames.length/total,onePercentLowFPS:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),meanFrameMs:total/frames.length,p99FrameMs:frames[Math.min(frames.length-1,Math.floor(frames.length*.99))],maxFrameMs:frames.at(-1),spikesOver33ms:frames.filter(ms=>ms>33).length};
}
function recordPerformanceFrame(ms){
 if(!renderRecording||document.hidden||!Number.isFinite(ms)||ms<=0)return;
 const elapsed=performance.now()-renderRecording.started;
 // The first interval can include opening Settings before recording began.
 if(renderRecording.skip){renderRecording.skip=false;return;}
 renderRecording.samples.push({ms,zoomOut:Math.round((view3d.max-view3d.zoom)/(view3d.max-view3d.min)*100),moving:!!playerMotion.moving,scene:currentScene,scale:realmResolution.scale});
 if(elapsed<60000&&renderRecording.samples.length<14400)return;
 const samples=renderRecording.samples,gpu=realmGPU?.surface;
 renderReport={...summarizeRenderFrames(samples),durationSeconds:elapsed/1000,viewport:{width:screen.w,height:screen.h},backingPixels:gpu?{width:gpu.width,height:gpu.height}:null,renderer:gpu?(gpu.kind==='filament'?'Filament':'WebGL'):'Canvas fallback',devicePixelRatio:window.devicePixelRatio||1,renderScale:realmResolution.scale,zoomOutRange:[Math.min(...samples.map(s=>s.zoomOut)),Math.max(...samples.map(s=>s.zoomOut))],samples};renderRecording=null;toast('Performance recording ready in Settings.');
}
function showRenderPerformance(){
 if(tab==='settings'&&!$('gameDock').hidden)openGamePanel('settings',true);
 let body='<p>Record 60 seconds while walking, running, turning, opening doors, and testing the full zoom range.</p>';
 if(renderRecording)body+='<p>Recording: '+Math.min(60,Math.floor((performance.now()-renderRecording.started)/1000))+' / 60 seconds. Close this window to keep playing.</p>';
 if(renderReport){const r=renderReport;body+='<dl><dt>Average FPS</dt><dd>'+r.averageFPS.toFixed(1)+'</dd><dt>1% low FPS</dt><dd>'+r.onePercentLowFPS.toFixed(1)+'</dd><dt>Average frame time</dt><dd>'+r.meanFrameMs.toFixed(1)+' ms</dd><dt>99th percentile / worst frame</dt><dd>'+r.p99FrameMs.toFixed(1)+' / '+r.maxFrameMs.toFixed(1)+' ms</dd><dt>Frames over 33 ms</dt><dd>'+r.spikesOver33ms+'</dd><dt>Render scale</dt><dd>'+Math.round(r.renderScale*100)+'%</dd><dt>Zoom out range</dt><dd>'+r.zoomOutRange.join('–')+'%</dd><dt>Resolution</dt><dd>'+(r.backingPixels?r.backingPixels.width+' × '+r.backingPixels.height:'Canvas fallback')+'</dd></dl>';}
 const actions=[];
 if(!renderRecording)actions.push(['Record 60 seconds',()=>{renderRecording={started:performance.now(),samples:[],skip:true};close();toast('Recording performance for 60 seconds. Move and test every zoom level.');}]);
 if(renderReport)actions.push(['Download results',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(renderReport,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='veldren-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}]);
 actions.push(['Close',close]);dialog('Performance',body,actions);
}

document.addEventListener('visibilitychange',()=>{if(!renderRecording)return;if(document.hidden)renderRecording.pausedAt=performance.now();else if(renderRecording.pausedAt!==undefined){renderRecording.started+=performance.now()-renderRecording.pausedAt;delete renderRecording.pausedAt;renderRecording.skip=true;}});
