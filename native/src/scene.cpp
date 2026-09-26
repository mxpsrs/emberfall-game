#include "veldren/scene.h"

#include <algorithm>
#include <charconv>
#include <cmath>
#include <cstdio>
#include <iomanip>
#include <limits>
#include <locale>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace veldren {
namespace {

[[noreturn]] void invalid(const char* message) { throw std::invalid_argument(message); }

void append_utf8(std::string& out, unsigned cp) {
  if (cp <= 0x7f) out.push_back(char(cp));
  else if (cp <= 0x7ff) { out.push_back(char(0xc0 | (cp >> 6))); out.push_back(char(0x80 | (cp & 63))); }
  else if (cp <= 0xffff) { out.push_back(char(0xe0 | (cp >> 12))); out.push_back(char(0x80 | ((cp >> 6) & 63))); out.push_back(char(0x80 | (cp & 63))); }
  else { out.push_back(char(0xf0 | (cp >> 18))); out.push_back(char(0x80 | ((cp >> 12) & 63))); out.push_back(char(0x80 | ((cp >> 6) & 63))); out.push_back(char(0x80 | (cp & 63))); }
}

class Parser {
 public:
  explicit Parser(std::string_view input) : input_(input) {}
  Json parse() { Json result = value(0); space(); if (at_ != input_.size()) invalid("Trailing JSON data"); return result; }
 private:
  std::string_view input_;
  std::size_t at_ = 0;
  void space() { while (at_ < input_.size() && (input_[at_] == ' ' || input_[at_] == '\n' || input_[at_] == '\r' || input_[at_] == '\t')) ++at_; }
  bool take(char ch) { space(); if (at_ < input_.size() && input_[at_] == ch) { ++at_; return true; } return false; }
  void expect(char ch) { if (!take(ch)) invalid("Malformed JSON delimiter"); }
  unsigned hex4() {
    if (input_.size() - at_ < 4) invalid("Incomplete Unicode escape");
    unsigned cp = 0;
    for (int i = 0; i < 4; ++i) {
      const char ch = input_[at_++];
      cp <<= 4;
      if (ch >= '0' && ch <= '9') cp |= unsigned(ch - '0');
      else if (ch >= 'a' && ch <= 'f') cp |= unsigned(ch - 'a' + 10);
      else if (ch >= 'A' && ch <= 'F') cp |= unsigned(ch - 'A' + 10);
      else invalid("Invalid Unicode escape");
    }
    return cp;
  }
  std::string string() {
    expect('"'); std::string out;
    while (at_ < input_.size()) {
      const unsigned char ch = static_cast<unsigned char>(input_[at_++]);
      if (ch == '"') return out;
      if (ch < 0x20) invalid("Unescaped control character");
      if (ch != '\\') { out.push_back(char(ch)); continue; }
      if (at_ >= input_.size()) invalid("Incomplete JSON escape");
      const char escaped = input_[at_++];
      switch (escaped) {
        case '"': out.push_back('"'); break;
        case '\\': out.push_back('\\'); break;
        case '/': out.push_back('/'); break;
        case 'b': out.push_back('\b'); break;
        case 'f': out.push_back('\f'); break;
        case 'n': out.push_back('\n'); break;
        case 'r': out.push_back('\r'); break;
        case 't': out.push_back('\t'); break;
        case 'u': {
          unsigned cp = hex4();
          if (cp >= 0xd800 && cp <= 0xdbff) {
            if (at_ + 2 > input_.size() || input_.substr(at_, 2) != "\\u") invalid("Missing low surrogate");
            at_ += 2; const unsigned low = hex4();
            if (low < 0xdc00 || low > 0xdfff) invalid("Invalid low surrogate");
            cp = 0x10000 + ((cp - 0xd800) << 10) + low - 0xdc00;
          } else if (cp >= 0xdc00 && cp <= 0xdfff) invalid("Unpaired low surrogate");
          append_utf8(out, cp); break;
        }
        default: invalid("Invalid JSON escape");
      }
    }
    invalid("Unterminated JSON string");
  }
  Json value(unsigned depth) {
    if (depth > 256) invalid("JSON nesting too deep");
    space(); if (at_ >= input_.size()) invalid("Unexpected end of JSON");
    const char ch = input_[at_];
    if (ch == '"') return string();
    if (ch == '{') {
      ++at_; Json::Object object;
      if (take('}')) return object;
      do { space(); if (at_ >= input_.size() || input_[at_] != '"') invalid("JSON object key required"); auto key = string(); expect(':'); if (!object.emplace(std::move(key), value(depth + 1)).second) invalid("Duplicate JSON key"); if (take('}')) return object; expect(','); } while (true);
    }
    if (ch == '[') {
      ++at_; Json::Array array;
      if (take(']')) return array;
      do { array.push_back(value(depth + 1)); if (take(']')) return array; expect(','); } while (true);
    }
    for (const auto& [word, result] : {std::pair<std::string_view, Json>{"true", true}, {"false", false}, {"null", nullptr}})
      if (input_.substr(at_, word.size()) == word) { at_ += word.size(); return result; }
    const std::size_t begin = at_;
    if (input_[at_] == '-') ++at_;
    if (at_ >= input_.size()) invalid("Invalid JSON number");
    if (input_[at_] == '0') ++at_;
    else { if (input_[at_] < '1' || input_[at_] > '9') invalid("Invalid JSON value"); while (at_ < input_.size() && input_[at_] >= '0' && input_[at_] <= '9') ++at_; }
    if (at_ < input_.size() && input_[at_] == '.') { ++at_; const auto digits = at_; while (at_ < input_.size() && input_[at_] >= '0' && input_[at_] <= '9') ++at_; if (digits == at_) invalid("Invalid JSON fraction"); }
    if (at_ < input_.size() && (input_[at_] == 'e' || input_[at_] == 'E')) { ++at_; if (at_ < input_.size() && (input_[at_] == '-' || input_[at_] == '+')) ++at_; const auto digits = at_; while (at_ < input_.size() && input_[at_] >= '0' && input_[at_] <= '9') ++at_; if (digits == at_) invalid("Invalid JSON exponent"); }
    double number = 0;
    std::istringstream conversion(std::string(input_.substr(begin, at_ - begin)));
    conversion.imbue(std::locale::classic());
    conversion >> std::noskipws >> number;
    if (conversion.fail() || !std::isfinite(number)) invalid("Invalid or nonfinite JSON number");
    return number;
  }
};

void quote(std::string& out, const std::string& value) {
  out.push_back('"');
  for (unsigned char ch : value) {
    switch (ch) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (ch < 32) { char escaped[7]; std::snprintf(escaped, sizeof escaped, "\\u%04x", ch); out += escaped; }
        else out.push_back(char(ch));
    }
  }
  out.push_back('"');
}

