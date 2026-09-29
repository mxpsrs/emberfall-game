#include "veldren/assets.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
using namespace veldren;
template<class F> void rejected(F f){bool bad=false;try{f();}catch(const std::exception&){bad=true;}assert(bad);}
int main(int argc,char** argv){
  assert(argc==2);std::ifstream file(argv[1]);assert(file);std::ostringstream content;content<<file.rdbuf();
  auto manifest=parse_json(content.str());AssetRegistry registry;registry.load(manifest);
  assert(registry.list("model").array().size()>100);
  const std::string wall="rebuilt:Wall_Plaster_Straight";
  assert(registry.record(wall).find("bounds"));
  const auto closure=registry.dependencies(wall,true);assert(closure.size()>=4);
  std::string texture;for(const auto& id:closure)if(registry.record(id).find("type")->string_or()=="texture"){texture=id;break;}assert(!texture.empty());
  for(int i=0;i<100;++i)registry.acquire(wall);
  assert(registry.record(texture).find("users")->number_or()==100);
  registry.set_state(texture,"loaded");
  for(int i=0;i<99;++i)registry.release(wall);
  assert(registry.record(texture).find("loadState")->string_or()=="loaded");
  registry.release(wall);assert(registry.record(texture).find("loadState")->string_or()=="pending release");
  registry.set_state(texture,"unloaded");rejected([&]{registry.release(wall);});
  auto old=registry.document();auto duplicate=manifest;std::get<Json::Array>(std::get<Json::Object>(duplicate.value).at("records").value).push_back(manifest.find("records")->array()[0]);
  rejected([&]{registry.load(duplicate);});assert(registry.document()==old);
  auto broken=manifest;auto& first=std::get<Json::Object>(std::get<Json::Array>(std::get<Json::Object>(broken.value).at("records").value)[0].value);first["dependencies"]=Json::Array{"missing:asset"};
  rejected([&]{registry.load(broken);});assert(registry.document()==old);
  first["dependencies"]=Json::Array{first.at("id")};rejected([&]{registry.load(broken);});
  registry.acquire(wall);const auto affected=registry.invalidate(texture);assert(affected.size()>1);
  assert(registry.record(wall).find("generation")->number_or()==2);
  registry.release(wall);assert(registry.document()==old);
  // Reject malformed/stale profile records atomically, preserving live catalog.
  auto with_variant=manifest;
  auto& definitions=std::get<Json::Array>(std::get<Json::Object>(with_variant.value).at("records").value);
  for(auto& definition:definitions)if(definition.find("variants")&&definition.find("variants")->find("browser")){
    auto& profiles=std::get<Json::Object>(std::get<Json::Object>(definition.value).at("variants").value);
    auto& entries=std::get<Json::Array>(profiles.at("browser").value);
    const auto saved=entries[0];auto& entry=std::get<Json::Object>(entries[0].value);
    entry["width"]=513;rejected([&]{registry.load(with_variant);});assert(registry.document()==old);
    entries[0]=saved;std::get<Json::Object>(entries[0].value)["sourceHash"]=std::string(64,'0');
    rejected([&]{registry.load(with_variant);});assert(registry.document()==old);
    entries[0]=saved;entries.push_back(saved);rejected([&]{registry.load(with_variant);});assert(registry.document()==old);
    break;
  }
  const auto handle=veldren_assets_create();assert(handle);assert(!veldren_assets_command(handle,"{bad"));veldren_assets_destroy(handle);assert(!veldren_assets_response(handle,nullptr,0));
  std::cout<<"PASS: actual Veldren catalog, stable IDs, dependency closure/reverse index, atomic validation, 100 shared leases, release and invalidation.\n";
}
