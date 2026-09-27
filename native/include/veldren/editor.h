#pragma once
#include "veldren/scene.h"
#include <functional>

namespace veldren {
// History contains immutable deltas of affected canonical nodes, never a second
// editable world. A drag opens one transaction and commits once on pointer-up.
class EditorHistory {
 public:
  using AssetValidator = std::function<bool(const std::string&, const std::string&)>;
  Json command(Scene& scene, const Json& request, const AssetValidator& assets = {});
  void clear();
 private:
  using Patch = std::map<EntityId, std::optional<Scene::Node>>;
  struct Record {
    std::string label;
    Patch before, after;
    std::vector<EntityId> before_roots, after_roots;
    std::uint64_t before_state = 0, after_state = 0;
  };
  std::vector<Record> undo_, redo_;
  std::optional<Record> pending_;
  std::uint64_t state_ = 0, saved_ = 0, serial_ = 0;
  Json::Array affected_, created_;
  void touch(Scene& scene, const EntityId& id);
  void touch_branch(Scene& scene, const EntityId& id);
  void restore(Scene& scene, const Patch& patch, const std::vector<EntityId>& roots);
  void begin(Scene& scene, const std::string& label);
  bool commit(Scene& scene);
  void cancel(Scene& scene);
  void apply(Scene& scene, const Json& operation, const AssetValidator& assets);
  Json status(bool changed) const;
};
}  // namespace veldren