void write(std::string& out, const Json& value) {
  if (std::holds_alternative<std::nullptr_t>(value.value)) { out += "null"; return; }
  if (auto v = std::get_if<bool>(&value.value)) { out += *v ? "true" : "false"; return; }
  if (auto v = std::get_if<double>(&value.value)) {
    if (!std::isfinite(*v)) invalid("Nonfinite JSON output");
    std::ostringstream formatted;
    formatted.imbue(std::locale::classic());
    formatted << std::setprecision(std::numeric_limits<double>::max_digits10) << std::defaultfloat << *v;
    if (!formatted) invalid("Could not format JSON number");
    out += formatted.str(); return;
  }
  if (auto v = std::get_if<std::string>(&value.value)) { quote(out, *v); return; }
  if (auto v = std::get_if<Json::Array>(&value.value)) { out.push_back('['); for (const auto& item : *v) { if (&item != &v->front()) out.push_back(','); write(out, item); } out.push_back(']'); return; }
  const auto& object = std::get<Json::Object>(value.value); out.push_back('{');
  for (auto it = object.begin(); it != object.end(); ++it) { if (it != object.begin()) out.push_back(','); quote(out, it->first); out.push_back(':'); write(out, it->second); }
  out.push_back('}');
}

Json vec(Vec3 v) { return Json::Array{v.x, v.y, v.z}; }
Json quat(Quat q) { return Json::Array{q.x, q.y, q.z, q.w}; }
Json matrix(const Mat4& m) { Json::Array a; for (double v : m.v) a.push_back(v); return a; }
std::string string_field(const Json& object, std::string_view key, std::string fallback = {}) {
  const auto* item=object.find(key);return item?item->string_or(std::move(fallback)):fallback;
}
double number_field(const Json& object, std::string_view key, double fallback = 0) {
  const auto* item=object.find(key);return item?item->number_or(fallback):fallback;
}
bool bool_field(const Json& object, std::string_view key, bool fallback = false) {
  const auto* item=object.find(key);return item?item->bool_or(fallback):fallback;
}
Vec3 read_vec(const Json* j, Vec3 fallback) {
  if (!j) return fallback;
  const auto& a = j->array(); if (a.size() != 3) invalid("Expected 3D vector");
  return {a[0].number_or(), a[1].number_or(), a[2].number_or()};
}
Quat read_quat(const Json* j) {
  if (!j) return {};
  const auto& a = j->array(); if (a.size() != 4) invalid("Expected quaternion");
  return normalize({a[0].number_or(), a[1].number_or(), a[2].number_or(), a[3].number_or()});
}
Mat4 read_matrix(const Json& j) {
  const auto& a = j.array(); if (a.size() != 16) invalid("Expected 4x4 affine matrix");
  Mat4 m; for (std::size_t i = 0; i < 16; ++i) m.v[i] = a[i].number_or();
  if (std::abs(m.v[3]) > 1e-9 || std::abs(m.v[7]) > 1e-9 || std::abs(m.v[11]) > 1e-9 || std::abs(m.v[15] - 1) > 1e-9) invalid("Matrix must be affine");
  inverse_affine(m); return m;
}

