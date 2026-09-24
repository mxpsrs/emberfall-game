// No first-kill flag, pity counter or quest reward enters this roll.
export function rollRareBossLoot(rareDrops,random=Math.random){
 const drops={};for(const [id,denominator]of Object.entries(rareDrops||{}))if(Number.isInteger(denominator)&&denominator>0&&Math.floor(random()*denominator)===0)drops[id]=1;return drops;
}
