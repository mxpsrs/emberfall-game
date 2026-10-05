// Temporary fixture for checking real HUD components when cloud WebGL is unavailable.
// It uses the production HTML, styles and menu handlers with disposable local state.
const fs=require('fs');
const root=__dirname+'/../../client/';
if(process.argv.includes('--clean')){for(const f of ['__ui-review.html','__ui-frame.html'])fs.rmSync(root+f,{force:true});process.exit();}
let html=fs.readFileSync(root+'index.html','utf8').replace('<script src="character-creation.js"></script>','');
html=html.replace('</body>',`<script>
// No 3D loop or account requests run in this fixture.
draw=()=>{};resize=()=>{};save=()=>{};queueCloudSave=()=>{};
assetsReady=true;s=defaults();s.character={name:'Interface review',look:0};s.tutorial=tutorialSteps.length;s.gold=80;s.bag.logs=3;s.bag.bones=2;
art.items=new Image();art.items.onload=()=>{renderUI();};art.items.src='assets/items.png';
$('loading').hidden=true;
const reviewSurface=document.createElement('canvas');reviewSurface.className='realm-surface';reviewSurface.style.background='#304938';$('world').before(reviewSurface);
$('cloudStatus').textContent='Disposable interface review';$('onlineStatus').textContent='';
initHud();renderUI();
const review=document.createElement('div');review.style='position:absolute;top:58px;left:calc(50% - 110px);display:flex;gap:8px;z-index:10';
for(const [label,action]of [['Test shop',()=>shop()],['Test long dialog',()=>showHelp()]]){const b=document.createElement('button');b.textContent=label;b.onclick=action;review.appendChild(b);}document.body.appendChild(review);
</script></body>`);
fs.writeFileSync(root+'__ui-frame.html',html);
fs.writeFileSync(root+'__ui-review.html',`<!doctype html><html><head><meta charset="utf-8"><title>Veldren interface review</title><style>body{margin:12px;background:#101917;color:#e8dfc5;font:14px system-ui}button{padding:8px 12px;margin:0 8px 10px 0}iframe{display:block;border:1px solid #8c7850}</style></head><body><p>Interface layout review · production styles and handlers · 3D rendering tested separately</p><button onclick="size(1112,512)">Recording size</button><button onclick="size(844,390)">Small phone</button><button onclick="size(1280,720)">Desktop</button><iframe title="Game interface" src="/__ui-frame.html" width="844" height="390"></iframe><script>function size(w,h){const f=document.querySelector('iframe');f.width=w;f.height=h;}</script></body></html>`);
console.log('Prepared disposable HUD fixtures. Clean before packaging.');
