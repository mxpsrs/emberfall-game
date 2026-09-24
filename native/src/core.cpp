#include "veldren/core.h"

#include <algorithm>
#include <cmath>
#include <memory>
#include <limits>
#include <queue>
#include <unordered_map>
#include <vector>

namespace {

constexpr float kMaximumStep = 0.05F;
constexpr float kArrivalEpsilon = 0.0001F;
constexpr float kFarActorInterval = 0.25F;
constexpr float kFarActorMaximumStep = 0.5F;
constexpr float kLiveNearRadius = 42.0F;
constexpr std::size_t kCrowdedActorCount = 128;

struct ActorRecord {
  VeldrenActorState state;
  float far_time = 0;
  float heading = 0;
  float phase = 0;
  float blend = 0;
  float motion_speed = 0;
  std::uint32_t render_flags = 0;
  std::uint32_t last_clip = VELDREN_CLIP_IDLE;
  float last_phase = 0;
};

class World {
 public:
  explicit World(std::uint32_t capacity) {
    actors_.reserve(std::max<std::uint32_t>(capacity, 64));
    index_.reserve(std::max<std::uint32_t>(capacity, 64));
  }

  bool Upsert(const VeldrenActorState& actor) {
    if (actor.id == 0 || !Finite(actor)) return false;
    const auto found = index_.find(actor.id);
    if (found == index_.end()) {
      index_.emplace(actor.id, actors_.size());
      actors_.push_back({actor, 0, std::fmod(actor.id * 2.399F, 6.28318530718F), 0, 0, 0, 0,
                         VELDREN_CLIP_IDLE, 0});
    } else {
      auto& record = actors_[found->second];
      if ((actor.flags & VELDREN_ACTOR_TELEPORT) != 0) {
        record.state.x = actor.x;
        record.state.z = actor.z;
        record.phase = 0;
        record.blend = 0;
        record.motion_speed = 0;
      }
      record.state.target_x = actor.target_x;
      record.state.target_z = actor.target_z;
      record.state.speed = actor.speed;
      record.state.gait_distance = actor.gait_distance;
      record.state.flags = actor.flags;
    }
    return true;
  }

  bool Remove(std::uint32_t id) {
    const auto found = index_.find(id);
    if (found == index_.end()) return false;
    const std::size_t removed = found->second;
    const std::size_t last = actors_.size() - 1;
    if (removed != last) {
      actors_[removed] = actors_[last];
      index_[actors_[removed].state.id] = removed;
    }
    actors_.pop_back();
    index_.erase(found);
    return true;
  }

  const VeldrenActorState* Read(std::uint32_t id) const {
    const auto found = index_.find(id);
    return found == index_.end() ? nullptr : &actors_[found->second].state;
  }

  void Step(float seconds) {
    if (!std::isfinite(seconds) || seconds <= 0) return;
    float remaining = std::min(seconds, 1.0F);
    while (remaining > 0) {
      const float dt = std::min(remaining, kMaximumStep);
      for (auto& actor : actors_) StepActor(actor, dt, false, 0, 0);
      remaining -= dt;
    }
  }

  void StepBudgeted(float seconds, float player_x, float player_z, float near_radius) {
    if (!std::isfinite(seconds) || seconds <= 0 || !std::isfinite(player_x) ||
        !std::isfinite(player_z) || !std::isfinite(near_radius) || near_radius < 0) return;
    const float elapsed = std::min(seconds, 1.0F);
    const float radius_squared = near_radius * near_radius;
    for (auto& actor : actors_) {
      const float dx = actor.state.x - player_x;
      const float dz = actor.state.z - player_z;
      const bool active = (actor.state.flags & VELDREN_ACTOR_ALWAYS_ACTIVE) != 0 ||
                          dx * dx + dz * dz < radius_squared;
      if (active) {
        actor.far_time = 0;
        StepActor(actor, elapsed, true, player_x, player_z);
        continue;
      }
      actor.far_time += elapsed;
      if (actor.far_time < kFarActorInterval) continue;
      StepActor(actor, std::min(kFarActorMaximumStep, actor.far_time), true, player_x, player_z);
      actor.far_time = 0;
    }
  }

