const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dist=path.join(__dirname,'../dist');

function element(tagName='DIV'){
 const children=[],listeners={};
 return {tagName,children,listeners,style:{},dataset:{},value:'',hidden:false,checked:true,disabled:false,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
  append(...items){children.push(...items)},appendChild(item){children.push(item)},
  replaceChildren(...items){children.splice(0,children.length,...items)},
  setAttribute(){},removeAttribute(){},setPointerCapture(){},releasePointerCapture(){},
  getBoundingClientRect(){return {left:0,top:0,width:800,height:390}},
  get options(){return children},get firstChild(){return children[0]},
  closest(selector){return /input|textarea|select|contenteditable/.test(selector)&&['INPUT','TEXTAREA','SELECT'].includes(tagName)?this:null},
  click(){return this.onclick?.()},
  set innerHTML(html){children.length=0;if(html.includes('<span'))children.push(element('SPAN'),element('SPAN'),element('SMALL'))}
 };
}
function dispatch(node,type,event){for(const handler of node.listeners[type]||[])handler(event)}
function pointer(x,y,button=0){return {pointerId:4,button,clientX:x,clientY:y,target:world,preventDefault(){},stopImmediatePropagation(){}}}
const world=element('CANVAS'),childElements=new Map([['world',world]]),parentElements=new Map();
const terrain={version:1,scenes:{overworld:{heightNodes:[],paintCells:[]}}};
let savedDoc={version:1,revision:4,changes:[{scene:'overworld',kind:'object',id:'existing',x:1,y:2,rotation:0,scale:1}],terrain};
let revision=4,putCount=0,lastPut=null;
const parentWindow={listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}};
const parentDocument={listeners:{},activeElement:null,
 getElementById(id){if(!parentElements.has(id))parentElements.set(id,element());return parentElements.get(id)},
 createElement:element,addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}};
for(const [id,value] of [['terrainMode','raise'],['terrainRadius','3'],['terrainStrength','0.5'],['terrainMaterial','grass']])parentDocument.getElementById(id).value=value;
const parent={console,window:parentWindow,document:parentDocument,location:{origin:'https://example.test'},
 setTimeout(){},setInterval(){return 1},clearInterval(){},Date,
 Option:function Option(label,value){return Object.assign(element('OPTION'),{textContent:label,value})},confirm(){return true}};

const childDocument={listeners:{},body:element(),head:element(),hidden:false,
 getElementById(id){if(id==='veldrenEditorUiIsolation')return null;if(!childElements.has(id))childElements.set(id,element());return childElements.get(id)},
 querySelector(){return null},createElement:element,addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}};
const childWindow={listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}};
const child={console,window:childWindow,document:childDocument,location:{origin:'https://example.test'},
 parent:{postMessage(message){dispatch(parentWindow,'message',{origin:parent.location.origin,source:childWindow,data:message})}},
 performance:{now:()=>0},requestAnimationFrame(){},setInterval(){return 1},clearInterval(){},
 localStorage:{getItem(){return null},setItem(){}},
 fetch:async (url,options={})=>{
  if(options.method==='PUT'){
   lastPut=JSON.parse(options.body);assert.equal(lastPut.expectedRevision,revision,'CAS includes current saved revision');
   putCount++;revision++;savedDoc={version:1,revision,changes:lastPut.changes,terrain:lastPut.terrain};
   return response({revision,count:savedDoc.changes.length,sha256:'digest-'+revision,bytes:JSON.stringify(savedDoc).length,path:'editor-data/world-edits.json'});
  }
  assert(String(url).startsWith('/api/editor/edits'));
  return response({revision,count:savedDoc.changes.length,sha256:'digest-'+revision,bytes:JSON.stringify(savedDoc).length,path:'editor-data/world-edits.json',edits:savedDoc});
 },
 VeldrenAssembly:{History:class{}},VeldrenBuildings:{catalog(){return []}},
 assetsReady:true,worldScenes:{overworld:{objects:[],buildings:[]}},objects:[],buildings:[],currentScene:'overworld',
 px:100,py:100,s:{x:100,y:100,character:null},screen:{w:800,h:390},view3d:{yaw:0,tilt:.4,zoom:110,min:58,max:132},
 draw3d(){},draw(){},unproject3(sx,sy){return {x:120+(sx-200)/20,z:120+(sy-180)/20}},
 worldWaterSurface(){return false},landHeight(x,z){return 5+(childWindow.VeldrenTerrainEdits?.heightDelta(Math.round(x),Math.round(z))||0)},
 stop(){},resize(){},realmNavigation:new Map(),miniTerrain:null};
