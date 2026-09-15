'use strict';
// Presentation only: completion handlers grant and save rewards before queuing a card.
const questCompletionQueue=[];
let activeQuestCompletion=null;
function showQuestCompletion(reward){
 questCompletionQueue.push({...reward,xp:{...reward.xp},items:{...reward.items},unlocks:[...(reward.unlocks||[])]});
 setTimeout(flushQuestCompletions,0);
}
function flushQuestCompletions(){
 if(activeQuestCompletion||!questCompletionQueue.length||$('modal').open||$('creator').open||$('spiritsDialog').open)return;
 const reward=questCompletionQueue.shift();activeQuestCompletion=reward;
 dialog('Congratulations!','',[]);
 const modal=$('modal'),body=$('modalBody');body.replaceChildren();modal.classList.add('quest-celebration');modal.setAttribute('aria-labelledby','completedQuestName');
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const emblem=node('div','completion-emblem');emblem.innerHTML=gameIcon(reward.hunt?'hunting':'quests');body.appendChild(emblem);
 body.appendChild(node('p','completion-kicker',reward.hunt?'First hunt complete':'Quest complete'));
 const title=node('h2','completion-title',reward.title);title.id='completedQuestName';body.appendChild(title);
 body.appendChild(node('p','completion-congratulations','Congratulations, adventurer!'));
 const list=node('ul','completion-rewards');
 const row=(label,value,icon)=>{const li=node('li','completion-reward'),mark=node('span','completion-reward-icon');mark.innerHTML=gameIcon(icon);li.appendChild(mark);li.appendChild(node('span','completion-reward-label',label));li.appendChild(node('strong','completion-reward-value',value));list.appendChild(li);};
 if(reward.coins)row('Coins','+'+reward.coins.toLocaleString(),'coins');
 for(const [skill,n]of Object.entries(reward.xp))row(skill+' XP','+'+n.toLocaleString(),'skills');
 for(const [id,n]of Object.entries(reward.items))if(n)row(ITEMS[id]?.name||id,'×'+n,'bag');
 for(const text of reward.unlocks)row(text,'Unlocked','quests');
 body.appendChild(list);
 body.appendChild(node('p','completion-note',(reward.banked?reward.banked.toLocaleString()+' coins were sent to your bank. ':'')+(reward.note||'Your rewards have been added. Your next chapter awaits.')));
 const button=node('button','primary completion-continue','Continue adventure');button.type='button';button.onclick=()=>{close();finishQuestCelebration();};body.appendChild(button);button.focus();
 playGameSound('questComplete');
}
function finishQuestCelebration(){
 if($('modal').open)return;
 activeQuestCompletion=null;$('modal').classList.remove('quest-celebration');$('modal').removeAttribute('aria-labelledby');setTimeout(flushQuestCompletions,0);
}
$('modal').addEventListener('close',finishQuestCelebration);
for(const id of ['creator','spiritsDialog'])$(id).addEventListener('close',()=>setTimeout(flushQuestCompletions,0));

// Level gains celebrate in a fading overlay; they never open a modal or stop play.
let levelCelebration=null;
function showLevelCelebration(skill,level){
 if(!assetsReady||!s.character)return;
 const now=Date.now();
 if(!levelCelebration||now-levelCelebration.at>1200)levelCelebration={at:now,until:now+4600,skills:{},scene:currentScene,x:px,y:py};
 levelCelebration.skills[skill]=level;levelCelebration.until=now+4600;
 let card=$('levelCelebration');if(!card){card=document.createElement('div');card.id='levelCelebration';card.setAttribute('role','status');document.body.appendChild(card);}
 card.innerHTML='<small>LEVEL UP!</small>'+Object.entries(levelCelebration.skills).map(([name,n])=>'<strong>'+name+' <span>'+n+'</span></strong>').join('')+'<p>Your adventure grows.</p>';
 card.classList.remove('level-fading');
 const expires=levelCelebration.until;
 setTimeout(()=>{if(levelCelebration?.until===expires)card.classList.add('level-fading');},3200);
 setTimeout(()=>{if(levelCelebration?.until===expires){card.remove();levelCelebration=null;}},4600);
 if(now-levelCelebration.at<50&&typeof playGameSound==='function')playGameSound('levelRise');
}
function drawLevelCelebration(r){
 const e=levelCelebration;if(!e||e.scene!==currentScene)return;
 const t=(Date.now()-e.at)/1000;if(t>4.6)return;
 const q=groundedPainter(r,px+.5,py+.5),colors=['#ffe5a0','#8ff3ed','#ffffff'];
 for(let i=0;i<24;i++){const phase=(t+i/24)%1.5,a=i*Math.PI*2/12,rad=.15+phase*.85,y=.3+Math.sin(phase/1.5*Math.PI)*1.8;oval3(q,px+.5+Math.cos(a)*rad,y,py+.5+Math.sin(a)*rad,.025,.05,.025,colors[i%3],p=>p,5);}
}
