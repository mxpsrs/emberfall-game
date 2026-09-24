// Loaded only on Vite's explicit local armor QA route. Never shipped to players.
(function prepareArmorPreview(){
 if(!assetsReady){setTimeout(prepareArmorPreview,100);return;}
 if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();
 const params=new URL(location.href).searchParams,set=params.get('armorQA')||'bronze';
 s.character={name:'Armor fitting',look:1,race:'human',frame:params.get('frame')==='female'?'female':'male',hair:0};
 s.gold=2500;s.bag={fish:3,logs:2,ore:2};s.gear={bronzeSword:1};s.equipment={};s.bank={};
 for(const skill of ['Attack','Defense'])s.xp[skill]=200000;
 for(const slot of ['head','body','shoulders','hands','legs','feet','weapon','shield']){const id=set+'_'+slot;s.gear[id]=1;s.equipment[slot]=id;const other=(set==='iron'?'bronze':'iron')+'_'+slot;s.gear[other]=1;}
 for(const [slot,id]of [['crest','helmet_crest_1'],['neck','copperNecklace']]){s.gear[id]=1;s.equipment[slot]=id;}
 s.tutorial=tutorialSteps.length;normalizeToolBelt(s);renderTutorial();toolBeltOpen=false;tab='gear';panelPage=0;$('gameDock').hidden=false;document.body.classList.add('panels-open');syncTabs();renderUI();
 // The cloud QA browser has no WebGL. Freeze its software world after the
 // initial frame so interface clicks can be tested independently of GPU QA.
 draw=()=>{};
})();
