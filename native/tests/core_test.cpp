#include "veldren/core.h"
#include "veldren/scene.h"

#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <vector>

int main() {
  void* world = veldren_world_create(256);
  assert(world);
  for (std::uint32_t id = 1; id <= 256; ++id) {
    VeldrenActorState actor{id, static_cast<float>(id), 0, static_cast<float>(id) + 10, 0, 4, 1.15F, 0};
    assert(veldren_actor_upsert(world, &actor) == 1);
  }
  assert(veldren_world_count(world) == 256);
  veldren_world_step(world, 0.5F);
  VeldrenActorState actor{};
  assert(veldren_actor_read(world, 39, &actor) == 1);
  assert(std::abs(actor.x - 41.0F) < 0.001F);
  const auto scene_bytes = veldren_world_scene_serialize(world, nullptr, 0);
  assert(scene_bytes > 0);
  std::vector<char> scene_json(static_cast<std::size_t>(scene_bytes) + 1);
  assert(veldren_world_scene_serialize(world, scene_json.data(), scene_json.size()) == scene_bytes);
  const auto runtime_scene = veldren::Scene::deserialize(scene_json.data());
  assert(runtime_scene.size() == 256);
  const auto actor_entity = runtime_scene.inspect("runtime:actor:39");
  assert(actor_entity.components.contains("ActorController"));
  assert(actor_entity.components.contains("Animator"));
  assert(actor_entity.components.contains("MeshRenderer"));
  const auto actor_position = runtime_scene.local_transform(actor_entity.id).position;
  assert(std::abs(actor_position.x - actor.x) < 0.001F);
  assert(std::abs(actor_position.z - actor.z) < 0.001F);
  actor.flags = VELDREN_ACTOR_HUMAN;
  assert(veldren_actor_upsert(world, &actor) == 1);
  const auto changed_role_bytes = veldren_world_scene_serialize(world, nullptr, 0);
  std::vector<char> changed_role_json(static_cast<std::size_t>(changed_role_bytes) + 1);
  assert(veldren_world_scene_serialize(world, changed_role_json.data(), changed_role_json.size()) == changed_role_bytes);
  const auto changed_role_scene = veldren::Scene::deserialize(changed_role_json.data());
  const auto changed_role_entity = changed_role_scene.inspect("runtime:actor:39");
  assert(changed_role_entity.name == "Veldren Actor");
  assert(changed_role_entity.components.contains("NPC"));
  assert(!changed_role_entity.components.contains("Monster"));
  VeldrenRenderState render{};
  render.id = 39;
  assert(veldren_render_states_read(world, &render, 1) == 1);
  assert(std::abs(render.x - 41.0F) < 0.001F);
  assert(render.phase > 0 && render.blend > 0 && render.speed > 0);
  VeldrenAnimationState animation{};
  animation.id = 39;
  animation.idle_phase = 0.25F;
  assert(veldren_animation_states_resolve(world, &animation, 1) == 1);
  assert(animation.clip == VELDREN_CLIP_RUN && animation.phase > 0);
  animation.clip = VELDREN_CLIP_ATTACK2;
  animation.flags = VELDREN_ANIMATION_ATTACKING;
  animation.phase = 0.4F;
  animation.blend = 0.8F;
  assert(veldren_animation_states_resolve(world, &animation, 1) == 1);
  assert(animation.clip == VELDREN_CLIP_ATTACK2);
  assert(animation.base_clip == VELDREN_CLIP_RUN);
  std::vector<std::uint32_t> visible(64);
  const auto count = veldren_query_visible(world, 40, 0, 5, visible.data(), visible.size());
  assert(count == 11);
  assert(veldren_actor_remove(world, 39) == 1);
  assert(veldren_actor_read(world, 39, &actor) == 0);
  assert(veldren_world_count(world) == 255);
  veldren_world_reset(world);
  assert(veldren_world_count(world) == 0);
  veldren_world_reset(world);
  VeldrenActorState villager{1, 0, 0, 10, 0, 0, 1.15F, VELDREN_ACTOR_HUMAN};
  VeldrenActorState wolf{2, 100, 0, 110, 0, 0, 1.6F, VELDREN_ACTOR_WOLF};
  assert(veldren_actor_upsert(world, &villager) == 1);
  assert(veldren_actor_upsert(world, &wolf) == 1);
  veldren_world_step_budgeted(world, 0.1F, 0, 0, 42);
  assert(veldren_actor_read(world, 1, &actor) == 1);
  assert(std::abs(actor.x - 0.075F) < 0.001F);
  assert(veldren_actor_read(world, 2, &actor) == 1);
  assert(std::abs(actor.x - 100.0F) < 0.001F);
  veldren_world_step_budgeted(world, 0.15F, 0, 0, 42);
  assert(veldren_actor_read(world, 2, &actor) == 1);
  assert(std::abs(actor.x - 100.4F) < 0.001F);
  veldren_world_reset(world);
  for (std::uint32_t id = 1; id <= 129; ++id) {
    VeldrenActorState crowded{id, 100.0F + static_cast<float>(id), 0,
                              110.0F + static_cast<float>(id), 0, 0, 1.15F,
                              id == 1 ? VELDREN_ACTOR_ALWAYS_ACTIVE : 0U};
    assert(veldren_actor_upsert(world, &crowded) == 1);
  }
  veldren_world_step_live(world, 0.1F, 0, 0);
  assert(veldren_actor_read(world, 1, &actor) == 1);
  assert(std::abs(actor.x - 101.125F) < 0.001F);
  assert(veldren_actor_read(world, 2, &actor) == 1);
  assert(std::abs(actor.x - 102.0F) < 0.001F);
  veldren_world_step_live(world, 0.15F, 0, 0);
  assert(veldren_actor_read(world, 2, &actor) == 1);
  assert(std::abs(actor.x - 102.3125F) < 0.001F);
  VeldrenActorState batch[2]{{201, 0, 0, 2, 0, 2, 1.15F, 0}, {202, 0, 0, 4, 0, 4, 1.15F, 0}};
  assert(veldren_actors_upsert(world, batch, 2) == 2);
  veldren_world_step(world, 0.25F);
  assert(veldren_actors_read(world, batch, 2) == 2);
  assert(std::abs(batch[0].x - 0.5F) < 0.001F);
  assert(std::abs(batch[1].x - 1.0F) < 0.001F);
  assert(veldren_skill_level(0, 82) == 1);
  assert(veldren_skill_level(0, 83) == 2);
  assert(veldren_skill_threshold(0, 2) == 83);
  assert(veldren_skill_level(1, 140) == 3);
  assert(veldren_skill_threshold(1, 3) == 140);
  assert(veldren_combat_level(10, 1, 1, 1, 1, 1, 1) == 3);
  assert(std::abs(veldren_attack_roll_chance(100, 50) - (1.0F - 52.0F / 202.0F)) < 0.0001F);
  assert(std::abs(veldren_player_accuracy(1, 1) - 0.84F) < 0.0001F);
  assert(veldren_player_accuracy(99, 1) == 0.97F);
  assert(veldren_player_accuracy(1, 99) == 0.35F);
  assert(std::abs(veldren_enemy_accuracy(10, 8) - 0.88F) < 0.0001F);
  assert(veldren_enemy_accuracy(99, 1) == 0.94F);
  assert(veldren_enemy_accuracy(1, 99) == 0.2F);
  assert(veldren_player_max_hit(0, 10, 2, 50, 20) == 17);
  assert(veldren_player_max_hit(1, 10, 2, 8, 3) == 25);
  assert(veldren_physical_max_hit(20, 64, 1) == 4);
  assert(veldren_magic_max_hit(10, 25) == 12);
  assert(std::abs(veldren_gathering_chance(20, 15, 2, 0.1F) - 0.595F) < 0.0001F);
  assert(std::abs(veldren_firemaking_chance(20, 15) - 0.51F) < 0.0001F);
  assert(std::abs(veldren_cooking_burn_chance(15, 1, 34) - 0.1842424F) < 0.0001F);
  assert(std::abs(veldren_iron_smelt_chance(20) - 0.55F) < 0.0001F);
  veldren_world_seed(world, 7, 11);
  const auto first_random = veldren_random_bounded(world, 1000);
  veldren_world_seed(world, 7, 11);
  assert(veldren_random_bounded(world, 1000) == first_random);
  float rewards[7]{};
  assert(veldren_combat_rewards(3, 0, 3, rewards) == 1);
  assert(std::abs(rewards[0] - 12.0F) < 0.001F);
  assert(std::abs(rewards[1] - 12.0F) < 0.001F);
  assert(std::abs(rewards[2] - 12.0F) < 0.001F);
  assert(std::abs(rewards[3] - 12.0F) < 0.001F);
  std::vector<std::uint8_t> cells(12 * 12, 0);
  for (std::uint32_t y = 1; y < 11; ++y) if (y != 6) cells[y * 12 + 5] = 1;
  std::vector<std::uint32_t> route(144);
  const auto route_count = veldren_pathfind(cells.data(), 12, 12, 2, 2, 9, 9, 0, 0, 144,
                                             route.data(), route.size());
  assert(route_count > 0);
  assert(route[route_count - 1] == 9 * 12 + 9);
  bool crossed_gap = false;
  for (std::int32_t index = 0; index < route_count; ++index)
    crossed_gap = crossed_gap || route[index] == 6 * 12 + 5;
  assert(crossed_gap);
  const auto adjacent_count = veldren_pathfind(cells.data(), 12, 12, 2, 2, 9, 9, 1.5F,
                                                VELDREN_PATH_ADJACENT, 144,
                                                route.data(), route.size());
  assert(adjacent_count > 0 && adjacent_count < route_count);
  assert(veldren_inventory_entry_slots(20, 1, 0) == 1);
  assert(veldren_inventory_entry_slots(3, 0, 1) == 2);
  assert(veldren_transfer_count(10, 7, 4) == 4);
  std::uint32_t balances[2]{};
  assert(veldren_spend_coins(5, 20, 12, balances) == 1);
  assert(balances[0] == 0 && balances[1] == 13);
  assert(veldren_spend_coins(5, 2, 12, balances) == 0);
  assert(veldren_craft_fits(25, 2, 0, 0, 2, 25) == 1);
  assert(veldren_craft_fits(25, 1, 0, 0, 2, 25) == 0);
  assert(veldren_action_events(1.0F, 0.95F, 1.8F, 0) == 1);
  assert(veldren_action_events(2.0F, 0.95F, 1.8F, 0) == 3);
  float clocks[2]{0.29F, 2.3F};
  assert(veldren_enemy_combat_tick(0.02F, 2.0F, 0, 0, 0, clocks) == 1);
  assert(std::abs(clocks[0]) < 0.001F);
  assert(veldren_enemy_combat_tick(0.1F, 1.0F, 0, 0, 1, clocks) == 2);
  assert(std::abs(clocks[1]) < 0.001F);
  const std::int32_t values[3]{5, 4, 3}, required[3]{5, 4, 3};
  assert(veldren_requirements_met(values, required, 3) == 1);
  const std::int32_t missing[3]{5, 3, 3};
  assert(veldren_requirements_met(missing, required, 3) == 0);
  assert(veldren_world_timer_events(1000, 999, 0, NAN, 0) == 1);
  assert(veldren_world_timer_events(1000, NAN, 9, 999, 5) == 2);
  assert(veldren_core_abi_version() == 12);
  VeldrenActorState player{901, 5, 0, 5, 0, 0, 1.15F,
                           VELDREN_ACTOR_HUMAN | VELDREN_ACTOR_PLAYER};
  assert(veldren_actor_upsert(world, &player) == 1);
  const auto final_scene_bytes = veldren_world_scene_serialize(world, nullptr, 0);
  std::vector<char> final_scene_json(static_cast<std::size_t>(final_scene_bytes) + 1);
  assert(veldren_world_scene_serialize(world, final_scene_json.data(), final_scene_json.size()) == final_scene_bytes);
  const auto final_scene = veldren::Scene::deserialize(final_scene_json.data());
  assert(final_scene.inspect("runtime:actor:901").components.contains("PlayerRepresentation"));
  veldren_world_destroy(world);
  std::cout << "PASS: native C++ actor simulation and visibility for 256 actors\n";
}
