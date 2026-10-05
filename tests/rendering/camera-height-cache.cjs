'use strict';
const assert=require('node:assert/strict');
const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');

// Exercise the production projection wrapper without a renderer or world setup.
vm.runInContext(`
 screen={w:900,h:500};px=10;py=20;meshFrame3=7;worldObjectRevision=2;
 let heightReads=0,cameraHeight=2;
 landHeight=()=>5;
 walkSurfaceHeight=()=>{heightReads++;return cameraHeight;};
 window.VeldrenTerrainEdits={revision:0};
 for(let i=0;i<200;i++)project3(10+i*.02,1,25);
 assert.equal(heightReads,1,'a frame samples its shared camera origin once');
 meshFrame3++;project3(12,1,25);
 assert.equal(heightReads,2,'the next rendered frame samples again');
 cameraHeight=4;window.VeldrenTerrainEdits.revision++;
 const edited=project3(12,1,25);
 assert.equal(heightReads,3,'a terrain stroke invalidates projection within the same frame');
 cameraHeight=2;window.VeldrenTerrainEdits.revision++;
 assert.notEqual(project3(12,1,25).y,edited.y,'terrain height changes visible projection');
 worldObjectRevision++;project3(12,1,25);
 assert.equal(heightReads,5,'world/building changes invalidate projection');
 px++;project3(12,1,25);
 assert.equal(heightReads,6,'moving the camera changes its origin');
 currentScene='tutorial';project3(12,1,25);
 assert.equal(heightReads,7,'entering another scene invalidates projection');
 project3(12,1,25,view3d,px+1.5,py+.5);
 project3(12,1,25,view3d,px+1.5,py+.5);
 assert.equal(heightReads,9,'arbitrary camera origins keep their own exact ground sampling');
 const alternate={yaw:0,tilt:.4,zoom:80};project3(12,1,25,alternate);
 assert.equal(heightReads,9,'independent preview projections are unaffected');
`,ctx);
console.log('Camera-ground projection reuse and edit invalidation verified');
