// Local browser fixture, excluded from the deployed game's assets.
(function prepareSkillsPreview(){
 if(!assetsReady){setTimeout(prepareSkillsPreview,100);return;}
 if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();
 s=defaults();s.character={name:'Apprentice',look:0,race:'human',frame:'male',hair:0};s.worldScale=3;s.tutorial=tutorialSteps.length;s.bag={copperOre:1,tinOre:1,fish:3,runes:20,airRunes:20};normalizeToolBelt(s);
 const furnace=tutorialObject('furnace');activateScene('overworld',furnace.x+1,furnace.y);draw=()=>{};
 tab='bag';panelPage=0;$('gameDock').hidden=false;document.body.classList.add('panels-open');syncTabs();renderUI();openSmithing('furnace');
})();
