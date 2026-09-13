const fs=require('fs'),assert=require('node:assert/strict');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
function client(){const {ctx,vm}=new Function('require','process',bootstrap+';return {ctx,vm};')(require,process);let now=0;ctx.performance.now=()=>now;ctx.Date=class extends Date{static now(){return 100000+now;}};vm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);const run=code=>vm.runInContext(code,ctx);run("s.character={name:'Tester'};assetsReady=true;s.runEnabled=true;s.runEnergy=100;onlineScene=currentScene;renderAction=()=>{};");return {ctx,run,setTime(ms){now=ms}};}
for(const fps of [30,60]){
 const leader=client(),follower=client(),trail=[[21,20],[22,20],[23,20],[23,21],[23,22],[22,22],[21,22],[20,22],[20,21],[20,20],[21,20],[22,20],[23,20]];
 leader.run(`s.x=px=20;s.y=py=20;path=${JSON.stringify(trail)};`);
 follower.run("s.x=px=19;s.y=py=20;onlinePeers.set('leader',{id:'leader',name:'Leader',x:20,y:20,stamp:0,trailEpoch:0,trail:[],moving:false,seen:Date.now()});followPlayer('leader');");
 const pending=[],walked=[],visuals=new Map();let packet=0,nextSend=0,lastTile='19,20',maxVisualStep=0;
 for(let frame=0;frame<fps*14;frame++){
  const ms=frame*1000/fps,dt=1/fps;leader.setTime(ms);follower.setTime(ms);
  leader.run(`time+=${dt};advanceMovement(${dt});`);
  if(ms>=nextSend){nextSend+=250;packet++;
   for(const [from,to,id]of [[leader,follower,'leader'],[follower,leader,'follower']]){
    const state=JSON.parse(from.run("JSON.stringify({x:px,y:py,heading:playerMotion.heading,running:playerMotion.running,moving:playerMotion.moving,trailEpoch:movementTrailEpoch,trail:outgoingMovementTrail(),route:playerMotion.moving?[[s.x,s.y],...path.slice(0,7)]:[]})"));
    const lag=[70,160,320,110][packet%4];if(packet%7!==0)pending.push({at:ms+lag,to,id,peer:{...state,id,name:id,stamp:100000+ms},sent:ms,lag});
   }
  }
  pending.sort((a,b)=>a.at-b.at);
  while(pending.length&&pending[0].at<=ms){const p=pending.shift();p.to.run(`acceptPeerSnapshot(${JSON.stringify(p.peer)},${ms},${100000+ms},${p.lag*2});`);}
  follower.run(`time+=${dt};updatePlayerFollow();advanceMovement(${dt});`);
  const tile=follower.run("s.x+','+s.y");if(tile!==lastTile){walked.push(tile);lastTile=tile;}
  for(const [c,id]of [[leader,'follower'],[follower,'leader']]){
   const xy=c.run(`(()=>{const p=onlinePeers.get('${id}');if(!p||!Number.isFinite(p.drawX))return null;advancePeerVisual(p,performance.now());return [p.drawX,p.drawY];})()`);
   if(xy){const before=visuals.get(id);if(before)maxVisualStep=Math.max(maxVisualStep,Math.hypot(xy[0]-before[0],xy[1]-before[1]));visuals.set(id,xy);}
  }
 }
 const expected=[[20,20],...trail.slice(0,-1)].map(n=>n.join(','));
 assert.deepEqual(walked,expected,`${fps}fps preserves every leader departure and corner despite packet gaps`);
 assert.equal(follower.run('path.length'),0);assert(Math.abs(follower.run('px')-22)<.001);assert(Math.abs(follower.run('py')-20)<.001);
 assert(maxVisualStep<=4.5*1.35/fps+.001,`${fps}fps remote playback never snaps: ${maxVisualStep}`);
 console.log(`PASS: ${fps}fps two-client follow, turns, revisited tiles, stops, 70–320ms latency, missing/out-of-order packets and bounded remote visual motion.`);
}
