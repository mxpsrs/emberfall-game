#pragma once

#include "veldren/core.h"
#include "veldren/scene.h"

#include <cstdint>
#include <filesystem>
#include <span>
#include <string>
#include <vector>

struct VeldrenDesktopQuality {
  std::uint32_t width;
  std::uint32_t height;
  std::uint32_t shadow_map_size;
  std::uint32_t anisotropy;
  std::uint32_t msaa_samples;
  float far_clip;
  float foliage_radius;
  float foliage_density;
  float effect_density;
};

struct VeldrenDesktopAssets {
  std::filesystem::path root;
  std::filesystem::path world_atlas;
  std::filesystem::path ground_surfaces;
  std::vector<std::filesystem::path> foliage_models;
};

struct VeldrenDesktopFrame {
  std::uint64_t index;
  float seconds;
  std::uint32_t actor_count;
  std::uint32_t visible_count;
  std::uint64_t state_hash;
};

VeldrenDesktopQuality veldren_desktop_quality(bool ultra);
VeldrenDesktopAssets veldren_desktop_assets(const std::filesystem::path& root);
bool veldren_desktop_assets_ready(const VeldrenDesktopAssets& assets, std::string* error);
bool veldren_desktop_renderer_assets_valid(const VeldrenDesktopAssets& assets, std::string* error);

class VeldrenDesktopClient {
 public:
  explicit VeldrenDesktopClient(std::uint32_t capacity = 2048);
  ~VeldrenDesktopClient();
  VeldrenDesktopClient(const VeldrenDesktopClient&) = delete;
  VeldrenDesktopClient& operator=(const VeldrenDesktopClient&) = delete;

  void seed_demo_world(std::uint32_t actors = 256);
  bool move_actor(std::uint32_t id, float target_x, float target_z, float speed);
  VeldrenDesktopFrame step(float seconds, float player_x, float player_z, float visibility_radius);
  std::span<const VeldrenRenderState> render_states() const;
  std::span<const VeldrenAnimationState> animation_states() const;
  const veldren::Scene& scene() const;
  void* core_world() const;

 private:
  void* world_{};
  std::uint64_t frame_index_{};
  std::uint32_t state_count_{};
  std::vector<VeldrenRenderState> render_states_;
  std::vector<VeldrenAnimationState> animation_states_;
  std::vector<std::uint32_t> visible_ids_;
  mutable veldren::Scene scene_cache_{"runtime"};
};

int veldren_run_desktop(VeldrenDesktopClient& client,
                        const VeldrenDesktopAssets& assets,
                        const VeldrenDesktopQuality& quality);
