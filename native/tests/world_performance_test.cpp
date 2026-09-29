#include "veldren/world_performance.h"
#include "veldren/editor.h"
#include <algorithm>
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>
using namespace veldren;
static std::string read(const char* path){std::ifstream f(path);assert(f.good());return {std::istreambuf_iterator<char>(f),{}};}
static bool has(const std::vector<EntityId>& values,const EntityId& id){return std::find(values.begin(),values.end(),id)!=values.end();}
int main(int argc,char** argv){
 assert(argc>=2);AssetRegistry assets;assets.load(parse_json(read(argv[1])));
 Scene scene("partition");scene.create("Parent",{},"parent");
 for(int i=0;i<1000;++i){auto id=scene.create("Prop",{},"p"+std::to_string(i));Transform t;t.position={double(i*64+16),0,16};scene.set_local(id,t);scene.add_component(id,"MeshRenderer",{{"asset","test:box"},{"renderPath","canonical"}});scene.add_component(id,"Collider",{{"bounds",Json::Array{Json::Array{-1,-1,-1},Json::Array{1,1,1}}}});}
 scene.reparent("p0","parent",true);scene.add_component("p1","ActorController",{});
 const auto saved=scene.serialize();WorldPartition partition;partition.synchronize(scene,assets);
 assert(partition.statistics().records==1000&&partition.statistics().dynamic_records==1);
 assert(scene.serialize()==saved);partition.synchronize(scene,assets);assert(partition.statistics().updated==0);
 const WorldBounds origin{{0,-2,0},{32,2,32}};assert(partition.query(origin)==std::vector<EntityId>{"p0"});assert(partition.statistics().considered==1);
 EditorHistory history;
 auto call=[&](const char* request){history.command(scene,parse_json(request));partition.synchronize(scene,assets);};
 call(R"({"operations":[{"op":"transform","id":"p0","transform":{"position":[48,0,16]}}]})");
 assert(partition.statistics().updated==1&&partition.statistics().rebuilds==1);assert(partition.query(origin).empty());assert(has(partition.members({1,0}),"p0"));assert(!has(partition.members({0,0}),"p0"));
 call(R"({"action":"undo"})");assert(scene.serialize()==saved);assert(partition.query(origin)==std::vector<EntityId>{"p0"});
 call(R"({"action":"redo"})");assert(has(partition.members({1,0}),"p0"));call(R"({"action":"undo"})");
 Transform parent;parent.position={128,0,0};parent.scale={2,3,4};scene.set_local("parent",parent);partition.synchronize(scene,assets);assert(partition.statistics().updated==2);assert(partition.record("p0")->bounds.min.x==158);assert(partition.record("p0")->bounds.max.z==68);
 scene.set_active("parent",false);partition.synchronize(scene,assets);assert(!partition.record("p0"));scene.set_active("parent",true);partition.synchronize(scene,assets);assert(partition.record("p0"));
 call(R"({"operations":[{"op":"delete","id":"parent"}]})");assert(!partition.record("p0"));call(R"({"action":"undo"})");assert(partition.record("p0"));
 const auto actorSaved=scene.serialize();partition.dynamic_position("p1",{16,0,16});assert(has(partition.members({0,0}),"p1"));assert(!has(partition.members({2,0}),"p1"));partition.dynamic_position("p1",{16,0,16});assert(partition.record("p1")->bounds.min.x==15);assert(scene.serialize()==actorSaved);
 auto large=scene.create("Bridge",{},"large");scene.add_component(large,"Collider",{{"bounds",Json::Array{Json::Array{-1000,-2,-1000},Json::Array{1000,2,1000}}}});scene.add_component(large,"MeshRenderer",{{"asset","test:large"},{"renderPath","canonical"}});partition.synchronize(scene,assets);assert(partition.statistics().large_records==1);assert(has(partition.query({{900,-1,900},{901,1,901}}),"large"));
 auto terrain=scene.create("Grounded",{},"ground");scene.add_component(terrain,"MeshRenderer",{{"asset","procedural:test"}});partition.synchronize(scene,assets);const auto original=scene.serialize();partition.ground(terrain,30);const auto y=partition.record(terrain)->bounds.min.y;partition.ground(terrain,30);assert(partition.record(terrain)->bounds.min.y==y);assert(scene.serialize()==original);
 auto loaded=Scene::deserialize(original);partition.synchronize(loaded,assets);assert(partition.statistics().rebuilds==2);assert(loaded.serialize()==original);
 for(int i=0;i<8200;++i){Transform t;t.position.x=i;loaded.set_local("p2",t);}partition.synchronize(loaded,assets);assert(partition.statistics().rebuilds==3);assert(partition.record("p2")->bounds.min.x==8198);
 if(argc>2){auto world=WorldDocument::deserialize(read(argv[2]));auto* actual=world.find_scene("overworld");assert(actual);const auto canonical=actual->serialize();WorldPartition real;real.synchronize(*actual,assets);const auto count=real.statistics().records;assert(count>10000);real.query({{0,-1000,0},{64,1000,64}});assert(real.statistics().considered<count/2);assert(actual->serialize()==canonical);real.synchronize(*actual,assets);assert(real.statistics().updated==0);std::cout<<"Actual overworld: "<<count<<" spatial records; "<<real.statistics().considered<<" candidates in 64-unit region.\n";}
 std::cout<<"PASS: incremental cells, static/dynamic separation, transformed parent bounds, large spans, history/delete restore, grounding, runtime identity, reload and journal overflow.\n";
}
