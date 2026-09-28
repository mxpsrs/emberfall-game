#include "veldren/world_visibility.h"
#include <cassert>
#include <iostream>
using namespace veldren;
int main(){
 WorldCamera c;c.eye={0,0,0};c.center={0,0,-1};c.near_plane=1;c.far_plane=100;c.left=-1;c.right=1;c.bottom=-1;c.top=1;
 assert(WorldVisibility::intersects({{-1,-1,-10},{1,1,-8}},c));
 assert(!WorldVisibility::intersects({{-1,-1,8},{1,1,10}},c));
 assert(!WorldVisibility::intersects({{30,-1,-10},{32,1,-8}},c));
 assert(!WorldVisibility::intersects({{-1,-1,-110},{1,1,-108}},c));
 assert(WorldVisibility::intersects({{-100,-100,-100},{100,100,100}},c));
 assert(WorldVisibility::intersects({{9,-1,-10},{30,1,-8}},c));
 c.bottom=-.2;c.top=1.8;assert(!WorldVisibility::intersects({{-1,-8,-10},{1,-7,-8}},c));assert(WorldVisibility::intersects({{-1,10,-10},{1,11,-8}},c));
 const auto bounds=WorldVisibility::camera_bounds(c);assert(bounds.min.x==-100&&bounds.max.y==180&&bounds.max.z==-1);
 c.eye={10,0,0};c.center={11,0,0};assert(WorldVisibility::intersects({{18,-1,-1},{20,1,1}},c));assert(!WorldVisibility::intersects({{-10,-1,-1},{-8,1,1}},c));
 Scene scene("visibility");AssetRegistry assets;WorldPartition partition;
 auto create=[&](const char* id,Vec3 position,double extent){scene.create(id,{},id);Transform t;t.position=position;scene.set_local(id,t);scene.add_component(id,"MeshRenderer",{{"asset","test"},{"renderPath","canonical"}});scene.add_component(id,"Collider",{{"bounds",Json::Array{Json::Array{-extent,-extent,-extent},Json::Array{extent,extent,extent}}}});};
 create("near",{0,0,-5},1);create("far",{0,0,-80},1);create("tiny",{0,0,-20},.00001);create("behind",{0,0,20},1);
 partition.synchronize(scene,assets);c.eye={};c.center={0,0,-1};c.bottom=-1;c.top=1;
 const auto saved=scene.serialize();const auto visible=WorldVisibility{}.evaluate(partition,c,{{"prop",{50,1}}});assert(visible.ids==std::vector<EntityId>{"near"});assert(visible.distance_culled==1&&visible.projected_culled==1);assert(scene.serialize()==saved);
 std::cout<<"PASS: camera planes, asymmetric projection, large intersecting bounds, rotated view, category distance, projected size and read-only Scene.\n";
}
