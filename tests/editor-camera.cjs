const assert=require('node:assert/strict');
const fs=require('node:fs');
const editorRuntimeSource=fs.readFileSync(require('node:path').join(__dirname,'../dist/editor/editor-runtime.js'),'utf8');
assert.match(editorRuntimeSource,/if\(ready&&typeof draw3d==='function'&&!draw3d\.__editorCamera\)installCameraRendering\(\)/,'free-camera wrapper is restored if renderer code replaces draw3d after editor startup');
const vm=require('node:vm');
const path=require('node:path');
const dist=path.join(__dirname,'../dist/editor');
const object={id:'test-prop',name:'Test prop',type:'prop',x:47,y:50,homeX:47,homeY:50,drawX:47,drawY:50};
const worldObjects=[object],messages=[],createdNodes=[];
const worldDocument={format:'veldren.world',version:2,revision:1,updatedAt:null,scenes:[{format:'veldren.scene',version:2,scene:'overworld',entities:[{id:'overworld:lamp:main',name:'Scene lantern',parent:null,active:true,transform:{position:[47,0,50],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'briar:previewHouse',visible:true}},metadata:{}}]}]};
let navResets=0,landResets=0;

function element(tagName='DIV'){
 const children=[],listeners={};
 const node={tagName,children,listeners,style:{},dataset:{},value:'',checked:true,hidden:false,disabled:false,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(name,handler){(listeners[name]??=[]).push(handler)},
  append(...items){children.push(...items);for(const item of items)item.isConnected=true},appendChild(item){children.push(item);item.isConnected=true},
  replaceChildren(...items){children.splice(0,children.length,...items)},
  setAttribute(){},removeAttribute(){},focus(){},setPointerCapture(){},releasePointerCapture(){},
  closest(selector){return /input|textarea|select|contenteditable/.test(selector)&&['INPUT','TEXTAREA','SELECT'].includes(tagName)?this:null},
  getBoundingClientRect(){return {left:0,top:0,width:800,height:390}},
  getContext(){return this._context??=(Object.assign({calls:[],drawImageArgs:[],clearRect(){this.calls.push('clear')},fillRect(){this.calls.push('fillRect')},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){this.calls.push('fill')},stroke(){this.calls.push('stroke')},drawImage(...args){this.calls.push('image');this.drawImageArgs.push(args)},save(){},restore(){},clip(){},setTransform(){}},{}))},
  get options(){return children},
  get firstChild(){return children[0]},
  click(){this.onclick?.()},
  set innerHTML(html){children.length=0;if(html.includes('<span'))children.push(element('SPAN'),element('SPAN'),element('SMALL'))}
 };
 createdNodes.push(node);return node;
}
function dispatch(target,name,event){for(const handler of target.listeners[name]||[])handler(event)}
function key(key,target=element('BUTTON')){return {key,target,prevented:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){}}}

const world=element('CANVAS'),childNodes=new Map([['world',world]]),childFrames=[],childTimers=[];
const childDocument={listeners:{},head:element(),body:element(),hidden:false,
 getElementById(id){if(id==='veldrenEditorUiIsolation')return null;if(!childNodes.has(id))childNodes.set(id,element());return childNodes.get(id)},
 querySelector(){return null},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)},createElement:element};
