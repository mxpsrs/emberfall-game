'use strict';
// Production outer-page controls in a DOM fixture. No browser layout or GPU.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Events{
 constructor(){this.listeners={};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,event={}){for(const fn of this.listeners[name]||[]){fn(event);if(event.immediate)break;}}
}
let document;
class Element extends Events{
 constructor(tag='div',attrs={}){super();this.tagName=tag.toUpperCase();this.attrs={};this.children=[];this.style={};this.dataset={};this.textContent='';this.className='';this.hidden=false;this.disabled=false;this.checked=false;this._open=false;for(const [key,value]of Object.entries(attrs))this.setAttribute(key,value);}
 setAttribute(key,value){this.attrs[key]=String(value);if(key==='class')this.className=String(value);if(['hidden','disabled','checked'].includes(key))this[key]=true;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 getAttribute(key){return this.attrs[key]??null;}
 get classList(){const self=this;return {toggle(name,on){const classes=new Set(self.className.split(/\s+/).filter(Boolean));if(on??!classes.has(name))classes.add(name);else classes.delete(name);self.className=[...classes].join(' ');},remove(name){this.toggle(name,false);},add(name){this.toggle(name,true);},contains(name){return self.className.split(/\s+/).includes(name);}};}
 get open(){return this._open;}set open(value){if(this._open!==!!value){this._open=!!value;this.emit('toggle');}}
 get value(){return this._value??this.attrs.value??(this.tagName==='SELECT'?(this.children.find(n=>'selected'in n.attrs)||this.children[0])?.value:'')??'';}set value(value){this._value=String(value);}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}appendChild(node){this.append(node);return node;}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentElement){const owner=this.parentElement;owner.children=owner.children.filter(n=>n!==this);this.parentElement=null;}}
 get firstChild(){return this.children[0];}get options(){return this.children;}get isConnected(){return this===document||!!this.parentElement?.isConnected;}
 set innerHTML(value){this.replaceChildren();if(value.includes('<span'))this.append(new Element('span'),new Element('span'),new Element('small'));}
 matches(selector){return selector.split(',').some(raw=>{let s=raw.trim();for(const match of s.matchAll(/:not\(\[([^\]]+)\]\)/g))if(this[match[1]])return false;s=s.replace(/:not\([^)]*\)/g,'');const tag=s.match(/^[\w-]+/)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;for(const m of s.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(m[1]))return false;for(const m of s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g))if(!(m[1]in this.attrs)||m[2]!==undefined&&this.attrs[m[1]]!==m[2])return false;return true;});}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 querySelectorAll(selector){const result=[];for(const child of this.children){if(child.matches(selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getBoundingClientRect(){return this.rect??{left:0,top:0,bottom:50,width:700,height:400};}get offsetWidth(){return 280;}
 focus(){document.activeElement=this;}
 click(){if(this.disabled)return;const event=key('',this);if(this.tagName==='SUMMARY')this.parentElement.open=!this.parentElement.open;this.onclick?.(event);this.emit('click',event);document.emit('click',event);}
 getContext(){return null;}
}
const html=fs.readFileSync('client/editor/index.html','utf8');document=new Element('document');document.activeElement=null;document.getElementById=id=>document.querySelectorAll('[id]').find(n=>n.attrs.id===id)||null;document.createElement=tag=>new Element(tag);
const stack=[document],voids=new Set(['meta','link','input','img','br','hr']);
for(const match of html.matchAll(/<(\/?)([\w-]+)([^>]*)>/g)){
 const [,closing,tag,tail]=match;if(closing){assert.equal(stack.at(-1).tagName,tag.toUpperCase(),'balanced markup');stack.pop();continue;}
 const attrs={};for(const m of tail.matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[m[1]]=m[2]??'';
 const node=new Element(tag,attrs);stack.at(-1).append(node);if(!voids.has(tag))stack.push(node);
}
document.body=document.querySelector('body');assert.equal(stack.length,1);
const $=document.getElementById,ids=document.querySelectorAll('[id]').map(n=>n.attrs.id);assert.equal(new Set(ids).size,ids.length,'controls have unique IDs');
for(const id of ['saveWorld','undoCommand','redoCommand','selectTool','moveTool','rotateTool','scaleTool','placeTool','buildingEditTool','newBuildingTool','terrainTool','cameraTool','positionSnap','rotationSnap','gizmoSpace','gizmoPivot','scaleSnap','gizmoSnap'])assert($(id).closest('.menu-popover'),id+' belongs to a dropdown');
assert.equal(document.querySelectorAll('.toolbar-menu').length,6);
for(const id of ['assetList','partAssetList','modelPreview'])assert.equal($(id).closest('.asset-dock'),$('assetDock'),'models live outside the scrolling sidebar');
assert(!document.querySelector('.hierarchy').querySelector('.asset-list'));
const css=fs.readFileSync('client/editor/editor.css','utf8');assert.match(css,/\[hidden\]\{display:none!important\}/);assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto/);
const window=new Events();window.innerWidth=390;window.innerHeight=600;window.requestIdleCallback=()=>1;
const asset={id:'world:tree',name:'Tree',category:'Trees',key:'Tree',source:'rebuilt',size:[1,2,1]},part={id:'rebuilt:wall',name:'Wall',category:'Walls',key:'Wall',source:'rebuilt',size:[2,3,.2]};
const state={name:'House',undo:0,redo:0,transform:{x:1,z:2,rotation:0},snap:{grid:.25},parts:[],selected:null},placements=[],toolCalls=[];
const bridge={isReady:()=>true,setTool:name=>toolCalls.push(name),setSnap(){},setBuildingSnap(){},configureGizmo(){},setTerrainBrush(){},terrainState:()=>({undo:0,redo:0,heightNodes:0,paintCells:0}),gameUiVisible:()=>false,getSelection:()=>null,listEntities:()=>[],currentSceneName:()=> 'Briar Haven',listAssets:()=>[asset],buildingAssets:()=>Array.from({length:70},(_,i)=>({...part,id:i?'rebuilt:wall-'+i:part.id,name:'Wall '+i})),savedState:async()=>({count:0}),historyState:()=>({dirty:false}),enterBuilding:()=>state,startNewBuilding:()=>state,exitBuilding(){},beginPlacement:id=>{placements.push(id);return asset;},cancelPlacement(){},beginPartPlacement:id=>{placements.push(id);return state;},cancelPartPlacement:()=>state};
$('gameFrame').contentWindow={VeldrenEditorBridge:bridge};
function key(key,target){return {key,target,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.immediate=true;}};}
const context={window,document,console,location:{origin:'https://editor.test'},setTimeout:()=>1,setInterval:()=>1,clearInterval(){},Date,confirm:()=>true,Option:function(label,value){const option=new Element('option',{value});option.textContent=label;return option;}};
vm.createContext(context);for(const name of ['workspace-ui','editor'])vm.runInContext(fs.readFileSync('client/editor/'+name+'.js','utf8'),context,{filename:name+'.js'});
const ready=()=>window.emit('message',{origin:'https://editor.test',source:$('gameFrame').contentWindow,data:{type:'veldren-editor-ready'}});
(async()=>{
 ready();await new Promise(setImmediate);
 assert.equal($('terminalLog').hidden,true);$('terminalToggle').click();assert.equal($('terminalLog').hidden,false);$('consoleToggle').click();assert.equal($('terminalLog').hidden,true);
 const menus=document.querySelectorAll('.toolbar-menu');menus[0].open=true;menus[2].open=true;assert.equal(menus.filter(m=>m.open).length,1,'one menu at a time');
 menus[2].rect={left:350,bottom:50};document.emit('keydown',key('ArrowDown',menus[2].querySelector('summary')));assert.equal(document.activeElement,$('selectTool'));assert.equal(menus[2].querySelector('.menu-popover').style.left,'-248px','popup clamps to viewport');
 const escape=key('Escape',$('selectTool'));document.emit('keydown',escape);assert(escape.prevented&&escape.immediate);assert.equal(menus[2].open,false);
 menus[4].open=true;document.emit('pointerdown',{target:$('stage')});assert.equal(menus[4].open,false);
 $('assetBrowserTab').click();assert.equal($('assetDock').hidden,false);assert.equal(document.body.dataset.panel,'models');assert.equal($('worldBrowser').hidden,false,'library does not replace scene controls');assert.equal($('assetList').children.length,1);
 $('expandModelLibrary').click();assert(document.querySelector('.workspace').classList.contains('models-full'));window.VeldrenEditorLayout.showPanel('viewport');assert(!document.querySelector('.workspace').classList.contains('models-full'));$('assetBrowserTab').click();
 $('assetList').children[0].click();assert.equal($('modelPreview').hidden,false);assert.equal($('assetDock').dataset.preview,'shown');$('modelListView').click();assert.equal($('assetDock').dataset.preview,'list');
 $('beginAssetPlacement').click();assert.deepEqual(placements,['world:tree']);assert.equal(document.body.dataset.panel,'viewport','placement returns to the viewport');
 $('buildingEditTool').click();assert.equal($('buildingPanel').hidden,false);assert.equal($('worldBrowser').hidden,true);assert.equal($('partBrowser').hidden,false);assert.equal($('assetDock').hidden,false);assert.equal($('partAssetList').children.length,49);
 $('partAssetList').children.at(-1).click();const later=$('partAssetList').children.at(-1);later.click();assert.equal($('partAssetList').children.length,70,'selecting a later model keeps loaded pages');$('partSearch').value='Wall 0';$('partSearch').oninput();assert.equal($('partAsset').value,'rebuilt:wall-69','filtering keeps the chosen placement reference');$('partSearch').value='';$('partSearch').oninput();$('partAssetList').children[0].click();$('placePart').click();assert.deepEqual(placements,['world:tree','rebuilt:wall']);assert.equal(document.body.dataset.panel,'viewport');
 window.emit('message',{origin:'https://editor.test',source:$('gameFrame').contentWindow,data:{type:'veldren-editor-building',state}});assert.equal($('assetDock').hidden,false);assert.equal($('partBrowser').hidden,false,'building updates keep its model library open');assert.equal(document.body.dataset.panel,'viewport');
 $('closeModelLibrary').click();assert.equal($('assetDock').hidden,true);$('exitBuilding').click();$('assetBrowserTab').click();assert.equal($('assetBrowser').hidden,false);assert.equal($('partBrowser').hidden,true);assert.equal($('modelPreview').hidden,true,'switching libraries clears the old part preview');
 $('terrainTool').click();assert.equal($('terrainPanel').hidden,false);assert.equal($('worldBrowser').hidden,true);assert.equal($('buildingPanel').hidden,true);assert.equal($('assetDock').hidden,false,'terrain controls cannot obstruct the model dock');assert.equal(document.body.dataset.panel,'scene');
 $('browseBuildingModelMenu').click();assert.equal($('partBrowser').hidden,false);$('partAssetList').children[0].click();assert.equal($('placePart').disabled,true,'browsing building models alone does not create a building');
 console.log('PASS: production menus, keyboard/outside dismissal, popup bounds, independent libraries, previews, building-update persistence, placement and panel/console switching (DOM fixture, no browser layout).');
})().catch(error=>{console.error(error);process.exitCode=1;});
