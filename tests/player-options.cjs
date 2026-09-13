const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Alice'};assetsReady=true;onlineScene=currentScene;const peer={id:'bob-id',name:'Bob',username:'bobby',x:s.x+1,y:s.y,drawX:s.x+1,drawY:s.y,seen:Date.now(),equipment:{},look:0};onlinePeers.set(peer.id,peer);hitboxes=[];const realHuman=humanoid3;humanoid3=()=>{};drawOnlinePlayers({face(){}},[]);humanoid3=realHuman;
const box=hitboxes.find(b=>b.o?.type==='player');assert(box,'rendered peer has a world interaction target');canvas.getBoundingClientRect=()=>({left:0,top:0});const event={clientX:box.x+box.w/2,clientY:box.y+box.h/2};const picked=worldPick(event);assert.equal(picked.objects[0].username,'bobby');let requested=null;requestPlayerTrade=username=>requested=username;const options=worldOptionsFor(picked.objects[0]);options.find(([name])=>name==='Trade with Bob')[1]();assert.equal(requested,'bobby');assert.deepEqual(options.map(([name])=>name),['Trade with Bob','Follow Bob']);peer.x=s.x+5;onlinePeers.set(peer.id,peer);let routed=false;const realRoute=route;route=()=>{routed=true;return [[s.x+1,s.y]]};followPlayer(peer.id);assert(routed);assert.equal(followedPlayerId,peer.id);walkTo(s.x,s.y);assert.equal(followedPlayerId,null,'walking elsewhere cancels follow');route=realRoute;
// Explicit departures preserve every turn even when a poll skips several tiles.
px=20;py=20;s.x=20;s.y=20;peer.moving=true;peer.trailEpoch=10;peer.trail=[[1,21,20,0]];
followPlayer(peer.id);assert.deepEqual(path,[[21,20]]);
peer.trail.push([2,22,20,0],[3,22,21,0]);time+=.06;updatePlayerFollow();assert.deepEqual(path,[[21,20],[22,20],[22,21]],'append missed departures without replacing unfinished route or cutting corner');
const queued=JSON.stringify(path);time+=.06;updatePlayerFollow();assert.equal(JSON.stringify(path),queued,'duplicate snapshot does not repeat path');
peer.moving=false;time+=.06;updatePlayerFollow();assert.equal(JSON.stringify(path),queued,'stopping leader does not erase the queued trail');
peer.seen=Date.now()-13000;time+=.06;updatePlayerFollow();assert.equal(followedPlayerId,null,'stale leader cancels follow');
console.log('PASS: visible players are selectable by world picking and offer Trade with their authenticated username.');
\`,ctx);`);
