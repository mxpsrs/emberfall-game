const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Alice'};assetsReady=true;onlineScene=currentScene;const peer={id:'bob-id',name:'Bob',username:'bobby',x:s.x+1,y:s.y,drawX:s.x+1,drawY:s.y,seen:Date.now(),equipment:{},look:0};onlinePeers.set(peer.id,peer);hitboxes=[];const realHuman=humanoid3;humanoid3=()=>{};drawOnlinePlayers({face(){}},[]);humanoid3=realHuman;
const box=hitboxes.find(b=>b.o?.type==='player');assert(box,'rendered peer has a world interaction target');canvas.getBoundingClientRect=()=>({left:0,top:0});const event={clientX:box.x+box.w/2,clientY:box.y+box.h/2};const picked=worldPick(event);assert.equal(picked.objects[0].username,'bobby');let requested=null;requestPlayerTrade=username=>requested=username;const options=worldOptionsFor(picked.objects[0]);options.find(([name])=>name==='Trade with Bob')[1]();assert.equal(requested,'bobby');assert(!options.some(([name])=>name.startsWith('Attack')),'players cannot accidentally use NPC attack');
console.log('PASS: visible players are selectable by world picking and offer Trade with their authenticated username.');
\`,ctx);`);
