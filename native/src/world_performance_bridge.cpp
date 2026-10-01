#include "veldren/world_performance.h"
#include "veldren/world_visibility.h"
#include "veldren/world_lod.h"
#include "veldren/world_residency.h"
#include "veldren/world_streaming.h"
#include <cstring>
#include <cmath>
#include <memory>
#include <stdexcept>

namespace {
struct PackedDraw {std::uint32_t id,asset,material,flags;float matrix[16],distance;};
static_assert(sizeof(PackedDraw)==84);
struct FrameStorage {
 std::vector<std::uint8_t> bytes;
 std::vector<PackedDraw> draws;
 std::vector<std::uint32_t> ids,lights;
 std::vector<std::uint32_t> lod_words;
 std::vector<veldren::EntityId> visible_ids;
 std::string visible_scene;
 std::array<std::uint32_t,5> paging{};
 std::unordered_map<std::string,std::uint32_t> symbols;
 veldren::Json::Array strings;
 std::string strings_json;
 std::uint32_t strings_revision=0,serialized_revision=0;
 std::uint32_t intern(const std::string& value){
  const auto found=symbols.find(value);if(found!=symbols.end())return found->second;
  const auto index=static_cast<std::uint32_t>(strings.size());symbols.emplace(value,index);strings.emplace_back(value);++strings_revision;return index;
 }
};
struct PerformanceHandle {void* world=nullptr;std::uint32_t assets=0;std::string scene,response;veldren::WorldPartition partition;veldren::WorldLodState canonical_lods,compatibility_lods;veldren::WorldResourceResidency residency;veldren::WorldStreaming streaming;FrameStorage frame;};
std::map<std::uint32_t,PerformanceHandle> handles;
std::uint32_t next_handle=1;
using veldren::Json;
veldren::Vec3 vector(const Json* value){if(!value||value->array().size()!=3)throw std::invalid_argument("Expected spatial vector");const auto& a=value->array();return {a[0].number_or(NAN),a[1].number_or(NAN),a[2].number_or(NAN)};}
Json numbers(veldren::Vec3 v){return Json::Array{v.x,v.y,v.z};}
Json strings(const std::vector<veldren::EntityId>& ids){Json::Array out;out.reserve(ids.size());for(const auto& id:ids)out.emplace_back(id);return out;}
veldren::Scene* prepare_scene(PerformanceHandle& h,const char* name){
 auto* assets=veldren::asset_registry_for_performance(h.assets);auto* scene=veldren::world_scene_for_performance(h.world,name);
 if(!assets||!scene)throw std::invalid_argument("Canonical owner unavailable");
 if(h.scene!=scene->name()||!scene->spatial_tracking()){h.partition.reset();h.canonical_lods.clear();h.compatibility_lods.clear();h.streaming.clear();h.scene=scene->name();}
 h.partition.synchronize(*scene,*assets);return scene;
}
void visible_frame(PerformanceHandle& h,const char* name,const double* values,std::uint32_t profile){
 if(!name||!values||profile>2)throw std::invalid_argument("Invalid frame input");
 for(int i=0;i<13;++i)if(!std::isfinite(values[i]))throw std::invalid_argument("Non-finite camera");
 prepare_scene(h,name);auto* assets=veldren::asset_registry_for_performance(h.assets);
 veldren::WorldCamera camera;camera.eye={values[0],values[1],values[2]};camera.center={values[3],values[4],values[5]};
 camera.near_plane=values[6];camera.far_plane=values[7];camera.left=values[8];camera.right=values[9];camera.bottom=values[10];camera.top=values[11];camera.viewport_height=values[12];
 const char* profiles[]={"browser","browser-mobile","native-desktop"};
 auto visible=veldren::WorldVisibility{}.evaluate(h.partition,camera,veldren::world_visibility_profile(profiles[profile]));
 h.canonical_lods.begin_frame(*assets);auto& frame=h.frame;frame.ids.clear();frame.lights.clear();frame.draws.clear();
 for(const auto& id:visible.ids){
  const auto symbol=frame.intern(id);frame.ids.push_back(symbol);const auto* record=h.partition.record(id);
  if(record->light)frame.lights.push_back(symbol);
  if(record->render_path!="canonical")continue;
  if(!record->renderable)continue;
  const auto& matrix=record->render_transform.v;
  const double distance=std::hypot(matrix[12]-camera.eye.x,matrix[13]-camera.eye.y,matrix[14]-camera.eye.z);
  const auto lod=h.canonical_lods.select(*assets,id,record->asset,distance);
  PackedDraw draw{};draw.id=symbol;draw.asset=frame.intern(lod.find("asset")->string_or());draw.material=frame.intern(record->material);
  draw.flags=(record->cast_shadows?1u:0u)|(record->receive_shadows?2u:0u);
  for(int i=0;i<16;++i)draw.matrix[i]=static_cast<float>(matrix[i]);
  draw.distance=static_cast<float>(distance);frame.draws.push_back(draw);
 }
 constexpr std::size_t header_size=132;const auto ids_offset=header_size,draws_offset=ids_offset+frame.ids.size()*4,lights_offset=draws_offset+frame.draws.size()*sizeof(PackedDraw),size=lights_offset+frame.lights.size()*4;
 if(size>64*1024*1024)throw std::length_error("Frame transfer exceeds limit");
 frame.bytes.resize(size);
 std::uint32_t header[33]{};header[0]=0x5646524d;header[1]=1;header[2]=size;header[3]=frame.strings_revision;header[4]=frame.ids.size();header[5]=frame.draws.size();header[6]=frame.lights.size();header[7]=ids_offset;header[8]=draws_offset;header[9]=lights_offset;
 const auto& stats=h.partition.statistics();header[10]=stats.records;header[11]=stats.cells;header[12]=stats.static_records;header[13]=stats.dynamic_records;header[14]=stats.large_records;header[15]=stats.updated;header[16]=stats.rebuilds;header[17]=stats.queried_cells;header[32]=stats.considered;
 header[18]=visible.considered;header[19]=visible.ids.size();header[20]=visible.considered_renderables;header[21]=visible.visible_renderables;header[22]=visible.frustum_culled;header[23]=visible.distance_culled;header[24]=visible.projected_culled;header[25]=visible.lights;
 const auto lod=h.canonical_lods.diagnostics();const char* keys[]={"lod0","lod1","lod2","missingLods","transitions","tracked"};for(int i=0;i<6;++i)header[26+i]=lod.find(keys[i])->number_or();
 std::memcpy(frame.bytes.data(),header,sizeof(header));
 if(!frame.ids.empty())std::memcpy(frame.bytes.data()+ids_offset,frame.ids.data(),frame.ids.size()*4);
 if(!frame.draws.empty())std::memcpy(frame.bytes.data()+draws_offset,frame.draws.data(),frame.draws.size()*sizeof(PackedDraw));
 if(!frame.lights.empty())std::memcpy(frame.bytes.data()+lights_offset,frame.lights.data(),frame.lights.size()*4);
 frame.visible_ids=std::move(visible.ids);frame.visible_scene=name;
}
Json command(PerformanceHandle& h,const Json& request){
 const auto* op=request.find("op"),*name=request.find("scene");if(!op||!name)throw std::invalid_argument("Performance operation and Scene required");
 if(op->string_or()=="residency"){
  const auto* rows=request.find("resources"),*profile=request.find("profile"),*gpu=request.find("reservedGpu"),*cpu=request.find("reservedCpu");
  if(!rows)throw std::invalid_argument("Resource inventory required");
  return h.residency.reconcile(*rows,veldren::world_residency_profile(profile?profile->string_or():"browser"),gpu?gpu->number_or(-1):0,cpu?cpu->number_or(-1):0);
 }
 auto* assets=veldren::asset_registry_for_performance(h.assets);auto* scene=prepare_scene(h,name->string_or().c_str());const auto action=op->string_or();
 if(action=="sync")return h.partition.diagnostics();
 if(action=="streaming")return h.streaming.plan(*scene,h.partition,*assets,request);
 if(action=="query"){auto ids=h.partition.query({vector(request.find("min")),vector(request.find("max"))});return Json::Object{{"ids",strings(ids)},{"stats",h.partition.diagnostics()}};}
 if(action=="visible"){
  const auto* value=request.find("camera");if(!value)throw std::invalid_argument("Visibility camera required");
  const auto scalar=[&](const char* key){const auto* v=value->find(key);return v?v->number_or(NAN):NAN;};
  veldren::WorldCamera camera;camera.eye=vector(value->find("eye"));camera.center=vector(value->find("center"));camera.near_plane=scalar("near");camera.far_plane=scalar("far");camera.left=scalar("left");camera.right=scalar("right");camera.bottom=scalar("bottom");camera.top=scalar("top");camera.viewport_height=scalar("height");
  const auto* profile=request.find("profile");const std::string profile_name=profile?profile->string_or():"browser";const auto& policies=veldren::world_visibility_profile(profile_name);
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
std::uint32_t veldren_performance_create(void* world,std::uint32_t assets){if(!world||!veldren::asset_registry_for_performance(assets)||!next_handle)return 0;const auto id=next_handle++;PerformanceHandle handle;handle.world=world;handle.assets=assets;handles.emplace(id,std::move(handle));return id;}
void veldren_performance_destroy(std::uint32_t handle){handles.erase(handle);}
int veldren_performance_command(std::uint32_t handle,const char* request){auto it=handles.find(handle);if(it==handles.end()||!request)return 0;try{it->second.response=veldren::write_json(Json::Object{{"ok",true},{"value",command(it->second,veldren::parse_json(request))}});return 1;}catch(const std::exception& e){it->second.response=veldren::write_json(Json::Object{{"ok",false},{"error",e.what()}});return 0;}}
std::uint32_t veldren_performance_response(std::uint32_t handle,char* out,std::uint32_t capacity){const auto it=handles.find(handle);if(it==handles.end())return 0;const auto& text=it->second.response;if(out&&capacity>text.size()){std::memcpy(out,text.data(),text.size());out[text.size()]=0;}return static_cast<std::uint32_t>(text.size());}
int veldren_performance_visible_frame(std::uint32_t handle,const char* scene,const double* camera,std::uint32_t profile){auto it=handles.find(handle);if(it==handles.end())return 0;try{visible_frame(it->second,scene,camera,profile);return 1;}catch(const std::exception& e){it->second.frame.bytes.clear();it->second.response=veldren::write_json(Json::Object{{"ok",false},{"error",e.what()}});return 0;}}
const std::uint8_t* veldren_performance_frame_data(std::uint32_t handle){const auto it=handles.find(handle);return it==handles.end()||it->second.frame.bytes.empty()?nullptr:it->second.frame.bytes.data();}
std::uint32_t veldren_performance_frame_size(std::uint32_t handle){const auto it=handles.find(handle);return it==handles.end()?0:it->second.frame.bytes.size();}
std::uint32_t veldren_performance_frame_strings(std::uint32_t handle,char* out,std::uint32_t capacity){const auto it=handles.find(handle);if(it==handles.end())return 0;auto& frame=it->second.frame;if(frame.strings_json.empty()||frame.serialized_revision!=frame.strings_revision){frame.strings_json=veldren::write_json(frame.strings);frame.serialized_revision=frame.strings_revision;}const auto& text=frame.strings_json;if(out&&capacity>text.size()){std::memcpy(out,text.data(),text.size());out[text.size()]=0;}return text.size();}
std::uint32_t veldren_performance_intern(std::uint32_t handle,const char* value){const auto it=handles.find(handle);if(it==handles.end()||!value||std::strlen(value)>4096||it->second.frame.strings.size()>=1000000)return 0;return it->second.frame.intern(value)+1;}
int veldren_performance_lod_frame(std::uint32_t handle,const char* name,const std::uint32_t* pairs,const double* distances,std::uint32_t count){
 auto it=handles.find(handle);if(it==handles.end())return 0;auto& h=it->second;auto& frame=h.frame;
 try{
  if(!name||count>100000||(count&&(!pairs||!distances)))throw std::invalid_argument("Invalid packed LOD batch");
  prepare_scene(h,name);auto* assets=veldren::asset_registry_for_performance(h.assets);
  for(std::uint32_t i=0;i<count;++i)if(pairs[i*2]>=frame.strings.size()||pairs[i*2+1]>=frame.strings.size()||!std::isfinite(distances[i])||distances[i]<0)throw std::invalid_argument("Invalid LOD symbol or distance");
  h.compatibility_lods.begin_frame(*assets);frame.lod_words.resize(12+count*4);
  for(std::uint32_t i=0;i<count;++i){
   const auto selected=h.compatibility_lods.select(*assets,frame.strings[pairs[i*2]].string_or(),frame.strings[pairs[i*2+1]].string_or(),distances[i]);
   const auto offset=12+i*4;frame.lod_words[offset]=frame.intern(selected.find("asset")->string_or());frame.lod_words[offset+1]=selected.find("level")->number_or();frame.lod_words[offset+2]=selected.find("targetLevel")->number_or();const float threshold=selected.find("threshold")->number_or();std::memcpy(&frame.lod_words[offset+3],&threshold,sizeof(threshold));
  }
  frame.lod_words[0]=0x564c4f44;frame.lod_words[1]=1;frame.lod_words[2]=frame.lod_words.size()*4;frame.lod_words[3]=frame.strings_revision;frame.lod_words[4]=count;frame.lod_words[11]=16;
  const auto lod=h.compatibility_lods.diagnostics();const char* keys[]={"lod0","lod1","lod2","missingLods","transitions","tracked"};for(int i=0;i<6;++i)frame.lod_words[5+i]=lod.find(keys[i])->number_or();return 1;
 }catch(const std::exception& e){frame.lod_words.clear();h.response=veldren::write_json(Json::Object{{"ok",false},{"error",e.what()}});return 0;}
}
const std::uint8_t* veldren_performance_lod_data(std::uint32_t handle){const auto it=handles.find(handle);return it==handles.end()||it->second.frame.lod_words.empty()?nullptr:reinterpret_cast<const std::uint8_t*>(it->second.frame.lod_words.data());}
std::uint32_t veldren_performance_lod_size(std::uint32_t handle){const auto it=handles.find(handle);return it==handles.end()?0:it->second.frame.lod_words.size()*4;}
const std::uint32_t* veldren_performance_page_payloads(std::uint32_t handle,const char* name,double x,double z,double radius,std::uint32_t budget){
 auto it=handles.find(handle);if(it==handles.end()||!name)return nullptr;auto& h=it->second;
 try{auto* scene=veldren::world_scene_for_performance(h.world,name);if(!scene)throw std::invalid_argument("Payload Scene owner unavailable");
  const std::vector<veldren::EntityId> empty;const auto stats=scene->page_payloads({x,0,z},radius,h.frame.visible_scene==name?h.frame.visible_ids:empty,budget);
  h.frame.paging={static_cast<std::uint32_t>(stats.paged),static_cast<std::uint32_t>(stats.bytes),static_cast<std::uint32_t>(stats.compacted),static_cast<std::uint32_t>(stats.restored),static_cast<std::uint32_t>(stats.scanned)};return h.frame.paging.data();
 }catch(const std::exception& error){h.response=veldren::write_json(Json::Object{{"ok",false},{"error",error.what()}});return nullptr;}
}
}
