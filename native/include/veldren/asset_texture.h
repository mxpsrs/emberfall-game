#pragma once
#include "veldren/asset_import.h"

namespace veldren {
struct AssetImage {
  std::uint32_t width = 0, height = 0;
  AssetBytes pixels; // RGBA8, top row first, straight alpha.
};
struct TextureSettings {
  bool srgb = false, normal = false;
  std::uint32_t max_dimension = 4096;
  double alpha_cutoff = 0; // Zero disables cutout coverage preservation.
};
struct AssetTexture {
  TextureSettings settings;
  std::vector<AssetImage> levels;
  std::string source_hash;
  std::size_t source_bytes = 0;
  Json metadata() const;
};
AssetImage decode_asset_image(std::span<const std::uint8_t> bytes);
AssetTexture build_texture(AssetImage image, TextureSettings settings);
AssetTexture import_texture(std::span<const std::uint8_t> bytes, const Json& options);
}

extern "C" {
std::uint32_t veldren_texture_create(const std::uint8_t* data, std::uint32_t size, const char* options);
void veldren_texture_destroy(std::uint32_t handle);
std::uint32_t veldren_texture_info(std::uint32_t handle, char* out, std::uint32_t capacity);
const std::uint8_t* veldren_texture_data(std::uint32_t handle, std::uint32_t level);
std::uint32_t veldren_texture_size(std::uint32_t handle, std::uint32_t level);
std::uint32_t veldren_texture_error(char* out, std::uint32_t capacity);
}
