#include "veldren/editor.h"
#include <algorithm>
#include <stdexcept>

namespace veldren {
namespace {
using Object=Json::Object;
std::string string(const Json& value,const char* key){const auto* v=value.find(key);return v?v->string_or():"";}
void reject(const char* message){throw std::invalid_argument(message);}
void remap(Json& value,const Object& mapping){
  if(auto* s=std::get_if<std::string>(&value.value)){const auto it=mapping.find(*s);if(it!=mapping.end())*s=it->second.string_or();}
  else if(auto* a=std::get_if<Json::Array>(&value.value))for(auto& v:*a)remap(v,mapping);
  else if(auto* o=std::get_if<Object>(&value.value))for(auto& [key,v]:*o){(void)key;remap(v,mapping);}
}
Object reverse(const Object& mapping){Object out;for(const auto& [key,value]:mapping)out[value.string_or()]=key;return out;}
std::vector<EntityId> branch(const Scene& scene,const EntityId& root){
  std::vector<EntityId> ids{root};for(std::size_t i=0;i<ids.size();++i){const auto node=scene.inspect(ids[i]);ids.insert(ids.end(),node.children.begin(),node.children.end());}return ids;
}
Json normalized(const Scene& scene,const EntityId& id,const Object& names,const EntityId& root){
  auto value=scene.entity_json(id).object();auto components=value.at("components").object();components.erase("PrefabInstance");value["components"]=components;
  if(id==root){value["parent"]=nullptr;value["transform"]=Object{{"position",Json::Array{0,0,0}},{"rotation",Json::Array{0,0,0,1}},{"scale",Json::Array{1,1,1}}};}
  Json result(value);remap(result,names);return result;
}
Object capture(const Scene& scene,const EntityId& root,Object& mapping){
  const auto ids=branch(scene,root);auto names=reverse(mapping);std::size_t ordinal=0;
  for(const auto& id:ids){if(id!=root&&scene.component(id,"PrefabInstance"))reject("Unpack nested prefab instances before creating a prefab");if(scene.component(id,"PrefabDefinition"))reject("Prefab definitions cannot contain other definitions");
    if(!names.contains(id)){std::string key;do{key="node-"+std::to_string(ordinal++);}while(mapping.contains(key));mapping[key]=id;names[id]=key;}
  }
  Object result;for(const auto& id:ids)result[names.at(id).string_or()]=normalized(scene,id,names,root);return result;
}
// Three-way field merge: inherited fields follow the new definition; changed
// instance fields remain overrides. Arrays (including transforms) are atomic.
std::optional<Json> merge(const Json* base,const Json* current,const Json* next){
  const auto equal=[](const Json* a,const Json* b){return (!a&&!b)||(a&&b&&*a==*b);};
  if(equal(base,current))return next?std::optional(*next):std::nullopt;
  if(base&&current&&next&&std::holds_alternative<Object>(base->value)&&std::holds_alternative<Object>(current->value)&&std::holds_alternative<Object>(next->value)){
    std::set<std::string> keys;for(const auto* object:{base,current,next})for(const auto& [key,value]:object->object()){(void)value;keys.insert(key);}
    Object out;for(const auto& key:keys){const auto value=merge(base->find(key),current->find(key),next->find(key));if(value)out[key]=*value;}return out;
  }
  return current?std::optional(*current):std::nullopt;
}
}

void EditorHistory::apply_prefab(Scene& scene,const Json& operation,const AssetValidator& assets){
  const auto kind=string(operation,"op"),id=string(operation,"id");scene.inspect(id);
  const auto execute=[&](Object op){apply(scene,op,assets);};
  const auto write=[&](const EntityId& target,const std::string& type,const Object& fields){execute({{"op","setComponent"},{"id",target},{"component",type},{"fields",fields}});};
  if(kind=="prefabUnpack"){
    if(!scene.component(id,"PrefabInstance"))reject("Select a prefab instance root");
    execute({{"op","removeComponent"},{"id",id},{"component","PrefabInstance"}});return;
  }
  if(kind=="prefabCreate"){
    if(scene.component(id,"PrefabInstance"))reject("Update or unpack this prefab before creating another");
    Object mapping;const auto nodes=capture(scene,id,mapping);const auto root=reverse(mapping).at(id).string_or();
    auto name=string(operation,"name");if(name.empty()||name.size()>256)reject("Prefab name must contain 1–256 characters");
    const Object prefab{{"version",1},{"revision",1},{"root",root},{"nodes",nodes}};
    const Object entity{{"name",name},{"active",false},{"components",Object{{"PrefabDefinition",prefab}}}};
    execute({{"op","create"},{"entity",entity}});
    const auto definition=created_.back().string_or();
    write(id,"PrefabInstance",{{"definition",definition},{"revision",1},{"root",root},{"mapping",mapping},{"base",nodes}});return;
  }
  EntityId definition=id;
  if(kind=="prefabUpdate"||kind=="prefabRevert"){
    const auto instance=scene.component(id,"PrefabInstance");if(!instance)reject("Select a prefab instance root");definition=instance->at("definition").string_or();
  }
  const auto stored=scene.component(definition,"PrefabDefinition");if(!stored)reject("The prefab definition is missing");
  auto data=*stored;auto nodes=data.at("nodes").object();const auto root=data.at("root").string_or();
  if(kind=="prefabInstantiate"){
    Object mapping;std::vector<std::string> order{root};for(std::size_t i=0;i<order.size();++i)for(const auto& [key,node]:nodes)if(string(node,"parent")==order[i])order.push_back(key);
    if(order.size()!=nodes.size())reject("Prefab hierarchy is invalid");
    for(const auto& key:order){execute({{"op","create"},{"entity",Object{{"name","Prefab entity"}}}});mapping[key]=created_.back();}
    const auto instance=mapping.at(root).string_or();
    for(const auto& key:order){Json value=nodes.at(key);remap(value,mapping);auto entity=value.object();
      if(key==root){entity["parent"]=string(operation,"parent");if(const auto* pose=operation.find("transform"))entity["transform"]=*pose;}
      auto components=entity.at("components").object();for(auto& [type,fields]:components){auto values=fields.object();if(values.contains("generationKey"))values["generationKey"]="prefab:"+mapping.at(key).string_or();if(type=="CatalogIdentity")values["id"]=mapping.at(key);fields=values;}entity["components"]=components;
      execute({{"op","replace"},{"entity",entity}});
    }
    write(instance,"PrefabInstance",{{"definition",definition},{"revision",data.at("revision")},{"root",root},{"mapping",mapping},{"base",nodes}});
    // The UI selects the instance root, never a definition or an arbitrary child.
    created_.clear();created_.emplace_back(instance);return;
  }
  if(kind!="prefabUpdate"&&kind!="prefabRevert")reject("Unknown prefab operation");
  if(kind=="prefabUpdate"){
    auto source=scene.component(id,"PrefabInstance")->at("mapping").object();nodes=capture(scene,id,source);data["nodes"]=nodes;data["revision"]=data.at("revision").number_or()+1;write(definition,"PrefabDefinition",data);
    auto state=*scene.component(id,"PrefabInstance");state["mapping"]=source;write(id,"PrefabInstance",state);
  }
  const auto instances=scene.entities_with("PrefabInstance");
  for(const auto& instance:instances){
    auto state=*scene.component(instance,"PrefabInstance");if(state.at("definition").string_or()!=definition||(kind=="prefabRevert"&&instance!=id))continue;
    auto mapping=state.at("mapping").object();const auto base=state.at("base").object();auto names=reverse(mapping);Object values;
    const bool revert=kind=="prefabRevert";
    for(const auto& [key,node]:nodes){
      const auto old=base.find(key);const auto mapped=mapping.find(key);const auto target=mapped==mapping.end()?"":mapped->second.string_or();
      if(!target.empty()&&!scene.contains(target)&&old!=base.end()&&!revert)continue; // intentional local deletion
      if(target.empty()||!scene.contains(target)){execute({{"op","create"},{"entity",Object{{"name","Prefab entity"}}}});mapping[key]=created_.back();}
      const auto current=!target.empty()&&scene.contains(target)?std::optional(normalized(scene,target,names,instance)):std::nullopt;
      const auto value=revert?std::optional(node):merge(old==base.end()?nullptr:&old->second,current?&*current:nullptr,&node);
      if(value)values[key]=*value;else if(old==base.end())values[key]=node;
    }
    // Preserve customized removed nodes as ordinary loose children. Remove only
    // unchanged leaves; this never destroys a locally added or modified child.
    std::vector<std::string> removedOrder;for(const auto& [key,value]:base){(void)value;removedOrder.push_back(key);}
    const auto depth=[&](std::string key){std::size_t value=0;while(base.contains(key)&&value<base.size()){key=string(base.at(key),"parent");++value;}return value;};
    std::stable_sort(removedOrder.begin(),removedOrder.end(),[&](const auto& a,const auto& b){return depth(a)>depth(b);});
    for(const auto& key:removedOrder)if(!nodes.contains(key)&&mapping.contains(key)){const auto& old=base.at(key);
      const auto target=mapping.at(key).string_or();if(scene.contains(target)&&target!=instance){const auto current=normalized(scene,target,names,instance);if(current==old&&scene.inspect(target).children.empty())execute({{"op","delete"},{"id",target}});}mapping.erase(key);
    }
    for(const auto& [key,value]:values){Json resolved=value;remap(resolved,mapping);auto entity=resolved.object();const auto target=mapping.at(key).string_or();entity["id"]=target;
      if(key==root){const auto live=scene.entity_json(instance).object();entity["parent"]=live.at("parent");entity["transform"]=live.at("transform");}
      else if(!string(entity,"parent").empty()&&!scene.contains(string(entity,"parent")))entity["parent"]=instance;
      // Runtime/catalog identities belong to the instance, not the template.
      auto components=entity.at("components").object();for(auto& [type,fields]:components){auto f=fields.object();if(f.contains("generationKey"))f["generationKey"]="prefab:"+target;if(type=="CatalogIdentity")f["id"]=target;fields=f;}entity["components"]=components;
      execute({{"op","replace"},{"entity",entity}});
    }
    state["mapping"]=mapping;state["base"]=nodes;state["revision"]=data.at("revision");write(instance,"PrefabInstance",state);
  }
}
} // namespace veldren
