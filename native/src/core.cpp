#include "veldren/core.h"
#include "veldren/scene.h"
#include "veldren/editor.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <memory>
#include <limits>
#include <map>
#include <queue>
#include <string>
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
  veldren::EntityId entity;
  float far_time = 0;
  float heading = 0;
  float phase = 0;
  float blend = 0;
  float motion_speed = 0;
  std::uint32_t render_flags = 0;
  std::uint32_t last_clip = VELDREN_CLIP_IDLE;
  float last_phase = 0;
};


// These caches contain only derived geometry. Canonical definitions and
// hierarchy remain in Scene; any world revision discards all cached rows.
struct TerrainShape {
  std::string id;
  veldren::Mat4 world;
  double rx = 0, rz = 0, height = 0, determinant = 0, order = 0;
  int levels = 0;
  bool support = false, solid = true;
  std::pair<double,double> local(double x, double z) const {
    const auto& m = world.v; const double dx = x - m[12], dz = z - m[14];
    return {(dx * m[10] - dz * m[8]) / determinant,
            (dz * m[0] - dx * m[2]) / determinant};
  }
};
struct TerrainIndex {
  std::vector<TerrainShape> quarries, pads;
  std::map<std::pair<int,int>,std::vector<std::size_t>> buckets;
  std::vector<std::size_t> large;
};
bool TerrainCoordinate(double x, double z) {
  return std::isfinite(x) && std::isfinite(z) && std::abs(x) <= 1e9 && std::abs(z) <= 1e9;
}
double TerrainBlend(double t) { t = std::clamp(t, 0.0, 1.0); return 1 - t * t * (3 - 2 * t); }
bool QuarryRamp(const TerrainShape& q, double x, double z) {
  const auto [u,v] = q.local(x,z); return std::abs(u) < 3 && v >= -9 && v <= q.rz + 6;
}

class World {
 public:
  explicit World(std::uint32_t capacity) {
    actors_.reserve(std::max<std::uint32_t>(capacity, 64));
    index_.reserve(std::max<std::uint32_t>(capacity, 64));
  }

  bool SetHeading(std::uint32_t id, float heading) {
    const auto found = index_.find(id);
    if (found == index_.end() || !std::isfinite(heading)) return false;
    auto& actor = actors_[found->second];
    actor.heading = heading;
    auto transform = scene_.local_transform(actor.entity);
    transform.rotation = {0, std::sin(heading / 2), 0, std::cos(heading / 2)};
    scene_.set_local(actor.entity, transform);
    return true;
  }

  bool Upsert(const VeldrenActorState& actor) {
    if (actor.id == 0 || !Finite(actor)) return false;
    const auto found = index_.find(actor.id);
    if (found == index_.end()) {
      const auto entity = scene_.create(actor_name(actor), {}, "runtime:actor:" + std::to_string(actor.id));
      const float initial_heading = std::fmod(actor.id * 2.399F, 6.28318530718F);
      veldren::Transform transform;
      transform.position = {actor.x, 0, actor.z};
      transform.rotation = {0, std::sin(initial_heading / 2), 0, std::cos(initial_heading / 2)};
      scene_.set_local(entity, transform);
      scene_.add_component(entity, std::string(veldren::component_type::ActorController),
                           controller_fields(actor));
      scene_.add_component(entity, std::string(veldren::component_type::Animator), {{"clip", "idle"}});
      scene_.add_component(entity, std::string(veldren::component_type::MeshRenderer),
                           {{"renderer", "actor-pipeline"}, {"visible", true}});
      update_actor_kind(entity, actor);
      index_.emplace(actor.id, actors_.size());
      actors_.push_back({actor, entity, 0, initial_heading, 0, 0, 0, 0,
                         VELDREN_CLIP_IDLE, 0});
    } else {
      auto& record = actors_[found->second];
      if ((actor.flags & VELDREN_ACTOR_TELEPORT) != 0) {
        record.state.x = actor.x;
        record.state.z = actor.z;
        auto transform = scene_.local_transform(record.entity);
        transform.position = {actor.x, transform.position.y, actor.z};
        scene_.set_local(record.entity, transform);
        record.phase = 0;
        record.blend = 0;
        record.motion_speed = 0;
      }
      const bool controller_changed = record.state.target_x != actor.target_x ||
                                      record.state.target_z != actor.target_z ||
                                      record.state.speed != actor.speed ||
                                      record.state.gait_distance != actor.gait_distance ||
                                      record.state.flags != actor.flags;
      record.state.target_x = actor.target_x;
      record.state.target_z = actor.target_z;
      record.state.speed = actor.speed;
      record.state.gait_distance = actor.gait_distance;
      record.state.flags = actor.flags;
      if (controller_changed) {
        scene_.add_component(record.entity, std::string(veldren::component_type::ActorController),
                             controller_fields(record.state));
        scene_.rename(record.entity, actor_name(record.state));
        update_actor_kind(record.entity, record.state);
      }
    }
    return true;
  }