const childWindow={listeners:{},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
childWindow.VELDREN_CONTEXT='editor';
let savedDocument=null,savedMeta=null;
const child={console,window:childWindow,document:childDocument,location:{origin:'https://example.test'},
 performance:{now:()=>0},requestAnimationFrame(fn){childFrames.push(fn)},setInterval(fn){childTimers.push(fn);return childTimers.length},clearInterval(){},
 localStorage:{getItem(){return null},setItem(){}},parent:{postMessage(message){messages.push(message)}},
 fetch:async(url='',options={})=>{
  if(options.method==='PUT'){
   const input=JSON.parse(options.body);assert.equal(input.format,'veldren.world','editor saves the canonical version 2 scene document');assert.equal(input.expectedRevision,1);
   savedDocument=JSON.parse(JSON.stringify(input));delete savedDocument.expectedRevision;savedDocument.revision=2;savedDocument.updatedAt='2026-09-25T00:00:00.000Z';
   const edits=childWindow.VeldrenSceneFormat.toLegacy(savedDocument);savedMeta={revision:2,count:edits.changes.length,path:'world scene',bytes:100,sha256:'edits-sha',runtimeSha256:'edits-sha',worldSha256:'scene-sha',updatedAt:savedDocument.updatedAt,world:savedDocument,edits};
   return {ok:true,json:async()=>savedMeta};
  }
  if(url.includes('verify='))return {ok:true,json:async()=>savedMeta};
  const edits=childWindow.VeldrenSceneFormat.toLegacy(worldDocument);return {ok:true,json:async()=>({revision:1,world:JSON.parse(JSON.stringify(worldDocument)),edits,count:edits.changes.length,path:'world scene',bytes:100,sha256:'edits-sha'})};
 },
 VeldrenAssembly:{History:class{}},VeldrenBuildings:{},VeldrenWorldEdits:null,
 assetsReady:true,worldScenes:{overworld:{objects:worldObjects,buildings:[]}},objects:worldObjects,buildings:[],currentScene:'overworld',
 REALM_ATLAS_IMAGE:{complete:true,width:4096,height:4096},briarModels:{previewHouse:{p:new Float32Array([0,0,0,1,0,0,0,2,0]),n:new Float32Array([0,0,1,0,0,1,0,0,1]),c:new Float32Array([.7,.2,.1,.7,.2,.1,.7,.2,.1]),uv:new Float32Array([0,0,1,0,0,1]),t:new Uint8Array([20,20,20]),i:Uint16Array.from({length:3000},(_,i)=>i%3),bounds:[[0,0,0],[1,2,0]]}},
 worldObjectRevision:0,worldObjectIndex:{revision:0,scene:'overworld',length:1,actors:[],buckets:new Map([['2:3',[object]]]),order:new Map([[object,0]]),byId:new Map([['test-prop',object]])},
 realmNavigation:{clear(){navResets++}},resetLandSurface(){landResets++},miniTerrain:null,cameraZoom3(){return 100},
 px:40,py:50,s:{x:40,y:50,character:null},screen:{w:800,h:390},view3d:{yaw:0,tilt:.4,zoom:110,min:58,max:132},
 prop3(){},briarTransform(){return []},briarEmit(r,mesh){r.face(mesh.p,'#fff')},draw3d(){},draw(){},unproject3(sx,sy){return {x:child.px+sx/10,z:child.py+sy/10}},
 stop(){},resize(){},target:null};
childWindow.realmNative={scenes:{componentIds:()=>[],entity:()=>null}};
child.createVeldrenEditorCommands=()=>({transaction:(_label,fn)=>fn(),saved(){},block(){},active:false});
childWindow.VeldrenBuildings=child.VeldrenBuildings;
childWindow.matchMedia=()=>({matches:false});
vm.createContext(child);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/world-scene-format.js'),'utf8'),child,{filename:'world-scene-format.js'});
childWindow.VeldrenSceneFormat=child.VeldrenSceneFormat;
function refreshSceneRenderables(world,sceneName){
 const records=childWindow.VeldrenSceneFormat.renderables(world).filter(item=>sceneName==null||item.scene===String(sceneName));
 for(const record of records){const scene=child.worldScenes[record.scene];if(!scene)continue;let item=scene.objects.find(candidate=>candidate._sceneEntityId===record.id);if(!item){item={id:record.id,_sceneEntityId:record.id,type:'prop',dead:0,hitAt:-100,attackAt:-100,walkThrough:true};scene.objects.push(item);if(record.scene===child.currentScene&&!child.objects.includes(item))child.objects.push(item)}Object.assign(item,{name:record.name,x:record.x,y:record.y,homeX:record.x,homeY:record.y,drawX:record.x,drawY:record.y,editorAsset:record.asset,editorTransform:{rotation:record.rotation,scale:record.scale}})}
 const ids=new Set(records.map(item=>item.id));for(const name of (sceneName==null?Object.keys(child.worldScenes):[String(sceneName)])){const scene=child.worldScenes[name];if(!scene)continue;for(let i=scene.objects.length-1;i>=0;i--){const item=scene.objects[i];if(item._sceneEntityId&&!ids.has(item._sceneEntityId)){scene.objects.splice(i,1);const active=child.objects.indexOf(item);if(active>=0)child.objects.splice(active,1)}}}
 if(sceneName!=null&&sceneName===child.currentScene)child.objects.splice(0,child.objects.length,...child.worldScenes[sceneName].objects);
 if(child.worldObjectIndex){child.worldObjectIndex.length=child.objects.length;child.worldObjectIndex.revision=child.worldObjectRevision;}
}
child.VeldrenWorldEdits={applyDocument(){refreshSceneRenderables(worldDocument,'overworld');return {applied:0,unmatched:0,rejected:0}},refreshSceneRenderables};
childWindow.VeldrenWorldEdits=child.VeldrenWorldEdits;
vm.runInContext(fs.readFileSync(path.join(dist,'../terrain-editor-runtime.js'),'utf8'),child,{filename:'terrain-editor-runtime.js'});
vm.runInContext(fs.readFileSync(path.join(dist,'editor-runtime.js'),'utf8'),child,{filename:'editor-runtime.js'});

const parentNodes=new Map(),parentDocument={activeElement:null,listeners:{},
 getElementById(id){if(!parentNodes.has(id))parentNodes.set(id,element());return parentNodes.get(id)},
 createElement:element,addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
const parentWindow={listeners:{},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler)}};
const parent={console,document:parentDocument,window:parentWindow,location:{origin:'https://example.test'},
 setTimeout(fn){if(fn)fn()},requestIdleCallback(fn){fn({timeRemaining:()=>50})},setInterval(){return 1},clearInterval(){},Date,Option:function Option(name,value){return Object.assign(element('OPTION'),{textContent:name,value})},confirm:()=>true};
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
 assert.equal(bridge.shortcut({key:'w'}),true,'W chooses Move outside Camera mode');
 parentDocument.getElementById('cameraTool').onclick();
 const start=bridge.cameraState();
 const down=key('w',toolbar);dispatch(parentWindow,'keydown',down);assert(down.prevented,'toolbar focus forwards W');
 assert.equal(parentDocument.getElementById('modeBadge').textContent,'CAMERA','W remains navigation in Camera mode');
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
 bridge.setTool('camera');
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
 assert.equal(object.x,47,'Select mode does not move an object without a 3D handle');
 dispatch(childDocument,'pointerup',pointer('pointerup',fromX+20,fromY,0));
 assert.equal(navResets,0,'selection does not invalidate navigation');
 assert.equal(landResets,0,'selection does not invalidate terrain');
 assert.equal(messages.filter(m=>m.type==='veldren-editor-change').length,0,'selection creates no persistent command');
 const originalX=object.x,originalY=object.y,atX=(object.x+.5-bridge.cameraState().x)*10,atY=(object.y+.5-bridge.cameraState().y)*10;
 dispatch(childDocument,'pointerdown',touch(21,atX,atY));
 dispatch(childDocument,'pointermove',touch(21,atX+20,atY));
 assert.equal(object.x,originalX,'touch selection does not create an implicit ground-plane drag');
 dispatch(childDocument,'pointerdown',touch(22,atX+100,atY));
 assert.equal(object.x,originalX,'two-finger navigation preserves the selected object');
 assert.equal(object.y,originalY,'two-finger navigation preserves object height');
 dispatch(childDocument,'pointerup',touch(21,atX+20,atY));
 dispatch(childDocument,'pointerup',touch(22,atX+100,atY));
 const asset=bridge.listAssets().find(item=>item.id==='mesh:previewHouse');assert(asset,'local model appears in the asset catalog');
 const geometry=bridge.assetGeometry(asset.id);const cards=parentDocument.getElementById('assetList').children;assert.equal(cards.length,1,'asset browser renders one card for the indexed model');assert(cards[0].children.some(node=>String(node.tagName).toUpperCase()==='CANVAS'),'asset card uses a model thumbnail canvas');assert(cards[0].children[0].getContext().calls.includes('image'),'thumbnail cache paints the lazy card canvas');const thumbRender=createdNodes.find(node=>String(node.tagName).toUpperCase()==='CANVAS'&&node.getContext().calls.filter(call=>call==='stroke').length>0)?.getContext(),thumbnailFaces=thumbRender?.calls.filter(call=>call==='stroke').length||0;assert(thumbnailFaces>0&&thumbnailFaces<=128,'large asset thumbnails rasterize at most 128 faces');assert(createdNodes.some(node=>node.width===512&&node.height===512&&node.getContext().drawImageArgs.some(args=>args[0]===child.REALM_ATLAS_IMAGE&&args[3]===512&&args[4]===512)),'thumbnail materials use a 512px working atlas instead of sampling the full-resolution atlas');
 cards[0].onclick();assert.equal(parentDocument.getElementById('modelPreview').hidden,false,'selecting a card opens the large model preview');assert(parentDocument.getElementById('modelPreviewCanvas').getContext().calls.includes('image'),'large preview draws its existing texture atlas');assert(parentDocument.getElementById('modelPreviewCanvas').getContext().calls.includes('fill'),'large preview draws shaded mesh triangles');
 assert.equal(geometry.p.length,9,'browser receives existing mesh vertex data without reloading a model');
 const objectCount=worldObjects.length;bridge.beginPlacement(asset.id);const preview=worldObjects.find(o=>o._editorPreview);assert(preview,'placement starts one temporary rendered model');let previewFaces=0;child.prop3({software:false,face(){previewFaces++}},preview,preview.x,preview.y);assert(previewFaces>0,'temporary preview renders the actual mesh through the world renderer');
 assert.equal(bridge.listEntities().length,objectCount,'temporary preview stays out of the world hierarchy');
 const rotation=bridge.rotatePlacement(90);assert.equal(rotation,90,'placement preview can rotate');
 const placementPointer=pointer('pointerdown',400,190,0);dispatch(childDocument,'pointermove',{...placementPointer,type:'pointermove'});dispatch(childDocument,'pointerdown',placementPointer);
 const placed=worldObjects.find(o=>o._editorCreated);assert(placed,'viewport click commits the selected model');assert.equal(placed.editorTransform.rotation,90,'placement rotation is stored on the placed model');
 assert(bridge.exportEdits().changes.some(c=>c.id===placed.id&&c.rotation===90),'placement transform is recorded in editor persistence');
 bridge.cancelPlacement();assert(!worldObjects.includes(preview),'cancel removes the temporary preview');assert(worldObjects.includes(placed),'cancel preserves committed model');
 const authoredId='overworld:lamp:main';assert(worldObjects.some(item=>item._sceneEntityId===authoredId),'canonical scene renderables enter the editor object index');
 bridge.selectByRef('object',authoredId);const authoredMove=bridge.setTransform({x:48,y:53,rotation:45,scale:1.5});
 assert.equal(authoredMove.id,authoredId);let persistedTransform=childWindow.VeldrenSceneFormat.readWorldTransform(bridge.exportWorld(),'overworld',authoredId);
 assert.equal(persistedTransform.x,48);assert.equal(persistedTransform.y,53);assert(Math.abs(persistedTransform.rotation-45)<1e-8);assert.equal(persistedTransform.scale,1.5);
 assert(!bridge.exportEdits().changes.some(change=>change.id===authoredId),'scene-authored changes stay in the v2 document instead of becoming legacy overlays');
 const entitiesBeforeDuplicate=bridge.exportWorld().scenes[0].entities.map(entity=>entity.id);
 const duplicated=bridge.duplicateSelection(),duplicatedId=duplicated.id;assert.notEqual(duplicatedId,authoredId);
 assert.equal(bridge.exportWorld().scenes[0].entities.length,entitiesBeforeDuplicate.length+1,'duplicate adds one canonical entity while retaining existing runtime bindings');
 bridge.deleteSelection();assert.deepEqual(bridge.exportWorld().scenes[0].entities.map(entity=>entity.id),entitiesBeforeDuplicate,'delete removes exactly the duplicated entity');
 bridge.selectByRef('object',authoredId);const saveResult=await bridge.save();assert.equal(saveResult.roundTripVerified,true,'v2 document passes editor save verification');
 assert.equal(savedDocument.format,'veldren.world');assert.equal(savedDocument.scenes[0].entities[0].id,authoredId);
 persistedTransform=childWindow.VeldrenSceneFormat.readWorldTransform(savedDocument,'overworld',authoredId);assert(Math.abs(persistedTransform.rotation-45)<1e-8);assert.equal(persistedTransform.scale,1.5);
 bridge.revertSelection();persistedTransform=childWindow.VeldrenSceneFormat.readWorldTransform(bridge.exportWorld(),'overworld',authoredId);
 assert.equal(persistedTransform.x,47);assert.equal(persistedTransform.y,50,'revert restores the exact original local transform');
 console.log('PASS: editor camera/navigation, scene-authored transforms and subtree editing, verified v2 save/revert, and temporary placement lifecycle.');
})().catch(error=>{console.error(error);process.exitCode=1});
