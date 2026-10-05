const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(beforeBody=false){
 const elements=new Map(),timers=[],listeners={},reports=[];
 let mounted=!beforeBody;
 const element=()=>({children:[],hidden:false,removed:false,classList:{add(){}},replaceChildren(){this.children=[];},appendChild(el){this.children.push(el);},setAttribute(name,value){this[name]=value;},remove(){this.removed=true;}});
 for(const id of ['loading','loadingStatus','loadingProgress','cloudStatus','onlineStatus'])elements.set(id,element());
 const ctx={console:{error(){},warn(){}},URL,Blob:class{constructor(parts,options){this.value=parts.join('');this.type=options?.type;}},navigator:{userAgent:'startup-test',sendBeacon(url,body){reports.push({url,payload:JSON.parse(body.value)});return true;}},location:{href:'https://game.test/play',origin:'https://game.test',reload(){ctx.reloads++;}},reloads:0,Image:class{},setTimeout(fn,delay){fn.delay=delay;timers.push(fn);return timers.length;},clearTimeout(){},setInterval(){return 1;},document:{getElementById:id=>mounted?elements.get(id):null,createElement:element,addEventListener(type,fn){listeners['document:'+type]=fn;}},window:{REALM_RELEASE:'assets-test',innerWidth:932,innerHeight:430,devicePixelRatio:3,addEventListener(type,fn){listeners[type]=fn;}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../../client/startup.js','utf8'),ctx);
 return {ctx,elements,timers,listeners,reports,mount(){mounted=true;listeners['document:DOMContentLoaded']();}};
}
// Production failure: asset-materials.js fails while the head is still parsing.
const early=setup(true);
early.listeners['document:error']({target:{tagName:'SCRIPT',src:'https://game.test/asset-materials.js?v=74ddb71b36caee73'}});
assert(early.ctx.window.realmStartup.failed);assert.equal(early.elements.get('loading').children.length,0);
early.mount();assert.equal(early.elements.get('loading').children.at(-1).textContent,'Retry loading');
assert.match(early.elements.get('loading').children.at(-2).textContent,/VLD-SDL/);
assert.equal(early.reports.length,1);const count=early.elements.get('loading').children.length;
early.mount();assert.equal(early.elements.get('loading').children.length,count);assert.equal(early.reports.length,1);
const headProgress=setup(true);vm.runInContext("realmLoadStatus('Starting the Filament renderer…',32,'filament-init')",headProgress.ctx);
headProgress.mount();assert.equal(headProgress.elements.get('loadingStatus').textContent,'Starting the Filament renderer…');assert.equal(headProgress.elements.get('loadingProgress').value,32);
for(const failure of ['download','runtime','timeout']){
 const {ctx,elements,timers,listeners,reports}=setup();
 if(failure==='download')listeners['document:error']({target:{tagName:'SCRIPT',src:'creatures.js'}});
 if(failure==='runtime')listeners.error({filename:'https://game.test/game.js',error:new Error('Broken script')});
 if(failure==='timeout')timers[0]();
 assert(ctx.window.realmStartup.failed);assert.equal(elements.get('loading').children.at(-1).textContent,'Retry loading');
 assert.match(elements.get('loading').children.at(-2).textContent,/Diagnostic VLD-/);assert.equal(reports.length,1,'fatal startup reports exactly once');assert.equal(reports[0].url,'/api/client-error');
 vm.runInContext("realmLoadStatus('Late download',95);realmLoadComplete();",ctx);
 assert.equal(elements.get('loading').hidden,false,'a late response cannot hide the failure');
 elements.get('loading').children.at(-1).onclick();assert.equal(ctx.reloads,1);
}
const recoverable=setup();recoverable.listeners.unhandledrejection({reason:new Error('background refresh')});recoverable.listeners.error({filename:'https://third-party.test/widget.js',error:new Error('optional widget')});assert.equal(recoverable.ctx.window.realmStartup.failed,false,'unrelated rejections and errors do not fail startup');assert.equal(recoverable.reports.length,0,'recoverable noise does not consume the one fatal report');
const runtime=setup();vm.runInContext('realmLoadComplete()',runtime.ctx);
let runtimeNow=100000;runtime.ctx.Date={now:()=>runtimeNow};
runtime.listeners.error({filename:'https://game.test/renderer-filament.js',error:new Error('Failed texture?token=private-value')});
runtime.listeners.unhandledrejection({reason:new Error('Asset preparation failed')});
assert.equal(runtime.reports.length,2,'post-startup errors are reported');assert.equal(runtime.reports[0].payload.code,'VLD-FRM');assert.equal(runtime.reports[0].payload.stage,'runtime-script');assert(!JSON.stringify(runtime.reports).includes('private-value'),'runtime diagnostics redact sensitive URL values');
runtime.listeners.error({error:new Error('same repeated frame')});assert.equal(runtime.reports.length,2,'a repeated failure cannot flood the reporting endpoint');assert(!runtime.ctx.window.realmStartup.failed,'runtime reporting preserves the loaded character and scene');
runtimeNow+=60000;runtime.listeners.unhandledrejection({reason:Object.assign(new Error('cancelled'),{name:'AbortError'})});assert.equal(runtime.reports.length,2,'ordinary cancellation does not report a runtime failure');
runtime.listeners.error({error:new Error('later frame')});assert.equal(runtime.reports.length,3,'runtime diagnostics recover their bounded allowance after a minute');
const {ctx,elements,timers}=setup();
vm.runInContext("realmLoadStatus('World',90);realmLoadStatus('Scripts',20);",ctx);assert.equal(elements.get('loadingStatus').textContent,'World');assert.equal(elements.get('loadingProgress').value,90);
vm.runInContext('realmLoadComplete()',ctx);timers[0]();assert.equal(elements.get('loading').hidden,true);assert.equal(ctx.window.realmStartup.failed,false);
const waiting=setup();
vm.runInContext('realmPauseLoadingTimeout()',waiting.ctx);waiting.timers[0]();assert.equal(waiting.ctx.window.realmStartup.failed,false,'waiting at login cannot time out game startup');
vm.runInContext('realmStartLoadingTimeout()',waiting.ctx);assert.equal(waiting.timers.length,2);waiting.timers[1]();assert.equal(waiting.ctx.window.realmStartup.failed,true,'loading timeout resumes after login');
const progressing=setup();assert.equal(progressing.timers[0].delay,120000,'slow mobile startup receives a two-minute stall window');
vm.runInContext("realmLoadStatus('Starting the renderer…',32)",progressing.ctx);assert.equal(progressing.timers.length,2,'meaningful progress refreshes the stall window');progressing.timers[0]();assert.equal(progressing.ctx.window.realmStartup.failed,false,'an obsolete timer cannot fail active loading');progressing.timers[1]();assert.equal(progressing.ctx.window.realmStartup.failed,true,'a real two-minute stall still fails safely');
// Loading failures must not overwrite a returning player's save.
const bench=require('../../scripts/qa/benchmark-desktop.cjs');
vm.runInContext("let queued=0;queueCloudSave=()=>queued++;assetsReady=false;save();assert.equal(queued,0);assetsReady=true;window.realmStartup={failed:true};save();assert.equal(queued,0);window.realmStartup.failed=false;save();assert.equal(queued,1);",bench.ctx);
console.log('PASS: critical scripts, scoped runtime errors, recoverable rejections, one-shot diagnostics, login wait, mobile stall window, retry, and protected character saves.');
async function checkPaintBoundary(){
 const test=setup(),frames=[];test.ctx.requestAnimationFrame=fn=>frames.push(fn);test.ctx.ran=false;
 const work=vm.runInContext("realmStartupStep('Preparing world',80,'scene-ownership',()=>{ran=true;return 42;})",test.ctx);
 assert.equal(test.elements.get('loadingStatus').textContent,'Preparing world');assert.equal(test.ctx.ran,false);
 frames.shift()();assert.equal(test.ctx.ran,false,'heavy work waits until after the paint callback');
 test.timers.at(-1)();assert.equal(await work,42);assert.equal(test.ctx.ran,true);
 test.ctx.ran=false;
 const interrupted=vm.runInContext("realmStartupStep('Connecting world',93,'scene-ownership',()=>{ran=true;})",test.ctx);
 frames.shift()();test.ctx.window.realmStartup.failed=true;test.timers.at(-1)();
 await assert.rejects(interrupted,/Startup was interrupted/);assert.equal(test.ctx.ran,false,'failed startup cannot continue into gameplay');
 console.log('PASS: startup paints progress before heavy work and stops after interruption.');
}
checkPaintBoundary().catch(error=>{console.error(error);process.exitCode=1;});
