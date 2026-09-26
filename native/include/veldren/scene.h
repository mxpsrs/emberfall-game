#pragma once

#include <array>
#include <cstdint>
#include <map>
#include <optional>
#include <set>
#include <string>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

namespace veldren {

// The scene owns persistent world structure. Gameplay and editor controllers
// hold IDs, never pointers to scene nodes or renderer objects.
using EntityId = std::string;

// Stable serialized capability keys. Systems own behavior; components own data.
namespace component_type {
inline constexpr std::string_view MeshRenderer = "MeshRenderer";
inline constexpr std::string_view Material = "Material";
inline constexpr std::string_view Collider = "Collider";
inline constexpr std::string_view Light = "Light";
inline constexpr std::string_view Animator = "Animator";
inline constexpr std::string_view ActorController = "ActorController";
inline constexpr std::string_view NPC = "NPC";
inline constexpr std::string_view Monster = "Monster";
inline constexpr std::string_view PlayerRepresentation = "PlayerRepresentation";
inline constexpr std::string_view Interactable = "Interactable";
inline constexpr std::string_view Gatherable = "Gatherable";
inline constexpr std::string_view AudioSource = "AudioSource";
inline constexpr std::string_view SpawnPoint = "SpawnPoint";
inline constexpr std::string_view TriggerVolume = "TriggerVolume";
inline constexpr std::string_view Navigation = "Navigation";
}

struct Json {
  using Array = std::vector<Json>;
  using Object = std::map<std::string, Json>;
  std::variant<std::nullptr_t, bool, double, std::string, Array, Object> value = nullptr;
  Json() = default;
  Json(std::nullptr_t) : value(nullptr) {}
  Json(bool v) : value(v) {}
  Json(int v) : value(double(v)) {}
  Json(double v) : value(v) {}
  Json(const char* v) : value(std::string(v)) {}
  Json(std::string v) : value(std::move(v)) {}
  Json(Array v) : value(std::move(v)) {}
  Json(Object v) : value(std::move(v)) {}
  bool operator==(const Json&) const = default;
  const Object& object() const;
  const Array& array() const;
  const Json* find(std::string_view key) const;
  std::string string_or(std::string fallback = {}) const;
  double number_or(double fallback = 0) const;
  bool bool_or(bool fallback = false) const;
};

Json parse_json(std::string_view text);
std::string write_json(const Json& value);

struct Vec3 { double x = 0, y = 0, z = 0; };
struct Quat { double x = 0, y = 0, z = 0, w = 1; };
struct Mat4 {
  // Column major, matching the affine transforms sent to render backends.
  std::array<double, 16> v{1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1};
};
struct Transform {
  Vec3 position;
  Quat rotation;
  Vec3 scale{1,1,1};
  // Reparenting under rotated nonuniform scale can introduce shear. An exact
  // affine override preserves the world matrix until the local TRS is edited.
  std::optional<Mat4> affine;
};

Mat4 multiply(const Mat4& a, const Mat4& b);
Mat4 inverse_affine(const Mat4& value);
Mat4 compose(const Transform& value);
Vec3 transform_point(const Mat4& matrix, Vec3 point);
Quat normalize(Quat rotation);

struct EntitySnapshot {
  EntityId id;
  std::string name;
  EntityId parent;
  std::vector<EntityId> children;
  Transform local;
  Mat4 world;
  bool active = true;
  bool active_in_hierarchy = true;
  Json::Object metadata;
  std::map<std::string, Json::Object> components;
};

enum class ChildDisposition { Destroy, ReparentToRoot };
enum class Context { Runtime, Editor };

class Scene {
 public:
  explicit Scene(std::string name = "overworld") : name_(std::move(name)) {}
  const std::string& name() const { return name_; }
  EntityId create(std::string name, EntityId parent = {}, EntityId id = {});
  bool contains(const EntityId& id) const;
  EntitySnapshot inspect(const EntityId& id) const;
  const std::vector<EntityId>& roots() const { return roots_; }
  std::vector<EntityId> traverse() const;
  std::vector<EntityId> entities_with(std::string_view type) const;
  const std::set<EntityId>& component_entities(std::string_view type) const;
  std::size_t size() const { return nodes_.size(); }
  void rename(const EntityId& id, std::string name);
  void set_active(const EntityId& id, bool active);
  void set_local(const EntityId& id, Transform local);
  void set_world(const EntityId& id, Transform world);
  Json entity_json(const EntityId& id, bool include_derived = false) const;
  Transform local_transform(const EntityId& id) const;
  Mat4 world_transform(const EntityId& id) const;
  Vec3 local_to_world(const EntityId& id, Vec3 point) const;
  Vec3 world_to_local(const EntityId& id, Vec3 point) const;
  void reparent(const EntityId& id, const EntityId& parent, bool preserve_world);
  void remove(const EntityId& id, ChildDisposition children);
  EntityId duplicate(const EntityId& id, EntityId parent = {}, bool subtree = true);
  void set_metadata(const EntityId& id, Json::Object metadata);
  void add_component(const EntityId& id, std::string type, Json::Object fields);
  bool remove_component(const EntityId& id, std::string_view type);
  std::optional<Json::Object> component(const EntityId& id, std::string_view type) const;
  std::string serialize() const;
  static Scene deserialize(std::string_view text);
  // Version 1 editor overlays are imported without changing the legacy file.
  static Scene migrate_legacy_edits(std::string_view text, std::string scene);

 private:
  struct Node {
    EntityId id, parent;
    std::string name;
    std::vector<EntityId> children;
    Transform local;
    mutable Mat4 world, inverse;
    mutable bool dirty = true;
    bool active = true;
    Json::Object metadata;
    std::map<std::string, Json::Object> components;
  };
  std::string name_;
  std::unordered_map<EntityId, Node> nodes_;
  std::vector<EntityId> roots_;
  std::unordered_map<std::string, std::set<EntityId>> component_index_;
  std::uint64_t next_id_ = 1;
  Node& require(const EntityId& id);
  const Node& require(const EntityId& id) const;
  void mark_dirty(const EntityId& id);
  void detach(const EntityId& id);
};

// Runtime-only objects and editor-only controls stay outside the saved scene.
class SceneSession {
 public:
  SceneSession(Scene& scene, Context context) : scene_(scene), context_(context) {}
  Context context() const { return context_; }
  Scene& scene() { return scene_; }
  const Scene& scene() const { return scene_; }
  void select(EntityId id);
  const EntityId& selection() const;
  void set_camera(Mat4 view) { camera_ = view; }
  const Mat4& camera() const { return camera_; }
  bool gameplay_enabled() const { return context_ == Context::Runtime; }
 private:
  Scene& scene_;
  Context context_;
  mutable EntityId selected_;
  Mat4 camera_;
};

struct WorldDocument {
  std::uint64_t revision = 0;
  Json updated_at;
  std::vector<Scene> scenes;
  Json::Object extras;  // e.g. authored terrain; account data is never here.
  std::string serialize() const;
  static WorldDocument deserialize(std::string_view text);
  static WorldDocument migrate_legacy_edits(std::string_view text);
  Scene* find_scene(std::string_view name);
};

}  // namespace veldren
