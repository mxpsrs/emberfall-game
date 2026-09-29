#include "veldren/world_lod.h"
#include <cassert>
#include <iostream>
using namespace veldren;
int main(){
 AssetRegistry assets;assets.load(parse_json(R"({"format":"veldren.assets","version":1,"records":[{"id":"model:full","name":"Full fixture","type":"model","lods":[{"level":0,"asset":"model:full","threshold":0},{"level":1,"asset":"model:medium","threshold":100},{"level":2,"asset":"model:far","threshold":200}]},{"id":"model:medium","name":"Medium fixture","type":"model"},{"id":"model:far","name":"Far fixture","type":"model"}]})"));
 const auto original=assets.document();WorldLodState state;int level=0;
 auto select=[&](double distance){state.begin_frame(assets);const auto result=state.select(assets,"canonical:tree","model:full",distance);level=int(result.find("level")->number_or());return result;};
 assert(select(0).find("asset")->string_or()=="model:full");
 for(int i=0;i<100;++i){select(i%2?101:99);assert(level==0);}
 select(113);assert(level==1);for(int i=0;i<100;++i){select(i%2?101:99);assert(level==1);}
 select(87);assert(level==0);select(225);assert(level==2);
 for(int i=0;i<100;++i){select(i%2?201:199);assert(level==2);}
 select(175);assert(level==1);select(0);assert(level==0);
 assert(state.diagnostics().find("transitions")->number_or()==5);
 const auto fallback=state.select(assets,"canonical:other","model:medium",10000);assert(fallback.find("level")->number_or()==0&&fallback.find("missingLods")->bool_or());
 assert(assets.document()==original&&assets.diagnostics().find("dependencyLeases")->number_or()==0);
 for(int i=0;i<360;++i){state.begin_frame(assets);}
 assert(state.diagnostics().find("tracked")->number_or()==0);
 assets.invalidate("model:full");state.begin_frame(assets);assert(state.select(assets,"canonical:tree","model:full",150).find("level")->number_or()==1);
 assert(assets.select_lod("model:full",201).find("level")->number_or()==2);
 std::cout<<"PASS: existing LOD thresholds, explicit target/current levels, 300 threshold oscillations, hysteresis, exact LOD0 return, LOD0-only art, retirement and reimport reset.\n";
}
