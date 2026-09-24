// Disposable browser playthrough of the real tutorial actions and UI.
const fs=require('node:fs');
if(process.argv.includes('--clean')){for(const f of ['__tutorial-review.html','__tutorial-frame.html'])fs.rmSync('dist/'+f,{force:true});process.exit();}
let body=fs.readFileSync('tests/apprenticeship.cjs','utf8');body=body.slice(body.indexOf('let testNow=0;'),body.lastIndexOf('`,ctx);'));
body=body.replace("$('modalBody').children.find", "Array.from($('modalBody').children).find");
body=body.replace('frame(testNow);}', 'reviewFrame(testNow);if(testNow%2000===0)await new Promise(resolve=>setTimeout(resolve,0));}');
body=body.replace('function current(event){assert.equal(tutorialStep()?.event,event);}',"function current(event){assert.equal(tutorialStep()?.event,event);document.getElementById('reviewProgress').textContent='Lesson '+s.tutorial+' / '+tutorialSteps.length+' · '+event;}");
for(const name of ['tick','until','talk','gather'])body=body.replaceAll(name+'(', 'await '+name+'(').replace('function await '+name+'(', 'async function '+name+'(');
body=body.replace("current('deposit');openBank();", "current('deposit');openBank();await reviewPause('Bank: deposit the highlighted dagger');");
body=body.replace("current('withdraw');assert.equal", "current('withdraw');await reviewPause('Bank: withdraw the highlighted dagger');assert.equal");
body=body.replace('tutorialBankQuantity();close();',"await reviewPause('Bank: quantity controls 1 / 5 / 10 / All');tutorialBankQuantity();close();");
body=body.replace("current('mix-dough');", "current('mix-dough');await reviewPause('Bram: ingredients received, ready to mix dough');");
body=body.replace("assert(s.spirits.cinder);assert(s.xp.Worship>=38);", "assert(s.spirits.cinder);assert(s.xp.Worship>=38);await reviewPause('First Spirit chosen');");
let html=fs.readFileSync('dist/index.html','utf8').replace('<script src="character-creation.js"></script>','<script>startRebuiltRealm=()=>{};</script><script src="character-creation.js"></script>');
html=html.replace('</body>',`<script>
ensureGameLogin=async()=>{};initializeCloud=async()=>{};save=queueCloudSave=()=>{};cloudReady=false;
s=defaults();s.character={name:'Fresh review',look:0,frame:'female',hair:2};s.sceneId='tutorial';s.tutorial=0;s.tutorialVersion=TUTORIAL_VERSION;s.runEnabled=false;s.runEnergy=100;
const reviewFrame=frame,reviewRender=draw;frame=()=>{};draw=()=>{};
const assert=(ok,message)=>{if(!ok)throw Error(message||'Assertion failed');};assert.equal=(a,b,m)=>assert(a===b,(m||'Expected equality')+': '+a+' / '+b);
let reviewResume;async function reviewPause(label){renderUI();reviewRender();document.getElementById('reviewProgress').textContent=label;document.getElementById('reviewContinue').hidden=false;await new Promise(resolve=>reviewResume=resolve);document.getElementById('reviewContinue').hidden=true;}
async function runReview(){document.getElementById('reviewStart').hidden=true;try{${body}\nrenderUI();reviewRender();document.getElementById('reviewProgress').textContent='PASS · Fresh character completed all 38 lessons, mainland transition and save normalization';}catch(error){document.getElementById('reviewProgress').textContent='FAIL · '+error.message;console.error(error);}}
boot().then(()=>{const bar=document.createElement('section');bar.style='position:fixed;bottom:0;left:0;z-index:100;background:#102533;color:white;padding:6px';bar.innerHTML='<button id="reviewStart">Run fresh tutorial</button><button id="reviewContinue" hidden>Continue walkthrough</button><strong id="reviewProgress">Fresh character ready</strong>';document.body.append(bar);document.getElementById('reviewStart').onclick=()=>setTimeout(runReview,0);document.getElementById('reviewContinue').onclick=()=>reviewResume();activateScene('tutorial',42,51);renderUI();reviewRender();});
</script></body>`);
fs.writeFileSync('dist/__tutorial-frame.html',html);
fs.writeFileSync('dist/__tutorial-review.html','<!doctype html><html><head><title>Fresh tutorial review</title></head><body style="background:#101824"><iframe title="Fresh tutorial" src="/__tutorial-frame.html" width="844" height="390"></iframe></body></html>');
console.log('Prepared browser tutorial playthrough. Clean before release.');
