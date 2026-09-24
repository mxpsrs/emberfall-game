// Generated from dist/spirits.js; one rule set for local and shared combat.
import catalog from './shared-catalog.json' with {type:'json'};
const SPIRITS=catalog.spirits;
export function spiritAttuned(){return null;}
export function spiritBondRank(state,id,worship){const xp=Math.max(0,Number(state.spirits?.[id]?.bondXP)||0);return xp>=240&&worship>=12?3:xp>=80&&worship>=5?2:1;}
export function spiritBuild(){return {id:null,rank:0,armor:0,health:0,aim:0,runCost:1};}
export function spiritStrike(state,worship,memory,damage){return {damage,heal:0,energy:0,slow:0,proc:null,spirit:null,memory:null};}
export function spiritGuard(state,worship,damage){return damage;}
