const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
async function scenario({touch=false,portrait=false,support=true,reject=false}={}){let entered=0,exited=0,rotated=0;const elements=new Map(),events={},root={};const el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,open:false,textContent:'',listeners:{},setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn}});return elements.get(id);};const document={documentElement:root,fullscreenElement:null,body:{classList:{toggle(){}}},addEventListener(type,fn){events[type]=fn},async exitFullscreen(){exited++;document.fullscreenElement=null}};if(support)root.requestFullscreen=async()=>{entered++;if(reject)throw Error('denied');document.fullscreenElement=root;};
const context={document,navigator:{},window:{matchMedia:q=>({matches:q==='(pointer: coarse)'?touch:q==='(orientation: portrait)'?portrait:false}),screen:{orientation:{async lock(){rotated++}}}},$:el,requestAnimationFrame:fn=>fn(),resize(){},updateOrientation(){el('rotateScreen').hidden=!(touch&&portrait)}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/play-display.js','utf8'),context);
return {context,el,document,events,stats:()=>({entered,exited,rotated})};}
(async()=>{let s=await scenario({portrait:true});assert(s.el('rotateScreen').hidden,'portrait desktop remains playable');s.el('world').listeners.pointerdown();assert.equal(s.stats().entered,0,'desktop never forced fullscreen');await s.el('fullscreenButton').listeners.click();assert.equal(s.document.fullscreenElement,s.document.documentElement,'fullscreen includes menus and dialogs');await s.el('fullscreenButton').listeners.click();assert.equal(s.stats().exited,1);
s=await scenario({touch:true});await vm.runInContext('enterPlayFullscreen()',s.context);assert.equal(s.stats().entered,1);assert.equal(s.stats().rotated,1);assert.equal(s.el('fullscreenButton').textContent,'Exit fullscreen');
s=await scenario({touch:true,support:false});await vm.runInContext('enterPlayFullscreen()',s.context);assert.equal(s.el('displayNotice').hidden,false);assert.match(s.el('displayNotice').textContent,/available screen/);
s=await scenario({touch:true,reject:true});await vm.runInContext('enterPlayFullscreen()',s.context);assert.equal(s.el('displayNotice').hidden,false);assert.equal(s.document.fullscreenElement,null);console.log('PASS: desktop portrait, explicit fullscreen/exit, mobile activation, landscape request, unsupported and denied fallbacks.');})().catch(e=>{console.error(e);process.exitCode=1});
// Rotation listeners must be installed before initHud (asset/login completion).
{
 let portrait=true;const events={},media={},rotate={hidden:false};
 const c={window:{addEventListener:(name,fn)=>events[name]=fn,matchMedia:q=>({get matches(){return q==='(pointer: coarse)'||portrait;},addEventListener:(name,fn)=>media[q]=fn})},document:{body:{classList:{toggle(){}}}},$:()=>rotate,resize(){}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('dist/hud.js','utf8'),c);
 vm.runInContext('updateOrientation()',c);assert.equal(rotate.hidden,false);
 portrait=false;events.resize();assert.equal(rotate.hidden,true,'landscape unlocks before game initialization');
 portrait=true;events.orientationchange();assert.equal(rotate.hidden,false);
 portrait=false;media['(orientation: portrait)']();assert.equal(rotate.hidden,true,'orientation media changes also unlock');
 console.log('PASS: mobile rotation responds during startup without initHud.');
}
