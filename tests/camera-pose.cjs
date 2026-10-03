'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/view3d.js','utf8'),camera=source.slice(0,source.indexOf('function boundedViewPoint3'));
function fixture(editor=false){let clock=0;const ctx={assert,Math,performance:{now:()=>clock},window:{VELDREN_CONTEXT:editor?'editor':'game'},localStorage:{getItem:()=>null},screen:{w:1920,h:1080},px:50,py:60,currentScene:'overworld',meshFrame3:0,walkSurfaceHeight:()=>1,buildings:[],inBuilding:(b,x,z)=>x>=b.x&&x<b.x+b.w&&z>=b.y&&z<b.y+b.h&&(x===b.x||z===b.y||x===b.x+b.w-1||z===b.y+b.h-1),buildingRoofHidden:()=>false};vm.createContext(ctx);vm.runInContext(camera,ctx);return {ctx,run:s=>vm.runInContext(s,ctx),tick:ms=>{clock+=ms;ctx.meshFrame3++;}};}
const f=fixture();
f.run(`for(const yaw of [-2.6,0,1.2,3.0])for(const tilt of [.22,.45,.70])for(const zoom of [58,102,132]){
 Object.assign(view3d,{yaw,tilt,zoom});const pose=cameraPose3();
 assert.equal(pose.fov,54);assert.equal(pose.anchor,.64);assert.equal(pose.near,.12);
 for(const [x,z]of [[50.5,60.5],[51,61],[49,62]]){const projected=project3(x,0,z),picked=unproject3(projected.x,projected.y);assert(Math.hypot(picked.x-x,picked.z-z)<1e-8,'projection and screen picking share orbit, pitch, zoom and player anchor');}
}`);
const initial=f.run('cameraPose3().yaw');f.tick(16);f.run('view3d.yaw+=.5');const first=f.run('cameraPose3().yaw');assert(first>initial&&first<initial+.5,'manual orbit eases monotonically');
for(let i=0;i<40;i++){f.tick(16);f.run('cameraPose3()');}assert(Math.abs(f.run('cameraPose3().yaw')-initial-.5)<.001);
const obstruct=fixture();obstruct.run('view3d.yaw=0;view3d.tilt=.25');const clear=obstruct.run('cameraPose3().distance');obstruct.ctx.buildings=[{x:48,y:63,w:6,h:7}];obstruct.tick(16);const close=obstruct.run('cameraPose3().distance');assert(close<clear&&close>1,'wall obstruction pulls camera forward before clipping');
obstruct.ctx.buildings=[];obstruct.tick(16);const eased=obstruct.run('cameraPose3().distance');assert(eased>close&&eased<clear,'obstruction release eases outward');
const terrain=fixture();terrain.ctx.walkSurfaceHeight=(x,z)=>z>63?8:1;terrain.run('view3d.yaw=0;view3d.tilt=.22');assert(terrain.run('cameraPose3().distance')<clear,'terrain obstruction prevents underground camera');
const editor=fixture(true);editor.ctx.buildings=[{x:48,y:61,w:6,h:7}];const ep=editor.run('cameraPose3()');assert.equal(ep.target,0);assert.equal(ep.anchor,.82);assert(ep.distance>3,'detached editor can inspect a building without player collision');editor.tick(16);editor.run('view3d.yaw+=1');assert.equal(editor.run('cameraPose3().yaw'),ep.yaw+1,'editor movement remains immediate');
console.log('PASS: shared camera projection/picking over 36 poses, smooth manual orbit, wall/terrain obstruction, recovery, and independent editor camera.');
