#include "veldren/desktop.h"

#include <cassert>
#include <cmath>
#include <iostream>
#include <string>

int main() {
  const auto high = veldren_desktop_quality(false);
  const auto ultra = veldren_desktop_quality(true);
  assert(high.width == 1920 && high.height == 1080);
  assert(ultra.width == 2560 && ultra.height == 1440);
  assert(ultra.shadow_map_size == 4096);
  assert(ultra.anisotropy == 16 && ultra.msaa_samples == 4);
  assert(ultra.far_clip > high.far_clip);
  assert(ultra.foliage_radius > high.foliage_radius);
  assert(ultra.foliage_density > high.foliage_density);
  std::string error;
  const auto assets = veldren_desktop_assets("..");
  assert(veldren_desktop_assets_ready(assets, &error));
  assert(assets.foliage_models.size() == 11);
  VeldrenDesktopClient client(1024);
  client.seed_demo_world(512);
  const auto first = client.step(1.0F / 60.0F, 0, 0, ultra.far_clip);
  const auto second = client.step(1.0F / 60.0F, 0, 0, ultra.far_clip);
  assert(first.actor_count == 512 && first.visible_count == 512);
  assert(second.state_hash != first.state_hash);
  const float player_x = client.render_states()[0].x;
  assert(client.move_actor(1, player_x + 20.0F, 0, 7.2F));
  client.step(0.1F, player_x, 0, ultra.far_clip);
  assert(client.render_states()[0].x > player_x);
  assert(client.render_states().size() == 512);
  assert(client.animation_states().size() == 512);
  assert(std::isfinite(client.render_states()[0].heading));
  assert(veldren_core_abi_version() == 19);
  std::cout << "PASS: native desktop reuses ABI 16, full local assets, ultra shadows, long draw distance, dense foliage and effect budgets.\n";
}
