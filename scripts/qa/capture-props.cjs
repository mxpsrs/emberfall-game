const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const entries=['small-house','two-story-house','tavern','shop','library','castle-hall','castle-bedroom','castle-council','castle-guard','castle-kitchen','castle-barracks','castle-armory','castle-courtyard','castle-study','castle-cellar','dungeon','square','ironhollow-street','quarry','market','road-night','goblin-bridge','dwarven-workshop','elven-library','firstlight-kitchen','abandoned-quarry'];
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.qa/prop-visuals');fs.mkdirSync(out,{recursive:true});
for(const name of process.argv.length>2?process.argv.slice(2):entries){
 if(!entries.includes(name))throw new Error(name);const dir=path.join(out,name),zoom=/quarry/.test(name)?23:/square|street|market|night|bridge/.test(name)?28:38;
 const capture=spawnSync(process.execPath,['scripts/qa/capture-scene.cjs',dir,'prop-'+name],{cwd:root,env:{...process.env,VELDREN_CAPTURE_WIDTH:'1280',VELDREN_CAPTURE_HEIGHT:'720',VELDREN_CAPTURE_ZOOM:String(zoom),VELDREN_CAPTURE_CLOCK:name==='road-night'?'380':'120'},encoding:'utf8'});
 if(capture.status)throw new Error(capture.stderr);const render=spawnSync('python',['scripts/qa/render-scene.py',dir,path.join(out,name+'.png')],{cwd:root,encoding:'utf8'});
 if(render.status)throw new Error(render.stderr);console.log(name+' rendered');fs.rmSync(dir,{recursive:true,force:true});
}
