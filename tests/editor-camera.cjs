const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dist=path.join(__dirname,'../dist/editor');
const object={id:'test-prop',name:'Test prop',type:'prop',x:47,y:50,homeX:47,homeY:50,drawX:47,drawY:50};
const worldObjects=[object],messages=[];
let navResets=0,landResets=0;

function element(tagName='DIV'){
 const children=[],listeners={};
 const node={tagName,children,listeners,style:{},dataset:{},value:'',checked:true,hidden:false,disabled:false,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(name,handler){(listeners[name]??=[]).push(handler)},
  append(...items){children.push(...items)},appendChild(item){children.push(item)},
  replaceChildren(...items){children.splice(0,children.length,...items)},
  setAttribute(){},removeAttribute(){},focus(){},setPointerCapture(){},releasePointerCapture(){},
  closest(selector){return /input|textarea|select|contenteditable/.test(selector)&&['INPUT','TEXTAREA','SELECT'].includes(tagName)?this:null},
  getBoundingClientRect(){return {left:0,top:0,width:800,height:390}},
  get options(){return children},
  get firstChild(){return children[0]},
  click(){this.onclick?.()},
  set innerHTML(html){children.length=0;if(html.includes('<span'))children.push(element('SPAN'),element('SPAN'),element('SMALL'))}
 };
 return node;
}
function dispatch(target,name,event){for(const handler of target.listeners[name]||[])handler(event)}
function key(key,target=element('BUTTON')){return {key,target,prevented:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){}}}

const world=element('CANVAS'),childNodes=new Map([['world',world]]),childFrames=[],childTimers=[];
const childDocument={listeners:{},head:element(),body:element(),hidden:false,
 getElementById(id){if(id==='veldrenEditorUiIsolation')return null;if(!childNodes.has(id))childNodes.set(id,element());return childNodes.get(id)},
 querySelector(){return null},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)},createElement:element};
