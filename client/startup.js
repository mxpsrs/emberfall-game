'use strict';
// Runs before the game scripts so a failed download cannot leave a silent screen.
const REALM_LOADING_STALL_MS=120000;
const REALM_DIAGNOSTIC_STAGES={scripts:'SCR','script-download':'SDL','script-runtime':'SRT',auth:'AUT','native-init':'NAT','filament-init':'FIL',character:'SAV',assets:'AST','scene-ownership':'SCN','world-setup':'WRL','world-generation':'WGN','tutorial-generation':'TUT','editor-world':'EDT','hud-init':'HUD','first-draw':'DRW',timeout:'TMO'};
window.realmStartup={failed:false,finished:false,paused:false,stage:'Loading the game…',stageCode:'scripts',loaded:0,timer:null,timerGeneration:0,reportedFailure:false};
function realmSetStartupStage(stage){const state=window.realmStartup;if(!state.failed&&!state.finished&&stage)state.stageCode=stage;}
async function realmStartupStep(message,progress,stage,task){
 realmLoadStatus(message,progress,stage);
 // Promise-only migration chains never yield a browser paint or input turn.
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 if(window.realmStartup.failed)throw Error('Startup was interrupted');
 return realmStartupTask(stage,task);
}
function realmStartupTask(stage,task){return Promise.resolve().then(task).catch(error=>{realmSetStartupStage(stage);if(error&&typeof error==='object'){try{if(!error.realmStartupStage)error.realmStartupStage=stage;}catch{}throw error;}const wrapped=new Error(typeof error==='string'?error:'Startup task failed');wrapped.realmStartupStage=stage;throw wrapped;});}
function realmDiagnosticCode(stage=window.realmStartup?.stageCode){return 'VLD-'+(REALM_DIAGNOSTIC_STAGES[stage]||'UNK');}
function realmDiagnosticText(value,limit){return String(value??'').replace(/([?&](?:password|token|session|key)=)[^&#\s]*/gi,'$1[redacted]').replace(/("(?:password|state)"\s*:\s*")[^"]*/gi,'$1[redacted]').slice(0,limit);}
function realmReportStartupFailure(error,code){
 const state=window.realmStartup;if(state.reportedFailure)return;state.reportedFailure=true;
 realmSendFailureReport(error,code,state.stageCode||'unknown');
}
function realmSendFailureReport(error,code,stage){
 const object=error&&typeof error==='object'?error:null,payload={release:realmDiagnosticText(window.REALM_RELEASE||'unknown',64),stage:realmDiagnosticText(stage,32),code,error:{name:realmDiagnosticText(object?.name||'Error',80),message:realmDiagnosticText(object?.message??error??'Unknown game failure',500),stack:realmDiagnosticText(object?.stack||'',2400)},userAgent:realmDiagnosticText(typeof navigator!=='undefined'?navigator.userAgent:'',400),viewport:{width:Math.max(0,Math.round(Number(window.innerWidth)||0)),height:Math.max(0,Math.round(Number(window.innerHeight)||0)),dpr:Math.max(0,Math.min(8,Number(window.devicePixelRatio)||1))}};
 const body=JSON.stringify(payload);
 try{if(navigator.sendBeacon&&typeof Blob!=='undefined'&&navigator.sendBeacon('/api/client-error',new Blob([body],{type:'application/json'})))return;}catch{}
 try{if(typeof fetch==='function')fetch('/api/client-error',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body}).catch(()=>{});}catch{}
}
let realmRuntimeReportWindow=0,realmRuntimeReportCount=0;
function realmReportRuntimeFailure(error,stage='runtime'){
 const now=Date.now();if(now-realmRuntimeReportWindow>=60000){realmRuntimeReportWindow=now;realmRuntimeReportCount=0;}
 if(realmRuntimeReportCount>=2)return;realmRuntimeReportCount++;
 console.error('Veldren runtime failure ('+stage+'):',error);
 realmSendFailureReport(error,'VLD-FRM',stage);
}
function realmRefreshLoadingTimeout(){
 const state=window.realmStartup;if(state.failed||state.finished||state.paused)return;
 clearTimeout(state.timer);const generation=++state.timerGeneration;
 state.timer=setTimeout(()=>{if(!state.paused&&generation===state.timerGeneration)realmLoadFailure('Loading stopped responding. Please retry; your saved character will be kept.',new Error('Startup stalled'),'timeout');},REALM_LOADING_STALL_MS);
}
function realmStartLoadingTimeout(){
 const state=window.realmStartup;if(state.failed||state.finished)return;
 state.paused=false;realmRefreshLoadingTimeout();
}
function realmPauseLoadingTimeout(){
 const state=window.realmStartup;if(state.failed||state.finished)return;
 state.paused=true;state.timerGeneration++;clearTimeout(state.timer);state.timer=null;
}
function realmLoadStatus(message,progress,stage){
 const state=window.realmStartup,previous=state.progress||0;if(state.failed||state.finished||progress<previous)return;
 const changed=progress>previous||message!==state.stage;
 state.stage=message;state.progress=progress;if(stage)state.stageCode=stage;
 if(changed)realmRefreshLoadingTimeout();
 realmRenderStartupUI();
}
function realmLoadFailure(message,error,stage){
 const state=window.realmStartup;if(state.finished||state.failed)return;if(stage)state.stageCode=stage;else if(error?.realmStartupStage)state.stageCode=error.realmStartupStage;state.failed=true;state.timerGeneration++;clearTimeout(state.timer);
 const code=realmDiagnosticCode(state.stageCode);realmReportStartupFailure(error,code);
 if(error)console.error('Realm startup failed:',error);
 state.failure={message,code};realmRenderStartupUI();
}
function realmRenderStartupUI(){
 const state=window.realmStartup,box=document.getElementById('loading');if(!box)return;
 if(state.finished){box.hidden=true;return;}
 if(!state.failed){
  const title=document.getElementById('loadingStatus');if(title)title.textContent=state.stage;
  const bar=document.getElementById('loadingProgress');if(bar){bar.value=state.progress||0;bar.setAttribute('aria-valuetext',state.stage);}
  return;
 }
 if(state.failureRendered)return;state.failureRendered=true;
 const {message,code}=state.failure;box.hidden=false;box.classList.add('loading-failed');
 const status=document.getElementById('loadingStatus');if(status)status.remove();
 const progress=document.getElementById('loadingProgress');if(progress)progress.remove();
 const title=document.createElement('strong');title.textContent='The realm could not start';box.appendChild(title);
 const detail=document.createElement('p');detail.textContent=message+' Diagnostic '+code+'.';box.appendChild(detail);
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>location.reload();box.appendChild(retry);
 const cloud=document.getElementById('cloudStatus');if(cloud)cloud.textContent='Character paused';
 const online=document.getElementById('onlineStatus');if(online)online.textContent='Not connected';
}
function realmLoadComplete(){const state=window.realmStartup;if(state.failed)return;state.finished=true;state.timerGeneration++;clearTimeout(state.timer);realmRenderStartupUI();}
function realmAssetURL(path){return window.REALM_ASSET_VERSIONS?.[path]||path;}
function realmLoadImage(path){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image unavailable: '+path));img.src=realmAssetURL(path);});}
realmStartLoadingTimeout();
// Head scripts can finish or fail before the loading elements are parsed.
// Replay their retained state instead of leaving the HTML placeholder visible.
document.addEventListener('DOMContentLoaded',realmRenderStartupUI,{once:true});
document.addEventListener('load',e=>{if(e.target?.tagName==='SCRIPT'){window.realmStartup.loaded++;realmLoadStatus('Loading the game…',Math.min(30,window.realmStartup.loaded));}},true);
function realmStartupInlineLoaded(){const state=window.realmStartup;if(!state||state.failed||state.finished)return;state.loaded++;realmLoadStatus('Loading the game…',Math.min(30,state.loaded));}
document.addEventListener('error',e=>{if(e.target?.tagName==='SCRIPT')realmLoadFailure('A game file could not download. Please retry.',new Error('Script unavailable: '+e.target.src),'script-download');},true);
window.addEventListener('error',e=>{
 const state=window.realmStartup;if(state.finished){realmReportRuntimeFailure(e.error||e.message,'runtime-script');return;}if(state.failed)return;let critical=false;
 try{const source=new URL(e.filename||'',location.href);critical=state.stageCode==='scripts'&&/^https?:$/.test(source.protocol)&&source.origin===location.origin&&/\.js$/.test(source.pathname);}catch{}
 if(critical)realmLoadFailure('A game file could not start. Please retry.',e.error||e.message,'script-runtime');else console.warn('Recoverable startup error:',e.error||e.message);
});
window.addEventListener('unhandledrejection',e=>{const state=window.realmStartup;if(state.finished){if(e.reason?.name!=='AbortError')realmReportRuntimeFailure(e.reason,'runtime-promise');}else if(!state.failed)console.warn('Recoverable startup rejection:',e.reason);});
let realmUpdateNotice=null,realmUpdateCheckBusy=false;
function realmShowUpdateNotice(){
 if(realmUpdateNotice)return;const button=document.createElement('button');realmUpdateNotice=button;button.type='button';button.textContent='Game update ready · Reload';button.setAttribute('aria-label','Save and reload the latest Veldren update');Object.assign(button.style,{position:'fixed',left:'50%',top:'12px',transform:'translateX(-50%)',zIndex:'100000',padding:'11px 18px',border:'1px solid #d9bd72',borderRadius:'8px',background:'#10242a',color:'#fff5cf',font:'600 15px system-ui',boxShadow:'0 5px 24px #0009',cursor:'pointer'});button.onclick=async()=>{button.disabled=true;button.textContent='Saving…';try{if(typeof flushCloudSave==='function')await flushCloudSave();}catch{}location.reload();};document.body.appendChild(button);
}
async function realmCheckForUpdate(){
 if(realmUpdateCheckBusy||document.hidden||!window.REALM_RELEASE)return;realmUpdateCheckBusy=true;
 try{const response=await fetch('/api/release',{cache:'no-store',signal:AbortSignal.timeout(8000)}),data=await response.json();if(response.ok&&data.release&&data.release!==window.REALM_RELEASE)realmShowUpdateNotice();}catch{}finally{realmUpdateCheckBusy=false;}
}
setInterval(realmCheckForUpdate,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)realmCheckForUpdate();});
