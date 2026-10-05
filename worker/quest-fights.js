// Generated from client/world.js; keep client and server phasing identical.
export function questFightVisible(o,state){
 if(!o)return false;
 if(o.mainStoryStage!=null)return (state.mainStoryQuest?.stage||0)<=o.mainStoryStage;
 if(o.kind==='mountainwatcher')return (state.mountainQuest?.stage||0)<=6;
 if(o.encounter==='veyr')return (state.mountainQuest?.stage||0)<=17||state.mountainQuest?.stage===20&&state.questRematch==='veyr';
 if(o.kind==='king')return !state.boss;
 if(o.kind==='sentinel')return !(state.frontier?.quest>3||state.frontier?.quest===3&&state.frontier?.accepted&&state.frontier?.kills>=1);
 return true;
}