const childWindow={listeners:{},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
const child={console,window:childWindow,document:childDocument,location:{origin:'https://example.test'},
 performance:{now:()=>0},requestAnimationFrame(fn){childFrames.push(fn)},setInterval(fn){childTimers.push(fn);return childTimers.length},clearInterval(){},
 localStorage:{getItem(){return null},setItem(){}},parent:{postMessage(message){messages.push(message)}},
 fetch:async()=>({ok:true,json:async()=>({revision:1,edits:{version:1,revision:1,changes:[]},count:0})}),
 VeldrenAssembly:{History:class{}},VeldrenBuildings:{},VeldrenWorldEdits:{applyDocument(){return {applied:0,unmatched:0,rejected:0}}},
 assetsReady:true,worldScenes:{overworld:{objects:worldObjects,buildings:[]}},objects:worldObjects,buildings:[],currentScene:'overworld',
 worldObjectRevision:0,worldObjectIndex:{revision:0,scene:'overworld',length:1,actors:[],buckets:new Map([['2:3',[object]]]),order:new Map([[object,0]]),byId:new Map([['test-prop',object]])},
 realmNavigation:{clear(){navResets++}},resetLandSurface(){landResets++},miniTerrain:null,cameraZoom3(){return 100},
 px:40,py:50,s:{x:40,y:50,character:null},screen:{w:800,h:390},view3d:{yaw:0,tilt:.4,zoom:110,min:58,max:132},
 draw3d(){},draw(){},unproject3(sx,sy){return {x:child.px+sx/10,z:child.py+sy/10}},
 stop(){},resize(){},target:null};
childWindow.VeldrenBuildings=child.VeldrenBuildings;
childWindow.VeldrenWorldEdits=child.VeldrenWorldEdits;
childWindow.matchMedia=()=>({matches:false});
vm.createContext(child);
vm.runInContext(fs.readFileSync(path.join(dist,'../terrain-editor-runtime.js'),'utf8'),child,{filename:'terrain-editor-runtime.js'});
vm.runInContext(fs.readFileSync(path.join(dist,'editor-runtime.js'),'utf8'),child,{filename:'editor-runtime.js'});

const parentNodes=new Map(),parentDocument={activeElement:null,listeners:{},
 getElementById(id){if(!parentNodes.has(id))parentNodes.set(id,element());return parentNodes.get(id)},
 createElement:element,addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
const parentWindow={listeners:{},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
const parent={console,document:parentDocument,window:parentWindow,location:{origin:'https://example.test'},
 setTimeout(){},setInterval(){return 1},clearInterval(){},Date,Option:function Option(name,value){return Object.assign(element('OPTION'),{textContent:name,value})},confirm:()=>true};
parentDocument.getElementById('gameFrame').contentWindow=childWindow;
vm.createContext(parent);
vm.runInContext(fs.readFileSync(path.join(dist,'editor.js'),'utf8'),parent,{filename:'editor.js'});

(async()=>{
 const originalFetch=child.fetch;let resolveRead,readCount=0;
 child.fetch=()=>{readCount++;return new Promise(resolve=>{resolveRead=resolve})};
 const first=childWindow.VeldrenEditorBridge.initialize();
 const second=childWindow.VeldrenEditorBridge.initialize();
 childTimers[0]();
 assert.equal(readCount,1,'overlapping startup requests share one project read');
 assert.equal(childDocument.listeners.pointerdown,undefined,'input is not installed before project read');
 resolveRead(await originalFetch());await Promise.all([first,second]);await new Promise(resolve=>setImmediate(resolve));
 child.fetch=originalFetch;
 assert.equal(childDocument.listeners.pointerdown.length,1,'only one pointer handler is installed');
 assert.equal(childDocument.listeners.keydown.length,1,'only one keyboard handler is installed');
 assert.equal(childFrames.filter(fn=>fn.name==='cameraTick').length,1,'only one camera animation loop is started');
 dispatch(parentWindow,'message',{origin:parent.location.origin,source:childWindow,data:{type:'veldren-editor-ready'}});
 await new Promise(resolve=>setImmediate(resolve));
 const bridge=childWindow.VeldrenEditorBridge,tick=now=>{const fn=childFrames.shift();assert.equal(typeof fn,'function');fn(now)};
 const toolbar=parentDocument.getElementById('moveTool');parentDocument.activeElement=toolbar;
 const start=bridge.cameraState();
 const down=key('w',toolbar);dispatch(parentWindow,'keydown',down);assert(down.prevented,'toolbar focus forwards W');
 assert.equal(parentDocument.getElementById('modeBadge').textContent,undefined,'W cannot switch to Move');
 tick(100);tick(200);assert(bridge.cameraState().y<start.y,'W moves camera from outer toolbar');
 dispatch(parentWindow,'keyup',key('w',toolbar));
 const stopAt=bridge.cameraState().y;tick(600);assert(stopAt-bridge.cameraState().y<2,'release stops forward travel');
 const zoom=bridge.cameraState().zoom;dispatch(parentWindow,'keydown',key('e',toolbar));tick(700);
 assert(bridge.cameraState().zoom>zoom,'E zooms instead of switching to Rotate');
 dispatch(parentWindow,'keyup',key('e',toolbar));
 const input=element('INPUT');parentDocument.activeElement=input;dispatch(parentWindow,'keydown',key('w',input));const still=bridge.cameraState().y;tick(800);assert(Math.abs(bridge.cameraState().y-still)<1,'typing in fields does not navigate');
 parentDocument.activeElement=toolbar;dispatch(parentWindow,'keydown',key('d',toolbar));dispatch(parentWindow,'blur',{});const beforeBlur=bridge.cameraState().x;tick(900);assert.equal(bridge.cameraState().x,beforeBlur,'blur clears held movement');
 const pointer=(type,x,y,button=1)=>({pointerId:1,button,clientX:x,clientY:y,target:world,preventDefault(){},stopImmediatePropagation(){}});
 const beforePan=bridge.cameraState().x;dispatch(childDocument,'pointerdown',pointer('pointerdown',300,200));dispatch(childDocument,'pointermove',pointer('pointermove',320,200));dispatch(childDocument,'pointerup',pointer('pointerup',320,200));
 assert(bridge.cameraState().x<beforePan,'middle drag pans the editor viewport');
 const filamentOverlay=element('CANVAS');filamentOverlay.classList.contains=name=>name==='realm-surface';
 const beforeOverlay=bridge.cameraState().x;
 dispatch(childDocument,'pointerdown',{...pointer('pointerdown',300,200),target:filamentOverlay});
 dispatch(childDocument,'pointermove',{...pointer('pointermove',320,200),target:filamentOverlay});
 dispatch(childDocument,'pointerup',{...pointer('pointerup',320,200),target:filamentOverlay});
 assert(bridge.cameraState().x<beforeOverlay,'renderer surface receives editor navigation');
 bridge.setTool('camera');
 const touch=(id,x,y)=>({...pointer('touch',x,y,0),pointerId:id,pointerType:'touch'});
 const beforeTouch=bridge.cameraState();
 dispatch(childDocument,'pointerdown',touch(11,300,200));
 dispatch(childDocument,'pointerdown',touch(12,400,200));
 dispatch(childDocument,'pointermove',touch(11,320,200));
 dispatch(childDocument,'pointermove',touch(12,420,200));
 assert(bridge.cameraState().x<beforeTouch.x,'two-finger touch drag pans the editor');
 dispatch(childDocument,'pointermove',touch(12,500,200));tick(950);
 assert(bridge.cameraState().zoom>beforeTouch.zoom,'two-finger pinch zooms the editor');
 dispatch(childDocument,'pointerup',touch(11,320,200));
 dispatch(childDocument,'pointerup',touch(12,500,200));
 bridge.setTool('select');
 dispatch(childDocument,'keydown',key('s',world));tick(1000);const ownKey=bridge.cameraState().y;assert(ownKey>still,'iframe key input still works');dispatch(childDocument,'keyup',key('s',world));
 // The selection remains visible as it crosses spatial buckets, and expensive
 // terrain/navigation and outer hierarchy updates occur once when drag ends.
 bridge.clearCameraKeys();bridge.setTool('select');
 child.unproject3=(sx,sy)=>({x:child.px+sx/10,z:child.py+sy/10});
 const fromX=Math.round((object.x+.5-bridge.cameraState().x)*10);
 const fromY=Math.round((object.y+.5-bridge.cameraState().y)*10);
 const dragDown=pointer('pointerdown',fromX,fromY,0);dispatch(childDocument,'pointerdown',dragDown);
 assert.equal(bridge.getSelection()?.id,'test-prop','selects the real object from canvas');
 messages.length=0;
 dispatch(childDocument,'pointermove',pointer('pointermove',fromX+10,fromY,0));
 dispatch(childDocument,'pointermove',pointer('pointermove',fromX+20,fromY,0));
 assert.equal(navResets,0,'navigation is not rebuilt for preview positions');
 assert.equal(landResets,0,'terrain is not regenerated for preview positions');
 assert.equal(messages.filter(m=>m.type==='veldren-editor-change').length,0,'no hierarchy rebuild during drag');
 assert.equal(child.worldObjectIndex.buckets.get('3:3')?.[0],object,'static prop remains indexed after crossing bucket');
 dispatch(childDocument,'pointerup',pointer('pointerup',fromX+20,fromY,0));
 assert.equal(navResets,1,'navigation invalidated at release');
 assert.equal(landResets,1,'terrain invalidated at release');
 assert.equal(messages.filter(m=>m.type==='veldren-editor-change').length,1,'outer hierarchy updates once');
 assert(bridge.exportEdits().changes.some(c=>c.id==='test-prop'&&c.x===object.x),'final transform persisted in editor layer');
 const originalX=object.x,originalY=object.y,atX=(object.x+.5-bridge.cameraState().x)*10,atY=(object.y+.5-bridge.cameraState().y)*10;
 dispatch(childDocument,'pointerdown',touch(21,atX,atY));
 dispatch(childDocument,'pointermove',touch(21,atX+20,atY));
 assert(object.x>originalX,'one-finger object drag previews movement');
 dispatch(childDocument,'pointerdown',touch(22,atX+100,atY));
 assert.equal(object.x,originalX,'second touch rolls back an uncommitted object drag');
 assert.equal(object.y,originalY,'second touch preserves the original object position');
 dispatch(childDocument,'pointerup',touch(21,atX+20,atY));
 dispatch(childDocument,'pointerup',touch(22,atX+100,atY));
 console.log('PASS: editor camera navigation survives toolbar focus; pan, keyboard release, text fields and drag batching work.');
})().catch(error=>{console.error(error);process.exitCode=1});
