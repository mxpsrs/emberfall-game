const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(){
 const elements=new Map(),timers=[],listeners={};
 const element=()=>({children:[],hidden:false,replaceChildren(){this.children=[];},appendChild(el){this.children.push(el);},setAttribute(){}});
 for(const id of ['loading','cloudStatus','onlineStatus'])elements.set(id,element());
 const ctx={console:{error(){}},location:{reload(){ctx.reloads++;}},reloads:0,Image:class{},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},document:{getElementById:id=>elements.get(id),createElement:element,addEventListener(type,fn){listeners['document:'+type]=fn;}},window:{addEventListener(type,fn){listeners[type]=fn;}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../dist/startup.js','utf8'),ctx);
 return {ctx,elements,timers,listeners};
}
for(const failure of ['download','runtime','timeout']){
 const {ctx,elements,timers,listeners}=setup();
 if(failure==='download')listeners['document:error']({target:{tagName:'SCRIPT',src:'creatures.js'}});
 if(failure==='runtime')listeners.error({error:new Error('Broken script')});
 if(failure==='timeout')timers[0]();
 assert(ctx.window.realmStartup.failed);assert.equal(elements.get('loading').children.at(-1).textContent,'Retry loading');
 vm.runInContext("realmLoadStatus('Late download',95);realmLoadComplete();",ctx);
 assert.equal(elements.get('loading').hidden,false,'a late response cannot hide the failure');
 elements.get('loading').children.at(-1).onclick();assert.equal(ctx.reloads,1);
}
const {ctx,elements,timers}=setup();
vm.runInContext("realmLoadStatus('World',90);realmLoadStatus('Scripts',20);",ctx);assert.equal(elements.get('loading').children[0].textContent,'World');
vm.runInContext('realmLoadComplete()',ctx);timers[0]();assert.equal(elements.get('loading').hidden,true);assert.equal(ctx.window.realmStartup.failed,false);
// Loading failures must not overwrite a returning player's save.
const bench=require('../scripts/benchmark-desktop.cjs');
vm.runInContext("let queued=0;queueCloudSave=()=>queued++;assetsReady=false;save();assert.equal(queued,0);assetsReady=true;window.realmStartup={failed:true};save();assert.equal(queued,0);window.realmStartup.failed=false;save();assert.equal(queued,1);",bench.ctx);
console.log('PASS: failed scripts, runtime errors, timeout, retry, late completion, monotonic progress, and protected character saves.');
