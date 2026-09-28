#include "veldren/world_streaming.h"
#include "veldren/world_residency.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace veldren {
namespace {
std::string text(const Json& value,const char* key){const auto* v=value.find(key);return v?v->string_or():std::string{};}
double number(const Json& value,const char* key){const auto* v=value.find(key);return v?v->number_or():0;}
WorldCellKey cell_at(Vec3 p){return {static_cast<int>(std::floor(p.x/WorldPartition::cell_size)),static_cast<int>(std::floor(p.z/WorldPartition::cell_size))};}
void valid(Vec3 p){for(double v:{p.x,p.y,p.z})if(!std::isfinite(v)||std::abs(v)>10000000)throw std::invalid_argument("Invalid streaming position");}
}
void WorldStreaming::clear(){resources_.clear();cells_.clear();frame_=0;epoch_=-1;}
Json WorldStreaming::plan(Scene& scene,WorldPartition& partition,const AssetRegistry& assets,const Json& request){
 const auto profile=text(request,"profile");const auto& budget=world_residency_profile(profile);
 const bool mobile=profile=="browser-mobile",desktop=profile=="desktop"||profile=="native-desktop";
 const std::size_t concurrency=mobile?2:desktop?8:4,prefetch_limit=mobile?8:desktop?32:16,retained_limit=mobile?128:desktop?1024:256;
 const std::uint64_t grace=mobile?30:desktop?120:60;
 const auto* rows=request.find("demands"),*center=request.find("center"),*receipts=request.find("receipts"),*pins=request.find("pins");
 if(!rows||rows->array().size()>100000||!center||center->array().size()!=3)throw std::invalid_argument("Bounded stream demand and center required");
 const Vec3 focus{center->array()[0].number_or(NAN),center->array()[1].number_or(NAN),center->array()[2].number_or(NAN)};valid(focus);
 const double allocated=number(request,"gpuBytes");if(!std::isfinite(allocated)||allocated<0)throw std::invalid_argument("Invalid stream allocation estimate");
 const double epoch=number(request,"epoch");if(!std::isfinite(epoch)||epoch<0||std::floor(epoch)!=epoch||epoch>9007199254740991.0)throw std::invalid_argument("Invalid stream epoch");
 const bool pressure=allocated>budget.gpu_bytes*.8;
 struct Demand {std::string asset,material,owner;Vec3 position;bool required;};std::vector<Demand> demands;
 for(const auto& row:rows->array()){const auto& a=row.array();if(a.size()!=6)throw std::invalid_argument("Invalid stream demand row");
  Demand d{a[0].string_or(),a[1].string_or(),a[2].string_or(),{a[3].number_or(NAN),a[4].number_or(NAN),a[5].number_or(NAN)},true};valid(d.position);demands.push_back(std::move(d));
 }
 if(receipts){if(receipts->array().size()>100000)throw std::invalid_argument("Too many stream receipts");for(const auto& r:receipts->array()){const auto& a=r.array();if(a.size()!=2||(a[1].string_or()!="ready"&&a[1].string_or()!="failed"&&a[1].string_or()!="released"))throw std::invalid_argument("Invalid stream receipt");}}
 if(pins&&pins->array().size()>4096)throw std::invalid_argument("Too many editor stream pins");
 std::map<std::string,Json> definitions;
 auto definition=[&](const std::string& id)->const Json&{auto it=definitions.find(id);if(it==definitions.end())it=definitions.emplace(id,assets.record(id)).first;return it->second;};
 auto supported=[&](const std::string& id){if(!assets.has(id))return false;const auto& d=definition(id);const auto* settings=d.find("importSettings");return text(d,"type")=="model"&&settings&&text(*settings,"importer")=="veldren-gltf-1";};
 // Only canonical authored renderers can be prefetched from Scene metadata.
 // Generated compatibility submeshes join demand through their actual draws.
 auto add_entity=[&](const EntityId& id,bool required){const auto* r=partition.record(id);if(!r||!r->renderable||r->render_path!="canonical"||!supported(r->asset))return;
  const auto node=scene.inspect(id);const auto m=node.components.find("MeshRenderer");if(m==node.components.end())return;
  const auto material=m->second.find("material");demands.push_back({r->asset,material==m->second.end()?"":material->second.string_or(),id,r->anchor,required});
 };
 if(pins){std::set<EntityId> seen;std::vector<EntityId> queue;for(const auto& id:pins->array())queue.push_back(id.string_or());
  for(std::size_t i=0;i<queue.size();++i){if(queue.size()>100000)throw std::invalid_argument("Editor stream pin subtree too large");const auto& id=queue[i];if(!scene.contains(id)||!seen.insert(id).second)continue;add_entity(id,true);const auto node=scene.inspect(id);queue.insert(queue.end(),node.children.begin(),node.children.end());}
 }
 if(!pressure){const double reach=WorldPartition::cell_size*2;const auto neighbors=partition.query({{focus.x-reach,-10000000,focus.z-reach},{focus.x+reach,10000000,focus.z+reach}});for(const auto& id:neighbors)add_entity(id,false);}
 struct Wanted {Resource resource;std::set<WorldCellKey> cells;};std::map<std::string,Wanted> wanted;
 for(auto d:demands){if(!supported(d.asset)){if(d.required)throw std::invalid_argument("Unsupported streaming model: "+d.asset);continue;}
  const auto& model=definition(d.asset);double mg=0;if(!d.material.empty()){const auto& material=definition(d.material);if(text(material,"type")!="material")throw std::invalid_argument("Invalid stream material");mg=number(material,"generation");}
  const auto generation=number(model,"generation");const std::string key=write_json(Json::Array{d.asset,d.material,generation,mg,profile});
  const auto distance=std::hypot(d.position.x-focus.x,d.position.y-focus.y,d.position.z-focus.z);auto [it,inserted]=wanted.try_emplace(key,Wanted{Resource{d.asset,d.material,generation,mg,distance,0,d.required,Phase::Queued},{}});
  if(!inserted){it->second.resource.required|=d.required;it->second.resource.distance=std::min(it->second.resource.distance,distance);}
  if(const auto draw=d.owner.rfind(":draw:");draw!=std::string::npos)d.owner.resize(draw);
  const auto* record=partition.record(d.owner);if(record&&!record->cells.empty())it->second.cells.insert(record->cells.begin(),record->cells.end());else it->second.cells.insert(cell_at(d.position));
 }
 std::vector<std::string> prefetched;for(const auto& [key,w]:wanted)if(!w.resource.required)prefetched.push_back(key);
 std::sort(prefetched.begin(),prefetched.end(),[&](const auto& a,const auto& b){return wanted.at(a).resource.distance<wanted.at(b).resource.distance;});
 for(std::size_t i=prefetch_limit;i<prefetched.size();++i)wanted.erase(prefetched[i]);
 // All input and asset references have been checked before mutating scheduling.
 if(epoch_!=epoch){clear();epoch_=epoch;}
 ++frame_;if(receipts)for(const auto& receipt:receipts->array()){const auto& a=receipt.array();const auto it=resources_.find(a[0].string_or());if(it==resources_.end())continue;
  const auto state=a[1].string_or();if(state=="released"){if(it->second.phase==Phase::Evicting)resources_.erase(it);}else if(it->second.phase==Phase::Loading)it->second.phase=state=="ready"?Phase::Resident:Phase::Failed;
 }
 for(auto& [key,r]:resources_){(void)key;r.required=false;}
 std::map<WorldCellKey,std::set<std::string>> cell_wants;
 for(const auto& [key,w]:wanted){auto [it,inserted]=resources_.try_emplace(key,w.resource);auto& r=it->second;r.required=w.resource.required;r.distance=w.resource.distance;r.wanted=frame_;
  // Eviction acknowledgement completes before a new request for the same key.
  for(const auto cell:w.cells)cell_wants[cell].insert(key);
  (void)inserted;
 }
 for(auto& [key,keys]:cell_wants)cells_[key]={std::move(keys),frame_};
 Json::Array release,load,cell_states;std::size_t retained=resources_.size(),inflight=0,queued=0,ready=0,failed=0,required_count=0;
 for(auto& [key,r]:resources_){if(r.wanted==frame_&&r.phase==Phase::Evicting)continue;
  if(r.wanted!=frame_&&(r.phase!=Phase::Resident||pressure||frame_-r.wanted>grace||retained>retained_limit)){
   if(r.phase!=Phase::Evicting){r.phase=Phase::Evicting;--retained;}release.emplace_back(key);
  }
  if(r.phase==Phase::Loading)++inflight;
 }
 std::vector<std::string> queue;for(const auto& [key,r]:resources_)if(r.phase==Phase::Queued&&r.wanted==frame_)queue.push_back(key);
 std::sort(queue.begin(),queue.end(),[&](const auto& a,const auto& b){const auto& x=resources_.at(a);const auto& y=resources_.at(b);if(x.required!=y.required)return x.required;return x.distance==y.distance?a<b:x.distance<y.distance;});
 for(const auto& key:queue){if(inflight>=concurrency)break;auto& r=resources_.at(key);r.phase=Phase::Loading;++inflight;load.emplace_back(Json::Object{{"key",key},{"asset",r.asset},{"material",r.material},{"generation",r.generation},{"materialGeneration",r.material_generation}});}
 for(const auto& [key,r]:resources_){(void)key;if(r.required)++required_count;if(r.phase==Phase::Queued)++queued;if(r.phase==Phase::Resident)++ready;if(r.phase==Phase::Failed)++failed;}
 for(auto it=cells_.begin();it!=cells_.end();){const auto& cell=it->second;std::string state="resident";bool any=false,pending=false,error=false;
  for(const auto& key:cell.keys){const auto r=resources_.find(key);if(r==resources_.end())continue;any=true;if(r->second.phase==Phase::Evicting)state="unloading";else if(r->second.phase==Phase::Failed)error=true;else if(r->second.phase!=Phase::Resident)pending=true;}
  if(frame_-cell.wanted>grace+1){it=cells_.erase(it);continue;}
  if(!any||frame_-cell.wanted>grace)state="unloaded";else if(error)state="failed";else if(pending)state="loading";
  cell_states.emplace_back(Json::Array{it->first.x,it->first.z,state,double(cell.keys.size()),cell.wanted==frame_});++it;
 }
 return Json::Object{{"load",load},{"release",release},{"cells",cell_states},{"stats",Json::Object{{"tracked",double(resources_.size())},{"required",double(required_count)},{"queued",double(queued)},{"loading",double(inflight)},{"resident",double(ready)},{"failed",double(failed)},{"cells",double(cells_.size())},{"concurrency",double(concurrency)},{"memoryPressure",pressure}}}};
}
}
