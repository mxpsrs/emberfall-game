// Local, disposable browser review. No account, credential or remote save access.
const fs=require('node:fs');
const root=__dirname+'/../dist/';
if(process.argv.includes('--clean')){for(const f of ['__identity-review.html','__identity-frame.html'])fs.rmSync(root+f,{force:true});process.exit();}
let html=fs.readFileSync(root+'index.html','utf8').replace('<script src="character-creation.js"></script>','<script>startRebuiltRealm=()=>{};</script><script src="character-creation.js"></script>');
html=html.replace('</body>',`<script>
ensureGameLogin=async()=>{};initializeCloud=async()=>{};save=queueCloudSave=()=>{};cloudReady=false;
s=defaults();s.character={name:'Identity review',look:0,frame:'female',hair:2};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.storyOpeningSeen=true;s.metRowan=true;s.gold=180;
s.spirits=Object.fromEntries(Object.keys(SPIRITS).map(id=>[id,{state:'set',bondXP:90}]));s.attunedSpirit='cinder';s.firstSpirit='cinder';s.xp.Worship=600;
s.sceneId='overworld';s.x=42;s.y=51;s.bag={...s.bag,logs:3,bones:2,shrimp:8,runes:100,airRunes:100};s.gear={ironSword:1,ironHelm:1,ironShield:1};s.equipment={weapon:'ironSword',head:'ironHelm',shield:'ironShield'};
boot().then(()=>{if(!assetsReady)return;activateScene('overworld',42,51);s.hp=maxhp();renderUI();const controls=document.createElement('section');controls.id='identityReviewControls';controls.setAttribute('aria-label','Disposable test controls');controls.style='position:fixed;left:14px;top:165px;display:flex;gap:4px;z-index:22';
for(const [label,action]of [['Test bank',openBank],['Test shop',shop],['Test dialogue',showHelp],['Test combat',()=>{const enemy=objects.find(o=>o.kind==='wolf');if(!enemy)return;activateScene('overworld',enemy.x+1,enemy.y);s.hp=maxhp();engage(enemy);}]]){const b=document.createElement('button');b.textContent=label;b.style='font-size:12px;min-height:32px;padding:4px';b.onclick=action;controls.append(b);}document.body.append(controls);});
</script></body>`);
fs.writeFileSync(root+'__identity-frame.html',html);
fs.writeFileSync(root+'__identity-review.html',`<!doctype html><html><head><meta charset="utf-8"><title>Veldren identity review</title><style>body{margin:8px;background:#08111e;color:#d8eaf5;font:14px system-ui}button{padding:8px;margin:0 8px 8px 0}iframe{display:block;border:1px solid #54718b}p{margin:6px 0}</style></head><body><p>Disposable gameplay review · production renderer and controls</p><button onclick="size(1280,720)">Desktop 1280</button><button onclick="size(844,390)">Phone 844</button><button onclick="size(667,320)">Phone 667</button><button onclick="document.querySelector('iframe').contentDocument.getElementById('identityReviewControls').hidden=true">Hide test controls</button><iframe title="Veldren game review" src="/__identity-frame.html" width="844" height="390"></iframe><script>function size(w,h){const f=document.querySelector('iframe');f.width=w;f.height=h;}</script></body></html>`);
console.log('Prepared disposable full-game identity review. Clean before build/package.');