function response(data){return {ok:true,json:async()=>data}}
childWindow.VeldrenBuildings=child.VeldrenBuildings;
childWindow.VeldrenWorldEdits={validate(){return true},applyDocument(doc){childWindow.VeldrenTerrainEdits.applyDocument(doc.terrain);return {applied:doc.changes.length,unmatched:0,rejected:0}}};
parentDocument.getElementById('gameFrame').contentWindow=childWindow;
vm.createContext(child);vm.createContext(parent);
for(const file of ['terrain-editor-runtime.js','editor/editor-runtime.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),child,{filename:file});
vm.runInContext(fs.readFileSync(path.join(dist,'editor/editor.js'),'utf8'),parent,{filename:'editor.js'});

(async()=>{
 await childWindow.VeldrenEditorBridge.initialize();
 await new Promise(resolve=>setImmediate(resolve));
 const bridge=childWindow.VeldrenEditorBridge;
 parentDocument.getElementById('terrainTool').onclick();
 assert.equal(parentDocument.getElementById('terrainPanel').hidden,false,'toolbar displays terrain controls');
 const start=child.landHeight(120,120);
 dispatch(childDocument,'pointerdown',pointer(200,180));
 const firstStampRevision=childWindow.VeldrenTerrainEdits.revision;
 for(let i=0;i<20;i++)dispatch(childDocument,'pointermove',pointer(200,180));
 assert.equal(childWindow.VeldrenTerrainEdits.revision,firstStampRevision,'stationary pointer events do not reapply the brush');
 dispatch(childDocument,'pointermove',pointer(400,180));
 dispatch(childDocument,'pointerup',pointer(400,180));
 assert(child.landHeight(120,120)>start,'canvas brush drag sculpts live terrain');
 assert(child.landHeight(125,120)>5,'long drag fills intermediate terrain without gaps');
 assert.equal(bridge.terrainState().undo,1,'whole drag is one undo step');
 assert.equal(parentDocument.getElementById('saveState').textContent,'Unsaved changes','terrain stroke marks editor dirty');
 const sculpted=child.landHeight(120,120);
 parentDocument.getElementById('terrainUndo').onclick();
 assert.equal(child.landHeight(120,120),start,'undo reverses the sculpt');
 parentDocument.getElementById('terrainRedo').onclick();
 assert.equal(child.landHeight(120,120),sculpted,'redo restores the sculpt');
 parentDocument.getElementById('terrainMode').value='paint';
 parentDocument.getElementById('terrainMaterial').value='stone';
 dispatch(parentDocument.getElementById('terrainMode'),'input',{});
 dispatch(childDocument,'pointerdown',pointer(200,180));
 dispatch(childDocument,'pointerup',pointer(200,180));
 assert.equal(childWindow.VeldrenTerrainEdits.paint(120,120),'stone','paint control passes material to renderer layer');
 const touch=(id,x,y)=>({...pointer(x,y),pointerId:id,pointerType:'touch'});
 const beforeGesture=JSON.stringify(childWindow.VeldrenTerrainEdits.serialize());
 dispatch(childDocument,'pointerdown',touch(8,300,220));
 assert.equal(JSON.stringify(childWindow.VeldrenTerrainEdits.serialize()),beforeGesture,'first touch waits for a gesture or tap');
 dispatch(childDocument,'pointerdown',touch(9,400,220));
 const beforePan=bridge.cameraState().x;
 dispatch(childDocument,'pointermove',touch(8,320,220));
 dispatch(childDocument,'pointermove',touch(9,420,220));
 assert.equal(JSON.stringify(childWindow.VeldrenTerrainEdits.serialize()),beforeGesture,'two-finger navigation cannot paint terrain');
 assert(bridge.cameraState().x<beforePan,'two-finger navigation pans while Terrain is selected');
 dispatch(childDocument,'pointerup',touch(8,320,220));
 dispatch(childDocument,'pointerup',touch(9,420,220));
 dispatch(childDocument,'pointerdown',touch(10,380,300));
 dispatch(childDocument,'pointerup',touch(10,380,300));
 assert.equal(childWindow.VeldrenTerrainEdits.paint(129,126),'stone','single-finger tap still paints terrain');
 const beforeCancel=JSON.stringify(childWindow.VeldrenTerrainEdits.serialize());
 dispatch(childDocument,'pointerdown',touch(11,300,300));
 dispatch(childDocument,'pointercancel',{...touch(11,300,300),type:'pointercancel'});
 assert.equal(JSON.stringify(childWindow.VeldrenTerrainEdits.serialize()),beforeCancel,'cancelled touch does not paint');
 await parentDocument.getElementById('saveWorld').onclick();
 assert.equal(putCount,1,'Save World performs one guarded API write');
 assert.equal(lastPut.changes.length,1,'existing world edit survives terrain save');
 assert.equal(lastPut.changes[0].id,'existing');
 assert(lastPut.terrain.scenes.overworld.heightNodes.length>0);
 assert(lastPut.terrain.scenes.overworld.paintCells.some(cell=>cell.material==='stone'));
 assert.equal(parentDocument.getElementById('saveState').textContent,'Saved + verified','reread confirms saved terrain');
 childWindow.VeldrenTerrainEdits.reset();assert.equal(childWindow.VeldrenTerrainEdits.paint(120,120),null);
 childWindow.VeldrenTerrainEdits.applyDocument(savedDoc.terrain);
 assert.equal(child.landHeight(120,120),sculpted,'reloaded saved layer restores height');
 assert.equal(childWindow.VeldrenTerrainEdits.paint(120,120),'stone','reloaded saved layer restores material');
 console.log('PASS: parent Terrain UI, pointer sculpt/paint, undo/redo, dirty state, CAS Save World, verified reread and saved terrain reload.');
})().catch(error=>{console.error(error);process.exitCode=1});
