const fs=require('fs');
const bootstrap=fs.readFileSync('tests/gameplay/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../../client/'","const root=process.cwd()+'/client/'");
eval(bootstrap+`\nctx.setInterval=()=>{};ctx.AbortSignal=AbortSignal;ctx.fetch=async()=>({ok:true,json:async()=>({})});ctx.document.querySelector=()=>null;ctx.devicePixelRatio=1;
// Retain controls when moving them between panels, as the browser DOM does.
const originalElement=el;function movable(){const node=originalElement();node.style.setProperty=()=>{};node.getAttribute=k=>node[k]||'';node.setAttribute=(k,v)=>node[k]=v;node.prepend=(...nodes)=>{for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(c=>c!==n);n.parentElement=node;}node.children.unshift(...nodes);};node.appendChild=child=>{if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(c=>c!==child);child.parentElement=node;node.children.push(child);if(child.id)els[child.id]=child;return child;};node.append=(...nodes)=>nodes.forEach(n=>node.appendChild(n));node.querySelector=()=>movable();node.options=[];return node;}ctx.document.createElement=movable;for(const [id,node]of Object.entries(els)){Object.assign(node,{appendChild:movable().appendChild});}ctx.document.getElementById=id=>els[id]??=movable();ctx.document.body.style.setProperty=()=>{};
vm.runInContext(fs.readFileSync('client/account-auth.js','utf8'),ctx);vm.runInContext("accountUsername='alice';",ctx);
vm.runInContext(fs.readFileSync('client/game-messages.js','utf8'),ctx);vm.runInContext("gameMessage('Message before chat loads');",ctx);
vm.runInContext(fs.readFileSync('client/multiplayer.js','utf8'),ctx);vm.runInContext(fs.readFileSync('client/social.js','utf8'),ctx);
// Use movable elements for controls created by the fixture before the shell mounts.
for(const id of ['combatbar','friendsPane','fullscreenButton','ambientButton','waveButton','journal','tutorial','gameTabs','mapHud','panel','gameDock','hitpointOrb','worshipOrb','coinPouchOrb'])els[id]=movable();
ctx.navigator={};els.game=movable();els.game.appendChild(els.fullscreenButton);
vm.runInContext(fs.readFileSync('client/play-display.js','utf8'),ctx);
// Mirror the real document: spiritButton starts inside gameTabs, and an ID
// lookup cannot find a node after replaceChildren disconnects it.
const spiritControl=els.spiritButton||movable();els.spiritButton=spiritControl;
els.gameTabs.appendChild(spiritControl);
els.gameTabs.replaceChildren=()=>{for(const child of els.gameTabs.children)child.parentElement=null;els.gameTabs.children=[];};
const lookup=ctx.document.getElementById;
ctx.document.getElementById=id=>id==='spiritButton'&&!spiritControl.parentElement?null:lookup(id);
vm.runInContext(fs.readFileSync('client/classic-ui.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Spirit UI'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.spirits={cinder:{state:'set'},pyre:{state:'set'}};
const beforeLookup=document.getElementById;let actualPanel=null;document.getElementById=id=>id==='spiritQuickPanel'?actualPanel:beforeLookup(id);
const baseCreate=document.createElement;document.createElement=(...args)=>{const e=baseCreate(...args),queries={};e.querySelector=key=>queries[key]??=(baseCreate('div'));return e;};
const appendSocial=socialRoot.appendChild;socialRoot.appendChild=e=>{if(e.id==='spiritQuickPanel')actualPanel=e;return appendSocial.call(socialRoot,e);};
const foe={type:'enemy',hp:20};target=foe;path=[[3,4]];playerAttackReadyAt=500;openSpirits();
assert.equal(actualPanel.parentElement,socialRoot,'picker is inside actual chat container');assert.equal(target,foe);assert.equal(path.length,1);assert.equal(playerAttackReadyAt,500);assert(!$('spiritsDialog').open,'fullscreen dialog stays closed');
const choices=actualPanel.querySelector('.quick-spirit-grid').children;assert.equal(choices.length,9,'eight spirit options and convergence');let chosen=null;unleashSpirit=id=>{chosen=id;return true;};choices.find(b=>b.dataset.spirit==='pyre').onclick();assert.equal(chosen,'pyre');
closeSpiritChoices();assert.equal(spiritQuickOpen,false);assert.equal(target,foe);assert.equal(path.length,1);
console.log('PASS: Unleash opens eight portrait choices only inside chat, selects the clicked spirit, closes back to chat and leaves target, path and attack clock intact.');
\`,ctx);`);
