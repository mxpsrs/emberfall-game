#pragma once
#include "veldren/world_performance.h"

namespace veldren {
// Cell residency owns demand and scheduling only. Phase 2 still owns every
// asset definition, dependency lease, decoded payload and GPU allocation.
class WorldStreaming {
 public:
  Json plan(Scene& scene,WorldPartition& partition,const AssetRegistry& assets,const Json& request);
  void clear();
 private:
  enum class Phase {Queued,Loading,Resident,Failed,Evicting};
  struct Resource {
    std::string asset,material;
    double generation=0,material_generation=0,distance=0;
    std::uint64_t wanted=0;
    bool required=false;
    Phase phase=Phase::Queued;
  };
  struct Cell {std::set<std::string> keys;std::uint64_t wanted=0;};
  std::map<std::string,Resource> resources_;
  std::map<WorldCellKey,Cell> cells_;
  std::uint64_t frame_=0;
  double epoch_=-1;
};
}
