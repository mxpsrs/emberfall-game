#include "veldren/world_performance.h"
#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace veldren {
namespace {
const Json::Object* component(const EntitySnapshot& n,const char* key){const auto it=n.components.find(key);return it==n.components.end()?nullptr:&it->second;}
const Json* field(const Json::Object* c,const char* key){if(!c)return nullptr;const auto it=c->find(key);return it==c->end()?nullptr:&it->second;}
double number(const Json::Object* c,const char* key,double fallback=0){const auto* v=field(c,key);return v?v->number_or(fallback):fallback;}
std::string text(const Json::Object* c,const char* key){const auto* v=field(c,key);return v?v->string_or():std::string{};}
WorldBounds transform_bounds(const Mat4& matrix,const WorldBounds& b){
 WorldBounds out{{INFINITY,INFINITY,INFINITY},{-INFINITY,-INFINITY,-INFINITY}};
 for(double x:{b.min.x,b.max.x})for(double y:{b.min.y,b.max.y})for(double z:{b.min.z,b.max.z}){
  const auto p=transform_point(matrix,{x,y,z});out.min={std::min(out.min.x,p.x),std::min(out.min.y,p.y),std::min(out.min.z,p.z)};out.max={std::max(out.max.x,p.x),std::max(out.max.y,p.y),std::max(out.max.z,p.z)};
 }
 return out;
}
WorldBounds array_bounds(const Json& b){const auto& a=b.array();if(a.size()!=2||a[0].array().size()!=3||a[1].array().size()!=3)throw std::invalid_argument("Invalid spatial bounds");return {{a[0].array()[0].number_or(),a[0].array()[1].number_or(),a[0].array()[2].number_or()},{a[1].array()[0].number_or(),a[1].array()[1].number_or(),a[1].array()[2].number_or()}};}
int coordinate(double value){if(!std::isfinite(value)||std::abs(value)>10000000)throw std::invalid_argument("World partition coordinate out of range");return static_cast<int>(std::floor(value/WorldPartition::cell_size));}
void validate(const WorldBounds& b){for(auto v:{b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z})if(!std::isfinite(v)||std::abs(v)>10000000)throw std::invalid_argument("Invalid world bounds");if(b.min.x>b.max.x||b.min.y>b.max.y||b.min.z>b.max.z)throw std::invalid_argument("Reversed world bounds");}
}
bool WorldBounds::intersects(const WorldBounds& b)const{return min.x<=b.max.x&&max.x>=b.min.x&&min.y<=b.max.y&&max.y>=b.min.y&&min.z<=b.max.z&&max.z>=b.min.z;}
const WorldSpatialRecord* WorldPartition::record(const EntityId& id)const{const auto it=records_.find(id);return it==records_.end()?nullptr:&it->second;}
void WorldPartition::reset(){cells_.clear();records_.clear();ungrounded_.clear();large_.clear();revision_=asset_revision_=0;initialized_=false;stats_={};}
void WorldPartition::remove(const EntityId& id){
 const auto found=records_.find(id);if(found==records_.end())return;
 for(const auto key:found->second.cells){auto it=cells_.find(key);if(it==cells_.end())continue;it->second.statics.erase(id);it->second.dynamics.erase(id);if(it->second.statics.empty()&&it->second.dynamics.empty())cells_.erase(it);}
 if(found->second.dynamic)--stats_.dynamic_records;else --stats_.static_records;
 large_.erase(id);records_.erase(found);ungrounded_.erase(id);
}
void WorldPartition::insert(WorldSpatialRecord item){
 validate(item.bounds);item.cells.clear();const int x0=coordinate(item.bounds.min.x),x1=coordinate(item.bounds.max.x),z0=coordinate(item.bounds.min.z),z1=coordinate(item.bounds.max.z);
 // Very large roads/structures remain a bounded overflow list; never assign by pivot.
 if(double(x1-x0+1)*double(z1-z0+1)>64)large_.insert(item.id);
 else for(int z=z0;z<=z1;++z)for(int x=x0;x<=x1;++x){WorldCellKey key{x,z};auto& cell=cells_[key];(item.dynamic?cell.dynamics:cell.statics).insert(item.id);item.cells.push_back(key);}
 if(item.dynamic)++stats_.dynamic_records;else ++stats_.static_records;
 records_[item.id]=std::move(item);
}
void WorldPartition::update(Scene& scene,const AssetRegistry& assets,const EntityId& id){
 remove(id);if(!scene.contains(id))return;const auto n=scene.inspect(id);if(!n.active_in_hierarchy)return;
 const auto* mesh=component(n,"MeshRenderer"),*light=component(n,"Light"),*road=component(n,"RoadSegment"),*building=component(n,"BuildingFootprint"),*footprint=component(n,"Footprint"),*collider=component(n,"Collider"),*bridge=component(n,"Bridge"),*quarry=component(n,"Quarry");
 if(!mesh&&!light&&!road&&!building&&!footprint&&!collider&&!bridge&&!quarry)return;
 WorldSpatialRecord item;item.id=id;item.asset=text(mesh,"asset");item.render_path=text(mesh,"renderPath");item.renderable=mesh&&(!field(mesh,"visible")||field(mesh,"visible")->bool_or(true));item.dynamic=component(n,"ActorDefinition")||component(n,"ActorController");item.light=light;
 item.category=building||bridge||quarry?"structure":road?"terrain":item.dynamic?"actor":component(n,"Gatherable")&&(text(component(n,"Gatherable"),"kind")=="tree"||text(component(n,"Gatherable"),"type")=="tree")?"tree":component(n,"GeneratedDecoration")?"scenery":light?"light":"prop";
 WorldBounds local{{-1,0,-1},{1,4,1}};bool known=false;
 if(!item.asset.empty()&&assets.has(item.asset)){
  const auto definition=assets.record(item.asset);if(const auto* b=definition.find("bounds")){local=array_bounds(*b);known=true;}
  // Authored levels may have slightly different extents. Their conservative
  // union avoids disappearing silhouettes during a presentation-only swap.
  if(const auto* lods=definition.find("lods"))for(const auto& lod:lods->array()){const auto id=lod.find("asset")->string_or();if(id==item.asset)continue;const auto level=assets.record(id);if(const auto* b=level.find("bounds")){const auto extent=array_bounds(*b);if(!known){local=extent;known=true;}else{local.min={std::min(local.min.x,extent.min.x),std::min(local.min.y,extent.min.y),std::min(local.min.z,extent.min.z)};local.max={std::max(local.max.x,extent.max.x),std::max(local.max.y,extent.max.y),std::max(local.max.z,extent.max.z)};}}}
 }
 if(building){local={{-2,-2,-2},{number(building,"w",1)+2,std::max(24.0,number(component(n,"BuildingAppearance"),"visualHeight",24))+4,number(building,"h",1)+2}};known=true;}
 else if(bridge){const double width=number(bridge,"width",8),span=number(bridge,"span",32);local={{-width,-8,-span},{width,24,span}};known=true;}
 else if(quarry){const double rx=number(quarry,"rx",32)+4,rz=number(quarry,"ry",32)+4;local={{-rx,-64,-rz},{rx,64,rz}};known=true;}
 else if(road){const auto* end=field(road,"endpoint");if(end&&end->array().size()==3){const double x=end->array()[0].number_or(),z=end->array()[2].number_or(),w=number(road,"width",1);local={{std::min(0.0,x)-w,-2,std::min(0.0,z)-w},{std::max(0.0,x)+w,2,std::max(0.0,z)+w}};known=true;}}
 else if(!known&&field(collider,"bounds")){local=array_bounds(*field(collider,"bounds"));known=true;}
 else if(!known&&footprint&&field(footprint,"w")&&field(footprint,"h")){const double x=number(footprint,"x"),z=number(footprint,"z");local={{x,-4,z},{x+number(footprint,"w"),24,z+number(footprint,"h")}};known=true;}
 if(!known){local={{-16,-32,-16},{16,64,16}};item.uncertain_bounds=true;}
 if(light){const double r=number(light,"radius",12);local.min={std::min(local.min.x,-r),std::min(local.min.y,-r),std::min(local.min.z,-r)};local.max={std::max(local.max.x,r),std::max(local.max.y,r),std::max(local.max.z,r)};}
 item.bounds=transform_bounds(n.world,local);
 if(light){Vec3 offset;const auto* o=field(light,"offset");if(o&&o->array().size()==3)offset={o->array()[0].number_or(),o->array()[1].number_or(),o->array()[2].number_or()};const auto center=transform_point(n.world,offset);const auto& m=n.world.v;const double radius=number(light,"radius",12)*std::max({std::hypot(m[0],m[1],m[2]),std::hypot(m[4],m[5],m[6]),std::hypot(m[8],m[9],m[10])});item.bounds.min={std::min(item.bounds.min.x,center.x-radius),std::min(item.bounds.min.y,center.y-radius),std::min(item.bounds.min.z,center.z-radius)};item.bounds.max={std::max(item.bounds.max.x,center.x+radius),std::max(item.bounds.max.y,center.y+radius),std::max(item.bounds.max.z,center.z+radius)};}
 item.anchor=transform_point(n.world,{});item.terrain_relative=item.render_path!="canonical";
 if(item.terrain_relative){item.bounds.min.x-=1;item.bounds.max.x+=1;item.bounds.min.z-=1;item.bounds.max.z+=1;}
 const auto exact=item.bounds;
 if(item.terrain_relative){item.bounds.min.y-=256;item.bounds.max.y+=512;}
 insert(std::move(item));ungrounded_[id]=exact;
}
void WorldPartition::synchronize(Scene& scene,const AssetRegistry& assets){
 stats_.updated=0;const bool fresh=!scene.spatial_tracking();scene.enable_spatial_tracking();const auto changes=scene.spatial_changes_since(revision_);
 if(!initialized_||fresh||asset_revision_!=assets.revision()||!changes){
  const auto rebuilds=stats_.rebuilds+1;reset();stats_.rebuilds=rebuilds;
  for(const auto& id:scene.traverse()){update(scene,assets,id);++stats_.updated;}initialized_=true;
 }else for(const auto& id:*changes){update(scene,assets,id);++stats_.updated;}
 revision_=scene.spatial_revision();asset_revision_=assets.revision();stats_.records=records_.size();stats_.cells=cells_.size();stats_.large_records=large_.size();
}
std::vector<EntityId> WorldPartition::query(const WorldBounds& bounds){
 validate(bounds);std::set<EntityId> candidates;stats_.queried_cells=stats_.considered=0;
 const int x0=coordinate(bounds.min.x),x1=coordinate(bounds.max.x),z0=coordinate(bounds.min.z),z1=coordinate(bounds.max.z);
 const double range=double(x1-x0+1)*double(z1-z0+1);
 auto add=[&](const Cell& cell){++stats_.queried_cells;candidates.insert(cell.statics.begin(),cell.statics.end());candidates.insert(cell.dynamics.begin(),cell.dynamics.end());};
 if(range>cells_.size()*2+64){for(const auto& [key,cell]:cells_)if(key.x>=x0&&key.x<=x1&&key.z>=z0&&key.z<=z1)add(cell);}
 else for(int z=z0;z<=z1;++z)for(int x=x0;x<=x1;++x){const auto it=cells_.find({x,z});if(it!=cells_.end())add(it->second);}
 candidates.insert(large_.begin(),large_.end());std::vector<EntityId> result;stats_.considered=candidates.size();
 for(const auto& id:candidates)if(records_.at(id).bounds.intersects(bounds))result.push_back(id);
 return result;
}
std::vector<EntityId> WorldPartition::members(WorldCellKey key)const{const auto it=cells_.find(key);if(it==cells_.end())return {};std::vector<EntityId> out(it->second.statics.begin(),it->second.statics.end());out.insert(out.end(),it->second.dynamics.begin(),it->second.dynamics.end());return out;}
void WorldPartition::ground(const EntityId& id,double height){
 if(!std::isfinite(height))throw std::invalid_argument("Finite terrain height required");
 const auto* r=record(id);if(!r||!r->terrain_relative)return;auto next=*r;const auto base=ungrounded_.at(id);next.bounds=base;next.bounds.min.y+=height;next.bounds.max.y+=height;remove(id);insert(std::move(next));ungrounded_[id]=base;
}
void WorldPartition::dynamic_position(const EntityId& id,Vec3 position){
 const auto* r=record(id);if(!r||!r->dynamic)return;
 const Vec3 d{position.x-r->anchor.x,position.y-r->anchor.y,position.z-r->anchor.z};
 if(d.x==0&&d.y==0&&d.z==0)return;
 auto next=*r;next.anchor=position;auto base=ungrounded_.at(id);
 auto translate=[&](WorldBounds& bounds){bounds.min={bounds.min.x+d.x,bounds.min.y+d.y,bounds.min.z+d.z};bounds.max={bounds.max.x+d.x,bounds.max.y+d.y,bounds.max.z+d.z};validate(bounds);};
 translate(next.bounds);translate(base);remove(id);insert(std::move(next));ungrounded_[id]=base;
}
Json WorldPartition::diagnostics()const{return Json::Object{{"records",double(stats_.records)},{"cells",double(cells_.size())},{"staticRecords",double(stats_.static_records)},{"dynamicRecords",double(stats_.dynamic_records)},{"largeRecords",double(large_.size())},{"updated",double(stats_.updated)},{"rebuilds",double(stats_.rebuilds)},{"queriedCells",double(stats_.queried_cells)},{"considered",double(stats_.considered)}};}
}
