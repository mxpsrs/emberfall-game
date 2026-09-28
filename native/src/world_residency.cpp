#include "veldren/world_residency.h"
#include <algorithm>
#include <cmath>
#include <set>
#include <stdexcept>

namespace veldren {
const ResidencyBudget& world_residency_profile(const std::string& profile){
 constexpr double mb=1024*1024;
 static const ResidencyBudget mobile{128*mb,64*mb,60},browser{256*mb,128*mb,120},desktop{1024*mb,512*mb,240};
 if(profile=="browser-mobile")return mobile;
 if(profile=="browser")return browser;
 if(profile=="desktop"||profile=="native-desktop")return desktop;
 throw std::invalid_argument("Unknown resource residency profile");
}
void WorldResourceResidency::clear(){entries_.clear();frame_=evictions_=0;}
Json WorldResourceResidency::reconcile(const Json& inventory,const ResidencyBudget& budget,double reserved_gpu,double reserved_cpu){
 auto valid=[](double n){return std::isfinite(n)&&n>=0&&n<=1e15;};
 if(!valid(reserved_gpu)||!valid(reserved_cpu)||!valid(budget.gpu_bytes)||!valid(budget.cpu_bytes))throw std::invalid_argument("Invalid residency byte count");
 const auto& rows=inventory.array();if(rows.size()>100000)throw std::invalid_argument("Residency inventory too large");
 struct Resource {std::string id;double gpu,cpu,reclaim;bool used;};
 std::vector<Resource> resources;std::set<std::string> present;
 // Validate the whole snapshot before changing state; malformed input cannot
 // age or partially evict the previous valid inventory.
 for(const auto& row:rows){const auto& a=row.array();if(a.size()!=4&&a.size()!=5)throw std::invalid_argument("Invalid residency row");
  Resource r{a[0].string_or(),a[1].number_or(-1),a[2].number_or(-1),a.size()==5?a[4].number_or(-1):0,a[3].bool_or()};
  if(r.id.empty()||r.id.size()>1024||!valid(r.gpu)||!valid(r.cpu)||!valid(r.reclaim)||r.reclaim>r.cpu||!present.insert(r.id).second)throw std::invalid_argument("Invalid residency resource");
  resources.push_back(std::move(r));
 }
 Json::Array discard;double discarded=0;for(auto& r:resources)if(r.reclaim>0){discard.emplace_back(r.id);discarded+=r.reclaim;r.cpu-=r.reclaim;}
 ++frame_;
 for(auto it=entries_.begin();it!=entries_.end();)if(!present.contains(it->first))it=entries_.erase(it);else ++it;
 double gpu=reserved_gpu,cpu=reserved_cpu,pinned_gpu=reserved_gpu,pinned_cpu=reserved_cpu;std::size_t active=0;
 for(const auto& r:resources){auto [it,inserted]=entries_.try_emplace(r.id,Entry{frame_,false});auto& entry=it->second;
  if(r.used){entry.used=frame_;entry.evicting=false;++active;pinned_gpu+=r.gpu;pinned_cpu+=r.cpu;}
  gpu+=r.gpu;cpu+=r.cpu;(void)inserted;
 }
 std::sort(resources.begin(),resources.end(),[&](const auto& a,const auto& b){const auto x=entries_.at(a.id).used,y=entries_.at(b.id).used;return x==y?a.id<b.id:x<y;});
 Json::Array evict;
 for(const auto& r:resources){auto& entry=entries_.at(r.id);if(r.used)continue;
  if(entry.evicting||gpu>budget.gpu_bytes||cpu>budget.cpu_bytes||frame_-entry.used>budget.idle_frames){
   evict.emplace_back(r.id);gpu-=r.gpu;cpu-=r.cpu;if(!entry.evicting)++evictions_;entry.evicting=true;
  }
 }
 return Json::Object{{"evict",evict},{"discardStaging",discard},{"stats",Json::Object{{"tracked",double(entries_.size())},{"active",double(active)},
  {"resident",double(entries_.size()-evict.size())},{"evicting",double(evict.size())},{"evictions",double(evictions_)},
  {"gpuBytes",gpu},{"cpuBytes",cpu},{"discardedStagingBytes",discarded},{"gpuBudget",budget.gpu_bytes},{"cpuBudget",budget.cpu_bytes},
  {"pinnedGpuBytes",pinned_gpu},{"pinnedCpuBytes",pinned_cpu},
  {"overBudget",gpu>budget.gpu_bytes||cpu>budget.cpu_bytes}}}};
}
}