  std::uint32_t Visible(float center_x, float center_z, float radius,
                        std::uint32_t* out, std::uint32_t capacity) const {
    if (!out || capacity == 0 || !std::isfinite(center_x) ||
        !std::isfinite(center_z) || !std::isfinite(radius) || radius < 0) return 0;
    const float radius_squared = radius * radius;
    std::uint32_t count = 0;
    for (const auto& record : actors_) {
      const auto& actor = record.state;
      const float dx = actor.x - center_x;
      const float dz = actor.z - center_z;
      if (dx * dx + dz * dz > radius_squared + kArrivalEpsilon) continue;
      out[count++] = actor.id;
      if (count == capacity) break;
    }
    return count;
  }

  std::uint32_t Count() const { return static_cast<std::uint32_t>(actors_.size()); }
  bool ReadRender(std::uint32_t id, VeldrenRenderState* out) const {
    if (!out) return false;
    const auto found = index_.find(id);
    if (found == index_.end()) return false;
    const auto& actor = actors_[found->second];
    *out = {actor.state.id, actor.state.x, actor.state.z, actor.heading, actor.phase,
            actor.blend, actor.motion_speed, actor.render_flags};
    return true;
  }
  bool ResolveAnimation(VeldrenAnimationState* state) {
    if (!state) return false;
    const auto found = index_.find(state->id);
    if (found == index_.end()) return false;
    auto& actor = actors_[found->second];
    const auto candidate_clip = state->clip;
    const auto flags = state->flags;
    const float candidate_phase = state->phase;
    const float candidate_blend = state->blend;
    const auto gait = actor.motion_speed > 3.2F ? VELDREN_CLIP_RUN : VELDREN_CLIP_WALK;
    state->clip = VELDREN_CLIP_IDLE;
    state->phase = state->idle_phase;
    state->blend = 1.0F;
    state->base_clip = VELDREN_CLIP_IDLE;
    state->base_phase = state->idle_phase;
    if ((flags & VELDREN_ANIMATION_DYING) != 0) {
      state->clip = VELDREN_CLIP_DEATH;
      state->phase = state->death_phase;
      state->blend = state->death_blend;
      state->base_clip = actor.last_clip;
      state->base_phase = actor.last_phase;
    } else if ((flags & VELDREN_ANIMATION_ATTACKING) != 0) {
      state->clip = candidate_clip;
      state->phase = candidate_phase;
      state->blend = candidate_blend;
    } else if ((flags & VELDREN_ANIMATION_HIT) != 0) {
      state->clip = VELDREN_CLIP_HIT;
      state->phase = state->hit_phase;
      state->blend = state->hit_blend;
    } else if (actor.blend > 0.015F) {
      state->clip = gait;
      state->phase = actor.phase;
      state->blend = actor.blend;
    }
    if ((flags & VELDREN_ANIMATION_DYING) == 0 &&
        state->clip >= VELDREN_CLIP_HIT && actor.blend > 0.5F) {
      state->base_clip = gait;
      state->base_phase = actor.phase;
    }
    if ((flags & VELDREN_ANIMATION_DYING) == 0) {
      actor.last_clip = state->clip;
      actor.last_phase = state->phase;
    }
    return true;
  }
  void Reset() { actors_.clear(); index_.clear(); }
  void Seed(std::uint32_t low, std::uint32_t high) {
    random_state_ = (static_cast<std::uint64_t>(high) << 32U) | low;
    if (random_state_ == 0) random_state_ = 0x9e3779b97f4a7c15ULL;
  }

  std::uint32_t RandomBounded(std::uint32_t exclusive_maximum) {
    if (exclusive_maximum == 0) return 0;
    const std::uint32_t threshold = static_cast<std::uint32_t>(-exclusive_maximum) % exclusive_maximum;
    for (;;) {
      const std::uint32_t value = NextRandom();
      if (value >= threshold) return value % exclusive_maximum;
    }
  }

