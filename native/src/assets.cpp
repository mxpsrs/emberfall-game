#include "veldren/assets.h"
#include "veldren/asset_profile.h"
#include "veldren/asset_render.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <functional>
#include <limits>
#include <stdexcept>

namespace veldren {
namespace {
std::string text(const Json& j, const char* key) { const auto* v=j.find(key); return v?v->string_or():""; }
Json strings(const std::vector<std::string>& values) { Json::Array out; for(const auto& v:values)out.emplace_back(v);return out; }
const std::set<std::string> types{"model","mesh","texture","material","skeleton","animation","collision","audio","prefab"};
bool hash_valid(const std::string& value){return value.size()==64&&value.find_first_not_of("0123456789abcdef")==std::string::npos;}
void validate_variants(const Json& definition){
  const auto* variants=definition.find("variants");if(!variants)return;
  for(const auto& [profile,entries]:variants->object()){
    const auto policy=asset_profile(profile);std::set<std::string> usages;
    for(const auto& entry:entries.array()){
      const auto* settings=entry.find("settings");if(!settings)throw std::invalid_argument("Texture variant settings missing");
      const auto role=text(*settings,"role"),color=text(*settings,"colorSpace");
      const auto* alpha=settings->find("alphaCutoff");const double cutoff=alpha?alpha->number_or(-1):0;
      const auto width=entry.find("width"),height=entry.find("height");
      const auto path=text(entry,"derivedPath");
      if(!path.starts_with("assets/canonical/")||path.find("..")!=std::string::npos||path.find('\\')!=std::string::npos||!hash_valid(text(entry,"derivedHash"))||text(entry,"sourceHash")!=text(definition,"sourceHash"))throw std::invalid_argument("Invalid/stale texture variant source");
      if(!width||!height||width->number_or(-1)<1||height->number_or(-1)<1||width->number_or()>policy.max_texture_dimension||height->number_or()>policy.max_texture_dimension||std::floor(width->number_or())!=width->number_or()||std::floor(height->number_or())!=height->number_or())throw std::invalid_argument("Texture variant exceeds profile dimensions");
      if(!std::set<std::string>{"baseColor","emissive","normal","metallicRoughness","occlusion","data","appearanceMask"}.contains(role)||(color!="srgb"&&color!="linear")||(role=="normal"&&color!="linear")||!std::isfinite(cutoff)||cutoff<0||cutoff>1)throw std::invalid_argument("Invalid texture variant usage");
      if(!usages.insert(write_json(Json::Array{role,color,cutoff})).second)throw std::invalid_argument("Duplicate texture variant usage");
    }
  }
}
void validate(const Json& j) {
  const auto id=text(j,"id");
  if(id.empty()||id.find_first_of(" \t\r\n")!=std::string::npos)throw std::invalid_argument("Invalid stable asset ID");
  if(!types.contains(text(j,"type")))throw std::invalid_argument("Unsupported asset type: "+id);
  if(text(j,"type")=="texture")validate_variants(j);
  if(text(j,"name").empty())throw std::invalid_argument("Asset name required: "+id);
  if(const auto* lods=j.find("lods")){
    int previous=-1;double distance=-1;
    for(const auto& lod:lods->array()){
      const auto* level=lod.find("level");const auto* threshold=lod.find("threshold");
      const auto n=level?level->number_or(-1):-1,d=threshold?threshold->number_or(-1):-1;
      if(n<0||n>2||n!=std::floor(n)||n<=previous||!std::isfinite(d)||d<0||d<=distance||text(lod,"asset").empty())throw std::invalid_argument("Invalid LOD definition: "+id);
      if(previous==-1&&(n!=0||d!=0||text(lod,"asset")!=id))throw std::invalid_argument("LOD0 must reference the original asset at distance zero");
      previous=int(n);distance=d;
    }
  }
  if(const auto* bounds=j.find("bounds")) {
    if(bounds->array().size()!=2)throw std::invalid_argument("Asset AABB requires min/max: "+id);
    for(const auto& point:bounds->array())if(point.array().size()!=3)throw std::invalid_argument("Invalid asset AABB: "+id);
    for(int i=0;i<3;++i) {
      const auto a=bounds->array()[0].array()[i].number_or(NAN),b=bounds->array()[1].array()[i].number_or(NAN);
      if(!std::isfinite(a)||!std::isfinite(b)||a>b)throw std::invalid_argument("Invalid asset bounds: "+id);
    }
  }
  if(const auto* hash=j.find("sourceHash");hash&&!hash->string_or().empty()) {
    const auto h=hash->string_or();
    if(h.size()!=64||h.find_first_not_of("0123456789abcdef")!=std::string::npos)throw std::invalid_argument("Invalid source SHA256: "+id);
  }
}
}
AssetRegistry::Entry& AssetRegistry::require(const std::string& id) {auto it=entries_.find(id);if(it==entries_.end())throw std::out_of_range("Unknown asset: "+id);return it->second;}
const AssetRegistry::Entry& AssetRegistry::require(const std::string& id) const {auto it=entries_.find(id);if(it==entries_.end())throw std::out_of_range("Unknown asset: "+id);return it->second;}
void AssetRegistry::load(const Json& manifest) {
  if(text(manifest,"format")!="veldren.assets"||!manifest.find("version")||manifest.find("version")->number_or()!=1)throw std::invalid_argument("Unsupported asset manifest");
  const auto* records=manifest.find("records");if(!records)throw std::invalid_argument("Asset records required");
  AssetRegistry next;
  for(const auto& record:records->array()) {
    validate(record);const auto id=text(record,"id");Entry entry;entry.definition=record;
    if(const auto* deps=record.find("dependencies"))for(const auto& dep:deps->array()) {
      const auto name=dep.string_or();if(name.empty()||!entry.dependencies.insert(name).second)throw std::invalid_argument("Invalid or duplicate dependency: "+id);
    }
    if(const auto* lods=record.find("lods"))for(const auto& lod:lods->array())if(text(lod,"asset")!=id)entry.dependencies.insert(text(lod,"asset"));
    if(!next.entries_.emplace(id,std::move(entry)).second)throw std::invalid_argument("Duplicate stable asset ID: "+id);
  }
  for(const auto& [id,entry]:next.entries_)for(const auto& dep:entry.dependencies) {
    next.require(dep);next.reverse_[dep].insert(id);
  }
  for(const auto& [id,entry]:next.entries_)if(const auto* lods=entry.definition.find("lods"))for(const auto& lod:lods->array())if(text(next.require(text(lod,"asset")).definition,"type")!="model")throw std::invalid_argument("LOD must reference a model: "+id);
  std::map<std::string,int> colors;
  std::function<void(const std::string&,unsigned)> visit=[&](const std::string& id,unsigned depth) {
    if(depth>512)throw std::invalid_argument("Asset dependency depth exceeds 512");
    if(colors[id]==1)throw std::invalid_argument("Cyclic asset dependency: "+id);
    if(colors[id]==2)return;
    colors[id]=1;for(const auto& dep:next.require(id).dependencies)visit(dep,depth+1);colors[id]=2;
  };
  for(const auto& [id,entry]:next.entries_){(void)entry;visit(id,0);}
  // Transactional replacement preserves active roots, recomputing their closures.
  for(const auto& [id,count]:roots_)if(count&&!next.entries_.contains(id))throw std::invalid_argument("Cannot remove a leased asset: "+id);
  for(auto& [id,entry]:next.entries_)if(auto old=entries_.find(id);old!=entries_.end()) {
    entry.generation=old->second.generation+(entry.definition==old->second.definition?0:1);
    if(entry.definition==old->second.definition)entry.state=old->second.state;
  }
  std::set<std::string> changed_dependents;
  for(const auto& [id,entry]:next.entries_)if(auto old=entries_.find(id);old!=entries_.end()&&entry.definition!=old->second.definition)
    for(const auto& dependent:next.dependents(id,true))changed_dependents.insert(dependent);
  for(const auto& id:changed_dependents){auto& entry=next.require(id);auto old=entries_.find(id);if(old!=entries_.end()&&entry.definition==old->second.definition)++entry.generation;entry.state="unloaded";}
  for(const auto& [id,count]:roots_)if(count) {
    next.roots_[id]=count;auto closure=next.dependencies(id,true);closure.push_back(id);
    for(const auto& dep:closure)next.require(dep).users+=count;
  }
  for(auto& [id,entry]:next.entries_){(void)id;if(!entry.users&&entry.state=="loaded")entry.state="pending release";}
  next.revision_=revision_+1;*this=std::move(next);
}
Json AssetRegistry::document() const {Json::Array records;for(const auto& [id,e]:entries_){(void)id;records.push_back(e.definition);}return Json::Object{{"format","veldren.assets"},{"version",1},{"records",records}};}
Json AssetRegistry::record(const std::string& id) const {const auto& e=require(id);auto out=e.definition.object();out["loadState"]=e.state;out["users"]=double(e.users);out["generation"]=double(e.generation);return out;}
Json AssetRegistry::list(const std::string& type) const {Json::Array out;for(const auto& [id,e]:entries_)if(type.empty()||text(e.definition,"type")==type)out.emplace_back(id);return out;}
Json AssetRegistry::texture_variant(const std::string& id,const std::string& profile,const Json& usage) const {
  const auto policy=asset_profile(profile);const auto& definition=require(id).definition;
  if(text(definition,"type")!="texture")throw std::invalid_argument("Asset is not a texture: "+id);
  const auto* variants=definition.find("variants");const auto* entries=variants?variants->find(profile):nullptr;
  const auto role=text(usage,"role"),color=text(usage,"colorSpace");const auto* alpha=usage.find("alphaCutoff");const auto cutoff=alpha?alpha->number_or(-1):0;
  if(entries)for(const auto& entry:entries->array()){
    const auto* settings=entry.find("settings");const auto* stored_alpha=settings->find("alphaCutoff");
    if(text(*settings,"role")==role&&text(*settings,"colorSpace")==color&&(stored_alpha?stored_alpha->number_or(-1):0)==cutoff){
      auto result=entry.object(),processing=settings->object();processing["sourceHash"]=text(entry,"derivedHash");processing["maxDimension"]=double(policy.max_texture_dimension);
      result["processing"]=processing;result["anisotropy"]=double(policy.anisotropy);result["asset"]=id;return result;
    }
  }
  throw std::invalid_argument("Texture usage unavailable for profile: "+id+" / "+profile);
}
std::vector<std::string> AssetRegistry::dependencies(const std::string& id,bool transitive) const {
  require(id);std::vector<std::string> out;std::set<std::string> visited;
  std::function<void(const std::string&)> walk=[&](const std::string& name){for(const auto& dep:require(name).dependencies)if(visited.insert(dep).second){if(transitive)walk(dep);out.push_back(dep);}};
  walk(id);return out;
}
std::vector<std::string> AssetRegistry::dependents(const std::string& id,bool transitive) const {
  require(id);std::vector<std::string> out;std::set<std::string> visited;
  std::function<void(const std::string&)> walk=[&](const std::string& name){auto it=reverse_.find(name);if(it==reverse_.end())return;for(const auto& dep:it->second)if(visited.insert(dep).second){out.push_back(dep);if(transitive)walk(dep);}};
  walk(id);return out;
}
void AssetRegistry::acquire(const std::string& id) {
  auto ids=dependencies(id,true);ids.push_back(id);for(const auto& dep:ids)if(require(dep).users==std::numeric_limits<std::uint64_t>::max())throw std::overflow_error("Asset lease overflow");
  ++roots_[id];for(const auto& dep:ids){auto& e=require(dep);++e.users;if(e.state=="unloaded"||e.state=="failed")e.state="loading";else if(e.state=="pending release")e.state="loaded";}
}
void AssetRegistry::release(const std::string& id) {
  require(id);auto root=roots_.find(id);if(root==roots_.end()||!root->second)throw std::invalid_argument("Unbalanced asset release: "+id);
  if(!--root->second)roots_.erase(root);
  auto ids=dependencies(id,true);ids.push_back(id);for(const auto& dep:ids){auto& e=require(dep);if(!--e.users)e.state=e.state=="loaded"?"pending release":"unloaded";}
}
void AssetRegistry::set_state(const std::string& id,const std::string& state) {
  auto& e=require(id);
  if(state=="loaded"||state=="failed"){if(!e.users)throw std::invalid_argument("Cannot finish unleased asset load");}
  else if(state=="unloaded"){if(e.users)throw std::invalid_argument("Cannot unload a leased asset");}
  else throw std::invalid_argument("Invalid explicit asset state");
  e.state=state;
}
std::vector<std::string> AssetRegistry::invalidate(const std::string& id) {
  auto out=dependents(id,true);out.insert(out.begin(),id);
  for(const auto& name:out){auto& e=require(name);++e.generation;e.state=e.users?"loading":"unloaded";}++revision_;return out;
}
Json AssetRegistry::diagnostics() const {
  Json::Object states;std::uint64_t leases=0;for(const auto& [id,e]:entries_){(void)id;states[e.state]=states[e.state].number_or()+1;leases+=e.users;}
  return Json::Object{{"records",double(entries_.size())},{"roots",double(roots_.size())},{"dependencyLeases",double(leases)},{"revision",double(revision_)},{"states",states}};
}
Json AssetRegistry::select_lod(const std::string& id,double distance,int current,double hysteresis)const{
 if(!std::isfinite(distance)||distance<0||!std::isfinite(hysteresis)||hysteresis<0||hysteresis>.45||current < -1||current>2)throw std::invalid_argument("Invalid LOD decision");
 const auto* lods=require(id).definition.find("lods");Json target=Json::Object{{"level",0},{"asset",id},{"threshold",0}},previous=target;bool found=current==0;
 if(lods)for(const auto& lod:lods->array()){if(lod.find("threshold")->number_or()<=distance)target=lod;if(lod.find("level")->number_or()==current){previous=lod;found=true;}}
 Json selected=target;const int desired=int(target.find("level")->number_or());
 if(found&&current>=0&&hysteresis>0){
  if(desired>current&&distance<target.find("threshold")->number_or()*(1+hysteresis))selected=previous;
  else if(desired<current&&distance>=previous.find("threshold")->number_or()*(1-hysteresis))selected=previous;
 }
 if(current>=0||hysteresis>0){auto result=selected.object();result["targetLevel"]=desired;result["missingLods"]=!lods||lods->array().size()<2;return result;}
 return selected;
}
Json AssetRegistry::command(const Json& r) {
  const auto op=text(r,"op"),id=text(r,"id");
  if(op=="load"){const auto* manifest=r.find("manifest");if(!manifest)throw std::invalid_argument("Manifest required");load(*manifest);return diagnostics();}
  if(op=="validate"){const auto* manifest=r.find("manifest");if(!manifest)throw std::invalid_argument("Manifest required");AssetRegistry candidate;candidate.load(*manifest);return candidate.diagnostics();}
  if(op=="lod"){
    const auto* distance=r.find("distance"),*current=r.find("current"),*hysteresis=r.find("hysteresis");
    const double level=current?current->number_or(-2):-1;
    if(level!=std::floor(level)||level < -1||level>2)throw std::invalid_argument("Invalid current LOD");
    return select_lod(id,distance?distance->number_or(-1):-1,int(level),hysteresis?hysteresis->number_or(-1):0);
  }
  if(op=="record")return record(id);
  if(op=="material-plan")return material_plan(id,text(r,"profile"));
  if(op=="render-plan"){const auto* model=r.find("model");if(!model)throw std::invalid_argument("Canonical model required");return asset_render_plan(*this,*model);}
  if(op=="texture-variant"){const auto* usage=r.find("usage");if(!usage)throw std::invalid_argument("Texture usage required");return texture_variant(id,text(r,"profile"),*usage);}
  if(op=="list")return list(text(r,"type"));
  if(op=="document")return document();
  if(op=="dependencies")return strings(dependencies(id,true));
  if(op=="dependents")return strings(dependents(id,true));
  if(op=="invalidate")return strings(invalidate(id));
  if(op=="acquire")acquire(id);
  else if(op=="release")release(id);
  else if(op=="state")set_state(id,text(r,"state"));
  else if(op!="diagnostics")throw std::invalid_argument("Unknown asset command");
  return diagnostics();
}
}
namespace {
struct AssetHandle {veldren::AssetRegistry registry;std::string response;};
std::map<std::uint32_t,AssetHandle> asset_handles;
std::uint32_t asset_next=1;
}
extern "C" {
std::uint32_t veldren_assets_create(){if(!asset_next)return 0;const auto id=asset_next++;asset_handles.emplace(id,AssetHandle{});return id;}
void veldren_assets_destroy(std::uint32_t handle){asset_handles.erase(handle);}
int veldren_assets_command(std::uint32_t handle,const char* json){auto it=asset_handles.find(handle);if(it==asset_handles.end()||!json)return 0;try{it->second.response=veldren::write_json(veldren::Json::Object{{"ok",true},{"value",it->second.registry.command(veldren::parse_json(json))}});return 1;}catch(const std::exception& e){it->second.response=veldren::write_json(veldren::Json::Object{{"ok",false},{"error",e.what()}});return 0;}}
std::uint32_t veldren_assets_response(std::uint32_t handle,char* out,std::uint32_t capacity){auto it=asset_handles.find(handle);if(it==asset_handles.end())return 0;const auto& s=it->second.response;if(out&&capacity>s.size()){std::memcpy(out,s.data(),s.size());out[s.size()]=0;}return std::uint32_t(s.size());}
}

namespace veldren { AssetRegistry* asset_registry_for_performance(std::uint32_t handle){const auto it=asset_handles.find(handle);return it==asset_handles.end()?nullptr:&it->second.registry;} }
