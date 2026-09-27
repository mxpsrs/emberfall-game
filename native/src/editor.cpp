#include "veldren/editor.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace veldren {
namespace {
[[noreturn]] void fail(const std::string& message) { throw std::invalid_argument(message); }
std::string text(const Json& value, const char* key, std::string fallback = {}) {
  const auto* field=value.find(key);return field?field->string_or(std::move(fallback)):fallback;
}
const Json& required(const Json& value,const char* key) {
  const auto* field=value.find(key);if(!field)fail(std::string("Missing ")+key);return *field;
}
double number(const Json& value) {
  const auto* n=std::get_if<double>(&value.value);if(!n||!std::isfinite(*n))fail("A finite number is required");return *n;
}
void finite_fields(const Json& value,unsigned depth=0) {
  if(depth>32)fail("Component nesting exceeds limit");
  if(const auto* n=std::get_if<double>(&value.value)){if(!std::isfinite(*n))fail("Invalid numeric component field");}
  else if(const auto* a=std::get_if<Json::Array>(&value.value)){for(const auto& item:*a)finite_fields(item,depth+1);}
  else if(const auto* o=std::get_if<Json::Object>(&value.value)){for(const auto& [key,item]:*o){(void)key;finite_fields(item,depth+1);}}
}
Transform transform(const Json& value) {
  Transform out;
  auto vec=[&](const char* key,Vec3 fallback){if(const auto* field=value.find(key)){const auto& a=field->array();if(a.size()!=3)fail("Transform vector requires three numbers");return Vec3{number(a[0]),number(a[1]),number(a[2])};}return fallback;};
  out.position=vec("position",{});out.scale=vec("scale",{1,1,1});
  if(const auto* q=value.find("rotation")){const auto& a=q->array();if(a.size()!=4)fail("Rotation requires a quaternion");out.rotation={number(a[0]),number(a[1]),number(a[2]),number(a[3])};}
  if(const auto* m=value.find("affine")){if(m->array().size()!=16)fail("Affine transform requires sixteen numbers");Mat4 matrix;for(unsigned i=0;i<16;++i)matrix.v[i]=number(m->array()[i]);out.affine=matrix;}
  // The accepted Scene performs invertibility, scale and quaternion validation.
  Scene validation;validation.create("Transform",{},"test");validation.set_local("test",out);return out;
}
void validate_component(const std::string& type,const Json::Object& fields,const EditorHistory::AssetValidator& assets) {
  if(type.empty()||type=="Transform"||type=="RuntimeBinding"||type=="LegacyWorldEdit")fail("Component is intrinsic or reserved");
  finite_fields(fields);
  if(type=="PlayerRepresentation"||type=="ActorController")fail("Runtime player state cannot be authored in the editor");
  auto nonnegative=[&](const char* key){auto at=fields.find(key);if(at!=fields.end()&&number(at->second)<0)fail(std::string(key)+" must be nonnegative");};
  if(type=="Light"){nonnegative("intensity");nonnegative("range");nonnegative("radius");}
  if(type=="Collider"){nonnegative("radius");nonnegative("height");}
  auto vector_field=[&](const char* key,bool positive){const auto at=fields.find(key);if(at==fields.end())return;const auto& values=at->second.array();if(values.size()!=3)fail(std::string(key)+" requires three numbers");for(const auto& value:values)if(positive?number(value)<=0:!std::isfinite(number(value)))fail(std::string("Invalid ")+key);};
  if(type=="Collider")vector_field("size",true);
  if(type=="Light"){vector_field("color",false);const auto at=fields.find("type");if(at!=fields.end()&&!std::set<std::string>{"point","spot","directional","sun"}.contains(at->second.string_or()))fail("Unsupported light type");}
  if(type=="SpawnPoint"){vector_field("homeOffset",false);vector_field("renderOrigin",false);}
  if(type=="MeshRenderer"){const auto at=fields.find("asset");if(at==fields.end()||at->second.string_or().empty())fail("MeshRenderer requires an asset reference");}
  for(const auto* key:{"visible","castShadows","receiveShadows","solid","stationary"}){const auto at=fields.find(key);if(at!=fields.end()&&!std::holds_alternative<bool>(at->second.value))fail(std::string(key)+" requires a boolean");}
  for(const auto& [key,value]:fields){
    if((type=="SpawnPoint"||type=="Gatherable"||type=="CombatStats")&&(key=="hp"||key=="dead"||key=="respawnAt"||key=="attackAt"||key=="target"))fail("Transient gameplay state is not a permanent component field");
    const std::string expected=key=="asset"?"model":key=="material"?"material":key=="texture"?"texture":"";
    if(!expected.empty()&&assets){const auto id=value.string_or();if(!id.empty()&&!assets(id,expected))fail("Unknown or incompatible asset reference: "+id);}
  }
}
}

