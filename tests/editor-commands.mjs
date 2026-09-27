import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),events=[];
const context={console,TextEncoder,TextDecoder,DataView,WebAssembly,AbortController,URL,Map,Set,
 realmAssetURL:p=>p,VELDREN_CONTEXT:'editor',addEventListener(){},
 fetch:async path=>{const bytes=fs.readFileSync(new URL('dist/'+String(path).replace(/^\//,''),root));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};}};
context.window=context;vm.createContext(context);
for(const path of ['dist/asset-runtime.js','dist/native-runtime.js','dist/editor/commands.js'])vm.runInContext(fs.readFileSync(new URL(path,root),'utf8'),context);
const native=await context.realmNativeReady,n=native.scenes;
const entity=(id,parent=null)=>({id,name:id,parent,active:true,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},components:{},metadata:{}});
n.upsert('town',entity('root'));n.upsert('town',entity('child','root'));n.upsert('town',entity('other'));
n.subscribe(event=>events.push(JSON.parse(JSON.stringify(event))));
const commands=context.createVeldrenEditorCommands(n,()=> 'town');
commands.execute('Mixed edit',[{op:'rename',id:'child',name:'Lamp'},{op:'addComponent',id:'child',component:'Light',fields:{type:'point',intensity:5,radius:8}},{op:'reparent',id:'child',parent:'other'}]);
assert.equal(n.entity('town','child').parent,'other');assert.equal(n.entity('town','child').name,'Lamp');
commands.undo();assert.equal(n.entity('town','child').parent,'root');assert.equal(n.entity('town','child').components.Light,undefined);commands.redo();
commands.begin('Drag');for(let i=0;i<200;i++)commands.execute('Drag',[{op:'transform',id:'child',transform:{position:[i,3,4],rotation:[0,0,0,1],scale:[1,1,1]},space:'world'}]);commands.commit();
assert.equal(commands.status().undo,2);commands.undo();assert.equal(n.entity('town','child').worldMatrix[12],0);commands.redo();assert.equal(n.entity('town','child').worldMatrix[12],199);
const copy=commands.execute('Duplicate',[{op:'duplicate',id:'other'}]).created[0];assert(n.entity('town',copy));assert.equal(n.entity('town',copy).name,'other');commands.undo();assert.equal(n.entity('town',copy),null);commands.redo();assert(n.entity('town',copy));
const before=n.serialize();commands.execute('Delete',[{op:'delete',id:'other'}]);assert.equal(n.entity('town','child'),null);commands.undo();assert.equal(JSON.stringify(n.serialize()),JSON.stringify(before));
commands.execute('Model',[{op:'asset',id:'child',value:'rebuilt:Wall_Plaster_Straight'}]);assert.equal(n.entity('town','child').components.MeshRenderer.asset,'rebuilt:Wall_Plaster_Straight');
assert.throws(()=>commands.execute('Invalid asset',[{op:'asset',id:'child',value:'not-an-asset'}]),/Unknown/);
commands.saved();assert.equal(commands.dirty,false);commands.undo();assert.equal(commands.dirty,true);commands.redo();assert.equal(commands.dirty,false);
const saved=JSON.stringify(n.serialize());commands.begin('Cancelled');commands.execute('Move',[{op:'transform',id:'child',transform:{position:[8,9,10]}}]);commands.cancel();assert.equal(JSON.stringify(n.serialize()),saved);
assert.throws(()=>commands.execute('Rejected',[{op:'rename',id:'child',name:'Invalid'},{op:'reparent',id:'other',parent:'child'}]),/cycle/);assert.equal(JSON.stringify(n.serialize()),saved);
assert(events.some(e=>e.kind==='batch'&&e.changes.some(c=>c.kind==='transform')));
assert(events.some(e=>e.kind==='batch'&&e.changes.some(c=>c.kind==='remove')));
n.load(JSON.parse(saved));assert.equal(JSON.stringify(n.serialize()),saved);assert.equal(commands.status().undo,0);
// Real WASM transform controller: projected handle rays mutate canonical affine
// matrices and group all drag updates in one undo record.
for(const path of ['dist/editor/geometry.js','dist/editor/transform-tools.js'])vm.runInContext(fs.readFileSync(new URL(path,root),'utf8'),context);
context.createVeldrenGizmoRenderer=async()=>({update(){},render(){}});
const G=context.VeldrenEditorGeometry;
n.upsert('tools',entity('parent'));n.upsert('tools',entity('part','parent'));n.upsert('tools',entity('second'));
const toolCommands=context.createVeldrenEditorCommands(n,()=> 'tools');
const parentMatrix=G.multiply(G.rotation([0,1,0],.4),[2,0,0,0,0,.5,0,0,0,0,3,0,0,0,0,1]);
toolCommands.execute('Parent affine',[{op:'transform',id:'parent',transform:{affine:parentMatrix}}]);
let toolMode='move',selectedIds=['part','second'];
const tools=context.createVeldrenTransformTools({native:n,commands:toolCommands,scene:()=> 'tools',selection:()=>selectedIds,mode:()=>toolMode,report:message=>{throw Error(message)}});
const camera={eye:[5,4,7],center:[0,0,0],near:.25,left:-.18,right:.18,bottom:-.135,top:.135,height:600,width:800};
const surface={getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),setPointerCapture(){}},pointerAt=(p,type='pointermove')=>{const q=G.project(camera,p);return {clientX:q[0]*800,clientY:q[1]*600,pointerId:1,button:0,type}};
const length=G.length(camera.eye)*(.27/.25)*90/600;
for(const orientation of ['world','local'])for(const mode of ['move','rotate','scale']){
 toolMode=mode;tools.configuration({orientation,translation:.25,rotation:15,scale:.1});tools.frame({},camera);await Promise.resolve();
 const before=JSON.stringify(n.read('tools')),matrix=n.entity('tools','part').worldMatrix,axes=orientation==='local'?G.orientation(matrix):[[1,0,0],[0,1,0],[0,0,1]];
 const from=mode==='rotate'?G.mul(axes[0],length):G.mul(axes[0],length*.8),to=mode==='rotate'?G.mul(axes[1],length):G.mul(axes[0],length*1.3);
 assert(tools.down(pointerAt(from,'pointerdown'),surface),'3D '+mode+' handle hit in '+orientation);
 for(let i=0;i<10;i++)tools.move(pointerAt(G.add(from,G.mul(G.sub(to,from),(i+1)/10))),surface);
 tools.up(pointerAt(to,'pointerup'));assert.notEqual(JSON.stringify(n.read('tools')),before);toolCommands.undo();assert.equal(JSON.stringify(n.read('tools')),before,'Exact affine undo');toolCommands.redo();toolCommands.undo();
}
vm.runInContext(fs.readFileSync(new URL('dist/editor/selection.js',root),'utf8'),context);
const selection=context.createVeldrenSelection({native:n,scene:()=> 'tools',assets:context.VeldrenAssets});
const model=context.VeldrenAssets.list('model').find(id=>context.VeldrenAssets.record(id).bounds);
toolCommands.execute('Selectable components',[{op:'addComponent',id:'part',component:'MeshRenderer',fields:{asset:model}},{op:'addComponent',id:'second',component:'Collider',fields:{size:[2,2,2]}}]);
selection.select('part');selection.select('second',true);assert.equal(selection.ids.length,2);
selection.lock('parent',true);assert.equal(selection.canSelect('part'),false);assert.equal(selection.ids.length,1);selection.lock('parent',false);
selection.hide('parent',true);assert.equal(selection.canSelect('part'),false);selection.hide('parent',false);
const hierarchy=selection.hierarchy('part');assert(hierarchy.visible.has('parent')&&hierarchy.visible.has('part'));assert(!hierarchy.visible.has('second'));
const candidates=selection.candidates({origin:[0,0,10],direction:[0,0,-1]});assert(candidates.some(h=>h.id==='second'));
selection.pick({origin:[0,0,10],direction:[0,0,-1]},[50,50]);const first=selection.ids[0];selection.pick({origin:[0,0,10],direction:[0,0,-1]},[50,50]);if(candidates.length>1)assert.notEqual(selection.ids[0],first);
selection.hide('second',true);assert(!selection.candidates({origin:[0,0,10],direction:[0,0,-1]}).some(h=>h.id==='second'));selection.destroy();
console.log('PASS: actual WASM command execution, native asset references, grouped drag, mixed undo/redo, incremental notifications, dirty state, rollback and exact reload.');

vm.runInContext(fs.readFileSync(new URL('dist/scene-renderer.js',root),'utf8'),context);
let submitted=[];const authored=context.createVeldrenSceneRenderer(n,context.VeldrenAssets,{begin(){submitted=[]},submit(...args){submitted.push(args)},end(){},destroy(){}});
authored.render('tools',[0,0,0]);assert.equal(submitted.length,1);assert.equal(submitted[0][0],model);assert.deepEqual(Array.from(submitted[0][1]),Array.from(n.entity('tools','part').worldMatrix));
toolCommands.execute('Hide canonical renderer',[{op:'field',id:'part',component:'MeshRenderer',field:'visible',value:false}]);authored.render('tools',[0,0,0]);assert.equal(submitted.length,0);toolCommands.undo();authored.render('tools',[0,0,0]);assert.equal(submitted.length,1);authored.destroy();
native.destroy();
