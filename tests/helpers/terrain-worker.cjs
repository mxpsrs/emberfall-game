const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
global.self=global;self.location={href:workerData.url};
global.importScripts=url=>vm.runInThisContext(fs.readFileSync(path.join(workerData.root,new URL(url).pathname),'utf8'),{filename:new URL(url).pathname});
global.fetch=async url=>{const file=new URL(url,workerData.url).pathname;parentPort.postMessage({type:'fetch',file});const bytes=await fs.promises.readFile(path.join(workerData.root,file));return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
global.postMessage=(value,transfer)=>parentPort.postMessage(value,transfer);
const filename=new URL(workerData.url).pathname;
vm.runInThisContext(fs.readFileSync(path.join(workerData.root,filename),'utf8'),{filename});
parentPort.on('message',data=>self.onmessage({data}));
