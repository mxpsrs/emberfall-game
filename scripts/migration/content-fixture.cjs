// Build-time extraction only. No JavaScript runtime is added to Vervesis.
const fs=require('node:fs'),path=require('node:path');
const fixture=path.resolve(__dirname,'../game-fixture.cjs'),source=fs.readFileSync(fixture,'utf8');
const marker="for(const f of ['cloud'";
if(!source.includes(marker))throw Error('Review DOM fixture changes before asset recovery');
const {ctx,vm}=new Function('require','__dirname',source.slice(0,source.indexOf(marker))+';return {ctx,vm};')(require,path.dirname(fixture));
Object.assign(ctx,{navigator:{userAgent:'Veldren content recovery',standalone:false},location:{origin:'https://migration.invalid',hostname:'migration.invalid',protocol:'https:',pathname:'/'},devicePixelRatio:1,innerWidth:800,innerHeight:600,setInterval:()=>0,clearInterval:()=>{},AbortSignal,URL,TextEncoder,TextDecoder,fetch:()=>{throw Error('Network forbidden during content recovery');}});
ctx.window.setTimeout=ctx.setTimeout;ctx.window.requestAnimationFrame=ctx.requestAnimationFrame;
const root=path.resolve(__dirname,'../../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const omitted=new Set(['startup.js','asset-manager.js','maintenance.js']);
const scriptOrder=[...html.matchAll(/<script[^>]*src=["']([^"']+)/g)].map(m=>m[1]);
for(const file of scriptOrder){
 if(omitted.has(file))continue;
 const code=fs.readFileSync(path.join(root,file),'utf8').replace(/boot\(\);\s*$/,'');
 vm.runInContext(code,ctx,{filename:file});
 if(file==='game.js')vm.runInContext('boot=()=>{};',ctx);
}
module.exports={ctx,vm,fs,scriptOrder,omitted:[...omitted]};
