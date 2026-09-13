const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Alice'};assetsReady=true;onlineScene=currentScene;const peer={id:'bob-id',name:'Bob',username:'bobby',x:s.x+1,y:s.y,drawX:s.x+1,drawY:s.y,seen:Date.now(),equipment:{},look:0};onlinePeers.set(peer.id,peer);hitboxes=[];const realHuman=humanoid3;humanoid3=()=>{};drawOnlinePlayers({face(){}},[]);humanoid3=realHuman;
const box=hitboxes.find(b=>b.o?.type==='player');assert(box,'rendered peer has a world interaction target');canvas.getBoundingClientRect=()=>({left:0,top:0});const event={clientX:box.x+box.w/2,clientY:box.y+box.h/2};const picked=worldPick(event);assert.equal(picked.objects[0].username,'bobby');let requested=null;requestPlayerTrade=username=>requested=username;const options=worldOptionsFor(picked.objects[0]);options.find(([name])=>name==='Trade with Bob')[1]();assert.equal(requested,'bobby');assert.deepEqual(options.map(([name])=>name),['Trade with Bob','Follow Bob']);peer.x=s.x+5;onlinePeers.set(peer.id,peer);let routed=false;const realRoute=route;route=()=>{routed=true;return [[s.x+1,s.y]]};followPlayer(peer.id);assert(routed);assert.equal(followedPlayerId,peer.id);walkTo(s.x,s.y);assert.equal(followedPlayerId,null,'walking elsewhere cancels follow');route=realRoute;
// Follow targets the tile the leader just left, even inside the old radius.
px=20;py=20;s.x=20;s.y=20;peer.x=22;peer.y=20;peer.heading=Math.PI/2;peer.moving=true;peer.samples=[{x:21,y:20},{x:22,y:20}];peer.trailTile=null;peer.followTile=null;
let routeCalls=0,dest=null;route=(x,y,adjacent)=>{routeCalls++;dest={x,y,adjacent};return [[21,20]];};
followPlayer(peer.id);assert.equal(routeCalls,1);assert.equal(dest.x,21);assert.equal(dest.y,20);assert.equal(dest.adjacent,false,'follow targets an exact trailing tile, not adjacent radius');
peer.x=23;time+=.16;updatePlayerFollow();assert.equal(routeCalls,2,'responds within 0.16 seconds');assert.equal(dest.x,22);
time+=.16;updatePlayerFollow();assert.equal(routeCalls,2,'unchanged destination reuses its route');
peer.moving=false;time+=.16;updatePlayerFollow();assert.equal(peer.followTile.x,22,'stationary leader retains trailing tile');assert(path.length,'near leader does not clear path early');
px=22;py=20;s.x=22;s.y=20;time+=.16;updatePlayerFollow();assert.equal(path.length,0,'stops only on the trailing tile');
peer.x=23;peer.y=21;time+=.16;updatePlayerFollow();assert.equal(dest.x,23);assert.equal(dest.y,20,'turn follows the previous occupied tile');
peer.seen=Date.now()-13000;time+=.16;updatePlayerFollow();assert.equal(followedPlayerId,null,'stale leader cancels follow');route=realRoute;
console.log('PASS: visible players are selectable by world picking and offer Trade with their authenticated username.');
\`,ctx);`);
