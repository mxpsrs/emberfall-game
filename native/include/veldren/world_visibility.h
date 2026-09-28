#pragma once
#include "veldren/world_performance.h"
namespace veldren {
struct WorldCamera {
 Vec3 eye,center,up{0,1,0};
 double near_plane=.25,far_plane=320,left=-.1,right=.1,bottom=-.1,top=.1;
 double viewport_height=900;
};
struct VisibilityPolicy {
 double distance=320,minimum_pixels=0;
};
const std::map<std::string,VisibilityPolicy>& world_visibility_profile(const std::string& profile);
struct WorldVisibilityResult {
 std::vector<EntityId> ids;
 std::size_t considered_renderables=0,visible_renderables=0,considered=0,frustum_culled=0,distance_culled=0,projected_culled=0,lights=0;
};
// Original plane/support-vertex implementation over conservative world AABBs.
// Policies are supplied by quality/category data, never by asset filename.
class WorldVisibility {
 public:
 WorldVisibilityResult evaluate(WorldPartition& partition,const WorldCamera& camera,
   const std::map<std::string,VisibilityPolicy>& policies) const;
 static bool intersects(const WorldBounds& bounds,const WorldCamera& camera);
 static WorldBounds camera_bounds(const WorldCamera& camera);
};
}