Transform approximate(const Mat4& m) {
  Transform t; t.position = {m.v[12], m.v[13], m.v[14]};
  t.scale = {std::hypot(m.v[0], m.v[1], m.v[2]), std::hypot(m.v[4], m.v[5], m.v[6]), std::hypot(m.v[8], m.v[9], m.v[10])};
  if (t.scale.x < 1e-12 || t.scale.y < 1e-12 || t.scale.z < 1e-12) invalid("Singular transform");
  const double a = m.v[0]/t.scale.x, b = m.v[4]/t.scale.y, c = m.v[8]/t.scale.z;
  const double d = m.v[1]/t.scale.x, e = m.v[5]/t.scale.y, f = m.v[9]/t.scale.z;
  const double g = m.v[2]/t.scale.x, h = m.v[6]/t.scale.y, i = m.v[10]/t.scale.z;
  const double trace = a + e + i;
  if (trace > 0) { const double s = 2*std::sqrt(trace+1); t.rotation = {(h-f)/s,(c-g)/s,(d-b)/s,s/4}; }
  else if (a > e && a > i) { const double s=2*std::sqrt(1+a-e-i); t.rotation={s/4,(b+d)/s,(c+g)/s,(h-f)/s}; }
  else if (e > i) { const double s=2*std::sqrt(1+e-a-i); t.rotation={(b+d)/s,s/4,(f+h)/s,(c-g)/s}; }
  else { const double s=2*std::sqrt(1+i-a-e); t.rotation={(c+g)/s,(f+h)/s,s/4,(d-b)/s}; }
  t.rotation = normalize(t.rotation); t.affine = m; return t;
}

void validate_transform(Transform& t) {
  for (double n : {t.position.x,t.position.y,t.position.z,t.scale.x,t.scale.y,t.scale.z}) if (!std::isfinite(n)) invalid("Nonfinite transform");
  if (std::abs(t.scale.x) < 1e-12 || std::abs(t.scale.y) < 1e-12 || std::abs(t.scale.z) < 1e-12) invalid("Zero transform scale");
  t.rotation = normalize(t.rotation);
  if (t.affine) {
    const auto& m=t.affine->v;
    for(double v:m)if(!std::isfinite(v))invalid("Nonfinite affine transform");
    if(std::abs(m[3])>1e-9||std::abs(m[7])>1e-9||std::abs(m[11])>1e-9||std::abs(m[15]-1)>1e-9)invalid("Matrix must be affine");
    inverse_affine(*t.affine);
  }
}
}  // namespace

