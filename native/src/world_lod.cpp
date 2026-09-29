#include "veldren/world_lod.h"
#include <stdexcept>
namespace veldren {
void WorldLodState::clear(){entries_.clear();frame_=revision_=transitions_=0;counts_={};missing_=0;}
void WorldLodState::begin_frame(const AssetRegistry& assets){
 if(revision_!=assets.revision()){entries_.clear();revision_=assets.revision();}
 ++frame_;counts_={};missing_=0;
 // A bounded periodic sweep retires invisible decisions without frame-by-frame
 // iteration. Resource lifetimes remain controlled by existing Phase 2 leases.
 if(frame_%120==0)for(auto it=entries_.begin();it!=entries_.end();){if(frame_-it->second.used>240)it=entries_.erase(it);else ++it;}
}
Json WorldLodState::select(const AssetRegistry& assets,const std::string& identity,const std::string& asset,double distance){
 if(identity.empty())throw std::invalid_argument("Stable render identity required");
 auto found=entries_.find(identity);const int previous=found!=entries_.end()&&found->second.asset==asset?found->second.level:-1;
 const auto selected=assets.select_lod(asset,distance,previous,.12);const int level=int(selected.find("level")->number_or());
 if(previous>=0&&previous!=level)++transitions_;
 entries_[identity]={asset,level,frame_};++counts_[level];if(selected.find("missingLods")->bool_or())++missing_;return selected;
}
Json WorldLodState::diagnostics()const{return Json::Object{{"lod0",double(counts_[0])},{"lod1",double(counts_[1])},{"lod2",double(counts_[2])},{"missingLods",double(missing_)},{"transitions",double(transitions_)},{"tracked",double(entries_.size())}};}
}
