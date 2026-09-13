const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nctx.setInterval=()=>{};ctx.AbortSignal=AbortSignal;ctx.fetch=async()=>({ok:true,json:async()=>({})});
vm.runInContext("let accountUsername='alice';const onlinePeers=new Map();let onlineScene=null;",ctx);
vm.runInContext(fs.readFileSync('dist/social.js','utf8'),ctx);
vm.runInContext(\`
s.character={name:'Alice'};s.bag={arrows:100};s.gear={woodenSword:1};s.equipment={weapon:'woodenSword'};s.gold=100;
appendChat({author:'bobby',recipient:null,body:'<img src=x onerror=bad()>',id:1});assert.equal($('chatMessages').children[0].textContent,'bobby: <img src=x onerror=bad()>','chat is rendered as text');
window.playerTrade=true;socialTrade={id:'example',username:'bobby',status:'active',revision:1,mine:{gold:10,items:[{id:'arrows',count:25}]},theirs:{gold:0,items:[{id:'runes',count:5}]},confirmed:false,peerConfirmed:false};renderPlayerTrade();assert(tradeDialog.open);assert(tradeDialog.children.some(e=>e.textContent==='Confirm this trade'));
socialTrade.confirmed=true;renderPlayerTrade();assert(tradeDialog.children.some(e=>e.disabled&&e.textContent==='Confirmed · waiting'));
socialTrade.status='complete';renderPlayerTrade();assert(tradeDialog.children.some(e=>e.textContent==='Trade complete. Your items are saved.'));
console.log('PASS: chat text safety, both trade offers render, confirmed controls lock, completion interface renders.');
\`,ctx);`);
