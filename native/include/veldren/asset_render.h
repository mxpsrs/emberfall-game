#pragma once
#include "veldren/assets.h"

namespace veldren {
// Validates canonical geometry and produces a platform-independent GPU packet.
// No Filament handles, platform IO, or permanent Scene edits are involved.
Json asset_render_plan(const AssetRegistry& registry, const Json& model);
}
