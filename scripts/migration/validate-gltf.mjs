import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),validator=require('gltf-validator');
const folders=process.argv.slice(2);let reportPath='migration/reports/gltf-validation.json';
const opt=folders.indexOf('--report');if(opt>=0){reportPath=folders[opt+1];if(!reportPath)throw Error('--report needs a path');folders.splice(opt,2);}
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(glb|gltf)$/i.test(p))files.push(p);}}
for(const dir of folders.length?folders:['assets/models','assets/authoring','assets/source'])if(fs.existsSync(dir))walk(dir);
const records=[];
for(const file of files.sort()){
 const bytes=fs.readFileSync(file),dependencies=[];
 const result=await validator.validateBytes(new Uint8Array(bytes),{uri:path.basename(file),maxIssues:100,externalResourceFunction:async uri=>{
  if(/^[a-z][a-z0-9+.-]*:/i.test(uri)||uri.startsWith('//')||uri.includes('\\'))throw Error('Nonlocal dependency '+uri);
  const target=path.resolve(path.dirname(file),decodeURIComponent(uri));if(!target.startsWith(path.resolve('assets')+path.sep))throw Error('Escaping dependency '+uri);
  const data=fs.readFileSync(target);dependencies.push({path:path.relative('.',target).split(path.sep).join('/'),sha256:createHash('sha256').update(data).digest('hex')});return new Uint8Array(data);
 }});
 records.push({path:file,sha256:createHash('sha256').update(bytes).digest('hex'),scope:file.startsWith('assets/source/')?'original-source':file.startsWith('assets/authoring/')?'authoring-library':'recovered-game-asset',
  dependencies,errors:result.issues.numErrors,warnings:result.issues.numWarnings,messages:result.issues.messages,info:result.info});
}
const byScope=Object.fromEntries(['recovered-game-asset','authoring-library','original-source'].map(scope=>{const rows=records.filter(r=>r.scope===scope);return [scope,{files:rows.length,errors:rows.reduce((n,r)=>n+r.errors,0),warnings:rows.reduce((n,r)=>n+r.warnings,0)}];}));
const report={validator:'Khronos gltf-validator '+validator.version(),scope:'Local glTF structure and dependencies; no native engine execution',files:files.length,errors:records.reduce((n,r)=>n+r.errors,0),warnings:records.reduce((n,r)=>n+r.warnings,0),byScope,records};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:report.files,errors:report.errors,warnings:report.warnings,byScope}));process.exitCode=report.errors?1:0;
