#include "veldren/world_visibility.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>
namespace veldren {
namespace {
Vec3 add(Vec3 a,Vec3 b){return {a.x+b.x,a.y+b.y,a.z+b.z};}
Vec3 mul(Vec3 a,double b){return {a.x*b,a.y*b,a.z*b};}
Vec3 sub(Vec3 a,Vec3 b){return add(a,mul(b,-1));}
double dot(Vec3 a,Vec3 b){return a.x*b.x+a.y*b.y+a.z*b.z;}
Vec3 cross(Vec3 a,Vec3 b){return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};}
Vec3 unit(Vec3 v){const auto length=std::sqrt(dot(v,v));if(!std::isfinite(length)||length<1e-10)throw std::invalid_argument("Degenerate visibility camera");return mul(v,1/length);}
struct Basis{Vec3 forward,right,up;};
Basis basis(const WorldCamera& c){
 for(double n:{c.near_plane,c.far_plane,c.left,c.right,c.bottom,c.top,c.viewport_height,c.eye.x,c.eye.y,c.eye.z})if(!std::isfinite(n))throw std::invalid_argument("Nonfinite visibility camera");
 if(c.near_plane<=0||c.far_plane<=c.near_plane||c.right<=c.left||c.top<=c.bottom||c.viewport_height<=0)throw std::invalid_argument("Invalid visibility projection");
 const auto f=unit(sub(c.center,c.eye)),r=unit(cross(f,c.up));return {f,r,cross(r,f)};
}
struct Plane{Vec3 n;double d;};
std::array<Plane,6> planes(const WorldCamera& c,const Basis& b){
 const auto left=sub(b.right,mul(b.forward,c.left/c.near_plane)),right=sub(mul(b.forward,c.right/c.near_plane),b.right),bottom=sub(b.up,mul(b.forward,c.bottom/c.near_plane)),top=sub(mul(b.forward,c.top/c.near_plane),b.up);
 return {{{b.forward,-dot(b.forward,c.eye)-c.near_plane},{mul(b.forward,-1),dot(b.forward,c.eye)+c.far_plane},{left,-dot(left,c.eye)},{right,-dot(right,c.eye)},{bottom,-dot(bottom,c.eye)},{top,-dot(top,c.eye)}}};
}
bool inside(const WorldBounds& b,const std::array<Plane,6>& planes){for(const auto& p:planes){const Vec3 support{p.n.x>=0?b.max.x:b.min.x,p.n.y>=0?b.max.y:b.min.y,p.n.z>=0?b.max.z:b.min.z};if(dot(p.n,support)+p.d < -1e-7)return false;}return true;}
WorldBounds bounds(const WorldCamera& c,const Basis& b){
 WorldBounds result{{INFINITY,INFINITY,INFINITY},{-INFINITY,-INFINITY,-INFINITY}};
 for(double depth:{c.near_plane,c.far_plane}){for(double x:{c.left,c.right}){for(double y:{c.bottom,c.top}){
  const auto p=add(c.eye,add(mul(b.forward,depth),add(mul(b.right,x*depth/c.near_plane),mul(b.up,y*depth/c.near_plane))));
  result.min={std::min(result.min.x,p.x),std::min(result.min.y,p.y),std::min(result.min.z,p.z)};result.max={std::max(result.max.x,p.x),std::max(result.max.y,p.y),std::max(result.max.z,p.z)};
 }}}
 return result;
}
double distance(Vec3 p,const WorldBounds& b){const auto axis=[](double p,double lo,double hi){return std::max({lo-p,0.0,p-hi});};return std::hypot(axis(p.x,b.min.x,b.max.x),axis(p.y,b.min.y,b.max.y),axis(p.z,b.min.z,b.max.z));}
}
const std::map<std::string,VisibilityPolicy>& world_visibility_profile(const std::string& profile){
 // Large authored silhouettes retain full range. Projected thresholds govern
 // subpixel detail; mobile keeps the same category ranges and asset quality
 // remains exclusively owned by the Phase 2 texture/material profiles.
 static const std::map<std::string,VisibilityPolicy> browser{{"structure",{320,0}},{"terrain",{320,0}},{"tree",{280,.5}},{"scenery",{240,1}},{"prop",{280,.5}},{"actor",{240,0}},{"light",{320,0}}};
 static const std::map<std::string,VisibilityPolicy> mobile{{"structure",{320,0}},{"terrain",{320,0}},{"tree",{280,1}},{"scenery",{240,1.25}},{"prop",{280,1}},{"actor",{240,0}},{"light",{320,0}}};
 static const std::map<std::string,VisibilityPolicy> desktop{{"structure",{4096,0}},{"terrain",{4096,0}},{"tree",{1000,.25}},{"scenery",{600,.5}},{"prop",{800,.25}},{"actor",{600,0}},{"light",{1000,0}}};
 if(profile=="browser")return browser;
 if(profile=="browser-mobile")return mobile;
 if(profile=="desktop"||profile=="native-desktop")return desktop;
 throw std::invalid_argument("Unknown world visibility profile");
}
bool WorldVisibility::intersects(const WorldBounds& b,const WorldCamera& c){const auto axes=basis(c);return inside(b,planes(c,axes));}
WorldBounds WorldVisibility::camera_bounds(const WorldCamera& c){return bounds(c,basis(c));}
WorldVisibilityResult WorldVisibility::evaluate(WorldPartition& partition,const WorldCamera& camera,const std::map<std::string,VisibilityPolicy>& policies)const{
 const auto axes=basis(camera);const auto clip=planes(camera,axes);const auto candidates=partition.query(bounds(camera,axes));WorldVisibilityResult result;result.considered=candidates.size();
 for(const auto& id:candidates){const auto& record=*partition.record(id);if(record.renderable)++result.considered_renderables;
  if(!inside(record.bounds,clip)){++result.frustum_culled;continue;}
  const auto found=policies.find(record.category);const auto policy=found==policies.end()?VisibilityPolicy{}:found->second;
  if(!std::isfinite(policy.distance)||policy.distance<=0||!std::isfinite(policy.minimum_pixels)||policy.minimum_pixels<0)throw std::invalid_argument("Invalid visibility policy");
  const double nearest=distance(camera.eye,record.bounds);
  if(nearest>policy.distance){++result.distance_culled;continue;}
  const auto center=mul(add(record.bounds.min,record.bounds.max),.5),extent=mul(sub(record.bounds.max,record.bounds.min),.5);const double radius=std::sqrt(dot(extent,extent)),depth=dot(sub(center,camera.eye),axes.forward)-radius;
  const double pixels=depth<=camera.near_plane?INFINITY:2*radius*camera.near_plane*camera.viewport_height/((camera.top-camera.bottom)*depth);
  // Unknown/procedural bounds remain conservative; never size-cull an object
  // whose exact geometry extent is not available from the canonical pipeline.
  if(!record.uncertain_bounds&&pixels<policy.minimum_pixels){++result.projected_culled;continue;}
  result.ids.push_back(id);if(record.renderable)++result.visible_renderables;if(record.light)++result.lights;
 }
 return result;
}
}
