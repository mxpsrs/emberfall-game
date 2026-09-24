const {ctx}=require('./game-fixture.cjs'),vm=require('node:vm'),fs=require('node:fs');
const items=vm.runInContext(`Object.fromEntries(Object.entries(ITEMS).map(([id,item])=>[id,{name:item.name,slot:item.slot||null,stackable:STACKABLE.has(id),tradeable:item.tradeable!==false}]))`,ctx);
fs.writeFileSync('worker/trade-items.json',JSON.stringify(items,null,2)+'\n');
