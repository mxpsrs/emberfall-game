import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WASI} from 'node:wasi';

const file = process.argv[2];
if (!file) throw new Error('WASM path required');
let memory;
const wasi = new WASI({version: 'preview1', args: [], env: {}, preopens: {}});
const imports = {
  env: {emscripten_notify_memory_growth() {}},
  wasi_snapshot_preview1: wasi.wasiImport
};
const {instance} = await WebAssembly.instantiate(fs.readFileSync(file), imports);
wasi.initialize(instance);
const api = instance.exports;
memory = api.memory;
assert.equal(api.veldren_core_abi_version(), 17);
assert.equal(typeof api.veldren_world_step_budgeted, 'function');
assert.equal(typeof api.veldren_world_step_live, 'function');
assert.equal(typeof api.veldren_actors_upsert, 'function');
assert.equal(typeof api.veldren_actors_read, 'function');
assert.equal(typeof api.veldren_render_states_read, 'function');
assert.equal(typeof api.veldren_animation_states_resolve, 'function');
assert.equal(typeof api.veldren_pathfind, 'function');
assert.equal(typeof api.veldren_world_scene_serialize, 'function');
for (const name of ['veldren_world_seed','veldren_random_bounded','veldren_random_chance','veldren_roll_attack','veldren_skill_level','veldren_skill_threshold','veldren_combat_level','veldren_attack_roll_chance','veldren_player_accuracy','veldren_enemy_accuracy','veldren_player_max_hit','veldren_physical_max_hit','veldren_magic_max_hit','veldren_combat_rewards','veldren_gathering_chance','veldren_firemaking_chance','veldren_cooking_burn_chance','veldren_iron_smelt_chance','veldren_inventory_entry_slots','veldren_transfer_count','veldren_spend_coins','veldren_craft_fits','veldren_action_events','veldren_enemy_combat_tick','veldren_requirements_met','veldren_world_timer_events']) assert.equal(typeof api[name], 'function',name);
assert(Math.abs(api.veldren_player_accuracy(1,1)-0.84)<0.0001);
assert(Math.abs(api.veldren_enemy_accuracy(99,1)-0.94)<0.0001);
assert.equal(api.veldren_player_max_hit(1,10,2,8,3),25);
for (const name of ['veldren_world_scene_entity_upsert','veldren_world_scene_entity_remove','veldren_world_scene_entity_set_transform','veldren_world_scene_read','veldren_world_scene_component_ids','veldren_world_document_serialize','veldren_world_document_load','veldren_world_scene_revision','veldren_world_scene_lights_read']) assert.equal(typeof api[name], 'function',name);
const world = api.veldren_world_create(64);
assert(world);
const actor = api.malloc(32);
let view = new DataView(memory.buffer);
view.setUint32(actor, 7, true);
for (const [offset, value] of [[4, 10], [8, 10], [12, 20], [16, 10], [20, 4]]) {
  view.setFloat32(actor + offset, value, true);
}
view.setUint32(actor + 24, 0, true);
view.setFloat32(actor + 24, 1.15, true);
view.setUint32(actor + 28, (1 << 0) | (1 << 8), true);
assert.equal(api.veldren_actor_upsert(world, actor), 1);
api.veldren_world_step(world, 0.5);
assert.equal(api.veldren_actor_read(world, 7, actor), 1);
view = new DataView(memory.buffer);
assert(Math.abs(view.getFloat32(actor + 4, true) - 12) < 0.001);
assert.equal(api.veldren_world_count(world), 1);
view.setUint32(actor,7,true);assert.equal(api.veldren_render_states_read(world,actor,1),1);view=new DataView(memory.buffer);assert(view.getFloat32(actor+16,true)>0);assert(view.getFloat32(actor+20,true)>0);
const sceneLength=api.veldren_world_scene_serialize(world,0,0);
assert(sceneLength>0);
const sceneBuffer=api.malloc(sceneLength+1);
assert.equal(api.veldren_world_scene_serialize(world,sceneBuffer,sceneLength+1),sceneLength);
const sceneText=new TextDecoder().decode(new Uint8Array(memory.buffer,sceneBuffer,sceneLength));
const scene=JSON.parse(sceneText),entity=scene.entities.find(item=>item.id==='runtime:actor:7');
assert(entity);
assert.equal(entity.components.PlayerRepresentation.actorId,7);
assert.equal(entity.components.ActorController.actorId,7);
for (const [actual, expected] of entity.transform.position.map((value, index) => [value, [12,0,10][index]])) {
  assert(Math.abs(actual - expected) < 0.001);
}
api.free(sceneBuffer);
const cells=api.malloc(144),route=api.malloc(144*4);
new Uint8Array(memory.buffer,cells,144).fill(0);
view=new DataView(memory.buffer);for(let y=1;y<11;y++)if(y!==6)view.setUint8(cells+y*12+5,1);
const routeCount=api.veldren_pathfind(cells,12,12,2,2,9,9,0,0,144,route,144);
assert(routeCount>0);view=new DataView(memory.buffer);assert.equal(view.getUint32(route+(routeCount-1)*4,true),117);
api.free(cells);api.free(route);
api.free(actor);
api.veldren_world_destroy(world);
console.log('PASS: standalone C++ WebAssembly ABI executes without generated gameplay JavaScript');
