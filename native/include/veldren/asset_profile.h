#pragma once
#include <cstdint>
#include <stdexcept>
#include <string>

namespace veldren {
struct AssetProfile { std::uint32_t max_texture_dimension; unsigned anisotropy; };
inline AssetProfile asset_profile(const std::string& name) {
  if (name == "browser-mobile") return {256,8};
  if (name == "browser") return {512,16};
  if (name == "desktop") return {8192,16};
  throw std::invalid_argument("Unknown asset quality profile: " + name);
}
}
