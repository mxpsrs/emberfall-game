const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nctx.setInterval=()=>{};ctx.AbortSignal=AbortSignal;ctx.fetch=async()=>({ok:true,json:async()=>({})});ctx.document.querySelector=()=>null;ctx.devicePixelRatio=1;
// Retain controls when moving them between panels, as the browser DOM does.
const originalElement=el;function movable(){const node=originalElement();node.style.setProperty=()=>{};node.getAttribute=k=>node[k]||'';node.setAttribute=(k,v)=>node[k]=v;node.prepend=(...nodes)=>{for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(c=>c!==n);n.parentElement=node;}node.children.unshift(...nodes);};node.appendChild=child=>{if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(c=>c!==child);child.parentElement=node;node.children.push(child);return child;};node.append=(...nodes)=>nodes.forEach(n=>node.appendChild(n));node.querySelector=()=>movable();node.options=[];return node;}ctx.document.createElement=movable;for(const [id,node]of Object.entries(els)){Object.assign(node,{appendChild:movable().appendChild});}ctx.document.getElementById=id=>els[id]??=movable();ctx.document.body.style.setProperty=()=>{};
vm.runInContext(fs.readFileSync('dist/account-auth.js','utf8'),ctx);vm.runInContext("accountUsername='alice';",ctx);
vm.runInContext(fs.readFileSync('dist/game-messages.js','utf8'),ctx);vm.runInContext("gameMessage('Message before chat loads');",ctx);
vm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/social.js','utf8'),ctx);
// Use movable elements for controls created by the fixture before the shell mounts.
for(const id of ['combatbar','friendsPane','fullscreenButton','ambientButton','waveButton','journal','tutorial','gameTabs','mapHud','panel','gameDock','hitpointOrb','worshipOrb','coinPouchOrb'])els[id]=movable();
// Mirror the real document: spiritButton starts inside gameTabs, and an ID
// lookup cannot find a node after replaceChildren disconnects it.
const spiritControl=els.spiritButton||movable();els.spiritButton=spiritControl;
els.gameTabs.appendChild(spiritControl);
els.gameTabs.replaceChildren=()=>{for(const child of els.gameTabs.children)child.parentElement=null;els.gameTabs.children=[];};
const lookup=ctx.document.getElementById;
ctx.document.getElementById=id=>id==='spiritButton'&&!spiritControl.parentElement?null:lookup(id);
vm.runInContext(fs.readFileSync('dist/classic-ui.js','utf8'),ctx);
vm.runInContext(\`
assert($('chatMessages').children.some(p=>p.textContent==='Message before chat loads'),'early game notices retained');
assert.equal($('gameTabs').children.length,14);assert.equal($('runButton').parentElement,$('mapHud'));assert.equal($('spiritButton').parentElement,$('mapHud'));
s.character={name:'Alice',look:0};s.spirits={};assetsReady=false;
for(const which of ['friends','ignore','settings','emotes','music','account','worship','combat']){tab=which;renderPanel();assert($('panel').children.length>0,which+' renders');}
tab='friends';renderPanel();assert.equal($('friendsPane').parentElement,$('panel'));openSocial();assert.equal($('friendsPane').hidden,false,'chat and friends remain usable together');tab='settings';renderPanel();assert.equal($('friendsPane').parentElement,classicStorage,'friends control survives panel changes');
const before=$('chatMessages').children.length;toast('Your bag is full.');assert.equal($('chatMessages').children.length,before+1);assert.equal($('chatMessages').children.at(-1).textContent,'Your bag is full.');
assert.equal($('mapHud').children.filter(b=>b.id==='coinPouchOrb').length,1);assert(!$('mapHud').children.some(b=>b.id==='specialOrb'));s.gold=2500;updateClassicVitals();assert.equal($('coinPouchValue').textContent,'2,500');assert.equal($('hitpointValue').textContent,s.hp);assert.equal($('worshipValue').textContent,lv('Worship'));
console.log('PASS: fourteen wired tabs, preserved controls across panel switches, chat alongside friends, early notices, chat-only toast messages, and live map vitals.');
\`,ctx);`);
