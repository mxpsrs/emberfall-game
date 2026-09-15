const {ctx,vm,fs}=require('./game-fixture.cjs'),{createCanvas,Path2D}=require('@napi-rs/canvas');ctx.Path2D=Path2D;
const before=ctx.document.createElement;ctx.document.createElement=type=>type==='canvas'?createCanvas(64,64):before(type);
const canvas=createCanvas(900,600);Object.assign(ctx.document.getElementById('localMap'),{width:900,height:600,getContext:()=>canvas.getContext('2d'),getBoundingClientRect:()=>({left:0,top:0,width:Number(process.env.ATLAS_CAPTURE_WIDTH||900),height:Number(process.env.ATLAS_CAPTURE_WIDTH||900)*2/3})});
vm.runInContext(`draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;activateScene('overworld',55,61);worldMap();`,ctx);
fs.writeFileSync(process.argv[2]||'/tmp/veldren-atlas.png',canvas.toBuffer('image/png'));
console.log(vm.runInContext('JSON.stringify({bounds:localMapBounds(),kingdoms:ATLAS_KINGDOM_LABELS.map(k=>k.name),settlements:SETTLEMENTS.map(t=>t.name),forestTrees:worldScenes.overworld.objects.filter(o=>o.forest).length})',ctx));
