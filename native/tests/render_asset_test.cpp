#include "veldren/asset_render.h"
#include "veldren/asset_import.h"
#include <cassert>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>

using namespace veldren;
Json read(const std::filesystem::path& p){std::ifstream f(p);assert(f);return parse_json(std::string(std::istreambuf_iterator<char>(f),{}));}
int main(int argc,char** argv){
 assert(argc==2);const auto root=std::filesystem::path(argv[1]);AssetRegistry registry;registry.load(read(root/"asset-registry.json"));
 unsigned models=0,draws=0,geometry=0,skinned=0,animated=0;Json wall,avatar;
 const auto model_ids=registry.list("model");
 for(const auto& id:model_ids.array()){
  const auto record=registry.record(id.string_or());if(record.find("importSettings")->find("importer")->string_or()!="veldren-gltf-1")continue;
  const auto model=read(root.parent_path()/record.find("derivedPath")->string_or());const auto plan=asset_render_plan(registry,model);++models;
  assert(*plan.find("skeletons")==*model.find("skeletons"));assert(*plan.find("animations")==*model.find("animations"));
  animated+=!plan.find("animations")->array().empty();skinned+=!plan.find("skeletons")->array().empty();
  for(const auto& p:plan.find("geometry")->array()){
   ++geometry;assert(asset_unbase64(p.find("vertices")->string_or()).size()==p.find("count")->number_or()*92);
   assert(asset_unbase64(p.find("indices")->string_or()).size()==p.find("indexCount")->number_or()*4);
   assert(p.find("key")->string_or().size()==64);
  }
  for(const auto& draw:plan.find("draws")->array())if(draw.find("skin")){assert(draw.find("boneCount")->number_or()>0);assert(asset_unbase64(draw.find("bones")->string_or()).size()==draw.find("boneCount")->number_or()*64);}
  if(model.find("id")->string_or()=="avatar:male")avatar=model;
  draws+=unsigned(plan.find("draws")->array().size());if(model.find("id")->string_or()=="rebuilt:Wall_Plaster_Straight")wall=model;
 }
 assert(models==190&&skinned>=2&&animated>=1&&draws>180&&geometry>300);
 const auto first=asset_render_plan(registry,wall),second=asset_render_plan(registry,wall);assert(first==second);
 const auto rejected=[&](Json model){bool caught=false;try{asset_render_plan(registry,model);}catch(const std::exception&){caught=true;}assert(caught);};
 auto bad=wall.object();bad["sourceHash"]=std::string(64,'0');rejected(bad);
 bad=wall.object();auto meshes=bad["meshes"].array();auto mesh=meshes[0].object();auto primitives=mesh["primitives"].array();auto primitive=primitives[0].object();auto indices=primitive["indices"].object();auto bytes=asset_unbase64(indices["data"].string_or());for(int k=0;k<4;++k)bytes[k]=255;indices["data"]=asset_base64(bytes);primitive["indices"]=indices;primitives[0]=primitive;mesh["primitives"]=primitives;meshes[0]=mesh;bad["meshes"]=meshes;rejected(bad);
 for(const auto& semantic:{"JOINTS_0","WEIGHTS_0"}){
  auto invalid=avatar.object();auto list=invalid["meshes"].array();auto m=list[0].object();auto ps=m["primitives"].array();auto p=ps[0].object();auto attributes=p["attributes"].object();auto stream=attributes[semantic].object();auto data=asset_unbase64(stream["data"].string_or());
  const unsigned bits=std::string(semantic)=="JOINTS_0"?0x43800000u:0xbf800000u;for(unsigned k=0;k<4;++k)data[k]=std::uint8_t(bits>>(k*8));stream["data"]=asset_base64(data);attributes[semantic]=stream;p["attributes"]=attributes;ps[0]=p;m["primitives"]=ps;list[0]=m;invalid["meshes"]=list;rejected(invalid);
 }
 registry.invalidate("rebuilt:Wall_Plaster_Straight");assert(asset_render_plan(registry,wall).find("generation")->number_or()==2);
 std::cout<<"PASS: "<<models<<" real models, "<<geometry<<" geometry packets, "<<draws<<" draw bindings, "<<skinned<<" skeletons, "<<animated<<" animated assets; deterministic plans, invalid input rejection and generation changes.\n";
}