  bool RandomChance(float probability) {
    if (!std::isfinite(probability) || probability <= 0) return false;
    if (probability >= 1) return true;
    return static_cast<double>(NextRandom()) /
               (static_cast<double>(std::numeric_limits<std::uint32_t>::max()) + 1.0) <
           probability;
  }

 private:
  static bool Finite(const VeldrenActorState& actor) {
    return std::isfinite(actor.x) && std::isfinite(actor.z) &&
           std::isfinite(actor.target_x) && std::isfinite(actor.target_z) &&
           std::isfinite(actor.speed) && actor.speed >= 0 &&
           std::isfinite(actor.gait_distance) && actor.gait_distance >= 0;
  }

  static void StepActor(ActorRecord& record, float dt, bool has_player,
                        float player_x, float player_z) {
    auto& actor = record.state;
    const float before_x = actor.x;
    const float before_z = actor.z;
    const float dx = actor.target_x - actor.x;
    const float dz = actor.target_z - actor.z;
    const float distance_squared = dx * dx + dz * dz;
    if (distance_squared > kArrivalEpsilon) {
      const float distance = std::sqrt(distance_squared);
      const float travel = std::min(distance, Speed(actor) * dt);
      actor.x += dx / distance * travel;
      actor.z += dz / distance * travel;
    }
    const float moved_x = actor.x - before_x;
    const float moved_z = actor.z - before_z;
    const float moved = std::hypot(moved_x, moved_z);
    const bool walking = moved > 0.0003F && moved < 2.0F;
    const float measured_speed = walking && dt > 0 ? moved / dt : 0;
    record.motion_speed += (measured_speed - record.motion_speed) * std::min(1.0F, dt * 8.0F);
    record.blend += ((walking ? 1.0F : 0.0F) - record.blend) * std::min(1.0F, dt * 12.0F);
    if (walking) {
      const float gait = actor.gait_distance > 0 ? actor.gait_distance : 1.15F;
      record.phase = std::fmod(record.phase + moved / gait, 1.0F);
    }
    float desired = record.heading;
    if (walking) desired = std::atan2(moved_x, moved_z);
    else if (has_player && (actor.flags & VELDREN_ACTOR_FACE_PLAYER) != 0 &&
             std::hypot(player_x - actor.x, player_z - actor.z) < 12.0F)
      desired = std::atan2(player_x - actor.x, player_z - actor.z);
    const float delta = std::atan2(std::sin(desired - record.heading),
                                   std::cos(desired - record.heading));
    record.heading += delta * std::min(1.0F, dt * 15.0F);
    record.render_flags = walking ? static_cast<std::uint32_t>(VELDREN_RENDER_MOVING) : 0U;
  }

  static float Speed(const VeldrenActorState& actor) {
    float speed = actor.speed;
    if (speed <= 0) {
      if ((actor.flags & VELDREN_ACTOR_HUMAN) != 0) speed = 0.75F;
      else if ((actor.flags & VELDREN_ACTOR_WOLF) != 0) speed = 1.6F;
      else if ((actor.flags & VELDREN_ACTOR_SLIME) != 0) speed = 0.85F;
      else speed = 1.25F;
    }
    return (actor.flags & VELDREN_ACTOR_SLOWED) != 0 ? speed * 0.45F : speed;
  }

  std::uint32_t NextRandom() {
    std::uint64_t value = random_state_;
    value ^= value >> 12U;
    value ^= value << 25U;
    value ^= value >> 27U;
    random_state_ = value;
    return static_cast<std::uint32_t>((value * 0x2545f4914f6cdd1dULL) >> 32U);
  }

