#pragma once
#include "veldren/assets.h"
namespace veldren {
// Only transient decisions. Definitions/thresholds remain in AssetRegistry.
class WorldLodState {
 public:
 Json select(const AssetRegistry& assets,const std::string& identity,const std::string& asset,double distance);
 void begin_frame(const AssetRegistry& assets);
 void clear();
 Json diagnostics() const;
 private:
 struct Entry{std::string asset;int level=0;std::uint64_t used=0;};
 std::unordered_map<std::string,Entry> entries_;
 std::uint64_t frame_=0,revision_=0,transitions_=0;
 std::array<std::size_t,3> counts_{};
 std::size_t missing_=0;
};
}
