#pragma once
#include "veldren/scene.h"

namespace veldren {
struct ResidencyBudget {
  double gpu_bytes=0, cpu_bytes=0;
  std::uint64_t idle_frames=0;
};
const ResidencyBudget& world_residency_profile(const std::string& profile);
// Presentation resources only. The inventory is supplied by the existing GPU
// owners; eviction never removes a Scene entity, asset definition or history.
class WorldResourceResidency {
 public:
  Json reconcile(const Json& inventory,const ResidencyBudget& budget,
                 double reserved_gpu=0,double reserved_cpu=0);
  void clear();
 private:
  struct Entry {std::uint64_t used=0;bool evicting=false;};
  std::map<std::string,Entry> entries_;
  std::uint64_t frame_=0,evictions_=0;
};
}