  std::vector<ActorRecord> actors_;
  std::unordered_map<std::uint32_t, std::size_t> index_;
  std::uint64_t random_state_ = 0x9e3779b97f4a7c15ULL;
};

World* AsWorld(void* world) { return static_cast<World*>(world); }
const World* AsWorld(const void* world) { return static_cast<const World*>(world); }

struct PathNode {
  std::uint32_t id;
  float cost;
  float score;
};

struct PathNodeLater {
  bool operator()(const PathNode& left, const PathNode& right) const {
    return left.score > right.score;
  }
};

bool GridBlocked(const std::uint8_t* cells, std::uint32_t id) {
  // A value of 2 is an unresolved browser terrain cell. Treat it as open so
  // the adapter can resolve only the cells touched by a candidate route.
  return cells[id] == 1U;
}

float OctileDistance(std::uint32_t ax, std::uint32_t ay,
                     std::uint32_t bx, std::uint32_t by) {
  const float dx = static_cast<float>(ax > bx ? ax - bx : bx - ax);
  const float dy = static_cast<float>(ay > by ? ay - by : by - ay);
  return std::max(dx, dy) + (1.41421356237F - 1.0F) * std::min(dx, dy);
}

bool GridLineClear(const std::uint8_t* cells, std::uint32_t width,
                   std::uint32_t height, std::uint32_t ax, std::uint32_t ay,
                   std::uint32_t bx, std::uint32_t by) {
  const int dx = std::abs(static_cast<int>(bx) - static_cast<int>(ax));
  const int dy = std::abs(static_cast<int>(by) - static_cast<int>(ay));
  const int sx = ax < bx ? 1 : -1;
  const int sy = ay < by ? 1 : -1;
  int error = dx - dy;
  int x = static_cast<int>(ax);
  int y = static_cast<int>(ay);
  for (;;) {
    if ((x != static_cast<int>(ax) || y != static_cast<int>(ay)) &&
        (x != static_cast<int>(bx) || y != static_cast<int>(by)) &&
        (x < 0 || y < 0 || x >= static_cast<int>(width) ||
         y >= static_cast<int>(height) ||
         GridBlocked(cells, static_cast<std::uint32_t>(y) * width +
                                static_cast<std::uint32_t>(x)))) return false;
    if (x == static_cast<int>(bx) && y == static_cast<int>(by)) return true;
    const int doubled = error * 2;
    if (doubled > -dy) { error -= dy; x += sx; }
    if (doubled < dx) { error += dx; y += sy; }
  }
}

}  // namespace

void* veldren_world_create(std::uint32_t capacity) {
  try { return new World(capacity); } catch (...) { return nullptr; }
}

void veldren_world_destroy(void* world) { delete AsWorld(world); }
void veldren_world_reset(void* world) { if (world) AsWorld(world)->Reset(); }
void veldren_world_seed(void* world, std::uint32_t low, std::uint32_t high) {
  if (world) AsWorld(world)->Seed(low, high);
}

std::uint32_t veldren_actor_upsert(void* world, const VeldrenActorState* actor) {
  return world && actor && AsWorld(world)->Upsert(*actor) ? 1U : 0U;
}

std::uint32_t veldren_actors_upsert(void* world, const VeldrenActorState* actors,
                                    std::uint32_t count) {
  if (!world || (!actors && count != 0)) return 0;
  std::uint32_t accepted = 0;
  for (std::uint32_t i = 0; i < count; ++i) accepted += AsWorld(world)->Upsert(actors[i]);
  return accepted;
}

std::uint32_t veldren_actor_remove(void* world, std::uint32_t id) {
  return world && AsWorld(world)->Remove(id) ? 1U : 0U;
}

std::uint32_t veldren_actor_read(const void* world, std::uint32_t id, VeldrenActorState* out) {
  if (!world || !out) return 0;
  const auto* actor = AsWorld(world)->Read(id);
  if (!actor) return 0;
  *out = *actor;
  return 1;
}

std::uint32_t veldren_actors_read(const void* world, VeldrenActorState* actors,
                                  std::uint32_t count) {
  if (!world || (!actors && count != 0)) return 0;
  std::uint32_t found = 0;
  for (std::uint32_t i = 0; i < count; ++i) {
    const auto* actor = AsWorld(world)->Read(actors[i].id);
    if (!actor) continue;
    actors[i] = *actor;
    ++found;
  }
  return found;
}

