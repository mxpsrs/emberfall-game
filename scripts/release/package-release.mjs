import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
// Bulk browser payloads are uploaded to the asset bucket before publication.
// The deployment archive contains the Worker, binding manifest and migrations.
const output=path.resolve(process.argv[2]||'../veldren-release.tar.gz');
for(const file of ['dist/server/index.js','dist/.openai/hosting.json'])if(!fs.statSync(file).isFile())throw new Error('Missing build: '+file);
const source=JSON.parse(fs.readFileSync('.openai/hosting.json','utf8')),built=JSON.parse(fs.readFileSync('dist/.openai/hosting.json','utf8'));
if(source.project_id!==built.project_id)throw new Error('Built Site identity does not match source');
fs.mkdirSync(path.dirname(output),{recursive:true});
const temporary=output+'.pending';
execFileSync('tar',['-czf',temporary,'dist/server','dist/.openai']);
const entries=execFileSync('tar',['-tzf',temporary],{encoding:'utf8'});
for(const expected of ['dist/server/index.js','dist/.openai/hosting.json'])if(!entries.split('\n').includes(expected))throw new Error('Incomplete archive: '+expected);
execFileSync('gzip',['-t',temporary]);fs.renameSync(temporary,output);
console.log(output+' · '+fs.statSync(output).size+' bytes · validated Worker and migrations');
