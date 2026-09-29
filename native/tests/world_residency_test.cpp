#include "veldren/world_residency.h"
#include <cassert>
#include <iostream>
using namespace veldren;
int main(){
 WorldResourceResidency state;const ResidencyBudget budget{100,100,2};
 auto row=[](const char* id,int gpu,int cpu,bool used){return Json::Array{id,gpu,cpu,used};};
 auto run=[&](Json::Array rows){return state.reconcile(rows,budget);};
 assert(run({row("a",60,20,true)}).find("evict")->array().empty());
 auto r=run({row("a",60,20,false),row("b",60,20,true)});assert(r.find("evict")->array().at(0).string_or()=="a");
 // Reacquisition cancels an eviction which the GPU has not acknowledged yet.
 r=run({row("a",60,20,true),row("b",60,20,true)});assert(r.find("evict")->array().empty());assert(r.find("stats")->find("overBudget")->bool_or());
 assert(run({row("b",60,20,true)}).find("stats")->find("tracked")->number_or()==1);
 for(int i=0;i<2;i++)assert(run({row("b",60,20,false)}).find("evict")->array().empty());
 assert(run({row("b",60,20,false)}).find("evict")->array().size()==1);
 assert(run({}).find("stats")->find("tracked")->number_or()==0);
 // Reconstructible upload staging can be dropped while its visible GPU mesh
 // stays resident. Non-reconstructible staging remains protected with its user.
 r=state.reconcile(Json::Array{Json::Array{"uploaded",80,150,true,150}},budget);
 assert(r.find("evict")->array().empty());assert(r.find("discardStaging")->array().at(0).string_or()=="uploaded");
 assert(r.find("stats")->find("cpuBytes")->number_or()==0);assert(!r.find("stats")->find("overBudget")->bool_or());
 // CPU staging and externally owned shared resources use the same budget.
 r=run({row("cpu",0,101,false)});assert(r.find("evict")->array().size()==1);
 r=state.reconcile(Json::Array{row("old",50,0,false)},budget,90);assert(r.find("evict")->array().size()==1);
 bool rejected=false;try{run({row("x",10,0,true),row("x",10,0,true)});}catch(...){rejected=true;}assert(rejected);
 for(int i=0;i<1000;i++){run({row("visited",90,90,true)});r=run({row("visited",90,90,false),row("next",90,90,true)});assert(r.find("evict")->array().size()==1);run({row("next",90,90,true)});}
 state.clear();assert(run({}).find("stats")->find("evictions")->number_or()==0);
 assert(world_residency_profile("browser-mobile").gpu_bytes<world_residency_profile("browser").gpu_bytes);
 assert(world_residency_profile("browser").gpu_bytes<world_residency_profile("native-desktop").gpu_bytes);
 std::cout<<"PASS: native resource budgets, LRU, grace, active protection, cancellation, release acknowledgement, CPU/shared accounting and 1000 travel cycles.\n";
}