std::uint32_t veldren_render_states_read(const void* world, VeldrenRenderState* states,
                                         std::uint32_t count) {
  if (!world || (!states && count != 0)) return 0;
  std::uint32_t found = 0;
  for (std::uint32_t index = 0; index < count; ++index)
    found += AsWorld(world)->ReadRender(states[index].id, &states[index]) ? 1U : 0U;
  return found;
}

std::uint32_t veldren_animation_states_resolve(void* world, VeldrenAnimationState* states,
                                               std::uint32_t count) {
  if (!world || (!states && count != 0)) return 0;
  std::uint32_t found = 0;
  for (std::uint32_t index = 0; index < count; ++index)
    found += AsWorld(world)->ResolveAnimation(&states[index]) ? 1U : 0U;
  return found;
}

void veldren_world_step(void* world, float seconds) { if (world) AsWorld(world)->Step(seconds); }

void veldren_world_step_budgeted(void* world, float seconds, float player_x,
                                 float player_z, float near_radius) {
  if (world) AsWorld(world)->StepBudgeted(seconds, player_x, player_z, near_radius);
}

void veldren_world_step_live(void* world, float seconds, float player_x, float player_z) {
  if (!world) return;
  if (AsWorld(world)->Count() <= kCrowdedActorCount) AsWorld(world)->Step(seconds);
  else AsWorld(world)->StepBudgeted(seconds, player_x, player_z, kLiveNearRadius);
}

std::uint32_t veldren_query_visible(const void* world, float center_x, float center_z,
                                    float radius, std::uint32_t* out_ids,
                                    std::uint32_t out_capacity) {
  return world ? AsWorld(world)->Visible(center_x, center_z, radius, out_ids, out_capacity) : 0;
}

