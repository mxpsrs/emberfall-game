#include "veldren/desktop.h"

#include <chrono>
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
  bool headless = false;
  bool ultra = true;
  std::uint32_t frames = 180;
  std::filesystem::path root = "..";
  for (int i = 1; i < argc; ++i) {
    const std::string_view argument(argv[i]);
    if (argument == "--headless") headless = true;
    else if (argument == "--quality=high") ultra = false;
    else if (argument.starts_with("--frames=")) frames = std::strtoul(argv[i] + 9, nullptr, 10);
    else if (argument.starts_with("--assets=")) root = argv[i] + 9;
  }
  const auto quality = veldren_desktop_quality(ultra);
  const auto assets = veldren_desktop_assets(root);
  std::string error;
  if (!veldren_desktop_assets_ready(assets, &error)) {
    std::cerr << error << '\n';
    return 2;
  }
  if (!veldren_desktop_renderer_assets_valid(assets, &error)) {
    std::cerr << error << '\n';
    return 2;
  }
  VeldrenDesktopClient client;
  client.seed_demo_world(512);
  if (!headless) return veldren_run_desktop(client, assets, quality);
  VeldrenDesktopFrame frame{};
  const auto started = std::chrono::steady_clock::now();
  for (std::uint32_t i = 0; i < frames; ++i) frame = client.step(1.0F / 60.0F, 0, 0, quality.far_clip);
  const auto elapsed = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
  std::cout << "Veldren desktop headless: " << quality.width << 'x' << quality.height
            << ", shadow=" << quality.shadow_map_size << ", far=" << quality.far_clip
            << ", foliage=" << quality.foliage_density << "x, actors=" << frame.actor_count
            << ", visible=" << frame.visible_count << ", hash=" << frame.state_hash
            << ", " << elapsed << " ms\n";
  return frame.actor_count == 512 && frame.visible_count == 512 ? 0 : 3;
}