const Json::Object& Json::object() const { if (auto p = std::get_if<Object>(&value)) return *p; invalid("Expected JSON object"); }
const Json::Array& Json::array() const { if (auto p = std::get_if<Array>(&value)) return *p; invalid("Expected JSON array"); }
const Json* Json::find(std::string_view key) const { if (auto p = std::get_if<Object>(&value)) { auto it = p->find(std::string(key)); return it == p->end() ? nullptr : &it->second; } return nullptr; }
std::string Json::string_or(std::string fallback) const { if (auto p=std::get_if<std::string>(&value)) return *p; return fallback; }
double Json::number_or(double fallback) const { if (auto p=std::get_if<double>(&value)) return *p; return fallback; }
bool Json::bool_or(bool fallback) const { if (auto p=std::get_if<bool>(&value)) return *p; return fallback; }
Json parse_json(std::string_view text) { return Parser(text).parse(); }
std::string write_json(const Json& value) { std::string result; write(result, value); return result; }

Quat normalize(Quat q) {
  const double length = std::hypot(std::hypot(q.x, q.y), q.z, q.w);
  if (!std::isfinite(length) || length < 1e-12) invalid("Invalid rotation");
  return {q.x/length,q.y/length,q.z/length,q.w/length};
}
Mat4 multiply(const Mat4& a, const Mat4& b) {
  Mat4 out; for (int col=0;col<4;++col) for (int row=0;row<4;++row) { out.v[col*4+row]=0; for (int k=0;k<4;++k) out.v[col*4+row]+=a.v[k*4+row]*b.v[col*4+k]; } return out;
}
Mat4 compose(const Transform& t) {
  if (t.affine) return *t.affine;
  const auto q=normalize(t.rotation); const double x=q.x,y=q.y,z=q.z,w=q.w;
  Mat4 m; m.v={
    (1-2*(y*y+z*z))*t.scale.x,(2*(x*y+z*w))*t.scale.x,(2*(x*z-y*w))*t.scale.x,0,
    (2*(x*y-z*w))*t.scale.y,(1-2*(x*x+z*z))*t.scale.y,(2*(y*z+x*w))*t.scale.y,0,
    (2*(x*z+y*w))*t.scale.z,(2*(y*z-x*w))*t.scale.z,(1-2*(x*x+y*y))*t.scale.z,0,
    t.position.x,t.position.y,t.position.z,1}; return m;
}
Mat4 inverse_affine(const Mat4& m) {
  const auto& a=m.v;
  const double c00=a[5]*a[10]-a[9]*a[6], c01=a[8]*a[6]-a[4]*a[10], c02=a[4]*a[9]-a[8]*a[5];
  const double determinant=a[0]*c00+a[1]*c01+a[2]*c02;
  if (!std::isfinite(determinant) || std::abs(determinant)<1e-12) invalid("Singular world transform");
  const double d=1/determinant; Mat4 out;
  out.v={c00*d,(a[9]*a[2]-a[1]*a[10])*d,(a[1]*a[6]-a[5]*a[2])*d,0,
    c01*d,(a[0]*a[10]-a[8]*a[2])*d,(a[4]*a[2]-a[0]*a[6])*d,0,
    c02*d,(a[8]*a[1]-a[0]*a[9])*d,(a[0]*a[5]-a[4]*a[1])*d,0, 0,0,0,1};
  const auto p=transform_point(out,{-a[12],-a[13],-a[14]}); out.v[12]=p.x; out.v[13]=p.y; out.v[14]=p.z; return out;
}
Vec3 transform_point(const Mat4& m, Vec3 p) { return {m.v[0]*p.x+m.v[4]*p.y+m.v[8]*p.z+m.v[12],m.v[1]*p.x+m.v[5]*p.y+m.v[9]*p.z+m.v[13],m.v[2]*p.x+m.v[6]*p.y+m.v[10]*p.z+m.v[14]}; }

