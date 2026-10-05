import assert from 'node:assert/strict';
import {ensureCapeInventory} from '../../worker/admin-inventory.js';

const original={x:12,gear:{bronzeSword:1}};
const first=ensureCapeInventory(structuredClone(original));
assert.equal(first.after.adventureCloakForest,1);
assert.equal(first.after.redLeatherCape,1);
assert.equal(first.state.gear.bronzeSword,1);

const replay=ensureCapeInventory(structuredClone(first.state));
assert.deepEqual(replay.before,replay.after,'retries do not duplicate either cape');
assert.equal(replay.state.gear.adventureCloakForest,1);
assert.equal(replay.state.gear.redLeatherCape,1);

const existing=ensureCapeInventory({gear:{adventureCloakForest:2,redLeatherCape:3}});
assert.equal(existing.after.adventureCloakForest,2,'existing earned copies are never deleted');
assert.equal(existing.after.redLeatherCape,3,'existing earned copies are never deleted');
console.log('PASS: cape inventory grants are exact, idempotent, and preserve existing equipment.');
