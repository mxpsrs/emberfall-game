const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.Path2D=Path2D;ctx.assert=assert;
vm.runInContext(fs.readFileSync('dist/equipment-interface.js','utf8'),ctx);
vm.runInContext(`
const skillIcons=Object.values(SKILL_PANEL_ICONS);
assert.equal(new Set(skillIcons.map(n=>gameIcon(n))).size,skillIcons.length,'each skill has a distinct silhouette');
assert.notEqual(gameIcon('settings'),gameIcon(SKILL_PANEL_ICONS.Woodcutting));
assert.notEqual(gameIcon('tools'),gameIcon('settings'));
for(const icon of [...skillIcons,...Object.values(EQUIPMENT_EMPTY_ICONS),...Object.values(MAP_TUTOR_ICONS),...Object.values(SPIRIT_PANEL_ICONS),...Object.values(MAP_SERVICE_TYPES).map(v=>v[0])])assert(GAME_ICON_DEFS[icon],'known icon: '+icon);
const spellMarks=Object.values(SPELLS).map(gameSpellIcon);assert.equal(new Set(spellMarks).size,16,'element and tier distinguish all sixteen spells');
assert.equal(new Set(Object.values(SPIRIT_PANEL_ICONS)).size,4);
`,ctx);
ctx.document.createElement=()=>createCanvas(32,32);
(async()=>{
 const names=vm.runInContext('Object.keys(GAME_ICON_DEFS)',ctx);
 for(const name of names)for(const size of [16,25,32]){
  const native=createCanvas(size,size),svg=createCanvas(size,size);ctx.iconCanvas=native;ctx.iconName=name;ctx.iconSize=size;
  vm.runInContext('drawGameIcon(iconCanvas.getContext("2d"),iconName,0,0,iconSize)',ctx);
  svg.getContext('2d').drawImage(await loadImage(Buffer.from(vm.runInContext('gameIcon(iconName)',ctx).replace('<svg ','<svg width="'+size+'" height="'+size+'" '))),0,0,size,size);
  const a=native.getContext('2d').getImageData(0,0,size,size).data,b=svg.getContext('2d').getImageData(0,0,size,size).data;let union=0,intersection=0;
  for(let i=3;i<a.length;i+=4){if(a[i]>64||b[i]>64)union++;if(a[i]>64&&b[i]>64)intersection++;}
  assert(union>=10,name+' visible at '+size+'px');assert(intersection/union>.90,name+' canvas map matches its SVG at '+size+'px');
 }
 assert(vm.runInContext('gameIconBitmaps.size<=128',ctx),'map icon cache stays bounded');
 console.log('PASS: distinct skill/settings/tool symbols; every slot, service and spirit resolves; 16 spell variants; '+names.length+' icons agree in SVG/canvas at 16, 25 and 32 pixels with a bounded cache.');
})().catch(e=>{console.error(e);process.exitCode=1;});
