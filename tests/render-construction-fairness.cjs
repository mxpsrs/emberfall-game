'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let clock=0;const ctx={performance:{now:()=>clock}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/asset-draws.js','utf8'),ctx);
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
}
console.log('PASS: canonical construction cannot starve behind recurring terrain/prop work; desktop and mobile budgets remain bounded.');
