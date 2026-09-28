// Actual DOM focus/removal regression. No game backend or player data is used.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.VELDREN_PLAYWRIGHT?pathToFileURL(process.env.VELDREN_PLAYWRIGHT).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.VELDREN_CHROMIUM?{executablePath:process.env.VELDREN_CHROMIUM}:{}),args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.setContent('<div id="list"></div><div id="inspector"></div><span id="count"></span>');
 await page.addScriptTag({content:readFileSync(new URL('../dist/editor/panels.js',import.meta.url),'utf8')});
 await page.evaluate(()=>{
  const node={id:'wall',name:'Wall',active:true,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},components:{}};window.edits=[];
  const selection={ids:['wall'],locked:()=>false,hidden:()=>false};
  const bridge={canonicalSelection:()=>selection,sceneEntity:()=>structuredClone(node),sceneHierarchy:()=>({visible:new Set(['wall']),nodes:new Map([['wall',structuredClone(node)]]),children:new Map(),roots:['wall']}),assetReferences:()=>[],executeCommand(_label,ops){for(const op of ops){if(op.op==='rename'){node.name=op.name;edits.push(op.name);}}}};
  window.panels=createVeldrenScenePanels({bridge,list:document.querySelector('#list'),inspector:document.querySelector('#inspector'),count:document.querySelector('#count'),log(message){throw Error(message);}});panels.render();panels.inspect();
 });
 // Removing a focused input dispatches its change handler synchronously. That
 // handler commits and refreshes the same panel before removal has completed.
 await page.getByLabel('Name',{exact:true}).fill('Inspector rename');
 await page.evaluate(()=>panels.inspect());
 assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Inspector rename');
 assert.deepEqual(await page.evaluate(()=>edits),['Inspector rename']);
 await page.locator('.canonical-name').dispatchEvent('dblclick');await page.locator('#list input').fill('Hierarchy rename');
 await page.evaluate(()=>panels.render());
 assert.equal(await page.locator('.canonical-name').textContent(),'Hierarchy rename');
 assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Hierarchy rename');
 assert.deepEqual(await page.evaluate(()=>edits),['Inspector rename','Hierarchy rename']);
 assert.deepEqual(errors,[]);
 console.log('PASS: focused Inspector and hierarchy refresh commit once, retain current values and avoid reentrant DOM removal errors.');
}finally{await browser.close();}
