#include "veldren/asset_render.h"
#include "veldren/asset_import.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <functional>
#include <limits>
#include <stdexcept>

namespace veldren {
namespace {
[[noreturn]] void fail(const std::string& message) { throw std::invalid_argument("Render asset: " + message); }
const Json& field(const Json& j,std::string_view key) { const auto* p=j.find(key);if(!p)fail("missing "+std::string(key));return *p; }
std::string text(const Json& j,const std::string& key) { return field(j,key).string_or(); }
unsigned integer(const Json& j,unsigned max) { const double n=j.number_or(-1);if(n<0||n>max||n!=std::floor(n))fail("invalid integer");return unsigned(n); }
std::uint32_t bits(const AssetBytes& bytes,std::size_t at) {return std::uint32_t(bytes[at])|(std::uint32_t(bytes[at+1])<<8)|(std::uint32_t(bytes[at+2])<<16)|(std::uint32_t(bytes[at+3])<<24);}
std::vector<float> stream(const Json& j,unsigned width,unsigned count) {
 if(text(j,"encoding")!="float32-le"||integer(field(j,"components"),16)!=width||integer(field(j,"count"),16000000)!=count)fail("invalid stream shape");
 const auto bytes=asset_unbase64(text(j,"data"));if(bytes.size()!=std::size_t(count)*width*4)fail("invalid stream length");
 std::vector<float> out(count*width);for(std::size_t i=0;i<out.size();++i){auto b=bits(bytes,i*4);std::memcpy(&out[i],&b,4);if(!std::isfinite(out[i]))fail("nonfinite vertex");}return out;
}
std::string encode(const std::vector<float>& values) {
 AssetBytes bytes;bytes.reserve(values.size()*4);for(float f:values){std::uint32_t b;std::memcpy(&b,&f,4);for(int j=0;j<4;++j)bytes.push_back(std::uint8_t(b>>(j*8)));}return asset_base64(bytes);
}
using V=std::array<double,3>;
V sub(V a,V b){return {a[0]-b[0],a[1]-b[1],a[2]-b[2]};}
V cross(V a,V b){return {a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};}
double dot(V a,V b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
V unit(V a){double n=std::sqrt(dot(a,a));if(n<1e-20)fail("degenerate direction");for(auto& v:a)v/=n;return a;}
V vertex(const std::vector<float>& a,unsigned n){return {a[n*3],a[n*3+1],a[n*3+2]};}
Json vector(V a){return Json::Array{a[0],a[1],a[2]};}
Json matrix(const Json& j){if(j.array().size()!=16)fail("invalid node matrix");for(const auto& v:j.array())if(!std::isfinite(v.number_or(NAN)))fail("nonfinite matrix");return j;}
}

Json asset_render_plan(const AssetRegistry& registry,const Json& model) {
 const auto id=text(model,"id");const auto definition=registry.record(id);
 if(text(model,"format")!="veldren.model"||field(model,"version").number_or()!=1||text(model,"sourceHash")!=text(definition,"sourceHash"))fail("stale model identity");
 const auto generation=field(definition,"generation");
 Json::Array geometry,draws;std::map<std::string,unsigned> joint_limits;std::map<std::string,Json::Array> mesh_draws;std::map<std::string,const Json*> nodes,materials;
 for(const auto& m:field(model,"materials").array())materials.emplace(text(m,"id"),&m);
 for(const auto& mesh:field(model,"meshes").array()) {
  Json::Array primitives;
  for(const auto& p:field(mesh,"primitives").array()) {
   const auto primitive_id=text(p,"id"),material_id=text(p,"material");
   const auto registered=registry.record(primitive_id);
   if(text(registered,"sourceHash")!=text(model,"sourceHash"))fail("stale mesh record");
   if(!materials.contains(material_id))fail("missing material");
   const auto& material=*materials.at(material_id);const auto& attrs=field(p,"attributes");
   const auto count=integer(field(field(attrs,"POSITION"),"count"),16000000);if(!count)fail("empty geometry");
   const auto positions=stream(field(attrs,"POSITION"),3,count);auto normals=stream(field(attrs,"NORMAL"),3,count);
   const auto& index=field(p,"indices");const auto index_count=integer(field(index,"count"),48000000);
   auto indices=asset_unbase64(text(index,"data"));if(text(index,"encoding")!="uint32-le"||!index_count||index_count%3||indices.size()!=std::size_t(index_count)*4)fail("invalid triangle indices");
   std::vector<unsigned> topology;for(unsigned i=0;i<index_count;++i){auto v=bits(indices,i*4);if(v>=count)fail("index outside vertices");topology.push_back(v);}
   std::vector<std::vector<float>> uv(8,std::vector<float>(count*2));
   for(unsigned channel=0;channel<8;++channel)if(const auto* source=attrs.find("TEXCOORD_"+std::to_string(channel)))uv[channel]=stream(*source,2,count);
   std::vector<float> colors(count*4,1);
   if(const auto* source=attrs.find("COLOR_0")){const auto width=integer(field(*source,"components"),4);if(width!=3&&width!=4)fail("invalid color width");const auto raw=stream(*source,width,count);for(unsigned i=0;i<count;++i)for(unsigned k=0;k<width;++k)colors[i*4+k]=raw[i*width+k];}
   std::vector<float> tangents;const auto* normal_map=material.find("normalTexture");
   const bool mapped=normal_map&&!std::holds_alternative<std::nullptr_t>(normal_map->value);
   unsigned normal_channel=mapped?integer(field(*normal_map,"texCoord"),7):0;
   if(mapped&&!attrs.find("TEXCOORD_"+std::to_string(normal_channel)))fail("normal map UV missing");
   // Imported tangents use UV0. A different normal-map UV or rotated/scaled
   // mapping needs a newly derived basis, preserving the actual material UVs.
   const auto* supplied=attrs.find("TANGENT");bool remap=normal_channel!=0;
   if(mapped){const auto& transform=field(*normal_map,"transform");remap=remap||field(transform,"rotation").number_or()!=0||field(transform,"scale")!=Json(Json::Array{1,1});}
   if(supplied&&!remap)tangents=stream(*supplied,4,count);
   else {
    std::vector<V> accumulated(count),bitangents(count);auto coords=uv[normal_channel];
    if(mapped){const auto& t=field(*normal_map,"transform");const auto a=field(t,"rotation").number_or();const auto sx=field(t,"scale").array()[0].number_or(),sy=field(t,"scale").array()[1].number_or();for(unsigned i=0;i<count;++i){const auto u=coords[i*2]*sx,v=coords[i*2+1]*sy;coords[i*2]=float(std::cos(a)*u-std::sin(a)*v);coords[i*2+1]=float(std::sin(a)*u+std::cos(a)*v);}}
    for(unsigned i=0;i<index_count;i+=3){const auto a=topology[i],b=topology[i+1],c=topology[i+2];const auto e1=sub(vertex(positions,b),vertex(positions,a)),e2=sub(vertex(positions,c),vertex(positions,a));const double u1=coords[b*2]-coords[a*2],v1=coords[b*2+1]-coords[a*2+1],u2=coords[c*2]-coords[a*2],v2=coords[c*2+1]-coords[a*2+1],d=u1*v2-u2*v1;if(std::abs(d)<1e-20)continue;for(auto n:{a,b,c})for(unsigned k=0;k<3;++k){accumulated[n][k]+=(e1[k]*v2-e2[k]*v1)/d;bitangents[n][k]+=(e2[k]*u1-e1[k]*u2)/d;}}
    tangents.resize(count*4);
    for(unsigned i=0;i<count;++i){const auto n=unit(vertex(normals,i));auto t=accumulated[i];const auto projection=dot(n,t);for(unsigned k=0;k<3;++k)t[k]-=n[k]*projection;if(dot(t,t)<1e-20)t=cross(std::abs(n[1])<.9?V{0,1,0}:V{1,0,0},n);t=unit(t);for(unsigned k=0;k<3;++k)tangents[i*4+k]=float(t[k]);tangents[i*4+3]=dot(cross(n,t),bitangents[i])<0?-1:1;}
   }
   V lo{INFINITY,INFINITY,INFINITY},hi{-INFINITY,-INFINITY,-INFINITY};std::vector<float> vertices(count*23);
   for(unsigned i=0;i<count;++i){const auto n=unit(vertex(normals,i));V t{tangents[i*4],tangents[i*4+1],tangents[i*4+2]};const auto proj=dot(n,t);for(unsigned k=0;k<3;++k)t[k]-=n[k]*proj;t=unit(t);if(std::abs(std::abs(tangents[i*4+3])-1)>1e-4)fail("invalid tangent handedness");for(unsigned k=0;k<3;++k){normals[i*3+k]=float(n[k]);tangents[i*4+k]=float(t[k]);const auto v=positions[i*3+k];vertices[i*23+k]=v;lo[k]=std::min(lo[k],double(v));hi[k]=std::max(hi[k],double(v));}for(unsigned k=0;k<4;++k)vertices[i*23+3+k]=colors[i*4+k];for(unsigned channel=0;channel<8;++channel)for(unsigned k=0;k<2;++k)vertices[i*23+7+channel*2+k]=uv[channel][i*2+k];}
   Json::Object packet{{"count",int(count)},{"indexCount",int(index_count)},{"vertices",encode(vertices)},{"normals",encode(normals)},{"tangents",encode(tangents)},{"indices",text(index,"data")},{"stride",92},{"bounds",Json::Object{{"center",vector({(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2})},{"halfExtent",vector({std::max(1e-5,(hi[0]-lo[0])/2),std::max(1e-5,(hi[1]-lo[1])/2),std::max(1e-5,(hi[2]-lo[2])/2)})}}}};
   unsigned joint_limit=0;
   if(const auto* j=attrs.find("JOINTS_0")){
    const auto joints=stream(*j,4,count);auto weights=stream(field(attrs,"WEIGHTS_0"),4,count);
    for(float v:joints){if(v<0||v!=std::floor(v)||v>65535)fail("invalid bone index");joint_limit=std::max(joint_limit,unsigned(v)+1);}
    for(unsigned i=0;i<count;++i){double sum=0;for(unsigned k=0;k<4;++k){const auto w=weights[i*4+k];if(w<0)fail("negative bone weight");sum+=w;}if(sum<1e-8||std::abs(sum-1)>.01)fail("invalid bone weight sum");for(unsigned k=0;k<4;++k)weights[i*4+k]=float(weights[i*4+k]/sum);}
    packet["joints"]=encode(joints);packet["weights"]=encode(weights);
   }
   const auto bytes=write_json(packet);const auto key=asset_sha256(std::span(reinterpret_cast<const std::uint8_t*>(bytes.data()),bytes.size()));
   if(joint_limit)joint_limits[key]=joint_limit;
   packet["key"]=key;packet["id"]=primitive_id;geometry.emplace_back(packet);
   primitives.emplace_back(Json::Object{{"geometry",key},{"material",material_id},{"primitive",primitive_id},{"instancingEligible",!attrs.find("JOINTS_0")&&field(p,"morphTargets").array().empty()}});
  }
  if(!mesh_draws.emplace(text(mesh,"id"),primitives).second)fail("duplicate mesh");
 }
 for(const auto& node:field(model,"nodes").array())if(!nodes.emplace(text(node,"id"),&node).second)fail("duplicate node");
 std::set<std::string> seen;
 std::function<void(const std::string&,unsigned)> visit=[&](const std::string& key,unsigned depth){
  if(depth>512||!seen.insert(key).second||!nodes.contains(key))fail("invalid scene hierarchy");
  const auto& node=*nodes.at(key);
  if(const auto* mesh=node.find("mesh")){const auto found=mesh_draws.find(mesh->string_or());if(found==mesh_draws.end())fail("unknown mesh");for(const auto& primitive:found->second){auto draw=primitive.object();draw["node"]=key;draw["matrix"]=matrix(field(node,"worldMatrix"));if(const auto* skin=node.find("skin")){
     draw["skin"]=*skin;const Json* skeleton=nullptr;
     for(const auto& candidate:field(model,"skeletons").array())if(text(candidate,"id")==skin->string_or())skeleton=&candidate;
     if(!skeleton)fail("missing skeleton");
     const auto& joints=field(*skeleton,"joints").array();
     if(joints.empty()||joints.size()>256)fail("skin exceeds the render profile bone limit");
     const auto limit=joint_limits.find(text(primitive,"geometry"));if(limit==joint_limits.end()||limit->second>joints.size())fail("skin vertex references an absent bone");
     const auto inverse=stream(field(*skeleton,"inverseBindMatrices"),16,unsigned(joints.size()));
     Mat4 mesh_world;for(unsigned k=0;k<16;++k)mesh_world.v[k]=field(node,"worldMatrix").array()[k].number_or();
     const auto inverse_mesh=inverse_affine(mesh_world);std::vector<float> bones;
     for(unsigned j=0;j<joints.size();++j){
      const auto joint=nodes.find(joints[j].string_or());if(joint==nodes.end())fail("missing joint node");
      Mat4 world,bind;const auto& source=field(*joint->second,"worldMatrix");matrix(source);
      for(unsigned k=0;k<16;++k){world.v[k]=source.array()[k].number_or();bind.v[k]=inverse[j*16+k];}
      const auto pose=multiply(multiply(inverse_mesh,world),bind);for(double v:pose.v)bones.push_back(float(v));
     }
     draw["boneCount"]=int(joints.size());draw["bones"]=encode(bones);
    }draws.emplace_back(draw);}}
  for(const auto& child:field(node,"children").array())visit(child.string_or(),depth+1);
 };
 const auto& scenes=field(model,"scenes").array();const auto selected=integer(field(model,"defaultScene"),unsigned(scenes.size()));if(selected>=scenes.size())fail("invalid default scene");for(const auto& root:field(scenes[selected],"roots").array())visit(root.string_or(),0);
 return Json::Object{{"id",id},{"generation",generation},{"geometry",geometry},{"draws",draws},{"skeletons",field(model,"skeletons")},{"animations",field(model,"animations")},{"nodes",field(model,"nodes")}};
}
}
