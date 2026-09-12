// Frontend CPU work and GPU submission counts, with no browser layout or GPU execution.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=process.env.EMBERFALL_BENCH_ROOT||__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({drawImage(source){if(source?.className==='realm-surface')counters.images++;}},{get:(o,k)=>o[k]||noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance,setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','tree-identity','world-depth','organic-world','walk-in-world','world-style','building-orientation','assets/realms/monsters','assets/realms/bosses','assets/realms/approved-creatures','creatures'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});


const counters={static:0,dynamic:0,bytes:0,vertices:0,draws:0,images:0};let enumId=1;const enums={};
const gl=new Proxy({getParameter:()=> 'WebGL 1.0 benchmark',getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:(p,n)=>['aPosition','aNormal','aColor','aMaterial','aUV'].indexOf(n),getUniformLocation:(p,n)=>n,checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,isContextLost:()=>false,
bufferData:(target,data,usage)=>{counters[usage===gl.STATIC_DRAW?'static':'dynamic']++;counters.bytes+=data.byteLength;},drawArrays:(type,start,count)=>{counters.draws++;counters.vertices+=count},createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),createFramebuffer:()=>({}),createRenderbuffer:()=>({})},{get:(o,k)=>o[k]||(k===k.toUpperCase()?(enums[k]??=enumId++):noop)});
const oldCreate=ctx.document.createElement;ctx.document.createElement=()=>{const e=oldCreate();e.getContext=type=>type==='webgl'?gl:new Proxy({},{get:()=>noop});return e;};ctx.counters=counters;ctx.mode=process.argv[2]||'desktop';
module.exports={ctx,counters,els,gl};
if(require.main===module)vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;s.character={name:'Benchmark',look:0,frame:'male',hair:0};s.tutorial=tutorialSteps.length;s.worldClock=120;
const profile={};
if(mode==='profile'){for(const key of ['creature3','prop3','drawRealmCrossings','buildingHull3','realmTerrainEntries']){const fn=globalThis[key];globalThis[key]=function(...args){const label=key+((key==='creature3'||key==='prop3')?':'+(args[1].kind||args[1].type):'');const start=performance.now(),value=fn(...args);profile[label]=(profile[label]||0)+performance.now()-start;return value;};}}
const town=SETTLEMENTS.find(t=>t.kind==='city');
const cases=mode==='4k'?[[3840,2160,14,42,51,'4K wide village']]:mode!=='phone'?[[1920,1080,34,42,51,'desktop village'],[1920,1080,14,42,51,'desktop wide village'],[1920,1080,14,town.x,town.y,'desktop city']]:[[1112,512,34,42,51,'phone village']];
for(const [w,h,zoom,x,z,label]of (['orbit','profile','run'].includes(mode)?cases.slice(0,1):cases)){activateScene('overworld',x,z);screen={w,h};view3d.zoom=zoom;const samples=[];
 for(let i=0;i<(mode==='run'?72:7);i++){for(const k of Object.keys(counters))counters[k]=0;for(const k of Object.keys(profile))profile[k]=0;time+=1/60;if(mode==='orbit')view3d.yaw+=.04;if(mode==='run'){playerMotion.moving=true;playerMotion.blend=1;playerMotion.running=true;playerMotion.phase=(i/24)%1;px+=.035;playerMotion.heading=Math.PI/2;}const start=performance.now();draw3d();samples.push({ms:Math.round((performance.now()-start)*10)/10,...counters,...(mode==='profile'?{profile:{...profile}}: {})});}
 console.log(JSON.stringify({label,samples,cache:{buildings:staticMeshQueues3.building.size,props:staticMeshQueues3.prop.size}}));
}
`,ctx);
