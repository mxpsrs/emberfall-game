const fs=require('fs');
let harness=fs.readFileSync(__dirname+'/apprenticeship.cjs','utf8').split('vm.runInContext(`')[0];
harness="const handlers={};\n"+harness.replace('addEventListener:noop,body:el()',"addEventListener:(type,fn,options)=>{if(options?.capture)handlers[type]=fn;},body:el()");
new Function('require','__dirname',harness+`vm.runInContext(\`
renderAction=()=>{};renderUI=()=>{};renderTutorial=()=>{};draw=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.character={name:'Online test',look:0};s.tutorial=tutorialSteps.length;assetsReady=true;cloudReady=true;activateScene('overworld',42,51);walkTo(44,51);
pauseForServer();assert(cloudDisconnected);assert.equal(path.length,0);assert.equal(target,null);
const before=JSON.stringify({x:s.x,y:s.y,xp:s.xp,bag:s.bag,hp:s.hp,time});for(let n=1;n<100;n++)frame(n*100);
assert.equal(JSON.stringify({x:s.x,y:s.y,xp:s.xp,bag:s.bag,hp:s.hp,time}),before,'no movement, XP, items, combat, or world simulation offline');
cloudDirty=false;queueCloudSave();assert(!cloudDirty,'no disconnected save queued');
\`,ctx);
for(const type of ['pointerdown','pointerup','click','keydown','wheel']){let blocked=false,prevented=false;handlers[type]({target:{closest:()=>null},preventDefault(){prevented=true},stopImmediatePropagation(){blocked=true}});if(!blocked||!prevented)throw Error(type+' was not blocked');}
console.log('PASS: disconnected play pauses simulation, blocks item and keyboard input, and stops new saves.');`)(require,__dirname);
