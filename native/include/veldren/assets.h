#pragma once
#include "veldren/scene.h"

namespace veldren {

// Persistent definitions are independent of platform loaders and renderer handles.
// The registry also owns transient dependency leases; neither is Scene identity.
class AssetRegistry {
 public:
  bool has(const std::string& id) const { return entries_.contains(id); }
  std::uint64_t revision() const { return revision_; }
  void load(const Json& manifest);
  Json document() const;
  Json record(const std::string& id) const;
  Json list(const std::string& type = {}) const;
  Json material_plan(const std::string& id,const std::string& profile) const;
  Json texture_variant(const std::string& id,const std::string& profile,const Json& usage) const;
  std::vector<std::string> dependencies(const std::string& id, bool transitive) const;
  std::vector<std::string> dependents(const std::string& id, bool transitive) const;
  void acquire(const std::string& id);
  void release(const std::string& id);
  void set_state(const std::string& id, const std::string& state);
  std::vector<std::string> invalidate(const std::string& id);
  Json diagnostics() const;
  Json command(const Json& request);
 private:
  struct Entry {
    Json definition;
    std::set<std::string> dependencies;
    std::uint64_t users = 0, generation = 1;
    std::string state = "unloaded";
  };
  std::map<std::string, Entry> entries_;
  std::map<std::string, std::set<std::string>> reverse_;
  std::map<std::string, std::uint64_t> roots_;
  std::uint64_t revision_ = 0;
  Entry& require(const std::string& id);
  const Entry& require(const std::string& id) const;
};
}

extern "C" {
std::uint32_t veldren_assets_create();
void veldren_assets_destroy(std::uint32_t handle);
int veldren_assets_command(std::uint32_t handle, const char* json);
std::uint32_t veldren_assets_response(std::uint32_t handle, char* out, std::uint32_t capacity);
}
