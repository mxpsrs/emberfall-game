const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(){
 const elements=new Map(),timers=[],listeners={},reports=[];
 const element=()=>({children:[],hidden:false,removed:false,classList:{add(){}},replaceChildren(){this.children=[];},appendChild(el){this.children.push(el);},setAttribute(name,value){this[name]=value;},remove(){this.removed=true;}});
 for(const id of ['loading','loadingStatus','loadingProgress','cloudStatus','onlineStatus'])elements.set(id,element());
 const ctx={console:{error(){},warn(){}},URL,Blob:class{constructor(parts,options){this.value=parts.join('');this.type=options?.type;}},navigator:{userAgent:'startup-test',sendBeacon(url,body){reports.push({url,payload:JSON.parse(body.value)});return true;}},location:{href:'https://game.test/play',origin:'https://game.test',reload(){ctx.reloads++;}},reloads:0,Image:class{},setTimeout(fn,delay){fn.delay=delay;timers.push(fn);return timers.length;},clearTimeout(){},setInterval(){return 1;},document:{getElementById:id=>elements.get(id),createElement:element,addEventListener(type,fn){listeners['document:'+type]=fn;}},window:{REALM_RELEASE:'assets-test',innerWidth:932,innerHeight:430,devicePixelRatio:3,addEventListener(type,fn){listeners[type]=fn;}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../dist/startup.js','utf8'),ctx);
 return {ctx,elements,timers,listeners,reports};
}
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
const {ctx,elements,timers}=setup();
vm.runInContext("realmLoadStatus('World',90);realmLoadStatus('Scripts',20);",ctx);assert.equal(elements.get('loadingStatus').textContent,'World');assert.equal(elements.get('loadingProgress').value,90);
vm.runInContext('realmLoadComplete()',ctx);timers[0]();assert.equal(elements.get('loading').hidden,true);assert.equal(ctx.window.realmStartup.failed,false);
const waiting=setup();
vm.runInContext('realmPauseLoadingTimeout()',waiting.ctx);waiting.timers[0]();assert.equal(waiting.ctx.window.realmStartup.failed,false,'waiting at login cannot time out game startup');
vm.runInContext('realmStartLoadingTimeout()',waiting.ctx);assert.equal(waiting.timers.length,2);waiting.timers[1]();assert.equal(waiting.ctx.window.realmStartup.failed,true,'loading timeout resumes after login');
const progressing=setup();assert.equal(progressing.timers[0].delay,120000,'slow mobile startup receives a two-minute stall window');
vm.runInContext("realmLoadStatus('Starting the renderer…',32)",progressing.ctx);assert.equal(progressing.timers.length,2,'meaningful progress refreshes the stall window');progressing.timers[0]();assert.equal(progressing.ctx.window.realmStartup.failed,false,'an obsolete timer cannot fail active loading');progressing.timers[1]();assert.equal(progressing.ctx.window.realmStartup.failed,true,'a real two-minute stall still fails safely');
// Loading failures must not overwrite a returning player's save.
const bench=require('../scripts/benchmark-desktop.cjs');
vm.runInContext("let queued=0;queueCloudSave=()=>queued++;assetsReady=false;save();assert.equal(queued,0);assetsReady=true;window.realmStartup={failed:true};save();assert.equal(queued,0);window.realmStartup.failed=false;save();assert.equal(queued,1);",bench.ctx);
console.log('PASS: critical scripts, scoped runtime errors, recoverable rejections, one-shot diagnostics, login wait, mobile stall window, retry, and protected character saves.');
