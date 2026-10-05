const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs'),{createCanvas,Path2D}=require('@napi-rs/canvas');ctx.Path2D=Path2D;
const before=ctx.document.createElement;ctx.document.createElement=type=>type==='canvas'?createCanvas(64,64):before(type);
const canvas=createCanvas(900,600),g=canvas.getContext('2d'),labels=[];const fill=g.fillText.bind(g);g.fillText=(text,...args)=>{labels.push(text);return fill(text,...args);};ctx.atlasLabels=labels;
Object.assign(ctx.document.getElementById('localMap'),{width:900,height:600,getContext:()=>g,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})});
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Atlas reader'};s.tutorial=0;s.tutorialReward=false;activateScene('tutorial',42,51);const beforeObjects=[...objects],beforePosition=[px,py];worldMap();
assert.equal(currentScene,'tutorial');assert.deepEqual(objects,beforeObjects);assert.deepEqual([px,py],beforePosition);
const bounds=localMapBounds();assert(bounds.x<=0&&bounds.y<=0&&bounds.x+bounds.w>=1152&&bounds.y+bounds.h>=768,'opens to the entire world from Firstlight');
for(const t of SETTLEMENTS)assert(atlasLabels.includes(t.name),'visible map label: '+t.name);for(const k of ATLAS_KINGDOM_LABELS)assert(atlasLabels.includes(k.name));assert(atlasLabels.includes('Firstlight Isle'));
const features=withAtlasWorld(()=>drawAtlasFeatures($('localMap').getContext('2d'),bounds,900,600));for(const key of ['houses','trees','rocks','bridges'])assert(features[key]>0,key+' represented from actual world geometry');
const full=localMapState.span;$('mapZoomIn').onclick();assert(localMapState.span<full);$('mapKingdoms').onclick();assert.equal(localMapState.span,full);
const c=$('localMap'),event=(id,x,y)=>({button:0,pointerId:id,clientX:x,clientY:y,preventDefault(){}});
c.listeners.pointerdown(event(1,350,300));c.listeners.pointerdown(event(2,450,300));c.listeners.pointermove(event(2,550,300));assert.equal(localMapState.span,full/2,'pinch spreads to zoom in');c.listeners.pointerup(event(2,550,300));c.listeners.pointerup(event(1,350,300));
const span=localMapState.span;c.listeners.wheel({deltaY:-1,preventDefault(){}});assert(localMapState.span<span,'wheel zoom');$('mapKingdoms').onclick();
const marker=localMapState.markers.find(m=>m.entry.name==='Stoneford');assert(marker);c.listeners.pointerdown(event(3,marker.x,marker.y));c.listeners.pointerup(event(3,marker.x,marker.y));assert.equal(localMapState.span,260);assert.equal(localMapState.x,225);assert.equal(currentScene,'tutorial','map selection cannot teleport the player');
console.log('PASS: production canvas labels every kingdom and settlement, whole-world opening from tutorial, scene preservation, fit-world button, zoom buttons, pinch, wheel and settlement selection.');
`,ctx);