std::int32_t veldren_pathfind(const std::uint8_t* cells, std::uint32_t width,
                              std::uint32_t height, std::uint32_t start_x,
                              std::uint32_t start_y, std::uint32_t goal_x,
                              std::uint32_t goal_y, float reach,
                              std::uint32_t flags, std::uint32_t maximum_visited,
                              std::uint32_t* out_ids, std::uint32_t out_capacity) {
  if (!cells || !out_ids || width < 3 || height < 3 || start_x >= width ||
      start_y >= height || goal_x >= width || goal_y >= height ||
      !std::isfinite(reach) || reach < 0 || maximum_visited == 0) return -1;
  const std::uint64_t total64 = static_cast<std::uint64_t>(width) * height;
  if (total64 > std::numeric_limits<std::uint32_t>::max()) return -1;
  const auto total = static_cast<std::uint32_t>(total64);
  const auto start = start_y * width + start_x;
  const auto goal = goal_y * width + goal_x;
  if ((flags & VELDREN_PATH_ADJACENT) == 0 && GridBlocked(cells, goal)) return -1;

  const float infinity = std::numeric_limits<float>::infinity();
  std::vector<float> costs(total, infinity);
  std::vector<std::uint32_t> previous(total, std::numeric_limits<std::uint32_t>::max());
  std::priority_queue<PathNode, std::vector<PathNode>, PathNodeLater> open;
  costs[start] = 0;
  open.push({start, 0, OctileDistance(start_x, start_y, goal_x, goal_y)});
  std::uint32_t end = std::numeric_limits<std::uint32_t>::max();
  std::uint32_t visited = 0;
  constexpr int directions[8][2] = {{0,-1},{1,0},{0,1},{-1,0},{-1,-1},{1,-1},{1,1},{-1,1}};
  while (!open.empty() && visited < maximum_visited) {
    const auto current = open.top();
    open.pop();
    if (current.cost > costs[current.id] + 0.001F) continue;
    ++visited;
    const auto x = current.id % width;
    const auto y = current.id / width;
    const bool adjacent = (flags & VELDREN_PATH_ADJACENT) != 0;
    const float distance = std::hypot(static_cast<float>(goal_x) - x,
                                      static_cast<float>(goal_y) - y);
    if ((!adjacent && current.id == goal) ||
        (adjacent && distance <= reach + 0.01F &&
         GridLineClear(cells, width, height, x, y, goal_x, goal_y))) {
      end = current.id;
      break;
    }
    for (const auto& direction : directions) {
      const int nx_value = static_cast<int>(x) + direction[0];
      const int ny_value = static_cast<int>(y) + direction[1];
      if (nx_value < 1 || ny_value < 1 || nx_value >= static_cast<int>(width) - 1 ||
          ny_value >= static_cast<int>(height) - 1) continue;
      const auto nx = static_cast<std::uint32_t>(nx_value);
      const auto ny = static_cast<std::uint32_t>(ny_value);
      const auto next = ny * width + nx;
      if (GridBlocked(cells, next)) continue;
      if (direction[0] != 0 && direction[1] != 0 &&
          (GridBlocked(cells, y * width + nx) ||
           GridBlocked(cells, ny * width + x))) continue;
      const float cost = current.cost +
                         (direction[0] != 0 && direction[1] != 0 ? 1.41421356237F : 1.0F);
      if (cost >= costs[next] - 0.001F) continue;
      costs[next] = cost;
      previous[next] = current.id;
      const float remaining = std::max(0.0F, OctileDistance(nx, ny, goal_x, goal_y) -
                                               (adjacent ? reach : 0.0F));
      open.push({next, cost, cost + remaining});
    }
  }
  if (end == std::numeric_limits<std::uint32_t>::max()) return -1;
  std::vector<std::uint32_t> reverse;
  while (end != start) {
    reverse.push_back(end);
    end = previous[end];
    if (end == std::numeric_limits<std::uint32_t>::max()) return -1;
  }
  if (reverse.size() > out_capacity) return -2;
  for (std::size_t index = 0; index < reverse.size(); ++index)
    out_ids[index] = reverse[reverse.size() - index - 1];
  return static_cast<std::int32_t>(reverse.size());
}

std::uint32_t veldren_world_count(const void* world) {
  return world ? AsWorld(world)->Count() : 0;
}

std::uint32_t veldren_random_bounded(void* world, std::uint32_t exclusive_maximum) {
  return world ? AsWorld(world)->RandomBounded(exclusive_maximum) : 0;
}

std::uint32_t veldren_random_chance(void* world, float probability) {
  return world && AsWorld(world)->RandomChance(probability) ? 1U : 0U;
}

std::uint32_t veldren_roll_attack(void* world, float accuracy, std::uint32_t maximum_hit,
                                  std::uint32_t flags) {
  if (!world) return 0;
  const bool rolled_accurate = AsWorld(world)->RandomChance(accuracy);
  const bool accurate = (flags & VELDREN_ATTACK_FORCE_HIT) != 0 || rolled_accurate;
  if (!accurate) return 0;
  std::uint32_t damage = AsWorld(world)->RandomBounded(maximum_hit + 1U);
  if ((flags & VELDREN_ATTACK_MINIMUM_ONE) != 0) damage = std::max(1U, damage);
  return damage;
}

namespace {

double StandardSkillThreshold(std::uint32_t level) {
  if (level <= 1) return 0;
  std::uint64_t cumulative = 0;
  for (std::uint32_t current = 1; current < std::min(99U, level); ++current) {
    cumulative += static_cast<std::uint64_t>(std::floor(
        static_cast<double>(current) + 300.0 * std::pow(2.0, static_cast<double>(current) / 7.0)));
  }
  return static_cast<double>(cumulative / 4U);
}

float ClampProbability(float probability) {
  return std::max(0.0F, std::min(1.0F, probability));
}

}  // namespace

