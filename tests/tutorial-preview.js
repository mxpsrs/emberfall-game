// Local fixture only: use production UI and transactions with disposable state.
(function tutorialPreview(){
 if(!assetsReady){setTimeout(tutorialPreview,100);return;}
 if($('creator').open)$('creator').close();if($('modal').open)close();
 cloudReady=false;cloudConflict=false;cloudDisconnected=false;save=()=>{};
 s=defaults();s.character={name:'Tutorial QA',look:0,race:'human',frame:'male',hair:0};
 s.storyOpeningSeen=true;s.metRowan=true;s.tutorialVersion=TUTORIAL_VERSION;s.tutorialReward=false;
 const event=new URL(location.href).searchParams.get('lesson')||'deposit';if(event.startsWith('story-')){s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.mainStoryQuest={stage:event==='story-lift'?16:event==='story-shrine'?21:0};syncMainStoryWorld();const o=mainStoryObject(event==='story-lift'?'lift':event==='story-shrine'?'shrine':'rellan');activateScene('overworld',o.x+2,o.y+2);view3d.zoom=65;s.worldClock=120;renderUI();renderTutorial();return;}if(event==='armour'){s.tutorial=tutorialSteps.length;renderTutorial();showArmourReview();return;}s.tutorial=tutorialSteps.findIndex(t=>t.event===event);s.tutorialCompleted=tutorialSteps.slice(0,s.tutorial).map(t=>t.event);
 s.bag={logs:2,bones:2,shrimp:3};s.gear={bronze_dagger:1};s.bank={};s.equipment={};s.tutorialGifts={magic:true,combat:true,ranged:true,valeRatBriefed:true};
 activateScene('tutorial',43,52);const tutor=tutorialTutor(event==='talk-worship'?'worship':event==='talk-combat'?'combat':'bank');if(tutor)activateScene('tutorial',tutor.x+1,tutor.y);
 renderUI();renderTutorial();
 if(event==='deposit')openBank();else if(event==='talk-worship'||event==='talk-combat'){view3d.zoom=65;talkTutor(tutor);}else openGamePanel('bag');
 queueTutorialGuidance();
})();

function showArmourReview(){
 draw=()=>{};document.body.classList.remove('portrait-mode');
 const review=document.createElement('section');review.style='position:fixed;inset:0;z-index:2000;overflow:auto;background:#172b31;padding:12px;color:#f2eddf;font:14px Arial';document.body.append(review);
 let selected='iron',pose='idle';
 const controls=document.createElement('div');controls.style='display:flex;gap:5px;flex-wrap:wrap';review.append(controls);
 const cards=document.createElement('div');cards.style='display:grid;grid-template-columns:repeat(3,1fr);gap:10px';review.append(cards);
 for(const id of ['bronze','iron','gold','mithril','dragonslayer','leather','robe']){const b=document.createElement('button');b.textContent=id;b.style='padding:8px';b.onclick=()=>{selected=id;paint();};controls.append(b);}
 for(const clip of ['idle','walk','run','melee']){const b=document.createElement('button');b.textContent=clip;b.style='padding:8px';b.onclick=()=>{pose=clip;paint();};controls.append(b);}
 function paint(){modularMeshes.clear();avatarMaterials.clear();rebuiltPoses.clear();cards.replaceChildren();for(const [sex,angle,label,phase]of [['male',-.5,'Three-quarter',.15],['male',1.45,'Side',.4],['male',2.7,'Back',.65],['female',-.5,'Three-quarter',.15],['female',1.45,'Side',.4],['female',2.7,'Back',.65]]){
  const card=document.createElement('div');card.style='text-align:center;background:#203941';const title=document.createElement('p');title.textContent=selected+' · '+sex+' · '+label+' · '+pose;card.append(title);const canvas=document.createElement('canvas');canvas.width=290;canvas.height=295;canvas.style='width:100%;max-width:290px';card.append(canvas);cards.append(card);
  const gear=selected==='leather'?{body:'leatherArmor',feet:'leatherBoots'}:selected==='robe'?{body:'mysticRobe'}:Object.fromEntries(['head','body','hands','legs','feet'].map(slot=>[slot,selected+'_'+slot]));
  const g=canvas.getContext('2d'),cy=Math.cos(angle),sy=Math.sin(angle),scale=145,ct=Math.cos(.12),st=Math.sin(.12),mesh=avatarPose(sex,pose,phase,gear,0);
  const painter=creatorPainter(g,(x,y,z)=>({x:145+(x*cy-z*sy)*scale,y:282+((x*sy+z*cy)*st-y*ct)*scale,depth:(x*sy+z*cy)*ct+y*st}),290,295);briarEmit(painter,mesh,briarTransform(0,0,0));painter.flush();
 }}paint();
}
