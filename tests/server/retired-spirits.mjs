import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spiritBuild, spiritStrike, spiritGuard} from '../../worker/spirit-rules.js';
import catalog from '../../worker/shared-catalog.json' with {type: 'json'};

const legacy = {character: {name: 'Returning player'}, bag: {bones: 2},
  xp: {Worship: 120}, hp: 8, gold: 700, sceneId: 'overworld',
  spirits: {brook: {state: 'set', bondXP: 240}}, attunedSpirit: 'brook',
  firstSpirit: 'brook', spiritWardUntil: 99, spiritProgressVersion: 3};
const preserved = structuredClone(legacy);
const context = {s: legacy};
vm.createContext(context);
vm.runInContext(fs.readFileSync('client/spirits.js', 'utf8'), context);
vm.runInContext('setupSpirits()', context);
for (const key of ['spirits', 'attunedSpirit', 'firstSpirit', 'spiritWardUntil', 'spiritProgressVersion']) {
  assert(!(key in legacy), `${key} is retired`);
  delete preserved[key];
}
assert.deepEqual(legacy, {...preserved, spiritRemovalVersion: 1});
const once = JSON.stringify(legacy);
vm.runInContext('setupSpirits();updateSpirits(60);advanceSpiritBond("Mining",100)', context);
assert.equal(JSON.stringify(legacy), once, 'reload and legacy callers preserve possessions and progress');
assert.equal(vm.runInContext('unleashSpirit("brook") || summonSpirits()', context), false);
assert.equal(vm.runInContext('spiritBonus("health")', context), 0);
assert.equal(catalog.spirits, undefined, 'retired companions are absent from the shared catalog');
assert.equal(spiritBuild(preserved, 99).id, null);
assert.equal(spiritGuard(preserved, 99, 7), 7);
assert.deepEqual(spiritStrike(preserved, 99, {hits: 100}, 7),
  {damage: 7, heal: 0, energy: 0, slow: 0, proc: null, spirit: null, memory: null});
console.log('PASS: old saves migrate once without losing possessions or progress; retired client and server calls grant no abilities or bonuses.');
