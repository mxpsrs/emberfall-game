import {sanitize,sanitizeTerrain,confirmation} from '../worker/editor-document.js';
import '../dist/world-scene-format.js';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const moduleDir=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(moduleDir,'..');
const dataDir=path.join(projectRoot,'editor-data');
const editsPath=path.join(dataDir,'world-edits.json');
const backupPath=path.join(dataDir,'world-edits.backup.json');
const runtimeMirrorPath=path.join(projectRoot,'dist','world-edits.json');
const scenePath=path.join(dataDir,'world-scene.json');
const runtimeScenePath=path.join(projectRoot,'dist','world-scene.json');
const {fromLegacy,toLegacy,mergeLegacy,validateWorld}=globalThis.VeldrenSceneFormat;
const indexPath=path.join(projectRoot,'dist','index.html');
const publicPath='editor-data/world-edits.json';
const runtimePath='dist/world-edits.json';
const MAX_BYTES=8*1024*1024;

function empty(){return {version:1,revision:0,updatedAt:null,changes:[]}}
function sha(text){return createHash('sha256').update(text).digest('hex')}
function fsyncWrite(file,text){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const tmp=file+'.writing-'+process.pid;
 const fd=fs.openSync(tmp,'w');
 try{fs.writeFileSync(fd,text,'utf8');fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
 fs.renameSync(tmp,file);
 const check=fs.readFileSync(file,'utf8');
 if(check!==text)throw Error('Disk verification mismatch: '+path.relative(projectRoot,file));
 return check;
}
function readCanonical(){
 try{
  const sceneText=fs.readFileSync(scenePath,'utf8'),world=JSON.parse(sceneText),data=toLegacy(world),text=JSON.stringify(data,null,2)+'\n';
  return {data,text,world,sceneText};
 }catch(error){
  if(error?.code==='ENOENT'){
   try{
    const text=fs.readFileSync(editsPath,'utf8'),data=JSON.parse(text);
    if(data?.version!==1||!Array.isArray(data.changes))throw Error('Unsupported editor world file');
    data.revision=Number(data.revision)||0;const world=fromLegacy(data);
    return {data,text,world,sceneText:JSON.stringify(world,null,2)+'\n'};
   }catch(legacyError){
    if(legacyError?.code!=='ENOENT')throw legacyError;
    const data=empty(),text=JSON.stringify(data,null,2)+'\n',world=fromLegacy(data);
    return {data,text,world,sceneText:JSON.stringify(world,null,2)+'\n'};
   }
  }
  throw error;
 }
}
function syncRuntimeMirror(text){
 let current=null;try{current=fs.readFileSync(runtimeMirrorPath,'utf8')}catch{}
 if(current!==text)fsyncWrite(runtimeMirrorPath,text);
 const verified=fs.readFileSync(runtimeMirrorPath,'utf8');
 if(verified!==text)throw Error('Runtime world-edits mirror does not match editor source');
 return verified;
}
function reply(res,body,status=200){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.end(JSON.stringify(body));
}
async function requestBody(req){
 const chunks=[];let size=0;
 for await(const chunk of req){
  size+=chunk.length;
  if(size>MAX_BYTES){const error=Error('Editor save exceeds 8 MB');error.status=413;throw error}
  chunks.push(chunk);
 }
 return Buffer.concat(chunks).toString('utf8');
}

export function editorPersistencePlugin(){
 return {name:'veldren-editor-persistence',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   const pathname=req.url?.split('?')[0];

   if(pathname==='/api/editor/edits'){
    try{
     if(req.method==='GET'){
      const {data,text,world,sceneText}=readCanonical();
      const mirror=syncRuntimeMirror(text);
      fsyncWrite(runtimeScenePath,sceneText);
      return reply(res,{
       ok:true,path:publicPath,runtimePath,revision:data.revision,count:data.changes.length,
       bytes:Buffer.byteLength(text),sha256:sha(text),runtimeSha256:sha(mirror),
       updatedAt:data.updatedAt,world,worldSha256:sha(sceneText),edits:data
      });
     }

     if(req.method==='PUT'){
      const current=readCanonical(),input=JSON.parse(await requestBody(req));
      if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision!==current.world.revision){
       const error=Error('Editor world changed on disk. Reload before saving.');error.status=409;throw error;
      }
      let world;
      if(input.format==='veldren.world'){
       world=structuredClone(input);delete world.expectedRevision;
       world.revision=current.world.revision+1;world.updatedAt=new Date().toISOString();
       if(world.terrain!==undefined)world.terrain=sanitizeTerrain(world.terrain);
       else if(current.world.terrain!==undefined)world.terrain=current.world.terrain;
       validateWorld(world);
      }else world=mergeLegacy(current.world,sanitize(input,current.data));
      const data=toLegacy(world);
      const text=JSON.stringify(data,null,2)+'\n';
      const sceneText=JSON.stringify(world,null,2)+'\n';

      fs.mkdirSync(dataDir,{recursive:true});
      if(fs.existsSync(editsPath))fs.copyFileSync(editsPath,backupPath);

      const sceneCanonical=fsyncWrite(scenePath,sceneText);
      const canonical=fsyncWrite(editsPath,text);
      const mirror=fsyncWrite(runtimeMirrorPath,text);
      const sceneMirror=fsyncWrite(runtimeScenePath,sceneText);

      if(sha(canonical)!==sha(mirror)||sha(sceneCanonical)!==sha(sceneMirror))throw Error('Saved editor file and playable world mirror have different hashes');
      const parsed=JSON.parse(canonical);

      return reply(res,{
       ok:true,path:publicPath,runtimePath,revision:parsed.revision,count:parsed.changes.length,
       bytes:Buffer.byteLength(canonical),sha256:sha(canonical),runtimeSha256:sha(mirror),
       updatedAt:parsed.updatedAt,world,worldSha256:sha(sceneCanonical),confirmed:parsed.changes.map(confirmation)
      });
     }

     if(req.method==='DELETE'){
      fs.rmSync(editsPath,{force:true});fs.rmSync(scenePath,{force:true});
      const text=JSON.stringify(empty(),null,2)+'\n';
      fsyncWrite(runtimeMirrorPath,text);
      fsyncWrite(runtimeScenePath,JSON.stringify(fromLegacy(empty()),null,2)+'\n');
      return reply(res,{ok:true,path:publicPath,runtimePath,revision:0,count:0,bytes:Buffer.byteLength(text),sha256:sha(text),runtimeSha256:sha(text),updatedAt:null,confirmed:[]});
     }

     return reply(res,{error:'Method not allowed'},405);
    }catch(error){
     console.error('editor_persistence_failed',error);
     return reply(res,{error:String(error?.message||error)},error?.status||400);
    }
   }

   // Local /play always receives the edit runtime before character-creation
   // starts booting. The runtime itself waits for DOMContentLoaded before it
   // installs the final world-generation hooks, removing the old startup race.
   if((pathname==='/play'||pathname==='/play/'||pathname==='/index.html')&&req.method==='GET'){
    try{
     let html=fs.readFileSync(indexPath,'utf8');
     const marker='<script src="character-creation.js"></script>';
     if(!html.includes('world-edits-runtime.js')){
      if(!html.includes(marker))throw Error('character-creation.js marker not found');
      html=html.replace(marker,'<script src="world-edits-runtime.js"></script>'+marker);
     }
     res.statusCode=200;
     res.setHeader('Content-Type','text/html; charset=utf-8');
     res.setHeader('Cache-Control','no-store');
     res.end(html);
     return;
    }catch(error){
     console.error('editor_play_injection_failed',error);
     res.statusCode=500;res.end('Could not prepare local Veldren play world');return;
    }
   }

   next();
  });
 }};
}
