#include "veldren/assets.h"
#include <cassert>
#include <cmath>
#include <fstream>
#include <iostream>
#include <sstream>
using namespace veldren;
template<class F>void rejected(F f){bool failed=false;try{f();}catch(const std::exception&){failed=true;}assert(failed);}
int main(int argc,char** argv){
  assert(argc==2);std::ifstream file(argv[1]);std::ostringstream text;text<<file.rdbuf();
  const auto manifest=parse_json(text.str());AssetRegistry registry;registry.load(manifest);unsigned count=0;
  for(const auto& record:manifest.find("records")->array())if(record.find("material")){
    for(const auto* profile:{"browser-mobile","browser","desktop"}){
      const auto plan=registry.material_plan(record.find("id")->string_or(),profile);
      assert(plan.find("textures")->array().size()==5);assert(plan.find("key")->string_or().size()==64);++count;
    }
  }
  assert(count==1548);
  const auto a=registry.material_plan("rebuilt:Wall_Plaster_Straight/material/default","browser");
  const auto b=registry.material_plan("rebuilt:Window_Wide_Round1/material/default","browser");
  assert(a.find("key")->string_or()==b.find("key")->string_or());
  rejected([&]{registry.material_plan("rebuilt:Wall_Plaster_Straight","browser");});
  rejected([&]{registry.material_plan("rebuilt:Wall_Plaster_Straight/material/default","unknown");});
  // Exercise UV1, KHR texture transform order, emissive strength and explicit
  // wrap/filter mapping using the real registered texture dependency.
  auto edited=manifest;auto& records=std::get<Json::Array>(std::get<Json::Object>(edited.value).at("records").value);
  for(auto& record:records)if(record.find("id")->string_or()=="rebuilt:Wall_Plaster_Straight/material/0"){
    auto& material=std::get<Json::Object>(std::get<Json::Object>(record.value).at("material").value);
    auto& binding=std::get<Json::Object>(material.at("baseColorTexture").value);
    binding["texCoord"]=1;binding["transform"]=Json::Object{{"offset",Json::Array{.25,.75}},{"scale",Json::Array{2,3}},{"rotation",std::acos(-1)/2}};
    binding["sampler"]=Json::Object{{"minFilter",9984},{"magFilter",9728},{"wrapS",33648},{"wrapT",33071}};
    material["emissiveFactor"]=Json::Array{.1,.2,.3};material["emissiveStrength"]=4;
    registry.load(edited);const auto plan=registry.material_plan(record.find("id")->string_or(),"browser");
    const auto& uv=plan.find("mat3")->find("albedoUv")->array();
    assert(std::abs(uv[0].number_or())<1e-10&&uv[1].number_or()==2&&uv[3].number_or()==-3);
    assert(uv[6].number_or()==.25&&uv[7].number_or()==.75);
    assert(plan.find("float4")->find("uvChannels")->array()[0].number_or()==1);
    assert(plan.find("float3")->find("emissiveFactor")->array()[2].number_or()==1.2);
    const auto* sampler=plan.find("textures")->array()[0].find("sampler");
    assert(sampler->find("min")->string_or()=="NEAREST_MIPMAP_NEAREST"&&sampler->find("wrapT")->string_or()=="CLAMP_TO_EDGE");
    binding["texCoord"]=8;registry.load(edited);rejected([&]{registry.material_plan(record.find("id")->string_or(),"browser");});
    break;
  }
  std::cout<<"PASS: 1548 native plans, cross-asset content sharing, material type/profile validation, UV channel/transform, emissive and sampler semantics.\n";
}
