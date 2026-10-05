import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const skipped = new Set(['.git', 'node_modules', 'dist', '.qa', '.sites-runtime', 'vendor']);
const failures = [];
let scripts = 0;

function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    if (entry.isSymbolicLink() || skipped.has(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

for (const file of walk(root)) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (/\.(?:js|cjs|mjs)$/.test(file) && !relative.includes('/assets/') && !relative.startsWith('art/')) {
    const result = spawnSync(process.execPath, ['--check', file], {encoding:'utf8'});
    scripts++;
    if (result.status !== 0) failures.push(`${relative}: ${result.stderr.trim()}`);
    const source = fs.readFileSync(file, 'utf8');
    const imports = /(?:^\s*import\s+(?:[^;\n]*?\s+from\s+)?|^\s*export\s+[^;\n]*?\s+from\s+|\brequire\()(['"])(\.{1,2}\/[^'"\n]+)\1/gm;
    for (const match of source.matchAll(imports)) {
      const target = path.resolve(path.dirname(file), match[2]);
      if (target.includes(`${path.sep}dist${path.sep}server${path.sep}`)) continue;
      if (!fs.existsSync(target)) failures.push(`${relative}: missing import ${match[2]}`);
    }
  }
  if (file.endsWith('.md') && !relative.startsWith('docs/archive/') && !relative.startsWith('docs/qa/') && !relative.startsWith('art/')) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/\]\(([^\s)#]+)(?:#[^)]*)?\)/g)) {
      const link = match[1];
      if (/^(?:[a-z]+:|\/)/i.test(link)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), link))) failures.push(`${relative}: missing link ${link}`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`${scripts} scripts parse; static imports and current documentation links resolve.`);
}
