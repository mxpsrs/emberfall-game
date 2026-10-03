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
 for(const file of [evidence+'/result.json','docs/qa/briar-haven/README.md','docs/qa/briar-haven/verification-extra.json','docs/qa/briar-haven/gameplay/result.json','docs/qa/briar-haven/editor-result.json'])copy(file);
 const names={'main-street':'Main street','services-smithy':'Services and smithy',houses:'Houses','magic-school':'Magic School',interior:'Occupied interior','town-edge':'Town edge'};
 const rows=result.results.map(r=>{
  const cpu=r.frames.map(f=>f.cpuMs).sort((a,b)=>a-b),q=p=>cpu[Math.min(cpu.length-1,Math.floor(cpu.length*p))];
  return `<tr><td>${names[r.name]}</td><td>${q(.5).toFixed(1)} ms</td><td>${q(.95).toFixed(1)} ms</td><td>${r.frames.length}</td></tr>`;
 }).join('');
 const comparisons=Object.entries(names).map(([name,title])=>`<section><h2>${title}</h2><div class="pair">${[['before','Earlier baseline — incomplete loading'],[evidenceLabel,'Review build — settled']].map(([label,caption])=>`<figure><a href="docs/qa/briar-haven/${label}/${name}.png"><img loading="lazy" src="docs/qa/briar-haven/${label}/${name}.png" alt="${title}: ${caption}"></a><figcaption>${caption}</figcaption></figure>`).join('')}</div></section>`).join('');
 fs.writeFileSync(path.join(target,'review.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Briar Haven review</title><style>body{margin:0;background:#142326;color:#ecf1e7;font:16px/1.6 system-ui,sans-serif}main{max-width:1480px;margin:auto;padding:28px}h1,h2{line-height:1.2}h1{font-size:36px}h2{font-size:23px;margin-top:36px}a{color:#b7dac7}code{overflow-wrap:anywhere}p{max-width:85ch}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:8px 0;color:#c0cec5}table{border-collapse:collapse;width:100%;max-width:900px}td,th{padding:10px;text-align:left;border-bottom:1px solid #45605c}@media(max-width:800px){.pair{grid-template-columns:1fr}main{padding:16px}}</style><main><h1>Briar Haven review</h1><p>Twelve distinct building plans, one shared third-person camera, complete structural interiors, readable roads, vegetation and forge activity. Production is unchanged.</p><p>Source commit: <code>${commit}</code>. See <a href="BUILD.json">BUILD.json</a> for source-tree and runtime hashes. Run the game using <a href="README.txt">README.txt</a>.</p><p>These are actual 1920 × 1080 Filament browser captures at world hour 11. The earlier baseline contains incomplete loading. The review views wait for loading and visible construction to finish. These screenshots therefore show the respective saved states and do not establish a settled before/after frame-rate comparison. Click any image for its full resolution.</p><p>Gameplay and editor save/reload checks passed without browser errors. <a href="docs/qa/briar-haven/README.md">Verification notes</a> describe scope, tests and remaining limits.</p><h2>Software-renderer measurements</h2><p>SwiftShader software GPU; CPU draw and submission timings. These measurements do not certify physical GPU or phone performance. The requested desktop 60 FPS and phone 30 FPS targets still require the named hardware.</p><table><thead><tr><th>View</th><th>Median CPU draw</th><th>95th percentile</th><th>Settled frames</th></tr></thead><tbody>${rows}</tbody></table>${comparisons}</main></html>`);
}
fs.writeFileSync(path.join(target,'BUILD.json'),JSON.stringify({commit,tree,workerSha256:hash,builtAt:new Date().toISOString(),localOnly:true,evidenceLabel:evidenceLabel||null},null,2));
fs.writeFileSync(path.join(target,'README.txt'),`BRIAR HAVEN REVIEW\n\n1. Install Node.js 24 or newer on your computer.\n2. Extract this ZIP. Open a terminal in the Briar-Haven-Review folder.\n3. Run: npm start\n4. Open http://127.0.0.1:8787/preview in your browser.\n\nThe game starts in Briar Haven with a separate local review character.\nUse click-to-walk, drag to orbit/pitch, and wheel or the camera slider to zoom.\nVisit the market, bank, smithy, homes, and Magic School.\nThe editor is at http://127.0.0.1:8787/editor/ after opening the preview.\nPress Ctrl+C in the terminal to stop.\n\nThis review build cannot modify your live account or the live game.\nYour local review progress is stored in briar-preview-data beside these files.\nNode dependencies needed to run the build are included. No npm install is needed.\n\nSource commit: ${commit}\nBuilt Worker SHA-256: ${hash}\n`);
if(evidenceLabel)fs.appendFileSync(path.join(target,'README.txt'),'\nOpen review.html for before/after screenshots and measured results.\nRaw verification evidence: docs/qa/briar-haven\n');
execFileSync('python3',['-c',`import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:\n for p in sorted(root.rglob('*')):\n  if p.is_file():z.write(p,p.relative_to(root))\n` ,root,output]);
fs.rmSync(root,{recursive:true,force:true});
console.log(JSON.stringify({output,bytes:fs.statSync(output).size,commit,workerSha256:hash}));