std::uint32_t veldren_skill_level(std::uint32_t worship, double experience) {
  if (!std::isfinite(experience) || experience < 0) experience = 0;
  if (worship != 0) return std::min(99U, 1U + static_cast<std::uint32_t>(std::floor(std::sqrt(experience / 35.0))));
  std::uint32_t level = 1;
  while (level < 99 && experience >= StandardSkillThreshold(level + 1U)) ++level;
  return level;
}

double veldren_skill_threshold(std::uint32_t worship, std::uint32_t level) {
  level = std::max(1U, std::min(99U, level));
  return worship != 0 ? 35.0 * static_cast<double>((level - 1U) * (level - 1U))
                      : StandardSkillThreshold(level);
}

std::uint32_t veldren_combat_level(std::uint32_t hitpoints, std::uint32_t attack,
                                   std::uint32_t strength, std::uint32_t defense,
                                   std::uint32_t worship, std::uint32_t magic,
                                   std::uint32_t ranged) {
  const double base = 0.25 * (defense + hitpoints + worship / 2U);
  const double melee = 0.325 * (attack + strength);
  const double ranged_value = 0.325 * std::floor(ranged * 1.5);
  const double magic_value = 0.325 * std::floor(magic * 1.5);
  return static_cast<std::uint32_t>(std::floor(base + std::max({melee, ranged_value, magic_value})));
}

float veldren_attack_roll_chance(float attack, float defense) {
  if (!std::isfinite(attack) || !std::isfinite(defense) || attack < 0 || defense < 0) return 0;
  return attack > defense ? 1.0F - (defense + 2.0F) / (2.0F * (attack + 1.0F))
                          : attack / (2.0F * (defense + 1.0F));
}

std::uint32_t veldren_physical_max_hit(std::uint32_t effective_level,
                                       std::int32_t strength_bonus,
                                       std::uint32_t minimum_hit) {
  const double value = std::floor(0.5 + effective_level * (strength_bonus + 64.0) / 640.0);
  return std::max(minimum_hit, static_cast<std::uint32_t>(std::max(0.0, value)));
}

std::uint32_t veldren_magic_max_hit(float power, float bonus_percent) {
  if (!std::isfinite(power) || !std::isfinite(bonus_percent)) return 0;
  return static_cast<std::uint32_t>(std::max(0.0F, std::floor(power * (1.0F + bonus_percent / 100.0F))));
}

std::uint32_t veldren_combat_rewards(float damage, std::uint32_t style,
                                     std::uint32_t focus, float* out) {
  if (!out || !std::isfinite(damage) || damage <= 0 || style > 3U) return 0;
  std::fill(out, out + 7, 0.0F);
  out[0] = damage * 4.0F / 3.0F;
  if (style == 0) {
    if (focus == 0) out[1] = damage * 4.0F;
    else if (focus == 1) out[2] = damage * 4.0F;
    else if (focus == 2) out[3] = damage * 4.0F;
    else out[1] = out[2] = out[3] = damage * 4.0F / 3.0F;
    for (std::uint32_t i = 0; i < 7; ++i) out[i] *= 3.0F;
  } else if (style == 1) {
    out[6] = damage * (focus == 2 ? 2.0F : 4.0F);
    if (focus == 2) out[3] = damage * 2.0F;
  } else if (style == 2) {
    out[5] = damage * (focus == 2 ? 4.0F / 3.0F : 2.0F);
    if (focus == 2) out[3] = damage;
  } else {
    out[4] = damage * 4.0F;
  }
  return 1;
}

float veldren_gathering_chance(std::uint32_t level, std::uint32_t required_level,
                               std::uint32_t tool_rank, float mining_bonus) {
  return std::min(0.95F, 0.4F + (static_cast<float>(level) - required_level) * 0.009F +
                             tool_rank * 0.025F + mining_bonus);
}

float veldren_firemaking_chance(std::uint32_t level, std::uint32_t required_level) {
  return std::min(0.95F, 0.45F + (static_cast<float>(level) - required_level) * 0.012F);
}