  bool Remove(std::uint32_t id) {
    const auto found = index_.find(id);
    if (found == index_.end()) return false;
    const std::size_t removed = found->second;
    const std::size_t last = actors_.size() - 1;
    const auto removed_entity = actors_[removed].entity;
    if (removed != last) {
      actors_[removed] = actors_[last];
      index_[actors_[removed].state.id] = removed;
    }
    scene_.remove(removed_entity, veldren::ChildDisposition::Destroy);
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
      const auto at = position(actor);
      const float dx = static_cast<float>(at.x) - player_x;
      const float dz = static_cast<float>(at.z) - player_z;
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
      const auto at = position(record);
      const float dx = static_cast<float>(at.x) - center_x;
      const float dz = static_cast<float>(at.z) - center_z;
      if (dx * dx + dz * dz > radius_squared + kArrivalEpsilon) continue;
      out[count++] = record.state.id;
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
    const auto at = position(actor);
    *out = {actor.state.id, static_cast<float>(at.x), static_cast<float>(at.z), actor.heading, actor.phase,
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
  bool UpsertWorldEntity(const char* scene_name, const char* entity_json) {
    if (!scene_name || !*scene_name || !entity_json) return false;
    const auto record = veldren::parse_json(entity_json);
    const auto id = record.find("id") ? record.find("id")->string_or() : std::string{};
    const auto name = record.find("name") ? record.find("name")->string_or() : std::string{};
    const auto* transform_json = record.find("transform");
    const auto* components_json = record.find("components");
    const auto* metadata_json = record.find("metadata");
    if (id.empty() || name.empty() || !transform_json || !components_json) return false;
    const auto vector = [&](const veldren::Json* value, std::array<double, 3> fallback) {
      if (!value) return fallback;
      const auto& fields = value->array();
      if (fields.size() != 3) throw std::invalid_argument("Invalid Transform vector");
      for (std::size_t i = 0; i < fields.size(); ++i) fallback[i] = fields[i].number_or();
      return fallback;
    };
    const auto* position_json = transform_json->find("position");
    const auto* scale_json = transform_json->find("scale");
    const auto* rotation_json = transform_json->find("rotation");
    veldren::Transform transform;
    const auto position = vector(position_json, {0, 0, 0});
    const auto scale = vector(scale_json, {1, 1, 1});
    transform.position = {position[0], position[1], position[2]};
    transform.scale = {scale[0], scale[1], scale[2]};
    if (const auto* affine = transform_json->find("affine")) {
      if (affine->array().size() != 16) return false;
      veldren::Mat4 matrix;
      for (std::size_t i = 0; i < 16; ++i) matrix.v[i] = affine->array()[i].number_or();
      transform.affine = matrix;
    }
    if (rotation_json) {
      const auto& fields = rotation_json->array();
      if (fields.size() != 4) throw std::invalid_argument("Invalid Transform quaternion");
      transform.rotation = {fields[0].number_or(), fields[1].number_or(),
                            fields[2].number_or(), fields[3].number_or(1)};
    }
    const auto parent = record.find("parent") ? record.find("parent")->string_or() : std::string{};
    const auto active = record.find("active") ? record.find("active")->bool_or(true) : true;
    const auto& component_fields = components_json->object();
    const auto& metadata_fields = metadata_json ? metadata_json->object() : veldren::Json::Object{};
    // Validate the complete incoming record before changing an existing node.
    // A rejected component/transform must not partially rename or reparent it.
    veldren::Scene validation("entity-validation");
    validation.create(name, {}, id);
    validation.set_local(id, transform);
    for (const auto& [type, fields] : component_fields)
      validation.add_component(id, type, fields.object());
    auto found_scene = world_scenes_.find(scene_name);
    if (!parent.empty() && (found_scene == world_scenes_.end() ||
                            !found_scene->second.contains(parent))) return false;
    if (found_scene == world_scenes_.end())
      found_scene = world_scenes_.emplace(scene_name, veldren::Scene(scene_name)).first;
    auto& target = found_scene->second;
    if (!parent.empty() && !target.contains(parent)) return false;
    const bool was_resource = target.contains(id) && target.component(id, "Gatherable").has_value();
    if (target.contains(id)) {
      const auto previous = target.inspect(id);
      if (previous.parent != parent) target.reparent(id, parent, false);
      target.rename(id, name);
      target.set_local(id, transform);
      target.set_active(id, active);
      target.set_metadata(id, metadata_fields);
      for (const auto& [type, fields] : previous.components) {
        (void)fields;
        if (!component_fields.contains(type)) target.remove_component(id, type);
      }
    } else {
      target.create(name, parent, id);
      target.set_local(id, transform);
      target.set_active(id, active);
      target.set_metadata(id, metadata_fields);
    }
    for (const auto& [type, fields] : component_fields) target.add_component(id, type, fields.object());
    if (was_resource && !component_fields.contains("Gatherable")) PruneResourceStates();
    ++world_scene_revision_;
    return true;
  }
  bool RemoveWorldEntity(const char* scene_name, const char* entity_id) {
    if (!scene_name || !entity_id) return false;
    const auto scene = world_scenes_.find(scene_name);
    if (scene == world_scenes_.end() || !scene->second.contains(entity_id)) return false;
    scene->second.remove(entity_id, veldren::ChildDisposition::Destroy);
    PruneResourceStates();
    ++world_scene_revision_;
    return true;
  }
  bool SetWorldEntityTransform(const char* scene_name, const char* entity_id,
                               const char* transform_json, bool world_space = false) {
    if (!scene_name || !entity_id || !transform_json) return false;
    const auto scene = world_scenes_.find(scene_name);
    if (scene == world_scenes_.end() || !scene->second.contains(entity_id)) return false;
    const auto input = veldren::parse_json(transform_json);
    const auto* position_json = input.find("position");
    const auto* scale_json = input.find("scale");
    const auto* rotation_json = input.find("rotation");
    if (!position_json || !scale_json || !rotation_json) return false;
    const auto& position = position_json->array();
    const auto& scale = scale_json->array();
    const auto& rotation = rotation_json->array();
    if (position.size() != 3 || scale.size() != 3 || rotation.size() != 4) return false;
    veldren::Transform transform;
    transform.position = {position[0].number_or(), position[1].number_or(), position[2].number_or()};
    transform.scale = {scale[0].number_or(), scale[1].number_or(), scale[2].number_or()};
    transform.rotation = {rotation[0].number_or(), rotation[1].number_or(),
                          rotation[2].number_or(), rotation[3].number_or(1)};
    if (const auto* affine = input.find("affine")) {
      if (affine->array().size() != 16) return false;
      veldren::Mat4 matrix;
      for (std::size_t i = 0; i < 16; ++i) matrix.v[i] = affine->array()[i].number_or();
      transform.affine = matrix;
    }
    if (world_space) scene->second.set_world(entity_id, transform);
    else scene->second.set_local(entity_id, transform);
    ++world_scene_revision_;
    return true;
  }
  veldren::Scene* PerformanceScene(const char* name) {if(!name)return nullptr;const auto it=world_scenes_.find(name);return it==world_scenes_.end()?nullptr:&it->second;}
  std::string WorldSceneJson(const char* scene_name) const {
    if (!scene_name) return {};
    const auto scene = world_scenes_.find(scene_name);
    return scene == world_scenes_.end() ? std::string{} : scene->second.serialize();
  }
  std::string WorldEntityJson(const char* scene_name, const char* entity_id) const {
    if (!scene_name || !entity_id) return {};
    const auto scene = world_scenes_.find(scene_name);
    if (scene == world_scenes_.end() || !scene->second.contains(entity_id)) return {};
    return veldren::write_json(scene->second.entity_json(entity_id, true));
  }
  std::string WorldComponentIds(const char* scene_name, const char* component) const {
    if (!scene_name || !component) return {};
    const auto scene = world_scenes_.find(scene_name);
    if (scene == world_scenes_.end()) return "[]";
    veldren::Json::Array ids;
    for (const auto& id : scene->second.entities_with(component)) ids.emplace_back(id);
    return veldren::write_json(ids);
  }
  bool IsResource(const std::string& scene, const std::string& id) const {
    const auto found = world_scenes_.find(scene);
    return found != world_scenes_.end() && found->second.contains(id) &&
           found->second.component(id, veldren::component_type::Gatherable).has_value();
  }
  static std::string ResourceKey(const std::string& scene, const std::string& id) {
    return std::to_string(scene.size()) + ":" + scene + id;
  }
  veldren::Json::Object ResourceState(const std::string& scene, const std::string& id) const {
    const auto key = ResourceKey(scene, id);
    return resource_session_.contains(key) ? *resource_session_.component(key, "ResourceState") :
      veldren::Json::Object{{"depleted", false}, {"gameDeadline", nullptr},
        {"respawnAt", nullptr}, {"hitAt", -100}, {"harvestedUntil", 0},
        {"collected", false}, {"sharedReady", false}, {"sharedDeadUntil", 0},
        {"treeRegrowAt", 0}, {"treeRegrown", false}};
  }
  std::string ResourceJson(const char* scene, const char* id) const {
    if (!scene || !id || !IsResource(scene, id)) return {};
    return veldren::write_json(ResourceState(scene, id));
  }
  // Lifecycle and replica fields live in a separate native session Scene.
  // Neither renderer reads nor network receipts mutate the saved definition.
  bool PatchResource(const char* scene, const char* id, const char* json) {
    if (!scene || !id || !json || !IsResource(scene, id)) return false;
    const auto patch = veldren::parse_json(json).object();
    auto state = ResourceState(scene, id);
    for (const auto& [field, value] : patch) {
      const bool nil = std::holds_alternative<std::nullptr_t>(value.value);
      if (field == "depleted" || field == "collected" || field == "sharedReady" || field == "treeRegrown") {
        if (!std::holds_alternative<bool>(value.value)) return false;
      } else if (field == "gameDeadline" || field == "respawnAt" || field == "hitAt" ||
                 field == "harvestedUntil" || field == "sharedDeadUntil" || field == "treeRegrowAt" ||
                 field == "sharedRevision" || field == "sharedGeneration" || field == "sharedPhase") {
        if (!nil && (!std::holds_alternative<double>(value.value) || !std::isfinite(value.number_or()))) return false;
      } else if (field == "sharedOwner" || field == "sharedTarget") {
        if (!nil && !std::holds_alternative<std::string>(value.value)) return false;
      } else if (field == "sharedHazard") {
        if (!nil && !std::holds_alternative<veldren::Json::Object>(value.value)) return false;
      } else return false;
      state[field] = value;
    }
    const auto key = ResourceKey(scene, id);
    if (!resource_session_.contains(key)) {
      resource_session_.create("Resource session", {}, key);
      resource_session_.add_component(key, "ResourceOrigin", {{"scene", scene}, {"entity", id}});
    }
    resource_session_.add_component(key, "ResourceState", std::move(state));
    return true;
  }
  void PruneResourceStates() {
    const auto ids = resource_session_.entities_with("ResourceOrigin");
    for (const auto& id : ids) {
      const veldren::Json origin(*resource_session_.component(id, "ResourceOrigin"));
      if (!IsResource(origin.find("scene")->string_or(), origin.find("entity")->string_or()))
        resource_session_.remove(id, veldren::ChildDisposition::Destroy);
    }
  }
  std::uint32_t TickResources(double now, double game_time) {
    std::uint32_t changed = 0;
    if (!std::isfinite(now) || !std::isfinite(game_time)) return 0;
    for (const auto& id : resource_session_.entities_with("ResourceState")) {
      const veldren::Json origin(*resource_session_.component(id, "ResourceOrigin"));
      const auto scene = origin.find("scene")->string_or(), entity = origin.find("entity")->string_or();
      if (!IsResource(scene, entity)) continue;
      auto state = *resource_session_.component(id, "ResourceState");
      if (state["sharedReady"].bool_or() || !state["depleted"].bool_or() ||
          !std::holds_alternative<double>(state["gameDeadline"].value)) continue;
      const bool due = std::holds_alternative<double>(state["respawnAt"].value) ?
        now >= state["respawnAt"].number_or() : game_time >= state["gameDeadline"].number_or();
      if (!due) continue;
      state["depleted"] = false; state["gameDeadline"] = nullptr;
      state["respawnAt"] = nullptr; state["hitAt"] = -100; state["treeRegrown"] = true;
      resource_session_.add_component(id, "ResourceState", std::move(state));
      ++changed;
    }
    return changed;
  }
  // 0 inactive/absent, 1 alive, 2 depleted, 3 regrowing, 4 synchronizing,
  // 5 regrown, 6 actively gathered. Flags: shared=1, in replica view=2, gathering=4.
  std::uint32_t ResourcePhase(const char* scene, const char* id, double now,
                              double game_time, std::uint32_t flags) const {
    if (!scene || !id || !IsResource(scene, id) || !std::isfinite(now) || !std::isfinite(game_time)) return 0;
    if (!world_scenes_.at(scene).inspect(id).active_in_hierarchy) return 0;
    const veldren::Json state(ResourceState(scene, id));
    if (state.find("collected")->bool_or()) return 0;
    if ((flags & 1U) != 0) {
      if ((flags & 2U) == 0) return 4;
      const auto dead = state.find("sharedDeadUntil")->number_or();
      const auto regrow = state.find("treeRegrowAt")->number_or();
      if (dead > 0) return now >= (regrow > 0 ? regrow : dead) ? 3U : 2U;
    } else if (state.find("depleted")->bool_or()) {
      const auto* deadline = state.find("gameDeadline");
      if (!std::holds_alternative<double>(deadline->value)) return 2;
      if (deadline->number_or() > game_time) return deadline->number_or() - game_time <= 2 ? 3U : 2U;
    }
    if ((flags & 4U) != 0) return 6;
    return state.find("treeRegrown")->bool_or() ? 5U : 1U;
  }
  // The horizontal footprint index is derived from canonical component data.
  // Rebuild after any Scene revision, including ancestor edits and reloads.
  std::string WorldFootprints(const char* scene_name, const char* component,
                              double x, double z) const {
    veldren::Json::Array result;
    if (!scene_name || !component || !std::isfinite(x) || !std::isfinite(z) ||
        std::abs(x) > 1e9 || std::abs(z) > 1e9) return "[]";
    const auto found = world_scenes_.find(scene_name);
    if (found == world_scenes_.end()) return "[]";
    if (footprint_revision_ != world_scene_revision_) {
      footprint_indices_.clear(); footprint_revision_ = world_scene_revision_;
    }
    auto [where, fresh] = footprint_indices_.try_emplace({scene_name, component});
    auto& index = where->second;
    if (fresh) for (const auto& id : found->second.component_entities(component)) {
      const auto node = found->second.inspect(id);
      if (!node.active_in_hierarchy || !node.components.contains("Footprint")) continue;
      const veldren::Json fields(node.components.at("Footprint"));
      const auto number = [&](const char* key, double fallback) { const auto* f = fields.find(key); return f ? f->number_or(fallback) : fallback; };
      double width = number("w", 0), depth = number("h", 0), left = number("x", 0), top = number("z", 0);
      // Bridge bounds are derived from the authored deck dimensions, avoiding
      // a second width/span authority when components are edited directly.
      if (const auto bridge = node.components.find("Bridge"); bridge != node.components.end()) {
        const veldren::Json deck(bridge->second);
        const double span = deck.find("span") ? deck.find("span")->number_or() : 0;
        const double across = deck.find("width") ? deck.find("width")->number_or() : 0;
        if (!(span > 0 && across > 1.3)) continue;
        width = span + .7; depth = across + 1.1; left = -width / 2; top = -depth / 2;
      }
      if (!(width > 0 && depth > 0 && std::isfinite(width + depth))) continue;
      FootprintRect rect{id, node.world, left, top, width, depth};
      if (const auto collider = node.components.find("Collider"); collider != node.components.end()) {
        const veldren::Json value(collider->second);
        if (const auto* shape = value.find("shape"); shape && shape->string_or() == "resource-tiles")
          rect.resource_radius = std::max(0.0, value.find("radius") ? value.find("radius")->number_or() : 0);
      }
      const auto& m = rect.world.v;
      rect.determinant = m[0] * m[10] - m[8] * m[2];
      if (std::abs(rect.determinant) < 1e-12) continue;
      double min_x = INFINITY, max_x = -INFINITY, min_z = INFINITY, max_z = -INFINITY;
      for (int i = 0; i < 4; ++i) {
        const auto p = veldren::transform_point(rect.world, {rect.x + (i & 1 ? width : 0), 0, rect.z + (i & 2 ? depth : 0)});
        min_x = std::min(min_x, p.x); max_x = std::max(max_x, p.x);
        min_z = std::min(min_z, p.z); max_z = std::max(max_z, p.z);
      }
      if (!std::isfinite(min_x + max_x + min_z + max_z) || std::max({std::abs(min_x), std::abs(max_x), std::abs(min_z), std::abs(max_z)}) > 1e9) continue;
      const int a = int(std::floor(min_x / 16)), b = int(std::floor(max_x / 16));
      const int c = int(std::floor(min_z / 16)), d = int(std::floor(max_z / 16));
      const auto slot = index.rects.size(); index.rects.push_back(std::move(rect));
      if (double(b - a + 1) * double(d - c + 1) > 4096) index.large.push_back(slot);
      else for (int xx = a; xx <= b; ++xx) for (int zz = c; zz <= d; ++zz) index.buckets[{xx, zz}].push_back(slot);
    }
    const auto test = [&](std::size_t slot) {
      const auto& r = index.rects[slot]; const auto& m = r.world.v;
      const double dx = x - m[12], dz = z - m[14];
      const double u = (dx * m[10] - dz * m[8]) / r.determinant;
      const double v = (dz * m[0] - dx * m[2]) / r.determinant;
      if (!(u >= r.x && u < r.x + r.w && v >= r.z && v < r.z + r.h)) return;
      if (r.resource_radius >= 0) {
        const auto dx = std::floor(u), dz = std::floor(v);
        if (!(dx == 0 && dz == 0) && !(std::abs(dx) <= 2 && std::abs(dz) <= 2 &&
            std::hypot(dx, dz) < r.resource_radius + .3)) return;
      }
      result.emplace_back(r.id);
    };
    if (auto bucket = index.buckets.find({int(std::floor(x / 16)), int(std::floor(z / 16))}); bucket != index.buckets.end()) for (auto slot : bucket->second) test(slot);
    for (auto slot : index.large) test(slot);
    return veldren::write_json(result);
  }

  const TerrainIndex& Terrain(const char* scene_name) const {
    if (terrain_revision_ != world_scene_revision_) {
      terrain_indices_.clear(); terrain_revision_ = world_scene_revision_;
    }
    auto [where, fresh] = terrain_indices_.try_emplace(scene_name);
    auto& index = where->second;
    const auto found = world_scenes_.find(scene_name);
    if (!fresh || found == world_scenes_.end()) return index;
    for (const auto* type : {"Quarry", "TerrainPad"}) {
      auto& rows = std::strcmp(type, "Quarry") == 0 ? index.quarries : index.pads;
      for (const auto& id : found->second.component_entities(type)) {
        const auto node = found->second.inspect(id); if (!node.active_in_hierarchy) continue;
        const veldren::Json fields(node.components.at(type));
        const auto number = [&](const char* key, double fallback) { const auto* f = fields.find(key); return f ? f->number_or(fallback) : fallback; };
        TerrainShape shape; shape.id = id; shape.world = node.world;
        shape.rx = number("rx", 0); shape.rz = number("ry", 0);
        shape.height = number(type == std::string("Quarry") ? "level" : "height", 0);
        shape.order = number("order", 0);
        if (const auto collider = node.components.find("Collider"); collider != node.components.end()) {
          const veldren::Json value(collider->second);
          if (const auto* solid = value.find("solid")) shape.solid = solid->bool_or(true);
        }
        const double levels = number("levels", 0);
        if (!(shape.rx > 0 && shape.rz > 0 && std::isfinite(shape.rx + shape.rz + shape.height + shape.order)) ||
            !std::isfinite(levels) || levels < 0 || levels > 100 || levels != std::floor(levels)) continue;
        shape.levels = int(levels);
        shape.support = fields.find("supportOnly") && fields.find("supportOnly")->bool_or();
        const auto& m = shape.world.v; shape.determinant = m[0] * m[10] - m[8] * m[2];
        if (!std::isfinite(shape.determinant) || std::abs(shape.determinant) < 1e-12) continue;
        rows.push_back(std::move(shape));
      }
      std::stable_sort(rows.begin(), rows.end(), [](const auto& a, const auto& b) { return a.order < b.order; });
    }
    for (std::size_t i = 0; i < index.pads.size(); ++i) {
      const auto& p = index.pads[i];
      double min_x = INFINITY, max_x = -INFINITY, min_z = INFINITY, max_z = -INFINITY;
      for (int c = 0; c < 4; ++c) {
        const auto point = veldren::transform_point(p.world, {(c & 1 ? 1 : -1) * (p.rx + 2), 0, (c & 2 ? 1 : -1) * (p.rz + 2)});
        min_x = std::min(min_x, point.x); max_x = std::max(max_x, point.x);
        min_z = std::min(min_z, point.z); max_z = std::max(max_z, point.z);
      }
      if (!TerrainCoordinate(min_x,min_z) || !TerrainCoordinate(max_x,max_z)) continue;
      const int a = int(std::floor(min_x / 16)), b = int(std::floor(max_x / 16));
      const int c = int(std::floor(min_z / 16)), d = int(std::floor(max_z / 16));
      if (double(b-a+1) * double(d-c+1) > 4096) index.large.push_back(i);
      else for (int x = a; x <= b; ++x) for (int z = c; z <= d; ++z) index.buckets[{x,z}].push_back(i);
    }
    return index;
  }
  std::string QuarrySample(const char* scene_name, const char* id, double x, double z, double pad) const {
    if (!scene_name || !id || !TerrainCoordinate(x,z) || !std::isfinite(pad) || pad < 0) return "null";
    for (const auto& q : Terrain(scene_name).quarries) {
      const auto [u,v] = q.local(x,z);
      if (*id ? q.id != id : !(std::abs(u) < q.rx + pad && std::abs(v) < q.rz + pad)) continue;
      const double edge = (1 - std::pow(std::pow(std::abs(u)/q.rx,4) + std::pow(std::abs(v)/q.rz,4),.25)) * std::min(q.rx,q.rz);
      double depth = 0; bool cliff = false;
      if (edge > 0) {
        if (std::abs(u) < 2.6 && v >= -8) depth = std::clamp((q.rz-v)/q.rz*q.levels*1.25,0.0,q.levels*1.25);
        else for (int i = 1; i <= q.levels; ++i) depth += std::clamp(edge-(i*5-1),0.0,1.0)*1.25;
      }
      if (q.solid && !(std::abs(u) < 3 && v >= -9))
        for (int i = 1; i <= q.levels; ++i) if (std::abs(edge-(i*5-.5)) < .65) cliff = true;
      const double blend = TerrainBlend(std::hypot(std::max(std::abs(u)-q.rx,0.0),std::max(std::abs(v)-q.rz,0.0))/14);
      const double height = veldren::transform_point(q.world,{u,std::max(.15,q.height-depth),v}).y;
      return veldren::write_json(veldren::Json::Object{{"id",q.id},{"localX",u},{"localZ",v},
        {"edge",edge},{"depth",depth},{"height",height},{"blend",blend},{"cliff",cliff},{"ramp",QuarryRamp(q,x,z)}});
    }
    return "null";
  }
  bool QuarryRampAt(const char* scene_name, double x, double z) const {
    if (!scene_name || !TerrainCoordinate(x,z)) return false;
    for (const auto& q : Terrain(scene_name).quarries) if (QuarryRamp(q,x,z)) return true;
    return false;
  }
  double TerrainPadHeight(const char* scene_name, double x, double z, double height, bool footing) const {
    if (!scene_name || !TerrainCoordinate(x,z) || !std::isfinite(height)) return height;
    const auto& index = Terrain(scene_name);
    std::vector<std::size_t> slots = index.large;
    if (auto bucket = index.buckets.find({int(std::floor(x/16)),int(std::floor(z/16))}); bucket != index.buckets.end())
      slots.insert(slots.end(),bucket->second.begin(),bucket->second.end());
    if (slots.empty()) return height;
    std::sort(slots.begin(),slots.end());
    const bool ramp = QuarryRampAt(scene_name,x,z);
    const TerrainShape* support = nullptr; double area = -1, support_blend = 0, support_height = 0;
    for (const auto i : slots) {
      const auto& p = index.pads[i]; const auto [u,v] = p.local(x,z);
      const double d = std::max({std::abs(u)-p.rx-(footing?1:0),std::abs(v)-p.rz-(footing?1:0),0.0});
      if (d >= (footing?1:2)) continue;
      const double blend = TerrainBlend(d/(footing?1:2));
      const double target = veldren::transform_point(p.world,{u,p.height,v}).y;
      if (!p.support && !ramp) height = height*(1-blend)+target*blend;
      else if (p.support && footing && p.rx*p.rz*std::abs(p.determinant) > area) {
        support = &p; area = p.rx*p.rz*std::abs(p.determinant); support_blend = blend; support_height = target;
      }
    }
    return support ? height*(1-support_blend)+support_height*support_blend : height;
  }

  std::string WorldLights(const char* scene_name, double night, const std::vector<veldren::EntityId>* selected=nullptr) const {
    veldren::Json::Array lights;
    if (!scene_name || !std::isfinite(night)) return "[]";
    const auto found = world_scenes_.find(scene_name);
    if (found == world_scenes_.end()) return "[]";
    const auto& scene = found->second;
    night = std::clamp(night, 0.0, 1.0);
    const auto ids=selected?*selected:scene.entities_with(veldren::component_type::Light);
    for (const auto& id : ids) {
      const auto node = scene.inspect(id);
      if (!node.active_in_hierarchy) continue;
      const veldren::Json fields(node.components.at("Light"));
      const auto number = [&](const char* key, double fallback) { const auto* f = fields.find(key); return f ? f->number_or(fallback) : fallback; };
      const auto flag = [&](const char* key, bool fallback) { const auto* f = fields.find(key); return f ? f->bool_or(fallback) : fallback; };
      if (!flag("enabled", true)) continue;
      if (const auto* type = fields.find("type"); type && type->string_or() != "point") continue;
      const double intensity = number("intensity", 1.25) * (flag("nightOnly", false) ? night : 1.0);
      const double radius = number("radius", 1);
      if (!std::isfinite(intensity) || !std::isfinite(radius) || intensity <= 0 || radius <= 0) continue;
      veldren::Vec3 offset;
      if (const auto* value = fields.find("offset")) {
        if (!std::holds_alternative<veldren::Json::Array>(value->value) || value->array().size() != 3) continue;
        offset = {value->array()[0].number_or(), value->array()[1].number_or(), value->array()[2].number_or()};
      }
      auto color = veldren::Json::Array{1.0, .74, .45};
      if (const auto* value = fields.find("color")) {
        if (!std::holds_alternative<veldren::Json::Array>(value->value) || value->array().size() != 3) continue;
        color = value->array();
      }
      if (std::any_of(color.begin(), color.end(), [](const auto& c) { return !std::isfinite(c.number_or(-1)) || c.number_or(-1) < 0; })) continue;
      const auto position = veldren::transform_point(node.world, offset);
      const auto& m = node.world.v;
      const double scale = std::max({std::hypot(m[0], m[1], m[2]), std::hypot(m[4], m[5], m[6]), std::hypot(m[8], m[9], m[10])});
      veldren::Json::Object light{{"id", id}, {"x", position.x}, {"y", position.y}, {"z", position.z},
        {"radius", radius * scale}, {"color", std::move(color)}, {"intensity", intensity},
        {"terrainRelative", flag("terrainRelative", true)}};
      for (const auto* key : {"scope", "sourceKind"}) if (const auto* value = fields.find(key)) light[key] = *value;
      lights.emplace_back(std::move(light));
    }
    return veldren::write_json(lights);
  }
  std::string WorldDocumentJson() const {
    veldren::WorldDocument document;
    document.revision = world_document_metadata_.revision;
    document.updated_at = world_document_metadata_.updated_at;
    document.extras = world_document_metadata_.extras;
    for (const auto& [name, scene] : world_scenes_) {
      (void)name;
      document.scenes.push_back(scene);
    }
    return document.serialize();
  }
  bool LoadWorldDocument(const char* json) {
    if (!json) return false;
    auto document = veldren::WorldDocument::deserialize(json);
    std::map<std::string, veldren::Scene> replacement;
    for (auto& scene : document.scenes) {
      if (scene.name().empty() || replacement.contains(scene.name())) return false;
      replacement.emplace(scene.name(), std::move(scene));
    }
    world_scenes_ = std::move(replacement);
    editor_histories_.clear();
    resource_session_ = veldren::Scene("resource-runtime");
    document.scenes.clear();
    world_document_metadata_ = std::move(document);
    ++world_scene_revision_;
    return true;
  }
  int EditorCommand(const char* name, const char* request) {
    try {
      if (!name || !request) throw std::invalid_argument("Editor scene and request required");
      auto found=world_scenes_.find(name);
      if(found==world_scenes_.end())throw std::invalid_argument("Editor scene does not exist");
      auto value=editor_histories_[name].command(found->second,veldren::parse_json(request),{},&world_document_metadata_.extras);
      if(value.find("changed")->bool_or()){++world_scene_revision_;PruneResourceStates();}
      editor_response_=veldren::write_json(veldren::Json::Object{{"ok",true},{"value",std::move(value)}});return 1;
    } catch(const std::exception& error) {
      ++world_scene_revision_;
      editor_response_=veldren::write_json(veldren::Json::Object{{"ok",false},{"error",error.what()}});return 0;
    }
  }
  const std::string& EditorResponse() const { return editor_response_; }
  std::uint32_t WorldSceneRevision() const { return world_scene_revision_; }
  void Reset() { actors_.clear(); index_.clear(); scene_ = veldren::Scene("runtime"); resource_session_ = veldren::Scene("resource-runtime"); world_scenes_.clear(); editor_histories_.clear(); world_document_metadata_ = {}; ++world_scene_revision_; }
  std::string scene_json() const { return scene_.serialize(); }
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
  static std::string actor_name(const VeldrenActorState& actor) {
    if ((actor.flags & VELDREN_ACTOR_PLAYER) != 0) return "Player";
    if ((actor.flags & VELDREN_ACTOR_HUMAN) != 0) return "Veldren Actor";
    if ((actor.flags & VELDREN_ACTOR_WOLF) != 0) return "Wolf";
    if ((actor.flags & VELDREN_ACTOR_RAT) != 0) return "Giant Rat";
    if ((actor.flags & VELDREN_ACTOR_SLIME) != 0) return "Slime";
    return "Monster";
  }

  static veldren::Json::Object controller_fields(const VeldrenActorState& actor) {
    return {{"actorId", double(actor.id)}, {"targetX", double(actor.target_x)},
            {"targetZ", double(actor.target_z)}, {"speed", double(actor.speed)},
            {"gaitDistance", double(actor.gait_distance)}, {"flags", double(actor.flags)}};
  }

  void update_actor_kind(const veldren::EntityId& entity, const VeldrenActorState& actor) {
    const auto kind = (actor.flags & VELDREN_ACTOR_PLAYER) != 0
                          ? veldren::component_type::PlayerRepresentation
                          : (actor.flags & VELDREN_ACTOR_HUMAN) != 0
                                ? veldren::component_type::NPC
                                : veldren::component_type::Monster;
    for (const auto role : {veldren::component_type::NPC, veldren::component_type::Monster,
                            veldren::component_type::PlayerRepresentation}) {
      if (role != kind) scene_.remove_component(entity, role);
    }
    scene_.add_component(entity, std::string(kind), {{"actorId", double(actor.id)}});
  }

  veldren::Vec3 position(const ActorRecord& record) const {
    return scene_.local_transform(record.entity).position;
  }

  static bool Finite(const VeldrenActorState& actor) {
    return std::isfinite(actor.x) && std::isfinite(actor.z) &&
           std::isfinite(actor.target_x) && std::isfinite(actor.target_z) &&
           std::isfinite(actor.speed) && actor.speed >= 0 &&
           std::isfinite(actor.gait_distance) && actor.gait_distance >= 0;
  }

  void StepActor(ActorRecord& record, float dt, bool has_player,
                 float player_x, float player_z) {
    auto& actor = record.state;
    auto transform = scene_.local_transform(record.entity);
    const float before_x = static_cast<float>(transform.position.x);
    const float before_z = static_cast<float>(transform.position.z);
    const float dx = actor.target_x - before_x;
    const float dz = actor.target_z - before_z;
    float current_x = before_x;
    float current_z = before_z;
    const float distance_squared = dx * dx + dz * dz;
    if (distance_squared > kArrivalEpsilon) {
      const float distance = std::sqrt(distance_squared);
      const float travel = std::min(distance, Speed(actor) * dt);
      current_x += dx / distance * travel;
      current_z += dz / distance * travel;
    }
    actor.x = current_x;
    actor.z = current_z;
    const float moved_x = current_x - before_x;
    const float moved_z = current_z - before_z;
    const float moved = std::hypot(moved_x, moved_z);
    const bool walking = moved > 0.0003F && moved < 2.0F;
    const float measured_speed = walking && dt > 0 ? moved / dt : 0;
    record.motion_speed += (measured_speed - record.motion_speed) * std::min(1.0F, dt * 8.0F);
    record.blend += ((walking ? 1.0F : 0.0F) - record.blend) * std::min(1.0F, dt * 12.0F);
    if (walking) {
      const float gait = actor.gait_distance > 0 ? actor.gait_distance : 1.15F;
      record.phase = std::fmod(record.phase + moved / gait, 1.0F);
    }
    const float previous_heading = record.heading;
    float desired = previous_heading;
    if (walking) desired = std::atan2(moved_x, moved_z);
    else if (has_player && (actor.flags & VELDREN_ACTOR_FACE_PLAYER) != 0 &&
             std::hypot(player_x - current_x, player_z - current_z) < 12.0F)
      desired = std::atan2(player_x - current_x, player_z - current_z);
    const float delta = std::atan2(std::sin(desired - record.heading),
                                   std::cos(desired - record.heading));
    record.heading += delta * std::min(1.0F, dt * 15.0F);
    record.render_flags = walking ? static_cast<std::uint32_t>(VELDREN_RENDER_MOVING) : 0U;
    if (current_x != before_x || current_z != before_z || record.heading != previous_heading) {
      transform.position.x = current_x;
      transform.position.z = current_z;
      transform.rotation = {0, std::sin(record.heading / 2), 0, std::cos(record.heading / 2)};
      scene_.set_local(record.entity, transform);
    }
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
  veldren::Scene scene_{"runtime"};
  veldren::Scene resource_session_{"resource-runtime"};
  struct FootprintRect { std::string id; veldren::Mat4 world; double x, z, w, h, determinant = 0, resource_radius = -1; };
  struct FootprintIndex { std::vector<FootprintRect> rects; std::map<std::pair<int,int>,std::vector<std::size_t>> buckets; std::vector<std::size_t> large; };
  mutable std::map<std::pair<std::string,std::string>,FootprintIndex> footprint_indices_;
  mutable std::uint32_t footprint_revision_ = std::numeric_limits<std::uint32_t>::max();
  mutable std::map<std::string,TerrainIndex> terrain_indices_;
  mutable std::uint32_t terrain_revision_ = std::numeric_limits<std::uint32_t>::max();
  std::map<std::string, veldren::Scene> world_scenes_;
  std::map<std::string, veldren::EditorHistory> editor_histories_;
  std::string editor_response_;
  std::uint32_t world_scene_revision_ = 0;
  veldren::WorldDocument world_document_metadata_;
  std::uint64_t random_state_ = 0x9e3779b97f4a7c15ULL;
};

World* AsWorld(void* world) { return static_cast<World*>(world); }
const World* AsWorld(const void* world) { return static_cast<const World*>(world); }

std::uint32_t CopyText(std::string_view value, char* out, std::uint32_t capacity) {
  if (value.size() >= std::numeric_limits<std::uint32_t>::max()) return 0;
  const auto length = static_cast<std::uint32_t>(value.size());
  if (out && capacity > length) {
    std::memcpy(out, value.data(), length);
    out[length] = '\0';
  }
  return length;
}

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

std::uint32_t veldren_actor_set_heading(void* world, std::uint32_t id, float heading) {
  return world && AsWorld(world)->SetHeading(id, heading) ? 1U : 0U;
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

std::uint32_t veldren_world_scene_serialize(const void* world, char* out,
                                            std::uint32_t capacity) {
  if (!world) return 0;
  const auto json = AsWorld(world)->scene_json();
  if (json.size() >= std::numeric_limits<std::uint32_t>::max()) return 0;
  const auto required = static_cast<std::uint32_t>(json.size());
  if (out && capacity > required) {
    std::memcpy(out, json.data(), required);
    out[required] = '\0';
  }
  return required;
}

std::uint32_t veldren_world_scene_entity_upsert(void* world, const char* scene,
                                                const char* entity_json) {
  if (!world) return 0;
  try { return AsWorld(world)->UpsertWorldEntity(scene, entity_json) ? 1U : 0U; }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_entity_remove(void* world, const char* scene,
                                                const char* entity_id) {
  if (!world) return 0;
  try { return AsWorld(world)->RemoveWorldEntity(scene, entity_id) ? 1U : 0U; }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_entity_set_transform(void* world, const char* scene,
                                                       const char* entity_id,
                                                       const char* transform_json) {
  if (!world) return 0;
  try { return AsWorld(world)->SetWorldEntityTransform(scene, entity_id, transform_json) ? 1U : 0U; }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_read(const void* world, const char* scene,
                                       char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldSceneJson(scene), out, capacity); }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_entity_read(const void* world, const char* scene,
                                            const char* id, char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldEntityJson(scene, id), out, capacity); }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_entity_set_world_transform(void* world, const char* scene,
                                                          const char* id, const char* transform) {
  if (!world) return 0;
  try { return AsWorld(world)->SetWorldEntityTransform(scene, id, transform, true) ? 1U : 0U; }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_component_ids(const void* world, const char* scene,
                                                const char* component, char* out,
                                                std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldComponentIds(scene, component), out, capacity); }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_footprints_at(const void* world, const char* scene,
    const char* component, double x, double z, char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldFootprints(scene, component, x, z), out, capacity); }
  catch (...) { return 0; }
}


std::uint32_t veldren_world_scene_quarry_sample(const void* world, const char* scene,
    const char* id, double x, double z, double pad, char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->QuarrySample(scene,id,x,z,pad),out,capacity); }
  catch (...) { return 0; }
}
std::uint32_t veldren_world_scene_quarry_ramp_at(const void* world, const char* scene, double x, double z) {
  if (!world) return 0;
  try { return AsWorld(world)->QuarryRampAt(scene,x,z) ? 1 : 0; } catch (...) { return 0; }
}
double veldren_world_scene_terrain_pad_height(const void* world, const char* scene,
    double x, double z, double height, std::uint32_t footing) {
  if (!world) return height;
  try { return AsWorld(world)->TerrainPadHeight(scene,x,z,height,footing != 0); } catch (...) { return height; }
}

std::uint32_t veldren_world_scene_lights_read(const void* world, const char* scene,
                                             double night, char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldLights(scene, night), out, capacity); }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_document_serialize(const void* world, char* out,
                                               std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->WorldDocumentJson(), out, capacity); }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_document_load(void* world, const char* document_json) {
  if (!world) return 0;
  try { return AsWorld(world)->LoadWorldDocument(document_json) ? 1U : 0U; }
  catch (...) { return 0; }
}

