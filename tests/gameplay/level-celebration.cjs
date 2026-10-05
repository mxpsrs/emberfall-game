const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
assetsReady=true;s.character={name:'Leveller'};s.xp.Mining=0;s.xp.Fishing=0;renderUI=save=renderTutorial=()=>{};
let clock=100000;Date.now=()=>clock;let popup=null;const lookup=document.getElementById;document.getElementById=id=>id==='levelCelebration'?popup:lookup(id);
const append=document.body.appendChild;document.body.appendChild=e=>{if(e.id==='levelCelebration'){popup=e;e.remove=()=>{popup=null;};Object.defineProperty(e,'innerHTML',{get(){return this.markup},set(v){this.markup=v;}});}return append.call(document.body,e);};
let scheduled=[],sounds=[];setTimeout=(fn,ms)=>scheduled.push({fn,ms});playGameSound=x=>sounds.push(x);
const opponent={type:'enemy',hp:20};target=opponent;path=[[1,2]];playerAttackReadyAt=900;
gain('Mining',SKILL_XP[2]);assert(levelCelebration);assert.equal(levelCelebration.skills.Mining,2);assert(popup.innerHTML.includes('Mining'));assert(sounds.includes('levelRise'));assert.equal(target,opponent);assert.equal(path.length,1);assert.equal(playerAttackReadyAt,900);
clock+=100;gain('Fishing',SKILL_XP[3]);assert.equal(levelCelebration.skills.Fishing,3);assert.equal(levelCelebration.skills.Mining,2,'simultaneous level gains remain visible');assert(!$('modal').open,'no blocking level-up dialog');
scheduled.filter(t=>t.ms===4600).forEach(t=>t.fn());assert.equal(popup,null,'popup automatically fades and clears');assert.equal(levelCelebration,null);
gain('Fishing',0);assert.equal(levelCelebration,null,'no celebration without a level gain');
console.log('PASS: real XP gains display skill/level, combine nearby gains, play dedicated sound, automatically clear and preserve combat/movement.');
`,ctx);
