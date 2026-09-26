// Instrumented CPU/submission comparison, not device or GPU FPS.
const {ctx,counters}=require('./benchmark-desktop.cjs'),fs=require('node:fs'),vm=require('node:vm');
const root=process.env.VELDREN_BENCH_ROOT||__dirname+'/../dist/';
ctx.mode='current-environment';ctx.caseFilter=process.env.VELDREN_BENCH_CASE||'';
for(const f of ['trading','world-options','item-models','equipment-interface','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters','briarhaven','game-audio','mountain-quest','main-story','quest-world','world-geography','world-dressing','civilization-world','cave-passages','fishing-shores','quest-guidance','world-lighting','prop-placement','world-atlas','fieldcraft','relic-shaping','world-ecology-layout','world-ecology'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`
renderUI=renderAction=renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Environment benchmark',look:0,frame:'male',hair:0};s.tutorial=tutorialSteps.length;s.tutorialReward=true;worldCycleSeconds=()=>120;
const cases=[['Briarhaven',55,61,28],['Ironcrown castle',762,67,14],['Dense forest',494,624,18],['Crownreach',378,114,18],['Freight Mine',13,15,22,'story_mine'],['Pinewatch Mine',13,19,22,'mine'],['World wide',55,61,14],['Mobile landscape',74,88,24,'overworld',844,390]];
for(const [label,x,z,zoom,scene='overworld',w=1920,h=1080]of cases.filter(c=>!caseFilter||c[0]===caseFilter)){
 activateScene(scene,x,z);if(Math.hypot(px-x,py-z)>.1){let p=null;for(let r=0;r<12&&!p;r++)for(let dz=-r;dz<=r&&!p;dz++)for(let dx=-r;dx<=r&&!p;dx++)if(land(x+dx,z+dz))p=[x+dx,z+dz];if(p)activateScene(scene,...p);else throw new Error('No benchmark position near '+label);}screen={w,h};window.matchMedia=()=>({matches:w<=900});view3d.zoom=zoom;view3d.yaw=-.55;view3d.tilt=.85;
 const samples=[];
 for(let i=0;i<28;i++){
  time+=1/30;view3d.yaw=-.55+i*Math.PI/12;
  for(const k of Object.keys(counters))counters[k]=0;
  const start=performance.now();draw3d();samples.push({ms:performance.now()-start,...counters});
 }
 const warm=samples.slice(4).map(o=>o.ms).sort((a,b)=>a-b);
 console.log(JSON.stringify({label,position:[px,py],scope:'mock WebGL CPU and submissions',firstMs:samples[0].ms,medianMs:warm[Math.floor(warm.length/2)],p95Ms:warm[Math.floor(warm.length*.95)],draws:samples.at(-1).draws,vertices:samples.at(-1).vertices,samples}));
}
`,ctx);
