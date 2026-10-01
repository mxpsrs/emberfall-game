const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
global.self=global;self.location={href:workerData.url};
global.importScripts=url=>vm.runInThisContext(fs.readFileSync(path.join(workerData.root,new URL(url).pathname),'utf8'),{filename:new URL(url).pathname});
global.fetch=async url=>{const file=new URL(url,'https://terrain.test/').pathname;parentPort.postMessage({type:'fetch',file});const bytes=await fs.promises.readFile(path.join(workerData.root,file));return {ok:true,json:async()=>JSON.parse(bytes.toString())};};
global.postMessage=(value,transfer)=>parentPort.postMessage(value,transfer);
vm.runInThisContext(fs.readFileSync(path.join(workerData.root,'terrain-worker.js'),'utf8'),{filename:'terrain-worker.js'});
parentPort.on('message',data=>self.onmessage({data}));
