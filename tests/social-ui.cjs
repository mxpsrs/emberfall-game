const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nctx.process=process;ctx.setInterval=()=>{};ctx.AbortSignal=AbortSignal;ctx.fetch=async()=>({ok:true,json:async()=>({})});ctx.document.querySelector=()=>null;ctx.innerWidth=1108;ctx.innerHeight=512;
vm.runInContext("let accountUsername='alice';",ctx);
vm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/social.js','utf8'),ctx);
vm.runInContext(\`
(async()=>{
s.character={name:'Alice'};s.bag={arrows:100,coins:100};s.gear={woodenSword:1};s.equipment={weapon:'woodenSword'};s.gold=100;
appendChat({author:'bobby',recipient:null,body:'<img src=x onerror=bad()>',id:1,age:0});assert.equal($('chatMessages').children[0].textContent,'bobby: <img src=x onerror=bad()>','chat is rendered as text');assert(socialOverheads.has('bobby'));
appendChat({author:'carol',recipient:'alice',body:'Private only',id:2,age:0});assert(!socialOverheads.has('carol'),'private messages never go overhead');assert.equal(socialLastPrivate,'carol');
const seen=$('chatMessages').children.length;appendChat({author:'carol',recipient:'alice',body:'Private only',id:2,age:0});assert.equal($('chatMessages').children.length,seen,'send echo and polling cannot duplicate a message');
$('chatText').focus=()=>{};selectChat('bobby');let sends=[];const originalPost=socialPost;socialPost=async body=>{sends.push(body);return {message:{id:10+sends.length,author:'alice',recipient:body.username||null,body:body.text,age:0}};};
$('chatText').value='First private';await $('chatForm').onsubmit({preventDefault(){}});assert.equal(socialChannel,'bobby');assert.equal($('chatChannel').textContent,'To bobby:');
$('chatText').value='Still private';await $('chatForm').onsubmit({preventDefault(){}});assert.equal(sends[1].username,'bobby','second message stays private');
$('chatTabs').children.find(b=>b.dataset.channel==='public').onclick();$('chatText').value='Local again';await $('chatForm').onsubmit({preventDefault(){}});assert.equal(sends[2].username,undefined);assert.equal($('chatChannel').textContent,'Local:');socialPost=originalPost;
const labels=[];pushOverheadChat(labels,'A long public message that needs wrapping so nearby players can read it without covering the entire game screen.',10,20);assert(labels.length>1);assert(labels.every(e=>e[0].length<=38));
function descendants(e){return [e,...e.children.flatMap(descendants)];}
window.playerTrade=true;socialTrade={id:'example',username:'bobby',status:'active',stage:'offer',revision:1,mine:{gold:10,items:[{id:'arrows',count:25}]},theirs:{gold:0,items:[{id:'runes',count:5}]},accepted:false,peerAccepted:false};await renderPlayerTrade();assert(tradeDialog.open);assert(descendants(tradeDialog).some(e=>e.textContent==='Accept'));assert(descendants(tradeDialog).some(e=>e.textContent==='Inventory'));
let posted;tradeAction=(action,offer)=>{posted={action,offer};};changeTradeQuantity('arrows',5);assert.equal(posted.offer.items[0].count,30);changeTradeQuantity('arrows',10,true);assert.equal(posted.offer.items[0].count,15);changeTradeQuantity('coins',1000);assert.equal(posted.offer.gold,100);
socialTrade.accepted=true;await renderPlayerTrade();assert(descendants(tradeDialog).some(e=>e.disabled&&e.textContent==='Accepted'));
socialTrade.stage='review';socialTrade.accepted=false;await renderPlayerTrade();assert(!descendants(tradeDialog).some(e=>e.textContent==='Inventory'),'final review cannot edit bag');assert(descendants(tradeDialog).some(e=>e.textContent==='Are you sure you want to make this trade?'));assert(descendants(tradeDialog).some(e=>e.textContent?.includes('25')));posted=null;changeTradeQuantity('arrows',1);assert.equal(posted,null,'quantity edit blocked during final review');
initializeCloud=async()=>{};renderUI=()=>{};cloudBusy=false;socialTrade.status='complete';await renderPlayerTrade();assert(!tradeDialog.open);assert(!window.playerTrade);assert.equal(socialTrade,null,'completed trade clears without page reload');
const p={x:1,y:0,running:false,moving:true,route:[[1,1]],sampleAt:1000,samples:[{x:0,y:0,at:500},{x:1,y:0,at:1000}]};assert.equal(samplePeerPosition(p,1000).x,.5);assert.equal(samplePeerPosition(p,1750).y,1,'prediction follows route corner');assert.equal(samplePeerPosition({...p,route:[[1,10]]},10000).y,1.125,'prediction is bounded after network silence');
console.log('PASS: safe chat, public-only overheads, wrapped speech, trade grids and quantities, separate final review, no-reload completion, timestamp interpolation and bounded route prediction.');
})().catch(e=>{console.error(e);process.exitCode=1;});
\`,ctx);`);
