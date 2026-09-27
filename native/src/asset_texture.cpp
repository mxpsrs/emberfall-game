#include "veldren/asset_texture.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <limits>
#include <memory>
#include <stdexcept>
#define STB_IMAGE_IMPLEMENTATION
#define STBI_ONLY_PNG
#define STBI_ONLY_JPEG
#define STBI_NO_STDIO
#define STBI_MAX_DIMENSIONS 8192
// Keep decoder invariants active without linking assert's stdio printer into
// the browser core. Recoverable malformed-image errors use stbi_failure_reason.
#ifdef __EMSCRIPTEN__
#define STBI_ASSERT(condition) ((condition) ? (void)0 : std::abort())
#endif
#include <stb_image.h>

namespace veldren {
namespace {
double linear(double value) { return value <= .04045 ? value / 12.92 : std::pow((value + .055) / 1.055, 2.4); }
double srgb(double value) { return value <= .0031308 ? value * 12.92 : 1.055 * std::pow(value, 1 / 2.4) - .055; }
std::uint8_t byte(double value) { return std::uint8_t(std::round(std::clamp(value, 0.0, 1.0) * 255)); }
double coverage(const AssetImage& image, double cutoff, double scale = 1) {
  std::size_t count = 0;
  for (std::size_t i = 3; i < image.pixels.size(); i += 4) if (image.pixels[i] / 255.0 * scale >= cutoff) ++count;
  return double(count) / (image.pixels.size() / 4);
}
AssetImage resize(const AssetImage& image, std::uint32_t width, std::uint32_t height, const TextureSettings& settings) {
  AssetImage out{width, height, AssetBytes(std::size_t(width) * height * 4)};
  static const auto lut = [] { std::array<double, 256> table{}; for (unsigned i = 0; i < 256; ++i) table[i] = linear(i / 255.0); return table; }();
  // Area integration includes the last row/column of non-power-of-two images.
  for (std::uint32_t y = 0; y < height; ++y) for (std::uint32_t x = 0; x < width; ++x) {
    const double x0 = double(x) * image.width / width, x1 = double(x + 1) * image.width / width;
    const double y0 = double(y) * image.height / height, y1 = double(y + 1) * image.height / height;
    double sum[4]{}, weight = 0, alpha_weight = 0;
    for (auto sy = std::uint32_t(y0); sy < std::min(image.height, std::uint32_t(std::ceil(y1))); ++sy)
      for (auto sx = std::uint32_t(x0); sx < std::min(image.width, std::uint32_t(std::ceil(x1))); ++sx) {
        const auto p = (std::size_t(sy) * image.width + sx) * 4;
        const double area = (std::min(x1, double(sx + 1)) - std::max(x0, double(sx))) * (std::min(y1, double(sy + 1)) - std::max(y0, double(sy)));
        const double alpha = image.pixels[p + 3] / 255.0;
        for (unsigned c = 0; c < 3; ++c) {
          const auto v = image.pixels[p + c];
          sum[c] += area * (settings.srgb ? lut[v] * alpha : settings.normal ? v / 127.5 - 1 : v / 255.0);
        }
        sum[3] += area * alpha; alpha_weight += area * alpha; weight += area;
      }
    const auto target = (std::size_t(y) * width + x) * 4;
    if (settings.normal) {
      const auto length = std::hypot(sum[0], sum[1], sum[2]);
      for (unsigned c = 0; c < 3; ++c) out.pixels[target + c] = byte((length > 1e-10 ? sum[c] / length : c == 2 ? 1.0 : 0.0) * .5 + .5);
    } else for (unsigned c = 0; c < 3; ++c) out.pixels[target + c] = byte(settings.srgb ? srgb(alpha_weight > 0 ? sum[c] / alpha_weight : 0) : sum[c] / weight);
    out.pixels[target + 3] = byte(sum[3] / weight);
  }
  if (settings.alpha_cutoff > 0) {
    const auto target = coverage(image, settings.alpha_cutoff);
    double lo = 0, hi = 8, best = 1, error = std::abs(coverage(out, settings.alpha_cutoff) - target);
    for (unsigned i = 0; i < 14; ++i) {
      const auto scale = (lo + hi) / 2, actual = coverage(out, settings.alpha_cutoff, scale), delta = std::abs(actual - target);
      if (delta < error) { error = delta; best = scale; }
      if (actual < target) lo = scale; else hi = scale;
    }
    for (std::size_t i = 3; i < out.pixels.size(); i += 4) out.pixels[i] = byte(out.pixels[i] / 255.0 * best);
  }
  return out;
}
}
AssetImage decode_asset_image(std::span<const std::uint8_t> bytes) {
  if (bytes.empty() || bytes.size() > 128 * 1024 * 1024) throw std::invalid_argument("Invalid/excessive encoded image size");
  int width = 0, height = 0, channels = 0;
  if (!stbi_info_from_memory(bytes.data(), int(bytes.size()), &width, &height, &channels) || width <= 0 || height <= 0 || width > 8192 || height > 8192) throw std::invalid_argument("Invalid/excessive image dimensions");
  auto* decoded = stbi_load_from_memory(bytes.data(), int(bytes.size()), &width, &height, &channels, 4);
  if (!decoded) throw std::invalid_argument(std::string("Corrupted image: ") + stbi_failure_reason());
  std::unique_ptr<stbi_uc, decltype(&stbi_image_free)> guard(decoded, stbi_image_free);
  return {std::uint32_t(width), std::uint32_t(height), AssetBytes(decoded, decoded + std::size_t(width) * height * 4)};
}
AssetTexture build_texture(AssetImage image, TextureSettings settings) {
  if (!image.width || !image.height || image.width > 8192 || image.height > 8192 || image.pixels.size() != std::size_t(image.width) * image.height * 4) throw std::invalid_argument("Invalid RGBA image");
  if (!settings.max_dimension || settings.max_dimension > 8192 || !std::isfinite(settings.alpha_cutoff) || settings.alpha_cutoff < 0 || settings.alpha_cutoff > 1 || (settings.normal && settings.srgb)) throw std::invalid_argument("Invalid texture processing settings");
  AssetTexture texture; texture.settings = settings;
  if (std::max(image.width, image.height) > settings.max_dimension) {
    const double scale = double(settings.max_dimension) / std::max(image.width, image.height);
    image = resize(image, std::max(1u, std::uint32_t(image.width * scale)), std::max(1u, std::uint32_t(image.height * scale)), settings);
  }
  texture.levels.push_back(std::move(image));
  while (texture.levels.back().width > 1 || texture.levels.back().height > 1) {
    const auto& previous = texture.levels.back();
    texture.levels.push_back(resize(previous, std::max(1u, previous.width / 2), std::max(1u, previous.height / 2), settings));
  }
  return texture;
}
TextureSettings texture_settings(const Json& options) {
  TextureSettings settings;
  if (const auto* value = options.find("colorSpace")) { const auto name = value->string_or(); if (name != "srgb" && name != "linear") throw std::invalid_argument("Invalid texture color space"); settings.srgb = name == "srgb"; }
  if (const auto* value = options.find("role")) settings.normal = value->string_or() == "normal";
  if (const auto* value = options.find("maxDimension")) { const auto n = value->number_or(-1); if (n < 1 || n > 8192 || n != std::floor(n)) throw std::invalid_argument("Invalid maximum texture dimension"); settings.max_dimension = std::uint32_t(n); }
  if (const auto* value = options.find("alphaCutoff")) settings.alpha_cutoff = value->number_or(-1);
  if (!std::isfinite(settings.alpha_cutoff) || settings.alpha_cutoff < 0 || settings.alpha_cutoff > 1 || (settings.normal && settings.srgb)) throw std::invalid_argument("Invalid texture processing settings");
  return settings;
}
AssetTexture import_texture(std::span<const std::uint8_t> bytes, const Json& options) {
  const auto hash = asset_sha256(bytes);
  if (const auto* expected = options.find("sourceHash"); expected && expected->string_or() != hash) throw std::invalid_argument("Texture content hash mismatch");
  const auto settings = texture_settings(options);
  auto texture = build_texture(decode_asset_image(bytes), settings); texture.source_hash = hash; texture.source_bytes = bytes.size(); return texture;
}
Json AssetTexture::metadata() const {
  Json::Array mips; std::size_t bytes = 0;
  for (const auto& image : levels) { bytes += image.pixels.size(); mips.emplace_back(Json::Object{{"width",double(image.width)},{"height",double(image.height)},{"bytes",double(image.pixels.size())}}); }
  return Json::Object{{"format","veldren.texture"},{"version",1},{"sourceHash",source_hash},{"sourceBytes",double(source_bytes)},{"gpuBytes",double(bytes)},{"colorSpace",settings.srgb?"srgb":"linear"},{"normalMap",settings.normal},{"levels",mips},{"storage","rgba8"}};
}
}
namespace {
struct TextureEntry { veldren::AssetTexture texture; std::string key; std::uint32_t users = 1; };
std::map<std::uint32_t, TextureEntry> textures;
std::map<std::string, std::uint32_t> texture_keys;
std::uint32_t next_texture = 1;
std::string texture_error;
std::uint32_t copy_text(const std::string& text, char* out, std::uint32_t capacity) {
  if (out && capacity) { const auto size = std::min<std::size_t>(text.size(), capacity - 1); std::memcpy(out, text.data(), size); out[size] = 0; }
  return std::uint32_t(text.size());
}
}
extern "C" {
std::uint32_t veldren_texture_create(const std::uint8_t* data, std::uint32_t size, const char* options) {
  try {
    if (!data || !size || size > 128 * 1024 * 1024 || !options || !next_texture) throw std::invalid_argument("Invalid texture input");
    const auto parsed = veldren::parse_json(options);
    const auto settings = veldren::texture_settings(parsed);
    const auto hash = veldren::asset_sha256({data,size});
    if (const auto* expected = parsed.find("sourceHash"); expected && expected->string_or() != hash) throw std::invalid_argument("Texture content hash mismatch");
    const auto key = hash + veldren::write_json(veldren::Json::Array{settings.srgb,settings.normal,double(settings.max_dimension),settings.alpha_cutoff});
    if (const auto it = texture_keys.find(key); it != texture_keys.end()) {
      auto& entry = textures.at(it->second);
      if (entry.users == std::numeric_limits<std::uint32_t>::max()) throw std::overflow_error("Texture lease overflow");
      ++entry.users; texture_error.clear(); return it->second;
    }
    auto value = veldren::build_texture(veldren::decode_asset_image({data,size}),settings);
    value.source_hash = hash; value.source_bytes = size;
    const auto id = next_texture++;
    textures.emplace(id,TextureEntry{std::move(value),key,1});texture_keys.emplace(key,id);
    texture_error.clear();return id;
  }
  catch (const std::exception& error) { texture_error=error.what(); return 0; }
}
void veldren_texture_destroy(std::uint32_t handle) { const auto it=textures.find(handle);if(it!=textures.end()&&!--it->second.users){texture_keys.erase(it->second.key);textures.erase(it);} }
std::uint32_t veldren_texture_info(std::uint32_t handle,char* out,std::uint32_t capacity) { const auto it=textures.find(handle); if(it==textures.end())return 0;auto metadata=it->second.texture.metadata().object();metadata["users"]=double(it->second.users);return copy_text(veldren::write_json(metadata),out,capacity); }
const std::uint8_t* veldren_texture_data(std::uint32_t handle,std::uint32_t level) { const auto it=textures.find(handle); return it==textures.end()||level>=it->second.texture.levels.size()?nullptr:it->second.texture.levels[level].pixels.data(); }
std::uint32_t veldren_texture_size(std::uint32_t handle,std::uint32_t level) { const auto it=textures.find(handle); return it==textures.end()||level>=it->second.texture.levels.size()?0:std::uint32_t(it->second.texture.levels[level].pixels.size()); }
std::uint32_t veldren_texture_error(char* out,std::uint32_t capacity) { return copy_text(texture_error,out,capacity); }
}
