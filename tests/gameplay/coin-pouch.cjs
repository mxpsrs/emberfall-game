const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};tutorialEvent=()=>{};
s=defaults();s.gold=2500;s.bag={};s.gear={};s.equipment={};
const pile=groundDrop({coins:150});assert(takeGroundItem(pile,'coins'));assert.equal(s.bag.coins,150);assert.equal(s.gold,2500);assert.equal(inventorySlots().length,1);
assert.equal(itemActions('coins',true)[0][0],'Add to pouch');primaryItemAction('coins',true);assert.equal(s.gold,2650);assert(!s.bag.coins);assert.equal(inventorySlots().length,0);
assert(withdrawCoins(500));assert.equal(s.gold,2150);assert.equal(s.bag.coins,500);
window.playerTrade=true;assert(!addCoinsToPouch());assert(!withdrawCoins(1));window.playerTrade=false;
s.bag={bones:25};const full=groundDrop({coins:10});assert(!takeGroundItem(full,'coins'));assert.equal(full.items.coins,10);assert(!withdrawCoins(1));
receiveCoins(30);assert.equal(s.gold,2150);assert(s.groundLoot.some(p=>p.items.coins===40&&p.protectedDrop));
s.bag={bones:24,coins:2};assert(takeGroundItem(full,'coins'));assert.equal(s.bag.coins,42);assert.equal(inventorySlots().length,25);assert(withdrawCoins(50));assert.equal(s.bag.coins,92);
const before=carriedCoins();assert(buySupply('fish',1,92));assert.equal(carriedCoins(),before-92);assert.equal(inventorySlots().length,25);assert.equal(s.bag.fish,1);
const funds=carriedCoins();assert(!buySupply('fish',1,3));assert.equal(carriedCoins(),funds,'failed purchase refunds both sources');
s.bag={};s.gold=100;receiveCoins(5);assert(buySupply('arrows',10,10));assert.equal(s.gold,95);assert.equal(s.bag.coins,0);assert.equal(s.bag.arrows,10);
for(const n of [-1,1.5,NaN,Infinity]){assert(!withdrawCoins(n));assert(!spendCoins(n));}
s.gold=COIN_LIMIT;s.bag.coins=1;assert(!addCoinsToPouch());assert.equal(s.bag.coins,1);assert.equal(s.gold,COIN_LIMIT);
const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.gold,COIN_LIMIT);assert.equal(saved.bag.coins,1);
console.log('PASS: loot, manual pouch deposit, withdrawals, full inventory, protected overflow, trade lock, shop conservation, invalid amounts and saved balances.');
}`,ctx);
