const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('client/editor/editor-runtime.js','utf8');
const request=source.slice(source.indexOf(' async function requestProject(){'),source.indexOf(' async function loadProject(){'));
assert(request.includes('async function requestProject'),'test uses the production request path');
async function probe(responses){
 let calls=0;const delays=[],context={fetch:async(url,options)=>{assert.equal(url,'/api/editor/edits');assert.equal(options.cache,'no-store');const response=responses[Math.min(calls++,responses.length-1)];if(response instanceof Error)throw response;return response;},setTimeout(resolve,ms){delays.push(ms);resolve();}};
 vm.createContext(context);vm.runInContext(request,context);let result,error;
 try{result=await context.requestProject();}catch(e){error=e;}
 return {calls,delays,result,error};
}
(async()=>{
 const unavailable={ok:false,status:503},success={ok:true,status:200};
 const retry=await probe([unavailable,new TypeError('Connection interrupted'),success]);assert.equal(retry.result,success);assert.equal(retry.calls,3);assert.deepEqual(retry.delays,[250,500]);
 for(const status of [401,403,404]){const denied=await probe([{ok:false,status}]);assert.equal(denied.calls,1,'permission and missing-resource failures do not retry');assert.deepEqual(denied.delays,[]);}
 const exhausted=await probe([unavailable]);assert.equal(exhausted.calls,3);assert.equal(exhausted.result.status,503);
 const network=await probe([new TypeError('Connection interrupted')]);assert.equal(network.calls,3);assert(network.error);
 console.log('PASS: project reads recover from temporary HTTP/network failures, remain bounded, and preserve authentication failures.');
})().catch(error=>{console.error(error);process.exitCode=1});
