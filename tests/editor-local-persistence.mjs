import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-editor-persistence-'));
let server;
try{
 for(const file of ['package.json','scripts/editor-persistence.mjs','worker/editor-document.js','dist/building-assembly.js','dist/world-scene-format.js','editor-data/world-edits.json']){
  const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(sourceRoot,file),target);
 }
 fs.mkdirSync(path.join(temp,'dist'),{recursive:true});
 fs.writeFileSync(path.join(temp,'dist/index.html'),'<script src="character-creation.js"></script>');
 const {editorPersistencePlugin}=await import(pathToFileURL(path.join(temp,'scripts/editor-persistence.mjs')).href);
 let handler;
 editorPersistencePlugin().configureServer({middlewares:{use(fn){handler=fn}}});
 server=http.createServer((request,response)=>handler(request,response,()=>{response.statusCode=404;response.end('not found')}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const call=async(method,url='/api/editor/edits',body)=>{
  const response=await fetch(origin+url,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json()};
 };
 const initial=await call('GET');assert.equal(initial.status,200);
 assert.equal(initial.body.world.format,'veldren.world');assert.equal(initial.body.world.revision,initial.body.revision);
 assert.equal(fs.existsSync(path.join(temp,'editor-data/world-scene.json')),false,'GET migration does not rewrite canonical edits on disk');
 const world=structuredClone(initial.body.world),scene=world.scenes.find(item=>item.scene==='tutorial');
 scene.entities.push({id:'tutorial:group:lanterns',name:'Lantern group',parent:null,active:true,
  transform:{position:[4,0,5],rotation:[0,0,0,1],scale:[1,1,1]},components:{},metadata:{folder:'lighting'}});
 scene.entities.push({id:'tutorial:lamp:local',name:'Lantern',parent:'tutorial:group:lanterns',active:true,
  transform:{position:[2,0,3],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'briar:lantern',visible:true}},metadata:{}});
 world.expectedRevision=initial.body.world.revision;
 const saved=await call('PUT','/api/editor/edits',world);assert.equal(saved.status,200);
 assert.equal(saved.body.revision,initial.body.world.revision+1);
 const verified=await call('GET');assert.equal(verified.status,200);
 const persisted=verified.body.world.scenes.find(item=>item.scene==='tutorial');
 assert.equal(persisted.entities.find(item=>item.id==='tutorial:lamp:local').parent,'tutorial:group:lanterns');
 assert.equal(persisted.entities.find(item=>item.id==='tutorial:lamp:local').components.MeshRenderer.asset,'briar:lantern');
 const legacySave=await call('PUT','/api/editor/edits',{version:1,expectedRevision:verified.body.revision,changes:verified.body.edits.changes});
 assert.equal(legacySave.status,200,'legacy editor saves still succeed through the compatibility view');
 const final=await call('GET');assert.equal(final.body.world.revision,verified.body.world.revision+1);
 const sceneText=fs.readFileSync(path.join(temp,'editor-data/world-scene.json'),'utf8');
 assert.equal(sceneText,fs.readFileSync(path.join(temp,'dist/world-scene.json'),'utf8'),'canonical scene and runtime scene mirrors match');
 assert.equal(fs.readFileSync(path.join(temp,'editor-data/world-edits.json'),'utf8'),fs.readFileSync(path.join(temp,'dist/world-edits.json'),'utf8'),'legacy compatibility and runtime mirrors match');
 assert.equal(JSON.parse(sceneText).scenes.find(item=>item.scene==='tutorial').entities.find(item=>item.id==='tutorial:lamp:local').parent,'tutorial:group:lanterns');
 const play=await fetch(origin+'/play');assert.equal(play.status,200);assert.match(await play.text(),/world-edits-runtime\.js/);
 console.log('PASS: local editor persistence migrates v1 edits, saves v2 hierarchy atomically, preserves v2 data on legacy saves, and keeps runtime mirrors in sync.');
}finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(temp,{recursive:true,force:true});
}
