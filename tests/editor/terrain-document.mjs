import assert from 'node:assert/strict';
import {sanitize,sanitizeTerrain} from '../../worker/editor-document.js';
const terrain={version:1,scenes:{overworld:{heightNodes:[{x:120,z:122,delta:.375}],paintCells:[{x:121,z:122,material:'stone'}]}}};
const clean=sanitizeTerrain(terrain);assert.deepEqual(clean,terrain);
const old={version:1,revision:6,changes:[{scene:'overworld',kind:'object',id:'existing',x:2,y:2}],terrain};
const saved=sanitize({version:1,expectedRevision:6,changes:old.changes},old);
assert.deepEqual(saved.terrain,terrain,'old editor clients preserve existing sculpt and paint data');
assert.equal(saved.revision,7);assert.equal(saved.changes.length,1);
const updated=sanitize({version:1,expectedRevision:6,changes:old.changes,terrain:{...terrain,scenes:{overworld:{...terrain.scenes.overworld,paintCells:[]}}}},old);
assert.deepEqual(updated.terrain.scenes.overworld.paintCells,[]);
for(const replacement of [
 {version:1,scenes:{overworld:{heightNodes:[{x:120.2,z:122,delta:1}],paintCells:[]}}},
 {version:1,scenes:{overworld:{heightNodes:[{x:120,z:122,delta:Infinity}],paintCells:[]}}},
 {version:1,scenes:{overworld:{heightNodes:[{x:120,z:122,delta:17}],paintCells:[]}}},
 {version:1,scenes:{overworld:{heightNodes:[{x:1,z:1,delta:1},{x:1,z:1,delta:2}],paintCells:[]}}},
 {version:1,scenes:{overworld:{heightNodes:[],paintCells:[{x:1,z:2,material:'water'}]}}},
 {version:1,scenes:{tutorial:{heightNodes:[],paintCells:[]}}},
])assert.throws(()=>sanitize({version:1,expectedRevision:6,changes:old.changes,terrain:replacement},old),/terrain|Terrain/);
assert.throws(()=>sanitize({version:1,expectedRevision:5,changes:old.changes,terrain},old),/revision/);
console.log('PASS: persistent terrain schema, strict coordinates/material/size validation, CAS, and preservation for older clients.');
