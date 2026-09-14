const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},remove:noop,focus:noop,querySelector:()=>null,classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},children:[],prepend(...children){this.children.unshift(...children)},append(...children){this.children.push(...children)},appendChild(child){this.children.push(child)},replaceChildren(...children){this.children=children},removeAttribute:noop,show(){this.open=true},querySelectorAll:()=>[],set innerHTML(value){this.children=[]},listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','trading','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','tree-identity','world-depth','organic-world','walk-in-world','world-style','building-orientation','assets/realms/monsters','assets/realms/approved-creatures','creatures'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(fs.readFileSync(root+'game-icons.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'equipment-interface.js','utf8'),ctx);

for(const f of ['world-options','map-icons','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters','briarhaven','guardian-spirits','game-audio'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8'),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'mountain-quest.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'main-story.js','utf8'),ctx);module.exports={ctx,vm,fs};
