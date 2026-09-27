#include "veldren/editor.h"
#include <cassert>
#include <iostream>
using namespace veldren;
int main(){
 Scene scene("town");scene.create("Root",{},"root");scene.create("Wall","root","wall");scene.create("Door","wall","door");scene.create("Other",{},"other");
 Transform parent;parent.position={4,2,7};parent.rotation={0,.4,0,.916515138991168};parent.scale={2,3,4};scene.set_local("root",parent);
 scene.add_component("door","Interactable",{{"action","open"}});
 EditorHistory history;
 auto call=[&](const char* text){return history.command(scene,parse_json(text));};
 const auto original=scene.serialize();const auto world=scene.world_transform("wall").v;
 call(R"({"label":"Reparent","operations":[{"op":"reparent","id":"wall","parent":"other"}]})");
 for(unsigned i=0;i<16;++i)assert(std::abs(world[i]-scene.world_transform("wall").v[i])<1e-12);
 call(R"({"action":"undo"})");assert(scene.serialize()==original);call(R"({"action":"redo"})");assert(scene.inspect("wall").parent=="other");
 call(R"({"label":"Mixed","operations":[{"op":"rename","id":"wall","name":"West wall"},{"op":"addComponent","id":"wall","component":"Light","fields":{"intensity":10}},{"op":"field","id":"door","component":"Interactable","field":"action","value":"enter"},{"op":"active","id":"door","active":false}]})");
 assert(scene.inspect("wall").name=="West wall");assert(!scene.inspect("door").active);assert(scene.entities_with("Light").size()==1);
 call(R"({"action":"undo"})");assert(scene.entities_with("Light").empty());assert(scene.inspect("door").active);call(R"({"action":"redo"})");
 call(R"({"action":"begin","label":"Drag"})");
 for(int i=0;i<300;++i){
  const Json pose=Json::Object{{"position",Json::Array{double(i),2,3}}};
  const Json op=Json::Object{{"op","transform"},{"id","wall"},{"transform",pose}};
  history.command(scene,Json::Object{{"operations",Json::Array{op}}});
 }

 auto result=call(R"({"action":"commit"})");assert(result.find("undo")->number_or()==3);
 call(R"({"action":"undo"})");assert(scene.inspect("wall").local.affine.has_value());call(R"({"action":"redo"})");assert(scene.inspect("wall").local.position.x==299);
 const auto before_delete=scene.serialize();call(R"({"label":"Delete","operations":[{"op":"delete","id":"wall"}]})");assert(!scene.contains("door"));
 call(R"({"action":"undo"})");assert(scene.serialize()==before_delete);assert(scene.entities_with("Light").size()==1);
 const auto copied=call(R"({"label":"Duplicate","operations":[{"op":"duplicate","id":"wall"}]})").find("created")->array()[0].string_or();assert(scene.contains(copied));assert(scene.inspect(copied).children.size()==1);
 call(R"({"action":"undo"})");assert(!scene.contains(copied));call(R"({"action":"redo"})");assert(scene.contains(copied));
 call(R"({"action":"markSaved"})");assert(!call(R"({"action":"status"})").find("dirty")->bool_or());call(R"({"action":"undo"})");assert(call(R"({"action":"status"})").find("dirty")->bool_or());call(R"({"action":"redo"})");assert(!call(R"({"action":"status"})").find("dirty")->bool_or());
 const auto valid=scene.serialize();
 for(const char* bad:{R"({"operations":[{"op":"rename","id":"wall","name":"Bad"},{"op":"reparent","id":"wall","parent":"door"}]})",R"({"operations":[{"op":"field","id":"wall","component":"Light","field":"intensity","value":-1}]})",R"({"operations":[{"op":"transform","id":"wall","transform":{"scale":[1,0,1]}}]})"}){
  bool rejected=false;try{call(bad);}catch(const std::exception&){rejected=true;}assert(rejected);assert(scene.serialize()==valid);
 }
 call(R"({"action":"begin","label":"Cancelled drag"})");call(R"({"operations":[{"op":"transform","id":"wall","transform":{"position":[8,9,10]}}]})");call(R"({"action":"cancel"})");assert(scene.serialize()==valid);
 call(R"({"operations":[{"op":"create","entity":{"id":"new","name":"New","parent":"root","components":{"Collider":{"shape":"box","radius":1}}}}]})");assert(scene.contains("new"));call(R"({"action":"undo"})");assert(!scene.contains("new"));call(R"({"action":"redo"})");assert(scene.contains("new"));
 scene.add_component("wall","BuildingAccess",{{"entrance","door"}});scene.add_component("wall","GeneratedBuilding",{{"generationKey","original"}});scene.add_component("door","BuildingPart",{{"building","wall"}});
 const auto branch=call(R"({"operations":[{"op":"duplicate","id":"wall"}]})").find("created")->array()[0].string_or();const auto child=scene.inspect(branch).children[0];
 assert(scene.component(branch,"BuildingAccess")->at("entrance").string_or()==child);assert(scene.component(child,"BuildingPart")->at("building").string_or()==branch);assert(scene.component(branch,"GeneratedBuilding")->at("generationKey").string_or()!="original");
 for(const char* bad:{R"({"operations":[{"op":"addComponent","id":"other","component":"MeshRenderer","fields":{}}]})",R"({"operations":[{"op":"addComponent","id":"other","component":"Collider","fields":{"size":[1,-1,1]}}]})",R"({"operations":[{"op":"addComponent","id":"other","component":"Light","fields":{"color":[1,2]}}]})",R"({"operations":[{"op":"field","id":"wall","component":"Light","field":"visible","value":"yes"}]})"}){const auto before=scene.serialize();bool rejected=false;try{call(bad);}catch(const std::exception&){rejected=true;}assert(rejected);assert(scene.serialize()==before);}
 assert(Scene::deserialize(scene.serialize()).serialize()==scene.serialize());
 std::cout<<"PASS: canonical mixed commands, affine reparent undo, exact deletion restore, components/indexes, duplicate identity, 300-tick transaction, dirty/save states, invalid rollback and serialization.\n";
}
