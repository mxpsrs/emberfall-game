'use strict';
// Original 32-unit silhouettes, shared by the HUD and both canvas maps.
const GAME_ICON_DEFS={
 ammo:[['M7 11L24 13L21 29L10 28Z','#9c724b'],['M11 13L13 3M17 14L21 2M21 15L27 6','none','#d7c193'],['M10 3L14 7L16 2M18 2L21 6L24 2M24 6L27 10L30 6','none','#b2c7b5'],['M9 17L23 19','none','#d8af6a']],
 followers:[['M14 5Q8 10 12 16Q4 18 5 25L15 29L24 24Q25 19 20 16Q24 9 19 7L16 10Z','#b0c4a9'],['M23 3Q18 9 24 13L29 10L28 5Z','#d2c393'],['M11 12H13M16 12H18','none','#354c3c']],
 stats:[['M3 4H21V28H3Z','#b3a682'],['M7 10H17M7 16H14M7 22H15','none','#5c624c'],['M23 12L29 15V28H18V19Z','#8caa9b']],
 tools:[['M5 28L23 6','none','#a27f4b'],['M15 3L27 5L30 12L23 15L19 10Z','#a1b2ac'],['M4 6L27 27','none','#c1a678'],['M3 8L7 3L12 8L8 13Z','#b1bcb2']],
 helm:[['M6 27V15Q6 3 16 3Q26 3 26 15V27L20 29V17H12V29Z','#899c9b'],['M11 12H21V16H11Z','#293e39'],['M16 4V11','none','#d2d6be']],
 necklace:[['M7 4Q2 19 16 24Q30 19 25 4','none','#b89a5b'],['M16 20L21 25L16 31L11 25Z','#c9b06e']],
 shield:[['M4 5L16 2L28 5V15Q27 25 16 31Q5 25 4 15Z','#8ca39a'],['M16 5V27M7 12H25','none','#c6cab0']],
 glove:[['M7 28V16L4 10Q3 5 6 6L11 12L10 4Q11 1 14 4L16 12L17 5Q19 2 21 6L22 13L25 10Q29 9 28 14L26 21V28Z','#b39f73']],
 legs:[['M6 4H26L28 29H19L16 15L13 29H4Z','#9eaa9e'],['M8 8H24M16 5V13','none','#d7cfb2']],
 boot:[['M14 3H25V22L28 24V29H4V24L13 19Z','#ad8653'],['M16 6H24M17 11H24','none','#e0c992']],
 heart:[['M16 8Q7-2 3 8Q-1 18 16 30Q33 18 29 8Q25-2 16 8Z','#b4604a']],
 fish:[['M5 9Q16 2 24 13L30 7L28 17L30 27L23 21Q12 29 4 18Z','#88a5a0'],['M6 13H8','none','#2a3e38']],
 leaf:[['M5 27Q-1 5 28 3Q30 28 5 27Z','#91a36b'],['M5 27L23 9M12 20L11 11M17 15H25','none','#cdd1a0']],
 bag:[['M10 9V6Q16 2 22 6V10','#65412b'],['M7 9Q16 6 25 10L28 27Q16 32 4 27Z','#98623b'],['M6 10Q16 7 26 11L24 18Q16 23 8 17Z','#bd8c52'],['M14 15H19V23H14Z','#d3b26e'],['M16 17V20','none','#64432b'],['M8 22V26M24 22V26','none','#664328']],
 gear:[['M11 5Q16 11 21 5L29 11L25 17L22 15V28Q16 31 10 28V15L7 17L3 11Z','#96a7a8'],['M11 7L13 17L11 27M21 7L19 17L21 27','none','#ced9c9'],['M13 17H19L20 27H12Z','#657b80'],['M11 5Q16 10 21 5','none','#414d50']],
 skills:[['M4 18H10V28H4Z','#718957'],['M13 6H19V28H13Z','#b8674e'],['M22 12H28V28H22Z','#5f93a2'],['M3 29H29','none','#d5c698']],
 quests:[['M9 4H26Q30 4 29 10H24V25Q24 30 20 29H5Q1 28 3 23H8V8Q8 4 9 4Z','#e1c991'],['M9 5Q5 5 5 10H24M8 23H19Q17 27 21 29','none','#8c7146'],['M11 14H20M11 18H18','none','#806746']],
 spells:[['M5 5L23 3L28 7V28L10 30L4 25Z','#677797'],['M9 9L28 7V27L10 30Z','#455d82'],['M5 5L9 9V29M10 26L26 23','none','#c8b889'],['M18 10L20 15L25 16L21 19L21 24L17 21L13 24L14 19L11 16L16 15Z','#cdb7e4']],
 spirit:[['M19 3Q13 11 20 15Q25 11 23 8Q33 19 25 26Q15 34 6 26Q1 19 10 13Q6 21 13 22Q9 12 19 3Z','#a2b9b7'],['M17 14Q24 23 18 26Q12 28 12 23Q17 25 17 14Z','#d3e8c7']],
 melee:[['M5 3L9 4L27 25L24 28L6 8Z','#b6c6bf'],['M27 3L23 4L5 25L8 28L26 8Z','#9babae'],['M3 21L11 28M21 28L29 21','none','#ca9f57'],['M4 29L8 25M24 25L28 29','none','#86603c']],
 ranged:[['M9 3Q31 16 9 29L12 24Q23 16 12 8Z','#b78245'],['M9 3L9 29','none','#e5d5af'],['M3 16H28M24 12L28 16L24 20','none','#c4d0c1'],['M4 12L8 16L4 20','none','#bb6351']],
 magic:[['M9 29L21 7','none','#bd9958'],['M20 2L27 7L23 15L15 10Z','#829ec4'],['M19 4L23 7L20 11L18 9Z','#d1dce5'],['M6 5L7 8L10 9L7 10L6 13L5 10L2 9L5 8Z','#e5cf8b']],
 eat:[['M16 9Q4 3 3 17Q3 30 13 29L16 27L19 29Q29 29 29 16Q28 3 16 9Z','#b56549'],['M16 10L18 3','none','#aa8851'],['M18 5Q27 1 27 7Q23 10 18 5Z','#82905a'],['M8 13Q5 16 7 20','none','#e2ad71']],
 stop:[['M10 4H22L29 11V22L22 29H10L3 22V11Z','#a05c4a'],['M11 11H21V22H11Z','#e2d4b1']],
 run:[['M18 4L23 6L21 11L16 9Z','#ddc482'],['M17 11L21 14L25 11M18 12L13 17L8 15M19 14L17 20L23 25L28 25M17 20L11 22L9 28L4 28','none','#d6b569']],
 wave:[['M11 28L5 19Q2 13 5 13L10 17L8 7Q8 3 11 5L14 14L14 4Q15 0 17 4L18 14L20 5Q22 3 23 6L22 16L26 10Q29 8 29 12L26 24L22 29Z','#c6a779']],
 map:[['M3 6L11 3L21 7L29 3V26L21 30L11 26L3 29Z','#c6bd87'],['M11 3V26M21 7V30','none','#817546'],['M6 20L10 15L15 18L21 12L26 13','none','#77865e'],['M19 8L22 11L25 7','none','#4b6960']],
 tutor:[['M3 8L16 3L29 8L16 14Z','#d4b66b'],['M8 12V17Q16 22 24 17V12L16 16Z','#ad8a4e'],['M16 21L18 25L23 26L19 29H13L9 26L14 25Z','#f0d697'],['M28 9V18','none','#eed393']],
 shop:[['M5 5H27L30 13H2Z','#e0cda0'],['M8 5H13L12 13H5ZM20 5H25L28 13H22Z','#ae6250'],['M5 14V29H27V14M3 20H29','none','#bfa573'],['M9 21H22V28H9Z','#987448']],
 bank:[['M2 10L16 3L30 10V13H2Z','#c1b48f'],['M5 15H9V26H5ZM14 15H18V26H14ZM23 15H27V26H23ZM3 27H29V30H3Z','#c7bea1'],['M16 6L19 9L16 12L13 9Z','#e0b861']],
 forge:[['M3 9H28V14L23 20H15L13 24H24V28H7V24L11 20L9 15L3 13Z','#9caaae'],['M7 5H26V9H7Z','#c5c9b5'],['M15 16H24','none','#d3d7c3']],
 inn:[['M3 12H29V28H3Z','#986943'],['M5 13V23H28V19Q28 15 23 15H12V23','none','#d5c8a2'],['M6 15H11V21H6Z','#e0d8b8'],['M3 22H29','none','#dfbd77']],
 mine:[['M6 27L21 6','none','#ae8250'],['M5 9Q18 0 29 11L22 8L15 9L8 14Z','#b6c2b6']],
 shrine:[['M16 3L20 12L29 16L20 20L16 29L12 20L3 16L12 12Z','#b3cab1'],['M16 10L18 15L23 16L18 17L16 23L14 17L9 16L14 15Z','#e5e2b5']],
 close:[['M7 7L25 25M25 7L7 25','none','#e8d6aa']],
 sound:[['M3 12H9L17 5V27L9 20H3Z','#c7b88b'],['M22 10Q28 16 22 22M25 5Q35 16 25 27','none','#b6c39b']],
 mute:[['M3 12H9L17 5V27L9 20H3Z','#b4a67f'],['M22 12L29 21M29 12L22 21','none','#c98266']],
 fullscreen:[['M4 12V4H12M20 4H28V12M28 20V28H20M12 28H4V20','none','#e0d0a7']],
 restore:[['M12 4V12H4M28 12H20V4M20 28V20H28M4 20H12V28','none','#e0d0a7']],
 zoomIn:[['M5 16H27M16 5V27','none','#e0d0a7']],
 zoomOut:[['M5 16H27','none','#e0d0a7']],
 compass:[['M16 2L28 16L16 30L4 16Z','#aa9e7a'],['M16 5L22 20L16 17L10 20Z','#bb6b55'],['M16 17L16 27L10 20Z','#e5d7b4']],
 help:[['M12 9Q12 5 17 5Q24 5 23 11Q23 15 17 17V21','none','#e3ce98'],['M16 26H18V28H16Z','#e3ce98']],
 exit:[['M4 4H18V11H14V8H8V25H14V21H18V29H4Z','#c5ad79'],['M13 16H29M23 10L29 16L23 22','none','#e1cf9e']]
};
const gameIconPaths=new Map();
function gameIcon(name){const shapes=GAME_ICON_DEFS[name]||GAME_ICON_DEFS.help;return '<svg class="game-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+shapes.map(([d,fill,stroke])=>'<path d="'+d+'" fill="'+fill+'" stroke="'+(stroke||'#352a1e')+'" stroke-width="'+(stroke?2:1.4)+'" stroke-linejoin="round" stroke-linecap="round"/>').join('')+'</svg>';}
function drawGameIcon(g,name,x,y,size){const shapes=GAME_ICON_DEFS[name]||GAME_ICON_DEFS.help;let paths=gameIconPaths.get(name);if(!paths){paths=shapes.map(([d])=>new Path2D(d));gameIconPaths.set(name,paths);}g.save();g.translate(x,y);g.scale(size/32,size/32);g.lineJoin=g.lineCap='round';shapes.forEach(([,fill,stroke],i)=>{if(fill!=='none'){g.fillStyle=fill;g.fill(paths[i]);}g.strokeStyle=stroke||'#352a1e';g.lineWidth=stroke?2:1.4;g.stroke(paths[i]);});g.restore();}
function initGameIcons(){
 for(const [id,name,label]of [['togglePanels','close','Close panel'],['spiritButton','followers','Elemental Spirits'],['mapBtn','map','World map'],['journal','help','Help and settings'],['waveButton','wave','Wave to nearby players'],['stop','stop','Stop action'],['cameraReset','compass','Reset camera'],['zoomIn','zoomIn','Zoom in'],['zoomOut','zoomOut','Zoom out'],['leaveInterior','exit','Leave interior']])setHudButton(id,label,name);
 const tabs={bag:['bag','Bag'],skills:['skills','Skills'],gear:['gear','Equipment'],quests:['quests','Quests'],spells:['spells','Spells'],hunts:['melee','Hunts']};
 document.querySelectorAll('[data-tab]').forEach(b=>{const [icon,label]=tabs[b.dataset.tab];setHudButton(b,label,icon);b.setAttribute('aria-controls','gameDock');});
 document.querySelectorAll('[data-style]').forEach(b=>setHudButton(b,b.dataset.style[0].toUpperCase()+b.dataset.style.slice(1)+' combat',b.dataset.style));
 for(const [id,icon,label]of [['eat','eat','Eat food'],['runButton','run','Toggle running']]){const b=$(id),mark=document.createElement('span');mark.innerHTML=gameIcon(icon);mark.className='hud-symbol';b.prepend(mark);b.classList.add('hud-icon');b.title=label;if(id==='eat'){for(const n of [...b.childNodes])if(n.nodeType===3)n.remove();b.setAttribute('aria-label',label);}}
 syncTabs();syncAmbientIcon();if(typeof syncPlayDisplay==='function')syncPlayDisplay();
}
