'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let clock=0;const ctx={performance:{now:()=>clock}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('client/asset-draws.js','utf8'),ctx);
for(const profile of ['browser','browser-mobile']){
 const budget=ctx.createVeldrenRenderableBudget(profile),owner=budget.registerOwner();let remaining=18,progress=0;
 const instance={pending:true,priority:1,advance(){remaining--;progress++;this.pending=remaining>0;clock+=1;}};
 budget.beginFrame();budget.enqueue(owner,instance);
 for(let frame=0;frame<25&&instance.pending;frame++){
  clock=frame*20;budget.beginFrame();
  while(budget.consume())clock+=6; // Costly legacy terrain/props keep arriving.
  budget.enqueue(owner,instance);const before=progress;budget.drain();
  assert(progress>before,'canonical resources make progress under continuous legacy demand');
  assert(budget.diagnostics().used<=budget.diagnostics().limit,'desktop/mobile construction count remains bounded');
 }
 assert(!instance.pending,profile+' completes its model construction');
 const canonicalFirst=ctx.createVeldrenRenderableBudget(profile),other=canonicalFirst.registerOwner();let legacyProgress=0;
 for(let frame=0;frame<12;frame++){clock=frame*20;canonicalFirst.beginFrame();for(let i=0;i<80;i++)canonicalFirst.enqueue(other,{pending:true,priority:i,advance(){clock+=3;}});canonicalFirst.drain();while(canonicalFirst.consume()){clock+=3;legacyProgress++;}assert(legacyProgress>frame,'terrain/compatibility work also advances after continuous canonical demand');assert(canonicalFirst.diagnostics().used<=canonicalFirst.diagnostics().limit);}
 const separated=ctx.createVeldrenRenderableBudget(profile);clock=0;separated.beginFrame();
 assert.equal(separated.run(()=>{clock+=.25;return 'first';}),'first');clock+=40;
 assert.equal(separated.run(()=>{clock+=.25;return 'late model';}),'late model','unrelated bone/transform work cannot starve later construction');
 assert.equal(separated.diagnostics().constructionMs,.5);assert.equal(separated.run(()=>{clock+=4;return 'atomic expensive mesh';}),'atomic expensive mesh');
 assert.equal(separated.run(()=>assert.fail('construction exceeds its time budget')),null,'actual allocation time still caps the queue');
 separated.beginFrame();assert.equal(separated.run(()=>{clock+=.1;return true;}),true,'time resets for the next frame');
}
console.log('PASS: canonical construction cannot starve behind recurring terrain/prop work; desktop and mobile budgets remain bounded.');
