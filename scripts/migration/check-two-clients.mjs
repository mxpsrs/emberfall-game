// Run the existing authenticated worker integration through the actual HTML script order.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
let source=fs.readFileSync('tests/shared-two-clients.mjs','utf8');
for(const needle of ["../scripts/game-fixture.cjs","for(const f of ['multiplayer','shared-world'])run(fs.readFileSync('dist/'+f+'.js','utf8'));","b.run(fs.readFileSync('dist/social.js','utf8'));"])if(!source.includes(needle))throw Error('Review changed upstream two-client test before adapting fixture.');
source=source.replaceAll('../scripts/game-fixture.cjs','../../scripts/migration/content-fixture.cjs').replaceAll('../worker/api.js','../../worker/api.js').replace("for(const f of ['multiplayer','shared-world'])run(fs.readFileSync('dist/'+f+'.js','utf8'));",'').replace("b.run(fs.readFileSync('dist/social.js','utf8'));",'');
fs.mkdirSync('.qa/migration',{recursive:true});fs.writeFileSync('.qa/migration/full-order-two-clients.mjs',source);
const start=performance.now(),r=spawnSync(process.execPath,['.qa/migration/full-order-two-clients.mjs'],{encoding:'utf8',timeout:300000});
const report={test:'Existing authenticated two-client worker integration with full current script order',scope:'In-memory local SQLite; synthetic accounts only; no hosted service or native client',seconds:(performance.now()-start)/1000,exitCode:r.status,passed:r.status===0,stdout:r.stdout,stderr:r.stderr,error:r.error?.message};
fs.writeFileSync('migration/reports/two-clients.json',JSON.stringify(report,null,2)+'\n');console.log(r.stdout,r.stderr);process.exitCode=report.passed?0:1;
