#include "veldren/desktop.h"

#include <cassert>
#include <cmath>
#include <iostream>

int main(){
  VeldrenDesktopClient client(32);
  client.seed_demo_world(22);
  const auto& scene=client.scene();
  assert(scene.size()==22);
  assert(scene.entities_with("MeshRenderer").size()==22);
  assert(scene.entities_with("Monster").size()==2);
  assert(scene.entities_with("PlayerRepresentation").size()==1);
  const auto player=scene.inspect("runtime:actor:1");
  assert(player.name=="Player"&&player.components.contains("Animator"));
  const auto before=scene.local_to_world(player.id,{});
  assert(client.move_actor(1,float(before.x+15),float(before.z),7.2F));
  client.step(.1F,float(before.x),float(before.z),200);
  const auto after=client.scene().local_to_world(player.id,{});
  assert(after.x>before.x);
  assert(std::abs(after.x-client.render_states()[0].x)<1e-5);
  assert(veldren::Scene::deserialize(client.scene().serialize()).size()==22);
  std::cout<<"PASS: C++ actor simulation updates scene-owned player, NPC and monster representations; renderer state reflects scene transforms.\n";
}
