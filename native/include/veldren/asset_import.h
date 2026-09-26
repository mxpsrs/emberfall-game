#pragma once
#include "veldren/scene.h"
#include <functional>
#include <span>

namespace veldren {
using AssetBytes = std::vector<std::uint8_t>;
using AssetResolver = std::function<AssetBytes(const std::string&)>;
std::string asset_sha256(std::span<const std::uint8_t> bytes);
std::string asset_base64(std::span<const std::uint8_t> bytes);
AssetBytes asset_unbase64(std::string_view text);
// Platform-independent importer. File/network IO is supplied by the caller.
// Result contains canonical typed mesh streams, hierarchy, materials, images,
// skins, animation channels and classified validation diagnostics.
Json import_gltf(std::span<const std::uint8_t> source,const std::string& stable_id,
                 const AssetResolver& resolve);
}

namespace veldren {
// Produce persistent registry definitions from canonical imported content.
Json imported_asset_records(const Json& model,const std::string& source_path);
}