std::uint32_t veldren_world_scene_revision(const void* world) {
  return world ? AsWorld(world)->WorldSceneRevision() : 0;
}

std::uint32_t veldren_resource_state_read(const void* world, const char* scene,
    const char* id, char* out, std::uint32_t capacity) {
  if (!world) return 0;
  try { return CopyText(AsWorld(world)->ResourceJson(scene, id), out, capacity); }
  catch (...) { return 0; }
}
std::uint32_t veldren_resource_state_patch(void* world, const char* scene,
    const char* id, const char* patch) {
  if (!world) return 0;
  try { return AsWorld(world)->PatchResource(scene, id, patch) ? 1U : 0U; }
  catch (...) { return 0; }
}
std::uint32_t veldren_resources_tick(void* world, double now, double game_time) {
  if (!world) return 0;
  try { return AsWorld(world)->TickResources(now, game_time); }
  catch (...) { return 0; }
}
std::uint32_t veldren_resource_phase(const void* world, const char* scene,
    const char* id, double now, double game_time, std::uint32_t flags) {
  if (!world) return 0;
  try { return AsWorld(world)->ResourcePhase(scene, id, now, game_time, flags); }
  catch (...) { return 0; }
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

float veldren_player_accuracy(std::uint32_t skill_level, std::uint32_t target_level) {
  const float level = static_cast<float>(std::max(1U, skill_level));
  const float target = static_cast<float>(std::max(1U, target_level));
  return std::clamp(0.84F + (level - target) * 0.025F, 0.35F, 0.97F);
}

float veldren_enemy_accuracy(std::uint32_t enemy_level, std::uint32_t defense_level) {
  const float enemy = static_cast<float>(std::max(1U, enemy_level));
  const float defense = static_cast<float>(std::max(1U, defense_level));
  return std::clamp(0.83F + (enemy - defense) * 0.025F, 0.2F, 0.94F);
}

std::uint32_t veldren_player_max_hit(std::uint32_t magic_style, std::uint32_t skill_level,
                                    std::int32_t weapon_power, std::int32_t spell_power,
                                    std::int32_t magic_bonus) {
  const std::int64_t base = magic_style != 0
      ? static_cast<std::int64_t>(spell_power) + magic_bonus
      : 3;
  const std::int64_t total = base + std::max(1U, skill_level) + weapon_power + 2;
  return static_cast<std::uint32_t>(std::clamp<std::int64_t>(total, 0, 1000000));
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

std::uint32_t veldren_core_abi_version() { return 19; }

extern "C" int veldren_editor_command(void* world, const char* scene, const char* request) {
  return world ? AsWorld(world)->EditorCommand(scene,request) : 0;
}
extern "C" std::uint32_t veldren_editor_response(const void* world,char* out,std::uint32_t capacity) {
  return world ? CopyText(AsWorld(world)->EditorResponse(),out,capacity) : 0;
}

namespace veldren { Scene* world_scene_for_performance(void* world,const char* name){return world?AsWorld(world)->PerformanceScene(name):nullptr;} }

namespace veldren {
std::string world_lights_for_performance(void* world,const char* scene,double night,const std::vector<EntityId>& ids){return world?AsWorld(world)->WorldLights(scene,night,&ids):"[]";}
}