void EditorHistory::touch(Scene& scene,const EntityId& id) {
  if(pending_->before.contains(id))return;
  const auto found=scene.nodes_.find(id);pending_->before.emplace(id,found==scene.nodes_.end()?std::nullopt:std::optional(found->second));
}
void EditorHistory::touch_branch(Scene& scene,const EntityId& id) {
  std::vector<EntityId> ids{id};for(std::size_t i=0;i<ids.size();++i){touch(scene,ids[i]);const auto& children=scene.require(ids[i]).children;ids.insert(ids.end(),children.begin(),children.end());}
}
void EditorHistory::restore(Scene& scene,const Patch& patch,const std::vector<EntityId>& roots) {
  for(const auto& [id,node]:patch){
    const auto old=scene.nodes_.find(id);
    if(old!=scene.nodes_.end())for(const auto& [type,fields]:old->second.components){(void)fields;auto& ids=scene.component_index_[type];ids.erase(id);if(ids.empty())scene.component_index_.erase(type);}
    if(node){scene.nodes_[id]=*node;for(const auto& [type,fields]:node->components){(void)fields;scene.component_index_[type].insert(id);}}
    else scene.nodes_.erase(id);
  }
  scene.roots_=roots;
  for(const auto& [id,node]:patch)if(node)scene.mark_dirty(id);
}
void EditorHistory::begin(Scene& scene,const std::string& label) {
  if(pending_)fail("An editor transaction is already open");
  pending_=Record{};pending_->label=label;pending_->before_roots=scene.roots_;pending_->before_state=state_;
}
std::optional<Json> EditorHistory::terrain() const {
  if(!document_extras_)return std::nullopt;
  const auto at=document_extras_->find("terrain");return at==document_extras_->end()?std::nullopt:std::optional(at->second);
}
void EditorHistory::restore_terrain(const std::optional<Json>& value) {
  if(!document_extras_)fail("Terrain requires a canonical WorldDocument");
  if(value)(*document_extras_)["terrain"]=*value;else document_extras_->erase("terrain");
  terrain_changed_=true;
}
bool EditorHistory::commit(Scene& scene) {
  if(!pending_)fail("No editor transaction is open");
  bool different=scene.roots_!=pending_->before_roots;
  if(pending_->terrain_touched){pending_->after_terrain=terrain();different=different||pending_->before_terrain!=pending_->after_terrain;}
  for(const auto& [id,before]:pending_->before){
    const auto at=scene.nodes_.find(id);pending_->after[id]=at==scene.nodes_.end()?std::nullopt:std::optional(at->second);
    // Cached matrices/dirty flags are derived; history compares persistent fields.
    if(bool(before)!=bool(pending_->after[id]))different=true;
    else if(before){
      const auto& after=*pending_->after[id];
      if(before->name!=after.name||before->parent!=after.parent||before->children!=after.children||before->active!=after.active||before->metadata!=after.metadata||before->components!=after.components||compose(before->local).v!=compose(after.local).v)different=true;
    }
  }
  if(different){pending_->after_roots=scene.roots_;pending_->after_state=++serial_;state_=serial_;undo_.push_back(std::move(*pending_));redo_.clear();if(undo_.size()>256)undo_.erase(undo_.begin());}
  pending_.reset();return different;
}
void EditorHistory::cancel(Scene& scene) {if(!pending_)return;restore(scene,pending_->before,pending_->before_roots);if(pending_->terrain_touched)restore_terrain(pending_->before_terrain);pending_.reset();}
void EditorHistory::clear(){undo_.clear();redo_.clear();pending_.reset();state_=saved_=serial_=0;affected_.clear();created_.clear();}

