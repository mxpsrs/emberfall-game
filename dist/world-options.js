'use strict';
function talkVillager(o){stop();toast(o.name+': “The goblins are gathering east of town. Mara sells food if you’re heading out.”');}
function worldPick(e){const {x:sx,y:sy}=worldScreenPoint(e),p=unproject3(sx,sy);const hits=worldHits3(sx,sy);const objects=[...new Set(hits.map(h=>h.o).filter(Boolean))];for(const pile of s.groundLoot||[])if(pile.scene===currentScene&&pile.x===Math.floor(p.x)&&pile.y===Math.floor(p.z)&&!objects.includes(pile))objects.push(pile);return {x:Math.floor(p.x),y:Math.floor(p.z),objects};}
function closeWorldOptions(){const menu=$('worldOptions');if(menu)menu.remove();}
function worldOptionsFor(o){
 if(!questFightVisible(o,s)||o.dead>time||o.collected)return [];
 const name=o.name||'Ground loot',actions=[];
 if(o.type==='player'){if(!o.username)return [];return [['Trade with '+name,()=>requestPlayerTrade(o.username)],['Follow '+name,()=>followPlayer(o.id)]];}
 if(o.type==='man'){actions.push(['Talk-to '+name,()=>talkVillager(o)],['Attack '+name+' (level '+o.level+')',()=>engage(o)]);}
 else if(o.type==='loot')actions.push(['Take '+groundItemLabel(o),()=>select(o)]);
 else if(o.type==='door')actions.push([(o.openedAt===undefined?'Open ':'Close ')+name,()=>select(o)]);
 else if(fighter(o))actions.push(['Attack '+name+' (level '+o.level+')',()=>select(o)]);
 else {const verb=o.tutor||['elder','villager','questgiver'].includes(o.type)?'Talk-to ':o.type==='tree'?'Chop ':o.type==='ore'?'Mine ':o.type==='fish'?'Fish ':o.type==='shop'?'Trade ':o.type==='spirit'?'Commune with ':'Use ';actions.push([verb+name,()=>select(o)]);}
 actions.push(['Examine '+name,()=>toast(o.type==='fish'?name+' · Fishing '+(resourceDefinition(o)?.level||1):name+(o.level?' · Combat level '+o.level:''))]);return actions;
}
function openWorldOptions(e){
 if(!assetsReady||cloudDisconnected||$('creator').open||$('modal').open)return;
 closeWorldOptions();const pick=worldPick(e),menu=document.createElement('div');menu.id='worldOptions';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Choose option');const title=document.createElement('strong');title.textContent='Choose option';menu.appendChild(title);
 const entries=pick.objects.flatMap(worldOptionsFor);entries.push(['Walk here',()=>walkTo(pick.x,pick.y)]);if(!pick.objects.some(o=>o.type==='player'))entries.push(['Cancel',()=>{}]);
 for(const [text,action]of entries){const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=text;button.onclick=()=>{closeWorldOptions();if(!/^(Examine |Cancel)/.test(text))showWorldClick(e,text!=='Walk here');action();};menu.appendChild(button);}
 document.body.appendChild(menu);const box=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(e.clientX,window.innerWidth-box.width-8))+'px';menu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-box.height-8))+'px';menu.querySelector('button')?.focus();
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#worldOptions'))closeWorldOptions();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeWorldOptions();});
