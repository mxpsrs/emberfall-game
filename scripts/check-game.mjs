import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
function discover(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'browser' ? [] : discover(file);
    return /\.(cjs|mjs)$/.test(entry.name) ? [file] : [];
  });
}
const available = discover('tests').sort();
const selected = process.argv.slice(2);
const tests = selected.length ? [...new Set(selected.flatMap(selection => {
  const matches = available.filter(file => file === selection || path.basename(file) === selection || file.startsWith('tests/' + selection + '/'));
  if (!matches.length) throw new Error('No tests match: ' + selection);
  return matches;
}))] : available;
fs.mkdirSync('.qa',{recursive:true});
const results=[],start=Date.now();let next=0;
async function run(file){const began=Date.now();let stdout='',stderr='',timedOut=false;const child=spawn(process.execPath,[file],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},240000);const code=await new Promise(resolve=>child.on('close',resolve));clearTimeout(timer);const log='.qa/'+path.basename(file)+'.log';fs.writeFileSync(log,stdout+stderr);const result={test:file,passed:code===0&&!timedOut,exitCode:code,timedOut,seconds:Math.round((Date.now()-began)/100)/10,output:(stdout+stderr).slice(-2200)};results.push(result);console.log((result.passed?'PASS ':'FAIL ')+file+' ('+result.seconds+'s)'+(result.passed?'':'\n'+result.output));}
await Promise.all(Array.from({length:2},async()=>{while(next<tests.length)await run(tests[next++]);}));
results.sort((a,b)=>a.test.localeCompare(b.test));const report={date:new Date().toISOString(),seconds:Math.round((Date.now()-start)/1000),passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,total:results.length,results};fs.writeFileSync('.qa/test-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,total:report.total,seconds:report.seconds}));process.exitCode=report.failed?1:0;