void EditorHistory::apply(Scene& scene,const Json& op,const AssetValidator& assets) {
  const auto kind=text(op,"op"),id=text(op,"id");
  if(kind=="terrain"){
    if(scene.name()!="overworld"||!document_extras_)fail("Terrain editing requires the overworld document");
    const auto& value=required(op,"value");
    if(number(required(value,"version"))!=1)fail("Invalid terrain version");
    const auto& scenes=required(value,"scenes").object();
    for(const auto& [name,data]:scenes){
      if(name!="overworld")fail("Invalid terrain scene");
      for(const auto* key:{"heightNodes","paintCells"}){
        const auto& entries=required(data,key).array();if(entries.size()>25000)fail("Too many terrain edits");
        std::set<std::pair<int,int>> seen;
        for(const auto& item:entries){
          const auto x=number(required(item,"x")),z=number(required(item,"z"));
          if(x< -128||x>2048||z< -128||z>2048||std::floor(x)!=x||std::floor(z)!=z)fail("Invalid terrain coordinate");
          if(!seen.emplace(int(x),int(z)).second)fail("Duplicate terrain coordinate");
          if(std::string(key)=="heightNodes"){const auto delta=number(required(item,"delta"));if(delta< -16||delta>16)fail("Invalid terrain height offset");}
          else if(!std::set<std::string>{"grass","dirt","stone","paving"}.contains(text(item,"material")))fail("Invalid terrain material");
        }
      }
    }
    if(!pending_->terrain_touched){pending_->before_terrain=terrain();pending_->terrain_touched=true;}
    restore_terrain(value);return;
  }
  if(kind.starts_with("prefab")){apply_prefab(scene,op,assets);return;}
  if(kind=="replace"){
    const auto& value=required(op,"entity");const auto target=text(value,"id");
    if(!scene.contains(target)){auto create=op.object();create["op"]="create";apply(scene,create,assets);return;}
    const auto current=scene.inspect(target);const auto parent=text(value,"parent");
    const auto pose=value.find("transform")?transform(*value.find("transform")):Transform{};
    const auto fields=required(value,"components").object();
    for(const auto& [type,data]:fields){const auto old=current.components.find(type);if(old==current.components.end()||old->second!=data.object())validate_component(type,data.object(),assets);}
    touch(scene,target);if(!current.parent.empty())touch(scene,current.parent);if(!parent.empty())touch(scene,parent);
    scene.reparent(target,parent,false);scene.set_local(target,pose);scene.rename(target,text(value,"name",current.name));
    scene.set_active(target,value.find("active")?value.find("active")->bool_or(true):true);
    scene.set_metadata(target,value.find("metadata")?value.find("metadata")->object():Json::Object{});
    for(const auto& [type,data]:current.components){(void)data;if(!fields.contains(type))scene.remove_component(target,type);}
    for(const auto& [type,data]:fields)scene.add_component(target,type,data.object());
    affected_.emplace_back(target);return;
  }
  if(kind=="create"){
    const auto& value=required(op,"entity");const auto name=text(value,"name","Entity"),parent=text(value,"parent");auto requested=text(value,"id");
    const auto pose=value.find("transform")?transform(*value.find("transform")):Transform{};
    const auto fields=value.find("components")?value.find("components")->object():Json::Object{};
    for(const auto& [type,data]:fields)validate_component(type,data.object(),assets);
    if(!parent.empty()){scene.require(parent);touch(scene,parent);}if(!requested.empty()){if(scene.contains(requested))fail("Duplicate entity ID");touch(scene,requested);}
    const auto made=scene.create(name,parent,requested);if(requested.empty())pending_->before.emplace(made,std::nullopt);
    scene.set_local(made,pose);scene.set_active(made,value.find("active")?value.find("active")->bool_or(true):true);
    if(const auto* metadata=value.find("metadata"))scene.set_metadata(made,metadata->object());
    for(const auto& [type,data]:fields)scene.add_component(made,type,data.object());
    created_.emplace_back(made);affected_.emplace_back(made);return;
  }
  scene.require(id);touch(scene,id);affected_.emplace_back(id);
  if(kind=="transform"||kind=="translate"||kind=="rotate"||kind=="scale"){
    const auto pose=transform(required(op,"transform"));if(text(op,"space","local")=="world")scene.set_world(id,pose);else scene.set_local(id,pose);
  }else if(kind=="rename"){const auto name=text(op,"name");if(name.empty()||name.size()>256)fail("Name must contain 1–256 characters");scene.rename(id,name);
  }else if(kind=="active"){const auto& value=required(op,"active");if(!std::holds_alternative<bool>(value.value))fail("Active must be a boolean");scene.set_active(id,value.bool_or());
  }else if(kind=="reparent"){
    const auto parent=text(op,"parent"),previous=scene.require(id).parent;
    if(!parent.empty())touch(scene,parent);
    if(!previous.empty())touch(scene,previous);
    scene.reparent(id,parent,op.find("preserveWorld")?op.find("preserveWorld")->bool_or(true):true);
  }else if(kind=="delete"){
    if(scene.component(id,"PrefabDefinition"))for(const auto& instance:scene.entities_with("PrefabInstance"))if(scene.component(instance,"PrefabInstance")->at("definition").string_or()==id)fail("Unpack or delete prefab instances before deleting their definition");
    const auto parent=scene.require(id).parent;if(!parent.empty())touch(scene,parent);touch_branch(scene,id);scene.remove(id,ChildDisposition::Destroy);
  }else if(kind=="duplicate"){
    const auto parent=op.find("parent")?text(op,"parent"):scene.require(id).parent;if(!parent.empty()){scene.require(parent);touch(scene,parent);}
    std::vector<EntityId> originals{id};for(std::size_t i=0;i<originals.size();++i){const auto& children=scene.require(originals[i]).children;originals.insert(originals.end(),children.begin(),children.end());}
    const auto made=scene.duplicate(id,parent,true);std::vector<EntityId> ids{made};
    for(std::size_t i=0;i<ids.size();++i){pending_->before.emplace(ids[i],std::nullopt);const auto& children=scene.require(ids[i]).children;ids.insert(ids.end(),children.begin(),children.end());affected_.emplace_back(ids[i]);}
    std::map<EntityId,EntityId> mapping;for(std::size_t i=0;i<ids.size();++i)mapping[originals[i]]=ids[i];
    std::function<void(Json&)> rewrite=[&](Json& value){if(auto* s=std::get_if<std::string>(&value.value)){if(mapping.contains(*s))*s=mapping.at(*s);}else if(auto* a=std::get_if<Json::Array>(&value.value)){for(auto& child:*a)rewrite(child);}else if(auto* o=std::get_if<Json::Object>(&value.value)){for(auto& [key,child]:*o){(void)key;rewrite(child);}}};
    for(const auto& copy:ids){auto& node=scene.require(copy);for(auto& [type,fields]:node.components){Json value(fields);rewrite(value);fields=value.object();if(fields.contains("generationKey"))fields["generationKey"]="editor-copy:"+copy;if(type=="CatalogIdentity")fields["id"]=copy;}Json metadata(node.metadata);rewrite(metadata);node.metadata=metadata.object();}
    created_.emplace_back(made);
  }else if(kind=="addComponent"||kind=="setComponent"||kind=="field"||kind=="asset"||kind=="material"){
    const auto type=text(op,"component",kind=="asset"||kind=="material"?"MeshRenderer":"");
    auto fields=scene.component(id,type).value_or(Json::Object{});
    if(kind=="addComponent"&&scene.component(id,type))fail("Component already exists");
    if(kind=="addComponent"||kind=="setComponent")fields=required(op,"fields").object();
    else {const auto key=kind=="asset"?"asset":kind=="material"?"material":text(op,"field");if(key.empty())fail("Component field is required");fields[key]=required(op,"value");}
    validate_component(type,fields,assets);scene.add_component(id,type,std::move(fields));
  }else if(kind=="removeComponent"){
    const auto type=text(op,"component");if(type.empty()||type=="Transform"||type=="CatalogIdentity"||type=="WorldGeneration")fail("Required component cannot be removed");
    if(!scene.remove_component(id,type))fail("Component does not exist");
  }else fail("Unknown editor operation: "+kind);
}
Json EditorHistory::status(bool changed) const {
  Json::Object value{{"changed",changed},{"undo",double(undo_.size())},{"redo",double(redo_.size())},{"transaction",bool(pending_)},{"dirty",state_!=saved_||bool(pending_)},{"state",double(state_)},{"affected",affected_},{"created",created_},{"undoLabel",undo_.empty()?"":undo_.back().label},{"redoLabel",redo_.empty()?"":redo_.back().label}};
  if(terrain_changed_)value["terrain"]=terrain().value_or(Json{});
  return value;
}
Json EditorHistory::command(Scene& scene,const Json& request,const AssetValidator& assets,Json::Object* document_extras) {
  document_extras_=document_extras;terrain_changed_=false;
  affected_.clear();created_.clear();const auto action=text(request,"action","execute");bool changed=false;
  if(action=="begin")begin(scene,text(request,"label","Edit"));
  else if(action=="commit")changed=commit(scene);
  else if(action=="cancel"){if(pending_)for(const auto& [id,node]:pending_->before){(void)node;affected_.emplace_back(id);}changed=bool(pending_);cancel(scene);}
  else if(action=="markSaved"){if(pending_)fail("Finish the active transaction before saving");saved_=state_;}
  else if(action=="status"){}
  else if(action=="undo"||action=="redo"){
    if(pending_)fail("Finish the active transaction first");
    auto& from=action=="undo"?undo_:redo_;auto& to=action=="undo"?redo_:undo_;
    if(!from.empty()){auto record=std::move(from.back());from.pop_back();const auto& patch=action=="undo"?record.before:record.after;
      restore(scene,patch,action=="undo"?record.before_roots:record.after_roots);state_=action=="undo"?record.before_state:record.after_state;
      if(record.terrain_touched)restore_terrain(action=="undo"?record.before_terrain:record.after_terrain);
      for(const auto& [id,node]:patch){(void)node;affected_.emplace_back(id);}to.push_back(std::move(record));changed=true;}
  }else if(action=="execute"){
    const bool own=!pending_;if(own)begin(scene,text(request,"label","Edit"));
    // Invalid operations roll back the entire open gesture/transaction, so a
    // rejected multi-selection or component change cannot leave partial state.
    try{for(const auto& op:required(request,"operations").array())apply(scene,op,assets);changed=true;if(own)changed=commit(scene);}
    catch(...){cancel(scene);throw;}
  }else fail("Unknown editor history action");
  return status(changed);
}
}  // namespace veldren
