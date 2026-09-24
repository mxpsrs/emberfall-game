#pragma once

#include <cstddef>
#include <cstdint>

#if defined(__EMSCRIPTEN__)
#define VELDREN_EXPORT extern "C" __attribute__((used)) __attribute__((visibility("default")))
#else
#define VELDREN_EXPORT extern "C"
#endif

struct VeldrenActorState {
  std::uint32_t id;
  float x;
  float z;
  float target_x;
  float target_z;
  float speed;
  float gait_distance;
  std::uint32_t flags;
};

struct VeldrenRenderState {
  std::uint32_t id;
  float x;
  float z;
  float heading;
  float phase;
  float blend;
  float speed;
  std::uint32_t flags;
};

struct VeldrenAnimationState {
  std::uint32_t id;
  std::uint32_t clip;
  std::uint32_t flags;
  std::uint32_t base_clip;
  float idle_phase;
  float phase;
  float blend;
  float hit_phase;
  float hit_blend;
  float death_phase;
  float death_blend;
  float base_phase;
};

enum VeldrenActorFlags : std::uint32_t {
  VELDREN_ACTOR_HUMAN = 1U << 0,
  VELDREN_ACTOR_WOLF = 1U << 1,
  VELDREN_ACTOR_SLIME = 1U << 2,
  VELDREN_ACTOR_SLOWED = 1U << 3,
  VELDREN_ACTOR_ALWAYS_ACTIVE = 1U << 4,
  VELDREN_ACTOR_RAT = 1U << 5,
  VELDREN_ACTOR_FACE_PLAYER = 1U << 6,
  VELDREN_ACTOR_TELEPORT = 1U << 7,
};

enum VeldrenRenderFlags : std::uint32_t {
  VELDREN_RENDER_MOVING = 1U << 0,
};

enum VeldrenAnimationClip : std::uint32_t {
  VELDREN_CLIP_IDLE = 0,
  VELDREN_CLIP_WALK = 1,
  VELDREN_CLIP_RUN = 2,
  VELDREN_CLIP_DEATH = 3,
  VELDREN_CLIP_HIT = 4,
  VELDREN_CLIP_ATTACK = 5,
  VELDREN_CLIP_ATTACK2 = 6,
  VELDREN_CLIP_ATTACK3 = 7,
  VELDREN_CLIP_CAST = 8,
  VELDREN_CLIP_CAST2 = 9,
  VELDREN_CLIP_THROW = 10,
};

enum VeldrenAnimationFlags : std::uint32_t {
  VELDREN_ANIMATION_DYING = 1U << 0,
  VELDREN_ANIMATION_ATTACKING = 1U << 1,
  VELDREN_ANIMATION_HIT = 1U << 2,
};

enum VeldrenAttackFlags : std::uint32_t {
  VELDREN_ATTACK_FORCE_HIT = 1U << 0,
  VELDREN_ATTACK_MINIMUM_ONE = 1U << 1,
};

enum VeldrenPathFlags : std::uint32_t {
  VELDREN_PATH_ADJACENT = 1U << 0,
};

VELDREN_EXPORT void* veldren_world_create(std::uint32_t capacity);
VELDREN_EXPORT void veldren_world_destroy(void* world);
VELDREN_EXPORT void veldren_world_reset(void* world);
VELDREN_EXPORT void veldren_world_seed(void* world, std::uint32_t low, std::uint32_t high);
VELDREN_EXPORT std::uint32_t veldren_actor_upsert(void* world, const VeldrenActorState* actor);
VELDREN_EXPORT std::uint32_t veldren_actors_upsert(
    void* world,
    const VeldrenActorState* actors,
    std::uint32_t count);
VELDREN_EXPORT std::uint32_t veldren_actor_remove(void* world, std::uint32_t id);
VELDREN_EXPORT std::uint32_t veldren_actor_read(const void* world, std::uint32_t id, VeldrenActorState* out);
VELDREN_EXPORT std::uint32_t veldren_actors_read(
    const void* world,
    VeldrenActorState* actors,
    std::uint32_t count);
VELDREN_EXPORT std::uint32_t veldren_render_states_read(
    const void* world,
    VeldrenRenderState* states,
    std::uint32_t count);
VELDREN_EXPORT std::uint32_t veldren_animation_states_resolve(
    void* world,
    VeldrenAnimationState* states,
    std::uint32_t count);
VELDREN_EXPORT void veldren_world_step(void* world, float seconds);
VELDREN_EXPORT void veldren_world_step_budgeted(
    void* world,
    float seconds,
    float player_x,
    float player_z,
    float near_radius);
