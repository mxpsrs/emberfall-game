// Used only by Vite's explicit local QA route, never packaged into the game.
(function prepareTradePreview(){
 if(!assetsReady){setTimeout(prepareTradePreview,100);return;}
 if($('creator').open)$('creator').close();s.character={name:'Trading preview',look:0,race:'human',frame:'male',hair:0};
 s.gold=420;s.bag={logs:3,ore:2,fish:3,bones:2,arrows:80,runes:30,ashes:1};s.gear={bronzeSword:1,shortbow:1,oakStaff:1,ironHelm:1};s.equipment={weapon:'bronzeSword'};
 s.bank={logs:42,ore:28,fish:18,bones:36,arrows:240,runes:125,ironSword:2,ironShield:1,mageRobe:1,herbs:12,rawTrout:9,ironBar:8,ashes:6};
 s.tutorial=tutorialSteps.length;renderTutorial();openTrade(new URL(location.href).searchParams.get('tradeQA'));
})();