float veldren_cooking_burn_chance(std::uint32_t level, std::uint32_t cooking_level,
                                  std::uint32_t burn_stop_level) {
  if (burn_stop_level <= cooking_level) return 0;
  return ClampProbability((static_cast<float>(burn_stop_level) - level) /
                          (burn_stop_level - cooking_level) * 0.32F);
}

float veldren_iron_smelt_chance(std::uint32_t level) {
  return std::min(0.8F, 0.5F + (static_cast<float>(level) - 15.0F) * 0.01F);
}

std::uint32_t veldren_inventory_entry_slots(std::uint32_t count,
                                            std::uint32_t stackable,
                                            std::uint32_t worn_count) {
  const auto stored = count > worn_count ? count - worn_count : 0U;
  return stackable != 0 ? (stored > 0 ? 1U : 0U) : stored;
}

std::uint32_t veldren_transfer_count(std::uint32_t requested,
                                     std::uint32_t available,
                                     std::uint32_t room) {
  return std::min({requested, available, room});
}

std::uint32_t veldren_spend_coins(std::uint32_t loose, std::uint32_t pouch,
                                  std::uint32_t amount, std::uint32_t* out) {
  if (!out || static_cast<std::uint64_t>(loose) + pouch < amount) return 0;
  const auto from_loose = std::min(loose, amount);
  out[0] = loose - from_loose;
  out[1] = pouch - (amount - from_loose);
  return 1;
}

std::uint32_t veldren_craft_fits(std::uint32_t occupied_slots,
                                 std::uint32_t freed_slots,
                                 std::uint32_t result_stackable,
                                 std::uint32_t result_already_held,
                                 std::uint32_t result_count,
                                 std::uint32_t capacity) {
  const auto remaining = occupied_slots > freed_slots ? occupied_slots - freed_slots : 0U;
  const auto added = result_stackable != 0 ? (result_already_held != 0 ? 0U : 1U) : result_count;
  return static_cast<std::uint64_t>(remaining) + added <= capacity ? 1U : 0U;
}

std::uint32_t veldren_action_events(float age, float commit_at, float duration,
                                    std::uint32_t committed) {
  if (!std::isfinite(age) || !std::isfinite(commit_at) || !std::isfinite(duration) ||
      duration < 0) return 0;
  std::uint32_t events = 0;
  if (committed == 0 && age >= commit_at) events |= 1U;
  if (age >= duration) events |= 2U;
  return events;
}

std::uint32_t veldren_enemy_combat_tick(float seconds, float distance,
                                        float movement_distance, std::uint32_t dummy,
                                        std::uint32_t line_of_sight, float* clocks) {
  if (!clocks || !std::isfinite(seconds) || seconds < 0 || !std::isfinite(distance) ||
      !std::isfinite(movement_distance)) return 0;
  clocks[0] += seconds;
  clocks[1] += seconds;
  if (dummy != 0) return 0;
  if (distance > 1.45F) {
    if (clocks[0] >= 0.3F && movement_distance < 0.01F) {
      clocks[0] = 0;
      return 1U;
    }
    return 0;
  }
  if (clocks[1] >= 2.4F && line_of_sight != 0) {
    clocks[1] = 0;
    return 2U;
  }
  return 0;
}

std::uint32_t veldren_requirements_met(const std::int32_t* values,
                                       const std::int32_t* required,
                                       std::uint32_t count) {
  if ((!values || !required) && count != 0) return 0;
  for (std::uint32_t index = 0; index < count; ++index)
    if (values[index] < required[index]) return 0;
  return 1;
}

std::uint32_t veldren_world_timer_events(double now, double expires_at,
                                         float dead_until, double respawn_at,
                                         float game_time) {
  std::uint32_t events = 0;
  if (std::isfinite(expires_at) && expires_at <= now) events |= 1U;
  if (dead_until != 0 && std::isfinite(dead_until)) {
    const bool due = std::isfinite(respawn_at) ? now >= respawn_at : dead_until <= game_time;
    if (due) events |= 2U;
  }
  return events;
}

std::uint32_t veldren_core_abi_version() { return 11; }
