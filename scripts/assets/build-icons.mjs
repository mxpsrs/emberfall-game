import fs from 'node:fs';
import path from 'node:path';

// Only the curated, credited assets are shipped; no icon font or runtime fetch.
const root=path.resolve(import.meta.dirname,'../..');
const art=path.join(root,'art/ui-icons');
const manifest=JSON.parse(fs.readFileSync(path.join(art,'manifest.json'),'utf8'));
const defs={};
for(const [id,icon]of Object.entries(manifest.icons)){
 const svg=fs.readFileSync(path.join(art,icon.source),'utf8');
 if(!svg.includes('viewBox="0 0 512 512"')||/<(?:g|use|image)\b|\btransform=/.test(svg))throw new Error('Unsupported icon SVG: '+id);
 defs[id]=[...svg.matchAll(/<path\b([^>]+)>/g)].filter(([,attrs])=>!attrs.includes('d="M0 0h512v512H0z"')).map(([,attrs])=>{
  const d=/\bd="([^"]+)"/.exec(attrs)?.[1];if(!d)throw new Error('Missing path: '+id);
  return [d,icon.color];
 });
 if(!defs[id].length)throw new Error('Empty icon: '+id);
}
// Conventional controls use simple geometric marks at the same optical weight.
const controls={
 close:'M112 112L400 400M400 112L112 400',
 fullscreen:'M176 64H64V176M336 64H448V176M448 336V448H336M176 448H64V336',
 restore:'M64 176H176V64M336 64V176H448M448 336H336V448M176 448V336H64',
 zoomIn:'M112 256H400M256 112V400',zoomOut:'M112 256H400',
 previous:'M320 96L160 256L320 416',next:'M192 96L352 256L192 416'
};
for(const [id,d]of Object.entries(controls))defs[id]=[[d,'none','#e6d5aa']];
// Ignore retains a person silhouette, with an unmistakable red prohibition mark.
defs.ignore=[...defs.person.map(([d])=>[d,'#b9b2a2']),['M72 440L440 72','none','#ef806b']];
const generated='// BEGIN GENERATED ICONS — npm run icons:build\nconst GAME_ICON_DEFS='+JSON.stringify(defs)+';\n// END GENERATED ICONS';
const file=path.join(root,'client/game-icons.js');
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\/\/ BEGIN GENERATED ICONS[\s\S]*?\/\/ END GENERATED ICONS/,generated));
const credits=['VELDREN — INTERFACE ICON CREDITS','','Icons by '+[...new Set(Object.values(manifest.icons).map(i=>i.author))].join(', ')+'.',
 'Available on https://game-icons.net','Licensed under Creative Commons Attribution 3.0: '+manifest.licenseUrl,
 'Changes: recoloured for the game palette; backgrounds removed; elemental spell tier indicators added; Ignore combines a person with a prohibition mark.',
 'Original source: '+manifest.source+' at '+manifest.revision,
 'Close, fullscreen, resize, paging and zoom controls are simple geometric marks authored for Veldren.','',
 ...Object.entries(manifest.icons).map(([id,i])=>i.label+' ('+id+') — '+i.author+' — '+i.url)];
fs.mkdirSync(path.join(root,'client/assets/ui'),{recursive:true});
fs.writeFileSync(path.join(root,'client/assets/ui/CREDITS.txt'),credits.join('\n')+'\n');
console.log('Built '+Object.keys(defs).length+' shared icons from '+Object.keys(manifest.icons).length+' credited selections.');
