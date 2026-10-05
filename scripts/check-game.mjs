import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

process.chdir(path.resolve(import.meta.dirname, '..'));
const excluded = new Set(['browser', 'helpers', 'fixtures']);

function discover(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return excluded.has(entry.name) ? [] : discover(file);
    return /\.(cjs|mjs)$/.test(entry.name) ? [file] : [];
  });
}

const available = discover('tests').sort();
const selections = process.argv.slice(2);
const tests = selections.length ? [...new Set(selections.flatMap(selection => {
  const matches = available.filter(file => file === selection
    || path.basename(file) === selection || file.startsWith(`tests/${selection}/`));
  if (!matches.length) throw new Error(`No tests match: ${selection}`);
  return matches;
}))] : available;

fs.mkdirSync('.qa', {recursive: true});
const results = [];
const began = Date.now();
let next = 0;

async function run(file) {
  const started = Date.now();
  let output = '';
  let timedOut = false;
  const child = spawn(process.execPath, [file], {stdio: ['ignore', 'pipe', 'pipe']});
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timeout = file === 'tests/gameplay/main-story.cjs' ? 600000 : 240000;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  }).finally(() => clearTimeout(timer));
  const result = {test: file, passed: exitCode === 0 && !timedOut, exitCode,
    timedOut, seconds: Math.round((Date.now() - started) / 100) / 10,
    output: output.slice(-2200)};
  results.push(result);
  fs.writeFileSync(`.qa/${path.basename(file)}.log`, output);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${file} (${result.seconds}s)`);
  if (!result.passed) console.log(result.output);
}

await Promise.all(Array.from({length: 2}, async () => {
  while (next < tests.length) await run(tests[next++]);
}));
results.sort((a, b) => a.test.localeCompare(b.test));
const report = {date: new Date().toISOString(), seconds: Math.round((Date.now() - began) / 1000),
  passed: results.filter(result => result.passed).length,
  failed: results.filter(result => !result.passed).length, total: results.length, results};
const suffix = selections.length
  ? '-' + createHash('sha256').update(tests.join('\n')).digest('hex').slice(0, 12) : '';
fs.writeFileSync(`.qa/test-results${suffix}.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed,
  total: report.total, seconds: report.seconds}));
process.exitCode = report.failed ? 1 : 0;
