import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const registryPath=path.join(root,'dist','data','asset-registry.json');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));

if(registry.schemaVersion!==1)throw new Error('Unsupported asset registry schema.');
if(!Array.isArray(registry.assets))throw new Error('Asset registry must contain an assets array.');

const ids=new Set();
const errors=[];
const forbiddenLegacy=new Set([
  'assets/characters.png','assets/environment.png','assets/heroes.png','assets/items.png',
  'assets/monsters.png','assets/poses.png','assets/spirits.png','assets/terrain.png','assets/walking.png'
]);

for(const asset of registry.assets){
  if(!asset?.id)errors.push('Asset entry missing id.');
  else if(ids.has(asset.id))errors.push('Duplicate asset id: '+asset.id);
  else ids.add(asset.id);

  if(!asset?.path){errors.push('Asset '+(asset?.id||'<unknown>')+' missing path.');continue;}
  if(path.isAbsolute(asset.path)||/^[a-zA-Z]:[\\/]/.test(asset.path))errors.push('Absolute asset path: '+asset.id+' -> '+asset.path);
  if(/^https?:\/\//i.test(asset.path))errors.push('Remote runtime asset path: '+asset.id+' -> '+asset.path);
  if(forbiddenLegacy.has(asset.path))errors.push('Legacy sprite sheet still registered: '+asset.path);

  const diskPath=path.join(root,'dist',asset.path);
  if(!fs.existsSync(diskPath))errors.push('Missing registered asset: '+asset.id+' -> '+asset.path);
}

if(errors.length){
  console.error('Veldren asset registry check failed:');
  for(const error of errors)console.error(' - '+error);
  process.exit(1);
}

console.log('Veldren asset registry OK: '+registry.assets.length+' registered production assets.');
