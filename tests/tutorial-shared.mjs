import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {openLocalStorage} from '../scripts/local-storage.mjs';
import {syncSharedWorld} from '../worker/shared-world.js';
const require=createRequire(import.meta.url);
const source=fs.readFileSync('tests/apprenticeship.cjs','utf8');
const split=source.indexOf('\nvm.runInContext(`\nlet randomSeed');
const bootstrap=source.slice(0,split).replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
const sandbox={require,console,process,atob};vm.createContext(sandbox);
vm.runInContext(bootstrap+';this.gameContext=ctx;',sandbox);
const ctx=sandbox.gameContext;
for(const f of ['multiplayer','shared-world'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-tutorial-shared-'));
const storage=openLocalStorage({dataDirectory:directory});
let polls=0,receipts=0;
ctx.pollServer=async()=>{
 const packet=JSON.parse(vm.runInContext('JSON.stringify({scene:currentScene,x:px,y:py,world:outgoingSharedWorld()})',ctx));
 const state=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));
 const now=vm.runInContext('Date.now()',ctx);
 const realNow=Date.now;Date.now=()=>now;
 let world;try{world=await syncSharedWorld(storage.env,'tutorial-shared-test',state,packet,now,'tutorial-shared-test');}finally{Date.now=realNow;}
 polls++;receipts+=world.receipts.length;
 ctx.reply={world};vm.runInContext('applySharedWorld(reply)',ctx);
};
let body=source.slice(split+'\nvm.runInContext(`'.length,source.lastIndexOf('`,ctx);'));
body=body.replace('let testNow=0;', 'cloudReady=true;cloudDirty=cloudBusy=false;save=()=>{};flushCloudSave=async()=>{};let testNow=1700000000000;');
body=body.replace('frame(testNow);}', 'frame(testNow);if(testNow%250===0)await pollServer();}');
for(const name of ['tick','until','talk','gather']){
 body=body.replaceAll(name+'(', 'await '+name+'(').replace('function await '+name+'(', 'async function '+name+'(');
}
body=body.replace("clickDialog('I am ready. Send me to the mainland.');assert(tutorialCrossing)", "clickDialog('I am ready. Send me to the mainland.');await pollServer();assert(tutorialCrossing)");

body=body.replace("console.log('PASS: summoned-hero opening","console.log('PASS: shared-server tutorial: summoned-hero opening");
try{await vm.runInContext('(async()=>{'+body+'})()',ctx);console.log('Shared server walkthrough:',polls,'polls;',receipts,'receipts');}
finally{storage.close();fs.rmSync(directory,{recursive:true,force:true});}
