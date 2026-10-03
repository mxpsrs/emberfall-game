const assert=require('node:assert/strict');
const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
currentScene='overworld';px=75;py=49;screen={w:1920,h:1080};view3d.zoom=102;
const originalPose=cameraPose3,originalRow=realmTerrainChunkRow;
cameraPose3=()=>({eye:[73.5421,5.201,43.9930],yaw:-2.8,pitch:.32,distance:6.1572,target:1.12,anchor:.64,height:1080,width:1920});
realmViewCorners=[{x:64,z:0},{x:80,z:0},{x:80,z:60},{x:64,z:60}];
// Reproduce the observed services view: a center behind the camera projects
// beyond the screen, while the chunk containing its eye is visible below it.
const rejectedCenter=flatProject3(72,0,40);
assert(Number.isFinite(rejectedCenter.y)&&rejectedCenter.y>screen.h+cameraZoom3()*16*3.5,'actual chunk center is beyond the rejection margin');
realmTerrainChunkRow=()=>false;
let visible=[];window.VeldrenTerrainStreaming={create:()=>({frame(chunks){visible=chunks;return true;}})};
const gpu={terrain:new Map(),gl:{deleteBuffer(){}}};realmTerrainEntries(gpu);
assert(visible.some(c=>c.x===72&&c.z===40),'keep the camera-containing 64,32 chunk even when its center is rejected');
assert(visible.some(c=>c.x===72&&c.z===56),'keep the foreground neighbor across its near plane');
assert(!visible.some(c=>c.x===72&&c.z===8),'remote rejected chunks remain culled');
const retainedNear=visible.filter(c=>{const p=flatProject3(c.x,0,c.z),margin=cameraZoom3()*16*3.5;return p.x< -margin||p.x>screen.w+margin||p.y< -margin||p.y>screen.h+margin;});
assert(retainedNear.length>0&&retainedNear.length<=16,'extra near-camera retention stays bounded');
const previousPose=cameraPose3();cameraPose3=()=>({...previousPose,eye:[160,4,160]});realmTerrainEntries(gpu);
assert(visible.some(c=>c.x===168&&c.z===168),'camera movement retains its new foreground terrain');
assert(!visible.some(c=>c.x===72&&c.z===40),'old foreground is released after leaving it');
cameraPose3=originalPose;realmTerrainChunkRow=originalRow;
`,ctx);
console.log('PASS: perspective near-plane terrain coverage, bounded local retention, remote culling and moved-camera coverage.');
