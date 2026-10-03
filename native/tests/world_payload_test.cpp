#include "veldren/scene.h"
#include "veldren/editor.h"
#include <cassert>
#include <iostream>
#include <stdexcept>
using namespace veldren;
int main(){
 Scene scene("paging");const auto parent=scene.create("Parent",{},"parent");
 for(int i=0;i<80;++i){const auto id=scene.create("Far prop",parent,"prop:"+std::to_string(i));Transform pose;pose.position={400.0+i*32,0,400};scene.set_local(id,pose);scene.add_component(id,"MeshRenderer",{{"asset","test:mesh"},{"castShadows",false}});scene.add_component(id,"Collider",{{"solid",true},{"radius",2}});scene.set_metadata(id,{{"quest","persistent"},{"details",std::string(200,'x')}});}
 const auto before=scene.serialize();scene.enable_spatial_tracking();const auto revision=scene.spatial_revision();
 auto stats=scene.page_payloads({0,0,0},64,{"prop:0"},16);assert(stats.scanned==16);assert(stats.compacted>0);assert(stats.bytes>0);
 stats=scene.page_payloads({0,0,0},64,{"prop:0"},4096);assert(stats.paged==79);assert(scene.size()==81);assert(scene.entities_with("Collider").size()==80);assert(scene.spatial_revision()==revision);
 assert(scene.serialize()==before);assert(scene.payload_paging().paged==79);assert(Scene::deserialize(scene.serialize()).serialize()==before);
 const auto projected=scene.entity_json("prop:7",true);assert(projected.find("components")->find("Collider")->find("solid")->bool_or());assert(scene.payload_paging().paged==79);
 Scene copy=scene;assert(copy.serialize()==before);assert(copy.payload_paging().paged==79);
 Transform shifted;shifted.position={1,2,3};scene.set_local(parent,shifted);assert(scene.payload_paging().paged==79);assert(scene.world_transform("prop:7").v[13]==2);scene.set_local(parent,{});
 EditorHistory history;
 history.command(scene,parse_json(R"({"operations":[{"op":"field","id":"prop:7","component":"MeshRenderer","field":"castShadows","value":true}]})"));
 assert(scene.component("prop:7","MeshRenderer")->at("castShadows").bool_or());assert(scene.inspect("prop:7").metadata.at("quest").string_or()=="persistent");
 history.command(scene,parse_json(R"({"action":"undo"})"));assert(scene.serialize()==before);
 scene.page_payloads({0,0,0},64,{},4096);
 history.command(scene,parse_json(R"({"operations":[{"op":"delete","id":"prop:8"}]})"));assert(!scene.contains("prop:8"));assert(scene.entities_with("Collider").size()==79);
 history.command(scene,parse_json(R"({"action":"undo"})"));assert(scene.serialize()==before);assert(scene.entities_with("Collider").size()==80);
 history.command(scene,parse_json(R"({"action":"redo"})"));assert(!scene.contains("prop:8"));history.command(scene,parse_json(R"({"action":"undo"})"));
 const auto old_paged=scene.payload_paging().paged;stats=scene.page_payloads({400,0,400},64,{},4096);assert(stats.paged<old_paged);assert(stats.restored>0);
 assert(scene.serialize()==before);stats=scene.page_payloads({-10000,0,-10000},64,{},4096);assert(stats.paged==80);
 auto duplicated=scene.duplicate("prop:17",parent,false);assert(scene.component(duplicated,"Collider")->at("solid").bool_or());assert(scene.inspect(duplicated).metadata.at("quest").string_or()=="persistent");scene.remove(duplicated,ChildDisposition::Destroy);
 // Deleting an unloaded branch and undoing it restores indices and every field.
 const auto saved=scene.serialize();scene.page_payloads({-10000,0,-10000},64,{},4096);
 history.command(scene,parse_json(R"({"operations":[{"op":"delete","id":"parent"}]})"));assert(scene.size()==0);assert(scene.payload_paging().paged==0);
 history.command(scene,parse_json(R"({"action":"undo"})"));assert(scene.serialize()==saved);assert(scene.entities_with("Collider").size()==80);
 bool rejected=false;try{scene.page_payloads({0,0,0},0,{},16);}catch(const std::invalid_argument&){rejected=true;}assert(rejected);
 std::cout<<"PASS: native payload pages preserve saves, hierarchy, collision indices, transforms, reads, edits, delete/undo/redo, duplication and bounded work\n";
}
