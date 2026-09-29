#include "veldren/desktop.h"

#include <algorithm>
#include <bit>
#include <cmath>
#include <stdexcept>

namespace {
constexpr const char* kFoliageModels[] = {
    "native/assets/models/grass_large.obj",
    "native/assets/models/grass_leafsLarge.obj",
    "native/assets/models/plant_bushDetailed.obj",
    "native/assets/models/flower_purpleA.obj",
    "native/assets/models/flower_redA.obj",
    "native/assets/models/flower_yellowA.obj",
    "native/assets/models/mushroom_redGroup.obj",
    "native/assets/models/mushroom_tanGroup.obj",
    "native/assets/models/hanging_moss.obj",
    "native/assets/models/log_stackLarge.obj",
    "native/assets/models/rock_largeA.obj",
};

std::uint64_t mix(std::uint64_t hash, std::uint32_t value) {
  hash ^= value;
  hash *= 1099511628211ULL;
  return hash;
}
}  // namespace

VeldrenDesktopQuality veldren_desktop_quality(bool ultra) {
  if (ultra) return {2560, 1440, 4096, 16, 4, 900.0F, 260.0F, 2.5F, 2.0F};
  return {1920, 1080, 2048, 8, 2, 620.0F, 180.0F, 1.4F, 1.25F};
}

VeldrenDesktopAssets veldren_desktop_assets(const std::filesystem::path& root) {
  VeldrenDesktopAssets assets{root,
                              root / "dist/assets/realms/atlas.png",
                              root / "dist/assets/realms/ground-surfaces.png",
                              {}};
  for (const char* relative : kFoliageModels) assets.foliage_models.push_back(root / relative);
  return assets;
}

bool veldren_desktop_assets_ready(const VeldrenDesktopAssets& assets, std::string* error) {
  const auto require = [&](const std::filesystem::path& path) {
    if (std::filesystem::is_regular_file(path) && std::filesystem::file_size(path) > 0) return true;
    if (error) *error = "Missing native desktop asset: " + path.string();
    return false;
  };
  if (!require(assets.world_atlas) || !require(assets.ground_surfaces)) return false;
  return std::all_of(assets.foliage_models.begin(), assets.foliage_models.end(), require);
}

VeldrenDesktopClient::VeldrenDesktopClient(std::uint32_t capacity)
    : world_(veldren_world_create(capacity)),
      render_states_(capacity),
      animation_states_(capacity),
      visible_ids_(capacity) {
  if (!world_) throw std::runtime_error("Could not create Veldren C++ world");
  veldren_world_seed(world_, 0x56454c44U, 0x52454e34U);
}

VeldrenDesktopClient::~VeldrenDesktopClient() { veldren_world_destroy(world_); }

void VeldrenDesktopClient::seed_demo_world(std::uint32_t actors) {
  veldren_world_reset(world_);
  actors = std::min<std::uint32_t>(actors, render_states_.size());
  std::vector<VeldrenActorState> states;
  states.reserve(actors);
  for (std::uint32_t id = 1; id <= actors; ++id) {
    const float ring = 10.0F + static_cast<float>(id % 29) * 2.25F;
    const float angle = static_cast<float>(id) * 2.39996323F;
    const float x = std::cos(angle) * ring;
    const float z = std::sin(angle) * ring;
    const std::uint32_t species = id % 11 == 0 ? VELDREN_ACTOR_WOLF : VELDREN_ACTOR_HUMAN;
    states.push_back({id, x, z, -z * 0.82F, x * 0.82F, id % 4 == 0 ? 5.4F : 3.2F,
                      1.15F, species | (id == 1 ? VELDREN_ACTOR_ALWAYS_ACTIVE | VELDREN_ACTOR_PLAYER : 0U)});
    render_states_[id - 1].id = id;
  }
  veldren_actors_upsert(world_, states.data(), states.size());
}

bool VeldrenDesktopClient::move_actor(std::uint32_t id, float target_x, float target_z, float speed) {
  VeldrenActorState actor{};
  if (!veldren_actor_read(world_, id, &actor)) return false;
  actor.target_x = target_x;
  actor.target_z = target_z;
  actor.speed = std::max(0.0F, speed);
  return veldren_actor_upsert(world_, &actor) != 0;
}

VeldrenDesktopFrame VeldrenDesktopClient::step(float seconds,
                                                float player_x,
                                                float player_z,
                                                float visibility_radius) {
  seconds = std::clamp(seconds, 0.0F, 0.1F);
  veldren_world_step_live(world_, seconds, player_x, player_z);
  const auto actor_count = veldren_render_states_read(world_, render_states_.data(), render_states_.size());
  state_count_ = actor_count;
  for (std::uint32_t i = 0; i < actor_count; ++i) {
    animation_states_[i].id = render_states_[i].id;
    animation_states_[i].idle_phase = render_states_[i].phase;
  }
  veldren_animation_states_resolve(world_, animation_states_.data(), actor_count);
  const auto visible = veldren_query_visible(world_, player_x, player_z, visibility_radius,
                                             visible_ids_.data(), visible_ids_.size());
  std::uint64_t hash = 1469598103934665603ULL;
  for (const auto& state : render_states()) {
    hash = mix(hash, state.id);
    hash = mix(hash, std::bit_cast<std::uint32_t>(state.x));
    hash = mix(hash, std::bit_cast<std::uint32_t>(state.z));
    hash = mix(hash, std::bit_cast<std::uint32_t>(state.heading));
    hash = mix(hash, std::bit_cast<std::uint32_t>(state.phase));
  }
  return {frame_index_++, seconds, actor_count, visible, hash};
}

std::span<const VeldrenRenderState> VeldrenDesktopClient::render_states() const {
  return std::span<const VeldrenRenderState>(render_states_.data(), state_count_);
}

std::span<const VeldrenAnimationState> VeldrenDesktopClient::animation_states() const {
  return std::span<const VeldrenAnimationState>(animation_states_.data(), state_count_);
}

void* VeldrenDesktopClient::core_world() const { return world_; }

const veldren::Scene& VeldrenDesktopClient::scene() const {
  const auto required = veldren_world_scene_serialize(world_, nullptr, 0);
  std::vector<char> json(static_cast<std::size_t>(required) + 1);
  if (required == 0 || veldren_world_scene_serialize(world_, json.data(), json.size()) != required)
    throw std::runtime_error("Could not read the C++ runtime scene");
  scene_cache_ = veldren::Scene::deserialize(json.data());
  return scene_cache_;
}
