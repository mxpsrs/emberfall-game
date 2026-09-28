#pragma once
#include "veldren/assets.h"
#include <functional>
#include <unordered_set>

namespace veldren {
struct WorldBounds {
  Vec3 min, max;
  bool intersects(const WorldBounds& other) const;
};
struct WorldCellKey {
  int x=0,z=0;
  auto operator<=>(const WorldCellKey&) const = default;
};
struct WorldSpatialRecord {
  EntityId id;
  WorldBounds bounds;
  Vec3 anchor;
  std::string asset, category, render_path;
  bool renderable=false, dynamic=false, terrain_relative=false, uncertain_bounds=false, light=false;
  std::vector<WorldCellKey> cells;
};
struct WorldPartitionStats {
  std::size_t records=0, cells=0, static_records=0, dynamic_records=0, large_records=0;
  std::size_t updated=0, rebuilds=0, queried_cells=0, considered=0;
};
// Derived acceleration only. No entity, transform, component, gameplay state or
// persistence ownership is transferred out of Scene.
class WorldPartition {
 public:
  static constexpr double cell_size=32;
  void synchronize(Scene& scene,const AssetRegistry& assets);
  std::vector<EntityId> query(const WorldBounds& bounds);
  const WorldSpatialRecord* record(const EntityId& id) const;
  std::vector<EntityId> members(WorldCellKey key) const;
  const WorldPartitionStats& statistics() const { return stats_; }
  void reset();
  // Runtime terrain grounding / live actor presentation never writes Scene.
  void ground(const EntityId& id,double height);
  void dynamic_position(const EntityId& id,Vec3 position);
  Json diagnostics() const;
 private:
  struct Cell { std::set<EntityId> statics,dynamics; };
  std::map<WorldCellKey,Cell> cells_;
  std::unordered_map<EntityId,WorldSpatialRecord> records_;
  std::unordered_map<EntityId,WorldBounds> ungrounded_;
  std::set<EntityId> large_;
  std::uint64_t revision_=0,asset_revision_=0;
  bool initialized_=false;
  WorldPartitionStats stats_;
  void remove(const EntityId& id);
  void insert(WorldSpatialRecord record);
  void update(Scene& scene,const AssetRegistry& assets,const EntityId& id);
};

// Native browser ABI looks up the existing canonical owners, not JSON copies.
Scene* world_scene_for_performance(void* world,const char* name);
std::string world_lights_for_performance(void* world,const char* scene,double night,const std::vector<EntityId>& ids);
AssetRegistry* asset_registry_for_performance(std::uint32_t handle);
}
extern "C" {
std::uint32_t veldren_performance_create(void* world,std::uint32_t assets);
void veldren_performance_destroy(std::uint32_t handle);
int veldren_performance_command(std::uint32_t handle,const char* request);
std::uint32_t veldren_performance_response(std::uint32_t handle,char* out,std::uint32_t capacity);
}
