#include "veldren/world_performance.h"
#include "veldren/world_visibility.h"
#include "veldren/world_lod.h"
#include <cstring>
#include <cmath>
#include <memory>
#include <stdexcept>

namespace {
struct PerformanceHandle {void* world;std::uint32_t assets;std::string scene,response;veldren::WorldPartition partition;veldren::WorldLodState canonical_lods,compatibility_lods;};
std::map<std::uint32_t,PerformanceHandle> handles;
std::uint32_t next_handle=1;
using veldren::Json;
veldren::Vec3 vector(const Json* value){if(!value||value->array().size()!=3)throw std::invalid_argument("Expected spatial vector");const auto& a=value->array();return {a[0].number_or(NAN),a[1].number_or(NAN),a[2].number_or(NAN)};}
Json numbers(veldren::Vec3 v){return Json::Array{v.x,v.y,v.z};}
Json strings(const std::vector<veldren::EntityId>& ids){Json::Array out;out.reserve(ids.size());for(const auto& id:ids)out.emplace_back(id);return out;}
Json command(PerformanceHandle& h,const Json& request){
 const auto* op=request.find("op"),*name=request.find("scene");if(!op||!name)throw std::invalid_argument("Performance operation and Scene required");
 auto* assets=veldren::asset_registry_for_performance(h.assets);auto* scene=veldren::world_scene_for_performance(h.world,name->string_or().c_str());
 if(!assets||!scene)throw std::invalid_argument("Canonical owner unavailable");
 if(h.scene!=scene->name()||!scene->spatial_tracking()){h.partition.reset();h.canonical_lods.clear();h.compatibility_lods.clear();h.scene=scene->name();}
 h.partition.synchronize(*scene,*assets);const auto action=op->string_or();
 if(action=="sync")return h.partition.diagnostics();
 if(action=="query"){auto ids=h.partition.query({vector(request.find("min")),vector(request.find("max"))});return Json::Object{{"ids",strings(ids)},{"stats",h.partition.diagnostics()}};}
 if(action=="visible"){
  const auto* value=request.find("camera");if(!value)throw std::invalid_argument("Visibility camera required");
  const auto scalar=[&](const char* key){const auto* v=value->find(key);return v?v->number_or(NAN):NAN;};
  veldren::WorldCamera camera;camera.eye=vector(value->find("eye"));camera.center=vector(value->find("center"));camera.near_plane=scalar("near");camera.far_plane=scalar("far");camera.left=scalar("left");camera.right=scalar("right");camera.bottom=scalar("bottom");camera.top=scalar("top");camera.viewport_height=scalar("height");
  const auto* profile=request.find("profile");const auto& policies=veldren::world_visibility_profile(profile?profile->string_or():"browser");
  h.canonical_lods.begin_frame(*assets);const auto visibility=veldren::WorldVisibility{}.evaluate(h.partition,camera,policies);Json::Array packets,lights;
  for(const auto& id:visibility.ids){const auto* record=h.partition.record(id);if(record->light)lights.emplace_back(id);if(record->render_path!="canonical")continue;
   const auto node=scene->inspect(id);const auto found=node.components.find("MeshRenderer");if(found==node.components.end())continue;const auto& mesh=found->second;
   const auto visible=mesh.find("visible");if(visible!=mesh.end()&&!visible->second.bool_or(true))continue;
   Json::Array matrix;for(double n:node.world.v)matrix.emplace_back(n);
   const auto material=mesh.find("material"),cast=mesh.find("castShadows"),receive=mesh.find("receiveShadows");
   const double distance=std::hypot(node.world.v[12]-camera.eye.x,node.world.v[13]-camera.eye.y,node.world.v[14]-camera.eye.z);
   const auto lod=h.canonical_lods.select(*assets,id,record->asset,distance);
   packets.emplace_back(Json::Array{id,*lod.find("asset"),matrix,material==mesh.end()?Json(""):material->second,cast==mesh.end()?Json(true):cast->second,receive==mesh.end()?Json(true):receive->second,distance});
  }
  auto stats=h.partition.diagnostics().object();stats["consideredSpatialRecords"]=double(visibility.considered);stats["visibleSpatialRecords"]=double(visibility.ids.size());stats["consideredRenderables"]=double(visibility.considered_renderables);stats["visibleRenderables"]=double(visibility.visible_renderables);stats["frustumCulled"]=double(visibility.frustum_culled);stats["distanceCulled"]=double(visibility.distance_culled);stats["projectedCulled"]=double(visibility.projected_culled);stats["visibleLights"]=double(visibility.lights);
  return Json::Object{{"ids",strings(visibility.ids)},{"packets",packets},{"lights",lights},{"lod",h.canonical_lods.diagnostics()},{"stats",stats}};
 }
 if(action=="lod-batch"){
  const auto* rows=request.find("entries");if(!rows||rows->array().size()>100000)throw std::invalid_argument("Bounded LOD batch required");
  h.compatibility_lods.begin_frame(*assets);Json::Array result;result.reserve(rows->array().size());
  for(const auto& row:rows->array()){const auto& a=row.array();if(a.size()!=3)throw std::invalid_argument("Invalid LOD batch row");const auto selected=h.compatibility_lods.select(*assets,a[0].string_or(),a[1].string_or(),a[2].number_or(-1));result.emplace_back(Json::Array{*selected.find("asset"),*selected.find("level"),*selected.find("targetLevel"),*selected.find("threshold")});}
  return Json::Object{{"selections",result},{"stats",h.compatibility_lods.diagnostics()}};
 }
 if(action=="lights"){
  const auto candidates=h.partition.query({vector(request.find("min")),vector(request.find("max"))});std::vector<veldren::EntityId> ids;
  for(const auto& id:candidates)if(h.partition.record(id)->light)ids.push_back(id);
  const auto* night=request.find("night");return veldren::parse_json(veldren::world_lights_for_performance(h.world,h.scene.c_str(),night?night->number_or(1):1,ids));
 }
 if(action=="record"){
  const auto* id=request.find("id");if(!id)throw std::invalid_argument("Entity ID required");const auto* record=h.partition.record(id->string_or());if(!record)return nullptr;
  Json::Array cells;for(const auto key:record->cells)cells.emplace_back(Json::Array{key.x,key.z});
  return Json::Object{{"id",record->id},{"bounds",Json::Array{numbers(record->bounds.min),numbers(record->bounds.max)}},{"category",record->category},{"asset",record->asset},{"dynamic",record->dynamic},{"terrainRelative",record->terrain_relative},{"uncertainBounds",record->uncertain_bounds},{"cells",cells}};
 }
 if(action=="ground"||action=="dynamic"){
  const auto* changes=request.find("changes");if(!changes||changes->array().size()>100000)throw std::invalid_argument("Bounded presentation changes required");
  for(const auto& change:changes->array()){const auto& a=change.array();if(a.size()!=(action=="ground"?2:4))throw std::invalid_argument("Invalid presentation change");if(action=="ground")h.partition.ground(a[0].string_or(),a[1].number_or(NAN));else h.partition.dynamic_position(a[0].string_or(),{a[1].number_or(NAN),a[2].number_or(NAN),a[3].number_or(NAN)});}
  return h.partition.diagnostics();
 }
 throw std::invalid_argument("Unknown world performance command");
}
}
extern "C" {
std::uint32_t veldren_performance_create(void* world,std::uint32_t assets){if(!world||!veldren::asset_registry_for_performance(assets)||!next_handle)return 0;const auto id=next_handle++;handles.emplace(id,PerformanceHandle{world,assets,{},{},{},{},{}});return id;}
void veldren_performance_destroy(std::uint32_t handle){handles.erase(handle);}
int veldren_performance_command(std::uint32_t handle,const char* request){auto it=handles.find(handle);if(it==handles.end()||!request)return 0;try{it->second.response=veldren::write_json(Json::Object{{"ok",true},{"value",command(it->second,veldren::parse_json(request))}});return 1;}catch(const std::exception& e){it->second.response=veldren::write_json(Json::Object{{"ok",false},{"error",e.what()}});return 0;}}
std::uint32_t veldren_performance_response(std::uint32_t handle,char* out,std::uint32_t capacity){const auto it=handles.find(handle);if(it==handles.end())return 0;const auto& text=it->second.response;if(out&&capacity>text.size()){std::memcpy(out,text.data(),text.size());out[text.size()]=0;}return static_cast<std::uint32_t>(text.size());}
}
