const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Alice'};assetsReady=true;onlineScene=currentScene;const peer={id:'bob-id',name:'Bob',username:'bobby',x:s.x+1,y:s.y,drawX:s.x+1,drawY:s.y,seen:Date.now(),equipment:{},look:0};onlinePeers.set(peer.id,peer);hitboxes=[];const realHuman=humanoid3;humanoid3=()=>{};drawOnlinePlayers({face(){}},[]);humanoid3=realHuman;
const box=hitboxes.find(b=>b.o?.type==='player');assert(box,'rendered peer has a world interaction target');canvas.getBoundingClientRect=()=>({left:0,top:0});const event={clientX:box.x+box.w/2,clientY:box.y+box.h/2};const picked=worldPick(event);assert.equal(picked.objects[0].username,'bobby');let requested=null;requestPlayerTrade=username=>requested=username;const options=worldOptionsFor(picked.objects[0]);options.find(([name])=>name==='Trade with Bob')[1]();assert.equal(requested,'bobby');assert.deepEqual(options.map(([name])=>name),['Trade with Bob','Follow Bob']);peer.x=s.x+5;onlinePeers.set(peer.id,peer);let routed=false;const realRoute=route;route=()=>{routed=true;return [[s.x+1,s.y]]};followPlayer(peer.id);assert(routed);assert.equal(followedPlayerId,peer.id);walkTo(s.x,s.y);assert.equal(followedPlayerId,null,'walking elsewhere cancels follow');route=realRoute;
// A moving leader must not trigger the old near-distance stop every 0.6s.
px=20;py=20;s.x=20;s.y=20;peer.x=21.5;peer.y=20;peer.moving=true;peer.running=false;peer.route=[[25,20]];peer.samples=[];peer.sampleAt=performance.now()-200;
let routeCalls=0,dest=null;route=(x,y,adjacent,reach)=>{routeCalls++;dest={x,y,reach};return [[21,20],[22,20]];};
followPlayer(peer.id);assert.equal(routeCalls,1);assert(dest.x>peer.x,'follow uses bounded current route position');assert.equal(dest.reach,1);assert(path.length,'moving target does not prematurely clear follow path');
peer.sampleAt=performance.now()+1000;time+=.16;updatePlayerFollow();assert.equal(routeCalls,2,'moving target responds within 0.16 seconds');
time+=.16;updatePlayerFollow();assert.equal(routeCalls,2,'unchanged target preserves its route without another search');
peer.moving=false;peer.x=px+1;peer.sampleAt=performance.now();time+=.16;updatePlayerFollow();assert.equal(path.length,0,'stop beside a stationary leader');
peer.seen=Date.now()-13000;time+=.16;updatePlayerFollow();assert.equal(followedPlayerId,null,'stale leader cancels follow');route=realRoute;
console.log('PASS: visible players are selectable by world picking and offer Trade with their authenticated username.');
\`,ctx);`);
