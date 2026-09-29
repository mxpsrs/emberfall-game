#include "veldren/assets.h"
#include "veldren/asset_import.h"
#include "veldren/asset_profile.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace veldren {
namespace {
const Json& field(const Json& value,const char* name) {
  const auto* found=value.find(name);if(!found)throw std::invalid_argument(std::string("Material field missing: ")+name);return *found;
}
double number(const Json& value,double minimum,double maximum) {
  const auto result=value.number_or(NAN);
  if(!std::isfinite(result)||result<minimum||result>maximum)throw std::invalid_argument("Invalid material number");
  return result;
}
Json vector(const Json& value,unsigned count,double minimum,double maximum) {
  if(value.array().size()!=count)throw std::invalid_argument("Invalid material vector");
  for(const auto& v:value.array())number(v,minimum,maximum);
  return value;
}
std::string enumeration(const Json& value,const std::map<int,std::string>& values) {
  const auto n=number(value,0,65536);const auto entry=values.find(int(n));
  if(n!=std::floor(n)||entry==values.end())throw std::invalid_argument("Invalid material sampler");
  return entry->second;
}
Json sampler(const Json* binding,unsigned anisotropy) {
  const auto value=binding?field(*binding,"sampler"):Json::Object{{"minFilter",9987},{"magFilter",9729},{"wrapS",10497},{"wrapT",10497}};
  const std::map<int,std::string> filters{{9728,"NEAREST"},{9729,"LINEAR"},{9984,"NEAREST_MIPMAP_NEAREST"},{9985,"LINEAR_MIPMAP_NEAREST"},{9986,"NEAREST_MIPMAP_LINEAR"},{9987,"LINEAR_MIPMAP_LINEAR"}};
  const std::map<int,std::string> wraps{{10497,"REPEAT"},{33071,"CLAMP_TO_EDGE"},{33648,"MIRRORED_REPEAT"}};
  return Json::Object{{"min",enumeration(field(value,"minFilter"),filters)},
    {"mag",enumeration(field(value,"magFilter"),{{9728,"NEAREST"},{9729,"LINEAR"}})},
    {"wrapS",enumeration(field(value,"wrapS"),wraps)},{"wrapT",enumeration(field(value,"wrapT"),wraps)},{"anisotropy",double(anisotropy)}};
}
Json uv_matrix(const Json* binding) {
  if(!binding)return Json::Array{1,0,0,0,1,0,0,0,1};
  const auto& transform=field(*binding,"transform");
  const auto offset=vector(field(transform,"offset"),2,-1e9,1e9),scale=vector(field(transform,"scale"),2,-1e9,1e9);
  const auto angle=number(field(transform,"rotation"),-1e9,1e9),c=std::cos(angle),s=std::sin(angle);
  const auto x=scale.array()[0].number_or(),y=scale.array()[1].number_or();
  return Json::Array{c*x,s*x,0,-s*y,c*y,0,offset.array()[0],offset.array()[1],1};
}
struct Slot {const char* field;const char* uniform;const char* uv;const char* role;const char* color;};
constexpr Slot slots[]{
  {"baseColorTexture","albedo","albedoUv","baseColor","srgb"},
  {"normalTexture","normalMap","normalUv","normal","linear"},
  {"metallicRoughnessTexture","metalRough","metalUv","metallicRoughness","linear"},
  {"occlusionTexture","occlusion","occlusionUv","occlusion","linear"},
  {"emissiveTexture","emission","emissionUv","emissive","srgb"}};
constexpr auto white="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP4DwQACfsD/Wj6HMwAAAAASUVORK5CYII=";
constexpr auto normal="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNoaPj/HwAGggL/bOBDIwAAAABJRU5ErkJggg==";
}