Scene::Node& Scene::require(const EntityId& id) { auto it=nodes_.find(id); if (it==nodes_.end()) throw std::out_of_range("Scene entity not found: "+id); return it->second; }
const Scene::Node& Scene::require(const EntityId& id) const { auto it=nodes_.find(id); if (it==nodes_.end()) throw std::out_of_range("Scene entity not found: "+id); return it->second; }
bool Scene::contains(const EntityId& id) const { return nodes_.contains(id); }
EntityId Scene::create(std::string name, EntityId parent, EntityId id) {
  if (!parent.empty()) require(parent);
  if (id.empty()) {
    if (next_id_==std::numeric_limits<std::uint64_t>::max())invalid("Entity ID space exhausted");
    do { id="entity-"+std::to_string(next_id_++); } while (contains(id));
  }
  if (id.empty() || contains(id)) invalid("Duplicate or empty entity ID");
  if (id.starts_with("entity-")) {
    std::uint64_t suffix=0;const auto begin=id.data()+7,end=id.data()+id.size();
    const auto parsed=std::from_chars(begin,end,suffix);
    if(parsed.ec==std::errc{}&&parsed.ptr==end&&suffix>=next_id_){
      if(suffix==std::numeric_limits<std::uint64_t>::max())invalid("Entity ID space exhausted");
      next_id_=suffix+1;
    }
  }
  Node node; node.id=id; node.parent=parent; node.name=std::move(name);
  nodes_.emplace(id,std::move(node));
  if (parent.empty()) roots_.push_back(id); else require(parent).children.push_back(id);
  return id;
}
void Scene::mark_dirty(const EntityId& id) {
  if(require(id).children.empty()){require(id).dirty=true;return;}
  std::vector<EntityId> pending{id};
  while (!pending.empty()) { auto next=std::move(pending.back());pending.pop_back();auto& n=require(next);n.dirty=true;pending.insert(pending.end(),n.children.begin(),n.children.end()); }
}
Mat4 Scene::world_transform(const EntityId& id) const {
  std::vector<const Node*> chain; const Node* n=&require(id);
  while (n->dirty) { chain.push_back(n); if (n->parent.empty()) break; n=&require(n->parent); }
  while (!chain.empty()) { const Node* current=chain.back();chain.pop_back();current->world=current->parent.empty()?compose(current->local):multiply(require(current->parent).world,compose(current->local));current->inverse=inverse_affine(current->world);current->dirty=false; }
  return require(id).world;
}
Vec3 Scene::local_to_world(const EntityId& id,Vec3 p) const { return transform_point(world_transform(id),p); }
Vec3 Scene::world_to_local(const EntityId& id,Vec3 p) const { world_transform(id);return transform_point(require(id).inverse,p); }
EntitySnapshot Scene::inspect(const EntityId& id) const {
  const auto& n=require(id); EntitySnapshot s{n.id,n.name,n.parent,n.children,n.local,world_transform(id),n.active,n.active,n.metadata,n.components};
  for (auto parent=n.parent; !parent.empty(); parent=require(parent).parent) if (!require(parent).active) s.active_in_hierarchy=false;
  return s;
}
std::vector<EntityId> Scene::traverse() const {
  std::vector<EntityId> out,stack(roots_.rbegin(),roots_.rend());out.reserve(size());
  while (!stack.empty()) { auto id=std::move(stack.back());stack.pop_back();out.push_back(id);const auto& children=require(id).children;stack.insert(stack.end(),children.rbegin(),children.rend()); }
  return out;
}
std::vector<EntityId> Scene::entities_with(std::string_view type) const {
  const auto& entries=component_entities(type);return {entries.begin(),entries.end()};
}
const std::set<EntityId>& Scene::component_entities(std::string_view type) const {
  static const std::set<EntityId> empty;
  const auto it=component_index_.find(std::string(type));return it==component_index_.end()?empty:it->second;
}
void Scene::rename(const EntityId& id,std::string name) { require(id).name=std::move(name); }
void Scene::set_active(const EntityId& id,bool active) { require(id).active=active; }
void Scene::set_local(const EntityId& id,Transform local) { validate_transform(local);require(id).local=std::move(local);mark_dirty(id); }
Transform Scene::local_transform(const EntityId& id) const { return require(id).local; }
void Scene::detach(const EntityId& id) { const auto parent=require(id).parent;auto& siblings=parent.empty()?roots_:require(parent).children;auto it=std::find(siblings.begin(),siblings.end(),id);if(it==siblings.end())invalid("Broken scene hierarchy");siblings.erase(it); }
void Scene::reparent(const EntityId& id,const EntityId& parent,bool preserve_world) {
  require(id);if(id==parent)invalid("Entity cannot parent itself");
  for(auto p=parent;!p.empty();p=require(p).parent)if(p==id)invalid("Scene hierarchy cycle");
  if(require(id).parent==parent)return;
  const Mat4 before=preserve_world?world_transform(id):Mat4{};
  const Mat4 destination=parent.empty()?Mat4{}:world_transform(parent);
  Transform local=preserve_world?approximate(multiply(inverse_affine(destination),before)):require(id).local;
  detach(id);auto& node=require(id);node.parent=parent;node.local=std::move(local);
  if(parent.empty())roots_.push_back(id);else require(parent).children.push_back(id);
  mark_dirty(id);
}
void Scene::remove(const EntityId& id,ChildDisposition children) {
  require(id);
  if(children==ChildDisposition::ReparentToRoot){for(const auto& child:require(id).children) { const Mat4 before=world_transform(child);auto& n=require(child);n.local=approximate(before);n.parent.clear();roots_.push_back(child);mark_dirty(child); }require(id).children.clear();}
  std::vector<EntityId> ids{id};
  if(children==ChildDisposition::Destroy)for(std::size_t i=0;i<ids.size();++i){const auto& n=require(ids[i]);ids.insert(ids.end(),n.children.begin(),n.children.end());}
  detach(id);
  for(const auto& removed:ids){for(const auto& [type,fields]:require(removed).components){(void)fields;auto at=component_index_.find(type);at->second.erase(removed);if(at->second.empty())component_index_.erase(at);}nodes_.erase(removed);}
}
EntityId Scene::duplicate(const EntityId& id,EntityId parent,bool subtree) {
  require(id);if(!parent.empty())require(parent);
  std::vector<EntityId> source{id};
  if(subtree)for(std::size_t i=0;i<source.size();++i){const auto& child=require(source[i]).children;source.insert(source.end(),child.begin(),child.end());}
  std::unordered_map<EntityId,EntityId> mapped;
  for(const auto& original:source){const auto copy=inspect(original);const auto target=create(copy.name,original==id?parent:mapped.at(copy.parent));mapped.emplace(original,target);set_local(target,copy.local);set_active(target,copy.active);set_metadata(target,copy.metadata);for(const auto& [type,fields]:copy.components)add_component(target,type,fields);}
  return mapped.at(id);
}
void Scene::set_metadata(const EntityId& id,Json::Object metadata){require(id).metadata=std::move(metadata);}
void Scene::add_component(const EntityId& id,std::string type,Json::Object fields){if(type.empty())invalid("Component type cannot be empty");require(id).components[type]=std::move(fields);component_index_[type].insert(id);}
bool Scene::remove_component(const EntityId& id,std::string_view type){const auto key=std::string(type);if(!require(id).components.erase(key))return false;auto it=component_index_.find(key);it->second.erase(id);if(it->second.empty())component_index_.erase(it);return true;}
std::optional<Json::Object> Scene::component(const EntityId& id,std::string_view type) const {const auto& c=require(id).components;auto it=c.find(std::string(type));if(it==c.end())return std::nullopt;return it->second;}
void Scene::set_world(const EntityId& id, Transform world) {
  const auto& parent = require(id).parent;
  const auto local = parent.empty() ? compose(world) : multiply(inverse_affine(world_transform(parent)), compose(world));
  set_local(id, approximate(local));
}
Json Scene::entity_json(const EntityId& id, bool include_derived) const {
  const auto& n=require(id);
  Json::Object local{{"position",vec(n.local.position)},{"rotation",quat(n.local.rotation)},{"scale",vec(n.local.scale)}};
  if(n.local.affine)local["affine"]=matrix(*n.local.affine);
  Json::Object components;for(const auto& [type,fields]:n.components)components[type]=fields;
  Json::Object result{{"id",n.id},{"name",n.name},{"parent",n.parent.empty()?Json(nullptr):Json(n.parent)},{"active",n.active},{"transform",std::move(local)},{"components",std::move(components)},{"metadata",n.metadata}};
  if(include_derived){result["worldMatrix"]=matrix(world_transform(id));result["activeInHierarchy"]=inspect(id).active_in_hierarchy;}
  return result;
}
std::string Scene::serialize() const {
  Json::Array entities;
  for(const auto& id:traverse()){
    entities.push_back(entity_json(id));
  }
  return write_json(Json::Object{{"format","veldren.scene"},{"version",2},{"scene",name_},{"nextEntityId",std::to_string(next_id_)},{"entities",std::move(entities)}})+"\n";
}
Scene Scene::deserialize(std::string_view text){
  const Json root=parse_json(text);if(string_field(root,"format")!="veldren.scene"||number_field(root,"version")!=2)invalid("Unsupported scene format/version");
  Scene scene(string_field(root,"scene"));if(scene.name_.empty())invalid("Scene name required");
  const auto& entities=root.find("entities")?root.find("entities")->array():Json::Array{};
  // Loading is transactional: first validate IDs and parents, then fill a fresh scene.
  std::set<EntityId> ids;for(const auto& entry:entities){const auto id=string_field(entry,"id");if(id.empty()||!ids.insert(id).second)invalid("Duplicate or empty entity ID");}
  for(const auto& entry:entities){const auto id=string_field(entry,"id"),parent=string_field(entry,"parent");if(!parent.empty()&&!ids.contains(parent))invalid("Missing scene parent");scene.create(string_field(entry,"name"),{},id);}
  for(const auto& entry:entities){const auto id=string_field(entry,"id"),parent=string_field(entry,"parent");if(!parent.empty())scene.reparent(id,parent,false);
    const auto* t=entry.find("transform");Transform local;
    if(t){local.position=read_vec(t->find("position"),{});local.rotation=read_quat(t->find("rotation"));local.scale=read_vec(t->find("scale"),{1,1,1});if(const auto* affine=t->find("affine"))local.affine=read_matrix(*affine);}
    scene.set_local(id,local);scene.set_active(id,bool_field(entry,"active",true));if(const auto* m=entry.find("metadata"))scene.set_metadata(id,m->object());
    if(const auto* components=entry.find("components"))for(const auto& [type,fields]:components->object())scene.add_component(id,type,fields.object());
  }
  // Keep authored sibling order, including roots, independent of hash order.
  std::vector<EntityId> order;for(const auto& entry:entities)order.push_back(string_field(entry,"id"));
  std::map<EntityId,std::size_t> index;for(std::size_t i=0;i<order.size();++i)index[order[i]]=i;
  const auto by_order=[&](const auto& a,const auto& b){return index.at(a)<index.at(b);};
  std::sort(scene.roots_.begin(),scene.roots_.end(),by_order);
  for(auto& [id,node]:scene.nodes_){(void)id;std::sort(node.children.begin(),node.children.end(),by_order);}
  if(const auto* next=root.find("nextEntityId")){
    const auto value=next->string_or();std::uint64_t parsed_value=0;
    const auto result=std::from_chars(value.data(),value.data()+value.size(),parsed_value);
    if(result.ec!=std::errc{}||result.ptr!=value.data()+value.size()||parsed_value==0)invalid("Invalid next scene entity ID");
    scene.next_id_=std::max(scene.next_id_,parsed_value);
  }
  return scene;
}
Scene Scene::migrate_legacy_edits(std::string_view text,std::string name){
  const Json legacy=parse_json(text);if(number_field(legacy,"version")!=1)invalid("Expected version 1 world edits");Scene scene(std::move(name));
  for(const auto& change:legacy.find("changes")->array()){
    if(string_field(change,"scene")!=scene.name_)continue;
    const auto kind=string_field(change,"kind"),legacy_id=string_field(change,"id");
    if((kind!="object"&&kind!="building")||legacy_id.empty())invalid("Invalid legacy world edit");
    const auto id=scene.name_+":"+kind+":"+legacy_id;
    const auto object_name=string_field(change,"name",legacy_id);scene.create(object_name,{},id);
    const double radians=number_field(change,"rotation",number_field(change,"yaw")*180/3.141592653589793)*3.141592653589793/180;
    Transform t;t.position={number_field(change,"x"),0,number_field(change,"y")};t.rotation={0,std::sin(radians/2),0,std::cos(radians/2)};
    const double scale=number_field(change,"scale",1);t.scale={scale,scale,scale};scene.set_local(id,t);
    scene.add_component(id,"LegacyWorldEdit",{{"change",change}});
    if(const auto* data=change.find("data"))if(const auto* asset=data->find("editorAsset")){
      const auto source=string_field(*asset,"source"),key=string_field(*asset,"key");
      if(!source.empty()&&!key.empty())scene.add_component(id,"MeshRenderer",{{"asset",source+":"+key},{"visible",true}});
    }
    scene.set_metadata(id,{{"legacyKind",kind},{"legacyId",legacy_id}});
  }
  return scene;
}
void SceneSession::select(EntityId id){if(context_!=Context::Editor)invalid("Selection belongs to editor sessions");if(!id.empty()&&!scene_.contains(id))invalid("Selected entity does not exist");selected_=std::move(id);}
const EntityId& SceneSession::selection() const {if(!selected_.empty()&&!scene_.contains(selected_))selected_.clear();return selected_;}

