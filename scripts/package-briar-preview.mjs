import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const output=path.resolve(process.argv[2]||'briar-haven-review.zip');
execFileSync('git',['diff','--quiet']);
execFileSync('git',['diff','--cached','--quiet']);
execFileSync('git',['ls-files','--error-unmatch','scripts/briar-haven-preview.mjs','scripts/package-briar-preview.mjs'],{stdio:'ignore'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const commit=process.env.VELDREN_REVIEW_COMMIT||head;
if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Review commit must be a full Git SHA.');
const tree=execFileSync('git',['rev-parse',head+'^{tree}'],{encoding:'utf8'}).trim();
if(execFileSync('git',['rev-parse',commit+'^{tree}'],{encoding:'utf8'}).trim()!==tree)throw Error('Review commit does not match the checked-out source tree.');
const evidenceLabel=process.env.VELDREN_REVIEW_EVIDENCE;
if(evidenceLabel&&!/^[a-z0-9-]+$/.test(evidenceLabel))throw Error('Invalid evidence label.');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'briar-review-package-'));
const target=path.join(root,'Briar-Haven-Review');
const copy=(file)=>{const out=path.join(target,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(file,out);};
for(const file of ['dist/server/index.js','scripts/briar-haven-preview.mjs','scripts/local-storage.mjs','scripts/local-accounts.mjs','worker/reset-policy.js'])copy(file);
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')&&!/owner_/.test(n)))copy('drizzle/'+name);
fs.cpSync('node_modules/bcryptjs',path.join(target,'node_modules/bcryptjs'),{recursive:true});
fs.writeFileSync(path.join(target,'package.json'),JSON.stringify({name:'briar-haven-review',private:true,type:'module',scripts:{start:'node scripts/briar-haven-preview.mjs'},engines:{node:'>=24'}},null,2));
const hash=createHash('sha256').update(fs.readFileSync('dist/server/index.js')).digest('hex');
if(evidenceLabel){
 const evidence='docs/qa/briar-haven/'+evidenceLabel;
 const result=JSON.parse(fs.readFileSync(evidence+'/result.json','utf8'));
 if(result.errors?.length||result.editorBindingErrors?.length||result.results?.length!==6)throw Error('Six error-free rendered views are required for review evidence.');
 if(result.workerSha256!==hash)throw Error('Screenshots must match the packaged Worker.');
 for(const receipt of ['gameplay/result.json','editor-result.json']){
  const verified=JSON.parse(fs.readFileSync('docs/qa/briar-haven/'+receipt,'utf8'));
  if(verified.workerSha256!==hash||!Array.isArray(verified.errors)||verified.errors.length)throw Error('Gameplay and editor evidence must match the packaged Worker without browser errors.');
  const flags=receipt==='editor-result.json'?['reload']:['doorPicked','entered','closedDoorCutaway','exited','restoredRoof'];
  if(flags.some(flag=>verified[flag]!==true))throw Error('Gameplay and editor evidence must pass before packaging.');
 }
 for(const name of ['main-street','services-smithy','houses','magic-school','interior','town-edge'])for(const label of ['before',evidenceLabel])copy('docs/qa/briar-haven/'+label+'/'+name+'.png');
 for(const file of [evidence+'/result.json','docs/qa/briar-haven/README.md','docs/qa/briar-haven/verification-extra.json','docs/qa/briar-haven/gameplay/result.json','docs/qa/briar-haven/editor-result.json','docs/qa/briar-haven/editor-reloaded.png'])copy(file);
}
fs.writeFileSync(path.join(target,'BUILD.json'),JSON.stringify({commit,tree,workerSha256:hash,builtAt:new Date().toISOString(),localOnly:true,evidenceLabel:evidenceLabel||null},null,2));
fs.writeFileSync(path.join(target,'README.txt'),`BRIAR HAVEN REVIEW\n\n1. Install Node.js 24 or newer on your computer.\n2. Extract this ZIP. Open a terminal in the Briar-Haven-Review folder.\n3. Run: npm start\n4. Open http://127.0.0.1:8787/preview in your browser.\n\nThe game starts in Briar Haven with a separate local review character.\nUse click-to-walk, drag to orbit/pitch, and wheel or the camera slider to zoom.\nVisit the market, bank, smithy, homes, and Magic School.\nThe editor is at http://127.0.0.1:8787/editor/ after opening the preview.\nPress Ctrl+C in the terminal to stop.\n\nThis review build cannot modify your live account or the live game.\nYour local review progress is stored in briar-preview-data beside these files.\nNode dependencies needed to run the build are included. No npm install is needed.\n\nSource commit: ${commit}\nBuilt Worker SHA-256: ${hash}\n`);
if(evidenceLabel)fs.appendFileSync(path.join(target,'README.txt'),'\nBefore/after screenshots and verification evidence: docs/qa/briar-haven\n');
execFileSync('python3',['-c',`import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:\n for p in sorted(root.rglob('*')):\n  if p.is_file():z.write(p,p.relative_to(root))\n` ,root,output]);
fs.rmSync(root,{recursive:true,force:true});
console.log(JSON.stringify({output,bytes:fs.statSync(output).size,commit,workerSha256:hash}));
