// Offline contact sheets at inventory/HUD sizes. Does not start a browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,Path2D}=require('@napi-rs/canvas');
const out=path.resolve(process.argv[2]||'/tmp/veldren-icon-review');fs.mkdirSync(out,{recursive:true});
const {ctx}=require('./benchmark-desktop.cjs');ctx.Path2D=Path2D;
ctx.document.createElement=()=>createCanvas(96,96);
vm.runInContext(fs.readFileSync('dist/item-models.js','utf8'),ctx);
vm.runInContext('setupExpandedWorld();',ctx);
async function sheet(entries,file){
 const columns=8,rows=Math.ceil(entries.length/columns),c=createCanvas(columns*150,rows*106+48),g=c.getContext('2d');
 g.fillStyle='#22221c';g.fillRect(0,0,c.width,c.height);g.font='17px sans-serif';g.fillStyle='#eee0bc';g.fillText('Veldren · '+file+' · 48px and 25px',12,30);
 for(const [i,{label,render}]of entries.entries()){
  const x=i%columns*150,y=Math.floor(i/columns)*106+46;g.fillStyle='#403b30';g.fillRect(x+4,y+2,142,100);
  const icon=await render();g.drawImage(icon,x+12,y+8,48,48);g.drawImage(icon,x+91,y+23,25,25);
  g.fillStyle='#f0e1b9';g.font='12px sans-serif';g.fillText(label,x+10,y+78,132);
 }
 fs.writeFileSync(path.join(out,file+'.png'),c.toBuffer('image/png'));
}
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('art/ui-icons/manifest.json'));
 const names=vm.runInContext('Object.keys(GAME_ICON_DEFS)',ctx);
 await sheet(names.map(id=>({label:manifest.icons[id]?.label||id,render:()=>loadImage(Buffer.from(vm.runInContext('gameIcon('+JSON.stringify(id)+')',ctx)))})),'interface');
 const spells=vm.runInContext('Object.entries(SPELLS)',ctx);
 await sheet(spells.map(([id,spell])=>({label:spell.name,render:()=>loadImage(Buffer.from(vm.runInContext('gameSpellIcon(SPELLS['+JSON.stringify(id)+'])',ctx)))})),'spells');
 const items=vm.runInContext('Object.entries(ITEMS)',ctx);
 for(let n=0;n<items.length;n+=64)await sheet(items.slice(n,n+64).map(([id,item])=>({label:item.name,render:()=>{const c=createCanvas(96,96);ctx.reviewCanvas=c;ctx.reviewItem=id;vm.runInContext('drawItemModelIcon(reviewCanvas.getContext("2d"),reviewItem)',ctx);return c;}})),'items-'+(1+n/64));
 console.log('Rendered '+names.length+' interface icons, '+spells.length+' spells and '+items.length+' item models to '+out);
})().catch(e=>{console.error(e);process.exitCode=1;});
