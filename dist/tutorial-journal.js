'use strict';
// The journal answers "what do I do next?" during the apprenticeship.
// Looking around, opening panels and ordinary actions remain unrestricted.
function tutorialNextAction(){
 const step=tutorialStep();if(!step)return null;const event=step.event;
 const action={title:step.title,instruction:step.desc,progress:'Complete this task to unlock the next lesson.',button:'Show me what to do',run:guide};
 const bag=()=>openGamePanel('bag'),spells=()=>openGamePanel('spells');
 if(event==='camera')Object.assign(action,{instruction:'Drag across the game view to turn your camera. On a phone, swipe with one finger. Turning the view completes this step.',button:'Back to the game',run:()=>{$('gameDock').hidden=true;document.body.classList.remove('panels-open');}});
 else if(event==='walk')Object.assign(action,{instruction:'Tap a clear patch of ground near your character. Wait for your character to walk there.',button:'Back to the game',run:()=>{$('gameDock').hidden=true;document.body.classList.remove('panels-open');}});
 else if(event==='magic')Object.assign(action,{instruction:combatStyle()==='magic'?'Tap the practice dummy inside Elowen’s magic school to cast Wind strike. One successful cast completes this lesson.':'Open Magic and select Wind strike. This equips your staff. Then tap the practice dummy inside Elowen’s magic school.',progress:'Each cast needs 1 air rune and 1 mind rune. Elowen can replace missing practice runes.',button:combatStyle()==='magic'?'Go to the magic dummy':'Open Magic · select Wind strike',run:combatStyle()==='magic'?guide:spells});
 else if(event==='ore')Object.assign(action,{instruction:s.bag.copperOre>0?'You have copper. Tap the tin rock beside Orin and mine one tin ore.':'Tap the copper rock beside Orin and mine one copper ore. Then mine one tin ore.',progress:'Copper: '+Math.min(1,s.bag.copperOre||0)+'/1 · Tin: '+Math.min(1,s.bag.tinOre||0)+'/1'});
 else if(event==='smelt')Object.assign(action,{instruction:'Open Bag. Tap copper ore or tin ore to select it, then tap the furnace beside Orin. Choose Bronze bar.',progress:'Uses 1 copper ore + 1 tin ore. Result: 1 bronze bar.',button:'Go to the furnace'});
 else if(event==='smith')Object.assign(action,{instruction:'Open Bag and tap your bronze bar. Then tap the practice anvil beside Orin. Choose Bronze, then Dagger.',progress:'Make a bronze dagger. Other recipes do not complete this lesson.',button:'Go to the practice anvil'});
 else if(['equip-dagger','training-gear','ranged-gear'].includes(event))Object.assign(action,{button:'Open Bag · equip your items',run:bag,progress:event==='equip-dagger'?'Required weapon: bronze dagger.':event==='training-gear'?'Wooden sword: '+(s.equipment.weapon==='woodenSword'?'equipped':'needed')+' · Wooden shield: '+(s.equipment.shield==='woodenShield'?'equipped':'needed'):'Shortbow: '+(combatStyle()==='ranged'?'equipped':'needed')+' · Arrows: '+(s.equippedAmmoCount>0?'equipped':'needed')});
 else if(event==='dummy')Object.assign(action,{instruction:'Equip your wooden sword and wooden shield, then tap Vale’s training dummy and keep attacking until it is defeated.',progress:'Use the dummy beside Captain Vale. The magic-school dummy belongs to Elowen’s lesson.'});
 else if(event==='monster')Object.assign(action,{instruction:'Tap the gate beside Vale to enter the rat pen. Tap a giant rat inside and defeat it with your training weapon. Eat a cooked shrimp if your health gets low.'});
 else if(event==='loot')Object.assign(action,{instruction:'Walk onto the pile where your rat fell. Tap the pile to collect its items. Make sure you pick up the bones for the later shrine lesson.',progress:'Your drop is yours alone for 30 seconds. Other players’ private drops cannot be collected yet.',button:'Find my rat’s drops'});
 else if(event==='ranged')Object.assign(action,{instruction:'Equip your shortbow and arrows. Leave the rat pen through its gate, then tap a rat from outside the low fence. Defeat the rat with your bow.',progress:'Stay outside the pen. Arrows must be equipped in the ammunition slot.'});
 else if(event==='fire')Object.assign(action,{instruction:'Stand on clear ground within a few steps of Fisher Nell. Open Bag, press and hold your logs, then choose Light fire. Wait for the fire to catch.',progress:'Need logs? Chop the tree beside Nell. A fire elsewhere does not complete this lesson.'});
 else if(event==='cook-shrimp')Object.assign(action,{instruction:'Stay beside Nell. Open Bag and tap raw shrimp to select it. Tap the log fire beside her, then wait for one shrimp to finish cooking.',progress:'If the fire has gone out, light another log beside Nell. Catch another shrimp if yours burned.'});
 else if(event==='mix-dough')Object.assign(action,{instruction:'Open Bag. Tap the flour to select it, then tap the jug of water. This creates bread dough.',button:'Open Bag · mix flour and water',run:bag});
 else if(event==='bake-bread')Object.assign(action,{instruction:'Inside Bram’s kitchen, open Bag and tap bread dough. Then tap the cooking range beside Bram.',progress:'Use the kitchen range for bread.'});
 else if(event==='eat')Object.assign(action,{instruction:'Tap Eat with bread or cooked shrimp in your bag. Trying it while your health is full also completes the lesson.',button:'Try Eat',run:eat});
 else if(event==='bury')Object.assign(action,{instruction:'Open Bag and tap bones. Wait for the burial animation to finish.',progress:'No bones left? Speak to Keeper Sera and take practice bones.',button:'Open Bag · bury bones',run:bag});
 else if(event==='deposit')Object.assign(action,{instruction:'Speak to Banker Ada and choose Open bank. Tap an item in your inventory to deposit it.',progress:'Deposit one item. Opening the bank alone does not complete this step.'});
 else if(event==='withdraw')Object.assign(action,{instruction:'In Ada’s bank, tap the item you stored to withdraw it into your inventory.',progress:'Withdraw one item from the bank.'});
 else if(event.startsWith('talk-')||['training-kit','ranged-kit'].includes(event))action.progress='Tap the tutor, read the conversation, then choose Continue or accept the supplies.';
 return action;
}
function renderTutorialJournal(){
 const action=tutorialNextAction();if(!action)return;
 pageControls(1,1);const panel=$('panel');panel.replaceChildren();
 const card=document.createElement('section');card.className='tutorial-journal';card.setAttribute('aria-label','Current tutorial task');
 const count=document.createElement('p');count.className='tutorial-journal-count';count.textContent='YOUR NEXT STEP · '+(s.tutorial+1)+' OF '+tutorialSteps.length;
 const title=document.createElement('h2');title.textContent=action.title;
 const instruction=document.createElement('p');instruction.className='tutorial-journal-instruction';instruction.textContent=action.instruction;
 const progress=document.createElement('p');progress.className='tutorial-journal-progress';progress.textContent=action.progress;
 const button=document.createElement('button');button.className='tutorial-journal-go';button.textContent=action.button;button.onclick=()=>{action.run();};
 card.append(count,title,instruction,progress,button);
 panel.appendChild(card);
}