std::string WorldDocument::serialize() const {
  Json::Array entries;std::set<std::string> names;
  for(const auto& scene:scenes){if(!names.insert(scene.name()).second)invalid("Duplicate world scene");entries.push_back(parse_json(scene.serialize()));}
  Json::Object root=extras;
  root["format"]="veldren.world";root["version"]=2;
  root["revision"]=double(revision);root["updatedAt"]=updated_at;
  root["scenes"]=std::move(entries);
  return write_json(root)+"\n";
}
WorldDocument WorldDocument::deserialize(std::string_view text){
  const auto root=parse_json(text);
  if(string_field(root,"format")!="veldren.world"||number_field(root,"version")!=2)invalid("Unsupported world document");
  const double revision=number_field(root,"revision");
  if(!std::isfinite(revision)||revision<0||revision>9007199254740991.0||std::floor(revision)!=revision)invalid("Invalid world revision");
  WorldDocument world;world.revision=static_cast<std::uint64_t>(revision);
  if(const auto* at=root.find("updatedAt"))world.updated_at=*at;
  const auto* entries=root.find("scenes");if(!entries)invalid("Missing world scenes");
  std::set<std::string> names;
  for(const auto& entry:entries->array()){auto scene=Scene::deserialize(write_json(entry));if(!names.insert(scene.name()).second)invalid("Duplicate world scene");world.scenes.push_back(std::move(scene));}
  world.extras=root.object();
  for(const auto* key:{"format","version","revision","updatedAt","scenes"})world.extras.erase(key);
  return world;
}
WorldDocument WorldDocument::migrate_legacy_edits(std::string_view text){
  const auto legacy=parse_json(text);
  if(number_field(legacy,"version")!=1)invalid("Expected version 1 world edits");
  const auto* changes=legacy.find("changes");if(!changes)invalid("Missing legacy world edits");
  const double revision=number_field(legacy,"revision");
  if(revision<0||revision>9007199254740991.0||std::floor(revision)!=revision)invalid("Invalid world revision");
  WorldDocument world;world.revision=static_cast<std::uint64_t>(revision);
  if(const auto* at=legacy.find("updatedAt"))world.updated_at=*at;
  if(const auto* terrain=legacy.find("terrain"))world.extras["terrain"]=*terrain;
  std::set<std::string> names;
  for(const auto& change:changes->array()){
    const auto name=string_field(change,"scene");if(name.empty())invalid("Legacy edit missing scene");
    names.insert(name);
  }
  for(const auto& name:names)world.scenes.push_back(Scene::migrate_legacy_edits(text,name));
  return world;
}
Scene* WorldDocument::find_scene(std::string_view name){for(auto& scene:scenes)if(scene.name()==name)return &scene;return nullptr;}
}  // namespace veldren
