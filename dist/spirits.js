'use strict';
// Save compatibility for the retired companion system. Only its own fields are
// removed; inventory, equipment, skills, quests, position, and account data stay intact.
const SPIRITS={},FIRST_SPIRITS=[],SPIRIT_SKILLS={};
function normalizeSpiritRemoval(state){
 if(!state||typeof state!=='object'||state.spiritRemovalVersion===1)return state;
 for(const key of ['spirits','attunedSpirit','firstSpirit','spiritWardUntil','spiritProgressVersion'])delete state[key];
 state.spiritRemovalVersion=1;return state;
}
function setupSpirits(){return normalizeSpiritRemoval(s);}
function spiritAttuned(){return null;}
function spiritBondRank(){return 0;}
function spiritBuild(){return {id:null,rank:0,armor:0,health:0,aim:0,runCost:1};}
function spiritStrike(state,worship,memory,damage){return {damage,heal:0,energy:0,slow:0,proc:null,spirit:null,memory:null};}
function spiritGuard(state,worship,damage){return damage;}
function spiritBonus(){return 0;}
function spiritHasBond(){return false;}
function spiritRemaining(){return 0;}
function discoverSkillSpirit(){return null;}
function advanceSpiritBond(){}
function applySpiritStrikeFeedback(){}
function openSpirits(){}
function closeSpiritChoices(){}
function renderSpirits(){}
function refreshSpiritTimers(){}
function unleashSpirit(){return false;}
function summonSpirits(){return false;}
function updateSpirits(){}
function drawSpiritEffect(){}
function renderSpiritBuildPanel(){}
function updateSpiritHud(){}
function chooseFirstSpirit(){return false;}
function openFirstSpiritChoice(){}
let spiritBondEffect=null,spiritEffect=null,stoneWard=0,spiritRenewal=0;
