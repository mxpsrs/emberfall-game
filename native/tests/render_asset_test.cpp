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
 unsigned models=0,draws=0,geometry=0,skinned=0,animated=0;Json wall;
 for(const auto& file:std::filesystem::directory_iterator(root/"canonical/models")){
  if(file.path().extension()!=".json")continue;
  const auto model=read(file.path());const auto plan=asset_render_plan(registry,model);++models;
  assert(*plan.find("skeletons")==*model.find("skeletons"));assert(*plan.find("animations")==*model.find("animations"));
  animated+=!plan.find("animations")->array().empty();skinned+=!plan.find("skeletons")->array().empty();
  for(const auto& p:plan.find("geometry")->array()){
   ++geometry;assert(asset_unbase64(p.find("vertices")->string_or()).size()==p.find("count")->number_or()*92);
   assert(asset_unbase64(p.find("indices")->string_or()).size()==p.find("indexCount")->number_or()*4);
   assert(p.find("key")->string_or().size()==64);
  }
  draws+=unsigned(plan.find("draws")->array().size());if(model.find("id")->string_or()=="rebuilt:Wall_Plaster_Straight")wall=model;
 }
 assert(models==190&&skinned>=2&&animated>=1&&draws>180&&geometry>300);
 const auto first=asset_render_plan(registry,wall),second=asset_render_plan(registry,wall);assert(first==second);
 const auto rejected=[&](Json model){bool caught=false;try{asset_render_plan(registry,model);}catch(const std::exception&){caught=true;}assert(caught);};
 auto bad=wall.object();bad["sourceHash"]=std::string(64,'0');rejected(bad);
 bad=wall.object();auto meshes=bad["meshes"].array();auto mesh=meshes[0].object();auto primitives=mesh["primitives"].array();auto primitive=primitives[0].object();auto indices=primitive["indices"].object();auto bytes=asset_unbase64(indices["data"].string_or());for(int k=0;k<4;++k)bytes[k]=255;indices["data"]=asset_base64(bytes);primitive["indices"]=indices;primitives[0]=primitive;mesh["primitives"]=primitives;meshes[0]=mesh;bad["meshes"]=meshes;rejected(bad);
 registry.invalidate("rebuilt:Wall_Plaster_Straight");assert(asset_render_plan(registry,wall).find("generation")->number_or()==2);
 std::cout<<"PASS: "<<models<<" real models, "<<geometry<<" geometry packets, "<<draws<<" draw bindings, "<<skinned<<" skeletons, "<<animated<<" animated assets; deterministic plans, invalid input rejection and generation changes.\n";
}
