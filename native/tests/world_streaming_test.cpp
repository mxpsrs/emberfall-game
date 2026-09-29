#include "veldren/world_streaming.h"
#include <cassert>
#include <iostream>
using namespace veldren;
int main(){
 AssetRegistry assets;Json::Array definitions;
 for(int i=0;i<12;++i)definitions.emplace_back(Json::Object{{"id","model:"+std::to_string(i)},{"type","model"},{"name","Stream fixture"},{"importSettings",Json::Object{{"importer","veldren-gltf-1"}}}});
 assets.load(Json::Object{{"format","veldren.assets"},{"version",1},{"records",definitions}});
 Scene scene("stream");for(int i=0;i<12;++i){const auto id=scene.create("Instance",{},"entity:"+std::to_string(i));Transform t;t.position={double(i*32+16),0,16};scene.set_local(id,t);scene.add_component(id,"MeshRenderer",{{"asset","model:"+std::to_string(i)},{"renderPath","canonical"}});}
 WorldPartition partition;partition.synchronize(scene,assets);const auto saved=scene.serialize();const auto manifest=assets.document();WorldStreaming stream;
 auto row=[](int i){return Json::Array{"model:"+std::to_string(i),"","entity:"+std::to_string(i),i*32+16,0,16};};
 Json::Object request{{"profile","browser-mobile"},{"center",Json::Array{16,0,16}},{"demands",Json::Array{row(10),row(11),row(9)}},{"receipts",Json::Array{}},{"pins",Json::Array{}}};
 auto run=[&](){return stream.plan(scene,partition,assets,request);};
 auto result=run();assert(result.find("load")->array().size()==2);assert(result.find("stats")->find("loading")->number_or()==2);
 for(const auto& r:result.find("load")->array())assert(r.find("asset")->string_or()=="model:9"||r.find("asset")->string_or()=="model:10");
 Json::Array ready;for(const auto& r:result.find("load")->array())ready.emplace_back(Json::Array{*r.find("key"),"ready"});request["receipts"]=ready;
 result=run();assert(result.find("stats")->find("resident")->number_or()==2);assert(result.find("load")->array().size()==2);
 // A teleport cancels stale loads; later completion cannot revive them.
 request["center"]=Json::Array{5000,0,5000};request["demands"]=Json::Array{};request["receipts"]=Json::Array{};
 result=run();assert(!result.find("release")->array().empty());Json::Array released;
 for(const auto& key:result.find("release")->array())released.emplace_back(Json::Array{key,"released"});
 request["receipts"]=released;run();request["receipts"]=ready;run();request["receipts"]=Json::Array{};
 for(int i=0;i<35;++i){result=run();released.clear();for(const auto& key:result.find("release")->array())released.emplace_back(Json::Array{key,"released"});request["receipts"]=released;}
 assert(result.find("stats")->find("tracked")->number_or()==0);assert(result.find("stats")->find("cells")->number_or()==0);
 // Explicit editor selection pins retain a remote entity without moving it.
 request["pins"]=Json::Array{"entity:11"};result=run();assert(result.find("load")->array().size()==1);const auto old=*result.find("load")->array()[0].find("key");
 request["receipts"]=Json::Array{Json::Array{old,"ready"}};run();request["receipts"]=Json::Array{};
 for(int i=0;i<100;++i){result=run();assert(result.find("release")->array().empty());}assert(result.find("stats")->find("resident")->number_or()==1);
 assets.invalidate("model:11");result=run();assert(result.find("load")->array().size()==1);assert(*result.find("load")->array()[0].find("key")!=old);
 assert(scene.serialize()==saved);assert(assets.document()==manifest);assert(assets.diagnostics().find("dependencyLeases")->number_or()==0);
 // Pressure disables speculative prefetch but never active or pinned demand.
 stream.clear();request["pins"]=Json::Array{};request["center"]=Json::Array{16,0,16};request["gpuBytes"]=200*1024*1024;result=run();assert(result.find("load")->array().empty());request["demands"]=Json::Array{row(0)};result=run();assert(result.find("load")->array().size()==1);
 // Two cells share one request; a fresh adapter epoch must receive a new grant.
 stream.clear();request["demands"]=Json::Array{row(0),Json::Array{"model:0","","",1600,0,1600}};request["receipts"]=Json::Array{};result=run();assert(result.find("load")->array().size()==1);assert(result.find("cells")->array().size()>=2);
 const auto shared=*result.find("load")->array()[0].find("key");request["receipts"]=Json::Array{Json::Array{shared,"ready"}};result=run();assert(result.find("stats")->find("resident")->number_or()==1);
 request["epoch"]=1;request["receipts"]=Json::Array{};result=run();assert(result.find("load")->array().size()==1);
 const auto valid_demands=request["demands"];request["demands"]=Json::Array{Json::Array{"missing","","",0,0,0}};bool rejected=false;try{run();}catch(const std::exception&){rejected=true;}assert(rejected);
 request["demands"]=valid_demands;result=run();assert(result.find("load")->array().empty());assert(result.find("stats")->find("loading")->number_or()==1);
 // A long pressure-driven travel run must not accumulate historical resources.
 stream.clear();request["receipts"]=Json::Array{};
 for(int lap=0;lap<1000;++lap){request["demands"]=Json::Array{row(lap%12)};result=run();assert(result.find("stats")->find("tracked")->number_or()<=3);assert(result.find("stats")->find("loading")->number_or()<=2);Json::Array ack;for(const auto& key:result.find("release")->array())ack.emplace_back(Json::Array{key,"released"});for(const auto& r:result.find("load")->array())ack.emplace_back(Json::Array{*r.find("key"),"ready"});request["receipts"]=ack;}
 assert(scene.serialize()==saved);
 std::cout<<"PASS: bounded prioritized loads, shared cell demand, teleport cancellation, late receipt isolation, retirement, editor pins, generation changes, pressure and unchanged canonical owners.\n";
}