VELDREN_EXPORT void veldren_world_step_live(
    void* world,
    float seconds,
    float player_x,
    float player_z);
VELDREN_EXPORT std::uint32_t veldren_query_visible(
    const void* world,
    float center_x,
    float center_z,
    float radius,
    std::uint32_t* out_ids,
    std::uint32_t out_capacity);
VELDREN_EXPORT std::int32_t veldren_pathfind(
    const std::uint8_t* cells,
    std::uint32_t width,
    std::uint32_t height,
    std::uint32_t start_x,
    std::uint32_t start_y,
    std::uint32_t goal_x,
    std::uint32_t goal_y,
    float reach,
    std::uint32_t flags,
    std::uint32_t maximum_visited,
    std::uint32_t* out_ids,
    std::uint32_t out_capacity);
VELDREN_EXPORT std::uint32_t veldren_world_count(const void* world);
VELDREN_EXPORT std::uint32_t veldren_random_bounded(void* world, std::uint32_t exclusive_maximum);
VELDREN_EXPORT std::uint32_t veldren_random_chance(void* world, float probability);
VELDREN_EXPORT std::uint32_t veldren_roll_attack(
    void* world,
    float accuracy,
    std::uint32_t maximum_hit,
    std::uint32_t flags);
VELDREN_EXPORT std::uint32_t veldren_skill_level(std::uint32_t worship, double experience);
VELDREN_EXPORT double veldren_skill_threshold(std::uint32_t worship, std::uint32_t level);
VELDREN_EXPORT std::uint32_t veldren_combat_level(
    std::uint32_t hitpoints,
    std::uint32_t attack,
    std::uint32_t strength,
    std::uint32_t defense,
    std::uint32_t worship,
    std::uint32_t magic,
    std::uint32_t ranged);
VELDREN_EXPORT float veldren_attack_roll_chance(float attack, float defense);
VELDREN_EXPORT std::uint32_t veldren_physical_max_hit(
    std::uint32_t effective_level,
    std::int32_t strength_bonus,
    std::uint32_t minimum_hit);
VELDREN_EXPORT std::uint32_t veldren_magic_max_hit(float power, float bonus_percent);
VELDREN_EXPORT std::uint32_t veldren_combat_rewards(
    float damage,
    std::uint32_t style,
    std::uint32_t focus,
    float* out_seven_rewards);
VELDREN_EXPORT float veldren_gathering_chance(
    std::uint32_t level,
    std::uint32_t required_level,
    std::uint32_t tool_rank,
    float mining_bonus);
VELDREN_EXPORT float veldren_firemaking_chance(std::uint32_t level, std::uint32_t required_level);
VELDREN_EXPORT float veldren_cooking_burn_chance(
    std::uint32_t level,
    std::uint32_t cooking_level,
    std::uint32_t burn_stop_level);
VELDREN_EXPORT float veldren_iron_smelt_chance(std::uint32_t level);
VELDREN_EXPORT std::uint32_t veldren_inventory_entry_slots(
    std::uint32_t count,
    std::uint32_t stackable,
    std::uint32_t worn_count);
VELDREN_EXPORT std::uint32_t veldren_transfer_count(
    std::uint32_t requested,
    std::uint32_t available,
    std::uint32_t room);
VELDREN_EXPORT std::uint32_t veldren_spend_coins(
    std::uint32_t loose,
    std::uint32_t pouch,
    std::uint32_t amount,
    std::uint32_t* out_balances);
VELDREN_EXPORT std::uint32_t veldren_craft_fits(
    std::uint32_t occupied_slots,
    std::uint32_t freed_slots,
    std::uint32_t result_stackable,
    std::uint32_t result_already_held,
    std::uint32_t result_count,
    std::uint32_t capacity);
VELDREN_EXPORT std::uint32_t veldren_action_events(
    float age,
    float commit_at,
    float duration,
    std::uint32_t committed);
VELDREN_EXPORT std::uint32_t veldren_enemy_combat_tick(
    float seconds,
    float distance,
    float movement_distance,
    std::uint32_t dummy,
    std::uint32_t line_of_sight,
    float* in_out_clocks);
VELDREN_EXPORT std::uint32_t veldren_requirements_met(
    const std::int32_t* values,
    const std::int32_t* required,
    std::uint32_t count);
VELDREN_EXPORT std::uint32_t veldren_world_timer_events(
    double now_milliseconds,
    double expires_at_milliseconds,
    float dead_until,
    double respawn_at_milliseconds,
    float game_time);
VELDREN_EXPORT std::uint32_t veldren_core_abi_version();
