#include "veldren/scene.h"

#include <cassert>
#include <cmath>
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>

using namespace veldren;

namespace {
bool close(double a,double b){return std::abs(a-b)<1e-8;}
void point(Vec3 a,Vec3 b){assert(close(a.x,b.x)&&close(a.y,b.y)&&close(a.z,b.z));}
void matrix(Mat4 a,Mat4 b){for(std::size_t i=0;i<16;++i)assert(close(a.v[i],b.v[i]));}
void rejected(const auto& operation){bool thrown=false;try{operation();}catch(const std::invalid_argument&){thrown=true;}assert(thrown);}
}

int main(){
  Scene scene("overworld");const auto root=scene.create("Gate",{},"gate"),child=scene.create("Door",root,"door"),leaf=scene.create("Latch",child,"latch");
  Transform a;a.position={12,1,-7};a.scale={2,3,4};a.rotation={0,std::sin(.35),0,std::cos(.35)};scene.set_local(root,a);
  Transform b;b.position={2,0,1};b.rotation={std::sin(.21),0,0,std::cos(.21)};scene.set_local(child,b);
  Transform c;c.position={0,.5,1};scene.set_local(leaf,c);
  const Vec3 local{.25,.75,-1};const auto world=scene.local_to_world(leaf,local);point(scene.world_to_local(leaf,world),local);
  const auto old=scene.world_transform(leaf);
  const auto other=scene.create("Arch",{},"arch");Transform d;d.position={-3,4,12};d.scale={4,1,2};d.rotation={0,std::sin(.43),0,std::cos(.43)};scene.set_local(other,d);
  scene.reparent(child,other,true);matrix(old,scene.world_transform(leaf));
  rejected([&]{scene.reparent(other,leaf,false);});
  assert(scene.inspect(leaf).parent=="door");assert(scene.inspect(child).local.affine.has_value());
  scene.add_component(child,"MeshRenderer",{{"asset","realm:gate"},{"material","stone"},{"castShadow",true}});
  scene.add_component(child,"Collider",{{"shape","box"},{"bounds",Json::Array{1,2,3}}});
  scene.add_component(root,"Interactable",{{"action","open"}});
  assert(scene.entities_with("MeshRenderer")==std::vector<EntityId>{"door"});
  assert(scene.component_entities("MeshRenderer").contains(child));
  assert(scene.component(child,"Collider")->at("shape").string_or()=="box");
  assert(scene.remove_component(child,"Collider"));assert(scene.entities_with("Collider").empty());
  assert(!scene.remove_component(child,"Collider"));
  const auto copied=scene.duplicate(child,other,true);assert(copied!="door"&&scene.inspect(copied).children.size()==1);
  assert(scene.component(copied,"MeshRenderer")->at("asset").string_or()=="realm:gate");
  scene.set_active(other,false);assert(!scene.inspect(leaf).active_in_hierarchy);
  scene.set_active(other,true);
  const std::string saved=scene.serialize();auto loaded=Scene::deserialize(saved);assert(loaded.serialize()==saved);
  matrix(loaded.world_transform(leaf),scene.world_transform(leaf));
  assert(loaded.inspect(leaf).parent==child&&loaded.inspect(child).children[0]==leaf);
  assert(loaded.component(copied,"MeshRenderer")->at("material").string_or()=="stone");
  loaded.remove(child,ChildDisposition::ReparentToRoot);assert(!loaded.contains(child)&&loaded.contains(leaf));matrix(loaded.world_transform(leaf),old);
  loaded.remove(copied,ChildDisposition::Destroy);assert(!loaded.contains(copied));
  assert(loaded.entities_with("MeshRenderer").empty());
  const auto generated=loaded.create("Temporary");loaded.remove(generated,ChildDisposition::Destroy);
  auto reloaded=Scene::deserialize(loaded.serialize());assert(reloaded.create("New")!=generated);
  Scene deep("deep");auto parent=deep.create("0");
  for(int i=1;i<=1600;++i){const auto next=deep.create(std::to_string(i),parent);Transform one;one.position={.125,0,0};deep.set_local(next,one);parent=next;}
  assert(close(deep.world_transform(parent).v[12],200));assert(deep.traverse().size()==1601);
  auto deep_loaded=Scene::deserialize(deep.serialize());assert(close(deep_loaded.world_transform(parent).v[12],200));
  rejected([&]{Scene::deserialize("{\"format\":\"veldren.scene\",\"version\":2,\"scene\":\"x\",\"entities\":[{\"id\":\"a\",\"parent\":\"missing\"}]}");});
  rejected([&]{Scene::deserialize("{\"format\":\"veldren.scene\",\"version\":2,\"scene\":\"x\",\"entities\":[{\"id\":\"a\"},{\"id\":\"a\"}]}");});
  const auto defaults=Scene::deserialize("{\"format\":\"veldren.scene\",\"version\":2,\"scene\":\"x\",\"entities\":[{\"id\":\"a\"}]}");
  point(defaults.inspect("a").local.scale,{1,1,1});assert(defaults.inspect("a").active);
  SceneSession editor(scene,Context::Editor);SceneSession runtime(scene,Context::Runtime);
  editor.select(root);assert(editor.selection()==root&&runtime.selection().empty());
  rejected([&]{runtime.select(root);});assert(runtime.gameplay_enabled()&&!editor.gameplay_enabled());
  Scene selection_scene("selection");auto temporary=selection_scene.create("Selected");
  SceneSession selection_session(selection_scene,Context::Editor);selection_session.select(temporary);
  selection_scene.remove(temporary,ChildDisposition::Destroy);assert(selection_session.selection().empty());

  std::ifstream input("../editor-data/world-edits.json");assert(input.good());
  const std::string legacy{std::istreambuf_iterator<char>{input},{}};
  const auto original=parse_json(legacy);const auto& changes=original.find("changes")->array();
  auto migrated_world=WorldDocument::migrate_legacy_edits(legacy);
  assert(migrated_world.revision==8&&migrated_world.find_scene("tutorial")&&migrated_world.find_scene("tutorial")->size()==29);
  if(const auto* terrain=original.find("terrain"))assert(migrated_world.extras.at("terrain")==*terrain);
  assert(WorldDocument::deserialize(migrated_world.serialize()).serialize()==migrated_world.serialize());
  for(const std::string name:{"tutorial","overworld"}){
    const auto migrated=Scene::migrate_legacy_edits(legacy,name);
    const auto replay=Scene::deserialize(migrated.serialize());
    assert(replay.serialize()==migrated.serialize());
    std::size_t expected=0;
    for(const auto& change:changes){if(change.find("scene")->string_or()!=name)continue;++expected;
      const auto id=name+":"+change.find("kind")->string_or()+":"+change.find("id")->string_or();
      const auto entity=replay.inspect(id);
      point(entity.local.position,{change.find("x")?change.find("x")->number_or():0,0,change.find("y")?change.find("y")->number_or():0});
      assert(replay.component(id,"LegacyWorldEdit")->at("change").object()==change.object());
    }
    assert(migrated.size()==expected);
  }
  std::ifstream canonical("../editor-data/world-scene.json");assert(canonical.good());
  const std::string world_text{std::istreambuf_iterator<char>{canonical},{}};
  auto world_document=WorldDocument::deserialize(world_text);
  assert(world_document.revision==8);
  assert(world_document.find_scene("tutorial")&&world_document.find_scene("tutorial")->size()==29);
  assert(WorldDocument::deserialize(world_document.serialize()).serialize()==world_document.serialize());
  std::cout<<"PASS: hierarchy, affine reparent, deep transforms, components, deterministic round-trip, editor isolation and real legacy world migration.\n";
}
