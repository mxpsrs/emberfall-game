'use strict';
// Runs before the game scripts so a failed download cannot leave a silent screen.
window.realmStartup={failed:false,finished:false,stage:'Loading the game…',loaded:0};
function realmLoadStatus(message,progress){
 const state=window.realmStartup;if(state.failed||state.finished||progress<(state.progress||0))return;
 state.stage=message;state.progress=progress;
 const box=document.getElementById('loading');if(!box)return;
 box.replaceChildren();const title=document.createElement('strong');title.textContent=message;box.appendChild(title);
 const bar=document.createElement('progress');bar.max=100;bar.value=progress;bar.setAttribute('aria-label','Loading progress');box.appendChild(bar);
}
function realmLoadFailure(message,error){
 const state=window.realmStartup;if(state.finished||state.failed)return;state.failed=true;clearTimeout(state.timer);
 if(error)console.error('Realm startup failed:',error);
 const box=document.getElementById('loading');if(!box)return;box.hidden=false;box.replaceChildren();
 const title=document.createElement('strong');title.textContent='The realm could not start';box.appendChild(title);
 const detail=document.createElement('p');detail.textContent=message;box.appendChild(detail);
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>location.reload();box.appendChild(retry);
 const cloud=document.getElementById('cloudStatus');if(cloud)cloud.textContent='Character paused';
 const online=document.getElementById('onlineStatus');if(online)online.textContent='Not connected';
}
function realmLoadComplete(){const state=window.realmStartup;if(state.failed)return;state.finished=true;clearTimeout(state.timer);document.getElementById('loading').hidden=true;}
function realmAssetURL(path){return window.REALM_ASSET_VERSIONS?.[path]||path;}
function realmLoadImage(path){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image unavailable: '+path));img.src=realmAssetURL(path);});}
window.realmStartup.timer=setTimeout(()=>realmLoadFailure('Loading took too long. Please retry; your saved character will be kept.'),45000);
document.addEventListener('load',e=>{if(e.target?.tagName==='SCRIPT'){window.realmStartup.loaded++;realmLoadStatus('Loading the game…',Math.min(30,window.realmStartup.loaded));}},true);
document.addEventListener('error',e=>{if(e.target?.tagName==='SCRIPT')realmLoadFailure('A game file could not download. Please retry.',e.target.src);},true);
window.addEventListener('error',e=>realmLoadFailure('A game file could not start. Please retry.',e.error||e.message));
window.addEventListener('unhandledrejection',e=>realmLoadFailure('Loading was interrupted. Please retry.',e.reason));