Json AssetRegistry::material_plan(const std::string& id,const std::string& profile) const {
  const auto policy=asset_profile(profile);const auto& entry=require(id);const auto& definition=entry.definition;
  if(field(definition,"type").string_or()!="material")throw std::invalid_argument("Asset is not a material");
  const auto& material=field(definition,"material");const auto alpha=field(material,"alphaMode").string_or();
  if(alpha!="OPAQUE"&&alpha!="MASK"&&alpha!="BLEND")throw std::invalid_argument("Invalid material alpha mode");
  const auto cutoff=number(field(material,"alphaCutoff"),0,1);
  const auto unlit=field(material,"unlit").bool_or();
  auto alpha_lower=alpha;std::transform(alpha_lower.begin(),alpha_lower.end(),alpha_lower.begin(),[](char c){return char(c-'A'+'a');});
  Json::Object floats{{"metallic",number(field(material,"metallic"),0,1)},
    {"roughness",number(field(material,"roughness"),0,1)},{"normalScale",0},{"occlusionStrength",1},{"transparent",alpha=="BLEND"?1:0}};
  Json::Object matrices;Json::Array textures,channels;
  for(const auto& slot:slots){
    auto* binding=material.find(slot.field);if(binding&&std::holds_alternative<std::nullptr_t>(binding->value))binding=nullptr;
    const double channel=binding?number(field(*binding,"texCoord"),0,7):0;
    if(channel!=std::floor(channel))throw std::invalid_argument("Noninteger material UV channel");
    channels.emplace_back(channel);matrices[slot.uv]=uv_matrix(binding);
    Json::Object texture{{"uniform",slot.uniform},{"sampler",sampler(binding,policy.anisotropy)}};
    const Json::Object usage{{"role",slot.role},{"colorSpace",slot.color},{"alphaCutoff",alpha=="MASK"&&std::string(slot.role)=="baseColor"?cutoff:0}};
    if(binding){
      const auto image=field(*binding,"image").string_or();
      if(!entry.dependencies.contains(image)||field(*binding,"role").string_or()!=slot.role||field(*binding,"colorSpace").string_or()!=slot.color)throw std::invalid_argument("Material texture dependency/usage mismatch");
      const auto variant=texture_variant(image,profile,usage);
      texture["path"]=field(variant,"derivedPath");texture["processing"]=field(variant,"processing");
      if(std::string(slot.role)=="normal")floats["normalScale"]=number(field(*binding,"scale"),-1e6,1e6);
      if(std::string(slot.role)=="occlusion")floats["occlusionStrength"]=number(field(*binding,"strength"),0,1);
    }else{
      const auto encoded=std::string(slot.role)=="normal"?normal:white;const auto bytes=asset_unbase64(encoded);
      auto processing=usage;processing["sourceHash"]=asset_sha256(bytes);processing["maxDimension"]=1;
      texture["encoded"]=encoded;texture["processing"]=processing;
    }
    textures.emplace_back(texture);
  }
  floats["emissionChannel"]=channels.back();channels.pop_back();
  auto emissive=vector(field(material,"emissiveFactor"),3,0,1e9).array();
  const auto strength=number(field(material,"emissiveStrength"),0,1e9);for(auto& v:emissive)v=v.number_or()*strength;
  Json::Object plan{{"shader","materials/veldren-pbr-"+std::string(unlit?"unlit":"lit")+"-"+alpha_lower+".filamat"},
    {"doubleSided",field(material,"doubleSided").bool_or()},{"alphaMode",alpha},{"alphaCutoff",cutoff},
    {"floats",floats},{"float3",Json::Object{{"emissiveFactor",emissive}}},
    {"float4",Json::Object{{"baseFactor",vector(field(material,"baseColorFactor"),4,0,1)},{"uvChannels",channels}}},
    {"mat3",matrices},{"textures",textures}};
  const auto encoded=write_json(plan);plan["key"]=asset_sha256(std::span(reinterpret_cast<const std::uint8_t*>(encoded.data()),encoded.size()));
  plan["asset"]=id;plan["generation"]=double(entry.generation);return plan;
}
}
