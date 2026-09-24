const {readFileSync}=require('fs'),vm=require('vm'),assert=require('assert');
const rewards={},ctx={s:{},trainingFocus:()=>'',gain:(k,v)=>rewards[k]=(rewards[k]||0)+v,showExperienceDrop:()=>{}};
vm.createContext(ctx);vm.runInContext(readFileSync('dist/systems.js','utf8'),ctx);
for(const [focus,expected]of [['accurate',{Hitpoints:12,Attack:36}],['aggressive',{Hitpoints:12,Strength:36}],['defensive',{Hitpoints:12,Defense:36}],['balanced',{Hitpoints:12,Attack:12,Strength:12,Defense:12}]]){
 for(const k of Object.keys(rewards))delete rewards[k];ctx.focus=focus;vm.runInContext("awardCombatDamage(3,'melee',focus)",ctx);assert.deepEqual(rewards,expected);
}
for(const [style,expected]of [['ranged',{Hitpoints:4,Ranged:12}],['magic',{Hitpoints:4,Magic:6}],['worship',{Hitpoints:4,Worship:12}]]){
 for(const k of Object.keys(rewards))delete rewards[k];ctx.style=style;vm.runInContext("awardCombatDamage(3,style,'focused')",ctx);assert.deepEqual(rewards,expected);vm.runInContext("awardCombatDamage(0,'melee','accurate')",ctx);assert.deepEqual(rewards,expected);
}
console.log('PASS: melee XP triples in every stance, including Hitpoints; ranged, magic, Worship and misses remain unchanged.');
